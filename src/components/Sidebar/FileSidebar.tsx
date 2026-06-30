import type { FileTreeNode } from '../../types/api'

interface FileSidebarProps {
  folderPath: string | null
  tree: FileTreeNode[]
  activeFilePath: string | null
  theme: 'light' | 'dark'
  onOpenFile: (path: string) => void
}

function TreeNode({
  node,
  depth,
  activeFilePath,
  onOpenFile
}: {
  node: FileTreeNode
  depth: number
  activeFilePath: string | null
  onOpenFile: (path: string) => void
}): React.JSX.Element {
  const paddingLeft = 8 + depth * 14

  if (node.isDirectory) {
    return (
      <div>
        <div
          className="truncate px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400"
          style={{ paddingLeft }}
          title={node.path}
        >
          {node.name}
        </div>
        {node.children?.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            activeFilePath={activeFilePath}
            onOpenFile={onOpenFile}
          />
        ))}
      </div>
    )
  }

  const isActive = activeFilePath === node.path
  return (
    <button
      type="button"
      className={`block w-full truncate px-2 py-1 text-left text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${
        isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : ''
      }`}
      style={{ paddingLeft }}
      title={node.path}
      onClick={() => onOpenFile(node.path)}
    >
      {node.name}
    </button>
  )
}

export default function FileSidebar({
  folderPath,
  tree,
  activeFilePath,
  theme,
  onOpenFile
}: FileSidebarProps): React.JSX.Element {
  return (
    <aside
      className={`flex w-56 shrink-0 flex-col border-r ${
        theme === 'dark' ? 'border-gray-700 bg-[#252526]' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
        文件
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {folderPath ? (
          tree.length > 0 ? (
            tree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                activeFilePath={activeFilePath}
                onOpenFile={onOpenFile}
              />
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-gray-400">此文件夹中没有 Markdown 文件</p>
          )
        ) : (
          <p className="px-3 py-2 text-xs text-gray-400">使用 Ctrl+Shift+O 打开文件夹</p>
        )}
      </div>
    </aside>
  )
}
