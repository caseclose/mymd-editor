import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export type MenuAction =
  | 'new'
  | 'open'
  | 'open-folder'
  | 'save'
  | 'save-as'
  | 'export-pdf'
  | 'toggle-theme'
  | 'toggle-sidebar'
  | 'toggle-outline'
  | 'find'
  | 'replace'

export interface FileOpenResult {
  path: string
  content: string
}

export interface SaveResult {
  path?: string
  canceled: boolean
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
  exportPdf: (html: string, defaultName?: string): Promise<SaveResult> =>
    ipcRenderer.invoke('export:pdf', html, defaultName),
  saveImageBuffer: (
    docPath: string,
    data: ArrayBuffer,
    fileName: string
  ): Promise<ImageSaveResult | null> => ipcRenderer.invoke('image:save-buffer', docPath, data, fileName),
  saveImagePath: (docPath: string, sourcePath: string): Promise<ImageSaveResult | null> =>
    ipcRenderer.invoke('image:save-path', docPath, sourcePath),
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),
  forceCloseWindow: (): Promise<void> => ipcRenderer.invoke('window:force-close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
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
