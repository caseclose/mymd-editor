import { existsSync } from 'fs'
import { join } from 'path'
import { app, nativeImage, type BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'

function iconCandidates(): string[] {
  const names =
    process.platform === 'win32'
      ? ['icon.ico', 'icon.png']
      : process.platform === 'darwin'
        ? ['icon.icns', 'icon.png']
        : ['icon.png', 'icon.ico', 'icon.icns']

  const bases = is.dev
    ? [join(__dirname, '../../resources')]
    : [
        join(process.resourcesPath, 'app.asar.unpacked/resources'),
        join(process.resourcesPath, 'resources'),
        join(__dirname, '../../resources')
      ]

  const paths: string[] = []
  for (const base of bases) {
    for (const name of names) {
      paths.push(join(base, name))
    }
  }
  return paths
}

export function getAppIconPath(): string | undefined {
  return iconCandidates().find((path) => existsSync(path))
}

export function getAppIconImage(): Electron.NativeImage | undefined {
  const iconPath = getAppIconPath()
  if (!iconPath) return undefined
  const image = nativeImage.createFromPath(iconPath)
  return image.isEmpty() ? undefined : image
}

export function applyAppIcon(window?: BrowserWindow | null): void {
  const image = getAppIconImage()
  if (!image) return
  if (process.platform === 'darwin') app.dock?.setIcon(image)
  window?.setIcon(image)
}
