import { describe, expect, it } from 'vitest'
import { findInMarkdown, replaceInMarkdown } from './search'
import { parseOutline } from './outline'

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
})

describe('parseOutline', () => {
  it('extracts heading levels and strips inline markers', () => {
    const items = parseOutline('# Title\n## **Section** _one_\nplain')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ level: 1, text: 'Title', line: 0 })
    expect(items[1]).toMatchObject({ level: 2, text: 'Section one', line: 1 })
  })
})
