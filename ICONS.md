# 图标文件说明

扩展需要以下图标文件，请将图标文件放在 `public/` 目录下：

- `public/icon16.png` - 16x16 像素
- `public/icon48.png` - 48x48 像素  
- `public/icon128.png` - 128x128 像素

**注意**：`public/` 目录下的文件会在构建时自动复制到 `dist/` 目录。

## 快速创建图标

你可以使用以下方法快速创建图标：

1. **在线工具**：使用 [Favicon Generator](https://www.favicon-generator.org/) 生成图标
2. **简单占位符**：创建纯色PNG图片作为临时图标
3. **图标库**：从 [Flaticon](https://www.flaticon.com/) 或 [Icons8](https://icons8.com/) 下载免费图标

## 临时解决方案

如果暂时没有图标文件，可以：

1. 创建三个纯色PNG图片（16x16, 48x48, 128x128），放在 `public/` 目录
2. 或者修改 `src/manifest.json`，暂时移除图标配置（扩展仍可正常工作，只是没有图标显示）

## 当前图标

- `public/icon.svg` - SVG源文件（可用于生成PNG图标）

## 推荐图标主题

建议使用与"书籍"、"阅读"、"语音"相关的图标，例如：
- 📚 书籍图标
- 🎧 耳机图标
- 🔊 扬声器图标
- 📖 打开的书本图标
