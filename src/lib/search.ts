export function findInMarkdown(markdown: string, query: string, caseSensitive = false): number {
  if (!query) return 0
  const flags = caseSensitive ? 'g' : 'gi'
  const matches = markdown.match(new RegExp(escapeRegExp(query), flags))
  return matches?.length ?? 0
}

export function replaceInMarkdown(
  markdown: string,
  query: string,
  replacement: string,
  caseSensitive = false,
  replaceAll = true
): string {
  if (!query) return markdown
  const flags = replaceAll ? (caseSensitive ? 'g' : 'gi') : caseSensitive ? '' : 'i'
  return markdown.replace(new RegExp(escapeRegExp(query), flags), replacement)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
