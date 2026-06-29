import type { MenuAction } from '../../electron/preload/index'

export type Theme = 'light' | 'dark'

export interface FileOpenResult {
  path: string
  content: string
}

export interface SaveResult {
  path?: string
  canceled: boolean
}

export interface MyMDApi {
  openFile: () => Promise<FileOpenResult | null>
  openFilePath: (filePath: string) => Promise<FileOpenResult | null>
  saveFile: (path: string | null, content: string) => Promise<SaveResult>
  saveFileAs: (content: string, currentPath?: string | null) => Promise<SaveResult>
  exportPdf: (html: string, defaultName?: string) => Promise<SaveResult>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  forceCloseWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>
  getPlatform: () => NodeJS.Platform
  onMenuAction: (callback: (action: MenuAction) => void) => () => void
  onOpenFilePath: (callback: (filePath: string) => void) => () => void
  onWindowCloseRequest: (callback: () => void) => () => void
}

declare global {
  interface Window {
    api: MyMDApi
  }
}

export {}
