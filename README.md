# MyMD

Typora 风格的 Markdown 编辑器，基于 Electron + React + Milkdown Crepe 构建。

## 功能

- 所见即所得 Markdown 编辑（GFM）
- 数学公式（KaTeX）与 Mermaid 图表
- 代码块语法高亮
- 文件树侧边栏（打开文件夹 Ctrl+Shift+O）
- 大纲面板（Ctrl+Shift+L 切换）
- 查找 / 替换（Ctrl+F / Ctrl+H）
- 图片上传至文档旁 `assets/` 目录
- 亮/暗主题
- 文件新建、打开、保存、另存为
- 导出 PDF
- 无边框窗口 + 自定义标题栏
- 命令行打开：`mymd path/to/file.md`

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
| 查找 | Ctrl+F |
| 替换 | Ctrl+H |

## 技术栈

- Electron + electron-vite
- React 19 + TypeScript
- [@milkdown/crepe](https://milkdown.dev/) — WYSIWYG Markdown 编辑器
- Tailwind CSS
- electron-builder

## 许可证

MIT
