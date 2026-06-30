import type { EditorView } from './api'

export type ClosedTabSnapshot = Omit<EditorTab, 'id'>

export interface EditorTab {
  id: string
  filePath: string | null
  content: string
  savedContent: string
  editorView: EditorView
}

export function createTab(partial: Partial<EditorTab> = {}): EditorTab {
  return {
    id: crypto.randomUUID(),
    filePath: null,
    content: '',
    savedContent: '',
    editorView: 'wysiwyg',
    ...partial
  }
}

export function tabTitle(tab: EditorTab): string {
  if (tab.filePath) return tab.filePath.split(/[/\\]/).pop() ?? '未命名'
  return '未命名'
}

export function tabIsDirty(tab: EditorTab): boolean {
  return tab.content !== tab.savedContent
}
