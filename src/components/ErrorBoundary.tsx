import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('MyMD render error:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-white p-6 text-center text-gray-800">
          <div className="text-base font-medium">界面加载失败</div>
          <pre className="max-w-lg overflow-auto rounded border border-red-200 bg-red-50 p-3 text-left text-xs text-red-700">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
