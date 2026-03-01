<template>
  <div class="space-y-4">
    <p class="text-sm text-base-content/70">
      至少設定一個 AI Provider 的 API Key 即可啟用 AI 功能。Key 加密儲存於本機，不上傳任何伺服器。
    </p>

    <div class="card bg-base-100 border border-base-300 overflow-hidden">

      <!-- Claude -->
      <div>
        <div class="flex items-center gap-4 px-5 py-4">
          <div class="flex-1 flex items-center gap-3">
            <span class="font-semibold">Claude</span>
            <span class="text-xs text-base-content/40">Anthropic</span>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="inline-block w-2 h-2 rounded-full"
                :class="claudeKeyStatus === 'API Key 已設定' ? 'bg-success' : 'bg-base-300'"></span>
              <span class="text-sm"
                :class="claudeKeyStatus === 'API Key 已設定' ? 'text-success' : 'text-base-content/40'">
                {{ claudeKeyStatus === 'API Key 已設定' ? '已設定' : '尚未設定' }}
              </span>
            </div>
            <button class="btn btn-sm min-w-20"
              :class="expandedProvider === 'claude' ? 'btn-ghost' : claudeKeyStatus === 'API Key 已設定' ? 'btn-ghost' : 'btn-primary'"
              @click="toggleProvider('claude')">
              {{ expandedProvider === 'claude' ? '收起' : claudeKeyStatus === 'API Key 已設定' ? '重新設定' : '設定' }}
            </button>
          </div>
        </div>
        <div v-if="expandedProvider === 'claude'" class="px-5 pb-4 border-t border-base-300 bg-base-200/30">
          <div class="flex gap-2 mt-3">
            <input v-model="aiApiKey" type="password" placeholder="sk-ant-..."
              class="input input-bordered input-sm flex-1" />
            <button class="btn btn-primary btn-sm" :disabled="!aiApiKey.trim()" @click="saveApiKey('claude')">儲存</button>
          </div>
          <p class="mt-2 text-xs text-base-content/50">
            <span v-if="aiKeySaved === 'claude'" class="text-success mr-2">✓ 已儲存</span>
            取得 Key：console.anthropic.com → API Keys → Create Key
          </p>
        </div>
      </div>

      <div class="border-t border-base-300"></div>

      <!-- Gemini -->
      <div>
        <div class="flex items-center gap-4 px-5 py-4">
          <div class="flex-1 flex items-center gap-3">
            <span class="font-semibold">Gemini</span>
            <span class="text-xs text-base-content/40">Google AI Studio</span>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="inline-block w-2 h-2 rounded-full"
                :class="geminiKeyStatus === 'API Key 已設定' ? 'bg-success' : 'bg-base-300'"></span>
              <span class="text-sm"
                :class="geminiKeyStatus === 'API Key 已設定' ? 'text-success' : 'text-base-content/40'">
                {{ geminiKeyStatus === 'API Key 已設定' ? '已設定' : '尚未設定' }}
              </span>
            </div>
            <button class="btn btn-sm min-w-20"
              :class="expandedProvider === 'gemini' ? 'btn-ghost' : geminiKeyStatus === 'API Key 已設定' ? 'btn-ghost' : 'btn-primary'"
              @click="toggleProvider('gemini')">
              {{ expandedProvider === 'gemini' ? '收起' : geminiKeyStatus === 'API Key 已設定' ? '重新設定' : '設定' }}
            </button>
          </div>
        </div>
        <div v-if="expandedProvider === 'gemini'" class="px-5 pb-4 border-t border-base-300 bg-base-200/30">
          <div class="flex gap-2 mt-3">
            <input v-model="geminiApiKey" type="password" placeholder="AIza..."
              class="input input-bordered input-sm flex-1" />
            <button class="btn btn-primary btn-sm" :disabled="!geminiApiKey.trim()" @click="saveApiKey('gemini')">儲存</button>
          </div>
          <p class="mt-2 text-xs text-base-content/50">
            <span v-if="aiKeySaved === 'gemini'" class="text-success mr-2">✓ 已儲存</span>
            取得 Key：aistudio.google.com → Get API Key
          </p>
        </div>
      </div>

      <div class="border-t border-base-300"></div>

      <!-- OpenAI -->
      <div>
        <div class="flex items-center gap-4 px-5 py-4">
          <div class="flex-1 flex items-center gap-3">
            <span class="font-semibold">OpenAI</span>
            <span class="text-xs text-base-content/40">OpenAI Platform</span>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="inline-block w-2 h-2 rounded-full"
                :class="openaiKeyStatus === 'API Key 已設定' ? 'bg-success' : 'bg-base-300'"></span>
              <span class="text-sm"
                :class="openaiKeyStatus === 'API Key 已設定' ? 'text-success' : 'text-base-content/40'">
                {{ openaiKeyStatus === 'API Key 已設定' ? '已設定' : '尚未設定' }}
              </span>
            </div>
            <button class="btn btn-sm min-w-20"
              :class="expandedProvider === 'openai' ? 'btn-ghost' : openaiKeyStatus === 'API Key 已設定' ? 'btn-ghost' : 'btn-primary'"
              @click="toggleProvider('openai')">
              {{ expandedProvider === 'openai' ? '收起' : openaiKeyStatus === 'API Key 已設定' ? '重新設定' : '設定' }}
            </button>
          </div>
        </div>
        <div v-if="expandedProvider === 'openai'" class="px-5 pb-4 border-t border-base-300 bg-base-200/30">
          <div class="flex gap-2 mt-3">
            <input v-model="openaiApiKey" type="password" placeholder="sk-..."
              class="input input-bordered input-sm flex-1" />
            <button class="btn btn-primary btn-sm" :disabled="!openaiApiKey.trim()" @click="saveApiKey('openai')">儲存</button>
          </div>
          <p class="mt-2 text-xs text-base-content/50">
            <span v-if="aiKeySaved === 'openai'" class="text-success mr-2">✓ 已儲存</span>
            取得 Key：platform.openai.com → API Keys → Create new secret key
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onActivated, ref } from "vue"

