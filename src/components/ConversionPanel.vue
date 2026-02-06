<template>
  <div class="conversion-panel bg-base-100 p-6 rounded-lg shadow-lg">
    <h2 class="text-2xl font-bold mb-4">轉換工具</h2>
    
    <!-- 轉換統計 -->
    <div class="stats shadow mb-6" v-if="conversionStats">
      <div class="stat">
        <div class="stat-title">總文章數</div>
        <div class="stat-value">{{ conversionStats.totalArticles }}</div>
        <div class="stat-desc">待轉換的已發布文章</div>
      </div>
      <div class="stat">
        <div class="stat-title">Software</div>
        <div class="stat-value text-primary">{{ conversionStats.articlesByCategory.Software }}</div>
        <div class="stat-desc">軟體開發相關</div>
      </div>
      <div class="stat">
        <div class="stat-title">Growth</div>
        <div class="stat-value text-secondary">{{ conversionStats.articlesByCategory.growth }}</div>
        <div class="stat-desc">個人成長相關</div>
      </div>
      <div class="stat">
        <div class="stat-title">Management</div>
        <div class="stat-value text-accent">{{ conversionStats.articlesByCategory.management }}</div>
        <div class="stat-desc">管理相關</div>
      </div>
    </div>

    <!-- 載入統計時的骨架畫面 -->
    <div v-else class="stats shadow mb-6">
      <div class="stat" v-for="i in 4" :key="i">
        <div class="stat-title">
          <div class="skeleton h-4 w-20"></div>
        </div>
        <div class="stat-value">
          <div class="skeleton h-8 w-12"></div>
        </div>
      </div>
    </div>

    <!-- 轉換設定 -->
    <div class="collapse collapse-arrow bg-base-200 mb-6">
      <input type="checkbox" />
      <div class="collapse-title text-xl font-medium">
        轉換設定選項
      </div>
      <div class="collapse-content">
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">來源目錄 (Obsidian Vault)</span>
            <span class="label-text-alt" :class="config.sourceDir ? 'text-success' : 'text-error'">
              {{ config.sourceDir ? '✓ 已設定' : '✗ 未設定' }}
            </span>
          </label>
          <input 
            type="text" 
            v-model="config.sourceDir" 
            class="input input-bordered input-sm" 
            placeholder="/path/to/obsidian-vault"
            readonly
          />
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">目標目錄 (Astro Blog)</span>
            <span class="label-text-alt" :class="config.targetDir ? 'text-success' : 'text-error'">
              {{ config.targetDir ? '✓ 已設定' : '✗ 未設定' }}
            </span>
          </label>
          <input 
            type="text" 
            v-model="config.targetDir" 
            class="input input-bordered input-sm" 
            placeholder="/path/to/astro-blog"
            readonly
          />
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">圖片來源目錄</span>
            <span class="label-text-alt" :class="config.imageSourceDir ? 'text-success' : 'text-error'">
              {{ config.imageSourceDir ? '✓ 已設定' : '✗ 未設定' }}
            </span>
          </label>
          <input 
            type="text" 
            v-model="config.imageSourceDir" 
            class="input input-bordered input-sm" 
            placeholder="/path/to/obsidian-vault/images"
            readonly
          />
        </div>

        <div class="form-control">
          <label class="label cursor-pointer">
            <span class="label-text">保持目錄結構</span>
            <input 
              type="checkbox" 
              v-model="config.preserveStructure" 
              class="checkbox checkbox-primary" 
            />
          </label>
          <div class="label">
            <span class="label-text-alt text-gray-500">
              啟用後將保持原始的分類目錄結構
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 轉換按鈕 -->
    <div class="flex flex-col gap-4 mb-6">
      <!-- 主要轉換按鈕 -->
      <div class="flex gap-4">
        <button 
          class="btn btn-primary flex-1" 
          @click="startConversion"
          :disabled="isConverting || !isConfigValid"
          :class="{ 'loading': isConverting }"
        >
          <svg v-if="!isConverting" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span v-if="!isConverting">開始批次轉換</span>
          <span v-else>轉換中...</span>
        </button>
        
        <button 
          class="btn btn-outline" 
          @click="loadStats"
          :disabled="isConverting"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          重新載入統計
        </button>
      </div>

      <!-- 分類別轉換按鈕 -->
      <div class="flex gap-2" v-if="conversionStats && !isConverting">
        <button 
          class="btn btn-sm btn-outline btn-primary" 
          @click="convertCategory('Software')"
          :disabled="conversionStats.articlesByCategory.Software === 0"
        >
          轉換 Software ({{ conversionStats.articlesByCategory.Software }})
        </button>
        <button 
          class="btn btn-sm btn-outline btn-secondary" 
          @click="convertCategory('growth')"
          :disabled="conversionStats.articlesByCategory.growth === 0"
        >
          轉換 Growth ({{ conversionStats.articlesByCategory.growth }})
        </button>
        <button 
          class="btn btn-sm btn-outline btn-accent" 
          @click="convertCategory('management')"
          :disabled="conversionStats.articlesByCategory.management === 0"
        >
          轉換 Management ({{ conversionStats.articlesByCategory.management }})
        </button>
      </div>
    </div>

    <!-- 轉換進度 -->
    <div v-if="isConverting" class="mb-6">
      <div class="flex justify-between text-sm mb-2">
        <span>轉換進度</span>
        <span>{{ conversionProgress.processed }} / {{ conversionProgress.total }}</span>
      </div>
      <progress 
        class="progress progress-primary w-full mb-2" 
        :value="conversionProgress.processed" 
        :max="conversionProgress.total"
      ></progress>
      <div class="text-xs text-gray-500">
        <div class="flex justify-between items-center">
          <span>{{ Math.round((conversionProgress.processed / conversionProgress.total) * 100) }}% 完成</span>
          <span v-if="etaInfo" class="flex items-center gap-2">
            <span class="badge badge-sm badge-outline">{{ etaInfo.speed.toFixed(1) }} 篇/秒</span>
            <span class="text-primary">預估剩餘: {{ etaInfo.formattedETA }}</span>
          </span>
        </div>
        <div v-if="currentProcessingFile" class="mt-1 text-center truncate">
          正在處理: {{ getFileName(currentProcessingFile) }}
        </div>
      </div>
    </div>

    <!-- 轉換結果 -->
    <div v-if="conversionResult" class="mb-6">
      <div class="alert" :class="{
        'alert-success': conversionResult.success,
        'alert-error': !conversionResult.success,
        'alert-warning': conversionResult.success && conversionResult.warnings.length > 0
      }">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <h3 class="font-bold">轉換結果</h3>
            <div class="badge" :class="{
              'badge-success': conversionResult.success,
              'badge-error': !conversionResult.success
            }">
              {{ conversionResult.success ? '成功' : '失敗' }}
            </div>
          </div>
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span class="font-medium">處理檔案:</span>
              <span class="ml-1">{{ conversionResult.processedFiles }}</span>
            </div>
            <div v-if="conversionResult.errors.length > 0" class="text-error">
              <span class="font-medium">錯誤:</span>
              <span class="ml-1">{{ conversionResult.errors.length }}</span>
            </div>
            <div v-if="conversionResult.warnings.length > 0" class="text-warning">
              <span class="font-medium">警告:</span>
              <span class="ml-1">{{ conversionResult.warnings.length }}</span>
            </div>
          </div>
          <div class="text-xs text-gray-500 mt-2">
            轉換完成時間: {{ formatTime(conversionResult.completedAt) }}
          </div>
        </div>
      </div>

      <!-- 錯誤詳情 -->
      <div v-if="conversionResult.errors.length > 0" class="collapse collapse-arrow bg-error/10 border border-error/20 mt-4">
        <input type="checkbox" />
        <div class="collapse-title text-lg font-medium text-error">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            錯誤詳情 ({{ conversionResult.errors.length }})
          </div>
        </div>
        <div class="collapse-content max-h-60 overflow-y-auto">
          <div v-for="(error, index) in conversionResult.errors" :key="index" class="mb-3 p-3 bg-base-100 rounded border-l-4 border-error">
            <div class="font-semibold text-sm mb-1">{{ getFileName(error.file) }}</div>
            <div class="text-xs text-gray-500 mb-2">{{ error.file }}</div>
            <div class="text-sm text-error bg-error/10 p-2 rounded">{{ error.error }}</div>
          </div>
        </div>
      </div>

      <!-- 警告詳情 -->
      <div v-if="conversionResult.warnings.length > 0" class="collapse collapse-arrow bg-warning/10 border border-warning/20 mt-4">
        <input type="checkbox" />
        <div class="collapse-title text-lg font-medium text-warning">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            警告詳情 ({{ conversionResult.warnings.length }})
          </div>
        </div>
        <div class="collapse-content max-h-60 overflow-y-auto">
          <div v-for="(warning, index) in conversionResult.warnings" :key="index" class="mb-3 p-3 bg-base-100 rounded border-l-4 border-warning">
            <div class="font-semibold text-sm mb-1">{{ getFileName(warning.file) }}</div>
            <div class="text-xs text-gray-500 mb-2">{{ warning.file }}</div>
            <div class="text-sm text-warning bg-warning/10 p-2 rounded">{{ warning.warning }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import { ConverterService, type ConversionResult } from '@/services/ConverterService'
import type { ConversionConfig } from '@/types'
import { getFileName } from '@/utils/formatters'
import { notificationService } from '@/services/NotificationService'
import { formatErrorMessage } from '@/utils/errorFormatter'
import { calculateETA } from '@/utils/timeFormatter'

const configStore = useConfigStore()
const converterService = new ConverterService()

// 響應式資料
const isConverting = ref(false)
const conversionResult = ref<ConversionResult | null>(null)
const conversionStats = ref<{
  totalArticles: number
  articlesByCategory: Record<string, number>
} | null>(null)

const conversionProgress = ref({
  processed: 0,
  total: 0
})

const currentProcessingFile = ref<string>('')
const conversionStartTime = ref<number>(0)

// 轉換設定
const config = computed<ConversionConfig>(() => ({
  sourceDir: configStore.paths.obsidianVault,
  targetDir: configStore.paths.targetBlog,
  imageSourceDir: configStore.paths.imagesDir,
  preserveStructure: true
}))

// 檢查設定是否有效
const isConfigValid = computed(() => {
  return converterService.validateConfig(config.value)
})

// 計算 ETA
const etaInfo = computed(() => {
  if (!isConverting.value || conversionStartTime.value === 0) {
    return null
  }

  return calculateETA({
    processed: conversionProgress.value.processed,
    total: conversionProgress.value.total,
    startTime: conversionStartTime.value
  })
})

/**
 * 載入轉換統計資訊
 */
const loadStats = async () => {
  try {
    if (!config.value.sourceDir) {
      return
    }
    
    const publishPath = `${config.value.sourceDir}/publish`
    conversionStats.value = await converterService.getConversionStats(publishPath)
  } catch (error) {
    console.error('Failed to load conversion stats:', error)
  }
}

/**
 * 開始轉換流程
 */
const startConversion = async () => {
  if (!isConfigValid.value) {
    notificationService.error(
      '設定錯誤',
      '請先在設定面板中配置 Obsidian Vault 和目標部落格路徑'
    )
    return
  }

  // 驗證批次轉換前置條件
  const validation = await converterService.validateBatchConversionPrerequisites(config.value)
  if (!validation.valid) {
    notificationService.error(
      '轉換前置條件檢查失敗',
      `請檢查以下問題：\n${validation.issues.map(i => `• ${i}`).join('\n')}`
    )
    return
  }

  isConverting.value = true
  conversionResult.value = null
  currentProcessingFile.value = ''
  conversionStartTime.value = Date.now()

  // 重設進度
  conversionProgress.value = {
    processed: 0,
    total: conversionStats.value?.totalArticles || 0
  }

  try {
    // 執行轉換
    const result = await converterService.convertAllArticles(
      config.value,
      (processed: number, total: number, currentFile?: string) => {
        conversionProgress.value = { processed, total }
        currentProcessingFile.value = currentFile || ''
      }
    )

    // 添加完成時間
    const resultWithTime = {
      ...result,
      completedAt: new Date()
    }

    conversionResult.value = resultWithTime

    // 顯示成功通知
    if (result.success) {
      const hasErrors = result.errors.length > 0
      const hasWarnings = result.warnings.length > 0

      if (!hasErrors && !hasWarnings) {
        // 完美成功：無錯誤、無警告
        notificationService.success(
          '完美！轉換完成 🎉',
          `成功轉換 ${result.processedFiles} 篇文章，無錯誤、無警告`
        )
      } else if (!hasErrors && hasWarnings) {
        // 成功但有警告
        notificationService.success(
          '轉換完成',
          `成功轉換 ${result.processedFiles} 篇文章，${result.warnings.length} 個警告`
        )
      }
    } else {
      // 轉換失敗
      notificationService.error(
        '轉換失敗',
        `處理了 ${result.processedFiles} 篇文章，${result.errors.length} 個錯誤`
      )
    }

    // 重新載入統計
    await loadStats()
    
  } catch (error) {
    console.error('Conversion failed:', error)

    // 格式化錯誤訊息
    const formatted = formatErrorMessage(error)

    // 顯示友善的錯誤通知
    notificationService.error(
      formatted.friendlyMessage,
      formatted.suggestions.slice(0, 2).join('\n')
    )

    conversionResult.value = {
      success: false,
      processedFiles: 0,
      errors: [{
        file: 'conversion process',
        error: formatted.originalError
      }],
      warnings: [],
      completedAt: new Date()
    }
  } finally {
    isConverting.value = false
    currentProcessingFile.value = ''
  }
}

/**
 * 轉換指定分類的文章
 * @param {string} category - 分類名稱
 */
const convertCategory = async (category: string) => {
  if (!isConfigValid.value) {
    notificationService.error(
      '設定錯誤',
      '請先在設定面板中配置 Obsidian Vault 和目標部落格路徑'
    )
    return
  }

  isConverting.value = true
  conversionResult.value = null
  currentProcessingFile.value = ''
  conversionStartTime.value = Date.now()

  const categoryStats = conversionStats.value?.articlesByCategory[category] || 0

  // 重設進度
  conversionProgress.value = {
    processed: 0,
    total: categoryStats
  }

  try {
    // 執行分類轉換
    const result = await converterService.convertArticlesByCategory(
      config.value,
      category,
      (processed: number, total: number, currentFile?: string) => {
        conversionProgress.value = { processed, total }
        currentProcessingFile.value = currentFile || ''
      }
    )

    // 添加完成時間
    const resultWithTime = {
      ...result,
      completedAt: new Date()
    }

    conversionResult.value = resultWithTime

    // 顯示成功通知
    if (result.success) {
      const hasErrors = result.errors.length > 0
      const hasWarnings = result.warnings.length > 0

      if (!hasErrors && !hasWarnings) {
        // 完美成功：無錯誤、無警告
        notificationService.success(
          '完美！轉換完成 🎉',
          `成功轉換 ${category} 分類的 ${result.processedFiles} 篇文章，無錯誤、無警告`
        )
      } else if (!hasErrors && hasWarnings) {
        // 成功但有警告
        notificationService.success(
          '轉換完成',
          `成功轉換 ${category} 分類的 ${result.processedFiles} 篇文章，${result.warnings.length} 個警告`
        )
      }
    } else {
      // 轉換失敗
      notificationService.error(
        '轉換失敗',
        `處理了 ${category} 分類的 ${result.processedFiles} 篇文章，${result.errors.length} 個錯誤`
      )
    }

    // 重新載入統計
    await loadStats()
    
  } catch (error) {
    console.error(`Category ${category} conversion failed:`, error)

    // 格式化錯誤訊息
    const formatted = formatErrorMessage(error)

    // 顯示友善的錯誤通知
    notificationService.error(
      `${category} 分類轉換失敗`,
      formatted.friendlyMessage + '\n\n' + formatted.suggestions.slice(0, 2).join('\n')
    )

    conversionResult.value = {
      success: false,
      processedFiles: 0,
      errors: [{
        file: `category: ${category}`,
        error: formatted.originalError
      }],
      warnings: [],
      completedAt: new Date()
    }
  } finally {
    isConverting.value = false
    currentProcessingFile.value = ''
  }
}

/**
 * 格式化時間顯示
 * @param {Date} date - 日期物件
 * @returns {string} 格式化後的時間字串
 */
const formatTime = (date?: Date): string => {
  if (!date) {
    return ''
  }
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 組件掛載時載入統計
onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.conversion-panel {
  max-width: 800px;
  margin: 0 auto;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.progress {
  height: 8px;
}

.collapse-content {
  max-height: 300px;
  overflow-y: auto;
}
</style>