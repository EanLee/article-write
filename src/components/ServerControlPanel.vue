<template>
  <div class="server-control-panel">
    <!-- 控制列 -->
    <div class="flex items-center justify-between p-3 bg-base-200 border-b border-base-300">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div
            class="w-3 h-3 rounded-full"
            :class="statusIndicatorClass"
          ></div>
          <span class="font-semibold text-sm">開發伺服器</span>
        </div>

        <!-- 狀態標籤 -->
        <div class="badge badge-sm" :class="statusBadgeClass">
          {{ statusText }}
        </div>

        <!-- 伺服器 URL -->
        <a
          v-if="serverUrl"
          :href="serverUrl"
          target="_blank"
          class="link link-primary text-sm flex items-center gap-1"
        >
          <ExternalLink :size="14" />
          {{ serverUrl }}
        </a>
      </div>

      <div class="flex items-center gap-2">
        <!-- 清除日誌按鈕 -->
        <button
          class="btn btn-ghost btn-sm"
          :disabled="logs.length === 0"
          @click="clearLogs"
          title="清除日誌"
        >
          <Trash2 :size="16" />
        </button>

        <!-- 折疊/展開按鈕 -->
        <button
          class="btn btn-ghost btn-sm"
          @click="toggleExpanded"
          :title="expanded ? '收合' : '展開'"
        >
          <component :is="expanded ? ChevronDown : ChevronUp" :size="16" />
        </button>

        <!-- 啟動/停止按鈕 -->
        <button
          v-if="!isRunning"
          class="btn btn-success btn-sm gap-1"
          :disabled="loading || !hasTargetBlog"
          @click="startServer"
        >
          <Play :size="16" />
          啟動
        </button>
        <button
          v-else
          class="btn btn-error btn-sm gap-1"
          :disabled="loading"
          @click="stopServer"
        >
          <Square :size="16" />
          停止
        </button>
      </div>
    </div>

    <!-- 日誌面板 -->
    <div
      v-if="expanded"
      class="log-panel bg-base-300 overflow-hidden"
      :style="{ height: logPanelHeight + 'px' }"
    >
      <!-- 日誌內容 -->
      <div
        ref="logContainerRef"
        class="log-container h-full overflow-y-auto p-3 font-mono text-xs"
      >
        <div v-if="logs.length === 0" class="text-base-content/50 text-center py-4">
          尚無日誌輸出
        </div>
        <div
          v-for="(log, index) in logs"
          :key="index"
          class="log-line whitespace-pre-wrap break-all mb-1"
          :class="getLogClass(log)"
        >
          {{ log.log }}
        </div>
      </div>

      <!-- 調整高度把手 -->
      <div
        class="resize-handle h-2 bg-base-200 cursor-ns-resize hover:bg-primary/20 transition-colors flex items-center justify-center"
        @mousedown="startResize"
      >
        <div class="w-8 h-1 bg-base-content/20 rounded-full"></div>
      </div>
    </div>

    <!-- 未設定目標部落格提示 -->
    <div v-if="!hasTargetBlog && expanded" class="p-3 bg-warning/10 text-warning text-sm">
      <AlertTriangle :size="16" class="inline mr-1" />
      請先在設定中配置目標部落格路徑
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import {
  Play,
  Square,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Trash2,
  AlertTriangle
} from 'lucide-vue-next'
import type { ServerLogData } from '@/types/electron'

const configStore = useConfigStore()

// State
const isRunning = ref(false)
const loading = ref(false)
const serverUrl = ref<string | undefined>()
const logs = ref<ServerLogData[]>([])
const expanded = ref(true)
const logPanelHeight = ref(200)
const logContainerRef = ref<HTMLElement>()

// Computed
const hasTargetBlog = computed(() => !!configStore.config.paths.targetBlog)

const statusIndicatorClass = computed(() => {
  if (loading.value) return 'bg-warning animate-pulse'
  if (isRunning.value) return 'bg-success'
  return 'bg-base-content/30'
})

const statusBadgeClass = computed(() => {
  if (loading.value) return 'badge-warning'
  if (isRunning.value) return 'badge-success'
  return 'badge-ghost'
})

