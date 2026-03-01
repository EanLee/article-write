<template>
  <div class="toast toast-end toast-bottom z-50">
    <TransitionGroup name="toast">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="alert shadow-lg max-w-sm"
        :class="alertClass(notification.type)"
      >
        <component :is="getIcon(notification.type)" :size="20" />
        <div class="flex-1">
          <h3 class="font-bold text-sm">{{ notification.title }}</h3>
          <p v-if="notification.message" class="text-xs opacity-80">{{ notification.message }}</p>
        </div>
        <div class="flex gap-1">
          <button
            v-if="notification.action"
            class="btn btn-sm btn-ghost"
            @click="handleAction(notification)"
          >
            {{ notification.action.label }}
          </button>
          <button
            v-if="notification.dismissible"
            class="btn btn-sm btn-ghost btn-square"
            @click="dismiss(notification.id)"
          >
            <X :size="16" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { notificationService, type Notification, type NotificationType } from "@/services/NotificationService"
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-vue-next"

const notifications = computed(() => notificationService.notifications.value)

function alertClass(type: NotificationType): string {
  switch (type) {
    case "success":
      return "alert-success"
    case "error":
      return "alert-error"
    case "warning":
      return "alert-warning"
    case "info":
    default:
      return "alert-info"
  }
}

function getIcon(type: NotificationType) {
  switch (type) {
    case "success":
      return CheckCircle
    case "error":
      return XCircle
    case "warning":
      return AlertTriangle
    case "info":
    default:
      return Info
  }
}

function dismiss(id: string) {
  notificationService.dismiss(id)
}

function handleAction(notification: Notification) {
  if (notification.action) {
    notification.action.callback()
    dismiss(notification.id)
  }
}
</script>

<style scoped>
.toast {
  position: fixed;
  padding: 1rem;
  pointer-events: none;
}

.toast > * {
  pointer-events: auto;
}

/* Transition animations */
.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in;
}

.toast-move {
  transition: transform 0.3s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>
