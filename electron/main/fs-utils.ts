import { readdir, mkdir, writeFile, copyFile } from 'fs/promises'
import { join, dirname, extname, basename } from 'path'
import { existsSync } from 'fs'
import { randomUUID } from 'crypto'

export interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileTreeNode[]
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'])

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name, 'zh-CN')
  })
}

export async function readFolderTree(dirPath: string): Promise<FileTreeNode[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const nodes: FileTreeNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      const children = await readFolderTree(fullPath)
      if (children.length > 0) {
        nodes.push({ name: entry.name, path: fullPath, isDirectory: true, children })
      }
    } else if (/\.(md|markdown|txt)$/i.test(entry.name)) {
      nodes.push({ name: entry.name, path: fullPath, isDirectory: false })
    }
  }

  return sortNodes(nodes)
}

export async function saveImageAsset(
  docPath: string,
  data: ArrayBuffer,
  originalName: string
): Promise<{ absolutePath: string; relativePath: string }> {
  const docDir = dirname(docPath)
  const assetsDir = join(docDir, 'assets')
  await mkdir(assetsDir, { recursive: true })

  const ext = extname(originalName) || '.png'
  const safeName = `${basename(originalName, ext).replace(/[^\w\u4e00-\u9fff-]/g, '_') || 'image'}-${randomUUID().slice(0, 8)}${ext}`
  const absolutePath = join(assetsDir, safeName)

  await writeFile(absolutePath, Buffer.from(data))
  return { absolutePath, relativePath: `assets/${safeName}` }
}

export async function saveImageFromPath(
  docPath: string,
  sourcePath: string
): Promise<{ absolutePath: string; relativePath: string }> {
  const docDir = dirname(docPath)
  const assetsDir = join(docDir, 'assets')
  await mkdir(assetsDir, { recursive: true })

  const ext = extname(sourcePath) || '.png'
  const safeName = `${basename(sourcePath, ext).replace(/[^\w\u4e00-\u9fff-]/g, '_') || 'image'}-${randomUUID().slice(0, 8)}${ext}`
  const absolutePath = join(assetsDir, safeName)

  await copyFile(sourcePath, absolutePath)
  return { absolutePath, relativePath: `assets/${safeName}` }
}

export function isImageFile(filePath: string): boolean {
  return IMAGE_EXTS.has(extname(filePath).toLowerCase())
}

export function toFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  if (normalized.startsWith('file://')) return normalized
  return `file:///${normalized}`
}

export function resolveDocRelativePath(docPath: string, relativePath: string): string {
  if (/^(https?:|file:)/i.test(relativePath)) return relativePath
  const absolute = join(dirname(docPath), relativePath.replace(/^\.\//, ''))
  return existsSync(absolute) ? toFileUrl(absolute) : relativePath
}
