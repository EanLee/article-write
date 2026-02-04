import { describe, it, expect, vi, beforeEach } from 'vitest'
import { notificationService } from '@/services/NotificationService'

/**
 * 轉換成功通知測試
 *
 * 測試目標：
 * - 轉換成功時顯示明顯的成功通知
 * - 通知包含轉換統計資訊
 * - 通知自動關閉但可手動關閉
 */
describe('轉換成功通知', () => {
  beforeEach(() => {
    notificationService.dismissAll()
  })

  it('應該在轉換成功時顯示成功通知', () => {
    // Arrange
    const successSpy = vi.spyOn(notificationService, 'success')
    const processedFiles = 10

    // Act
    notificationService.success(
      '轉換完成！',
      `成功轉換 ${processedFiles} 篇文章`
    )

    // Assert
    expect(successSpy).toHaveBeenCalledWith(
      '轉換完成！',
      expect.stringContaining('10')
    )
    expect(notificationService.notifications.value).toHaveLength(1)
    expect(notificationService.notifications.value[0].type).toBe('success')
    expect(notificationService.notifications.value[0].title).toBe('轉換完成！')
  })

  it('應該包含詳細的轉換統計資訊', () => {
    // Arrange
    const stats = {
      processedFiles: 10,
      errors: 0,
      warnings: 2
    }

    // Act
    const message = `成功轉換 ${stats.processedFiles} 篇文章${stats.warnings > 0 ? `，${stats.warnings} 個警告` : ''}`
    notificationService.success('轉換完成！', message)

    // Assert
    const notification = notificationService.notifications.value[0]
    expect(notification.message).toContain('10 篇文章')
    expect(notification.message).toContain('2 個警告')
  })

  it('當轉換完全成功（無錯誤無警告）時應該顯示慶祝訊息', () => {
    // Arrange
    const stats = {
      processedFiles: 10,
      errors: 0,
      warnings: 0
    }

    // Act
    notificationService.success(
      '完美！轉換完成 🎉',
      `成功轉換 ${stats.processedFiles} 篇文章，無錯誤、無警告`
    )

    // Assert
    const notification = notificationService.notifications.value[0]
    expect(notification.title).toContain('🎉')
    expect(notification.message).toContain('無錯誤、無警告')
  })

  it('應該可以被手動關閉', () => {
    // Arrange
    const id = notificationService.success('轉換完成！', '成功轉換 10 篇文章')
    expect(notificationService.notifications.value).toHaveLength(1)

    // Act
    notificationService.dismiss(id)

    // Assert
    expect(notificationService.notifications.value).toHaveLength(0)
  })

  it('應該在指定時間後自動關閉', async () => {
    // Arrange
    vi.useFakeTimers()
    notificationService.success('轉換完成！', '成功轉換 10 篇文章', {
      duration: 3000
    })
    expect(notificationService.notifications.value).toHaveLength(1)

    // Act
    vi.advanceTimersByTime(3000)

    // Assert
    expect(notificationService.notifications.value).toHaveLength(0)

    // Cleanup
    vi.useRealTimers()
  })
})
