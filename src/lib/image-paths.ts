export function toFileUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/')
  if (/^file:\/\//i.test(normalized)) return normalized
  return `file:///${normalized.replace(/^\//, '')}`
}

function normalizePathKey(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

/** Resolve a relative path and ensure it stays inside baseDir. */
export function resolveWithinBase(baseDir: string, relative: string): string | null {
  const baseParts = baseDir.replace(/\\/g, '/').split('/').filter((p) => p.length > 0)
  const baseKey = normalizePathKey(baseDir)
  const parts = [...baseParts]

  for (const segment of relative.replace(/\\/g, '/').split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (parts.length <= 1) return null
      parts.pop()
    } else {
      parts.push(segment)
    }
  }

  const resolved = parts.join('/')
  if (!normalizePathKey(resolved).startsWith(baseKey)) return null

  const useWinSep = baseDir.includes('\\')
  return useWinSep ? resolved.replace(/\//g, '\\') : resolved
}

export function sameFilePath(a: string | null, b: string): boolean {
  if (!a) return false
  return normalizePathKey(a) === normalizePathKey(b)
}

export function resolveImageSrcForDisplay(src: string, docPath: string | null): string {
  if (!src || /^(https?:|data:|file:)/i.test(src)) return src
  if (!docPath) return src

  const docDir = docPath.replace(/[/\\][^/\\]+$/, '')
  const absolute = resolveWithinBase(docDir, src.replace(/^\.\//, ''))
  if (!absolute) return src

  return toFileUrl(absolute)
}

/** Convert file:// image URLs under doc dir to relative paths for portable markdown. */
export function normalizeMarkdownImagePaths(markdown: string, docPath: string | null): string {
  if (!docPath) return markdown
  const docDir = docPath.replace(/[/\\][^/\\]+$/, '').replace(/\\/g, '/')

  return markdown.replace(/!\[([^\]]*)\]\((file:\/\/[^)]+)\)/gi, (full, alt, url) => {
    try {
      const pathPart = decodeURIComponent(url.replace(/^file:\/\/*/i, '').replace(/^\//, ''))
      const normalized = pathPart.replace(/\\/g, '/')
      const docNormalized = docDir.replace(/\\/g, '/')
      if (!normalized.toLowerCase().startsWith(docNormalized.toLowerCase())) return full
      const relative = normalized.slice(docNormalized.length).replace(/^\//, '')
      return `![${alt}](${relative})`
    } catch {
      return full
    }
  })
}
