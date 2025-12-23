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
npm install
```

### 2. 开发模式

```bash
npm run dev
```

开发模式会监听文件变化并自动构建到 `dist` 目录。

### 3. 构建生产版本

```bash
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

```
src/
├── popup/              # Popup界面（Vue3组件）
│   ├── App.vue        # 主组件
│   ├── main.ts        # 入口文件
│   ├── index.html     # HTML模板
│   └── styles/        # 样式文件（Sass）
├── content/           # Content Script（TypeScript）
│   ├── index.ts       # 内容脚本
│   └── content.css    # 内容样式
├── background/        # Background Script
│   └── index.ts       # 后台脚本
├── stores/            # Pinia状态管理
│   └── reader.ts      # 阅读器状态
└── manifest.json      # 扩展配置
public/                # 静态资源目录
└── icon.svg           # SVG图标源文件
```

## 代码检查

```bash
# 检查样式代码
npm run lint:style

# 自动修复样式问题
npm run lint:style:fix
```

## 注意事项

1. 构建后的文件在 `dist` 目录
2. 开发时修改代码会自动重新构建
3. 需要重新加载扩展才能看到更改
4. 静态资源（如图标）应放在 `public` 目录，构建时会自动复制到 `dist` 目录

## 迁移说明

旧的文件结构已保留在根目录，但不会被使用：
- `popup.html`, `popup.js`, `popup.css` - 已迁移到 `src/popup/`
- `content.js` - 已迁移到 `src/content/index.ts`
- `manifest.json` - 已迁移到 `src/manifest.json`

新的构建系统会自动处理这些文件。
