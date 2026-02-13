import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { FileService } from './services/FileService.js'
import { ConfigService } from './services/ConfigService.js'
import { ProcessService } from './services/ProcessService.js'
import { PublishService } from './services/PublishService.js'
import { GitService } from './services/GitService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isDev = !app.isPackaged

let mainWindow: BrowserWindow

// 模組級別服務實例，確保整個應用生命週期使用同一實例
const fileService = new FileService()
const configService = new ConfigService()
const processService = new ProcessService()
const publishService = new PublishService(fileService)
const gitService = new GitService()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  })

  // 設定 Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? // 開發模式：允許 Vite 開發伺服器和熱更新
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' http://localhost:3002; " +
              "style-src 'self' 'unsafe-inline' http://localhost:3002; " +
              "img-src 'self' data: http://localhost:3002; " +
              "connect-src 'self' ws://localhost:3002 http://localhost:3002; " +
              "font-src 'self' data:;"
            : // 生產模式：更嚴格的策略
              "default-src 'self'; " +
              "script-src 'self'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data:; " +
              "connect-src 'self'; " +
              "font-src 'self' data:;"
        ]
      }
    })
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3002')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  
  // Register IPC handlers
  ipcMain.handle('read-file', (_, path: string) => fileService.readFile(path))
  ipcMain.handle('write-file', (_, path: string, content: string) => fileService.writeFile(path, content))
  ipcMain.handle('delete-file', (_, path: string) => fileService.deleteFile(path))
  ipcMain.handle('copy-file', (_, sourcePath: string, targetPath: string) => fileService.copyFile(sourcePath, targetPath))
  ipcMain.handle('read-directory', (_, path: string) => fileService.readDirectory(path))
  ipcMain.handle('create-directory', (_, path: string) => fileService.createDirectory(path))
  ipcMain.handle('get-file-stats', (_, path: string) => fileService.getFileStats(path))
  
  ipcMain.handle('get-config', () => configService.getConfig())
  ipcMain.handle('set-config', (_, config: any) => configService.setConfig(config))
  ipcMain.handle('validate-articles-dir', (_, path: string) => configService.validateArticlesDir(path))
  ipcMain.handle('validate-astro-blog', (_, path: string) => configService.validateAstroBlog(path))

  // Publish Service
  ipcMain.handle('publish-article', async (_, article: any, config: any, onProgress?: any) => {
    return await publishService.publishArticle(article, config, onProgress)
  })

  // Git Service
  ipcMain.handle('git-status', (_, repoPath: string) => gitService.getStatus(repoPath))
  ipcMain.handle('git-add', (_, repoPath: string, paths?: string[]) => gitService.add(repoPath, paths))
  ipcMain.handle('git-commit', (_, repoPath: string, options: { message: string; addAll?: boolean }) =>
    gitService.commit(repoPath, options)
  )
  ipcMain.handle('git-push', (_, repoPath: string, options?: { remote?: string; branch?: string }) =>
    gitService.push(repoPath, options)
  )
  ipcMain.handle('git-add-commit-push', (_, repoPath: string, commitMessage: string) =>
    gitService.addCommitPush(repoPath, commitMessage)
  )
  ipcMain.handle('git-log', (_, repoPath: string, count?: number) => gitService.getLog(repoPath, count))

  ipcMain.handle('start-dev-server', (_, projectPath: string) => processService.startDevServer(projectPath))
  ipcMain.handle('stop-dev-server', () => processService.stopDevServer())
  ipcMain.handle('get-server-status', () => processService.getServerStatus())
  
  // 檔案監聽
  ipcMain.handle('start-file-watching', (_, watchPath: string) => {
    fileService.startWatching(watchPath, (event, filePath) => {
      // 只監聽 .md 檔案
      if (filePath.endsWith('.md')) {
        mainWindow?.webContents.send('file-change', { event, path: filePath })
      }
    })
    return true
  })
  ipcMain.handle('stop-file-watching', () => {
    fileService.stopWatching()
    return true
  })
  ipcMain.handle('is-file-watching', () => fileService.isWatching())
  
  // Directory selection
  ipcMain.handle('select-directory', async (_, options?: { title?: string, defaultPath?: string }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: options?.title || '選擇資料夾',
      defaultPath: options?.defaultPath
    })
    
    if (result.canceled) {
      return null
    }
    
    return result.filePaths[0]
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {createWindow()}
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {app.quit()}
})

app.on('before-quit', () => {
  // 清理運行中的進程和檔案監聽
  fileService.stopWatching()
  processService.stopDevServer()
})