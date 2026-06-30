<template>
  <div class="space-y-4">
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h4 class="font-semibold text-lg mb-3">選擇部落格框架</h4>
        <p class="text-sm text-base-content/70 mb-4">
          選擇您使用的靜態網站生成器，我們會自動適配對應的檔案結構
        </p>

        <!-- Astro Option -->
        <div class="form-control">
          <label
            class="label cursor-pointer justify-start gap-4 p-4 border border-base-300 rounded-lg hover:bg-base-200 transition-colors">
            <input type="radio" name="framework" value="astro" class="radio radio-primary" checked disabled />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-semibold">Astro</span>
                <span class="badge badge-primary badge-sm">目前支援</span>
              </div>
              <p class="text-xs text-base-content/60 mt-1">
                支援 Content Collections 結構 (src/content/blog/)
              </p>
            </div>
          </label>
        </div>

        <!-- Future Frameworks -->
        <div class="divider text-sm text-base-content/50">即將支援</div>

        <div class="space-y-2 opacity-50">
          <div class="form-control">
            <label class="label cursor-not-allowed justify-start gap-4 p-4 border border-base-300 rounded-lg">
              <input type="radio" name="framework" value="hugo" class="radio radio-primary" disabled />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">Hugo</span>
                  <span class="badge badge-ghost badge-sm">規劃中</span>
                </div>
                <p class="text-xs text-base-content/60 mt-1">
                  支援 Hugo 標準內容結構 (content/posts/)
                </p>
              </div>
            </label>
          </div>

          <div class="form-control">
            <label class="label cursor-not-allowed justify-start gap-4 p-4 border border-base-300 rounded-lg">
              <input type="radio" name="framework" value="hexo" class="radio radio-primary" disabled />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">Hexo</span>
                  <span class="badge badge-ghost badge-sm">規劃中</span>
                </div>
                <p class="text-xs text-base-content/60 mt-1">
                  支援 Hexo 標準內容結構 (source/_posts/)
                </p>
              </div>
            </label>
          </div>

          <div class="form-control">
            <label class="label cursor-not-allowed justify-start gap-4 p-4 border border-base-300 rounded-lg">
              <input type="radio" name="framework" value="jekyll" class="radio radio-primary" disabled />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">Jekyll</span>
                  <span class="badge badge-ghost badge-sm">規劃中</span>
                </div>
                <p class="text-xs text-base-content/60 mt-1">
                  支援 Jekyll 標準內容結構 (_posts/)
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="alert alert-info">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span class="text-sm">更多框架支援正在開發中，敬請期待！</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// 純展示元件，無互動狀態
</script>
