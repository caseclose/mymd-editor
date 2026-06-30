import { describe, expect, it } from 'vitest'
import {
  clampEditorZoom,
  editorZoomFactor,
  stepEditorZoom,
  EDITOR_ZOOM_DEFAULT,
  EDITOR_ZOOM_MAX,
  EDITOR_ZOOM_MIN
} from './editor-zoom'
import { findInMarkdown, findMatchesInMarkdown, replaceInMarkdown, wrapMatchIndex } from './search'
import { parseOutline, normalizeHeadingText } from './outline'
import {
  normalizeMarkdownImagePaths,
  resolveImageSrcForDisplay,
  resolveWithinBase,
  sameFilePath,
  toFileUrl
} from './image-paths'

describe('editor-zoom', () => {
  it('clamps and rounds to step', () => {
    expect(clampEditorZoom(95)).toBe(100)
    expect(clampEditorZoom(44)).toBe(50)
    expect(clampEditorZoom(305)).toBe(EDITOR_ZOOM_MAX)
    expect(clampEditorZoom(40)).toBe(EDITOR_ZOOM_MIN)
  })

  it('steps zoom level', () => {
    expect(stepEditorZoom(100, 10)).toBe(110)
    expect(stepEditorZoom(100, -10)).toBe(90)
  })

  it('converts percent to factor', () => {
    expect(editorZoomFactor(120)).toBe(1.2)
    expect(editorZoomFactor(EDITOR_ZOOM_DEFAULT)).toBe(1)
  })
})

describe('search', () => {
  const markdown = 'Hello world\nHello again'

  it('counts matches case-insensitively by default', () => {
    expect(findInMarkdown(markdown, 'hello')).toBe(2)
    expect(findInMarkdown(markdown, 'Hello', true)).toBe(2)
    expect(findInMarkdown(markdown, 'HELLO', true)).toBe(0)
  })

  it('replaces first or all occurrences', () => {
    expect(replaceInMarkdown(markdown, 'Hello', 'Hi', false, false)).toBe('Hi world\nHello again')
    expect(replaceInMarkdown(markdown, 'Hello', 'Hi', false, true)).toBe('Hi world\nHi again')
  })

  it('finds match positions and replaces at index', () => {
    const matches = findMatchesInMarkdown(markdown, 'Hello')
    expect(matches).toHaveLength(2)
    expect(matches[0]).toEqual({ start: 0, end: 5 })
    expect(replaceInMarkdown(markdown, 'Hello', 'Hi', false, false, 1)).toBe('Hello world\nHi again')
  })

  it('wraps match index', () => {
    expect(wrapMatchIndex(-1, 3)).toBe(2)
    expect(wrapMatchIndex(3, 3)).toBe(0)
  })
})

describe('parseOutline', () => {
  it('extracts heading levels and strips inline markers', () => {
    const items = parseOutline('# Title\n## **Section** _one_\nplain')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ level: 1, text: 'Title', line: 0 })
    expect(items[1]).toMatchObject({ level: 2, text: 'Section one', line: 1 })
  })

  it('normalizes heading text', () => {
    expect(normalizeHeadingText('**Bold** _italic_')).toBe('Bold italic')
  })
})

describe('image-paths', () => {
  it('builds file URLs on Windows paths', () => {
    expect(toFileUrl('C:\\docs\\img.png')).toBe('file:///C:/docs/img.png')
  })

  it('resolves relative image paths against doc path', () => {
    const src = resolveImageSrcForDisplay('assets/pic.png', 'C:\\docs\\note.md')
    expect(src).toBe('file:///C:/docs/assets/pic.png')
  })

  it('normalizes file URLs in markdown to relative paths', () => {
    const md = '![alt](file:///C:/docs/assets/pic.png)'
    const out = normalizeMarkdownImagePaths(md, 'C:\\docs\\note.md')
    expect(out).toBe('![alt](assets/pic.png)')
  })

  it('rejects path traversal in image src', () => {
    expect(resolveWithinBase('C:\\docs', '..\\..\\windows\\system.ini')).toBeNull()
    expect(resolveImageSrcForDisplay('../../etc/passwd', 'C:\\docs\\note.md')).toBe(
      '../../etc/passwd'
    )
  })

  it('compares file paths case-insensitively', () => {
    expect(sameFilePath('C:\\Docs\\a.md', 'c:/docs/a.md')).toBe(true)
    expect(sameFilePath('C:\\Docs\\a.md', 'C:\\docs\\b.md')).toBe(false)
  })
})
