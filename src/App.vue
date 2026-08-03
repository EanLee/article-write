<template>
  <div id="app" class="h-screen flex bg-base-100">
    <!-- Activity Bar (Mode Selector)：專注模式時隱藏 -->
    <ActivityBar
      v-if="!focusMode"
      v-model="currentMode"
      :ai-panel-open="aiPanelStore.isOpen"
      @open-settings="showSettings = true"
      @toggle-sidebar="toggleSidebar"
      @toggle-ai-panel="aiPanelStore.toggle()"
    />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Editor Mode -->
      <template v-if="currentMode === ViewMode.Editor">
        <div class="flex flex-1 overflow-hidden">
          <!-- Sidebar -->
          <SideBarView
            v-model="sidebarView"
            :is-collapsed="sidebarCollapsed"
            :outline-headings="outlineHeadings"
            @scroll-to-outline-line="handleScrollToOutlineLine"
            @edit-frontmatter="mainEditorRef?.openFrontmatterEditor()"
          />

          <!-- Editor Content -->
          <main class="flex-1 bg-base-100 overflow-hidden flex flex-col">
            <div v-if="!configStore.config.paths.articlesDir" class="flex items-center justify-center h-full p-8">
              <div class="card w-96 bg-base-100 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">歡迎使用 WriteFlow</h2>
                  <p>讓寫作更流暢。請先設定您的文章資料夾路徑開始使用。</p>
                  <div class="card-actions justify-end">
                    <button class="btn btn-primary" @click="showSettings = true">
                      開始設定
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="!articleStore.currentArticle" class="flex items-center justify-center h-full">
              <div class="text-center">
                <FileText :size="64" class="mx-auto mb-4 text-base-content/30" />
                <p class="text-lg text-base-content/70">請選擇一篇文章開始編輯</p>
              </div>
            </div>

            <div v-else class="h-full flex flex-col">
              <MainEditor ref="mainEditorRef" />
            </div>

          </main>
        </div>
      </template>

      <!-- Management Mode -->
      <template v-else-if="currentMode === ViewMode.Management">
        <ArticleManagement @edit-article="switchToEditorMode" />
      </template>

      <!-- 開發伺服器底部控制台（IA 稽核 Phase 2 第一項）：橫跨側邊欄＋編輯區，只在編輯模式顯示 -->
      <ServerControlPanel v-if="currentMode === ViewMode.Editor" />
    </div>

    <!-- AI 助手面板：右側可收合 dock，任何模式都能開關（ActivityBar 按鈕不分模式都可點，
         若面板只在編輯模式渲染，管理模式點擊會出現「按鈕變 active 但畫面沒反應」的不一致） -->
    <AIPanelView
      v-if="aiPanelStore.isOpen"
      :article="articleStore.currentArticle"
      @open-settings="showSettings = true"
    />

    <!-- Settings Modal -->
    <SettingsPanel v-model="showSettings" />

    <!-- Global Search Panel -->
    <SearchPanel />

    <!-- Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useFocusMode } from "@/composables/useFocusMode";
import { useConfigStore } from "@/stores/config";
import { useArticleStore } from "@/stores/article";
import { useSearchStore } from "@/stores/search";
import { useAIPanelStore } from "@/stores/aiPanel";
import { autoSaveService } from "@/services/AutoSaveService";
import { ViewMode, SidebarView } from "@/types";
import { FileText } from "@lucide/vue";

import ActivityBar from "@/components/ActivityBar.vue";
import SideBarView from "@/components/SideBarView.vue";
import MainEditor from "@/components/MainEditor.vue";
import type { OutlineHeading } from "@/components/CodeMirrorEditor.vue";
import SettingsPanel from "@/components/SettingsPanel.vue";
import SearchPanel from "@/components/SearchPanel.vue";
import ToastContainer from "@/components/ToastContainer.vue";
import ArticleManagement from "@/components/ArticleManagement.vue";
import AIPanelView from "@/components/AIPanelView.vue";
import ServerControlPanel from "@/components/ServerControlPanel.vue";

const configStore = useConfigStore();
const articleStore = useArticleStore();
const searchStore = useSearchStore();
const aiPanelStore = useAIPanelStore();
const { focusMode } = useFocusMode();
const showSettings = ref(false);
const currentMode = ref<ViewMode>(ViewMode.Editor);
const sidebarView = ref<SidebarView>(SidebarView.Articles);
const sidebarCollapsed = ref(false);
const mainEditorRef = ref<InstanceType<typeof MainEditor>>();

const outlineHeadings = computed<OutlineHeading[]>(() => {
  const content = articleStore.currentArticle?.content ?? "";
  return content.split("\n").flatMap((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (!match) {return [];}
    return [{ level: match[1].length, text: match[2].trim(), line: index }];
  });
});

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function handleScrollToOutlineLine(line: number) {
  mainEditorRef.value?.scrollToLine(line);
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === "b") {
    // CM editor 自行處理 Ctrl+B（粗體），此時不 toggle sidebar
    if (!(e.target as HTMLElement).closest?.(".cm-editor")) {
      e.preventDefault();
      toggleSidebar();
    }
  } else if (e.ctrlKey && !e.shiftKey && e.key === "f") {
    e.preventDefault();
    searchStore.open();
  }
}

// 從管理模式切換回編輯模式
function switchToEditorMode() {
  currentMode.value = ViewMode.Editor;
}

// 頁面關閉前檢查未儲存變更
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (autoSaveService.hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = "您有未儲存的變更，確定要離開嗎？";
    return e.returnValue;
  }
}

onMounted(async () => {
  await configStore.loadConfig();

  // 只要有 articlesDir 就載入文章（targetBlog 是發布用的，不影響文章載入）
  if (configStore.config.paths.articlesDir) {
    await articleStore.loadArticles();
  }

  // 監聽頁面關閉事件
  globalThis.addEventListener("beforeunload", handleBeforeUnload);
  globalThis.addEventListener("keydown", handleGlobalKeydown);
});

onUnmounted(() => {
  globalThis.removeEventListener("beforeunload", handleBeforeUnload);
  globalThis.removeEventListener("keydown", handleGlobalKeydown);
});
</script>

<style scoped>
/* Custom styles if needed */
</style>
