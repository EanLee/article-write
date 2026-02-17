<template>
  <div id="app" class="h-screen flex bg-base-100">
    <!-- Activity Bar (Mode Selector)：專注模式時隱藏 -->
    <ActivityBar v-if="!focusMode" v-model="currentMode" :ai-panel-open="aiPanelStore.isOpen" @open-settings="openSettings()" @toggle-sidebar="toggleSidebar" @toggle-ai-panel="aiPanelStore.toggle()" />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Editor Mode -->
      <template v-if="currentMode === ViewMode.Editor">
        <div class="flex flex-1 overflow-hidden">
          <!-- Sidebar -->
          <SideBarView v-model="sidebarView" :is-collapsed="sidebarCollapsed" />

          <!-- Editor Content -->
          <main class="flex-1 bg-base-100 overflow-hidden flex flex-col">
            <div v-if="!configStore.config.paths.articlesDir" class="flex items-center justify-center h-full p-8">
              <div class="card w-96 bg-base-100 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">歡迎使用 WriteFlow</h2>
                  <p>讓寫作更流暢。請先設定您的文章資料夾路徑開始使用。</p>
                  <div class="card-actions justify-end">
                    <button class="btn btn-primary" @click="openSettings()">
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
              <MainEditor />
            </div>

          </main>

          <!-- AI Panel（Editor Mode，不限是否選文章） -->
          <AIPanelView
            v-if="currentMode === ViewMode.Editor && aiPanelStore.isOpen"
            :article="articleStore.currentArticle"
            @open-settings="openSettings"
          />
        </div>
      </template>

      <!-- Management Mode -->
      <template v-else-if="currentMode === ViewMode.Management">
        <ArticleManagement @edit-article="switchToEditorMode" />
      </template>
    </div>

    <!-- Settings Modal -->
    <SettingsPanel v-model="showSettings" :initial-tab="settingsInitialTab" />

    <!-- Toast Notifications -->
    <ToastContainer />

    <!-- 全文搜尋面板 -->
    <SearchPanel />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useFocusMode } from "@/composables/useFocusMode";
import { useConfigStore } from "@/stores/config";
import { useArticleStore } from "@/stores/article";
import { autoSaveService } from "@/services/AutoSaveService";
import { metadataCacheService } from "@/services/MetadataCacheService";
import { notificationService } from "@/services/NotificationService";
import { ViewMode, SidebarView } from "@/types";
import { FileText } from "lucide-vue-next";

import SearchPanel from "@/components/SearchPanel.vue";
import { useSearchStore } from "@/stores/search";
import { useAIPanelStore } from "@/stores/aiPanel";
import AIPanelView from "@/components/AIPanelView.vue";
import ActivityBar from "@/components/ActivityBar.vue";
import SideBarView from "@/components/SideBarView.vue";
import MainEditor from "@/components/MainEditor.vue";
import SettingsPanel from "@/components/SettingsPanel.vue";
import ToastContainer from "@/components/ToastContainer.vue";
import ArticleManagement from "@/components/ArticleManagement.vue";

const configStore = useConfigStore();
const articleStore = useArticleStore();
const { focusMode } = useFocusMode();
const aiPanelStore = useAIPanelStore();
const showSettings = ref(false);
const settingsInitialTab = ref('basic');
function openSettings(tab?: string) {
  settingsInitialTab.value = tab ?? 'basic';
  showSettings.value = true;
}
const currentMode = ref<ViewMode>(ViewMode.Editor);
const sidebarView = ref<SidebarView>(SidebarView.Articles);
const sidebarCollapsed = ref(false);
const searchStore = useSearchStore();

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === 'b') {
    e.preventDefault();
    toggleSidebar();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
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

let unsubscribeUpdateAvailable: (() => void) | null = null
let unsubscribeUpdateDownloaded: (() => void) | null = null

function setupUpdateListeners() {
  if (!window.electronAPI?.onUpdateAvailable) {return}

  unsubscribeUpdateAvailable = window.electronAPI.onUpdateAvailable(({ version }) => {
    notificationService.info(
      `新版本 v${version} 下載中`,
      '下載完成後將通知您',
      { duration: 5000 }
    )
  })

  unsubscribeUpdateDownloaded = window.electronAPI.onUpdateDownloaded(({ version }) => {
    notificationService.info(
      `新版本 v${version} 已就緒`,
      '重啟 App 即可套用更新',
      {
        duration: 0,
        action: {
          label: '立刻重啟',
          callback: () => window.electronAPI.installUpdate()
        }
      }
    )
  })
}

onMounted(async () => {
  await configStore.loadConfig();

  // 只要有 articlesDir 就載入文章（targetBlog 是發布用的，不影響文章載入）
  if (configStore.config.paths.articlesDir) {
    await articleStore.loadArticles();
    // 背景載入 metadata cache，載入失敗則自動掃描
    const articlesDir = configStore.config.paths.articlesDir;
    const cached = await metadataCacheService.load(articlesDir);
    if (!cached) {
      metadataCacheService.scan(articlesDir).catch((e) =>
        console.warn('Metadata cache scan failed:', e)
      );
    }
  }

  // 監聽頁面關閉事件
  window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("keydown", handleGlobalKeydown);

  // 監聽 Auto-Update 事件
  setupUpdateListeners();
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  window.removeEventListener("keydown", handleGlobalKeydown);
  unsubscribeUpdateAvailable?.()
  unsubscribeUpdateDownloaded?.()
});
</script>

<style scoped>
/* Custom styles if needed */
</style>
