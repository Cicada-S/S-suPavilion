import { createApp, type App as VueApp } from 'vue'
import { createPinia } from 'pinia'
import PopupApp from './index.vue'
import '../../styles/popup.scss'

let app: VueApp<Element> | null = null
let container: HTMLDivElement | null = null
let toggleBtn: HTMLButtonElement | null = null
let minimized = false

function mountSidebar() {
  if (app || container) return

  container = document.createElement('div')
  container.id = 'novel-voice-sidebar'
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.width = '400px'
  container.style.height = '100%'
  container.style.zIndex = '2147483647'
  container.style.boxShadow = '2px 0 8px rgba(0,0,0,0.15)'
  container.style.backgroundColor = '#ffffff'
  container.style.display = 'block'

  document.body.appendChild(container)

  app = createApp(PopupApp)
  const pinia = createPinia()
  app.use(pinia)
  app.mount(container)

  // 浮动按钮（始终在页面上，控制展开/收起）
  toggleBtn = document.createElement('button')
  toggleBtn.textContent = '📚'
  toggleBtn.title = '展开/收起阅读面板'
  toggleBtn.style.position = 'fixed'
  toggleBtn.style.left = '8px'
  toggleBtn.style.top = '50%'
  toggleBtn.style.transform = 'translateY(-50%)'
  toggleBtn.style.width = '32px'
  toggleBtn.style.height = '32px'
  toggleBtn.style.borderRadius = '16px'
  toggleBtn.style.border = 'none'
  toggleBtn.style.backgroundColor = '#667eea'
  toggleBtn.style.color = '#fff'
  toggleBtn.style.cursor = 'pointer'
  toggleBtn.style.zIndex = '2147483647'
  toggleBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'

  toggleBtn.onclick = () => {
    minimized = !minimized
    updateVisibility()
  }

  document.body.appendChild(toggleBtn)
  minimized = false
  updateVisibility()
}

function unmountSidebar() {
  if (app && container) {
    app.unmount()
  }
  if (container && container.parentNode) {
    container.parentNode.removeChild(container)
  }
  if (toggleBtn && toggleBtn.parentNode) {
    toggleBtn.parentNode.removeChild(toggleBtn)
  }
  app = null
  container = null
  toggleBtn = null
  minimized = false
}

function updateVisibility() {
  if (!container || !toggleBtn) return
  if (minimized) {
    container.style.transform = 'translateX(-100%)'
    toggleBtn.style.left = '8px'
  } else {
    container.style.transform = 'translateX(0)'
    toggleBtn.style.left = '408px'
  }
}

function init() {
  // 根据开关状态决定是否创建侧边栏
  chrome.storage.sync.get(['enabled'], result => {
    const enabled = Boolean(result.enabled)
    if (enabled) {
      mountSidebar()
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// 监听来自 popup 的开关消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'setEnabled') {
    if (request.enabled) {
      mountSidebar()
    } else {
      // 关闭时销毁侧边栏组件，并通知阅读脚本停止
      unmountSidebar()
      chrome.runtime.sendMessage({ action: 'stop' })
    }
    sendResponse({ success: true })
  }
  return true
})
