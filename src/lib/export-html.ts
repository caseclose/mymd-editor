import typoraLightCss from '../styles/typora-light.css?inline'
import typoraDarkCss from '../styles/typora-dark.css?inline'
import printCss from '../styles/print.css?inline'

export interface ExportHtmlOptions {
  styled?: boolean
  extraCss?: string | null
  dark?: boolean
}

export function buildExportHtml(
  title: string,
  bodyHtml: string,
  options: ExportHtmlOptions = {}
): string {
  const { styled = true, extraCss = null, dark = false } = options
  const escapedTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  if (!styled) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${escapedTitle}</title>
</head>
<body>
${bodyHtml}
</body>
</html>`
  }

  const themeCss = dark ? typoraDarkCss : typoraLightCss
  const extraBlock = extraCss ? `\n/* custom theme */\n${extraCss}\n` : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <style>
${themeCss}
${printCss}
${extraBlock}
  </style>
</head>
<body class="mymd-export-body">
  <article class="mymd-export-content mymd-content${dark ? ' dark-content' : ''}">
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
