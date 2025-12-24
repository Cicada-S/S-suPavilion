# Vue3项目安装说明

## 项目已改造为Vue3架构

本项目已使用以下技术栈重构：

- Vue 3 + TypeScript
- Vite 构建工具
- Pinia 状态管理
- Sass 样式预处理器
- Stylelint 代码检查

## 快速开始

### 1. 安装依赖

```bash
pnpm install
# 或
npm install
```

### 2. 开发模式

```bash
pnpm dev
# 或
npm run dev
```

开发模式会监听文件变化并自动构建到 `dist` 目录。

### 3. 构建生产版本

```bash
pnpm build
# 或
npm run build
```

构建完成后，`dist` 目录就是可以加载到Chrome的扩展目录。

### 4. 安装扩展

1. 打开Chrome浏览器
2. 进入 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `dist` 文件夹

## 项目结构

```text
src/
├── views/              # 视图应用
│   ├── MenuApp/        # 菜单应用（点击扩展图标弹出的启动界面）
│   │   ├── index.html  # HTML模板
│   │   ├── index.vue   # Vue主组件
│   │   └── main.ts     # 入口文件
│   └── PopupApp/       # 弹窗应用（设置界面）
│       ├── index.html  # HTML模板
│       ├── index.vue   # Vue主组件
│       └── main.ts     # 入口文件
├── content/            # Content Script
│   ├── index.ts        # 内容脚本入口
│   ├── sidebar.ts      # 侧边栏逻辑
│   └── content.css     # 内容样式
├── background/         # Background Script
│   └── index.ts        # 后台脚本
├── stores/             # Pinia状态管理
│   └── reader.ts       # 阅读器状态
├── utils/              # 工具函数
│   ├── textExtractor.ts # 文本提取工具
│   └── highlight.ts     # 高亮显示工具
├── styles/             # 全局样式
│   ├── menu.scss       # 菜单样式
│   └── popup.scss      # 弹窗样式
├── hooks/              # Vue组合式函数（预留）
├── manifest.json       # 扩展配置
└── env.d.ts            # TypeScript环境声明
```

## 代码检查

```bash
# 检查样式代码
pnpm lint:style
# 或
npm run lint:style

# 自动修复样式问题
pnpm lint:style:fix
# 或
npm run lint:style:fix
```

## 注意事项

1. 构建后的文件在 `dist` 目录
2. 开发时修改代码会自动重新构建
3. 需要重新加载扩展才能看到更改
4. 静态资源（如图标）应放在 `public` 目录，构建时会自动复制到 `dist` 目录

## 构建输出说明

构建后的 `dist` 目录包含：

- **menu.html** - 菜单界面（点击扩展图标弹出，对应 MenuApp）
- **popup.html** - 设置弹窗（对应 PopupApp）
- **content.js** - 内容脚本
- **background.js** - 后台脚本
- **content.css** - 内容样式
- **manifest.json** - 扩展配置
- **assets/** - 资源文件目录
  - `menu-*.js` - 菜单应用JS文件
  - `menu-*.css` - 菜单应用CSS文件
  - `popup-*.js` - 弹窗应用JS文件
  - `popup-*.css` - 弹窗应用CSS文件

## 视图应用说明

### MenuApp（菜单应用）

- **位置**：`src/views/MenuApp/`
- **功能**：点击扩展图标后弹出的启动界面
- **文件**：
  - `index.html` - HTML模板
  - `index.vue` - Vue主组件（包含启动/关闭开关）
  - `main.ts` - 入口文件
- **样式**：使用 `src/styles/menu.scss`
- **构建输出**：`dist/menu.html`

### PopupApp（弹窗应用）

- **位置**：`src/views/PopupApp/`
- **功能**：设置界面，包含URL输入、选择器配置等
- **文件**：
  - `index.html` - HTML模板
  - `index.vue` - Vue主组件（包含完整的设置表单）
  - `main.ts` - 入口文件
- **样式**：使用 `src/styles/popup.scss`
- **构建输出**：`dist/popup.html`

## 工具函数说明

### textExtractor.ts

文本提取工具，用于从网页中提取小说内容。

### highlight.ts

高亮显示工具，用于高亮当前正在阅读的句子。

## 迁移说明

项目已从旧结构迁移到新结构：

- ✅ 视图应用已迁移到 `src/views/` 目录
- ✅ 工具函数已迁移到 `src/utils/` 目录
- ✅ 样式文件已迁移到 `src/styles/` 目录
- ✅ Content Script 保持在 `src/content/` 目录
- ✅ Background Script 保持在 `src/background/` 目录

新的构建系统会自动处理这些文件，并生成正确的输出结构。