const statusText = computed(() => {
  if (loading.value) return '處理中...'
  if (isRunning.value) return '運行中'
  return '已停止'
})

// Methods
async function startServer() {
  if (!hasTargetBlog.value || loading.value) return

  loading.value = true
  try {
    await window.electronAPI.startDevServer(configStore.config.paths.targetBlog)
    await updateStatus()
  } catch (error) {
    console.error('啟動伺服器失敗:', error)
    logs.value.push({
      log: `錯誤: ${error instanceof Error ? error.message : '啟動失敗'}`,
      type: 'stderr',
      timestamp: new Date().toISOString()
    })
  } finally {
    loading.value = false
  }
}

async function stopServer() {
  if (loading.value) return

  loading.value = true
  try {
    await window.electronAPI.stopDevServer()
    isRunning.value = false
    serverUrl.value = undefined
  } catch (error) {
    console.error('停止伺服器失敗:', error)
  } finally {
    loading.value = false
  }
}

async function updateStatus() {
  try {
    const status = await window.electronAPI.getServerStatus()
    isRunning.value = status.running
    serverUrl.value = status.url
  } catch (error) {
    console.error('取得伺服器狀態失敗:', error)
  }
}

function clearLogs() {
  logs.value = []
}

function toggleExpanded() {
  expanded.value = !expanded.value
  localStorage.setItem('server-panel-expanded', expanded.value.toString())
}

function getLogClass(log: ServerLogData) {
  if (log.type === 'stderr') return 'text-error'
  if (log.log.includes('錯誤') || log.log.includes('Error')) return 'text-error'
  if (log.log.includes('警告') || log.log.includes('Warning')) return 'text-warning'
  if (log.log.includes('已就緒') || log.log.includes('ready')) return 'text-success'
  return 'text-base-content/80'
}

// 自動滾動到底部
function scrollToBottom() {
  nextTick(() => {
    if (logContainerRef.value) {
      logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight
    }
  })
}

// 調整面板高度
let isResizing = false
let startY = 0
let startHeight = 0

function startResize(e: MouseEvent) {
  isResizing = true
  startY = e.clientY
  startHeight = logPanelHeight.value
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

function onResize(e: MouseEvent) {
  if (!isResizing) return
  const delta = startY - e.clientY
  const newHeight = Math.max(100, Math.min(500, startHeight + delta))
  logPanelHeight.value = newHeight
}

function stopResize() {
  isResizing = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  localStorage.setItem('server-panel-height', logPanelHeight.value.toString())
}

// 監聽日誌變化自動滾動
watch(logs, () => {
  scrollToBottom()
}, { deep: true })

// 生命週期
let unsubscribeLog: (() => void) | null = null

onMounted(async () => {
  // 載入儲存的狀態
  const savedExpanded = localStorage.getItem('server-panel-expanded')
  if (savedExpanded !== null) {
    expanded.value = savedExpanded === 'true'
  }

  const savedHeight = localStorage.getItem('server-panel-height')
  if (savedHeight !== null) {
    logPanelHeight.value = parseInt(savedHeight, 10)
  }

  // 取得初始狀態
  await updateStatus()

  // 監聽日誌事件
  if (window.electronAPI?.onServerLog) {
    unsubscribeLog = window.electronAPI.onServerLog((data) => {
      logs.value.push(data)
      // 限制日誌數量
      if (logs.value.length > 500) {
        logs.value = logs.value.slice(-500)
      }
    })
  }
})

onUnmounted(() => {
  if (unsubscribeLog) {
    unsubscribeLog()
  }
})
</script>

<style scoped>
.server-control-panel {
  border-top: 1px solid oklch(var(--b3));
}

.log-container {
  background: oklch(var(--b3));
}

.log-line {
  line-height: 1.4;
}

.resize-handle {
  user-select: none;
}

/* 滾動條樣式 */
.log-container::-webkit-scrollbar {
  width: 6px;
}

.log-container::-webkit-scrollbar-track {
  background: transparent;
}

.log-container::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.2);
  border-radius: 3px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: oklch(var(--bc) / 0.3);
}
</style>
