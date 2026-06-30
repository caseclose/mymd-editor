import type { AppPreferences } from '../../types/api'

const STORAGE_KEY = 'mymd-local-prefs'

export function loadLocalPreferences(): Partial<AppPreferences> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<AppPreferences>
  } catch {
    return {}
  }
}

export function saveLocalPreferences(prefs: Partial<AppPreferences>): void {
  const current = loadLocalPreferences()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...prefs }))
}
