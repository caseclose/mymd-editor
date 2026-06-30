import { forwardRef, useImperativeHandle, useRef } from 'react'

export interface SourceEditorHandle {
  scrollToRange: (start: number, end: number) => void
}

interface SourceEditorProps {
  value: string
  theme: 'light' | 'dark'
  onChange: (value: string) => void
}

const SourceEditor = forwardRef<SourceEditorHandle, SourceEditorProps>(
  ({ value, theme, onChange }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(ref, () => ({
      scrollToRange: (start: number, end: number) => {
        const el = textareaRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(start, end)
        const lineHeight = parseInt(getComputedStyle(el).lineHeight, 10) || 20
        const before = value.slice(0, start)
        const line = before.split('\n').length - 1
        el.scrollTop = Math.max(0, line * lineHeight - el.clientHeight / 2)
      }
    }))

    return (
      <textarea
        ref={textareaRef}
        className={`mymd-source-editor h-full w-full resize-none border-0 p-6 font-mono text-[0.875em] leading-relaxed outline-none ${
          theme === 'dark' ? 'bg-[#1e1e1e] text-gray-200' : 'bg-white text-gray-800'
        }`}
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Markdown 源码..."
      />
    )
  }
)

SourceEditor.displayName = 'SourceEditor'

export default SourceEditor
