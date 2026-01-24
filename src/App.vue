<template>
  <div id="app" class="h-screen flex flex-col bg-base-100">
    <!-- Header -->
    <header class="navbar bg-base-200 shadow-sm">
      <div class="navbar-start">
        <h1 class="text-xl font-bold">部落格撰寫應用程式</h1>
      </div>

      <!-- 視圖切換 -->
      <div class="navbar-center">
        <div class="tabs tabs-boxed">
          <a class="tab gap-2" :class="{ 'tab-active': currentView === 'editor' }" @click="currentView = 'editor'">
            <Edit3 :size="16" />
            編輯器
          </a>
          <a class="tab gap-2" :class="{ 'tab-active': currentView === 'manage' }" @click="currentView = 'manage'">
            <List :size="16" />
            文章管理
          </a>
        </div>
      </div>

      <div class="navbar-end">
        <!-- 設定按鈕已移至 ActivityBar -->
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex flex-col flex-1 overflow-hidden">
      <div class="flex flex-1 overflow-hidden">
        <!-- 編輯器視圖 -->
        <template v-if="currentView === 'editor'">
          <!-- Activity Bar -->
          <ActivityBar v-model="activeView" @open-settings="showSettings = true" />

          <!-- Side Bar View -->
          <SideBarView v-model="activeView" />

          <!-- Content Area -->
          <main class="flex-1 bg-base-100 overflow-hidden">
            <div v-if="!configStore.config.paths.articlesDir" class="flex items-center justify-center h-full p-8">
              <div class="card w-96 bg-base-100 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">歡迎使用部落格撰寫應用程式</h2>
                  <p>請先設定您的文章資料夾路徑。</p>
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

            <div v-else class="h-full">
              <MainEditor />
            </div>
          </main>
        </template>

        <!-- 文章管理視圖 -->
        <template v-else-if="currentView === 'manage'">
          <ArticleManagement @edit-article="handleEditArticle" />
        </template>
      </div>

      <!-- 伺服器控制面板 -->
      <ServerControlPanel />
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
import { useActivityBarShortcuts } from "@/composables/useActivityBarShortcuts";
import { Edit3, List, FileText } from "lucide-vue-next";

import ActivityBar from "@/components/ActivityBar.vue";
import SideBarView from "@/components/SideBarView.vue";
import MainEditor from "@/components/MainEditor.vue";
import ArticleManagement from "@/components/ArticleManagement.vue";
import SettingsPanel from "@/components/SettingsPanel.vue";
import ServerControlPanel from "@/components/ServerControlPanel.vue";
import ToastContainer from "@/components/ToastContainer.vue";

const configStore = useConfigStore();
const articleStore = useArticleStore();
const showSettings = ref(false);
const currentView = ref<"editor" | "manage">("editor");
const activeView = ref<string>("articles");

// 設定快捷鍵
useActivityBarShortcuts(activeView);

// 從文章管理切換回編輯器時，設定當前文章
function handleEditArticle() {
  currentView.value = "editor";
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
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>

<style scoped>
/* Custom styles if needed */
</style>
