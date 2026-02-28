import { describe, it, expect } from 'vitest'
import { formatDuration, calculateETA } from '@/utils/timeFormatter'

/**
 * 時間格式化工具測試
 *
 * 測試目標：
 * - 將秒數格式化為易讀的時間字串
 * - 計算預估剩餘時間（ETA）
 * - 處理邊界情況
 */
describe('formatDuration', () => {
  it('應該格式化少於 1 分鐘的時間', () => {
    expect(formatDuration(30)).toBe('30秒')
    expect(formatDuration(45)).toBe('45秒')
    expect(formatDuration(59)).toBe('59秒')
  })

  it('應該格式化 1-59 分鐘的時間', () => {
    expect(formatDuration(60)).toBe('1分鐘')
    expect(formatDuration(90)).toBe('1分30秒')
    expect(formatDuration(150)).toBe('2分30秒')
    expect(formatDuration(3540)).toBe('59分鐘')
  })

  it('應該格式化小時級別的時間', () => {
    expect(formatDuration(3600)).toBe('1小時')
    expect(formatDuration(3660)).toBe('1小時1分鐘')
    expect(formatDuration(7200)).toBe('2小時')
    expect(formatDuration(7320)).toBe('2小時2分鐘')
  })

  it('應該省略 0 值的單位', () => {
    expect(formatDuration(60)).toBe('1分鐘')
    expect(formatDuration(3600)).toBe('1小時')
    expect(formatDuration(3660)).toBe('1小時1分鐘')
  })

  it('應該處理 0 秒', () => {
    expect(formatDuration(0)).toBe('0秒')
  })

  it('應該處理負數（返回 0 秒）', () => {
    expect(formatDuration(-10)).toBe('0秒')
  })

  it('應該四捨五入到最接近的秒', () => {
    expect(formatDuration(30.4)).toBe('30秒')
    expect(formatDuration(30.6)).toBe('31秒')
  })
})

describe('calculateETA', () => {
  it('應該計算基本的預估剩餘時間', () => {
    const result = calculateETA({
      processed: 5,
      total: 10,
      startTime: Date.now() - 5000 // 5 秒前開始
    })

    expect(result!.remainingSeconds).toBeGreaterThan(0)
    expect(result!.remainingSeconds).toBeLessThanOrEqual(10)
    expect(result!.speed).toBeGreaterThan(0)
    expect(result!.formattedETA).toContain('秒')
  })

  it('當處理數為 0 時應該返回 null', () => {
    const result = calculateETA({
      processed: 0,
      total: 10,
      startTime: Date.now() - 1000
    })

    expect(result).toBeNull()
  })

  it('當已完成時應該返回 0 秒', () => {
    const result = calculateETA({
      processed: 10,
      total: 10,
      startTime: Date.now() - 10000
    })

    expect(result).not.toBeNull()
    if (result) {
      expect(result.remainingSeconds).toBe(0)
      expect(result.formattedETA).toBe('0秒')
    }
  })

  it('應該計算正確的處理速度（篇/秒）', () => {
    const result = calculateETA({
      processed: 10,
      total: 20,
      startTime: Date.now() - 10000 // 10 秒處理了 10 篇
    })

    expect(result).not.toBeNull()
    if (result) {
      expect(result.speed).toBeCloseTo(1.0, 1) // 1 篇/秒
    }
  })

  it('應該處理非常快的處理速度', () => {
    const result = calculateETA({
      processed: 10,
      total: 20,
      startTime: Date.now() - 1000 // 1 秒處理了 10 篇
    })

    expect(result).not.toBeNull()
    if (result) {
      expect(result.speed).toBeGreaterThan(5)
      expect(result.remainingSeconds).toBeLessThanOrEqual(5)
    }
  })

  it('應該處理非常慢的處理速度', () => {
    const result = calculateETA({
      processed: 1,
      total: 100,
      startTime: Date.now() - 10000 // 10 秒才處理了 1 篇
    })

    expect(result).not.toBeNull()
    if (result) {
      expect(result.speed).toBeLessThan(1)
      expect(result.remainingSeconds).toBeGreaterThan(100)
    }
  })

  it('應該返回格式化的 ETA 字串', () => {
    const result = calculateETA({
      processed: 5,
      total: 10,
      startTime: Date.now() - 5000
    })

    expect(result).not.toBeNull()
    if (result) {
      expect(result.formattedETA).toMatch(/\d+(秒|分鐘|小時)/)
    }
  })
})
