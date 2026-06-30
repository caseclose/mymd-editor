import mermaid from 'mermaid'

let initialized = false

function clearMermaidArtifacts(root: HTMLElement): void {
  root.querySelectorAll('.mermaid-diagram.mymd-mermaid').forEach((el) => el.remove())
  root.querySelectorAll<HTMLElement>('[data-mermaid-rendered="true"]').forEach((el) => {
    delete el.dataset.mermaidRendered
  })
}

export async function renderMermaidDiagrams(
  root: HTMLElement | null | undefined,
  theme: 'light' | 'dark',
  reset = false
): Promise<void> {
  if (!root) return

  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'dark' ? 'dark' : 'default',
    securityLevel: 'strict'
  })

  if (!initialized) {
    initialized = true
  }

  if (reset) {
    clearMermaidArtifacts(root)
  }

  const candidates = root.querySelectorAll<HTMLElement>(
    'pre code.language-mermaid, pre[data-language="mermaid"] code, .milkdown-code-block[data-language="mermaid"] code'
  )

  for (let i = 0; i < candidates.length; i++) {
    const codeEl = candidates[i]
    const pre = codeEl.closest('pre') ?? codeEl.parentElement
    if (!pre || pre.dataset.mermaidRendered === 'true') continue

    const source = codeEl.textContent?.trim()
    if (!source) continue

    pre.dataset.mermaidRendered = 'true'
    const id = `mmd-${Date.now()}-${i}`
    try {
      const { svg } = await mermaid.render(id, source)
      const wrapper = document.createElement('div')
      wrapper.className = 'mermaid-diagram mymd-mermaid'
      wrapper.innerHTML = svg
      pre.replaceWith(wrapper)
    } catch {
      delete pre.dataset.mermaidRendered
    }
  }
}
