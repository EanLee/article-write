<template>
  <div class="space-y-4">
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h4 class="font-semibold text-lg mb-4">Git 發布設定</h4>
        <p class="text-sm text-base-content/70 mb-4">
          管理文章發布後的 Git 操作流程
        </p>

        <!-- Current Version Features -->
        <div class="alert alert-success mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h4 class="font-bold">✨ v0.1 已提供 Git 操作指南</h4>
            <div class="text-xs mt-1">
              發布文章後會自動顯示 Git 操作指令，提供一鍵複製功能
            </div>
          </div>
        </div>

        <!-- Current Features List -->
        <div class="bg-base-200 rounded-lg p-4 mb-4">
          <h5 class="font-semibold mb-3">當前功能 (v0.1)</h5>
          <ul class="space-y-2 text-sm">
            <li class="flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success flex-shrink-0 mt-0.5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>自動生成 Git 指令</strong>：根據發布的文章自動生成 add、commit、push 指令</span>
            </li>
            <li class="flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success flex-shrink-0 mt-0.5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>標準化 Commit Message</strong>：遵循 Conventional Commits 規範</span>
            </li>
            <li class="flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success flex-shrink-0 mt-0.5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>一鍵複製</strong>：單個指令或完整指令序列均可快速複製</span>
            </li>
            <li class="flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success flex-shrink-0 mt-0.5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span><strong>操作指引</strong>：每個步驟都有清楚的說明</span>
            </li>
          </ul>
        </div>

        <!-- Future Features Notice -->
        <div class="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h4 class="font-bold">🚀 v0.2 將支援 Git 自動化</h4>
            <div class="text-xs mt-1">下個版本將提供一鍵自動執行 Git 操作的功能</div>
          </div>
        </div>

        <!-- Preview of Future Features -->
        <div class="space-y-4 mt-6 opacity-50 pointer-events-none">
          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-4">
              <input type="checkbox" class="toggle toggle-primary" disabled />
              <div>
                <span class="label-text font-semibold">自動 Git Commit</span>
                <p class="text-xs text-base-content/60 mt-1">發布時自動建立 commit</p>
              </div>
            </label>
          </div>

          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-4">
              <input type="checkbox" class="toggle toggle-primary" disabled />
              <div>
                <span class="label-text font-semibold">自動 Git Push</span>
                <p class="text-xs text-base-content/60 mt-1">commit 後自動推送到遠端</p>
              </div>
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Commit Message 模板</span>
            </label>
            <input type="text" placeholder="publish: {title}" class="input input-bordered" disabled />
            <label class="label">
              <span class="label-text-alt">使用 {title} 代表文章標題</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 純展示元件，無互動狀態（功能待 v0.2 實作）
</script>
