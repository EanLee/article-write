<template>
  <div v-if="modelValue" class="modal modal-open">
    <div class="modal-box w-11/12 max-w-5xl max-h-[90vh]">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-2xl font-bold">部落格設定</h3>
          <p class="text-sm text-base-content/60 mt-1">配置您的部落格寫作與發布環境</p>
        </div>
        <button class="btn btn-sm btn-circle btn-ghost" @click="handleClose">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div role="tablist" class="tabs tabs-boxed mb-6 bg-base-200">
        <a 
          role="tab" 
          class="tab"
          :class="{ 'tab-active': activeTab === 'basic' }"
          @click="activeTab = 'basic'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          基本設定
        </a>
        <a 
          role="tab" 
          class="tab"
          :class="{ 'tab-active': activeTab === 'framework' }"
          @click="activeTab = 'framework'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          部落格框架
        </a>
        <a 
          role="tab" 
          class="tab"
          :class="{ 'tab-active': activeTab === 'editor' }"
          @click="activeTab = 'editor'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          編輯器
        </a>
        <a 
          role="tab" 
          class="tab relative"
          :class="{ 'tab-active': activeTab === 'git' }"
          @click="activeTab = 'git'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Git 發布
          <span class="badge badge-xs badge-warning ml-1">即將推出</span>
        </a>
      </div>

      <!-- Tab Content -->
      <div class="overflow-y-auto max-h-[calc(90vh-240px)]">
        <!-- Basic Settings Tab -->
        <div v-show="activeTab === 'basic'" class="space-y-4">
          <!-- Articles Directory Card -->
          <div class="card bg-base-100 border border-base-300">
            <div class="card-body">
              <div class="flex items-start gap-3">
                <div class="rounded-full bg-primary/10 p-2 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h4 class="font-semibold text-lg">文章資料夾</h4>
                    <span class="badge badge-error badge-sm">必填</span>
                  </div>
                  <p class="text-sm text-base-content/70 mb-3">
                    存放您的 Markdown 文章的資料夾（支援 Wiki Link 語法）
                  </p>
                  <div class="join w-full">
                    <input
                      v-model="localConfig.paths.articlesDir"
                      type="text"
                      placeholder="例如：C:\Users\你的名字\Documents\Blog\articles"
                      class="input input-bordered join-item flex-1"
                      :class="{ 'input-error': localConfig.paths.articlesDir && !articlesValidation.valid }"
                    />
                    <button class="btn btn-primary join-item" @click="selectArticlesPath">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                      </svg>
                      選擇資料夾
                    </button>
                  </div>
                  <div v-if="localConfig.paths.articlesDir" class="flex items-center gap-2 mt-2">
                    <div 
                      class="w-3 h-3 rounded-full"
                      :class="articlesValidation.valid ? 'bg-success' : 'bg-warning'"
                    ></div>
                    <span class="text-xs" :class="articlesValidation.valid ? 'text-success' : 'text-warning'">
                      {{ articlesValidation.message }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Blog Directory Card -->
          <div class="card bg-base-100 border border-base-300">
            <div class="card-body">
              <div class="flex items-start gap-3">
                <div class="rounded-full bg-secondary/10 p-2 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h4 class="font-semibold text-lg">部落格專案路徑</h4>
                    <span class="badge badge-ghost badge-sm">選填</span>
                  </div>
                  <p class="text-sm text-base-content/70 mb-3">
                    您的靜態網站專案資料夾（將發布文章到此處）
                  </p>
                  <div class="join w-full">
                    <input
                      v-model="localConfig.paths.targetBlog"
                      type="text"
                      placeholder="例如：C:\Users\你的名字\Projects\my-astro-blog"
                      class="input input-bordered join-item flex-1"
                      :class="{ 'input-error': localConfig.paths.targetBlog && !blogValidation.valid }"
                    />
                    <button class="btn btn-primary join-item" @click="selectBlogPath">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                      </svg>
                      選擇資料夾
                    </button>
                  </div>
                  <div v-if="localConfig.paths.targetBlog" class="flex items-center gap-2 mt-2">
                    <div 
                      class="w-3 h-3 rounded-full"
                      :class="blogValidation.valid ? 'bg-success' : 'bg-warning'"
                    ></div>
                    <span class="text-xs" :class="blogValidation.valid ? 'text-success' : 'text-warning'">
                      {{ blogValidation.message }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Images Directory Card -->
          <div class="card bg-base-100 border border-base-300">
            <div class="card-body">
              <div class="flex items-start gap-3">
                <div class="rounded-full bg-accent/10 p-2 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h4 class="font-semibold text-lg">圖片資料夾</h4>
                    <span class="badge badge-ghost badge-sm">選填</span>
                  </div>
                  <p class="text-sm text-base-content/70 mb-3">
                    統一管理您的文章圖片（留空則自動使用 文章資料夾/images）
                  </p>
                  <div class="join w-full">
                    <input
                      v-model="localConfig.paths.imagesDir"
                      type="text"
                      placeholder="留空使用預設路徑"
                      class="input input-bordered join-item flex-1"
                    />
                    <button class="btn btn-outline join-item" @click="selectImagesPath">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                      </svg>
                      選擇資料夾
                    </button>
                  </div>
                  <div v-if="!localConfig.paths.imagesDir && localConfig.paths.articlesDir" class="alert alert-info mt-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="text-sm">將使用預設路徑：{{ localConfig.paths.articlesDir }}\images</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Setup Guide -->
          <div class="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h4 class="font-bold">快速設定提示</h4>
              <div class="text-xs mt-1 space-y-1">
                <p>1. 選擇一個資料夾存放您的 Markdown 文章（可使用 Wiki Link 語法）</p>
                <p>2. 部落格專案路徑可稍後設定（需要時再指定用於發布）</p>
                <p>3. 圖片資料夾可選填，留空會自動建立</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Framework Settings Tab -->
        <div v-show="activeTab === 'framework'" class="space-y-4">
          <div class="card bg-base-100 border border-base-300">
            <div class="card-body">
              <h4 class="font-semibold text-lg mb-3">選擇部落格框架</h4>
              <p class="text-sm text-base-content/70 mb-4">
                選擇您使用的靜態網站生成器，我們會自動適配對應的檔案結構
              </p>
              
              <!-- Astro Option -->
              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-4 p-4 border border-base-300 rounded-lg hover:bg-base-200 transition-colors">
                  <input 
                    type="radio" 
                    name="framework" 
                    value="astro"
                    class="radio radio-primary" 
                    checked 
                    disabled
                  />
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
                    <input 
                      type="radio" 
                      name="framework" 
                      value="hugo"
                      class="radio radio-primary" 
                      disabled
                    />
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
                    <input 
                      type="radio" 
                      name="framework" 
                      value="hexo"
                      class="radio radio-primary" 
                      disabled
                    />
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
                    <input 
                      type="radio" 
                      name="framework" 
                      value="jekyll"
                      class="radio radio-primary" 
                      disabled
                    />
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
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm">更多框架支援正在開發中，敬請期待！</span>
          </div>
        </div>

        <!-- Editor Settings Tab -->
        <div v-show="activeTab === 'editor'" class="space-y-4">
          <div class="card bg-base-100 border border-base-300">
            <div class="card-body">
              <h4 class="font-semibold text-lg mb-4">編輯器偏好設定</h4>
              
              <!-- Auto Save -->
              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-4">
                  <input 
                    v-model="localConfig.editorConfig.autoSave"
                    type="checkbox" 
                    class="toggle toggle-primary" 
                  />
                  <div>
                    <span class="label-text font-semibold">自動儲存</span>
                    <p class="text-xs text-base-content/60 mt-1">
                      定期自動儲存文章變更，避免意外丟失內容
                    </p>
                  </div>
                </label>
              </div>

              <!-- Auto Save Interval -->
              <div v-if="localConfig.editorConfig.autoSave" class="form-control ml-12 mt-2">
                <label class="label">
                  <span class="label-text">儲存間隔</span>
                </label>
                <div class="flex items-center gap-4">
                  <input
                    v-model.number="autoSaveSeconds"
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    class="range range-primary range-sm flex-1"
                  />
                  <div class="badge badge-primary badge-lg">{{ autoSaveSeconds }} 秒</div>
                </div>
                <label class="label">
                  <span class="label-text-alt">建議範圍：10-300 秒</span>
                </label>
              </div>

              <div class="divider"></div>

              <!-- Theme Selection -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">編輯器主題</span>
                </label>
                <div class="grid grid-cols-2 gap-3 mt-2">
                  <label 
                    class="label cursor-pointer p-4 border-2 rounded-lg hover:bg-base-200 transition-colors"
                    :class="localConfig.editorConfig.theme === 'light' ? 'border-primary bg-primary/5' : 'border-base-300'"
                  >
                    <div class="flex items-center gap-3">
                      <input 
                        v-model="localConfig.editorConfig.theme"
                        type="radio" 
                        name="theme" 
                        value="light"
                        class="radio radio-primary" 
                      />
                      <div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div>
                        <div class="font-semibold">淺色模式</div>
                        <div class="text-xs text-base-content/60">適合白天使用</div>
                      </div>
                    </div>
                  </label>

                  <label 
                    class="label cursor-pointer p-4 border-2 rounded-lg hover:bg-base-200 transition-colors"
                    :class="localConfig.editorConfig.theme === 'dark' ? 'border-primary bg-primary/5' : 'border-base-300'"
                  >
                    <div class="flex items-center gap-3">
                      <input 
                        v-model="localConfig.editorConfig.theme"
                        type="radio" 
                        name="theme" 
                        value="dark"
                        class="radio radio-primary" 
                      />
                      <div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      </div>
                      <div>
                        <div class="font-semibold">深色模式</div>
                        <div class="text-xs text-base-content/60">適合夜間使用</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Git Settings Tab -->
        <div v-show="activeTab === 'git'" class="space-y-4">
          <div class="card bg-base-100 border border-base-300">
            <div class="card-body">
              <h4 class="font-semibold text-lg mb-4">Git 發布設定</h4>
              <p class="text-sm text-base-content/70 mb-4">
                管理文章發布後的 Git 操作流程
              </p>

              <!-- Current Version Features -->
              <div class="alert alert-success mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
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
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span><strong>自動生成 Git 指令</strong>：根據發布的文章自動生成 add、commit、push 指令</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span><strong>標準化 Commit Message</strong>：遵循 Conventional Commits 規範</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span><strong>一鍵複製</strong>：單個指令或完整指令序列均可快速複製</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span><strong>操作指引</strong>：每個步驟都有清楚的說明</span>
                  </li>
                </ul>
              </div>

              <!-- Future Features Notice -->
              <div class="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
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
                  <input
                    type="text"
                    placeholder="publish: {title}"
                    class="input input-bordered"
                    disabled
                  />
                  <label class="label">
                    <span class="label-text-alt">使用 {title} 代表文章標題</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex justify-between items-center mt-6 pt-4 border-t border-base-300">
        <button class="btn btn-ghost" @click="resetToDefaults">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          重設為預設值
        </button>
        <div class="flex gap-2">
          <button class="btn btn-ghost" @click="handleClose">取消</button>
          <button 
            class="btn btn-primary"
            @click="handleSave"
            :disabled="!canSave"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            儲存設定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useArticleStore } from '@/stores/article'
import type { AppConfig } from '@/types'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const configStore = useConfigStore()
const articleStore = useArticleStore()
const activeTab = ref('basic')
const localConfig = ref<AppConfig>({
  paths: {
    articlesDir: '',
    targetBlog: '',
    imagesDir: ''
  },
  editorConfig: {
    autoSave: true,
    autoSaveInterval: 30000,
    theme: 'light'
  }
})

// Convert milliseconds to seconds for UI
const autoSaveSeconds = computed({
  get: () => Math.floor(localConfig.value.editorConfig.autoSaveInterval / 1000),
  set: (value: number) => {
    localConfig.value.editorConfig.autoSaveInterval = value * 1000
  }
})

// Validation
const articlesValidation = ref({ valid: false, message: '請選擇路徑' })
const blogValidation = ref({ valid: false, message: '請選擇路徑' })

const canSave = computed(() => {
  // 只需要文章資料夾即可儲存，部落格路徑為選填
  return !!localConfig.value.paths.articlesDir
})

// Methods
async function selectArticlesPath() {
  try {
    if (!window.electronAPI) {
      console.warn('瀏覽器模式下無法選擇資料夾')
      return
    }

    const selectedPath = await window.electronAPI.selectDirectory({
      title: '選擇文章資料夾',
      defaultPath: localConfig.value.paths.articlesDir
    })

    if (selectedPath) {
      localConfig.value.paths.articlesDir = selectedPath
      // Auto-set images directory if not already set
      if (!localConfig.value.paths.imagesDir) {
        localConfig.value.paths.imagesDir = selectedPath + '/images'
      }
    }
  } catch (error) {
    console.error('選擇資料夾失敗:', error)
  }
}

async function selectBlogPath() {
  try {
    if (!window.electronAPI) {
      console.warn('瀏覽器模式下無法選擇資料夾')
      return
    }

    const selectedPath = await window.electronAPI.selectDirectory({
      title: '選擇部落格專案資料夾',
      defaultPath: localConfig.value.paths.targetBlog
    })

    if (selectedPath) {
      localConfig.value.paths.targetBlog = selectedPath
    }
  } catch (error) {
    console.error('選擇資料夾失敗:', error)
  }
}

async function selectImagesPath() {
  try {
    if (!window.electronAPI) {
      console.warn('瀏覽器模式下無法選擇資料夾')
      return
    }

    const selectedPath = await window.electronAPI.selectDirectory({
      title: '選擇圖片資料夾',
      defaultPath: localConfig.value.paths.imagesDir
    })

    if (selectedPath) {
      localConfig.value.paths.imagesDir = selectedPath
    }
  } catch (error) {
    console.error('選擇資料夾失敗:', error)
  }
}

async function validatePaths() {
  // Validate Articles Directory
  if (localConfig.value.paths.articlesDir) {
    try {
      const result = await configStore.validateArticlesDir(localConfig.value.paths.articlesDir)
      articlesValidation.value = result
    } catch {
      articlesValidation.value = { valid: false, message: '驗證失敗' }
    }
  } else {
    articlesValidation.value = { valid: false, message: '請選擇路徑' }
  }

  // Validate Blog Directory
  if (localConfig.value.paths.targetBlog) {
    try {
      const result = await configStore.validateAstroBlog(localConfig.value.paths.targetBlog)
      blogValidation.value = result
    } catch {
      blogValidation.value = { valid: false, message: '驗證失敗' }
    }
  } else {
    blogValidation.value = { valid: false, message: '請選擇路徑' }
  }
}

async function handleSave() {
  try {
    await configStore.saveConfig(localConfig.value)
    
    // 如果設定了文章資料夾路徑，重新載入文章
    if (localConfig.value.paths.articlesDir) {
      await articleStore.loadArticles()
    }
    
    emit('update:modelValue', false)
  } catch (error) {
    console.error('儲存設定失敗', error)
  }
}

function resetToDefaults() {
  localConfig.value = {
    paths: {
      articlesDir: '',
      targetBlog: '',
      imagesDir: ''
    },
    editorConfig: {
      autoSave: true,
      autoSaveInterval: 30000,
      theme: 'light'
    }
  }
  validatePaths()
}

function handleClose() {
  emit('update:modelValue', false)
}

// Watch for path changes to trigger validation
watch(
  () => [localConfig.value.paths.articlesDir, localConfig.value.paths.targetBlog],
  async () => {
    await validatePaths()
  }
)

// Watch for dialog open/close
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      // Load current config when dialog opens
      localConfig.value = JSON.parse(JSON.stringify(configStore.config))
      await validatePaths()
    }
  }
)
</script>

<style scoped>
/* Custom styles if needed */
</style>