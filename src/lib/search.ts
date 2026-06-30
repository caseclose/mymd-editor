export interface TextMatch {
  start: number
  end: number
}

export function findInMarkdown(markdown: string, query: string, caseSensitive = false): number {
  return findMatchesInMarkdown(markdown, query, caseSensitive).length
}

export function findMatchesInMarkdown(
  markdown: string,
  query: string,
  caseSensitive = false
): TextMatch[] {
  if (!query) return []
  const flags = caseSensitive ? 'g' : 'gi'
  const re = new RegExp(escapeRegExp(query), flags)
  const matches: TextMatch[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(markdown)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length })
    if (!flags.includes('g')) break
  }
  return matches
}

export function replaceInMarkdown(
  markdown: string,
  query: string,
  replacement: string,
  caseSensitive = false,
  replaceAll = true,
  atIndex = 0
): string {
  if (!query) return markdown
  if (!replaceAll) {
    const matches = findMatchesInMarkdown(markdown, query, caseSensitive)
    const match = matches[atIndex]
    if (!match) return markdown
    return markdown.slice(0, match.start) + replacement + markdown.slice(match.end)
  }
  const flags = caseSensitive ? 'g' : 'gi'
  return markdown.replace(new RegExp(escapeRegExp(query), flags), replacement)
}

export function wrapMatchIndex(index: number, total: number): number {
  if (total <= 0) return 0
  return ((index % total) + total) % total
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
