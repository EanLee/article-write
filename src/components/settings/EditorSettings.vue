<template>
  <div class="space-y-4">
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h4 class="font-semibold text-lg mb-4">編輯器偏好設定</h4>

        <!-- Auto Save Toggle -->
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-4">
            <input v-model="localConfig.autoSave" type="checkbox" class="toggle toggle-primary" />
            <div>
              <span class="label-text font-semibold">自動儲存</span>
              <p class="text-xs text-base-content/60 mt-1">
                定期自動儲存文章變更，避免意外丟失內容
              </p>
            </div>
          </label>
        </div>

        <!-- Auto Save Interval -->
        <div v-if="localConfig.autoSave" class="form-control ml-12 mt-2">
          <label class="label">
            <span class="label-text">儲存間隔</span>
          </label>
          <div class="flex items-center gap-4">
            <input v-model.number="autoSaveSeconds" type="range" min="10" max="300" step="10"
              class="range range-primary range-sm flex-1" />
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
            <label class="label cursor-pointer p-4 border-2 rounded-lg hover:bg-base-200 transition-colors"
              :class="localConfig.theme === 'light' ? 'border-primary bg-primary/5' : 'border-base-300'">
              <div class="flex items-center gap-3">
                <input v-model="localConfig.theme" type="radio" name="theme" value="light" class="radio radio-primary" />
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <div class="font-semibold">淺色模式</div>
                  <div class="text-xs text-base-content/60">適合白天使用</div>
                </div>
              </div>
            </label>

            <label class="label cursor-pointer p-4 border-2 rounded-lg hover:bg-base-200 transition-colors"
              :class="localConfig.theme === 'dark' ? 'border-primary bg-primary/5' : 'border-base-300'">
              <div class="flex items-center gap-3">
                <input v-model="localConfig.theme" type="radio" name="theme" value="dark" class="radio radio-primary" />
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
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
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue"
import type { AppConfig } from "@/types"

// ── Props & Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  editorConfig: AppConfig["editorConfig"]
}>()

const emit = defineEmits<{
  "update:editorConfig": [config: AppConfig["editorConfig"]]
}>()

// ── Local State ───────────────────────────────────────────────────────────────

const localConfig = reactive<AppConfig["editorConfig"]>({ ...props.editorConfig })

// ── Sync: props → local ───────────────────────────────────────────────────────

watch(
  () => props.editorConfig,
  (newConfig) => {
    Object.assign(localConfig, newConfig)
  },
  { deep: true }
)

// ── Sync: local → parent ──────────────────────────────────────────────────────

watch(
  localConfig,
  (newConfig) => {
    emit("update:editorConfig", { ...newConfig })
  },
  { deep: true }
)

// ── Computed ──────────────────────────────────────────────────────────────────

const autoSaveSeconds = computed({
  get: () => Math.floor(localConfig.autoSaveInterval / 1000),
  set: (value: number) => {
    localConfig.autoSaveInterval = value * 1000
  },
})
</script>
