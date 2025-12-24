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

## 快速开始

### 安装依赖

```bash
pnpm install
# 或
npm install
```

### 开发模式

```bash
pnpm dev
# 或
npm run dev
```

开发模式会监听文件变化并自动构建到 `dist` 目录。

### 构建生产版本

```bash
pnpm build
# 或
npm run build
```

构建完成后，`dist` 目录就是可以加载到Chrome的扩展目录。

### 代码检查

```bash
# ESLint检查并自动修复
pnpm lint

# 样式代码检查
pnpm lint:style

# 自动修复样式问题
pnpm lint:style:fix

# Prettier格式化代码
pnpm format

# 检查代码格式（不修改）
pnpm format:check
```

## 安装方法

1. 运行 `pnpm build` 构建扩展
2. 打开Chrome浏览器，进入扩展管理页面：
   - 地址栏输入 `chrome://extensions/`
   - 或者：菜单 → 更多工具 → 扩展程序
3. 开启"开发者模式"（右上角开关）
4. 点击"加载已解压的扩展程序"
5. 选择 `dist` 文件夹
6. 扩展安装完成！

## 使用方法

1. **打开扩展**：点击浏览器工具栏中的扩展图标，会弹出菜单界面（MenuApp）
2. **启动功能**：在菜单界面中开启/关闭功能
3. **打开设置**：在菜单界面中可以打开设置弹框（PopupApp）
4. **配置信息**：
   - 输入小说页面的URL
   - 输入内容区域的CSS选择器（如 `#chaptercontent` 或 `.content`）
   - 输入"下一章"按钮的CSS选择器（如 `#pb_next` 或 `.next-btn`）
5. **调整播放速度**：拖动滑块设置播放速度（0.5x - 3.0x）
6. **开始阅读**：点击"开始阅读"按钮
7. **控制播放**：
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

```text
S-suPavilion/
├── src/
│   ├── views/              # 视图应用
│   │   ├── MenuApp/        # 菜单应用（点击扩展图标弹出的启动界面）
│   │   │   ├── index.html  # HTML模板
│   │   │   ├── index.vue   # Vue主组件
│   │   │   └── main.ts     # 入口文件
│   │   └── PopupApp/       # 弹窗应用（设置界面）
│   │       ├── index.html  # HTML模板
│   │       ├── index.vue   # Vue主组件
│   │       └── main.ts     # 入口文件
│   ├── content/            # Content Script
│   │   ├── index.ts        # 内容脚本入口
│   │   ├── sidebar.ts      # 侧边栏逻辑
│   │   └── content.css     # 内容样式
│   ├── background/         # Background Script
│   │   └── index.ts        # 后台脚本
│   ├── stores/             # Pinia状态管理
│   │   └── reader.ts       # 阅读器状态
│   ├── utils/              # 工具函数
│   │   ├── textExtractor.ts # 文本提取工具
│   │   └── highlight.ts     # 高亮显示工具
│   ├── styles/             # 全局样式
│   │   ├── menu.scss       # 菜单样式
│   │   └── popup.scss      # 弹窗样式
│   ├── hooks/              # Vue组合式函数（预留）
│   ├── manifest.json       # 扩展配置
│   └── env.d.ts            # TypeScript环境声明
├── public/                 # 静态资源
│   └── icon.svg            # SVG图标源文件
├── dist/                   # 构建输出（用于加载扩展）
├── vite.config.ts          # Vite配置
├── tsconfig.json           # TypeScript配置
├── tsconfig.node.json      # Node.js TypeScript配置
├── package.json            # 项目配置
└── pnpm-lock.yaml          # 依赖锁定文件
```

## 注意事项

1. 首次使用需要允许扩展访问网页内容
2. 某些网站可能有反爬虫机制，可能影响自动翻页
3. 语音合成质量取决于浏览器的语音引擎
4. 建议在稳定的网络环境下使用
5. 开发时修改代码会自动重新构建，需要重新加载扩展才能看到更改
6. 静态资源（如图标）应放在 `public` 目录，构建时会自动复制到 `dist` 目录

## 浏览器兼容性

- Chrome 33+（支持Web Speech API）
- Edge 79+（基于Chromium）
- 其他基于Chromium的浏览器

## 开发说明

### 文件命名规范

- **视图应用**：使用 `views/` 目录，每个应用有独立的文件夹
  - `MenuApp`：菜单应用（启动界面）
  - `PopupApp`：弹窗应用（设置界面）
- **工具函数**：放在 `utils/` 目录
- **样式文件**：放在 `styles/` 目录，使用 SCSS
- **状态管理**：使用 Pinia，放在 `stores/` 目录

### 构建配置

- 使用 Vite 作为构建工具
- HTML 文件自动注入 CSS 和 JS 引用
- 资源路径自动修复为相对路径
- Content Script 和 Background Script 输出到根目录
- 视图应用的 JS/CSS 输出到 `assets/` 目录

## 许可证

MIT License
