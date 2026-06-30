export const EDITOR_ZOOM_MIN = 50
export const EDITOR_ZOOM_MAX = 300
export const EDITOR_ZOOM_DEFAULT = 100
export const EDITOR_ZOOM_STEP = 10

export function clampEditorZoom(percent: number): number {
  const rounded = Math.round(percent / EDITOR_ZOOM_STEP) * EDITOR_ZOOM_STEP
  return Math.min(EDITOR_ZOOM_MAX, Math.max(EDITOR_ZOOM_MIN, rounded))
}

export function stepEditorZoom(current: number, delta: number): number {
  return clampEditorZoom(current + delta)
}

export function editorZoomFactor(percent: number): number {
  return clampEditorZoom(percent) / 100
}
