import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import type { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

// 自定义插件：重命名popup的HTML文件并移动到根目录
function renamePopupHtml(): Plugin {
  return {
    name: 'rename-popup-html',
    writeBundle(options, bundle) {
      // 查找popup的HTML文件
      const popupHtmlPath = path.join(options.dir || 'dist', 'src', 'popup', 'index.html')
      const targetPath = path.join(options.dir || 'dist', 'popup.html')
      
      if (fs.existsSync(popupHtmlPath)) {
        // 读取HTML内容
        let htmlContent = fs.readFileSync(popupHtmlPath, 'utf-8')
        
        // 修复资源路径：从相对路径改为正确的相对路径
        htmlContent = htmlContent.replace(/href="\.\.\/\.\.\/assets\//g, 'href="./assets/')
        htmlContent = htmlContent.replace(/src="\.\.\/\.\.\/assets\//g, 'src="./assets/')
        htmlContent = htmlContent.replace(/href="\/assets\//g, 'href="./assets/')
        htmlContent = htmlContent.replace(/src="\/assets\//g, 'src="./assets/')
        
        // 写入到目标位置
        fs.writeFileSync(targetPath, htmlContent, 'utf-8')
        
        // 删除原文件
        fs.unlinkSync(popupHtmlPath)
        
        // 删除空的目录
        try {
          fs.rmdirSync(path.join(options.dir || 'dist', 'src', 'popup'))
          fs.rmdirSync(path.join(options.dir || 'dist', 'src'))
        } catch (e) {
          // 忽略错误
        }
      }
    }
  }
}

export default defineConfig({
  base: './', // 使用相对路径，适配Chrome扩展
  plugins: [
    vue(),
    renamePopupHtml(),
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
        popup: resolve(__dirname, 'src/popup/index.html'),
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content' || chunkInfo.name === 'background') {
            return '[name].js'
          }
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // HTML文件输出到根目录
          if (assetInfo.name && assetInfo.name.endsWith('.html')) {
            return '[name].html'
          }
          // CSS文件保持原样
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/[name]-[hash].[ext]'
          }
          return 'assets/[name]-[hash].[ext]'
        }
      }
    }
  }
})

