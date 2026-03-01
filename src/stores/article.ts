import { defineStore } from "pinia";
import { ref, watch, nextTick } from "vue";
import type { Article, SaveState } from "@/types";
import { ArticleStatus, SaveStatus } from "@/types";
import { autoSaveService } from "@/services/AutoSaveService";
import { notify } from "@/services/NotificationService";
import { useConfigStore } from "./config";
import { getArticleService } from "@/services/ArticleService";
import { normalizePath } from "@/utils/path";
import { isElectronAvailable, assertElectronAvailable } from "@/utils/electron";
import { fileWatchService } from "@/services/FileWatchService";
import { VaultDirs } from "@/config/vault";
import { parseArticlePath } from "@/utils/articlePath";
import { useFileWatching } from "@/composables/useFileWatching";
import { useArticleFilter } from "@/composables/useArticleFilter";
import { logger } from "@/utils/logger";

export const useArticleStore = defineStore("article", () => {
  // 使用服務單例
  const articleService = getArticleService();
  const configStore = useConfigStore();

  // State
  const articles = ref<Article[]>([]);
  const currentArticle = ref<Article | null>(null);

  // 檔案監聽 composable（在 handleFileChangeEvent 定義前用 let 聲明，函式稍後賦值）
  // SOLID6-01: 過濾與排序關注點提取到 useArticleFilter composable
  const articleFilter = useArticleFilter(articles);
  const { filter, filteredArticles, draftArticles, publishedArticles, allTags, updateFilter } = articleFilter;

  const loading = ref(false);

  // handleFileChangeEvent 在下方定義，此處預先聲明 fileWatcher
  // useFileWatching 需要在 handleFileChangeEvent 定義後才初始化
  // eslint-disable-next-line prefer-const
  let fileWatcher: ReturnType<typeof useFileWatching>;
  // Actions
  async function loadArticles() {
    loading.value = true;
    try {
      const vaultPath = configStore.config.paths.articlesDir;
      if (!vaultPath) {
        logger.warn("Obsidian vault path not configured");
        articles.value = [];
        loading.value = false;
        return;
      }

      logger.debug("開始載入文章，Vault 路徑:", vaultPath);

      // Check if we're running in Electron environment
      if (!isElectronAvailable()) {
        logger.warn("Running in browser mode - using mock articles");
        articles.value = [];
        loading.value = false;
        return;
      }

      // 使用 ArticleService 載入所有文章
      const loadedArticles = await articleService.loadAllArticles(vaultPath);
      articles.value = loadedArticles;

      logger.debug(`載入完成，共 ${loadedArticles.length} 篇文章`);

      // 建立搜尋索引（不影響主流程）
      articleService.triggerSearchIndexBuild(vaultPath);

      // 設置檔案監聽
      await setupFileWatching(vaultPath);
    } catch (error) {
      logger.error("Failed to load articles:", error);
      // Don't throw error, just log it and continue with empty articles
      articles.value = [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * 設置檔案監聽（委派 useFileWatching composable 管理生命週期）
   */
  async function setupFileWatching(vaultPath: string) {
    try {
      await fileWatcher.start(vaultPath);
    } catch (error) {
      logger.error("Failed to setup file watching:", error);
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

    logger.debug(`檔案變化：${type} - ${filePath}`);

    switch (type) {
      case "add":
      case "change":
        // 重新載入該文章
        await reloadArticleFromDisk(filePath, pathInfo.category);
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
  async function reloadArticleFromDisk(filePath: string, category: string) {
    try {
      const article = await articleService.loadArticle(filePath, category);

      const normalizedPath = normalizePath(filePath);
      const existingIndex = articles.value.findIndex((a) => normalizePath(a.filePath) === normalizedPath);

      if (existingIndex !== -1) {
        // 更新現有文章，保留原有 id（避免 UI 組件因 id 變動而重新掛載）
        articles.value[existingIndex] = { ...article, id: articles.value[existingIndex].id };

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
      logger.warn(`Failed to reload article ${filePath}:`, error);
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

  // 在 handleFileChangeEvent 定義後初始化 fileWatcher（避免前向引用問題）
  fileWatcher = useFileWatching({ onFileEvent: handleFileChangeEvent });

  async function createArticle(title: string, category: string): Promise<Article> {
    try {
      assertElectronAvailable();

      const vaultPath = configStore.config.paths.articlesDir;
      if (!vaultPath) {
        throw new Error("Obsidian vault path not configured");
      }

      const slug = articleService.generateSlug(title);
      const now = new Date();

      // Create directory structure
      const categoryPath = `${vaultPath}/${VaultDirs.DRAFTS}/${category}`;
      const filePath = `${categoryPath}/${slug}.md`;

      // Ensure directory exists
      await articleService.ensureDirectory(categoryPath);

      const article: Article = {
        id: articleService.generateIdFromPath(filePath), // 使用與 loadArticle 一致的路徑導出 ID
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
      logger.error("Failed to create article:", error);
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
  async function saveArticle(article: Article, options?: { preserveLastModified?: boolean }) {
    try {
      assertElectronAvailable();

      // 更新 lastModified timestamp（migration 存檔時不更新，避免排序跳動）
      const articleToSave = {
        ...article,
        lastModified: options?.preserveLastModified ? article.lastModified : new Date(),
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
      logger.error("Failed to save article:", error);
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
    // updateFilter 已由 useArticleFilter composable 提供
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
      assertElectronAvailable();

      const article = articles.value.find((a) => a.id === id);
      if (!article) {
        throw new Error("找不到指定文章");
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
      logger.error("Failed to delete article:", error);
      notify.error("刪除失敗", error instanceof Error ? error.message : "無法刪除文章");
      throw error;
    }
  }

  async function toggleStatus(id: string) {
    try {
      assertElectronAvailable();

      const article = articles.value.find((a) => a.id === id);
      if (!article) {
        throw new Error("找不到指定文章");
      }

      const newStatus = article.status === ArticleStatus.Draft ? ArticleStatus.Published : ArticleStatus.Draft;

      const updatedArticle = {
        ...article,
        status: newStatus,
        frontmatter: {
          ...article.frontmatter,
          status: newStatus,
        },
        lastModified: new Date(),
      };

      await saveArticle(updatedArticle);

      const statusLabel = newStatus === ArticleStatus.Published ? "已發布" : "草稿";
      notify.success("狀態已更新", `「${article.title}」已標記為${statusLabel}`);
    } catch (error) {
      logger.error("Failed to toggle article status:", error);
      notify.error("更新失敗", error instanceof Error ? error.message : "無法更新文章狀態");
      throw error;
    }
  }

  /**
   * 開啟文章時自動移轉 frontmatter 時間欄位（圓桌 #007）
   * 執行順序：先處理 created（此時 date 尚未移除），再處理 date → pubDate
   */
  function migrateArticleFrontmatter(article: Article): Article {
    const fm = { ...article.frontmatter };
    let dirty = false;

    // 1. 補上 created（建立時間）
    // 順序必須在 date 移轉前執行，因為要讀取 date 的值
    if (!fm.created) {
      fm.created = fm.date || new Date().toISOString().split("T")[0];
      dirty = true;
    }

    // 2. 移轉 date → pubDate
    const legacyDate = fm.date;
    if (legacyDate !== undefined) {
      if (!fm.pubDate) {
        fm.pubDate = legacyDate;
      }
      delete fm.date;
      dirty = true;
    }

    // 3. 初始化必要欄位（缺少時補空值，讓使用者知道有哪些欄位可填）
    if (fm.title === undefined) {
      fm.title = "";
      dirty = true;
    }
    if (fm.description === undefined) {
      fm.description = "";
      dirty = true;
    }
    if (fm.slug === undefined) {
      fm.slug = "";
      dirty = true;
    }
    if (fm.keywords === undefined) {
      fm.keywords = [];
      dirty = true;
    }

    if (!dirty) {
      return article;
    }

    const migrated = { ...article, frontmatter: fm };
    // A6-03: 非同步寫回檔案，保留原本的 lastModified 避免排序跳動
    // 失敗時通知使用者（而非靜默失敗），讓使用者知道需手動儲存
    saveArticle(migrated, { preserveLastModified: true }).catch((err) => {
      logger.error("[article store] frontmatter 移轉寫回失敗:", err);
      notify.error("Frontmatter 移轉寫回失敗", "請手動儲存文章以保題資料不遺失");
    });
    return migrated;
  }

  function setCurrentArticle(article: Article | null) {
    // 在切換文章前自動儲存前一篇文章
    const previousArticle = currentArticle.value;
    if (previousArticle && previousArticle !== article) {
      autoSaveService.saveOnArticleSwitch(previousArticle);
    }

    // 開啟文章時自動移轉 frontmatter 時間欄位（圓桌 #007）
    if (article) {
      article = migrateArticleFrontmatter(article);
    }

    currentArticle.value = article;

    // 設定新的當前文章到自動儲存服務
    autoSaveService.setCurrentArticle(article);
  }

  /**
   * Reload a specific article from file system
   */
  async function reloadArticle(id: string) {
    const article = articles.value.find((a) => a.id === id);
    if (!article) {
      return;
    }

    try {
      // 使用 ArticleService 載入完整文章（包含 wordCount、slug、tags、excerpt 等欄位）
      // 避免手動解析 frontmatter 造成欄位不一致 (A6-01)
      const reloadedArticle = await articleService.loadArticle(article.filePath, article.category);

      const index = articles.value.findIndex((a) => a.id === id);
      if (index !== -1) {
        // 保留原有 id，避免 UI 組件因 id 變動而重新掛載
        articles.value[index] = { ...reloadedArticle, id };
        if (currentArticle.value?.id === id) {
          currentArticle.value = articles.value[index];
        }
      }

      notify.success("重新載入成功", `已重新載入「${reloadedArticle.title}」`);
    } catch (error) {
      logger.error("Failed to reload article:", error);
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

  // 初始化自動儲存服務  // 儲存狀態（橋接 AutoSaveService 純資料狀態為 Vue 響應式 ref）
  const saveState = ref<SaveState>({
    status: SaveStatus.Saved,
    lastSavedAt: null,
    error: null,
  });

  // 訂閱 AutoSaveService 狀態變更
  autoSaveService.onSaveStateChange((state) => {
    saveState.value = state;
  });
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
  // 初始化自動儲存：使用 nextTick 取代任意 setTimeout(100ms)，
  // 確保 Vue 響應式系統完成當前 tick 後再初始化，語意明確且可測試
  nextTick(() => {
    initializeAutoSave();
  });

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

    // 儲存狀態（由 AutoSaveService 驅動）
    saveState,

    // Actions
    loadArticles,
    createArticle,
    saveArticle,
    updateArticleInMemory,
    deleteArticle,
    toggleStatus,
    setCurrentArticle,
    updateFilter,
    reloadArticle,
    saveCurrentArticle,
    initializeAutoSave,
    // 內部方法（供測試使用）
    reloadArticleFromDisk,
    removeArticleFromMemory,
  };
});
