import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export type MenuAction =
  | 'new'
  | 'open'
  | 'open-folder'
  | 'save'
  | 'save-as'
  | 'export-pdf'
  | 'export-html'
  | 'export-html-plain'
  | 'export-image'
  | 'export-docx'
  | 'export-epub'
  | 'toggle-theme'
  | 'toggle-sidebar'
  | 'toggle-outline'
  | 'toggle-focus'
  | 'toggle-typewriter'
  | 'toggle-source'
  | 'import-theme'
  | 'clear-theme'
  | 'autosave-on'
  | 'autosave-off'
  | 'find'
  | 'replace'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-reset'
  | 'new-tab'
  | 'close-tab'
  | 'close-window'
  | 'reopen-tab'

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
  editorView: 'wysiwyg' | 'source'
}

export interface RecoverySnapshot {
  tabs: RecoveryTabSnapshot[]
  activeTabId: string
  savedAt: string
}

const api = {
  openFile: (): Promise<FileOpenResult | null> => ipcRenderer.invoke('file:open'),
  openFilePath: (filePath: string): Promise<FileOpenResult | null> =>
    ipcRenderer.invoke('file:open-path', filePath),
  openFolder: (): Promise<FolderOpenResult | null> => ipcRenderer.invoke('folder:open'),
  listFolder: (folderPath: string): Promise<FolderOpenResult | null> =>
    ipcRenderer.invoke('folder:list', folderPath),
  saveFile: (path: string | null, content: string): Promise<SaveResult> =>
    ipcRenderer.invoke('file:save', path, content),
  saveFileAs: (content: string, currentPath?: string | null): Promise<SaveResult> =>
    ipcRenderer.invoke('file:save-as', content, currentPath),
  exportPdf: (html: string, defaultName?: string, docPath?: string | null): Promise<SaveResult> =>
    ipcRenderer.invoke('export:pdf', html, defaultName, docPath),
  exportHtml: (html: string, defaultName?: string, docPath?: string | null): Promise<SaveResult> =>
    ipcRenderer.invoke('export:html', html, defaultName, docPath),
  exportImage: (html: string, defaultName?: string, docPath?: string | null): Promise<SaveResult> =>
    ipcRenderer.invoke('export:image', html, defaultName, docPath),
  exportPandoc: (
    markdown: string,
    target: 'docx' | 'epub' | 'latex',
    defaultName?: string
  ): Promise<SaveResult> => ipcRenderer.invoke('export:pandoc', markdown, target, defaultName),
  saveImageBuffer: (
    docPath: string,
    data: ArrayBuffer,
    fileName: string
  ): Promise<ImageSaveResult | null> => ipcRenderer.invoke('image:save-buffer', docPath, data, fileName),
  saveImagePath: (docPath: string, sourcePath: string): Promise<ImageSaveResult | null> =>
    ipcRenderer.invoke('image:save-path', docPath, sourcePath),
  getPreferences: (): Promise<AppPreferences> => ipcRenderer.invoke('prefs:get'),
  setPreferences: (partial: Partial<AppPreferences>): Promise<AppPreferences> =>
    ipcRenderer.invoke('prefs:set', partial),
  importTheme: (): Promise<AppPreferences | null> => ipcRenderer.invoke('theme:import'),
  clearTheme: (): Promise<AppPreferences> => ipcRenderer.invoke('theme:clear'),
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),
  forceCloseWindow: (): Promise<void> => ipcRenderer.invoke('window:force-close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
  showUnsavedDialog: (options?: UnsavedDialogOptions): Promise<UnsavedDialogResult> =>
    ipcRenderer.invoke('dialog:unsaved', options),
  saveRecovery: (snapshot: RecoverySnapshot): Promise<void> =>
    ipcRenderer.invoke('recovery:save', snapshot),
  loadRecovery: (): Promise<RecoverySnapshot | null> => ipcRenderer.invoke('recovery:load'),
  clearRecovery: (): Promise<void> => ipcRenderer.invoke('recovery:clear'),
  getPlatform: (): NodeJS.Platform => process.platform,
  onMenuAction: (callback: (action: MenuAction) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: MenuAction): void => callback(action)
    ipcRenderer.on('menu-action', handler)
    return () => ipcRenderer.removeListener('menu-action', handler)
  },
  onOpenFilePath: (callback: (filePath: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string): void => callback(filePath)
    ipcRenderer.on('open-file-path', handler)
    return () => ipcRenderer.removeListener('open-file-path', handler)
  },
  onWindowCloseRequest: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('window-close-request', handler)
    return () => ipcRenderer.removeListener('window-close-request', handler)
  },
  onFolderChanged: (callback: (folderPath: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, folderPath: string): void => callback(folderPath)
    ipcRenderer.on('folder-changed', handler)
    return () => ipcRenderer.removeListener('folder-changed', handler)
  },
  onFolderOpened: (callback: (result: FolderOpenResult) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: FolderOpenResult): void => callback(result)
    ipcRenderer.on('folder-opened', handler)
    return () => ipcRenderer.removeListener('folder-opened', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error fallback
  window.electron = electronAPI
  // @ts-expect-error fallback
  window.api = api
}
