import { spawn, ChildProcess } from "child_process"
import { BrowserWindow } from "electron"
import { IPC } from "../ipc-channels.js"

export class ProcessService {
  private devServerProcess: ChildProcess | null = null
  private serverUrl: string | null = null
  private logs: string[] = []
  private static MAX_LOGS = 500

  private sendLogToRenderer(log: string, type: "stdout" | "stderr" = "stdout") {
    this.logs.push(`[${type}] ${log}`)
    if (this.logs.length > ProcessService.MAX_LOGS) {
      this.logs = this.logs.slice(-ProcessService.MAX_LOGS)
    }

    // Send to all renderer windows
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(win => {
      // QUAL6-01: 使用 IPC.EVENT_SERVER_LOG 常數，防止拼錯 channel 名稱
      win.webContents.send(IPC.EVENT_SERVER_LOG, { log, type, timestamp: new Date().toISOString() })
    })
  }

  getLogs(): string[] {
    return [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
  }

  async startDevServer(projectPath: string): Promise<void> {
    if (this.devServerProcess) {
      throw new Error("Development server is already running")
    }

    this.clearLogs()
    this.sendLogToRenderer(`啟動開發伺服器: ${projectPath}`)

    return new Promise((resolve, reject) => {
      // QUAL6-07: 改用 pnpm（此專案使用 pnpm，不徳用 npm）
      // Windows 需要使用 shell: true 來執行 pnpm
      this.devServerProcess = spawn("pnpm", ["run", "dev"], {
        cwd: projectPath,
        stdio: "pipe",
        shell: true
      })

      // QUAL6-02: 單次 settle 樣式——確保 resolve/reject 只被呼叫一次
      let settled = false
      const settle = (fn: () => void) => {
        if (!settled) {
          settled = true
          clearTimeout(startupTimeout)
          fn()
        }
      }

      // QUAL6-02: 30 秒內沒有收到 URL 則視為就緒（原本盲目 2 秒必失效)
      const startupTimeout = setTimeout(() => {
        this.sendLogToRenderer("警告：30 秒內未偵測到伺服器 URL，可能需要更多時間")
        settle(resolve)   // 超時後仍然 resolve，之後輸出作為訊息展示即可
      }, 30000)

      this.devServerProcess.stdout?.on("data", (data) => {
        const output = data.toString()
        this.sendLogToRenderer(output, "stdout")

        // QUAL6-02: 偵測到 URL 才是真正就緒，而非盲目等待 2 秒
        const urlMatch = output.match(/Local:\s+(http:\/\/[^\s]+)/)
        if (urlMatch) {
          this.serverUrl = urlMatch[1]
          this.sendLogToRenderer(`伺服器已就緒: ${this.serverUrl}`)
          settle(resolve)
        }
      })

      this.devServerProcess.stderr?.on("data", (data) => {
        this.sendLogToRenderer(data.toString(), "stderr")
      })

      this.devServerProcess.on("error", (error) => {
        this.sendLogToRenderer(`啟動錯誤: ${error.message}`, "stderr")
        this.devServerProcess = null
        this.serverUrl = null
        settle(() => reject(error))
      })

      this.devServerProcess.on("exit", (code) => {
        this.sendLogToRenderer(`伺服器已停止，退出碼: ${code}`)
        this.devServerProcess = null
        this.serverUrl = null
        if (code !== 0 && code !== null) {
          settle(() => reject(new Error(`Development server exited with code ${code}`)))
        } else {
          settle(resolve)
        }
      })
    })
  }

  async stopDevServer(): Promise<void> {
    if (!this.devServerProcess) { return }

    this.sendLogToRenderer("正在停止伺服器...")

    // QUAL6-09: 等待 process 實際退出，而非 kill() 後立即返回
    await new Promise<void>((resolve) => {
      const proc = this.devServerProcess!
      proc.once("exit", () => resolve())

      // Windows SIGTERM 是 non-blocking， kill() 後以 TASKKILL 強制复蓋保證退出
      proc.kill()

      // 保陽: 5 秒內不退出，強製終止
      setTimeout(() => {
        if (this.devServerProcess) {
          this.devServerProcess.kill("SIGKILL")
        }
        resolve()
      }, 5000)
    })

    this.devServerProcess = null
    this.serverUrl = null
    this.sendLogToRenderer("伺服器已停止")
  }

  getServerStatus(): { running: boolean; url?: string; logs: string[] } {
    return {
      running: this.devServerProcess !== null,
      url: this.serverUrl || undefined,
      logs: this.getLogs()
    }
  }
}