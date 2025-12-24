import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import type { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

// 自定义插件：确保HTML文件正确生成并修复资源路径
function fixHtmlPaths(): Plugin {
  return {
    name: 'fix-html-paths',
    generateBundle(options, bundle) {
      // 在生成阶段检查 HTML 文件
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.html')) {
          console.log(`生成 HTML 文件: ${fileName}`)
        }
      }
    },
    writeBundle(options, bundle) {
      const distDir = options.dir || 'dist'

      // 查找所有 HTML 文件
      const htmlFiles: string[] = []

      // 从 bundle 中查找
      for (const fileName of Object.keys(bundle)) {
        if (fileName.endsWith('.html')) {
          htmlFiles.push(fileName)
        }
      }

      // 从文件系统中查找
      if (fs.existsSync(distDir)) {
        const files = fs.readdirSync(distDir, { recursive: true })
        for (const file of files) {
          const filePath = typeof file === 'string' ? file : file.toString()
          const fullPath = path.join(distDir, filePath)
          if (fs.statSync(fullPath).isFile() && filePath.endsWith('.html')) {
            if (!htmlFiles.includes(filePath)) {
              htmlFiles.push(filePath)
            }
          }
        }
      }

      console.log('找到的 HTML 文件:', htmlFiles)

      // 确保 popup.html 和 menu.html 存在（根据 manifest.json）
      // menu.html 是点击扩展图标后弹出的小框（MenuApp - 启动界面）
      // popup.html 是设置弹框（PopupApp - 设置界面）
      const requiredFiles = {
        'menu.html': {
          source: resolve(__dirname, 'src/views/MenuApp/index.html'),
          jsPrefix: 'menu'
        },
        'popup.html': {
          source: resolve(__dirname, 'src/views/PopupApp/index.html'),
          jsPrefix: 'popup'
        }
      }

      for (const [targetFile, config] of Object.entries(requiredFiles)) {
        const targetPath = path.join(distDir, targetFile)
        let content: string | null = null

        // 优先使用 Vite 生成的 HTML 文件（包含自动注入的 CSS 和 JS）
        if (fs.existsSync(targetPath)) {
          content = fs.readFileSync(targetPath, 'utf-8')
          console.log(`✓ 找到 Vite 生成的 ${targetFile}，修复路径...`)
        } else {
          // 如果 Vite 没有生成，从源文件创建
          console.warn(`⚠ ${targetFile} 不存在，从源文件创建...`)
          if (fs.existsSync(config.source)) {
            content = fs.readFileSync(config.source, 'utf-8')

            // 查找对应的 JS 文件（使用配置的 jsPrefix）
            const assetsDir = path.join(distDir, 'assets')
            let jsFile = `${config.jsPrefix}.js`

            if (fs.existsSync(assetsDir)) {
              const jsFiles = fs
                .readdirSync(assetsDir)
                .filter(f => f.startsWith(config.jsPrefix) && f.endsWith('.js'))
              if (jsFiles.length > 0) {
                jsFile = jsFiles[0]
              }
            }

            // 替换脚本路径
            content = content.replace(/src="\/src\/views\/[^"]+\.ts"/g, `src="./assets/${jsFile}"`)
          } else {
            console.error(`✗ 源文件不存在: ${config.source}`)
            continue
          }
        }

        if (content) {
          // 修复所有路径为相对路径
          content = content.replace(/href="\.\.\/\.\.\/\.\.\/assets\//g, 'href="./assets/')
          content = content.replace(/src="\.\.\/\.\.\/\.\.\/assets\//g, 'src="./assets/')
          content = content.replace(/href="\/assets\//g, 'href="./assets/')
          content = content.replace(/src="\/assets\//g, 'src="./assets/')
          content = content.replace(/src="\/src\//g, 'src="./assets/')

          // 检查并添加缺失的 CSS 链接
          const assetsDir = path.join(distDir, 'assets')
          if (fs.existsSync(assetsDir)) {
            // 查找对应的 CSS 文件
            const cssFiles = fs
              .readdirSync(assetsDir)
              .filter(f => f.startsWith(config.jsPrefix) && f.endsWith('.css'))
              .sort() // 排序以确保顺序一致

            // 检查 HTML 中是否已有这些 CSS 文件的链接
            const existingCssLinks: string[] = []
            const cssLinkRegex = /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/g
            let match
            while ((match = cssLinkRegex.exec(content)) !== null) {
              existingCssLinks.push(match[1])
            }

            // 添加缺失的 CSS 链接
            for (const cssFile of cssFiles) {
              const cssPath = `./assets/${cssFile}`
              // 如果 HTML 中没有这个 CSS 链接，添加它
              if (!existingCssLinks.some(link => link.includes(cssFile))) {
                // 在 </head> 之前插入 CSS 链接
                const cssLink = `  <link rel="stylesheet" href="${cssPath}">\n`
                content = content.replace('</head>', `${cssLink}</head>`)
                console.log(`✓ 已添加 CSS 链接: ${cssFile}`)
              }
            }
          }

          fs.writeFileSync(targetPath, content, 'utf-8')
          console.log(`✓ 已修复 ${targetFile} 的资源路径`)
        }
      }

      // 清理可能生成的 src 目录
      const srcDir = path.join(distDir, 'src')
      if (fs.existsSync(srcDir)) {
        try {
          fs.rmSync(srcDir, { recursive: true, force: true })
        } catch (e) {
          // 忽略删除错误
        }
      }
    }
  }
}

export default defineConfig({
  base: './', // 使用相对路径，适配Chrome扩展
  plugins: [
    vue(),
    fixHtmlPaths(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/manifest.json',
          dest: '.'
        },
        {
          src: 'src/content/content.css',
          dest: '.'
        },
        {
          src: 'public/*',
          dest: '.'
        }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        menu: resolve(__dirname, 'src/views/MenuApp/index.html'), // menu.html 对应 MenuApp
        popup: resolve(__dirname, 'src/views/PopupApp/index.html'), // popup.html 对应 PopupApp
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: {
        // content.js 和 background.js 输出到根目录
        entryFileNames: chunkInfo => {
          if (chunkInfo.name === 'content' || chunkInfo.name === 'background') {
            return '[name].js'
          }
          // popup 和 menu 的 JS 文件输出到 assets 目录
          return 'assets/[name]-[hash].js'
        },
        // 代码分割的 chunk 文件
        chunkFileNames: 'assets/[name]-[hash].js',
        // 资源文件（HTML、CSS等）
        assetFileNames: assetInfo => {
          const name = assetInfo.name || ''
          // HTML 文件输出到根目录
          if (name.endsWith('.html')) {
            // 根据 input key 确定文件名
            // Vite 会在 assetInfo 中提供相关信息
            const source = assetInfo.source ? String(assetInfo.source) : ''
            // MenuApp 对应 menu.html（点击扩展图标弹出的小框）
            if (source.includes('MenuApp') || name.includes('MenuApp')) {
              return 'menu.html'
            }
            // PopupApp 对应 popup.html（设置弹框）
            if (source.includes('PopupApp') || name.includes('PopupApp')) {
              return 'popup.html'
            }
            // 根据 input key 判断（popup key 对应 MenuApp -> menu.html，menu key 对应 PopupApp -> popup.html）
            if (name.includes('popup')) {
              return 'menu.html' // popup input key 对应 MenuApp -> menu.html
            }
            if (name.includes('menu')) {
              return 'popup.html' // menu input key 对应 PopupApp -> popup.html
            }
            // 默认使用 [name]，Vite 会替换为 input key
            return '[name].html'
          }
          // CSS 文件输出到 assets 目录
          if (name.endsWith('.css')) {
            return 'assets/[name]-[hash].[ext]'
          }
          // 其他资源文件
          return 'assets/[name]-[hash].[ext]'
        }
      }
    }
  }
})
