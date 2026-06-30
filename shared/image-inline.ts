import { dirname, isAbsolute, join, normalize } from 'path'
import { fileURLToPath } from 'url'

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp'
}

export interface ImageSrcMatch {
  quote: string
  src: string
  filePath: string | null
}

const SRC_PATTERN = /\bsrc=(["'])([^"']+)\1/gi

function fileUrlToPath(url: string): string | null {
  try {
    return fileURLToPath(url)
  } catch {
    try {
      return fileURLToPath(decodeURIComponent(url))
    } catch {
      return null
    }
  }
}

export function resolveImagePath(src: string, docPath: string | null | undefined): string | null {
  if (/^data:/i.test(src)) return null
  if (/^file:\/\//i.test(src)) return fileUrlToPath(src)
  if (/^https?:\/\//i.test(src)) return null
  if (!docPath) return null

  const docDir = dirname(docPath)
  const relative = src.replace(/^\.\//, '')
  const absolute = isAbsolute(relative) ? normalize(relative) : normalize(join(docDir, relative))
  return absolute
}

export function collectImageSrcMatches(html: string, docPath?: string | null): ImageSrcMatch[] {
  const matches: ImageSrcMatch[] = []
  for (const match of html.matchAll(SRC_PATTERN)) {
    const quote = match[1]
    const src = match[2]
    matches.push({
      quote,
      src,
      filePath: resolveImagePath(src, docPath ?? null)
    })
  }
  return matches
}

export function mimeForPath(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
  return MIME_BY_EXT[ext] ?? 'application/octet-stream'
}
