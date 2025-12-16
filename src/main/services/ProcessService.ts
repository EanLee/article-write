import { spawn, ChildProcess } from 'child_process'

export class ProcessService {
  private devServerProcess: ChildProcess | null = null
  private serverUrl: string | null = null

  async startDevServer(projectPath: string): Promise<void> {
    if (this.devServerProcess) {
      throw new Error('Development server is already running')
    }

    return new Promise((resolve, reject) => {
      this.devServerProcess = spawn('npm', ['run', 'dev'], {
        cwd: projectPath,
        stdio: 'pipe'
      })

      this.devServerProcess.stdout?.on('data', (data) => {
        const output = data.toString()
        console.log('Dev server output:', output)
        
        // Look for server URL in output
        const urlMatch = output.match(/Local:\s+(http:\/\/[^\s]+)/)
        if (urlMatch) {
          this.serverUrl = urlMatch[1]
        }
      })

      this.devServerProcess.stderr?.on('data', (data) => {
        console.error('Dev server error:', data.toString())
      })

      this.devServerProcess.on('error', (error) => {
        this.devServerProcess = null
        this.serverUrl = null
        reject(error)
      })

      this.devServerProcess.on('exit', (code) => {
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
      this.devServerProcess.kill()
      this.devServerProcess = null
      this.serverUrl = null
    }
  }

  getServerStatus(): { running: boolean; url?: string } {
    return {
      running: this.devServerProcess !== null,
      url: this.serverUrl || undefined
    }
  }
}