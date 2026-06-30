import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CrepeEditor, { type CrepeEditorHandle } from './components/Editor/CrepeEditor'
import TitleBar from './components/TitleBar/TitleBar'
import StatusBar from './components/StatusBar/StatusBar'
import FileSidebar from './components/Sidebar/FileSidebar'
import OutlinePanel from './components/Outline/OutlinePanel'
import SearchDialog, { type SearchMode } from './components/Search/SearchDialog'
import { buildExportHtml, getDocumentTitle } from './lib/export-html'
import { parseOutline, scrollToOutlineItem } from './lib/outline'
import type { FileTreeNode, Theme } from './types/api'
import './styles/typora-light.css'
import './styles/typora-dark.css'

const DEFAULT_CONTENT = `# 欢迎使用 MyMD

MyMD 是一款 **Typora 风格** 的 Markdown 编辑器。

## 功能

- 所见即所得编辑
- 数学公式与 Mermaid 图表
- 文件树与大纲面板
- 查找替换
- 导出 PDF

### 数学公式

行内公式 $E=mc^2$，块级公式：

$$
\\int_0^1 x^2 dx = \\frac{1}{3}
$$

### Mermaid 图表示例

\`\`\`mermaid
graph TD
  A[开始] --> B{判断}
  B -->|是| C[继续]
  B -->|否| D[结束]
\`\`\`

## 快捷键

| 操作 | 快捷键 |
|------|--------|
| 打开文件夹 | Ctrl+Shift+O |
| 查找 | Ctrl+F |
| 替换 | Ctrl+H |
| 切换侧边栏 | Ctrl+\\\\ |
| 切换大纲 | Ctrl+Shift+L |

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
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [savedContent, setSavedContent] = useState(DEFAULT_CONTENT)
  const [currentContent, setCurrentContent] = useState(DEFAULT_CONTENT)
  const [isMaximized, setIsMaximized] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showOutline, setShowOutline] = useState(true)
  const [searchMode, setSearchMode] = useState<SearchMode | null>(null)
  const isDirty = currentContent !== savedContent

  const outlineItems = useMemo(() => parseOutline(currentContent), [currentContent])

  const getTitle = useCallback((): string => {
    if (filePath) return filePath.split(/[/\\]/).pop() ?? '未命名'
    return '未命名'
  }, [filePath])

  const applyTheme = useCallback((next: Theme) => {
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.body.style.backgroundColor = next === 'dark' ? '#1e1e1e' : '#ffffff'
  }, [])

  const refreshFolder = useCallback(async (path: string) => {
    const result = await window.api.listFolder(path)
    if (result) {
      setFolderPath(result.folderPath)
      setFileTree(result.tree)
    }
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

  const loadFile = useCallback(async (path: string, content: string) => {
    setFilePath(path)
    setSavedContent(content)
    setCurrentContent(content)
    await editorRef.current?.setMarkdown(content)
  }, [])

  const handleOpen = useCallback(async () => {
    if (isDirty) {
      const choice = window.confirm('文档已修改，是否放弃更改并打开新文件？')
      if (!choice) return
    }
    const result = await window.api.openFile()
    if (!result) return
    await loadFile(result.path, result.content)
  }, [isDirty, loadFile])

  const openPath = useCallback(
    async (path: string) => {
      if (isDirty) {
        const choice = window.confirm('文档已修改，是否放弃更改并打开新文件？')
        if (!choice) return
      }
      const result = await window.api.openFilePath(path)
      if (!result) return
      await loadFile(result.path, result.content)
    },
    [isDirty, loadFile]
  )

  const handleOpenFolder = useCallback(async () => {
    const result = await window.api.openFolder()
    if (!result) return
    setFolderPath(result.folderPath)
    setFileTree(result.tree)
    setShowSidebar(true)
  }, [])

  const handleSave = useCallback(async () => {
    const markdown = editorRef.current?.getMarkdown() ?? currentContent
    const result = await window.api.saveFile(filePath, markdown)
    if (result.canceled) return
    if (result.path) {
      setFilePath(result.path)
      setSavedContent(markdown)
      setCurrentContent(markdown)
      if (folderPath) void refreshFolder(folderPath)
    }
  }, [filePath, currentContent, folderPath, refreshFolder])

  const handleSaveAs = useCallback(async () => {
    const markdown = editorRef.current?.getMarkdown() ?? currentContent
    const result = await window.api.saveFileAs(markdown, filePath)
    if (result.canceled) return
    if (result.path) {
      setFilePath(result.path)
      setSavedContent(markdown)
      setCurrentContent(markdown)
      if (folderPath) void refreshFolder(folderPath)
    }
  }, [filePath, currentContent, folderPath, refreshFolder])

  const handleExportPdf = useCallback(async () => {
    const markdown = editorRef.current?.getMarkdown() ?? currentContent
    const htmlBody = editorRef.current?.getHtml() ?? ''
    const title = getDocumentTitle(filePath, markdown)
    const fullHtml = buildExportHtml(title, htmlBody)
    const defaultName = filePath?.split(/[/\\]/).pop() ?? `${title}.md`
    await window.api.exportPdf(fullHtml, defaultName)
  }, [filePath, currentContent])

  const handleCloseRequest = useCallback(async () => {
    if (isDirty) {
      const choice = window.confirm('文档已修改，确定要关闭吗？')
      if (!choice) return
    }
    await window.api.forceCloseWindow()
  }, [isDirty])

  const handleSearchApply = useCallback(async (nextMarkdown: string) => {
    setCurrentContent(nextMarkdown)
    await editorRef.current?.setMarkdown(nextMarkdown)
  }, [])

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
        case 'open-folder':
          void handleOpenFolder()
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
        case 'toggle-sidebar':
          setShowSidebar((v) => !v)
          break
        case 'toggle-outline':
          setShowOutline((v) => !v)
          break
        case 'find':
          setSearchMode('find')
          break
        case 'replace':
          setSearchMode('replace')
          break
      }
    })

    const unsubOpen = window.api.onOpenFilePath((path) => {
      void openPath(path)
    })

    const unsubClose = window.api.onWindowCloseRequest(() => {
      void handleCloseRequest()
    })

    const unsubFolder = window.api.onFolderChanged((path) => {
      void refreshFolder(path)
    })

    const unsubFolderOpened = window.api.onFolderOpened((result) => {
      setFolderPath(result.folderPath)
      setFileTree(result.tree)
      setShowSidebar(true)
    })

    return () => {
      unsubMenu()
      unsubOpen()
      unsubClose()
      unsubFolder()
      unsubFolderOpened()
    }
  }, [
    applyTheme,
    theme,
    handleNew,
    handleOpen,
    handleOpenFolder,
    handleSave,
    handleSaveAs,
    handleExportPdf,
    openPath,
    handleCloseRequest,
    refreshFolder
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
      <main className="relative flex min-h-0 flex-1">
        {showSidebar && (
          <FileSidebar
            folderPath={folderPath}
            tree={fileTree}
            activeFilePath={filePath}
            theme={theme}
            onOpenFile={(path) => void openPath(path)}
          />
        )}
        <div className={`mymd-content relative min-h-0 min-w-0 flex-1 ${theme === 'dark' ? 'dark-content' : ''}`}>
          {searchMode && (
            <SearchDialog
              mode={searchMode}
              theme={theme}
              markdown={currentContent}
              onClose={() => setSearchMode(null)}
              onApply={(next) => void handleSearchApply(next)}
            />
          )}
          <CrepeEditor
            ref={editorRef}
            initialContent={DEFAULT_CONTENT}
            theme={theme}
            filePath={filePath}
            onChange={setCurrentContent}
          />
        </div>
        {showOutline && (
          <OutlinePanel
            items={outlineItems}
            theme={theme}
            onSelect={(item) =>
              scrollToOutlineItem(editorRef.current?.getContainer() ?? null, item, currentContent)
            }
          />
        )}
      </main>
      <StatusBar
        wordCount={countWords(currentContent)}
        charCount={currentContent.length}
        filePath={filePath}
      />
    </div>
  )
}
