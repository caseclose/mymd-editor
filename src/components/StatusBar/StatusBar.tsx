interface StatusBarProps {
  wordCount: number
  charCount: number
  filePath: string | null
  editorView: 'wysiwyg' | 'source'
  focusMode: boolean
  typewriterMode: boolean
  autoSave: boolean
  editorZoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

export default function StatusBar({
  wordCount,
  charCount,
  filePath,
  editorView,
  focusMode,
  typewriterMode,
  autoSave,
  editorZoom,
  onZoomIn,
  onZoomOut,
  onZoomReset
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
      <span className="min-w-0 truncate">
        {fileName}
        {modes ? ` · ${modes}` : ''}
      </span>
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={onZoomOut}
            aria-label="缩小"
            title="缩小 (Ctrl+-)"
          >
            −
          </button>
          <button
            type="button"
            className="min-w-[2.75rem] rounded px-1 hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={onZoomReset}
            aria-label="重置缩放"
            title="重置缩放 (Ctrl+0)"
          >
            {editorZoom}%
          </button>
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={onZoomIn}
            aria-label="放大"
            title="放大 (Ctrl+=)"
          >
            +
          </button>
        </div>
        <span>
          {wordCount} 词 · {charCount} 字符
        </span>
      </div>
    </div>
  )
}
