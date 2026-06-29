import typoraLightCss from '../styles/typora-light.css?inline'
import printCss from '../styles/print.css?inline'

export function buildExportHtml(title: string, bodyHtml: string): string {
  const escapedTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <style>
${typoraLightCss}
${printCss}
  </style>
</head>
<body class="mymd-export-body">
  <article class="mymd-export-content mymd-content">
    ${bodyHtml}
  </article>
</body>
</html>`
}

export function getDocumentTitle(filePath: string | null, markdown: string): string {
  if (filePath) {
    const name = filePath.split(/[/\\]/).pop()
    if (name) return name.replace(/\.md$/i, '')
  }
  const match = markdown.match(/^#\s+(.+)$/m)
  if (match?.[1]) return match[1].trim()
  return 'document'
}
