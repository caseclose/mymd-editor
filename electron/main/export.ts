import { BrowserWindow, dialog } from 'electron'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { spawn } from 'child_process'
import { exportHtmlToPdf } from './export-pdf'
import { inlineLocalImages } from './export-images'

export { exportHtmlToPdf }

async function loadHtmlInHiddenWindow(html: string, docPath?: string | null): Promise<BrowserWindow> {
  const inlinedHtml = await inlineLocalImages(html, docPath)
  const tempPath = join(tmpdir(), `mymd-export-${randomUUID()}.html`)
  await writeFile(tempPath, inlinedHtml, 'utf-8')

  const win = new BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  await win.loadFile(tempPath)
  await new Promise<void>((resolve) => {
    if (win.webContents.isLoading()) {
      win.webContents.once('did-finish-load', () => resolve())
    } else {
      resolve()
    }
  })
  await new Promise((resolve) => setTimeout(resolve, 400))

  win.on('closed', () => {
    void unlink(tempPath).catch(() => undefined)
  })

  return win
}

export async function exportHtmlFile(
  html: string,
  outputPath: string,
  docPath?: string | null
): Promise<void> {
  const inlinedHtml = await inlineLocalImages(html, docPath)
  await writeFile(outputPath, inlinedHtml, 'utf-8')
}

export async function exportHtmlToImage(
  html: string,
  outputPath: string,
  docPath?: string | null
): Promise<void> {
  const win = await loadHtmlInHiddenWindow(html, docPath)
  try {
    const height = await win.webContents.executeJavaScript(
      'Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)'
    )
    win.setContentSize(900, Math.min(Math.max(height as number, 600), 16000))
    await new Promise((resolve) => setTimeout(resolve, 200))
    const image = await win.webContents.capturePage()
    await writeFile(outputPath, image.toPNG())
  } finally {
    win.destroy()
  }
}

export async function findPandoc(): Promise<string | null> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    const proc = spawn(cmd, ['pandoc'], { shell: false })
    let output = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    proc.on('close', (code) => {
      if (code !== 0) {
        resolve(null)
        return
      }
      const line = output.split(/\r?\n/).find((l) => l.trim().length > 0)
      resolve(line?.trim() ?? null)
    })
    proc.on('error', () => resolve(null))
  })
}

export async function exportWithPandoc(
  markdown: string,
  outputPath: string,
  target: 'docx' | 'epub' | 'latex'
): Promise<void> {
  const pandoc = await findPandoc()
  if (!pandoc) {
    throw new Error('PANDOC_NOT_FOUND')
  }

  const mdPath = join(tmpdir(), `mymd-${randomUUID()}.md`)
  await writeFile(mdPath, markdown, 'utf-8')

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(pandoc, ['-f', 'gfm', '-t', target, '-o', outputPath, mdPath], {
      shell: false
    })
    let stderr = ''
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('close', (code) => {
      void unlink(mdPath).catch(() => undefined)
      if (code === 0) resolve()
      else reject(new Error(stderr || `pandoc exited with code ${code}`))
    })
    proc.on('error', (err) => reject(err))
  })
}

export async function showPandocNotFoundDialog(parent: BrowserWindow): Promise<void> {
  await dialog.showMessageBox(parent, {
    type: 'warning',
    title: '需要 Pandoc',
    message: '未检测到 Pandoc',
    detail:
      '导出 Word / EPUB / LaTeX 需要安装 Pandoc。\n\n请访问 https://pandoc.org/installing.html 安装后重启 MyMD。',
    buttons: ['确定']
  })
}