// ── State ─────────────────────────────────────────────────────────────────────

const aiApiKey = ref("")
const geminiApiKey = ref("")
const openaiApiKey = ref("")
const aiKeySaved = ref<"claude" | "gemini" | "openai" | null>(null)
const claudeKeyStatus = ref("")
const geminiKeyStatus = ref("")
const openaiKeyStatus = ref("")
const expandedProvider = ref<"claude" | "gemini" | "openai" | null>(null)

// ── Methods ───────────────────────────────────────────────────────────────────

function toggleProvider(provider: "claude" | "gemini" | "openai") {
  expandedProvider.value = expandedProvider.value === provider ? null : provider
}

async function loadStatus() {
  if (!window.electronAPI) { return }
  const hasClaude = await window.electronAPI.aiHasApiKey("claude")
  const hasGemini = await window.electronAPI.aiHasApiKey("gemini")
  const hasOpenAI = await window.electronAPI.aiHasApiKey("openai")
  claudeKeyStatus.value = hasClaude ? "API Key 已設定" : "尚未設定"
  geminiKeyStatus.value = hasGemini ? "API Key 已設定" : "尚未設定"
  openaiKeyStatus.value = hasOpenAI ? "API Key 已設定" : "尚未設定"
}

async function saveApiKey(provider: "claude" | "gemini" | "openai") {
  const keyMap = { claude: aiApiKey, gemini: geminiApiKey, openai: openaiApiKey }
  const statusMap = { claude: claudeKeyStatus, gemini: geminiKeyStatus, openai: openaiKeyStatus }
  const key = keyMap[provider].value.trim()
  if (!key) { return }
  await window.electronAPI.aiSetApiKey(provider, key)
  keyMap[provider].value = ""
  statusMap[provider].value = "API Key 已設定"
  aiKeySaved.value = provider
  setTimeout(() => {
    aiKeySaved.value = null
    expandedProvider.value = null
  }, 2000)
}

// ── Expose for parent ─────────────────────────────────────────────────────────

defineExpose({ loadStatus })

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(loadStatus)
onActivated(() => {
  // 從 KeepAlive 重新啟用時重置展開狀態
  expandedProvider.value = null
  loadStatus()
})
</script>
