import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import type { Article, ArticleFilter } from "@/types";
import { ArticleStatus, ArticleCategory, ArticleFilterStatus, ArticleFilterCategory } from "@/types";
import { markdownService } from "@/services/MarkdownService";
import { autoSaveService } from "@/services/AutoSaveService";
import { notify } from "@/services/NotificationService";
import { useConfigStore } from "./config";
import { getArticleService } from "@/services/ArticleService";
import { normalizePath } from "@/utils/path";
import { fileWatchService } from "@/services/FileWatchService";

export const useArticleStore = defineStore("article", () => {
  // 使用服務單例
  const articleService = getArticleService();
  const configStore = useConfigStore();

  // State
  const articles = ref<Article[]>([]);
  const currentArticle = ref<Article | null>(null);
  const filter = ref<ArticleFilter>({
    status: ArticleFilterStatus.All,
    category: ArticleFilterCategory.All,
    tags: [],
    searchText: "",
  });
  const loading = ref(false);

  // Getters
  const filteredArticles = computed(() => {
    // 單次遍歷，合併所有過濾條件（優化從 O(n×m) 到 O(n)）
    const statusFilter = filter.value.status;
    const categoryFilter = filter.value.category;
    const tagsFilter = filter.value.tags;
    const searchText = filter.value.searchText?.toLowerCase();

    return articles.value
      .filter((article) => {
        // 狀態過濾 - 早期返回
        if (statusFilter !== ArticleFilterStatus.All && article.status !== statusFilter) {
          return false;
        }

        // 分類過濾 - 早期返回
        if (categoryFilter !== ArticleFilterCategory.All && article.category !== (categoryFilter as ArticleCategory)) {
          return false;
        }

        // 標籤過濾 - 早期返回
        if (tagsFilter.length > 0) {
          const hasMatchingTag =
            article.frontmatter.tags && Array.isArray(article.frontmatter.tags) && tagsFilter.some((tag) => article.frontmatter.tags!.includes(tag));
          if (!hasMatchingTag) {
            return false;
          }
        }

        // 搜尋文字過濾 - 早期返回優化
        if (searchText) {
          const titleMatch = article.title.toLowerCase().includes(searchText);
          if (titleMatch) {
            return true;
          } // 早期返回，避免不必要的內容搜尋

          const contentMatch = (article.content || "").toLowerCase().includes(searchText);
          if (!contentMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // 按標題字母順序排序（穩定排序，不會因儲存而跳動）
        return a.title.localeCompare(b.title, "zh-TW");
      });
  });

  const draftArticles = computed(() => articles.value.filter((article) => article.status === "draft"));

  const publishedArticles = computed(() => articles.value.filter((article) => article.status === "published"));

  const allTags = computed(() => {
    // 使用 flatMap 優化：從三次遍歷減少到一次
    // 舊方法：forEach → forEach → Array.from = O(n×m + k)
    // 新方法：flatMap → Set → spread = O(n×m + k) 但常數更小
    return [
      ...new Set(articles.value.flatMap((article) => (article.frontmatter.tags && Array.isArray(article.frontmatter.tags) ? article.frontmatter.tags : []))),
    ].sort();
  });

  // Actions
  async function loadArticles() {
    loading.value = true;
    try {
      const vaultPath = configStore.config.paths.articlesDir;
      if (!vaultPath) {
        console.warn("Obsidian vault path not configured");
        articles.value = [];
        loading.value = false;
        return;
      }

      console.log("開始載入文章，Vault 路徑:", vaultPath);

      // Check if we're running in Electron environment
      if (typeof window === "undefined" || !window.electronAPI) {
        console.warn("Running in browser mode - using mock articles");
        articles.value = [];
        loading.value = false;
        return;
      }

      // 使用 ArticleService 載入所有文章
      const loadedArticles = await articleService.loadAllArticles(vaultPath);
      articles.value = loadedArticles;

      console.log(`載入完成，共 ${loadedArticles.length} 篇文章`);

      // 設置檔案監聽
      await setupFileWatching(vaultPath);
    } catch (error) {
      console.error("Failed to load articles:", error);
      // Don't throw error, just log it and continue with empty articles
      articles.value = [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * 設置檔案監聽
   */
  async function setupFileWatching(vaultPath: string) {
    try {
      // 開始監聽
      await fileWatchService.startWatching(vaultPath);

      // 訂閱檔案變化事件
      fileWatchService.subscribe((event) => {
        handleFileChangeEvent(event);
      });

      console.log("FileWatchService: 檔案監聽已啟動");
    } catch (error) {
      console.error("Failed to setup file watching:", error);
    }
  }

  /**
   * 處理檔案變化事件
   */
  async function handleFileChangeEvent(event: { event: string; path: string }) {
    const { event: type, path: filePath } = event;

    // 解析路徑以判斷是哪個資料夾的哪個分類
    const pathInfo = parseArticlePath(filePath, configStore.config.paths.articlesDir);
    if (!pathInfo) {
      return; // 不是文章檔案，忽略
    }

    console.log(`檔案變化：${type} - ${filePath}`);

    switch (type) {
      case "add":
      case "change":
        // 重新載入該文章
        await reloadArticleFromDisk(filePath, pathInfo.status, pathInfo.category);
        break;

      case "unlink":
        // 從 Store 移除
        removeArticleFromMemory(filePath);
        break;
    }
  }

  /**
   * 從磁碟重新載入文章
   */
  async function reloadArticleFromDisk(filePath: string, status: ArticleStatus, category: ArticleCategory) {
    try {
      const article = await articleService.loadArticle(filePath, status, category);

      const normalizedPath = normalizePath(filePath);
      const existingIndex = articles.value.findIndex((a) => normalizePath(a.filePath) === normalizedPath);

      if (existingIndex !== -1) {
        // 更新現有文章
        articles.value[existingIndex] = article;

        if (currentArticle.value && normalizePath(currentArticle.value.filePath) === normalizedPath) {
          currentArticle.value = article;
          notify.info("檔案已更新", "外部修改已同步");
        }
      } else {
        // 新增文章
        articles.value.push(article);
        notify.info("新增文章", `偵測到新文章：${article.title}`);
      }
    } catch (error) {
      console.warn(`Failed to reload article ${filePath}:`, error);
    }
  }

  /**
   * 從記憶體移除文章
   */
  function removeArticleFromMemory(filePath: string) {
    const normalizedPath = normalizePath(filePath);
    const index = articles.value.findIndex((a) => normalizePath(a.filePath) === normalizedPath);

    if (index !== -1) {
      const article = articles.value[index];
      articles.value.splice(index, 1);

      if (currentArticle.value && normalizePath(currentArticle.value.filePath) === normalizedPath) {
        currentArticle.value = null;
      }

      notify.info("文章已移除", `偵測到文章被刪除：${article.title}`);
    }
  }

  /**
   * 解析文章路徑，取得狀態和分類
   */
  function parseArticlePath(filePath: string, vaultPath: string): { status: ArticleStatus; category: ArticleCategory } | null {
    const relativePath = normalizePath(filePath).replace(normalizePath(vaultPath), "").replace(/^\//, "");

    const parts = relativePath.split("/");
    if (parts.length < 3 || !parts[2].endsWith(".md")) {
      return null;
    }

    const [statusFolder, category] = parts;
    const status = statusFolder === "Publish" ? ArticleStatus.Published : ArticleStatus.Draft;

    if (!["Software", "growth", "management"].includes(category)) {
      return null;
    }

    return {
      status,
      category: category as ArticleCategory,
    };
  }

  async function createArticle(title: string, category: ArticleCategory): Promise<Article> {
    try {
      if (typeof window === "undefined" || !window.electronAPI) {
        throw new Error("Electron API not available");
      }

      const vaultPath = configStore.config.paths.articlesDir;
      if (!vaultPath) {
        throw new Error("Obsidian vault path not configured");
      }

      const slug = articleService.generateSlug(title);
      const now = new Date();

      // Create directory structure
      const categoryPath = `${vaultPath}/Drafts/${category}`;
      const filePath = `${categoryPath}/${slug}.md`;

      // Ensure directory exists
      await window.electronAPI.createDirectory(categoryPath);

      const article: Article = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2), // 內聯生成 ID
        title,
        slug,
        filePath,
        status: ArticleStatus.Draft,
        category,
        lastModified: now,
        content: "",
        frontmatter: {
          title,
          date: now.toISOString().split("T")[0],
          tags: [],
          categories: [category],
        },
      };

      // 標記：忽略接下來的檔案變化（因為是我們自己建立的）
      fileWatchService.ignoreNextChange(article.filePath, 5000);

      // 使用 ArticleService 儲存新文章
      const result = await articleService.saveArticle(article, {
        skipConflictCheck: true, // 新文章不需要檢查衝突
      });

      if (!result.success) {
        throw result.error || new Error("Failed to create article");
      }

      // 儲存成功，加入 store
      articles.value.push(article);
      notify.success("建立成功", `已建立「${title}」`);
      return article;
    } catch (error) {
      console.error("Failed to create article:", error);
      notify.error("建立失敗", error instanceof Error ? error.message : "無法建立文章");
      throw error;
    }
  }

  /**
   * 儲存文章到磁碟（使用 ArticleService）
   *
   * ⚠️ 這個函數會執行實際的檔案寫入操作
   * 成功後會自動更新 store 狀態
   */
  async function saveArticle(article: Article) {
    try {
      if (typeof window === "undefined" || !window.electronAPI) {
        throw new Error("Electron API not available");
      }

      // 更新 lastModified timestamp
      const articleToSave = {
        ...article,
        lastModified: new Date(),
      };

      // ⚠️ 關鍵：告訴 FileWatchService 忽略接下來的變化
      fileWatchService.ignoreNextChange(articleToSave.filePath, 5000);

      // 使用 ArticleService 儲存（包含備份、衝突檢測、檔案寫入）
      const result = await articleService.saveArticle(articleToSave);

      if (result.success) {
        // 儲存成功，只更新記憶體中的狀態，不觸發 reload
        updateArticleInMemory(articleToSave);
      } else if (result.conflict) {
        // 檔案衝突
        notify.warning("檔案衝突", "檔案在外部被修改，建議重新載入", {
          action: {
            label: "重新載入",
            callback: () => reloadArticle(article.id),
          },
        });
        throw new Error("File conflict detected");
      } else if (result.error) {
        throw result.error;
      }
    } catch (error) {
      console.error("Failed to save article:", error);
      notify.error("儲存失敗", error instanceof Error ? error.message : "無法儲存文章");
      throw error;
    }
  }

  /**
   * 更新文章狀態（僅記憶體中，不寫入檔案）
   *
   * ⚠️ 這個函數只更新 store 狀態，不會寫入檔案
   * 如需儲存到磁碟，請使用 saveArticle()
   */
  /**
   * 更新文章在記憶體中的狀態
   * ⚠️ 只更新 Store，不寫入檔案
   */
  function updateArticleInMemory(updatedArticle: Article) {
    const index = articles.value.findIndex((a) => a.id === updatedArticle.id);
    if (index !== -1) {
      // 只更新必要的欄位，減少響應式觸發
      articles.value[index] = updatedArticle;
    }

    // 如果更新的是當前文章，也更新 currentArticle
    if (currentArticle.value?.id === updatedArticle.id) {
      currentArticle.value = updatedArticle;
    }
  }

  async function deleteArticle(id: string) {
    try {
      if (typeof window === "undefined" || !window.electronAPI) {
        throw new Error("Electron API not available");
      }

      const article = articles.value.find((a) => a.id === id);
      if (!article) {
        throw new Error("Article not found");
      }

      // 使用 ArticleService 刪除文章（包含備份）
      await articleService.deleteArticle(article);

      // 從 store 移除
      const index = articles.value.findIndex((a) => a.id === id);
      if (index !== -1) {
        articles.value.splice(index, 1);
        if (currentArticle.value?.id === id) {
          currentArticle.value = null;
        }
      }

      notify.success("刪除成功", `已刪除「${article.title}」`);
    } catch (error) {
      console.error("Failed to delete article:", error);
      notify.error("刪除失敗", error instanceof Error ? error.message : "無法刪除文章");
      throw error;
    }
  }

  async function moveToPublished(id: string) {
    try {
      if (typeof window === "undefined" || !window.electronAPI) {
        throw new Error("Electron API not available");
      }

      const article = articles.value.find((a) => a.id === id);
      if (!article) {
        throw new Error("Article not found");
      }

      if (article.status === "draft") {
        const vaultPath = configStore.config.paths.articlesDir;
        if (!vaultPath) {
          throw new Error("Obsidian vault path not configured");
        }

        // Create new path
        const publishPath = `${vaultPath}/Publish/${article.category}`;
        const newFilePath = `${publishPath}/${article.slug}.md`;

        // Ensure publish directory exists
        await window.electronAPI.createDirectory(publishPath);

        // 使用 ArticleService 移動文章（包含備份和檔案操作）
        await articleService.moveArticle(article, newFilePath);

        // 更新 store 中的文章狀態
        article.status = ArticleStatus.Published;
        article.filePath = newFilePath;
        article.lastModified = new Date();

        notify.success("發布成功", `「${article.title}」已移至發布區`);
      }
    } catch (error) {
      console.error("Failed to move article to published:", error);
      notify.error("發布失敗", error instanceof Error ? error.message : "無法移動文章");
      throw error;
    }
  }

  function setCurrentArticle(article: Article | null) {
    // 在切換文章前自動儲存前一篇文章
    const previousArticle = currentArticle.value;
    if (previousArticle && previousArticle !== article) {
      autoSaveService.saveOnArticleSwitch(previousArticle);
    }

    currentArticle.value = article;

    // 設定新的當前文章到自動儲存服務
    autoSaveService.setCurrentArticle(article);
  }

  function updateFilter(newFilter: Partial<ArticleFilter>) {
    filter.value = { ...filter.value, ...newFilter };
  }

  /**
   * Reload a specific article from file system
   */
  async function reloadArticle(id: string) {
    const article = articles.value.find((a) => a.id === id);
    if (!article) {
      return;
    }

    if (typeof window === "undefined" || !window.electronAPI) {
      return;
    }

    try {
      const content = await window.electronAPI.readFile(article.filePath);
      const { frontmatter, content: articleContent } = markdownService.parseMarkdown(content);
      const fileStats = await window.electronAPI.getFileStats(article.filePath);
      const lastModified = fileStats?.mtime ? new Date(fileStats.mtime) : new Date();

      const reloadedArticle: Article = {
        ...article,
        title: frontmatter.title || article.title,
        content: articleContent,
        frontmatter,
        lastModified,
      };

      const index = articles.value.findIndex((a) => a.id === id);
      if (index !== -1) {
        articles.value[index] = reloadedArticle;
        if (currentArticle.value?.id === id) {
          currentArticle.value = reloadedArticle;
        }
      }

      notify.success("重新載入成功", `已重新載入「${reloadedArticle.title}」`);
    } catch (error) {
      console.error("Failed to reload article:", error);
      notify.error("重新載入失敗", "無法重新載入文章");
    }
  }

  /**
   * Save current article if it has changes
   */
  async function saveCurrentArticle() {
    if (currentArticle.value) {
      await saveArticle(currentArticle.value);
    }
  }

  // 初始化自動儲存服務
  function initializeAutoSave() {
    const config = configStore.config;
    const interval = config.editorConfig.autoSaveInterval || 30000;

    autoSaveService.initialize(
      saveArticle, // ✅ 使用新的 saveArticle 函數（會寫入檔案）
      () => currentArticle.value,
      interval,
    );

    // 根據設定啟用或停用自動儲存
    autoSaveService.setEnabled(config.editorConfig.autoSave);
  }

  // 監聽設定變更以更新自動儲存
  watch(
    () => configStore.config.editorConfig,
    (newConfig) => {
      autoSaveService.setEnabled(newConfig.autoSave);
      autoSaveService.setInterval(newConfig.autoSaveInterval || 30000);
    },
    { deep: true },
  );

  // 初始化自動儲存（延遲執行以確保 configStore 已載入）
  setTimeout(() => {
    initializeAutoSave();
  }, 100);

  return {
    // State
    articles,
    currentArticle,
    filter,
    loading,

    // Getters
    filteredArticles,
    draftArticles,
    publishedArticles,
    allTags,

    // Actions
    loadArticles,
    createArticle,
    saveArticle,
    updateArticleInMemory,
    deleteArticle,
    moveToPublished,
    setCurrentArticle,
    updateFilter,
    reloadArticle,
    saveCurrentArticle,
    initializeAutoSave,
  };
});
