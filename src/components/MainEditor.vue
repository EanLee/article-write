<template>
    <div class="h-full flex flex-col">
        <!-- Editor Header -->
        <EditorHeader
            :article="articleStore.currentArticle"
            :show-preview="showPreview"
            @toggle-preview="togglePreview"
            @edit-frontmatter="showFrontmatterEditor = true"
            @move-to-published="moveToPublished"
        />

        <!-- Editor Content -->
        <div class="flex flex-1 overflow-hidden">
            <!-- Editor Pane -->
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
import { ref, computed, watch, onUnmounted, onMounted } from 'vue';
import { useArticleStore } from '@/stores/article';
import { useConfigStore } from '@/stores/config';
import EditorHeader from './EditorHeader.vue';
import EditorPane from './EditorPane.vue';
import PreviewPane from './PreviewPane.vue';
import FrontmatterEditor from './FrontmatterEditor.vue';
import { ObsidianSyntaxService } from '@/services/ObsidianSyntaxService';
import { MarkdownService } from '@/services/MarkdownService';
import { PreviewService } from '@/services/PreviewService';
import { ImageService, type ImageValidationWarning } from '@/services/ImageService';
import type { Article } from '@/types';
import type { SuggestionItem, SyntaxError, AutocompleteContext } from '@/services/ObsidianSyntaxService';

const articleStore = useArticleStore();
const configStore = useConfigStore();

// Initialize services
const obsidianSyntax = new ObsidianSyntaxService();
const markdownService = new MarkdownService();
const previewService = new PreviewService();
const imageService = new ImageService();

// Reactive data
const content = ref('');
const showPreview = ref(false);
const showFrontmatterEditor = ref(false);
const renderedContent = ref('');
const autoSaveTimer = ref<number | null>(null);

// Component references
const editorPaneRef = ref<InstanceType<typeof EditorPane>>();

// Obsidian syntax support data
const suggestions = ref<SuggestionItem[]>([]);
const showSuggestions = ref(false);
const selectedSuggestionIndex = ref(0);
const syntaxErrors = ref<SyntaxError[]>([]);
const dropdownPosition = ref({ top: 0, left: 0 });
const imageFiles = ref<string[]>([]);
const allTags = ref<string[]>([]);
const imageValidationWarnings = ref<ImageValidationWarning[]>([]);

// Get editorRef from EditorPane component
const editorRef = computed(() => editorPaneRef.value?.editorRef);

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

// Validation timer
let validationTimeout: number | null = null;

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
watch(content, () => {
    handleContentChange();
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

// Enhanced keyboard handling with shortcuts
function handleKeydown(event: KeyboardEvent) {
    // Handle autocomplete suggestions first
    if (showSuggestions.value && suggestions.value.length > 0) {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                selectedSuggestionIndex.value = Math.min(
                    selectedSuggestionIndex.value + 1,
                    suggestions.value.length - 1
                );
                break;
            case 'ArrowUp':
                event.preventDefault();
                selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, 0);
                break;
            case 'Enter':
            case 'Tab':
                event.preventDefault();
                applySuggestion(suggestions.value[selectedSuggestionIndex.value]);
                break;
            case 'Escape':
                hideSuggestions();
                break;
        }
        return;
    }

    // Enhanced keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case 's':
                event.preventDefault();
                saveArticle();
                break;
            case 'b':
                event.preventDefault();
                insertMarkdownSyntax('**', '**', '粗體文字');
                break;
            case 'i':
                event.preventDefault();
                insertMarkdownSyntax('*', '*', '斜體文字');
                break;
            case 'k':
                event.preventDefault();
                insertMarkdownSyntax('[[', ']]', '連結文字');
                break;
            case 'e':
                event.preventDefault();
                insertMarkdownSyntax('==', '==', '高亮文字');
                break;
            case '/':
                event.preventDefault();
                togglePreview();
                break;
        }
    }

    // Auto-pairing for brackets and quotes
    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const textarea = event.target as HTMLTextAreaElement;
        const { selectionStart } = textarea;

        switch (event.key) {
            case '[':
                if (textarea.value[selectionStart - 1] === '[') {
                    event.preventDefault();
                    insertMarkdownSyntax('', ']]', '');
                }
                break;
            case '(':
                event.preventDefault();
                insertMarkdownSyntax('(', ')', '');
                break;
            case '"':
                event.preventDefault();
                insertMarkdownSyntax('"', '"', '');
                break;
            case "'":
                event.preventDefault();
                insertMarkdownSyntax("'", "'", '');
                break;
            case '`':
                event.preventDefault();
                if (selectionStart > 0 && textarea.value[selectionStart - 1] === '`') {
                    insertMarkdownSyntax('`', '```', '');
                } else {
                    insertMarkdownSyntax('`', '`', '');
                }
                break;
        }
    }
}

