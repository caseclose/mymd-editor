import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

export interface RecoveryTab {
  id: string
  filePath: string | null
  content: string
  savedContent: string
  editorView: 'wysiwyg' | 'source'
}

export interface RecoverySnapshot {
  tabs: RecoveryTab[]
  activeTabId: string
  savedAt: string
}

function recoveryPath(): string {
  return join(app.getPath('userData'), 'recovery.json')
}

export async function saveRecoverySnapshot(snapshot: RecoverySnapshot): Promise<void> {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(recoveryPath(), JSON.stringify(snapshot, null, 2), 'utf-8')
}

export async function loadRecoverySnapshot(): Promise<RecoverySnapshot | null> {
  try {
    const path = recoveryPath()
    if (!existsSync(path)) return null
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as RecoverySnapshot
  } catch {
    return null
  }
}

export async function clearRecoverySnapshot(): Promise<void> {
  await unlink(recoveryPath()).catch(() => undefined)
}
