<template>
    <div class="h-full flex flex-col relative">
        <!-- Editor Header -->
        <EditorHeader :article="articleStore.currentArticle" :show-preview="showPreview" :editor-mode="editorMode"
            :focus-mode="focusMode" @toggle-preview="togglePreview" @edit-frontmatter="showFrontmatterEditor = true"
            @move-to-published="moveToPublished" @publish-to-blog="handlePublishToBlog"
            @toggle-editor-mode="toggleEditorMode" @toggle-focus-mode="toggleFocusMode" />

        <!-- Search/Replace Panel -->
        <SearchReplace :visible="isSearchVisible" :content="content" @close="closeSearch" @replace="replace"
            @highlight="handleSearchHighlight" />

        <!-- Editor Content -->
        <div class="flex flex-1 overflow-hidden">
            <!-- 撰寫模式 -->
            <template v-if="editorMode === 'compose'">
                <EditorPane ref="editorPaneRef" v-model="content" :show-preview="showPreview" :suggestions="suggestions"
                    :show-suggestions="showSuggestions" :selected-suggestion-index="selectedSuggestionIndex"
                    :syntax-errors="syntaxErrors" :image-validation-warnings="imageValidationWarnings"
                    :dropdown-position="dropdownPosition" @insert-markdown="insertMarkdownSyntax"
                    @insert-table="insertTable" @keydown="handleKeydown" @cursor-change="updateAutocomplete"
                    @apply-suggestion="applySuggestion" @scroll="onEditorScroll"
                    @toggle-sync-scroll="toggleSyncScroll" />
            </template>

            <!-- Raw 模式 -->
            <template v-else>
                <div class="flex-1 flex flex-col bg-base-100">
                    <textarea v-model="rawContent"
                        class="flex-1 w-full p-4 bg-base-100 text-base-content font-mono text-sm resize-none focus:outline-none"
                        @input="handleRawContentChange" placeholder="原始 Markdown 內容..."></textarea>
                </div>
            </template>

            <!-- Preview Pane -->
            <PreviewPane ref="previewPaneRef" v-if="showPreview" :rendered-content="renderedContent"
                :stats="previewStats" :validation="previewValidation" @scroll="onPreviewScroll" />
        </div>

        <!-- Frontmatter Editor Modal -->
        <FrontmatterEditor v-model="showFrontmatterEditor" :article="articleStore.currentArticle"
            @update="handleFrontmatterUpdate" />

        <!-- Git 操作指南 Modal -->
        <dialog :class="{ 'modal': true, 'modal-open': showGitGuide }">
            <div class="modal-box max-w-3xl">
                <button
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                    @click="showGitGuide = false"
                >
                    ✕
                </button>
                <GitOperationGuide v-if="gitCommands" :commands="gitCommands" />
            </div>
            <form method="dialog" class="modal-backdrop" @click="showGitGuide = false">
                <button>close</button>
            </form>
        </dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, onMounted, nextTick } from 'vue';
import { useArticleStore } from '@/stores/article';
import { useConfigStore } from '@/stores/config';
import { debounce } from 'lodash-es';
import EditorHeader from './EditorHeader.vue';
import EditorPane from './EditorPane.vue';
import PreviewPane from './PreviewPane.vue';
import FrontmatterEditor from './FrontmatterEditor.vue';
import SearchReplace from './SearchReplace.vue';
import { useServices } from '@/composables/useServices';
import { useAutocomplete } from '@/composables/useAutocomplete';
import { useEditorShortcuts } from '@/composables/useEditorShortcuts';
import { useEditorValidation } from '@/composables/useEditorValidation';
import { useUndoRedo } from '@/composables/useUndoRedo';
import { useSearchReplace } from '@/composables/useSearchReplace';
import { useFocusMode } from '@/composables/useFocusMode';
import { useSyncScroll } from '@/composables/useSyncScroll';
import { getArticleService } from '@/services/ArticleService';
import { notificationService } from '@/services/NotificationService';
import type { Article } from '@/types';
import type { PublishConfig, PublishResult } from '@/main/services/PublishService';
import { generateGitCommands } from '@/utils/gitCommandGenerator';
import type { GitCommands } from '@/utils/gitCommandGenerator';
import GitOperationGuide from './GitOperationGuide.vue';

const articleStore = useArticleStore();
const configStore = useConfigStore();