function updateAutocomplete() {
    const textarea = editorRef.value;
    if (!textarea) {
        return;
    }

    const cursorPosition = textarea.selectionStart;
    const text = textarea.value;

    // 建立自動完成上下文
    const context: AutocompleteContext = {
        text,
        cursorPosition,
        lineNumber: text.substring(0, cursorPosition).split('\n').length,
        columnNumber: cursorPosition - text.lastIndexOf('\n', cursorPosition - 1)
    };

    // 使用 ObsidianSyntaxService 取得建議
    suggestions.value = obsidianSyntax.getAutocompleteSuggestions(context);

    if (suggestions.value.length > 0) {
        selectedSuggestionIndex.value = 0;
        showSuggestions.value = true;
        updateDropdownPosition();
    } else {
        hideSuggestions();
    }
}

function updateDropdownPosition() {
    const textarea = editorRef.value;
    if (!textarea) {
        return;
    }

    const cursorPosition = textarea.selectionStart;

    // 使用 ObsidianSyntaxService 計算下拉選單位置
    dropdownPosition.value = obsidianSyntax.calculateDropdownPosition(textarea, cursorPosition);
}

function applySuggestion(suggestion: SuggestionItem) {
    const textarea = editorRef.value;
    if (!textarea) {
        return;
    }

    const cursorPosition = textarea.selectionStart;

    // 使用 ObsidianSyntaxService 應用建議
    const newText = obsidianSyntax.applySuggestionToText(textarea, suggestion, cursorPosition);
    content.value = newText;

    if (articleStore.currentArticle) {
        articleStore.currentArticle.content = newText;
    }

    hideSuggestions();
}

function hideSuggestions() {
    showSuggestions.value = false;
    suggestions.value = [];
    selectedSuggestionIndex.value = 0;
}

function insertMarkdownSyntax(before: string, after: string, placeholder: string) {
    const textarea = editorRef.value;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const selectedText = textarea.value.substring(selectionStart, selectionEnd);
    const textToInsert = selectedText || placeholder;

    const beforeText = textarea.value.substring(0, selectionStart);
    const afterText = textarea.value.substring(selectionEnd);

    const newText = beforeText + before + textToInsert + after + afterText;
    content.value = newText;

    if (articleStore.currentArticle) {
        articleStore.currentArticle.content = newText;
    }

    // Set cursor position
    const newCursorStart = selectionStart + before.length;
    const newCursorEnd = newCursorStart + textToInsert.length;

    setTimeout(() => {
        textarea.setSelectionRange(newCursorStart, newCursorEnd);
        textarea.focus();
    }, 0);
}

function insertTable() {
    const tableTemplate = `| 標題1 | 標題2 | 標題3 |
|-------|-------|-------|
| 內容1 | 內容2 | 內容3 |
| 內容4 | 內容5 | 內容6 |

`;
    insertMarkdownSyntax('', '', tableTemplate);
}

function debounceValidation() {
    if (validationTimeout) {
        clearTimeout(validationTimeout);
    }

    validationTimeout = setTimeout(() => {
        validateSyntax();
    }, 500); // 500ms debounce
}

async function validateSyntax() {
    // 使用 ObsidianSyntaxService 和 MarkdownService 進行語法驗證
    const obsidianErrors = obsidianSyntax.validateSyntax(content.value);
    const markdownErrors = markdownService.validateMarkdownSyntax(content.value);

    // 進行圖片驗證
    const imageWarnings = await imageService.getImageValidationWarnings(content.value);
    imageValidationWarnings.value = imageWarnings;

    // 將圖片驗證警告轉換為語法錯誤格式
    const imageErrors: SyntaxError[] = imageWarnings.map(warning => ({
        line: warning.line,
        column: warning.column,
        message: warning.message,
        type: warning.severity,
        suggestion: warning.suggestion
    }));

    // 合併所有驗證結果
    syntaxErrors.value = [
        ...obsidianErrors,
        ...markdownErrors.map((error) => ({
            line: error.line,
            column: 0, // MarkdownService doesn't provide column info
            message: error.message,
            type: error.type as 'error' | 'warning',
            suggestion: ''
        })),
        ...imageErrors
    ];
}

async function initializeObsidianSupport() {
    try {
        // 更新 ObsidianSyntaxService 的文章清單
        obsidianSyntax.updateArticles(articleStore.articles);

        // Update tags from articles
        const tagSet = new Set<string>();
        articleStore.articles.forEach((article: Article) => {
            article.frontmatter.tags.forEach((tag: string) => tagSet.add(tag));
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
            if (showPreview.value) {
                updatePreview();
            }
        }
    },
    { immediate: true }
);

// Watch for articles changes to update tags and services
watch(
    () => articleStore.articles,
    () => {
        // 更新 ObsidianSyntaxService 的文章清單
        obsidianSyntax.updateArticles(articleStore.articles);
        
        // 更新 ImageService 的文章清單
        imageService.updateArticles(articleStore.articles);

        const tagSet = new Set<string>();
        articleStore.articles.forEach((article: Article) => {
            article.frontmatter.tags.forEach((tag: string) => tagSet.add(tag));
        });
        allTags.value = Array.from(tagSet);
    },
    { deep: true }
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

    // Click outside to hide suggestions
    document.addEventListener('click', (event) => {
        if (!editorRef.value?.contains(event.target as Node)) {
            hideSuggestions();
        }
    });
});

// Cleanup
onUnmounted(() => {
    if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value);
    }
    if (validationTimeout) {
        clearTimeout(validationTimeout);
    }
});
</script>
