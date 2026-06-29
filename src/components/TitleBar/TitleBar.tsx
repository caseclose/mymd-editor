interface TitleBarProps {
  title: string
  isDirty: boolean
  isMaximized: boolean
  onMinimize: () => void
  onMaximize: () => void
  onClose: () => void
}

export default function TitleBar({
  title,
  isDirty,
  isMaximized,
  onMinimize,
  onMaximize,
  onClose
}: TitleBarProps): React.JSX.Element {
  const displayTitle = isDirty ? `${title} •` : title

  return (
    <div className="titlebar flex h-9 shrink-0 select-none items-center justify-between border-b border-gray-200 bg-shell-light dark:border-gray-700 dark:bg-shell-dark">
      <div className="flex min-w-0 flex-1 items-center px-4">
        <span className="truncate text-sm text-gray-600 dark:text-gray-300">{displayTitle}</span>
      </div>
      <div className="flex h-full">
        <button
          type="button"
          className="titlebar-btn flex w-12 items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={onMinimize}
          aria-label="最小化"
        >
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor" /></svg>
        </button>
        <button
          type="button"
          className="titlebar-btn flex w-12 items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={onMaximize}
          aria-label={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
              <rect x="2" y="0" width="8" height="8" strokeWidth="1" />
              <rect x="0" y="2" width="8" height="8" strokeWidth="1" fill="var(--tw-bg-opacity)" className="fill-shell-light dark:fill-shell-dark" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="10" stroke="currentColor" fill="none" strokeWidth="1" /></svg>
          )}
        </button>
        <button
          type="button"
          className="titlebar-btn flex w-12 items-center justify-center hover:bg-red-500 hover:text-white"
          onClick={onClose}
          aria-label="关闭"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  )
}
