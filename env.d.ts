/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  electronAPI: {
    // File operations
    readFile: (path: string) => Promise<string>
    writeFile: (path: string, content: string) => Promise<void>
    deleteFile: (path: string) => Promise<void>
    
    // Directory operations
    readDirectory: (path: string) => Promise<string[]>
    createDirectory: (path: string) => Promise<void>
    
    // Config operations
    getConfig: () => Promise<any>
    setConfig: (config: any) => Promise<void>
    validateArticlesDir: (path: string) => Promise<{ valid: boolean; message: string }>
    validateAstroBlog: (path: string) => Promise<{ valid: boolean; message: string }>
    
    // Directory selection
    selectDirectory: (options?: { title?: string; defaultPath?: string }) => Promise<string | null>
    
    // Process management
    startDevServer: (projectPath: string) => Promise<void>
    stopDevServer: () => Promise<void>
    getServerStatus: () => Promise<{ running: boolean; url?: string }>
  }
}