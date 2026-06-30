import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CrepeEditor, { type CrepeEditorHandle } from './components/Editor/CrepeEditor'
import SourceEditor, { type SourceEditorHandle } from './components/Editor/SourceEditor'
import TitleBar from './components/TitleBar/TitleBar'
import StatusBar from './components/StatusBar/StatusBar'
import FileSidebar from './components/Sidebar/FileSidebar'
import OutlinePanel from './components/Outline/OutlinePanel'
import SearchDialog, { type SearchMode } from './components/Search/SearchDialog'
import TabBar from './components/TabBar/TabBar'
import { buildExportHtml, getDocumentTitle } from './lib/export-html'
import { normalizeMarkdownImagePaths, sameFilePath } from './lib/image-paths'
import { parseOutline, scrollToOutlineItem } from './lib/outline'
import { findMatchesInMarkdown } from './lib/search'
import { notifyError, formatErrorMessage } from './lib/errors'
import { hasApi } from './lib/runtime'
import {
  EDITOR_ZOOM_DEFAULT,
  EDITOR_ZOOM_STEP,
  clampEditorZoom,
  editorZoomFactor,
  stepEditorZoom
} from './lib/editor-zoom'
import { createTab, tabIsDirty, tabTitle, type ClosedTabSnapshot, type EditorTab } from './types/tab'
import type { AppPreferences, FileTreeNode, RecoverySnapshot, Theme, UnsavedDialogOptions } from './types/api'
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
  const sourceRef = useRef<SourceEditorHandle>(null)
  const tabsRef = useRef<EditorTab[]>([])
  const activeTabIdRef = useRef('')
  const getMarkdownRef = useRef(() => '')
  const closedTabsRef = useRef<ClosedTabSnapshot[]>([])
  const MAX_CLOSED_TABS = 20

  const initialTab = useMemo(
    () => createTab({ content: DEFAULT_CONTENT, savedContent: DEFAULT_CONTENT }),
    []
  )
  const [bootstrapped, setBootstrapped] = useState(false)
  const [tabs, setTabs] = useState<EditorTab[]>([])
  const [activeTabId, setActiveTabId] = useState('')
  const [pendingRecovery, setPendingRecovery] = useState<RecoverySnapshot | null>(null)

  const [theme, setTheme] = useState<Theme>('light')
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [isMaximized, setIsMaximized] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showOutline, setShowOutline] = useState(true)
  const [searchMode, setSearchMode] = useState<SearchMode | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [typewriterMode, setTypewriterMode] = useState(false)
  const [prefs, setPrefs] = useState<AppPreferences>({
    autoSave: true,
    autoSaveIntervalMs: 30000,
    customThemeCss: null,
    customThemeName: null,
    editorZoomPercent: EDITOR_ZOOM_DEFAULT
  })
  const editorZoom = prefs.editorZoomPercent ?? EDITOR_ZOOM_DEFAULT

  const activeTab = useMemo(() => {
    if (!bootstrapped || tabs.length === 0) return initialTab
    return tabs.find((t) => t.id === activeTabId) ?? tabs[0]
  }, [bootstrapped, tabs, activeTabId, initialTab])
  const { filePath, content: currentContent, editorView } = activeTab
  const isDirty = tabIsDirty(activeTab)
  const outlineItems = useMemo(() => parseOutline(currentContent), [currentContent])

  const updateActiveTab = useCallback(
    (patch: Partial<EditorTab>) => {
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, ...patch } : t)))
    },
    [activeTabId]
  )

  const getMarkdown = useCallback(() => {
    if (editorView === 'source') return currentContent
    return editorRef.current?.getMarkdown() ?? currentContent
  }, [editorView, currentContent])

  tabsRef.current = tabs
  activeTabIdRef.current = activeTabId
  getMarkdownRef.current = getMarkdown

  const unsavedDialogOptions = useCallback(
    (dirty: EditorTab[]): UnsavedDialogOptions => ({
      dirtyCount: dirty.length,
      tabTitles: dirty.map((t) => tabTitle(t))
    }),
    []
  )

  const flushActiveTabContent = useCallback(() => {
    const md = getMarkdown()
    updateActiveTab({ content: md })
    return md
  }, [getMarkdown, updateActiveTab])

  const applyTheme = useCallback((next: Theme) => {
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.body.style.backgroundColor = next === 'dark' ? '#1e1e1e' : '#ffffff'
  }, [])

  const setEditorZoom = useCallback((next: number) => {
    const clamped = clampEditorZoom(next)
    setPrefs((prev) => ({ ...prev, editorZoomPercent: clamped }))
    if (hasApi()) void window.api.setPreferences({ editorZoomPercent: clamped })
  }, [])

  const zoomIn = useCallback(
    () => setEditorZoom(stepEditorZoom(editorZoom, EDITOR_ZOOM_STEP)),
    [editorZoom, setEditorZoom]
  )
  const zoomOut = useCallback(
    () => setEditorZoom(stepEditorZoom(editorZoom, -EDITOR_ZOOM_STEP)),
    [editorZoom, setEditorZoom]
  )
  const zoomReset = useCallback(() => setEditorZoom(EDITOR_ZOOM_DEFAULT), [setEditorZoom])

  const handleEditorWheel = useCallback(
    (event: React.WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const delta = event.deltaY < 0 ? EDITOR_ZOOM_STEP : -EDITOR_ZOOM_STEP
      setEditorZoom(stepEditorZoom(editorZoom, delta))
    },
    [editorZoom, setEditorZoom]
  )

  const refreshFolder = useCallback(async (path: string) => {
    const result = await window.api.listFolder(path)
    if (result) {
      setFolderPath(result.folderPath)
      setFileTree(result.tree)
    }
  }, [])

  const saveTab = useCallback(
    async (tabId: string, content: string, options?: { silent?: boolean }): Promise<boolean> => {
      const tab = tabsRef.current.find((t) => t.id === tabId)
      if (!tab) return false
      try {
        const result = await window.api.saveFile(tab.filePath, content)
        if (result.canceled) return false
        if (result.error) {
          notifyError(`保存失败：${result.error}`, options?.silent)
          return false
        }
        if (result.path) {
          setTabs((prev) => {
            const next = prev.map((t) =>
              t.id === tabId
                ? { ...t, filePath: result.path!, savedContent: content, content }
                : t
            )
            tabsRef.current = next
            if (!next.some(tabIsDirty)) void window.api.clearRecovery()
            return next
          })
          if (folderPath) void refreshFolder(folderPath)
          return true
        }
        return false
      } catch (error) {
        notifyError(`保存失败：${formatErrorMessage(error)}`, options?.silent)
        return false
      }
    },
    [folderPath, refreshFolder]
  )

  const saveAllDirtyTabs = useCallback(
    async (dirtyTabs: EditorTab[], activeId: string, activeContent: string): Promise<boolean> => {
      for (const tab of dirtyTabs) {
        const content = tab.id === activeId ? activeContent : tab.content
        const ok = await saveTab(tab.id, content)
        if (!ok) return false
      }
      return true
    },
    [saveTab]
  )

  const buildExportPayload = useCallback(
    async (styled: boolean) => {
      const markdown = getMarkdown()
      const htmlBody =
        editorView === 'source'
          ? await editorRef.current?.renderHtml(markdown)
          : editorRef.current?.getHtml()
      const title = getDocumentTitle(filePath, markdown)
      return {
        markdown,
        html: buildExportHtml(title, htmlBody ?? '', {
          styled,
          extraCss: prefs.customThemeCss,
          dark: theme === 'dark'
        }),
        defaultName: filePath?.split(/[/\\]/).pop() ?? `${title}.md`,
        docPath: filePath
      }
    },
    [editorView, filePath, getMarkdown, prefs.customThemeCss, theme]
  )

  const switchTab = useCallback(
    async (tabId: string) => {
      if (tabId === activeTabId) return
      const md = flushActiveTabContent()
      const current = tabs.find((t) => t.id === activeTabId)
      if (current && tabIsDirty({ ...current, content: md })) {
        const action = await window.api.showUnsavedDialog(
          unsavedDialogOptions([{ ...current, content: md }])
        )
        if (action === 'cancel') return
        if (action === 'save') {
          const ok = await saveTab(activeTabId, md)
          if (!ok) return
        }
      }
      setActiveTabId(tabId)
    },
    [activeTabId, flushActiveTabContent, tabs, saveTab, unsavedDialogOptions]
  )

  const handleNew = useCallback(async () => {
    const md = flushActiveTabContent()
    if (tabIsDirty({ ...activeTab, content: md })) {
      const action = await window.api.showUnsavedDialog(
        unsavedDialogOptions([{ ...activeTab, content: md }])
      )
      if (action === 'cancel') return
      if (action === 'save') {
        const ok = await saveTab(activeTabId, md)
        if (!ok) return
      }
    }
    updateActiveTab({ filePath: null, content: '', savedContent: '', editorView: 'wysiwyg' })
    await editorRef.current?.setMarkdown('')
  }, [activeTab, activeTabId, flushActiveTabContent, saveTab, updateActiveTab, unsavedDialogOptions])

  const loadFile = useCallback(
    async (path: string, content: string) => {
      const normalized = normalizeMarkdownImagePaths(content, path)
      updateActiveTab({
        filePath: path,
        savedContent: normalized,
        content: normalized,
        editorView: 'wysiwyg'
      })
      await editorRef.current?.setMarkdown(normalized)
    },
    [updateActiveTab]
  )

  const handleOpen = useCallback(async () => {
    const md = flushActiveTabContent()
    if (tabIsDirty({ ...activeTab, content: md })) {
      const action = await window.api.showUnsavedDialog(
        unsavedDialogOptions([{ ...activeTab, content: md }])
      )
      if (action === 'cancel') return
      if (action === 'save') {
        const ok = await saveTab(activeTabId, md)
        if (!ok) return
      }
    }
    const result = await window.api.openFile()
    if (!result) return
    await loadFile(result.path, result.content)
  }, [activeTab, activeTabId, flushActiveTabContent, loadFile, saveTab, unsavedDialogOptions])

  const openPath = useCallback(
    async (path: string) => {
      const existing = tabs.find((t) => sameFilePath(t.filePath, path))
      if (existing) {
        await switchTab(existing.id)
        return
      }
      const md = flushActiveTabContent()
      if (tabIsDirty({ ...activeTab, content: md })) {
        const action = await window.api.showUnsavedDialog(
          unsavedDialogOptions([{ ...activeTab, content: md }])
        )
        if (action === 'cancel') return
        if (action === 'save') {
          const ok = await saveTab(activeTabId, md)
          if (!ok) return
        }
      }
      const result = await window.api.openFilePath(path)
      if (!result) return
      await loadFile(result.path, result.content)
    },
    [tabs, switchTab, flushActiveTabContent, activeTab, activeTabId, loadFile, saveTab, unsavedDialogOptions]
  )

  const handleOpenFolder = useCallback(async () => {
    const result = await window.api.openFolder()
    if (!result) return
    setFolderPath(result.folderPath)
    setFileTree(result.tree)
    setShowSidebar(true)
  }, [])

  const handleSave = useCallback(
    async (options?: { silent?: boolean }): Promise<boolean> => {
      const snapshot = getMarkdown()
      updateActiveTab({ content: snapshot })
      return saveTab(activeTabId, snapshot, options)
    },
    [getMarkdown, updateActiveTab, saveTab, activeTabId]
  )

  const handleSaveAs = useCallback(async () => {
    const snapshot = getMarkdown()
    try {
      const result = await window.api.saveFileAs(snapshot, filePath)
      if (result.canceled) return
      if (result.error) {
        notifyError(`另存为失败：${result.error}`)
        return
      }
      if (result.path) {
        setTabs((prev) => {
          const next = prev.map((t) =>
            t.id === activeTabId
              ? { ...t, filePath: result.path!, savedContent: snapshot, content: snapshot }
              : t
          )
          if (!next.some(tabIsDirty)) void window.api.clearRecovery()
          return next
        })
        if (editorView === 'wysiwyg') await editorRef.current?.setMarkdown(snapshot)
        if (folderPath) void refreshFolder(folderPath)
      }
    } catch (error) {
      notifyError(`另存为失败：${formatErrorMessage(error)}`)
    }
  }, [getMarkdown, filePath, updateActiveTab, editorView, folderPath, refreshFolder])

  const handleExportPdf = useCallback(async () => {
    try {
      const { html, defaultName, docPath } = await buildExportPayload(true)
      const result = await window.api.exportPdf(html, defaultName, docPath)
      if (result.error) notifyError(`导出 PDF 失败：${result.error}`)
    } catch (error) {
      notifyError(`导出 PDF 失败：${formatErrorMessage(error)}`)
    }
  }, [buildExportPayload])

  const handleExportHtml = useCallback(
    async (styled: boolean) => {
      try {
        const { html, defaultName, docPath } = await buildExportPayload(styled)
        const result = await window.api.exportHtml(html, defaultName, docPath)
        if (result.error) notifyError(`导出 HTML 失败：${result.error}`)
      } catch (error) {
        notifyError(`导出 HTML 失败：${formatErrorMessage(error)}`)
      }
    },
    [buildExportPayload]
  )

  const handleExportImage = useCallback(async () => {
    try {
      const { html, defaultName, docPath } = await buildExportPayload(true)
      const result = await window.api.exportImage(html, defaultName, docPath)
      if (result.error) notifyError(`导出图片失败：${result.error}`)
      else if (result.warning) window.alert(result.warning)
    } catch (error) {
      notifyError(`导出图片失败：${formatErrorMessage(error)}`)
    }
  }, [buildExportPayload])

  const handleExportDocx = useCallback(async () => {
    try {
      const { markdown, defaultName } = await buildExportPayload(true)
      const result = await window.api.exportPandoc(markdown, 'docx', defaultName)
      if (result.error && result.error !== 'PANDOC_NOT_FOUND') {
        notifyError(`导出 Word 失败：${result.error}`)
      }
    } catch (error) {
      notifyError(`导出 Word 失败：${formatErrorMessage(error)}`)
    }
  }, [buildExportPayload])

  const handleExportEpub = useCallback(async () => {
    try {
      const { markdown, defaultName } = await buildExportPayload(true)
      const result = await window.api.exportPandoc(markdown, 'epub', defaultName)
      if (result.error && result.error !== 'PANDOC_NOT_FOUND') {
        notifyError(`导出 EPUB 失败：${result.error}`)
      }
    } catch (error) {
      notifyError(`导出 EPUB 失败：${formatErrorMessage(error)}`)
    }
  }, [buildExportPayload])

  const handleToggleSource = useCallback(async () => {
    if (editorView === 'wysiwyg') {
      const md = editorRef.current?.getMarkdown() ?? currentContent
      updateActiveTab({ content: md, editorView: 'source' })
    } else {
      updateActiveTab({ editorView: 'wysiwyg' })
      await editorRef.current?.setMarkdown(currentContent)
    }
  }, [editorView, currentContent, updateActiveTab])

  const handleImportTheme = useCallback(async () => {
    const result = await window.api.importTheme()
    if (result) setPrefs(result)
  }, [])

  const handleClearTheme = useCallback(async () => {
    const result = await window.api.clearTheme()
    setPrefs(result)
  }, [])

  const rememberClosedTab = useCallback((snapshot: ClosedTabSnapshot) => {
    closedTabsRef.current = [snapshot, ...closedTabsRef.current].slice(0, MAX_CLOSED_TABS)
  }, [])

  const handleCloseTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId)
      if (!tab) return
      const content =
        tabId === activeTabId ? flushActiveTabContent() : tab.content
      const view = tabId === activeTabId ? editorView : tab.editorView
      let snapshotContent = content
      let snapshotSaved = tab.savedContent

      if (tabIsDirty({ ...tab, content })) {
        const action = await window.api.showUnsavedDialog(
          unsavedDialogOptions([{ ...tab, content }])
        )
        if (action === 'cancel') return
        if (action === 'save') {
          const ok = await saveTab(tabId, content)
          if (!ok) return
          snapshotContent = content
          snapshotSaved = content
        } else {
          snapshotContent = tab.savedContent
          snapshotSaved = tab.savedContent
        }
      }

      rememberClosedTab({
        filePath: tab.filePath,
        content: snapshotContent,
        savedContent: snapshotSaved,
        editorView: view
      })

      const remaining = tabs.filter((t) => t.id !== tabId)
      if (remaining.length === 0) {
        const newTab = createTab({ content: '', savedContent: '' })
        setTabs([newTab])
        setActiveTabId(newTab.id)
      } else {
        setTabs(remaining)
        if (activeTabId === tabId) setActiveTabId(remaining[0].id)
      }
    },
    [
      tabs,
      activeTabId,
      editorView,
      flushActiveTabContent,
      saveTab,
      unsavedDialogOptions,
      rememberClosedTab
    ]
  )

  const handleNewTab = useCallback(() => {
    flushActiveTabContent()
    const tab = createTab({ content: '', savedContent: '' })
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
  }, [flushActiveTabContent])

  const handleReopenClosedTab = useCallback(() => {
    const closed = closedTabsRef.current.shift()
    if (!closed) return
    flushActiveTabContent()
    const tab = createTab(closed)
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
  }, [flushActiveTabContent])

  const switchToAdjacentTab = useCallback(
    (delta: number) => {
      if (tabs.length <= 1) return
      const index = tabs.findIndex((t) => t.id === activeTabId)
      if (index < 0) return
      const next = tabs[(index + delta + tabs.length) % tabs.length]
      void switchTab(next.id)
    },
    [tabs, activeTabId, switchTab]
  )

  const handleCloseRequest = useCallback(async () => {
    const md = flushActiveTabContent()
    const dirtyTabs = tabsRef.current
      .map((t) => (t.id === activeTabId ? { ...t, content: md } : t))
      .filter(tabIsDirty)
    if (dirtyTabs.length > 0) {
      const action = await window.api.showUnsavedDialog(unsavedDialogOptions(dirtyTabs))
      if (action === 'cancel') return
      if (action === 'save') {
        const ok = await saveAllDirtyTabs(dirtyTabs, activeTabId, md)
        if (!ok) return
      }
    }
    await window.api.clearRecovery()
    await window.api.forceCloseWindow()
  }, [flushActiveTabContent, activeTabId, saveAllDirtyTabs, unsavedDialogOptions])

  const handleEditorChange = useCallback(
    (markdown: string) => {
      if (editorView === 'wysiwyg') updateActiveTab({ content: markdown })
    },
    [editorView, updateActiveTab]
  )

  const handleSearchApply = useCallback(
    async (nextMarkdown: string, options?: { syncCrepe?: boolean }) => {
      updateActiveTab({ content: nextMarkdown })
      if (options?.syncCrepe && editorView === 'wysiwyg') {
        await editorRef.current?.setMarkdown(nextMarkdown)
      }
    },
    [updateActiveTab, editorView]
  )

  const handleSearchNavigate = useCallback(
    (matchIndex: number, query: string, caseSensitive: boolean) => {
      const useRenderedFind = searchMode === 'find' && editorView === 'wysiwyg'
      if (editorView === 'source' || !useRenderedFind) {
        const matches = findMatchesInMarkdown(currentContent, query, caseSensitive)
        const match = matches[matchIndex]
        if (!match) return
        if (editorView === 'source') {
          sourceRef.current?.scrollToRange(match.start, match.end)
        } else {
          editorRef.current?.scrollToMatch(query, matchIndex, caseSensitive)
        }
      } else {
        editorRef.current?.scrollToMatch(query, matchIndex, caseSensitive)
      }
    },
    [currentContent, editorView, searchMode]
  )

  const openFind = useCallback(() => {
    setSearchMode('find')
  }, [])

  const openReplace = useCallback(() => {
    if (editorView === 'wysiwyg') {
      const md = editorRef.current?.getMarkdown() ?? currentContent
      updateActiveTab({ content: md, editorView: 'source' })
    }
    setSearchMode('replace')
  }, [editorView, currentContent, updateActiveTab])

  const searchFindText =
    searchMode === 'find' && editorView === 'wysiwyg'
      ? (editorRef.current?.getPlainText() ?? currentContent)
      : undefined

  useEffect(() => {
    applyTheme('light')
    void (async () => {
      try {
        if (hasApi()) {
          const api = window.api
          setIsMaximized(await api.isMaximized())
          setPrefs(await api.getPreferences())
          const snapshot = await api.loadRecovery()
          if (snapshot?.tabs?.length) {
            setPendingRecovery(snapshot)
          }
        } else {
          console.error('[MyMD] window.api missing — preload did not load')
        }
      } catch (error) {
        console.error('Bootstrap failed:', error)
      } finally {
        setTabs([initialTab])
        setActiveTabId(initialTab.id)
        setBootstrapped(true)
      }
    })()
  }, [applyTheme, initialTab])

  useEffect(() => {
    if (!bootstrapped || !pendingRecovery || !hasApi()) return
    void (async () => {
      const snapshot = pendingRecovery
      const when = new Date(snapshot.savedAt).toLocaleString()
      const restore = window.confirm(`发现 ${when} 的未保存会话，是否恢复？`)
      if (restore) {
        const restored = snapshot.tabs.map((t) => ({
          id: t.id,
          filePath: t.filePath,
          content: t.content,
          savedContent: t.savedContent,
          editorView: t.editorView
        }))
        const validActiveId = restored.some((t) => t.id === snapshot.activeTabId)
          ? snapshot.activeTabId
          : restored[0].id
        setTabs(restored)
        setActiveTabId(validActiveId)
      } else {
        await window.api.clearRecovery()
      }
      setPendingRecovery(null)
    })()
  }, [bootstrapped, pendingRecovery])

  const saveTabRef = useRef(saveTab)
  saveTabRef.current = saveTab

  useEffect(() => {
    if (!prefs.autoSave || !bootstrapped || !hasApi()) return
    const timer = window.setInterval(() => {
      const snapshot = tabsRef.current
      const activeId = activeTabIdRef.current
      const activeContent = getMarkdownRef.current()
      void (async () => {
        for (const tab of snapshot) {
          const content = tab.id === activeId ? activeContent : tab.content
          if (!tabIsDirty({ ...tab, content })) continue
          if (!tab.filePath) continue
          await saveTabRef.current(tab.id, content, { silent: true })
        }
      })()
    }, prefs.autoSaveIntervalMs)
    return () => window.clearInterval(timer)
  }, [prefs.autoSave, prefs.autoSaveIntervalMs, bootstrapped])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return

      if (event.key === '=' || event.key === '+') {
        event.preventDefault()
        zoomIn()
        return
      }
      if (event.key === '-') {
        event.preventDefault()
        zoomOut()
        return
      }
      if (event.key === '0') {
        event.preventDefault()
        zoomReset()
        return
      }

      if (event.key === 't' && event.altKey && !event.shiftKey) {
        event.preventDefault()
        applyTheme(theme === 'light' ? 'dark' : 'light')
        return
      }

      if (event.altKey) return

      if (event.key === 't' && event.shiftKey) {
        event.preventDefault()
        handleReopenClosedTab()
        return
      }
      if (event.key === 't' && !event.shiftKey) {
        event.preventDefault()
        handleNewTab()
        return
      }
      if (event.key === 'w' && !event.shiftKey) {
        event.preventDefault()
        void handleCloseTab(activeTabId)
        return
      }
      if (event.key === 'w' && event.shiftKey) {
        event.preventDefault()
        void handleCloseRequest()
        return
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        switchToAdjacentTab(event.shiftKey ? -1 : 1)
        return
      }
      if (event.key === 'PageDown') {
        event.preventDefault()
        switchToAdjacentTab(1)
        return
      }
      if (event.key === 'PageUp') {
        event.preventDefault()
        switchToAdjacentTab(-1)
        return
      }
      const tabNumber = Number(event.key)
      if (!event.shiftKey && tabNumber >= 1 && tabNumber <= 9) {
        const target = tabs[tabNumber - 1]
        if (target) {
          event.preventDefault()
          void switchTab(target.id)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [
    zoomIn,
    zoomOut,
    zoomReset,
    handleNewTab,
    handleReopenClosedTab,
    handleCloseTab,
    handleCloseRequest,
    activeTabId,
    applyTheme,
    theme,
    switchToAdjacentTab,
    switchTab,
    tabs
  ])

  useEffect(() => {
    if (!bootstrapped || !hasApi()) return
    const hasDirty = tabs.some((t) =>
      t.id === activeTabId ? tabIsDirty({ ...t, content: getMarkdown() }) : tabIsDirty(t)
    )
    if (!hasDirty) return
    const timer = window.setInterval(() => {
      const snapshot = {
        tabs: tabs.map((t) => ({
          id: t.id,
          filePath: t.filePath,
          content: t.id === activeTabId ? getMarkdown() : t.content,
          savedContent: t.savedContent,
          editorView: t.id === activeTabId ? editorView : t.editorView
        })),
        activeTabId,
        savedAt: new Date().toISOString()
      }
      void window.api.saveRecovery(snapshot)
    }, 15000)
    return () => window.clearInterval(timer)
  }, [tabs, activeTabId, editorView, getMarkdown, bootstrapped])

  useEffect(() => {
    if (!bootstrapped || !hasApi()) return
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
          openFind()
          break
        case 'replace':
          openReplace()
          break
        case 'zoom-in':
          zoomIn()
          break
        case 'zoom-out':
          zoomOut()
          break
        case 'zoom-reset':
          zoomReset()
          break
        case 'new-tab':
          handleNewTab()
          break
        case 'close-tab':
          void handleCloseTab(activeTabId)
          break
        case 'close-window':
          void handleCloseRequest()
          break
        case 'reopen-tab':
          handleReopenClosedTab()
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
    refreshFolder,
    openFind,
    openReplace,
    zoomIn,
    zoomOut,
    zoomReset,
    handleNewTab,
    handleReopenClosedTab,
    handleCloseTab,
    activeTabId,
    bootstrapped
  ])

  if (!bootstrapped) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-white text-gray-700">
        <div className="text-sm font-medium">MyMD</div>
        <div className="text-xs text-gray-500">正在加载…</div>
      </div>
    )
  }

  if (!hasApi()) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-white p-6 text-center text-gray-800">
        <div className="text-base font-medium">无法连接 Electron 接口</div>
        <p className="max-w-md text-sm text-gray-600">
          预加载脚本未正确注入（window.api 不存在）。请关闭所有 MyMD / Electron 进程后执行：
        </p>
        <code className="rounded bg-gray-100 px-3 py-2 text-sm">npm run dev:clean</code>
      </div>
    )
  }

  return (
    <div className={`flex h-screen flex-col ${theme === 'dark' ? 'dark bg-[#1e1e1e]' : 'bg-white'}`}>
      <TitleBar
        title={tabTitle(activeTab)}
        isDirty={isDirty}
        isMaximized={isMaximized}
        onMinimize={() => void window.api.minimizeWindow()}
        onMaximize={async () => {
          await window.api.maximizeWindow()
          setIsMaximized(await window.api.isMaximized())
        }}
        onClose={() => void handleCloseRequest()}
      />
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        theme={theme}
        onSelect={(id) => void switchTab(id)}
        onCloseTab={(id) => void handleCloseTab(id)}
        onNewTab={handleNewTab}
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
        <div
          className={`mymd-content relative min-h-0 min-w-0 flex-1 ${theme === 'dark' ? 'dark-content' : ''}`}
          style={{ '--mymd-zoom': editorZoomFactor(editorZoom) } as React.CSSProperties}
          onWheel={handleEditorWheel}
        >
          {searchMode && (
            <SearchDialog
              mode={searchMode}
              theme={theme}
              editorView={editorView}
              markdown={currentContent}
              findText={searchFindText}
              onClose={() => setSearchMode(null)}
              onApply={(next, opts) => void handleSearchApply(next, opts)}
              onNavigate={handleSearchNavigate}
            />
          )}
          <CrepeEditor
            key={activeTabId}
            ref={editorRef}
            initialContent={activeTab.content}
            theme={theme}
            filePath={filePath}
            focusMode={focusMode}
            typewriterMode={typewriterMode}
            customThemeCss={prefs.customThemeCss}
            hidden={editorView === 'source'}
            onChange={handleEditorChange}
          />
          {editorView === 'source' && (
            <SourceEditor
              ref={sourceRef}
              value={currentContent}
              theme={theme}
              onChange={(md) => updateActiveTab({ content: md })}
            />
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
        editorZoom={editorZoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
      />
    </div>
  )
}
