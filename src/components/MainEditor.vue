<template>
    <div class="h-full flex flex-col relative">
        <!-- Editor Header -->
        <EditorHeader
            :article="articleStore.currentArticle"
            :show-preview="showPreview"
            :show-frontmatter="showFrontmatterPanel"
            :editor-mode="editorMode"
            @toggle-preview="togglePreview"
            @toggle-frontmatter="showFrontmatterPanel = !showFrontmatterPanel"
            @edit-frontmatter="showFrontmatterEditor = true"
            @move-to-published="moveToPublished"
            @toggle-editor-mode="toggleEditorMode"
        />

        <!-- Frontmatter Panel (撰寫模式才顯示) -->
        <FrontmatterPanel
            v-if="editorMode === 'compose'"
            :visible="showFrontmatterPanel"
            :article="articleStore.currentArticle"
        />
        
        <!-- Search/Replace Panel -->
        <SearchReplace
            :visible="isSearchVisible"
            :content="content"
            @close="closeSearch"
            @replace="replace"
            @highlight="handleSearchHighlight"
        />

        <!-- Editor Content -->
        <div class="flex flex-1 overflow-hidden">
            <!-- 撰寫模式 -->
            <template v-if="editorMode === 'compose'">
                <EditorPane
                    ref="editorPaneRef"
                    v-model="content"
                    :show-preview="showPreview"
                    :suggestions="suggestions"
                    :show-suggestions="showSuggestions"
                    :selected-suggestion-index="selectedSuggestionIndex"
                    :syntax-errors="syntaxErrors"
                    :image-validation-warnings="imageValidationWarnings"
                    :dropdown-position="dropdownPosition"
                    @insert-markdown="insertMarkdownSyntax"
                    @insert-table="insertTable"
                    @keydown="handleKeydown"
                    @cursor-change="updateAutocomplete"
                    @apply-suggestion="applySuggestion"
                />
            </template>

            <!-- Raw 模式 -->
            <template v-else>
                <div class="flex-1 flex flex-col bg-base-100">
                    <textarea
                        v-model="rawContent"
                        class="flex-1 w-full p-4 bg-base-100 text-base-content font-mono text-sm resize-none focus:outline-none"
                        @input="handleRawContentChange"
                        placeholder="原始 Markdown 內容..."
                    ></textarea>
                </div>
            </template>

            <!-- Preview Pane -->
            <PreviewPane
                v-if="showPreview"
                :rendered-content="renderedContent"
                :stats="previewStats"
                :validation="previewValidation"
            />
        </div>

        <!-- Frontmatter Editor Modal -->
        <FrontmatterEditor
            v-model="showFrontmatterEditor"
            :article="articleStore.currentArticle"
            @update="handleFrontmatterUpdate"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, onMounted, nextTick } from 'vue';
import { useArticleStore } from '@/stores/article';
import { useConfigStore } from '@/stores/config';
import EditorHeader from './EditorHeader.vue';
import EditorPane from './EditorPane.vue';
import PreviewPane from './PreviewPane.vue';
import FrontmatterEditor from './FrontmatterEditor.vue';
import FrontmatterPanel from './FrontmatterPanel.vue';
import SearchReplace from './SearchReplace.vue';
import { useServices } from '@/composables/useServices';
import { useAutocomplete } from '@/composables/useAutocomplete';
import { useEditorShortcuts } from '@/composables/useEditorShortcuts';
import { useEditorValidation } from '@/composables/useEditorValidation';
import { useUndoRedo } from '@/composables/useUndoRedo';
import { useSearchReplace } from '@/composables/useSearchReplace';
import type { Article } from '@/types';

const articleStore = useArticleStore();
const configStore = useConfigStore();

// 使用服務單例
const { markdownService, obsidianSyntaxService: obsidianSyntax, previewService, imageService } = useServices();

// Reactive data
const content = ref('');
const showPreview = ref(false);
const showFrontmatterPanel = ref(true);
const showFrontmatterEditor = ref(false);
const renderedContent = ref('');
const autoSaveTimer = ref<number | null>(null);
const editorMode = ref<'compose' | 'raw'>('compose');
const rawContent = ref('');

// Component references
const editorPaneRef = ref<InstanceType<typeof EditorPane>>();

// Get editorRef from EditorPane component
const editorRef = computed(() => editorPaneRef.value?.editorRef);

