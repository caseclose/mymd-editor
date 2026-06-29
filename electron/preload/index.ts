import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export type MenuAction = 'new' | 'open' | 'save' | 'save-as' | 'export-pdf' | 'toggle-theme'

export interface FileOpenResult {
  path: string
  content: string
}

export interface SaveResult {
  path?: string
  canceled: boolean
}

const api = {
  openFile: (): Promise<FileOpenResult | null> => ipcRenderer.invoke('file:open'),
  openFilePath: (filePath: string): Promise<FileOpenResult | null> =>
    ipcRenderer.invoke('file:open-path', filePath),
  saveFile: (path: string | null, content: string): Promise<SaveResult> =>
    ipcRenderer.invoke('file:save', path, content),
  saveFileAs: (content: string, currentPath?: string | null): Promise<SaveResult> =>
    ipcRenderer.invoke('file:save-as', content, currentPath),
  exportPdf: (html: string, defaultName?: string): Promise<SaveResult> =>
    ipcRenderer.invoke('export:pdf', html, defaultName),
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
