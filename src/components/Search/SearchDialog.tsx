import { useEffect, useRef, useState } from 'react'
import {
  findMatchesInMarkdown,
  replaceInMarkdown,
  wrapMatchIndex
} from '../../lib/search'
import type { EditorView } from '../../types/api'

export type SearchMode = 'find' | 'replace'

interface SearchDialogProps {
  mode: SearchMode
  theme: 'light' | 'dark'
  editorView: EditorView
  /** Markdown source used for replace and source-mode find. */
  markdown: string
  /** Rendered plain text for WYSIWYG find (visible text only). */
  findText?: string
  onClose: () => void
  onApply: (nextMarkdown: string, options?: { syncCrepe?: boolean }) => void
  onNavigate: (matchIndex: number, query: string, caseSensitive: boolean) => void
}

export default function SearchDialog({
  mode,
  theme,
  editorView,
  markdown,
  findText,
  onClose,
  onApply,
  onNavigate
}: SearchDialogProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [matchIndex, setMatchIndex] = useState(0)
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate

  const useRenderedFind = mode === 'find' && editorView === 'wysiwyg'
  const textForFind = useRenderedFind && findText !== undefined ? findText : markdown
  const matches = findMatchesInMarkdown(textForFind, query, caseSensitive)
  const matchCount = matches.length

  useEffect(() => {
    setMatchIndex(0)
  }, [query, caseSensitive])

  useEffect(() => {
    setMatchIndex((i) => (matchCount > 0 ? wrapMatchIndex(i, matchCount) : 0))
  }, [textForFind, matchCount])

  useEffect(() => {
    if (!query || matchCount === 0) return
    onNavigateRef.current(wrapMatchIndex(matchIndex, matchCount), query, caseSensitive)
  }, [matchIndex, matchCount, query, caseSensitive])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Enter' && event.shiftKey && matchCount > 0) {
        event.preventDefault()
        setMatchIndex((i) => wrapMatchIndex(i - 1, matchCount))
      }
      if (event.key === 'Enter' && !event.shiftKey && matchCount > 0 && mode === 'find') {
        event.preventDefault()
        setMatchIndex((i) => wrapMatchIndex(i + 1, matchCount))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, matchCount, mode])

  const handleReplace = (): void => {
    if (!query) return
    const next = replaceInMarkdown(
      markdown,
      query,
      replacement,
      caseSensitive,
      false,
      wrapMatchIndex(matchIndex, matchCount)
    )
    onApply(next, { syncCrepe: true })
  }

  const handleReplaceAll = (): void => {
    if (!query) return
    const next = replaceInMarkdown(markdown, query, replacement, caseSensitive, true)
    onApply(next, { syncCrepe: true })
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
        {useRenderedFind ? (
          <p className="mb-2 text-xs text-gray-500">在文档可见文本中查找（不含 Markdown 语法）</p>
        ) : mode === 'replace' ? (
          <p className="mb-2 text-xs text-gray-500">在 Markdown 源码中查找并替换</p>
        ) : null}
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
          <span>
            {query
              ? matchCount > 0
                ? `${wrapMatchIndex(matchIndex, matchCount) + 1} / ${matchCount}`
                : '无匹配'
              : '输入关键词'}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={!query || matchCount === 0}
              className="rounded border px-2 py-1 disabled:opacity-40"
              onClick={() => setMatchIndex((i) => wrapMatchIndex(i - 1, matchCount))}
            >
              上一个
            </button>
            <button
              type="button"
              disabled={!query || matchCount === 0}
              className="rounded border px-2 py-1 disabled:opacity-40"
              onClick={() => setMatchIndex((i) => wrapMatchIndex(i + 1, matchCount))}
            >
              下一个
            </button>
            {mode === 'replace' && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
