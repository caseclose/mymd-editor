import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { readFile, writeFile, stat } from 'fs/promises'
import { exportHtmlToPdf, exportHtmlFile, exportHtmlToImage, exportWithPandoc, showPandocNotFoundDialog } from './export'
import { loadPreferences, savePreferences } from './preferences'
import {
  readFolderTree,
  saveImageAsset,
  saveImageFromPath,
  isImageFile,
  type FileTreeNode
} from './fs-utils'
import { watchFolder, stopWatching } from './folder-watcher'

let mainWindow: BrowserWindow | null = null
let pendingOpenPath: string | null = null
let pendingOpenFolder: string | null = null

function getArgvPath(): string | null {
  const args = process.argv.slice(app.isPackaged ? 1 : 2)
  const fileArg = args.find((arg) => !arg.startsWith('-') && arg.length > 0)
  if (!fileArg) return null
  return fileArg.replace(/[/\\]+$/, '')
}

function sendMenuAction(action: string): void {
  mainWindow?.webContents.send('menu-action', action)
}

function buildMenu(autoSaveChecked = true): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '新建', accelerator: 'CmdOrCtrl+N', click: () => sendMenuAction('new') },
        { label: '打开...', accelerator: 'CmdOrCtrl+O', click: () => sendMenuAction('open') },
        { label: '打开文件夹...', accelerator: 'CmdOrCtrl+Shift+O', click: () => sendMenuAction('open-folder') },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => sendMenuAction('save') },
        { label: '另存为...', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendMenuAction('save-as') },
        { type: 'separator' },
        {
          label: '导出',
          submenu: [
            { label: 'PDF...', accelerator: 'CmdOrCtrl+Shift+E', click: () => sendMenuAction('export-pdf') },
            { label: 'HTML...', click: () => sendMenuAction('export-html') },
            { label: 'HTML（无样式）...', click: () => sendMenuAction('export-html-plain') },
            { label: '图片 PNG...', click: () => sendMenuAction('export-image') },
            { type: 'separator' },
            { label: 'Word (.docx)...', click: () => sendMenuAction('export-docx') },
            { label: 'EPUB...', click: () => sendMenuAction('export-epub') }
          ]
        },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
        { type: 'separator' },
        { label: '查找', accelerator: 'CmdOrCtrl+F', click: () => sendMenuAction('find') },
        { label: '替换', accelerator: 'CmdOrCtrl+H', click: () => sendMenuAction('replace') }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '切换主题', accelerator: 'CmdOrCtrl+Shift+T', click: () => sendMenuAction('toggle-theme') },
        { type: 'separator' },
        { label: '切换侧边栏', accelerator: 'CmdOrCtrl+\\', click: () => sendMenuAction('toggle-sidebar') },
        { label: '切换大纲', accelerator: 'CmdOrCtrl+Shift+L', click: () => sendMenuAction('toggle-outline') },
        { type: 'separator' },
        { label: '专注模式', accelerator: 'F8', click: () => sendMenuAction('toggle-focus') },
        { label: '打字机模式', accelerator: 'F9', click: () => sendMenuAction('toggle-typewriter') },
        { label: '源码模式', accelerator: 'CmdOrCtrl+/', click: () => sendMenuAction('toggle-source') },
        { type: 'separator' },
        { label: '导入自定义主题...', click: () => sendMenuAction('import-theme') },
        { label: '清除自定义主题', click: () => sendMenuAction('clear-theme') },
        { type: 'separator' },
        { label: '自动保存', type: 'checkbox', checked: autoSaveChecked, click: (item) => sendMenuAction(item.checked ? 'autosave-on' : 'autosave-off') },
        { type: 'separator' },
        { role: 'reload', label: '重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: 'MyMD 关于',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: '关于 MyMD',
              message: 'MyMD',
              detail: `Typora 风格的 Markdown 编辑器\n版本 ${app.getVersion()}`
            })
          }
        }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function resolvePathArg(pathArg: string): Promise<{ filePath: string | null; folderPath: string | null }> {
  const normalized = pathArg.replace(/[/\\]+$/, '')
  try {
    const info = await stat(normalized)
    if (info.isDirectory()) return { filePath: null, folderPath: normalized }
    return { filePath: normalized, folderPath: null }
  } catch {
    return { filePath: null, folderPath: null }
  }
}