// 使用服務單例
const { markdownService, obsidianSyntaxService: obsidianSyntax, previewService, imageService } = useServices();
const articleService = getArticleService();

// Reactive data
const content = ref('');
const isSwitchingMode = ref(false); // 防止模式切換期間的副作用
const showPreview = ref(false);
const showFrontmatterEditor = ref(false);
const showGitGuide = ref(false);
const gitCommands = ref<GitCommands | null>(null);
const renderedContent = ref('');
const autoSaveTimer = ref<number | null>(null);
const editorMode = ref<'compose' | 'raw'>('compose');
const rawContent = ref('');

// 專注模式
const { focusMode, toggleFocusMode } = useFocusMode();

// Component references
const editorPaneRef = ref<InstanceType<typeof EditorPane>>();
const previewPaneRef = ref<InstanceType<typeof PreviewPane>>();

// Get editorRef from EditorPane component
const editorRef = computed(() => editorPaneRef.value?.editorRef);

// Get preview container ref from PreviewPane component
const previewRef = computed(() => previewPaneRef.value?.previewContainerRef);

// 同步滾動功能
const {
    syncEnabled,
    onEditorScroll,
    onPreviewScroll,
    setSync
} = useSyncScroll(editorRef, previewRef);

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
    canUndo: _canUndo,
    canRedo: _canRedo,
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
    jumpToMatch: _jumpToMatch,
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
const imageFiles = ref<string[]>([])
// 直接從 store 取得 allTags，不在組件中重複計算
const allTags = computed(() => articleStore.allTags)

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
    // ✅ 只更新 UI 相關的邏輯，不直接修改 store
    if (showPreview.value) {
        updatePreview();
    }

    // Trigger autocomplete and validation
    updateAutocomplete();
    debounceValidation();

    // 排程自動儲存（會調用 service）
    scheduleAutoSave();
}

