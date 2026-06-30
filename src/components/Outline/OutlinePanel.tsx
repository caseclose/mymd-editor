import type { OutlineItem } from '../../types/api'

interface OutlinePanelProps {
  items: OutlineItem[]
  theme: 'light' | 'dark'
  onSelect: (item: OutlineItem) => void
}

export default function OutlinePanel({ items, theme, onSelect }: OutlinePanelProps): React.JSX.Element {
  return (
    <aside
      className={`flex w-52 shrink-0 flex-col border-l ${
        theme === 'dark' ? 'border-gray-700 bg-[#252526]' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
        大纲
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {items.length > 0 ? (
          items.map((item, index) => (
            <button
              key={`${item.line}-${index}`}
              type="button"
              className="block w-full truncate px-2 py-1 text-left text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
              style={{ paddingLeft: 8 + (item.level - 1) * 12 }}
              title={item.text}
              onClick={() => onSelect(item)}
            >
              {item.text}
            </button>
          ))
        ) : (
          <p className="px-3 py-2 text-xs text-gray-400">文档中没有标题</p>
        )}
      </div>
    </aside>
  )
}
