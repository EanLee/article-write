import { ref, type Ref } from "vue"

/**
 * 通知類型
 */
export type NotificationType = "success" | "error" | "warning" | "info"

/**
 * 通知項目
 */
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration: number
  dismissible: boolean
  action?: {
    label: string
    callback: () => void
  }
}

/**
 * 通知服務
 * 提供全域的通知/Toast 功能
 */
export class NotificationService {
  public readonly notifications: Ref<Notification[]> = ref([])
  private static DEFAULT_DURATION = 5000 // 5 seconds

  /**
   * 顯示成功通知
   */
  success(title: string, message?: string, options?: NotificationOptions): string {
    return this.show({
      type: "success",
      title,
      message,
      ...options
    })
  }

  /**
   * 顯示錯誤通知
   */
  error(title: string, message?: string, options?: NotificationOptions): string {
    return this.show({
      type: "error",
      title,
      message,
      duration: 8000, // 錯誤通知顯示更久
      ...options
    })
  }

  /**
   * 顯示警告通知
   */
  warning(title: string, message?: string, options?: NotificationOptions): string {
    return this.show({
      type: "warning",
      title,
      message,
      ...options
    })
  }

  /**
   * 顯示資訊通知
   */
  info(title: string, message?: string, options?: NotificationOptions): string {
    return this.show({
      type: "info",
      title,
      message,
      ...options
    })
  }

  /**
   * 顯示通知
   */
  show(options: ShowNotificationOptions): string {
    const id = this.generateId()
    const notification: Notification = {
      id,
      type: options.type || "info",
      title: options.title,
      message: options.message,
      duration: options.duration ?? NotificationService.DEFAULT_DURATION,
      dismissible: options.dismissible ?? true,
      action: options.action
    }

    this.notifications.value.push(notification)

    // 自動移除（如果 duration > 0）
    if (notification.duration > 0) {
      setTimeout(() => {
        this.dismiss(id)
      }, notification.duration)
    }

    return id
  }

  /**
   * 關閉通知
   */
  dismiss(id: string): void {
    const index = this.notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      this.notifications.value.splice(index, 1)
    }
  }

  /**
   * 關閉所有通知
   */
  dismissAll(): void {
    this.notifications.value = []
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
  }
}

// 選項類型
interface NotificationOptions {
  duration?: number
  dismissible?: boolean
  action?: {
    label: string
    callback: () => void
  }
}

interface ShowNotificationOptions extends NotificationOptions {
  type?: NotificationType
  title: string
  message?: string
}

// 建立單例實例
export const notificationService = new NotificationService()

// 便捷函數
export const notify = {
  success: (title: string, message?: string, options?: NotificationOptions) =>
    notificationService.success(title, message, options),
  error: (title: string, message?: string, options?: NotificationOptions) =>
    notificationService.error(title, message, options),
  warning: (title: string, message?: string, options?: NotificationOptions) =>
    notificationService.warning(title, message, options),
  info: (title: string, message?: string, options?: NotificationOptions) =>
    notificationService.info(title, message, options)
}
