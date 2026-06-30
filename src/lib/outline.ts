import type { OutlineItem } from '../types/api'

export function parseOutline(markdown: string): OutlineItem[] {
  const lines = markdown.split('\n')
  const items: OutlineItem[] = []

  for (let i = 0; i < lines.length; i++) {
    const match = /^(#{1,6})\s+(.+)$/.exec(lines[i].trim())
    if (!match) continue
    items.push({
      level: match[1].length,
      text: match[2].replace(/[*_`[\]()]/g, '').trim(),
      line: i
    })
  }

  return items
}

export function scrollToOutlineItem(
  container: HTMLElement | null,
  item: OutlineItem,
  markdown: string
): void {
  if (!container) return
  const items = parseOutline(markdown)
  const index = items.findIndex((h) => h.line === item.line && h.text === item.text)
  if (index < 0) return

  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
  headings[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