// 使用 Composables
const {
  suggestions,
  showSuggestions,
  selectedSuggestionIndex,
  dropdownPosition,
  updateAutocomplete,
  applySuggestion,
  hideSuggestions,
  handleAutocompleteKeydown
} = useAutocomplete(editorRef, content);

// Undo/Redo 系統
const {
  canUndo,
  canRedo,
  pushHistory,
  undo,
  redo,
  initialize: initializeHistory,
} = useUndoRedo();

// 搜尋/替換功能
const {
  isSearchVisible,
  openSearch,
  closeSearch,
  replace,
  jumpToMatch,
} = useSearchReplace(
  () => content.value,
  (newContent) => { content.value = newContent },
  () => editorRef.value?.selectionStart || 0,
  (position) => {
    if (editorRef.value) {
      editorRef.value.setSelectionRange(position, position)
      editorRef.value.focus()
    }
  }
);

// 處理 Undo
function handleUndo() {
  const state = undo()
  if (state) {
    content.value = state.content
    nextTick(() => {
      if (editorRef.value) {
        editorRef.value.setSelectionRange(state.cursorPosition, state.cursorPosition)
        editorRef.value.focus()
      }
    })
  }
}

// 處理 Redo
function handleRedo() {
  const state = redo()
  if (state) {
    content.value = state.content
    nextTick(() => {
      if (editorRef.value) {
        editorRef.value.setSelectionRange(state.cursorPosition, state.cursorPosition)
        editorRef.value.focus()
      }
    })
  }
}

const {
  insertMarkdownSyntax,
  insertTable,
  handleShortcuts,
  handleAutoPairing
} = useEditorShortcuts(editorRef, content, {
  onSave: saveArticle,
  onTogglePreview: togglePreview,
  onUndo: handleUndo,
  onRedo: handleRedo,
  onSearch: openSearch,
  onReplace: () => {
    openSearch()
    // 搜尋面板會自動處理替換模式
  }
});

const {
  syntaxErrors,
  imageValidationWarnings,
  validateSyntax,
  debounceValidation,
  cleanup: cleanupValidation
} = useEditorValidation(content);

// 其他狀態
const imageFiles = ref<string[]>([]);
const allTags = ref<string[]>([]);

// Preview statistics and validation
const previewStats = ref({
    wordCount: 0,
    characterCount: 0,
    readingTime: 0,
    imageCount: 0,
    linkCount: 0
});
const previewValidation = ref({
    validImages: [] as string[],
    invalidImages: [] as string[],
    validLinks: [] as string[],
    invalidLinks: [] as string[]
});

// Methods
function handleContentChange() {
    if (articleStore.currentArticle) {
        articleStore.currentArticle.content = content.value;
        scheduleAutoSave();
    }

    if (showPreview.value) {
        updatePreview();
    }

    // Trigger autocomplete and validation
    updateAutocomplete();
    debounceValidation();
}

// Watch content changes
let historyTimeout: ReturnType<typeof setTimeout> | null = null;
watch(content, (newContent) => {
    handleContentChange();
    
    // 只在撰寫模式下記錄歷史（Raw 模式下 editorRef 不存在）
    if (editorMode.value === 'compose') {
        // 記錄歷史（防抖 500ms）
        if (historyTimeout) {
            clearTimeout(historyTimeout);
        }
        historyTimeout = setTimeout(() => {
            const cursorPos = editorRef.value?.selectionStart || 0;
            pushHistory(newContent, cursorPos);
        }, 500);
    }
});

function scheduleAutoSave() {
    if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value);
    }

    autoSaveTimer.value = setTimeout(() => {
        saveArticle();
    }, 2000); // Auto-save after 2 seconds of inactivity
}

async function saveArticle() {
    if (articleStore.currentArticle) {
        try {
            await articleStore.updateArticle(articleStore.currentArticle);
        } catch {
            // 靜默處理錯誤，自動儲存失敗不需要通知用戶
        }
    }
}

async function moveToPublished() {
    if (articleStore.currentArticle) {
        try {
            await articleStore.moveToPublished(articleStore.currentArticle.id);
        } catch {
            // Failed to move article to published
        }
    }
}

function togglePreview() {
    showPreview.value = !showPreview.value;
    if (showPreview.value) {
        updatePreview();
    }
}