// Watch content changes
let historyTimeout: ReturnType<typeof setTimeout> | null = null;
watch(content, (newContent) => {
    // 模式切換期間不處理內容變更
    if (isSwitchingMode.value) {
        return;
    }

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
    if (!articleStore.currentArticle) {
        return;
    }

    try {
        let updatedArticle: Article;

        if (editorMode.value === 'raw') {
            // ✅ Raw 模式：解析完整內容並更新
            const parsed = articleService.parseRawContent(rawContent.value);
            updatedArticle = articleService.updateArticleData(
                articleStore.currentArticle,
                {
                    content: parsed.content,
                    frontmatter: parsed.frontmatter
                }
            );
        } else {
            // ✅ 撰寫模式：只更新 content
            updatedArticle = articleService.updateArticleData(
                articleStore.currentArticle,
                { content: content.value }
            );
        }

        // 調用 service 儲存到磁碟
        const result = await articleService.saveArticle(updatedArticle);

        if (result.success) {
            // 更新 store 中的資料（透過 store 的 action）
            await articleStore.updateArticle(updatedArticle);
        } else if (result.conflict) {
            console.warn('[Editor] File conflict detected during auto-save');
            // 衝突時不強制儲存
        } else if (result.error) {
            console.error('[Editor] Failed to save article:', result.error);
        }
    } catch (error) {
        // 靜默處理錯誤，自動儲存失敗不需要通知用戶
        console.error('[Editor] Auto-save error:', error);
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

async function handlePublishToBlog() {
    const article = articleStore.currentArticle;
    if (!article) {
        notificationService.error('沒有文章可發布');
        return;
    }

    // 先儲存當前內容
    await saveArticle();

    // 檢查配置
    const config = configStore.config;
    if (!config.paths.articlesDir || !config.paths.targetBlog) {
        notificationService.error('請先在設定中配置文章目錄和部落格路徑');
        return;
    }

    // 確認發布
    if (!confirm(`確定要發布文章「${article.title}」到部落格嗎？`)) {
        return;
    }

    try {
        const publishConfig: PublishConfig = {
            articlesDir: config.paths.articlesDir,
            targetBlogDir: config.paths.targetBlog,
            imagesDir: config.paths.imagesDir
        };

        notificationService.info('正在發布文章...');

        const result: PublishResult = await window.electronAPI.publishArticle(
            article,
            publishConfig,
            (step: string, progress: number) => {
                console.log(`發布進度: ${step} - ${progress}%`);
            }
        );

        if (result.success) {
            notificationService.success(`成功發布文章: ${article.title}`);

            // 生成 Git 指令並顯示操作指南
            if (result.targetPath) {
                // 計算相對於 Astro 專案的路徑
                const relativePath = result.targetPath.replace(/\\/g, '/');
                const pathParts = relativePath.split('/');
                const relativeToProject = pathParts.slice(pathParts.indexOf('src')).join('/');

                gitCommands.value = generateGitCommands(article, relativeToProject);
                showGitGuide.value = true;
            }

            // 如果有警告，顯示警告訊息
            if (result.warnings && result.warnings.length > 0) {
                console.warn('發布警告:', result.warnings);
                result.warnings.forEach(warning => {
                    notificationService.warning(warning);
                });
            }
        } else {
            notificationService.error(`發布失敗: ${result.message}`);

            // 顯示詳細錯誤
            if (result.errors && result.errors.length > 0) {
                result.errors.forEach(error => {
                    notificationService.error(error);
                });
            }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知錯誤';
        notificationService.error(`發布失敗: ${errorMessage}`);
        console.error('Failed to publish article:', error);
    }
}

function togglePreview() {
    showPreview.value = !showPreview.value;
    if (showPreview.value) {
        updatePreview();
    }
}

function toggleSyncScroll() {
    setSync(!syncEnabled.value);
}

function toggleEditorMode() {
    // 防止重複切換
    if (isSwitchingMode.value) {
        console.warn('[EditorMode] 正在切換模式中，請稍後再試');
        return;
    }

    if (!articleStore.currentArticle) {
        return;
    }

    // 設置切換標誌
    isSwitchingMode.value = true;

    try {
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
            // ✅ 切換到 Raw 模式 - 使用 service 組合內容
            rawContent.value = articleService.combineToRawContent(
                articleStore.currentArticle.frontmatter,
                content.value  // 使用當前編輯中的內容
            );
            editorMode.value = 'raw';
        } else {
            // ✅ 切換到撰寫模式 - 使用 service 解析內容
            const parsed = articleService.parseRawContent(rawContent.value);

            // 更新本地編輯狀態
            content.value = parsed.content;

            // 注意：這裡不直接修改 store，只有在儲存時才會更新
            // 如果需要立即反映到 store，應該調用 store 的 action

            editorMode.value = 'compose';
        }
    } catch (error) {
        console.error('[EditorMode] 模式切換失敗:', error);
    } finally {
        // 延遲解除鎖定，確保所有副作用完成
        setTimeout(() => {
            isSwitchingMode.value = false;
        }, 100);
    }
}

function handleRawContentChange() {
    // 模式切換期間不處理內容變更
    if (isSwitchingMode.value) {
        return;
    }

    if (!articleStore.currentArticle) {
        return;
    }

    try {
        // ✅ 使用 service 解析，不直接修改 store
        const parsed = articleService.parseRawContent(rawContent.value);

        // 更新本地 content 用於預覽
        content.value = parsed.content;

        // 檢查是否有解析錯誤
        if (parsed.errors.length > 0) {
            console.warn('[RawMode] Frontmatter 解析警告:', parsed.errors);
        }

        // 排程自動儲存（會通過 service 更新 store）
        scheduleAutoSave();

        if (showPreview.value) {
            updatePreview();
        }
    } catch (error) {
        console.error('[RawMode] 解析 frontmatter 失敗:', error);
        // 不拋出錯誤，避免中斷使用者輸入
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
    } catch {
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
    if (matches.length === 0 || !editorRef.value) { return; }

    const match = matches[currentIndex];

    // 選取匹配的文字
    editorRef.value.setSelectionRange(match.start, match.end);
    editorRef.value.focus();

    // 滾動到可見區域
    scrollToSelection();
}

function scrollToSelection() {
    if (!editorRef.value) { return; }

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
// 使用 debounce 避免頻繁更新
const updateServices = debounce(() => {
    // 更新 ObsidianSyntaxService 的文章清單
    obsidianSyntax.updateArticles(articleStore.articles)

    // 更新 ImageService 的文章清單
    imageService.updateArticles(articleStore.articles)
}, 300)

watch(
    () => articleStore.articles.length,
    updateServices,
    { immediate: true }
)

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
