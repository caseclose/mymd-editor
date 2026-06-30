import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { Crepe } from '@milkdown/crepe'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/nord.css'
import type { Theme } from '../../types/api'
import { renderMermaidDiagrams } from '../../lib/mermaid-render'

export interface CrepeEditorHandle {
  getMarkdown: () => string
  getHtml: () => string
  setMarkdown: (content: string) => Promise<void>
  focus: () => void
  getContainer: () => HTMLElement | null
}

interface CrepeEditorProps {
  initialContent: string
  theme: Theme
  filePath: string | null
  focusMode: boolean
  typewriterMode: boolean
  customThemeCss: string | null
  hidden?: boolean
  onChange: (markdown: string) => void
}

function toImageUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/')
  return `file:///${normalized}`
}

const CrepeEditor = forwardRef<CrepeEditorHandle, CrepeEditorProps>(
  ({ initialContent, theme, filePath, focusMode, typewriterMode, customThemeCss, hidden, onChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const crepeRef = useRef<Crepe | null>(null)
    const filePathRef = useRef(filePath)
    const themeRef = useRef(theme)
    const onChangeRef = useRef(onChange)
    filePathRef.current = filePath
    themeRef.current = theme
    onChangeRef.current = onChange

    const uploadImage = useCallback(async (file: File): Promise<string> => {
      const docPath = filePathRef.current
      if (!docPath) {
        window.alert('请先保存文档，再插入图片。')
        throw new Error('Document not saved')
      }
      const buffer = await file.arrayBuffer()
      const result = await window.api.saveImageBuffer(docPath, buffer, file.name)
      if (!result) throw new Error('Failed to save image')
      return toImageUrl(result.absolutePath)
    }, [])

    const initCrepe = async (content: string): Promise<void> => {
      if (!containerRef.current) return
      const crepe = new Crepe({
        root: containerRef.current,
        defaultValue: content,
        features: {
          [Crepe.Feature.Latex]: true,
          [Crepe.Feature.Toolbar]: true,
          [Crepe.Feature.CodeMirror]: true,
          [Crepe.Feature.Table]: true,
          [Crepe.Feature.ImageBlock]: true
        },
        featureConfigs: {
          [Crepe.Feature.Placeholder]: {
            text: '开始编写 Markdown...',
            mode: 'block'
          },
          [Crepe.Feature.ImageBlock]: {
            onUpload: uploadImage,
            blockOnUpload: uploadImage,
            inlineOnUpload: uploadImage,
            proxyDomURL: (url) => url
          }
        }
      })
      crepeRef.current = crepe
      await crepe.create()
      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          onChangeRef.current(markdown)
          void renderMermaidDiagrams(containerRef.current!, themeRef.current)
        })
      })
      await renderMermaidDiagrams(containerRef.current, themeRef.current)
    }

    useImperativeHandle(ref, () => ({
      getMarkdown: () => crepeRef.current?.getMarkdown() ?? '',
      getHtml: () =>
        containerRef.current?.querySelector('.milkdown')?.innerHTML ??
        containerRef.current?.innerHTML ??
        '',
      setMarkdown: async (content: string) => {
        if (crepeRef.current) {
          await crepeRef.current.destroy()
          crepeRef.current = null
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
          await initCrepe(content)
        }
      },
      focus: () => {
        containerRef.current?.querySelector('[contenteditable="true"]')?.dispatchEvent(new FocusEvent('focus'))
      },
      getContainer: () => containerRef.current
    }))

    useEffect(() => {
      const setup = async (): Promise<void> => {
        await initCrepe(initialContent)
      }
      void setup()
      return () => {
        void crepeRef.current?.destroy()
        crepeRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      if (containerRef.current) {
        void renderMermaidDiagrams(containerRef.current, theme)
      }
    }, [theme])

    useEffect(() => {
      const id = 'mymd-custom-theme-style'
      let el = document.getElementById(id) as HTMLStyleElement | null
      if (!customThemeCss) {
        el?.remove()
        return
      }
      if (!el) {
        el = document.createElement('style')
        el.id = id
        document.head.appendChild(el)
      }
      el.textContent = customThemeCss
    }, [customThemeCss])

    useEffect(() => {
      if (!focusMode || !containerRef.current) return
      const root = containerRef.current
      const updateFocus = (): void => {
        const pm = root.querySelector('.ProseMirror')
        if (!pm) return
        pm.querySelectorAll('.mymd-focus-active').forEach((el) => el.classList.remove('mymd-focus-active'))
        const sel = window.getSelection()
        if (!sel?.anchorNode) return
        let node: Node | null = sel.anchorNode
        while (node && node !== pm) {
          if (node instanceof HTMLElement && node.parentElement === pm) {
            node.classList.add('mymd-focus-active')
            break
          }
          node = node.parentNode
        }
      }
      root.addEventListener('keyup', updateFocus)
      root.addEventListener('mouseup', updateFocus)
      return () => {
        root.removeEventListener('keyup', updateFocus)
        root.removeEventListener('mouseup', updateFocus)
        root.querySelectorAll('.mymd-focus-active').forEach((el) => el.classList.remove('mymd-focus-active'))
      }
    }, [focusMode])

    const modeClasses = [
      theme === 'dark' ? 'dark crepe-dark' : '',
      focusMode ? 'mymd-focus-mode' : '',
      typewriterMode ? 'mymd-typewriter-mode' : ''
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        ref={containerRef}
        className={`crepe-editor h-full w-full overflow-y-auto ${modeClasses} ${hidden ? 'hidden' : ''}`}
      />
    )
  }
)

CrepeEditor.displayName = 'CrepeEditor'

export default CrepeEditor
