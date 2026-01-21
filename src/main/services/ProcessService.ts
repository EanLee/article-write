import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'

export class ProcessService {
  private devServerProcess: ChildProcess | null = null
  private serverUrl: string | null = null
  private logs: string[] = []
  private static MAX_LOGS = 500

  private sendLogToRenderer(log: string, type: 'stdout' | 'stderr' = 'stdout') {
    this.logs.push(`[${type}] ${log}`)
    if (this.logs.length > ProcessService.MAX_LOGS) {
      this.logs = this.logs.slice(-ProcessService.MAX_LOGS)
    }

    // Send to all renderer windows
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(win => {
      win.webContents.send('server-log', { log, type, timestamp: new Date().toISOString() })
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
      throw new Error('Development server is already running')
    }

    this.clearLogs()
    this.sendLogToRenderer(`啟動開發伺服器: ${projectPath}`)

    return new Promise((resolve, reject) => {
      // Windows 需要使用 shell: true 來執行 npm
      this.devServerProcess = spawn('npm', ['run', 'dev'], {
        cwd: projectPath,
        stdio: 'pipe',
        shell: true
      })

      this.devServerProcess.stdout?.on('data', (data) => {
        const output = data.toString()
        this.sendLogToRenderer(output, 'stdout')

        // Look for server URL in output
        const urlMatch = output.match(/Local:\s+(http:\/\/[^\s]+)/)
        if (urlMatch) {
          this.serverUrl = urlMatch[1]
          this.sendLogToRenderer(`伺服器已就緒: ${this.serverUrl}`)
        }
      })

      this.devServerProcess.stderr?.on('data', (data) => {
        this.sendLogToRenderer(data.toString(), 'stderr')
      })

      this.devServerProcess.on('error', (error) => {
        this.sendLogToRenderer(`啟動錯誤: ${error.message}`, 'stderr')
        this.devServerProcess = null
        this.serverUrl = null
        reject(error)
      })

      this.devServerProcess.on('exit', (code) => {
        this.sendLogToRenderer(`伺服器已停止，退出碼: ${code}`)
        this.devServerProcess = null
        this.serverUrl = null
        if (code !== 0) {
          reject(new Error(`Development server exited with code ${code}`))
        }
      })

      // Give the server a moment to start
      setTimeout(() => {
        resolve()
      }, 2000)
    })
  }

  async stopDevServer(): Promise<void> {
    if (this.devServerProcess) {
      this.sendLogToRenderer('正在停止伺服器...')
      this.devServerProcess.kill()
      this.devServerProcess = null
      this.serverUrl = null
      this.sendLogToRenderer('伺服器已停止')
    }
  }

  getServerStatus(): { running: boolean; url?: string; logs: string[] } {
    return {
      running: this.devServerProcess !== null,
      url: this.serverUrl || undefined,
      logs: this.getLogs()
    }
  }
}