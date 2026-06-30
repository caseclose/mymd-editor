import chokidar, { type FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'

let watcher: FSWatcher | null = null

export function watchFolder(folderPath: string, win: BrowserWindow): void {
  stopWatching()
  watcher = chokidar.watch(folderPath, {
    ignored: /(^|[/\\])\../,
    ignoreInitial: true,
    depth: 10
  })

  const notify = (): void => {
    win.webContents.send('folder-changed', folderPath)
  }

  watcher.on('add', notify)
  watcher.on('unlink', notify)
  watcher.on('addDir', notify)
  watcher.on('unlinkDir', notify)
}

export function stopWatching(): void {
  void watcher?.close()
  watcher = null
}
