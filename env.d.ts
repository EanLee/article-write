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
    copyFile: (sourcePath: string, targetPath: string) => Promise<void>
    
    // Directory operations
    readDirectory: (path: string) => Promise<string[]>
    createDirectory: (path: string) => Promise<void>
    getFileStats: (path: string) => Promise<{ isDirectory: boolean; mtime: number } | null>
    
    // Config operations
    getConfig: () => Promise<any>
    setConfig: (config: any) => Promise<void>
    validateArticlesDir: (path: string) => Promise<{ valid: boolean; message: string }>
    validateAstroBlog: (path: string) => Promise<{ valid: boolean; message: string }>
    
    // Directory selection
    selectDirectory: (options?: { title?: string; defaultPath?: string }) => Promise<string | null>
    
    // Publish operations
    publishArticle: (article: any, config: any) => Promise<any>
    onPublishProgress: (callback: (data: { step: string; progress: number }) => void) => () => void
    syncAllPublished: (config: any) => Promise<any>
    onSyncProgress: (callback: (data: { current: number; total: number; title: string }) => void) => () => void
    
    // Process management
    startDevServer: (projectPath: string) => Promise<void>
    stopDevServer: () => Promise<void>
    getServerStatus: () => Promise<{ running: boolean; url?: string; logs: string[] }>
    onServerLog: (callback: (data: { log: string; type: 'stdout' | 'stderr'; timestamp: string }) => void) => () => void
    
    // File watching
    startFileWatching: (watchPath: string) => Promise<boolean>
    stopFileWatching: () => Promise<boolean>
    isFileWatching: () => Promise<boolean>
    onFileChange: (callback: (data: { event: string; path: string }) => void) => () => void

    // Git operations
    gitStatus: (repoPath: string) => Promise<any>
    gitAdd: (repoPath: string, paths?: string[]) => Promise<any>
    gitCommit: (repoPath: string, options: { message: string; addAll?: boolean }) => Promise<any>
    gitPush: (repoPath: string, options?: { remote?: string; branch?: string }) => Promise<any>
    gitAddCommitPush: (repoPath: string, commitMessage: string) => Promise<any>
    gitLog: (repoPath: string, count?: number) => Promise<any>
  }
}