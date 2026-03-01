/**
 * 時間格式化工具
 * 提供時間格式化和 ETA 計算功能
 */

/**
 * ETA 計算參數
 */
export interface ETAParams {
  /** 已處理數量 */
  processed: number
  /** 總數量 */
  total: number
  /** 開始時間（毫秒時間戳） */
  startTime: number
}

/**
 * ETA 計算結果
 */
export interface ETAResult {
  /** 剩餘秒數 */
  remainingSeconds: number
  /** 處理速度（項目/秒） */
  speed: number
  /** 格式化的 ETA 字串 */
  formattedETA: string
}

/**
 * 將秒數格式化為易讀的時間字串
 *
 * @param seconds - 秒數
 * @returns 格式化後的時間字串
 *
 * @example
 * ```typescript
 * formatDuration(30) // "30秒"
 * formatDuration(90) // "1分30秒"
 * formatDuration(3660) // "1小時1分鐘"
 * ```
 */
export function formatDuration(seconds: number): string {
  // 處理負數和 0
  if (seconds <= 0) {
    return "0秒"
  }

  // 四捨五入到最接近的秒
  const totalSeconds = Math.round(seconds)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours}小時`)
  }

  if (minutes > 0) {
    // 如果有秒數，使用「分」；如果沒有秒數，使用「分鐘」
    if (secs > 0 && hours === 0) {
      parts.push(`${minutes}分`)
    } else {
      parts.push(`${minutes}分鐘`)
    }
  }

  // 如果有小時，則不顯示秒
  // 只有在沒有小時的情況下才顯示秒
  if (hours === 0 && (secs > 0 || parts.length === 0)) {
    parts.push(`${secs}秒`)
  }

  return parts.join("")
}

/**
 * 計算預估剩餘時間（ETA）
 *
 * @param params - ETA 計算參數
 * @returns ETA 計算結果，如果無法計算則返回 null
 *
 * @example
 * ```typescript
 * const eta = calculateETA({
 *   processed: 5,
 *   total: 10,
 *   startTime: Date.now() - 5000
 * })
 * console.log(eta.formattedETA) // "5秒"
 * console.log(eta.speed) // 1.0
 * ```
 */
export function calculateETA(params: ETAParams): ETAResult | null {
  const { processed, total, startTime } = params

  // 如果尚未開始處理，返回 null
  if (processed === 0) {
    return null
  }

  // 如果已完成，返回 0
  if (processed >= total) {
    return {
      remainingSeconds: 0,
      speed: 0,
      formattedETA: "0秒"
    }
  }

  // 計算已花費的時間（秒）
  const elapsedMs = Date.now() - startTime
  const elapsedSeconds = elapsedMs / 1000

  // 計算處理速度（項目/秒）
  const speed = processed / elapsedSeconds

  // 計算剩餘項目數
  const remaining = total - processed

  // 計算預估剩餘時間（秒）
  const remainingSeconds = remaining / speed

  return {
    remainingSeconds,
    speed,
    formattedETA: formatDuration(remainingSeconds)
  }
}
