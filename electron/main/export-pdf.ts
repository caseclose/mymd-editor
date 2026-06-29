import { BrowserWindow } from 'electron'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

export async function exportHtmlToPdf(html: string, outputPath: string): Promise<void> {
  const tempPath = join(tmpdir(), `mymd-export-${randomUUID()}.html`)
  await writeFile(tempPath, html, 'utf-8')

  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  try {
    await pdfWindow.loadFile(tempPath)
    await new Promise<void>((resolve) => {
      if (pdfWindow.webContents.isLoading()) {
        pdfWindow.webContents.once('did-finish-load', () => resolve())
      } else {
        resolve()
      }
    })
    await new Promise((resolve) => setTimeout(resolve, 300))

    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      generateDocumentOutline: true,
      margins: {
        marginType: 'default'
      }
    })

    await writeFile(outputPath, pdfBuffer)
  } finally {
    pdfWindow.destroy()
    await unlink(tempPath).catch(() => undefined)
  }
}
