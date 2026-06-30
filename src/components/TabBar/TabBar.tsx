import type { EditorTab } from '../../types/tab'
import { tabIsDirty, tabTitle } from '../../types/tab'

interface TabBarProps {
  tabs: EditorTab[]
  activeTabId: string
  theme: 'light' | 'dark'
  onSelect: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onNewTab: () => void
}

export default function TabBar({
  tabs,
  activeTabId,
  theme,
  onSelect,
  onCloseTab,
  onNewTab
}: TabBarProps): React.JSX.Element {
  return (
    <div
      className={`flex h-8 shrink-0 items-end gap-0.5 overflow-x-auto border-b px-2 ${
        theme === 'dark' ? 'border-gray-700 bg-[#252526]' : 'border-gray-200 bg-[#f3f3f3]'
      }`}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTabId
        const title = tabTitle(tab)
        const dirty = tabIsDirty(tab)
        return (
          <div
            key={tab.id}
            className={`group flex max-w-[200px] items-center gap-1 rounded-t px-2 py-1 text-xs ${
              active
                ? theme === 'dark'
                  ? 'bg-[#1e1e1e] text-gray-100'
                  : 'bg-white text-gray-800'
                : theme === 'dark'
                  ? 'text-gray-400 hover:bg-[#2d2d2d]'
                  : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left"
              onClick={() => onSelect(tab.id)}
            >
              {dirty ? `${title} •` : title}
            </button>
            {tabs.length > 1 && (
              <button
                type="button"
                className="shrink-0 rounded px-1 opacity-60 hover:opacity-100"
                aria-label="关闭标签"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(tab.id)
                }}
              >
                ×
              </button>
            )}
          </div>
        )
      })}
      <button
        type="button"
        className={`mb-0.5 rounded px-2 py-0.5 text-sm ${
          theme === 'dark' ? 'text-gray-400 hover:bg-[#2d2d2d]' : 'text-gray-500 hover:bg-gray-200'
        }`}
        onClick={onNewTab}
        aria-label="新建标签"
      >
        +
      </button>
    </div>
  )
}
