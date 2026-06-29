import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { Crepe } from '@milkdown/crepe'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/nord.css'
import type { Theme } from '../../types/api'

export interface CrepeEditorHandle {
  getMarkdown: () => string
  getHtml: () => string
  setMarkdown: (content: string) => Promise<void>
  focus: () => void
}

interface CrepeEditorProps {
  initialContent: string
  theme: Theme
  onChange: (markdown: string) => void
}

const CrepeEditor = forwardRef<CrepeEditorHandle, CrepeEditorProps>(
  ({ initialContent, theme, onChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const crepeRef = useRef<Crepe | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    useImperativeHandle(ref, () => ({
      getMarkdown: () => crepeRef.current?.getMarkdown() ?? '',
      getHtml: () => containerRef.current?.querySelector('.milkdown')?.innerHTML ?? containerRef.current?.innerHTML ?? '',
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
      }
    }))

    const initCrepe = async (content: string): Promise<void> => {
      if (!containerRef.current) return
      const crepe = new Crepe({
        root: containerRef.current,
        defaultValue: content,
        features: {
          [Crepe.Feature.Latex]: false,
          [Crepe.Feature.Toolbar]: true
        },
        featureConfigs: {
          [Crepe.Feature.Placeholder]: {
            text: '开始编写 Markdown...',
            mode: 'block'
          }
        }
      })
      crepeRef.current = crepe
      await crepe.create()
      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          onChangeRef.current(markdown)
        })
      })
    }

    useEffect(() => {
      const setup = async (): Promise<void> => {
        await initCrepe(initialContent)
      }
      void setup()
      return () => {
        void crepeRef.current?.destroy()
        crepeRef.current = null
      }
      // only mount once; content updates via setMarkdown
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
      <div
        ref={containerRef}
        className={`crepe-editor h-full w-full overflow-y-auto ${theme === 'dark' ? 'dark crepe-dark' : ''}`}
      />
    )
  }
)

CrepeEditor.displayName = 'CrepeEditor'

export default CrepeEditor