function toggleEditorMode() {
    // 清理所有定時器，防止在模式切換後訪問已卸載的 ref
    if (historyTimeout) {
        clearTimeout(historyTimeout);
        historyTimeout = null;
    }
    if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value);
        autoSaveTimer.value = null;
    }
    
    if (editorMode.value === 'compose') {
        // 切換到 Raw 模式 - 組合 frontmatter 和 content
        editorMode.value = 'raw';
        if (articleStore.currentArticle) {
            rawContent.value = markdownService.combineContent(
                articleStore.currentArticle.frontmatter,
                articleStore.currentArticle.content
            );
        }
    } else {
        // 切換到撰寫模式 - 解析 raw content
        editorMode.value = 'compose';
        if (articleStore.currentArticle && rawContent.value) {
            const parsed = markdownService.parseFrontmatter(rawContent.value);
            articleStore.currentArticle.frontmatter = parsed.frontmatter;
            articleStore.currentArticle.content = parsed.content;
            content.value = parsed.content;
        }
    }
}

function handleRawContentChange() {
    if (articleStore.currentArticle) {
        // 解析並更新文章
        const parsed = markdownService.parseFrontmatter(rawContent.value);
        articleStore.currentArticle.frontmatter = parsed.frontmatter;
        articleStore.currentArticle.content = parsed.content;
        scheduleAutoSave();

        if (showPreview.value) {
            updatePreview();
        }
    }
}

function updatePreview() {
    // Use enhanced PreviewService for rendering Obsidian format content
    try {
        const vaultPath = configStore.config.paths.obsidianVault;
        const imageBasePath = vaultPath ? `${vaultPath}/images` : './images';

        // Update preview service with current context
        previewService.updateArticles(articleStore.articles);
        previewService.setImageBasePath(imageBasePath);

        // Render with full Obsidian syntax support
        renderedContent.value = previewService.renderPreview(content.value, {
            enableObsidianSyntax: true,
            enableImagePreview: true,
            enableWikiLinks: true,
            baseImagePath: imageBasePath,
            articleList: articleStore.articles
        });

        // Update preview statistics and validation
        previewStats.value = previewService.getPreviewStats(content.value);
        previewValidation.value = previewService.validatePreviewContent(content.value);
    } catch (error) {
        // Fallback to basic MarkdownService rendering
        try {
            renderedContent.value = markdownService.renderForPreview(content.value, true);
        } catch {
            // Final fallback to simple HTML conversion
            renderedContent.value = content.value
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*(.*)\*/gim, '<em>$1</em>')
                .replace(/\n/gim, '<br>');
        }

        // Reset stats on error
        previewStats.value = {
            wordCount: 0,
            characterCount: 0,
            readingTime: 0,
            imageCount: 0,
            linkCount: 0
        };
        previewValidation.value = {
            validImages: [],
            invalidImages: [],
            validLinks: [],
            invalidLinks: []
        };
    }
}

function handleFrontmatterUpdate(updatedArticle: Article) {
    articleStore.updateArticle(updatedArticle);
}

// 搜尋高亮處理
function handleSearchHighlight(
  matches: Array<{ start: number; end: number }>,
  currentIndex: number
) {
  if (matches.length === 0 || !editorRef.value) return;

  const match = matches[currentIndex];
  
  // 選取匹配的文字
  editorRef.value.setSelectionRange(match.start, match.end);
  editorRef.value.focus();

  // 滾動到可見區域
  scrollToSelection();
}

function scrollToSelection() {
  if (!editorRef.value) return;
  
  const textarea = editorRef.value;
  const selectionStart = textarea.selectionStart;
  const textBeforeSelection = textarea.value.substring(0, selectionStart);
  const lines = textBeforeSelection.split('\n');
  const lineHeight = 24; // 根據實際行高調整
  const scrollTop = (lines.length - 1) * lineHeight;
  
  textarea.scrollTop = scrollTop - textarea.clientHeight / 2;
}

// 鍵盤事件處理（整合 composables）
function handleKeydown(event: KeyboardEvent) {
    // 先處理自動完成
    if (handleAutocompleteKeydown(event)) {
        return;
    }
    
    // 處理快捷鍵
    if (handleShortcuts(event)) {
        return;
    }
    
    // 處理自動配對
    handleAutoPairing(event);
}

// 注意：以下方法已移至 composables
// - updateAutocomplete -> useAutocomplete
// - applySuggestion -> useAutocomplete
// - hideSuggestions -> useAutocomplete
// - insertMarkdownSyntax -> useEditorShortcuts
// - insertTable -> useEditorShortcuts
// - validateSyntax -> useEditorValidation
// - debounceValidation -> useEditorValidation

