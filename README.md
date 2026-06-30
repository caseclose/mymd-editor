# MyMD

Typora 风格的 Markdown 编辑器，基于 Electron + React + Milkdown Crepe 构建。

## 功能

- 所见即所得 Markdown 编辑（GFM）
- 数学公式（KaTeX）与 Mermaid 图表
- 代码块语法高亮
- 文件树侧边栏、大纲面板、查找替换
- **专注模式（F8）**、**打字机模式（F9）**、**源码模式（Ctrl+/）**
- 导出 PDF / HTML / 图片 PNG
- 通过 Pandoc 导出 Word / EPUB（需安装 Pandoc）
- 导入自定义 CSS 主题
- 自动保存（默认 30 秒）
- 亮/暗主题、图片上传至 `assets/`

## 开发

```powershell
npm install
npm run dev
```

## 构建

```powershell
npm run build        # 编译
npm run build:win    # 打包 Windows 安装程序（输出到 release/）
```

## 快捷键

| 操作 | 快捷键 |
|------|--------|
| 新建 | Ctrl+N |
| 打开 | Ctrl+O |
| 打开文件夹 | Ctrl+Shift+O |
| 保存 | Ctrl+S |
| 另存为 | Ctrl+Shift+S |
| 导出 PDF | Ctrl+Shift+E |
| 切换主题 | Ctrl+Shift+T |
| 切换侧边栏 | Ctrl+\\ |
| 切换大纲 | Ctrl+Shift+L |
| 专注模式 | F8 |
| 打字机模式 | F9 |
| 源码模式 | Ctrl+/ |
| 查找 | Ctrl+F |
| 替换 | Ctrl+H |

导出 Word / EPUB 需要安装 [Pandoc](https://pandoc.org/installing.html)。

## 技术栈

- Electron + electron-vite
- React 19 + TypeScript
- [@milkdown/crepe](https://milkdown.dev/) — WYSIWYG Markdown 编辑器
- Tailwind CSS
- electron-builder

## 许可证

MIT
