<template>
  <div class="p-4">
    <!-- 標題 -->
    <div class="pb-3 border-b border-base-300">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <GitBranch :size="20" />
        Git 操作指引
      </h3>
      <p class="text-sm text-base-content/70 mt-1">
        文章已成功發布到部落格目錄，請執行以下 Git 指令完成發布流程
      </p>
    </div>

    <!-- 指令列表 -->
    <div class="commands-list mt-4 space-y-3">
      <div
        v-for="(item, index) in displayCommands"
        :key="index"
        class="bg-base-100 rounded-lg p-3 border border-base-300"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-base-content">{{ item.title }}</span>
          <button
            class="btn btn-xs btn-ghost gap-1"
            @click="copyCommand(item.command)"
          >
            <Copy :size="14" />
            複製
          </button>
        </div>
        <div class="bg-base-300 rounded p-2 mb-2 overflow-x-auto">
          <code class="text-sm font-mono text-primary">{{ item.command }}</code>
        </div>
        <p class="text-xs text-base-content/60">{{ item.description }}</p>
      </div>
    </div>

    <!-- 快速複製完整指令 -->
    <div class="mt-4 p-3 bg-base-200 rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">一鍵執行所有指令</span>
        <button
          class="btn btn-sm btn-primary gap-1"
          @click="copyFullCommand"
        >
          <Copy :size="16" />
          複製完整指令
        </button>
      </div>
      <code class="text-xs block bg-base-300 p-2 rounded">{{ commands.full }}</code>
    </div>

    <!-- 提示訊息 -->
    <div class="alert alert-info mt-4">
      <Info :size="18" />
      <div class="text-sm">
        <p class="font-medium">💡 小提示</p>
        <ul class="mt-1 space-y-1 text-xs">
          <li>• 複製指令後，在部落格專案目錄的終端機中貼上執行</li>
          <li>• v0.2 版本將支援一鍵自動執行 Git 操作</li>
          <li>• 確保已設定 Git remote 並有推送權限</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GitBranch, Copy, Info } from 'lucide-vue-next'
import type { GitCommands } from '@/utils/gitCommandGenerator'
import { formatGitCommandsForDisplay, copyToClipboard } from '@/utils/gitCommandGenerator'
import { notificationService } from '@/services/NotificationService'

interface Props {
  commands: GitCommands
}

const props = defineProps<Props>()

// 格式化顯示的指令
const displayCommands = computed(() => {
  return formatGitCommandsForDisplay(props.commands)
})

// 複製單個指令
async function copyCommand(command: string) {
  const success = await copyToClipboard(command)
  if (success) {
    notificationService.success('指令已複製到剪貼簿')
  } else {
    notificationService.error('複製失敗，請手動複製')
  }
}

// 複製完整指令
async function copyFullCommand() {
  const success = await copyToClipboard(props.commands.full)
  if (success) {
    notificationService.success('完整指令已複製到剪貼簿')
  } else {
    notificationService.error('複製失敗，請手動複製')
  }
}
</script>

