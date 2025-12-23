# 小说语音阅读器 Chrome 扩展

一个功能强大的Chrome浏览器扩展，可以将网页小说内容转换为语音并自动播放，支持自动翻页、播放速度控制和实时高亮显示。

## 技术栈

- **Vue 3** - 渐进式JavaScript框架
- **TypeScript** - 类型安全的JavaScript
- **Vite** - 下一代前端构建工具
- **Pinia** - Vue的状态管理库
- **Sass** - CSS预处理器
- **ESLint** - JavaScript/TypeScript代码检查工具
- **Prettier** - 代码格式化工具
- **Stylelint** - CSS代码检查工具

## 功能特性

- ✅ **文本转语音**：使用Web Speech API将小说内容转换为语音
- ✅ **自动翻页**：播放完一章后自动跳转到下一章
- ✅ **播放速度控制**：支持0.5x到3.0x的播放速度调节
- ✅ **实时高亮**：正在阅读的句子会高亮显示并自动滚动
- ✅ **CSS选择器支持**：支持使用CSS选择器定位内容，兼容各种网站

## 开发

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

开发模式会监听文件变化并自动构建。

### 构建生产版本

```bash
npm run build
```

构建完成后，`dist` 目录就是可以加载到Chrome的扩展目录。

### 代码检查

```bash
# ESLint检查并自动修复
npm run lint

# 样式代码检查
npm run lint:style

# 自动修复样式问题
npm run lint:style:fix

# Prettier格式化代码
npm run format

# 检查代码格式（不修改）
npm run format:check
```

## 安装方法

1. 运行 `npm run build` 构建扩展
2. 打开Chrome浏览器，进入扩展管理页面：
   - 地址栏输入 `chrome://extensions/`
   - 或者：菜单 → 更多工具 → 扩展程序
3. 开启"开发者模式"（右上角开关）
4. 点击"加载已解压的扩展程序"
5. 选择 `dist` 文件夹
6. 扩展安装完成！

## 使用方法

1. **打开扩展**：点击浏览器工具栏中的扩展图标
2. **输入信息**：
   - 输入小说页面的URL
   - 输入内容区域的CSS选择器（如 `#chaptercontent` 或 `.content`）
   - 输入"下一章"按钮的CSS选择器（如 `#pb_next` 或 `.next-btn`）
3. **调整播放速度**：拖动滑块设置播放速度（0.5x - 3.0x）
4. **开始阅读**：点击"开始阅读"按钮
5. **控制播放**：
   - 点击"暂停"可暂停/继续播放
   - 点击"停止"可停止播放

## 如何获取CSS选择器

1. 打开目标小说页面
2. 按 `F12` 打开开发者工具
3. 点击左上角的"选择元素"工具（或按 `Ctrl+Shift+C`）
4. 点击页面中的小说内容区域
5. 在开发者工具中，右键点击高亮的HTML元素
6. 选择"复制" → "复制选择器"
7. 将复制的选择器粘贴到扩展的输入框中

## 项目结构

```
c-suPavilion/
├── src/
│   ├── popup/           # Popup界面（Vue3组件）
│   │   ├── App.vue      # 主组件
│   │   ├── main.ts       # 入口文件
│   │   ├── index.html    # HTML模板
│   │   └── styles/       # 样式文件（Sass）
│   ├── content/          # Content Script（TypeScript）
│   │   ├── index.ts      # 内容脚本
│   │   └── content.css   # 内容样式
│   ├── background/       # Background Script
│   │   └── index.ts      # 后台脚本
│   ├── stores/           # Pinia状态管理
│   │   └── reader.ts     # 阅读器状态
│   └── manifest.json     # 扩展配置
├── public/               # 静态资源（图标等）
│   └── icon.svg          # SVG图标源文件
├── dist/                 # 构建输出（用于加载扩展）
├── vite.config.ts        # Vite配置
├── tsconfig.json         # TypeScript配置
├── .eslintrc.cjs          # ESLint配置
├── .prettierrc.json       # Prettier配置
├── .prettierignore        # Prettier忽略文件
├── .stylelintrc.json      # Stylelint配置
└── package.json           # 项目配置
```

## 注意事项

1. 首次使用需要允许扩展访问网页内容
2. 某些网站可能有反爬虫机制，可能影响自动翻页
3. 语音合成质量取决于浏览器的语音引擎
4. 建议在稳定的网络环境下使用

## 浏览器兼容性

- Chrome 33+（支持Web Speech API）
- Edge 79+（基于Chromium）
- 其他基于Chromium的浏览器

## 许可证

MIT License
