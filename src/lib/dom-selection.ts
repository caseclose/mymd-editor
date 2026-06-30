export function selectTextInElement(root: HTMLElement, start: number, length: number): boolean {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let offset = 0
  let node: Node | null

  while ((node = walker.nextNode())) {
    const text = node.textContent ?? ''
    const end = offset + text.length
    if (start < end) {
      const range = document.createRange()
      const localStart = Math.max(0, start - offset)
      const localEnd = Math.min(text.length, localStart + length)
      range.setStart(node, localStart)
      range.setEnd(node, localEnd)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      const el =
        node.parentElement instanceof HTMLElement ? node.parentElement : root
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return true
    }
    offset = end
  }
  return false
}