async function openFolderInWindow(folderPath: string): Promise<void> {
  const tree = await readFolderTree(folderPath)
  mainWindow?.webContents.send('folder-opened', { folderPath, tree })
  if (mainWindow) watchFolder(folderPath, mainWindow)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (pendingOpenPath) {
      mainWindow?.webContents.send('open-file-path', pendingOpenPath)
      pendingOpenPath = null
    }
    if (pendingOpenFolder) {
      void (async () => {
        const tree = await readFolderTree(pendingOpenFolder!)
        mainWindow?.webContents.send('folder-opened', { folderPath: pendingOpenFolder, tree })
        if (mainWindow) watchFolder(pendingOpenFolder!, mainWindow)
        pendingOpenFolder = null
      })()
    }
  })

  mainWindow.on('close', (event) => {
    mainWindow?.webContents.send('window-close-request')
    event.preventDefault()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const pathArg = argv.slice(app.isPackaged ? 1 : 2).find((arg) => !arg.startsWith('-'))
    void (async () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
      if (!pathArg) return

      const { filePath, folderPath } = await resolvePathArg(pathArg)
      if (folderPath) {
        if (mainWindow) await openFolderInWindow(folderPath)
        else pendingOpenFolder = folderPath
      } else if (filePath) {
        if (mainWindow) mainWindow.webContents.send('open-file-path', filePath)
        else pendingOpenPath = filePath
      }
    })()
  })

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.mymd.editor')
    app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

    const prefs = await loadPreferences()
    buildMenu(prefs.autoSave)

    const argvPath = getArgvPath()
    if (argvPath) {
      const resolved = await resolvePathArg(argvPath)
      pendingOpenPath = resolved.filePath
      pendingOpenFolder = resolved.folderPath
    }

    createWindow()

    ipcMain.handle('file:open', async () => {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openFile'],
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }]
      })
      if (result.canceled || !result.filePaths[0]) return null
      const filePath = result.filePaths[0]
      const content = await readFile(filePath, 'utf-8')
      return { path: filePath, content }
    })

    ipcMain.handle('file:open-path', async (_event, filePath: string) => {
      try {
        const info = await stat(filePath)
        if (info.isDirectory()) return null
        const content = await readFile(filePath, 'utf-8')
        return { path: filePath, content }
      } catch {
        return null
      }
    })

    ipcMain.handle('folder:open', async () => {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory']
      })
      if (result.canceled || !result.filePaths[0]) return null
      const folderPath = result.filePaths[0].replace(/[/\\]+$/, '')
      const tree = await readFolderTree(folderPath)
      if (mainWindow) watchFolder(folderPath, mainWindow)
      return { folderPath, tree }
    })

    ipcMain.handle('folder:list', async (_event, folderPath: string) => {
      try {
        const tree = await readFolderTree(folderPath)
        return { folderPath, tree } as { folderPath: string; tree: FileTreeNode[] }
      } catch {
        return null
      }
    })

    ipcMain.handle('image:save-buffer', async (_event, docPath: string, data: ArrayBuffer, fileName: string) => {
      if (!docPath) return null
      return saveImageAsset(docPath, data, fileName)
    })

    ipcMain.handle('image:save-path', async (_event, docPath: string, sourcePath: string) => {
      if (!docPath || !isImageFile(sourcePath)) return null
      return saveImageFromPath(docPath, sourcePath)
    })

    ipcMain.handle('file:save', async (_event, filePath: string | null, content: string) => {
      let targetPath = filePath
      if (!targetPath) {
        const result = await dialog.showSaveDialog(mainWindow!, {
          filters: [{ name: 'Markdown', extensions: ['md'] }],
          defaultPath: 'untitled.md'
        })
        if (result.canceled || !result.filePath) return { canceled: true as const }
        targetPath = result.filePath.endsWith('.md') ? result.filePath : `${result.filePath}.md`
      }
      try {
        await writeFile(targetPath, content, 'utf-8')
        return { path: targetPath, canceled: false as const }
      } catch (err) {
        const message = err instanceof Error ? err.message : '保存失败'
        return { canceled: false as const, error: message }
      }
    })

    ipcMain.handle('file:save-as', async (_event, content: string, currentPath?: string | null) => {
      const result = await dialog.showSaveDialog(mainWindow!, {
        filters: [{ name: 'Markdown', extensions: ['md'] }],
        defaultPath: currentPath || 'untitled.md'
      })
      if (result.canceled || !result.filePath) return { canceled: true as const }
      const targetPath = result.filePath.endsWith('.md') ? result.filePath : `${result.filePath}.md`
      try {
        await writeFile(targetPath, content, 'utf-8')
        return { path: targetPath, canceled: false as const }
      } catch (err) {
        const message = err instanceof Error ? err.message : '保存失败'
        return { canceled: false as const, error: message }
      }
    })

    ipcMain.handle('export:pdf', async (_event, html: string, defaultName?: string, docPath?: string | null) => {
      const result = await dialog.showSaveDialog(mainWindow!, {
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: defaultName?.replace(/\.md$/i, '.pdf') || 'document.pdf'
      })
      if (result.canceled || !result.filePath) return { canceled: true as const }
      const filePath = result.filePath.endsWith('.pdf') ? result.filePath : `${result.filePath}.pdf`
      try {
        await exportHtmlToPdf(html, filePath, docPath)
        return { path: filePath, canceled: false as const }
      } catch (err) {
        const message = err instanceof Error ? err.message : '导出 PDF 失败'
        return { canceled: false as const, error: message }
      }
    })

    ipcMain.handle('export:html', async (_event, html: string, defaultName?: string, docPath?: string | null) => {
      const result = await dialog.showSaveDialog(mainWindow!, {
        filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
        defaultPath: defaultName?.replace(/\.md$/i, '.html') || 'document.html'
      })
      if (result.canceled || !result.filePath) return { canceled: true as const }
      const filePath =
        /\.html?$/i.test(result.filePath) ? result.filePath : `${result.filePath}.html`
      try {
        await exportHtmlFile(html, filePath, docPath)
        return { path: filePath, canceled: false as const }
      } catch (err) {
        const message = err instanceof Error ? err.message : '导出 HTML 失败'
        return { canceled: false as const, error: message }
      }
    })

    ipcMain.handle('export:image', async (_event, html: string, defaultName?: string, docPath?: string | null) => {
      const result = await dialog.showSaveDialog(mainWindow!, {
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
        defaultPath: defaultName?.replace(/\.md$/i, '.png') || 'document.png'
      })
      if (result.canceled || !result.filePath) return { canceled: true as const }
      const filePath = result.filePath.endsWith('.png') ? result.filePath : `${result.filePath}.png`
      try {
        await exportHtmlToImage(html, filePath, docPath)
        return { path: filePath, canceled: false as const }
      } catch (err) {
        const message = err instanceof Error ? err.message : '导出图片失败'
        return { canceled: false as const, error: message }
      }
    })

    ipcMain.handle('export:pandoc', async (_event, markdown: string, target: 'docx' | 'epub' | 'latex', defaultName?: string) => {
      const extMap = { docx: 'docx', epub: 'epub', latex: 'tex' } as const
      const ext = extMap[target]
      const result = await dialog.showSaveDialog(mainWindow!, {
        filters: [{ name: target.toUpperCase(), extensions: [ext] }],
        defaultPath: defaultName?.replace(/\.md$/i, `.${ext}`) || `document.${ext}`
      })
      if (result.canceled || !result.filePath) return { canceled: true as const }
      try {
        await exportWithPandoc(markdown, result.filePath, target)
        return { path: result.filePath, canceled: false as const }
      } catch (err) {
        if (err instanceof Error && err.message === 'PANDOC_NOT_FOUND') {
          if (mainWindow) await showPandocNotFoundDialog(mainWindow)
          return { canceled: true as const, error: 'PANDOC_NOT_FOUND' }
        }
        const message = err instanceof Error ? err.message : '导出失败'
        return { canceled: false as const, error: message }
      }
    })

    ipcMain.handle('prefs:get', async () => loadPreferences())
    ipcMain.handle('prefs:set', async (_event, partial) => {
      const next = await savePreferences(partial)
      if (partial.autoSave !== undefined) buildMenu(next.autoSave)
      return next
    })

    ipcMain.handle('theme:import', async () => {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openFile'],
        filters: [{ name: 'CSS Theme', extensions: ['css'] }]
      })
      if (result.canceled || !result.filePaths[0]) return null
      const cssPath = result.filePaths[0]
      const css = await readFile(cssPath, 'utf-8')
      const name = cssPath.split(/[/\\]/).pop() ?? 'custom.css'
      const prefs = await savePreferences({ customThemeCss: css, customThemeName: name })
      return prefs
    })

    ipcMain.handle('theme:clear', async () => {
      return savePreferences({ customThemeCss: null, customThemeName: null })
    })

    ipcMain.handle('window:minimize', () => mainWindow?.minimize())
    ipcMain.handle('window:maximize', () => {
      if (mainWindow?.isMaximized()) mainWindow.unmaximize()
      else mainWindow?.maximize()
    })
    ipcMain.handle('window:close', () => mainWindow?.close())
    ipcMain.handle('window:force-close', () => {
      stopWatching()
      mainWindow?.removeAllListeners('close')
      mainWindow?.close()
    })
    ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
