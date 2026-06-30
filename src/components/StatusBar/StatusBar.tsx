interface StatusBarProps {
  wordCount: number
  charCount: number
  filePath: string | null
  editorView: 'wysiwyg' | 'source'
  focusMode: boolean
  typewriterMode: boolean
  autoSave: boolean
}

export default function StatusBar({
  wordCount,
  charCount,
  filePath,
  editorView,
  focusMode,
  typewriterMode,
  autoSave
}: StatusBarProps): React.JSX.Element {
  const fileName = filePath ? filePath.split(/[/\\]/).pop() : '未命名'
  const modes = [
    editorView === 'source' ? '源码' : null,
    focusMode ? '专注' : null,
    typewriterMode ? '打字机' : null,
    autoSave ? '自动保存' : null
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-gray-200 bg-shell-light px-4 text-xs text-gray-500 dark:border-gray-700 dark:bg-shell-dark dark:text-gray-400">
      <span className="truncate">
        {fileName}
        {modes ? ` · ${modes}` : ''}
      </span>
      <span>
        {wordCount} 词 · {charCount} 字符
      </span>
    </div>
  )
}
