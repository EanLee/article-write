import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { FileService } from './services/FileService'
import { ConfigService } from './services/ConfigService'
import { ProcessService } from './services/ProcessService'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow

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

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  
  // Initialize services
  const fileService = new FileService()
  const configService = new ConfigService()
  const processService = new ProcessService()
  
  // Register IPC handlers
  ipcMain.handle('read-file', (_, path: string) => fileService.readFile(path))
  ipcMain.handle('write-file', (_, path: string, content: string) => fileService.writeFile(path, content))
  ipcMain.handle('delete-file', (_, path: string) => fileService.deleteFile(path))
  ipcMain.handle('read-directory', (_, path: string) => fileService.readDirectory(path))
  ipcMain.handle('create-directory', (_, path: string) => fileService.createDirectory(path))
  ipcMain.handle('get-file-stats', (_, path: string) => fileService.getFileStats(path))
  
  ipcMain.handle('get-config', () => configService.getConfig())
  ipcMain.handle('set-config', (_, config: any) => configService.setConfig(config))
  ipcMain.handle('validate-obsidian-vault', (_, path: string) => configService.validateObsidianVault(path))
  ipcMain.handle('validate-astro-blog', (_, path: string) => configService.validateAstroBlog(path))
  
  ipcMain.handle('start-dev-server', (_, projectPath: string) => processService.startDevServer(projectPath))
  ipcMain.handle('stop-dev-server', () => processService.stopDevServer())
  ipcMain.handle('get-server-status', () => processService.getServerStatus())
  
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
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  // Clean up any running processes
  const processService = new ProcessService()
  processService.stopDevServer()
})