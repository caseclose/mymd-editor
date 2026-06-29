import { useCallback, useEffect, useRef, useState } from 'react'
import CrepeEditor, { type CrepeEditorHandle } from './components/Editor/CrepeEditor'
import TitleBar from './components/TitleBar/TitleBar'
import StatusBar from './components/StatusBar/StatusBar'
import { buildExportHtml, getDocumentTitle } from './lib/export-html'
import type { Theme } from './types/api'
import './styles/typora-light.css'
import './styles/typora-dark.css'

const DEFAULT_CONTENT = `# 欢迎使用 MyMD

MyMD 是一款 **Typora 风格** 的 Markdown 编辑器。

## 功能

- 所见即所得编辑
- 支持 GFM 语法（表格、任务列表等）
- 导出 PDF
- 亮/暗主题切换

## 快捷键

| 操作 | 快捷键 |
|------|--------|
| 新建 | Ctrl+N |
| 打开 | Ctrl+O |
| 保存 | Ctrl+S |
| 导出 PDF | Ctrl+Shift+E |
| 切换主题 | Ctrl+Shift+T |

> 开始编写你的文档吧！
`

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  const cjk = trimmed.match(/[\u4e00-\u9fff]/g)?.length ?? 0
  const western = trimmed
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
  return cjk + western
}

export default function App(): React.JSX.Element {
  const editorRef = useRef<CrepeEditorHandle>(null)
  const [theme, setTheme] = useState<Theme>('light')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [savedContent, setSavedContent] = useState(DEFAULT_CONTENT)
  const [currentContent, setCurrentContent] = useState(DEFAULT_CONTENT)
  const [isMaximized, setIsMaximized] = useState(false)
  const isDirty = currentContent !== savedContent

  const getTitle = useCallback((): string => {
    if (filePath) return filePath.split(/[/\\]/).pop() ?? '未命名'
    return '未命名'
  }, [filePath])

  const applyTheme = useCallback((next: Theme) => {
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.body.style.backgroundColor = next === 'dark' ? '#1e1e1e' : '#ffffff'
  }, [])

  const handleNew = useCallback(async () => {
    if (isDirty) {
      const choice = window.confirm('文档已修改，是否放弃更改并新建？')
      if (!choice) return
    }
    setFilePath(null)
    setSavedContent('')
    setCurrentContent('')
    await editorRef.current?.setMarkdown('')
  }, [isDirty])

  const handleOpen = useCallback(async () => {
    if (isDirty) {
      const choice = window.confirm('文档已修改，是否放弃更改并打开新文件？')
      if (!choice) return
    }
    const result = await window.api.openFile()
    if (!result) return
    setFilePath(result.path)
    setSavedContent(result.content)
    setCurrentContent(result.content)
    await editorRef.current?.setMarkdown(result.content)
  }, [isDirty])

  const openPath = useCallback(async (path: string) => {
    if (isDirty) {
      const choice = window.confirm('文档已修改，是否放弃更改并打开新文件？')
      if (!choice) return
    }
    const result = await window.api.openFilePath(path)
    if (!result) return
    setFilePath(result.path)
    setSavedContent(result.content)
    setCurrentContent(result.content)
    await editorRef.current?.setMarkdown(result.content)
  }, [isDirty])

  const handleSave = useCallback(async () => {
    const markdown = editorRef.current?.getMarkdown() ?? currentContent
    const result = await window.api.saveFile(filePath, markdown)
    if (result.canceled) return
    if (result.path) {
      setFilePath(result.path)
      setSavedContent(markdown)
      setCurrentContent(markdown)
    }
  }, [filePath, currentContent])

  const handleSaveAs = useCallback(async () => {
    const markdown = editorRef.current?.getMarkdown() ?? currentContent
    const result = await window.api.saveFileAs(markdown, filePath)
    if (result.canceled) return
    if (result.path) {
      setFilePath(result.path)
      setSavedContent(markdown)
      setCurrentContent(markdown)
    }
  }, [filePath, currentContent])

  const handleExportPdf = useCallback(async () => {
    const markdown = editorRef.current?.getMarkdown() ?? currentContent
    const htmlBody = editorRef.current?.getHtml() ?? ''
    const title = getDocumentTitle(filePath, markdown)
    const fullHtml = buildExportHtml(title, htmlBody)
    const defaultName = filePath?.split(/[/\\]/).pop() ?? `${title}.md`
    const result = await window.api.exportPdf(fullHtml, defaultName)
    if (!result.canceled && result.path) {
      // optional: could show toast
    }
  }, [filePath, currentContent])

  const handleCloseRequest = useCallback(async () => {
    if (isDirty) {
      const choice = window.confirm('文档已修改，确定要关闭吗？')
      if (!choice) return
    }
    await window.api.forceCloseWindow()
  }, [isDirty])

  useEffect(() => {
    applyTheme('light')
    void window.api.isMaximized().then(setIsMaximized)

    const unsubMenu = window.api.onMenuAction((action) => {
      switch (action) {
        case 'new':
          void handleNew()
          break
        case 'open':
          void handleOpen()
          break
        case 'save':
          void handleSave()
          break
        case 'save-as':
          void handleSaveAs()
          break
        case 'export-pdf':
          void handleExportPdf()
          break
        case 'toggle-theme':
          applyTheme(theme === 'light' ? 'dark' : 'light')
          break
      }
    })

    const unsubOpen = window.api.onOpenFilePath((path) => {
      void openPath(path)
    })

    const unsubClose = window.api.onWindowCloseRequest(() => {
      void handleCloseRequest()
    })

    return () => {
      unsubMenu()
      unsubOpen()
      unsubClose()
    }
  }, [
    applyTheme,
    theme,
    handleNew,
    handleOpen,
    handleSave,
    handleSaveAs,
    handleExportPdf,
    openPath,
    handleCloseRequest
  ])

  return (
    <div className={`flex h-screen flex-col ${theme === 'dark' ? 'dark bg-[#1e1e1e]' : 'bg-white'}`}>
      <TitleBar
        title={getTitle()}
        isDirty={isDirty}
        isMaximized={isMaximized}
        onMinimize={() => void window.api.minimizeWindow()}
        onMaximize={async () => {
          await window.api.maximizeWindow()
          setIsMaximized(await window.api.isMaximized())
        }}
        onClose={() => void handleCloseRequest()}
      />
      <main className="flex min-h-0 flex-1 flex-col">
        <div className={`mymd-content min-h-0 flex-1 ${theme === 'dark' ? 'dark-content' : ''}`}>
          <CrepeEditor
            ref={editorRef}
            initialContent={DEFAULT_CONTENT}
            theme={theme}
            onChange={setCurrentContent}
          />
        </div>
      </main>
      <StatusBar
        wordCount={countWords(currentContent)}
        charCount={currentContent.length}
        filePath={filePath}
      />
    </div>
  )
}
