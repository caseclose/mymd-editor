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
  warning?: string
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
  editorZoomPercent: number
}

export type UnsavedDialogResult = 'save' | 'discard' | 'cancel'

export interface UnsavedDialogOptions {
  dirtyCount?: number
  tabTitles?: string[]
}

export interface RecoveryTabSnapshot {
  id: string
  filePath: string | null
  content: string
  savedContent: string
  editorView: EditorView
}

export interface RecoverySnapshot {
  tabs: RecoveryTabSnapshot[]
  activeTabId: string
  savedAt: string
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
  exportPdf: (html: string, defaultName?: string, docPath?: string | null) => Promise<SaveResult>
  exportHtml: (html: string, defaultName?: string, docPath?: string | null) => Promise<SaveResult>
  exportImage: (html: string, defaultName?: string, docPath?: string | null) => Promise<SaveResult>
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
  showUnsavedDialog: (options?: UnsavedDialogOptions) => Promise<UnsavedDialogResult>
  saveRecovery: (snapshot: RecoverySnapshot) => Promise<void>
  loadRecovery: () => Promise<RecoverySnapshot | null>
  clearRecovery: () => Promise<void>
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
