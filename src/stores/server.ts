import { defineStore } from "pinia"
import { ref } from "vue"
import type { ServerStatus } from "@/types"
import { logger } from "@/utils/logger"

export const useServerStore = defineStore("server", () => {
  // State
  const status = ref<ServerStatus>({
    running: false,
    url: undefined,
    logs: []
  })
  
  const loading = ref(false)

  // Actions
  async function startServer(projectPath: string) {
    loading.value = true
    try {
      await window.electronAPI.startDevServer(projectPath)
      await updateStatus()
    } catch (error) {
      logger.error("Failed to start server:", error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function stopServer() {
    loading.value = true
    try {
      await window.electronAPI.stopDevServer()
      status.value = {
        running: false,
        url: undefined,
        logs: []
      }
    } catch (error) {
      logger.error("Failed to stop server:", error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function updateStatus() {
    try {
      const serverStatus = await window.electronAPI.getServerStatus()
      status.value = {
        ...status.value,
        running: serverStatus.running,
        url: serverStatus.url
      }
    } catch (error) {
      logger.error("Failed to get server status:", error)
    }
  }

  function addLog(log: string) {
    if (!status.value.logs) {
      status.value.logs = []
    }
    status.value.logs.push(log)
    
    // Keep only last 100 log entries
    if (status.value.logs.length > 100) {
      status.value.logs = status.value.logs.slice(-100)
    }
  }

  return {
    // State
    status,
    loading,
    
    // Actions
    startServer,
    stopServer,
    updateStatus,
    addLog
  }
})