export function formatErrorMessage(error: unknown, fallback = '操作失败'): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.length > 0) return error
  return fallback
}

export function notifyError(message: string, silent = false): void {
  if (!silent) window.alert(message)
}
