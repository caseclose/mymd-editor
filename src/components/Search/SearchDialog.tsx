import { useEffect, useState } from 'react'
import { findInMarkdown, replaceInMarkdown } from '../../lib/search'

export type SearchMode = 'find' | 'replace'

interface SearchDialogProps {
  mode: SearchMode
  theme: 'light' | 'dark'
  markdown: string
  onClose: () => void
  onApply: (nextMarkdown: string) => void
}

export default function SearchDialog({
  mode,
  theme,
  markdown,
  onClose,
  onApply
}: SearchDialogProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [matchCount, setMatchCount] = useState(0)

  useEffect(() => {
    setMatchCount(findInMarkdown(markdown, query, caseSensitive))
  }, [markdown, query, caseSensitive])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleReplace = (): void => {
    if (!query) return
    const next = replaceInMarkdown(markdown, query, replacement, caseSensitive, false)
    onApply(next)
    onClose()
  }

  const handleReplaceAll = (): void => {
    if (!query) return
    const next = replaceInMarkdown(markdown, query, replacement, caseSensitive, true)
    onApply(next)
    onClose()
  }

  return (
    <div className="absolute right-4 top-2 z-50 w-80 rounded-lg border shadow-lg">
      <div
        className={`rounded-lg p-3 ${
          theme === 'dark' ? 'border-gray-600 bg-[#2d2d2d] text-gray-100' : 'border-gray-200 bg-white text-gray-800'
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">{mode === 'find' ? '查找' : '替换'}</span>
          <button type="button" className="text-gray-400 hover:text-gray-600" onClick={onClose}>
            ✕
          </button>
        </div>
        <input
          autoFocus
          className="mb-2 w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-[#1e1e1e]"
          placeholder="查找内容"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {mode === 'replace' && (
          <input
            className="mb-2 w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-[#1e1e1e]"
            placeholder="替换为"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
          />
        )}
        <label className="mb-2 flex items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          区分大小写
        </label>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{query ? `${matchCount} 处匹配` : '输入关键词'}</span>
          {mode === 'replace' && (
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
                onClick={handleReplace}
              >
                替换
              </button>
              <button
                type="button"
                className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
                onClick={handleReplaceAll}
              >
                全部
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
