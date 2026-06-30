import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { collectImageSrcMatches, mimeForPath } from '../../shared/image-inline'

export async function inlineLocalImages(html: string, docPath?: string | null): Promise<string> {
  const matches = collectImageSrcMatches(html, docPath)
  const toInline = matches.filter((m) => m.filePath && existsSync(m.filePath))
  if (toInline.length === 0) return html

  let result = html
  for (const { quote, src, filePath } of toInline) {
    if (!filePath) continue
    try {
      const buf = await readFile(filePath)
      const dataUrl = `data:${mimeForPath(filePath)};base64,${buf.toString('base64')}`
      result = result.replace(`${quote}${src}${quote}`, `${quote}${dataUrl}${quote}`)
    } catch {
      // keep original src if file is missing
    }
  }
  return result
}
