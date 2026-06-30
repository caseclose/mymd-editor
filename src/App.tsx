import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CrepeEditor, { type CrepeEditorHandle } from './components/Editor/CrepeEditor'
import SourceEditor from './components/Editor/SourceEditor'
import TitleBar from './components/TitleBar/TitleBar'
import StatusBar from './components/StatusBar/StatusBar'
import FileSidebar from './components/Sidebar/FileSidebar'
import OutlinePanel from './components/Outline/OutlinePanel'
import SearchDialog, { type SearchMode } from './components/Search/SearchDialog'
import { buildExportHtml, getDocumentTitle } from './lib/export-html'
import { parseOutline, scrollToOutlineItem } from './lib/outline'
import type { AppPreferences, EditorView, FileTreeNode, Theme } from './types/api'
import './styles/typora-light.css'
import './styles/typora-dark.css'

const DEFAULT_CONTENT = `# 欢迎使用 MyMD

MyMD 是一款 **Typora 风格** 的 Markdown 编辑器。

## 阶段三功能

- 专注模式（F8）与打字机模式（F9）
- 源码模式（Ctrl+/）
- 导出 HTML / 图片 / Word（Pandoc）
- 自定义 CSS 主题
- 自动保存

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
  const [editorView, setEditorView] = useState<EditorView>('wysiwyg')
  const [focusMode, setFocusMode] = useState(false)
  const [typewriterMode, setTypewriterMode] = useState(false)
  const [prefs, setPrefs] = useState<AppPreferences>({
    autoSave: true,
    autoSaveIntervalMs: 30000,
    customThemeCss: null,
    customThemeName: null
  })

  const isDirty = currentContent !== savedContent
  const outlineItems = useMemo(() => parseOutline(currentContent), [currentContent])

  const getMarkdown = useCallback(
    () => (editorView === 'source' ? currentContent : (editorRef.current?.getMarkdown() ?? currentContent)),
    [editorView, currentContent]
  )

  const getTitle = useCallback((): string => {
    if (filePath) return filePath.split(/[/\\]/).pop() ?? '未命名'
    return '未命名'
  }, [filePath])

  const applyTheme = useCallback((next: Theme) => {
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.body.style.backgroundColor = next === 'dark' ? '#1e1e1e' : '#ffffff'
  }, [])

  const buildExportPayload = useCallback(
    (styled: boolean) => {
      const markdown = getMarkdown()
      const htmlBody = editorRef.current?.getHtml() ?? ''
      const title = getDocumentTitle(filePath, markdown)
      return {
        markdown,
        html: buildExportHtml(title, htmlBody, {
          styled,
          extraCss: prefs.customThemeCss,
          dark: false
        }),
        defaultName: filePath?.split(/[/\\]/).pop() ?? `${title}.md`
      }
    },
    [filePath, getMarkdown, prefs.customThemeCss]
  )

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
    setEditorView('wysiwyg')
    await editorRef.current?.setMarkdown('')
  }, [isDirty])

  const loadFile = useCallback(async (path: string, content: string) => {
    setFilePath(path)
    setSavedContent(content)
    setCurrentContent(content)
    setEditorView('wysiwyg')
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
    const markdown = getMarkdown()
    const result = await window.api.saveFile(filePath, markdown)
    if (result.canceled) return
    if (result.path) {
      setFilePath(result.path)
      setSavedContent(markdown)
      setCurrentContent(markdown)
      if (editorView === 'wysiwyg') await editorRef.current?.setMarkdown(markdown)
      if (folderPath) void refreshFolder(folderPath)
    }
  }, [filePath, getMarkdown, folderPath, refreshFolder, editorView])

  const handleSaveAs = useCallback(async () => {
    const markdown = getMarkdown()
    const result = await window.api.saveFileAs(markdown, filePath)
    if (result.canceled) return
    if (result.path) {
      setFilePath(result.path)
      setSavedContent(markdown)
      setCurrentContent(markdown)
      if (editorView === 'wysiwyg') await editorRef.current?.setMarkdown(markdown)
      if (folderPath) void refreshFolder(folderPath)
    }
  }, [filePath, getMarkdown, folderPath, refreshFolder, editorView])

  const handleExportPdf = useCallback(async () => {
    const { html, defaultName } = buildExportPayload(true)
    await window.api.exportPdf(html, defaultName)
  }, [buildExportPayload])

  const handleExportHtml = useCallback(
    async (styled: boolean) => {
      const { html, defaultName } = buildExportPayload(styled)
      await window.api.exportHtml(html, defaultName)
    },
    [buildExportPayload]
  )

  const handleExportImage = useCallback(async () => {
    const { html, defaultName } = buildExportPayload(true)
    await window.api.exportImage(html, defaultName)
  }, [buildExportPayload])

  const handleExportDocx = useCallback(async () => {
    const { markdown, defaultName } = buildExportPayload(true)
    await window.api.exportPandoc(markdown, 'docx', defaultName)
  }, [buildExportPayload])

  const handleExportEpub = useCallback(async () => {
    const { markdown, defaultName } = buildExportPayload(true)
    await window.api.exportPandoc(markdown, 'epub', defaultName)
  }, [buildExportPayload])

  const handleToggleSource = useCallback(async () => {
    if (editorView === 'wysiwyg') {
      const md = editorRef.current?.getMarkdown() ?? currentContent
      setCurrentContent(md)
      setEditorView('source')
    } else {
      setEditorView('wysiwyg')
      await editorRef.current?.setMarkdown(currentContent)
    }
  }, [editorView, currentContent])

  const handleImportTheme = useCallback(async () => {
    const result = await window.api.importTheme()
    if (result) setPrefs(result)
  }, [])

  const handleClearTheme = useCallback(async () => {
    const result = await window.api.clearTheme()
    setPrefs(result)
  }, [])

  const handleCloseRequest = useCallback(async () => {
    if (isDirty) {
      const choice = window.confirm('文档已修改，确定要关闭吗？')
      if (!choice) return
    }
    await window.api.forceCloseWindow()
  }, [isDirty])

  const handleSearchApply = useCallback(async (nextMarkdown: string) => {
    setCurrentContent(nextMarkdown)
    if (editorView === 'wysiwyg') await editorRef.current?.setMarkdown(nextMarkdown)
  }, [editorView])

  useEffect(() => {
    applyTheme('light')
    void window.api.isMaximized().then(setIsMaximized)
    void window.api.getPreferences().then(setPrefs)
  }, [applyTheme])

  useEffect(() => {
    if (!prefs.autoSave || !filePath || !isDirty) return
    const timer = window.setInterval(() => {
      void handleSave()
    }, prefs.autoSaveIntervalMs)
    return () => window.clearInterval(timer)
  }, [prefs.autoSave, prefs.autoSaveIntervalMs, filePath, isDirty, handleSave])

  useEffect(() => {
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
        case 'export-html':
          void handleExportHtml(true)
          break
        case 'export-html-plain':
          void handleExportHtml(false)
          break
        case 'export-image':
          void handleExportImage()
          break
        case 'export-docx':
          void handleExportDocx()
          break
        case 'export-epub':
          void handleExportEpub()
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
        case 'toggle-focus':
          setFocusMode((v) => !v)
          break
        case 'toggle-typewriter':
          setTypewriterMode((v) => !v)
          break
        case 'toggle-source':
          void handleToggleSource()
          break
        case 'import-theme':
          void handleImportTheme()
          break
        case 'clear-theme':
          void handleClearTheme()
          break
        case 'autosave-on':
          void window.api.setPreferences({ autoSave: true }).then(setPrefs)
          break
        case 'autosave-off':
          void window.api.setPreferences({ autoSave: false }).then(setPrefs)
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
    handleExportHtml,
    handleExportImage,
    handleExportDocx,
    handleExportEpub,
    handleToggleSource,
    handleImportTheme,
    handleClearTheme,
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
            focusMode={focusMode}
            typewriterMode={typewriterMode}
            customThemeCss={prefs.customThemeCss}
            hidden={editorView === 'source'}
            onChange={setCurrentContent}
          />
          {editorView === 'source' && (
            <SourceEditor value={currentContent} theme={theme} onChange={setCurrentContent} />
          )}
        </div>
        {showOutline && editorView === 'wysiwyg' && (
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
        editorView={editorView}
        focusMode={focusMode}
        typewriterMode={typewriterMode}
        autoSave={prefs.autoSave}
      />
    </div>
  )
}
