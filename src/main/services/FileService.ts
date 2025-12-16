import { promises as fs } from 'fs'
import { dirname } from 'path'

export class FileService {
  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8')
    } catch {
      throw new Error(`Failed to read file: ${filePath}`)
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, content, 'utf-8')
    } catch {
      throw new Error(`Failed to write file: ${filePath}`)
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch {
      throw new Error(`Failed to delete file: ${filePath}`)
    }
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    try {
      return await fs.readdir(dirPath)
    } catch {
      throw new Error(`Failed to read directory: ${dirPath}`)
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch {
      throw new Error(`Failed to create directory: ${dirPath}`)
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path)
      return true
    } catch {
      return false
    }
  }

  async getFileStats(filePath: string): Promise<{ isDirectory: boolean; mtime: string } | null> {
    try {
      const stats = await fs.stat(filePath)
      return {
        isDirectory: stats.isDirectory(),
        mtime: stats.mtime.toISOString()
      }
    } catch {
      return null
    }
  }
}