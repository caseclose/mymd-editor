import { describe, expect, it } from 'vitest'
import { collectImageSrcMatches, mimeForPath, resolveImagePath } from './image-inline'

describe('resolveImagePath', () => {
  const docPath = 'C:\\docs\\note.md'

  it('resolves file URLs', () => {
    expect(resolveImagePath('file:///C:/docs/assets/a.png', docPath)).toBe('C:\\docs\\assets\\a.png')
  })

  it('resolves relative assets paths', () => {
    expect(resolveImagePath('assets/a.png', docPath)).toBe('C:\\docs\\assets\\a.png')
    expect(resolveImagePath('./assets/a.png', docPath)).toBe('C:\\docs\\assets\\a.png')
  })

  it('ignores remote and data URLs', () => {
    expect(resolveImagePath('https://example.com/a.png', docPath)).toBeNull()
    expect(resolveImagePath('data:image/png;base64,abc', docPath)).toBeNull()
  })

  it('requires docPath for relative sources', () => {
    expect(resolveImagePath('assets/a.png', null)).toBeNull()
  })
})

describe('collectImageSrcMatches', () => {
  it('collects file and relative image sources', () => {
    const html =
      '<img src="file:///C:/docs/a.png" /><img src="assets/b.png" /><img src="https://x.com/c.png" />'
    const matches = collectImageSrcMatches(html, 'C:\\docs\\note.md')
    expect(matches).toHaveLength(3)
    expect(matches[0].filePath).toBe('C:\\docs\\a.png')
    expect(matches[1].filePath).toBe('C:\\docs\\assets\\b.png')
    expect(matches[2].filePath).toBeNull()
  })
})

describe('mimeForPath', () => {
  it('maps common image extensions', () => {
    expect(mimeForPath('C:\\a.png')).toBe('image/png')
    expect(mimeForPath('C:\\a.webp')).toBe('image/webp')
  })
})
