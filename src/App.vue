<template>
  <div id="app" class="h-screen flex bg-base-100">
    <!-- Activity Bar (Mode Selector) -->
    <ActivityBar v-model="currentMode" @open-settings="showSettings = true" @toggle-sidebar="toggleSidebar" />

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
              <MainEditor />
            </div>

          </main>
        </div>
      </template>

      <!-- Management Mode -->
      <template v-else-if="currentMode === ViewMode.Management">
        <ArticleManagement @edit-article="switchToEditorMode" />
      </template>
    </div>

    <!-- Settings Modal -->
    <SettingsPanel v-model="showSettings" />

    <!-- Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useConfigStore } from "@/stores/config";
import { useArticleStore } from "@/stores/article";
import { autoSaveService } from "@/services/AutoSaveService";
import { ViewMode, SidebarView } from "@/types";
import { FileText } from "lucide-vue-next";

import ActivityBar from "@/components/ActivityBar.vue";
import SideBarView from "@/components/SideBarView.vue";
import MainEditor from "@/components/MainEditor.vue";
import SettingsPanel from "@/components/SettingsPanel.vue";
import ToastContainer from "@/components/ToastContainer.vue";
import ArticleManagement from "@/components/ArticleManagement.vue";

const configStore = useConfigStore();
const articleStore = useArticleStore();
const showSettings = ref(false);
const currentMode = ref<ViewMode>(ViewMode.Editor);
const sidebarView = ref<SidebarView>(SidebarView.Articles);
const sidebarCollapsed = ref(false);

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === 'b') {
    e.preventDefault();
    toggleSidebar();
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
  window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("keydown", handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  window.removeEventListener("keydown", handleGlobalKeydown);
});
</script>

<style scoped>
/* Custom styles if needed */
</style>
