import type { MenuAction } from '../../electron/preload/index'

export type Theme = 'light' | 'dark'
export type EditorView = 'wysiwyg' | 'source'

export interface FileOpenResult {
  path: string
  content: string
}

export interface SaveResult {
  path?: string
  canceled: boolean
  error?: string
}

export interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileTreeNode[]
}

export interface FolderOpenResult {
  folderPath: string
  tree: FileTreeNode[]
}

export interface ImageSaveResult {
  absolutePath: string
  relativePath: string
}

export interface AppPreferences {
  autoSave: boolean
  autoSaveIntervalMs: number
  customThemeCss: string | null
  customThemeName: string | null
}

export interface OutlineItem {
  level: number
  text: string
  line: number
}

export interface MyMDApi {
  openFile: () => Promise<FileOpenResult | null>
  openFilePath: (filePath: string) => Promise<FileOpenResult | null>
  openFolder: () => Promise<FolderOpenResult | null>
  listFolder: (folderPath: string) => Promise<FolderOpenResult | null>
  saveFile: (path: string | null, content: string) => Promise<SaveResult>
  saveFileAs: (content: string, currentPath?: string | null) => Promise<SaveResult>
  exportPdf: (html: string, defaultName?: string) => Promise<SaveResult>
  exportHtml: (html: string, defaultName?: string) => Promise<SaveResult>
  exportImage: (html: string, defaultName?: string) => Promise<SaveResult>
  exportPandoc: (
    markdown: string,
    target: 'docx' | 'epub' | 'latex',
    defaultName?: string
  ) => Promise<SaveResult>
  saveImageBuffer: (
    docPath: string,
    data: ArrayBuffer,
    fileName: string
  ) => Promise<ImageSaveResult | null>
  saveImagePath: (docPath: string, sourcePath: string) => Promise<ImageSaveResult | null>
  getPreferences: () => Promise<AppPreferences>
  setPreferences: (partial: Partial<AppPreferences>) => Promise<AppPreferences>
  importTheme: () => Promise<AppPreferences | null>
  clearTheme: () => Promise<AppPreferences>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  forceCloseWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>
  getPlatform: () => NodeJS.Platform
  onMenuAction: (callback: (action: MenuAction) => void) => () => void
  onOpenFilePath: (callback: (filePath: string) => void) => () => void
  onWindowCloseRequest: (callback: () => void) => () => void
  onFolderChanged: (callback: (folderPath: string) => void) => () => void
  onFolderOpened: (callback: (result: FolderOpenResult) => void) => () => void
}

declare global {
  interface Window {
    api: MyMDApi
  }
}

export {}
