import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

export interface AppPreferences {
  autoSave: boolean
  autoSaveIntervalMs: number
  customThemeCss: string | null
  customThemeName: string | null
}

const DEFAULTS: AppPreferences = {
  autoSave: true,
  autoSaveIntervalMs: 30000,
  customThemeCss: null,
  customThemeName: null
}

function prefsPath(): string {
  return join(app.getPath('userData'), 'preferences.json')
}

export async function loadPreferences(): Promise<AppPreferences> {
  try {
    const path = prefsPath()
    if (!existsSync(path)) return { ...DEFAULTS }
    const raw = await readFile(path, 'utf-8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function savePreferences(prefs: Partial<AppPreferences>): Promise<AppPreferences> {
  const current = await loadPreferences()
  const next = { ...current, ...prefs }
  const dir = app.getPath('userData')
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(prefsPath(), JSON.stringify(next, null, 2), 'utf-8')
  return next
}
