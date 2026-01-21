import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NotificationService, notify } from '../NotificationService'

describe('NotificationService', () => {
  let notificationService: NotificationService

  beforeEach(() => {
    notificationService = new NotificationService()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('顯示通知', () => {
    it('應該能顯示成功通知', () => {
      const id = notificationService.success('成功', '操作完成')

      expect(notificationService.notifications.value).toHaveLength(1)
      expect(notificationService.notifications.value[0].type).toBe('success')
      expect(notificationService.notifications.value[0].title).toBe('成功')
      expect(notificationService.notifications.value[0].message).toBe('操作完成')
    })

    it('應該能顯示錯誤通知', () => {
      const id = notificationService.error('錯誤', '操作失敗')

      expect(notificationService.notifications.value).toHaveLength(1)
      expect(notificationService.notifications.value[0].type).toBe('error')
    })

    it('應該能顯示警告通知', () => {
      const id = notificationService.warning('警告', '請注意')

      expect(notificationService.notifications.value).toHaveLength(1)
      expect(notificationService.notifications.value[0].type).toBe('warning')
    })

    it('應該能顯示資訊通知', () => {
      const id = notificationService.info('資訊', '提示訊息')

      expect(notificationService.notifications.value).toHaveLength(1)
      expect(notificationService.notifications.value[0].type).toBe('info')
    })
  })

  describe('自動關閉', () => {
    it('應該在指定時間後自動關閉通知', () => {
      notificationService.success('成功', '操作完成', { duration: 3000 })

      expect(notificationService.notifications.value).toHaveLength(1)

      vi.advanceTimersByTime(3000)

      expect(notificationService.notifications.value).toHaveLength(0)
    })

    it('duration 為 0 時不應該自動關閉', () => {
      notificationService.success('成功', '操作完成', { duration: 0 })

      vi.advanceTimersByTime(10000)

      expect(notificationService.notifications.value).toHaveLength(1)
    })
  })

  describe('手動關閉', () => {
    it('應該能手動關閉通知', () => {
      const id = notificationService.success('成功', '操作完成', { duration: 0 })

      expect(notificationService.notifications.value).toHaveLength(1)

      notificationService.dismiss(id)

      expect(notificationService.notifications.value).toHaveLength(0)
    })

    it('應該能關閉所有通知', () => {
      notificationService.success('成功1', undefined, { duration: 0 })
      notificationService.success('成功2', undefined, { duration: 0 })
      notificationService.success('成功3', undefined, { duration: 0 })

      expect(notificationService.notifications.value).toHaveLength(3)

      notificationService.dismissAll()

      expect(notificationService.notifications.value).toHaveLength(0)
    })
  })

  describe('動作按鈕', () => {
    it('應該能設定動作按鈕', () => {
      const callback = vi.fn()
      notificationService.success('成功', '操作完成', {
        duration: 0,
        action: {
          label: '復原',
          callback
        }
      })

      const notification = notificationService.notifications.value[0]
      expect(notification.action).toBeDefined()
      expect(notification.action?.label).toBe('復原')

      notification.action?.callback()
      expect(callback).toHaveBeenCalled()
    })
  })

  describe('便捷函數', () => {
    it('notify.success 應該正常運作', () => {
      // Note: This tests the singleton instance
      const originalLength = notify.success('測試', '訊息')
      expect(typeof originalLength).toBe('string')
    })
  })
})
