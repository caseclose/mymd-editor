interface SourceEditorProps {
  value: string
  theme: 'light' | 'dark'
  onChange: (value: string) => void
}

export default function SourceEditor({ value, theme, onChange }: SourceEditorProps): React.JSX.Element {
  return (
    <textarea
      className={`mymd-source-editor h-full w-full resize-none border-0 p-6 font-mono text-sm leading-relaxed outline-none ${
        theme === 'dark' ? 'bg-[#1e1e1e] text-gray-200' : 'bg-white text-gray-800'
      }`}
      value={value}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Markdown 源码..."
    />
  )
}