async function initializeObsidianSupport() {
    try {
        // 更新 ObsidianSyntaxService 的文章清單
        obsidianSyntax.updateArticles(articleStore.articles);

        // Update tags from articles
        const tagSet = new Set<string>();
        articleStore.articles.forEach((article: Article) => {
            // 防禦性檢查：確保 tags 存在且為陣列
            if (article.frontmatter.tags && Array.isArray(article.frontmatter.tags)) {
                article.frontmatter.tags.forEach((tag: string) => tagSet.add(tag));
            }
        });
        allTags.value = Array.from(tagSet);

        // Update image files using Electron API
        const vaultPath = configStore.config.paths.obsidianVault;
        if (vaultPath && window.electronAPI) {
            // 設定 ImageService
            imageService.setVaultPath(vaultPath);
            imageService.updateArticles(articleStore.articles);

            const imagesPath = `${vaultPath}/images`;
            try {
                const files = await window.electronAPI.readDirectory(imagesPath);
                // Filter image files
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
                imageFiles.value = files.filter((file) => {
                    const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
                    return imageExtensions.includes(ext);
                });

                // 更新 ObsidianSyntaxService 的圖片檔案清單
                obsidianSyntax.updateImageFiles(imageFiles.value);
            } catch {
                // Images directory might not exist
                imageFiles.value = [];
                obsidianSyntax.updateImageFiles([]);
            }
        }
    } catch {
        // Failed to initialize Obsidian support
    }
}

// Watch for article changes
watch(
    () => articleStore.currentArticle,
    (newArticle) => {
        if (newArticle) {
            content.value = newArticle.content;
            // 更新 raw content
            rawContent.value = markdownService.combineContent(
                newArticle.frontmatter,
                newArticle.content
            );
            if (showPreview.value) {
                updatePreview();
            }
        }
    },
    { immediate: true }
);

// Watch for articles list changes (add/remove) to update tags and services
// 使用淺層監聽 + length 監聽，避免深層監聽帶來的效能問題
watch(
    () => articleStore.articles.length,
    () => {
        // 更新 ObsidianSyntaxService 的文章清單
        obsidianSyntax.updateArticles(articleStore.articles);
        
        // 更新 ImageService 的文章清單
        imageService.updateArticles(articleStore.articles);

        const tagSet = new Set<string>();
        articleStore.articles.forEach((article: Article) => {
            // 防禦性檢查：確保 tags 存在且為陣列
            if (article.frontmatter.tags && Array.isArray(article.frontmatter.tags)) {
                article.frontmatter.tags.forEach((tag: string) => tagSet.add(tag));
            }
        });
        allTags.value = Array.from(tagSet);
    },
    { immediate: true }
);

// Watch for vault path changes to update image files
watch(
    () => configStore.config.paths.obsidianVault,
    async (newPath) => {
        if (newPath && window.electronAPI) {
            // 更新 ImageService 的 vault 路徑
            imageService.setVaultPath(newPath);
            
            try {
                const imagesPath = `${newPath}/images`;
                const files = await window.electronAPI.readDirectory(imagesPath);
                // Filter image files
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
                imageFiles.value = files.filter((file) => {
                    const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
                    return imageExtensions.includes(ext);
                });

                // 更新 ObsidianSyntaxService 的圖片檔案清單
                obsidianSyntax.updateImageFiles(imageFiles.value);
            } catch {
                // Images directory might not exist or failed to read
                imageFiles.value = [];
                obsidianSyntax.updateImageFiles([]);
            }
        }
    }
);

// Lifecycle
onMounted(() => {
    initializeObsidianSupport();

    // Initial syntax validation
    validateSyntax();
    
    // 初始化歷史記錄
    initializeHistory(content.value, 0);

    // Click outside to hide suggestions
    document.addEventListener('click', handleClickOutside);
});

// 處理點擊外部以隱藏建議
function handleClickOutside(event: MouseEvent) {
    if (!editorRef.value?.contains(event.target as Node)) {
        hideSuggestions();
    }
}

// Cleanup
onUnmounted(() => {
    // 清理自動儲存定時器
    if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value);
    }
    // 清理歷史記錄定時器
    if (historyTimeout) {
        clearTimeout(historyTimeout);
        historyTimeout = null;
    }
    // 清理事件監聽器
    document.removeEventListener('click', handleClickOutside);
    // 清理驗證
    cleanupValidation();
});
</script>
