// 侧边栏相关（Vue 侧边栏 + 浮动按钮，通过 iframe 加载 src/sidebar/index.html）

let sidebarContainer: HTMLDivElement | null = null
let sidebarIframe: HTMLIFrameElement | null = null
let sidebarToggleBtn: HTMLButtonElement | null = null
let sidebarMinimized = false

export function createSidebar(): void {
  if (sidebarContainer) return

  // 容器
  sidebarContainer = document.createElement('div')
  sidebarContainer.style.position = 'fixed'
  sidebarContainer.style.top = '0'
  // 固定在右侧
  sidebarContainer.style.right = '0'
  sidebarContainer.style.width = '400px'
  sidebarContainer.style.height = '100%'
  sidebarContainer.style.zIndex = '2147483647'
  sidebarContainer.style.boxShadow = '2px 0 8px rgba(0,0,0,0.15)'
  sidebarContainer.style.backgroundColor = 'transparent'
  sidebarContainer.style.display = 'flex'
  sidebarContainer.style.flexDirection = 'column'
  sidebarContainer.style.pointerEvents = 'none'

  const panel = document.createElement('div')
  panel.style.width = '100%'
  panel.style.height = '100%'
  panel.style.backgroundColor = '#ffffff'
  panel.style.pointerEvents = 'auto'

  sidebarIframe = document.createElement('iframe')
  sidebarIframe.src = chrome.runtime.getURL('src/sidebar/index.html')
  sidebarIframe.style.width = '100%'
  sidebarIframe.style.height = '100%'
  sidebarIframe.style.border = 'none'

  panel.appendChild(sidebarIframe)
  sidebarContainer.appendChild(panel)
  document.body.appendChild(sidebarContainer)

  // 浮动按钮
  sidebarToggleBtn = document.createElement('button')
  sidebarToggleBtn.textContent = '📚'
  sidebarToggleBtn.title = '展开/收起阅读面板'
  sidebarToggleBtn.style.position = 'fixed'
  // 挂在右侧
  sidebarToggleBtn.style.right = '8px'
  sidebarToggleBtn.style.top = '50%'
  sidebarToggleBtn.style.transform = 'translateY(-50%)'
  sidebarToggleBtn.style.width = '32px'
  sidebarToggleBtn.style.height = '32px'
  sidebarToggleBtn.style.borderRadius = '16px'
  sidebarToggleBtn.style.border = 'none'
  sidebarToggleBtn.style.backgroundColor = '#667eea'
  sidebarToggleBtn.style.color = '#fff'
  sidebarToggleBtn.style.cursor = 'pointer'
  sidebarToggleBtn.style.zIndex = '2147483647'
  sidebarToggleBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'

  sidebarToggleBtn.onclick = () => {
    sidebarMinimized = !sidebarMinimized
    updateSidebarVisibility()
  }

  document.body.appendChild(sidebarToggleBtn)
  // 默认收起
  sidebarMinimized = true
  updateSidebarVisibility()
}

function updateSidebarVisibility(): void {
  if (!sidebarContainer || !sidebarToggleBtn) return
  if (sidebarMinimized) {
    // 收起时，侧边栏滑出屏幕右侧，只保留按钮
    sidebarContainer.style.transform = 'translateX(100%)'
    sidebarToggleBtn.style.right = '8px'
  } else {
    // 展开时，面板贴右侧，按钮内移到面板左侧一点
    sidebarContainer.style.transform = 'translateX(0)'
    sidebarToggleBtn.style.right = '408px'
  }
}

export function destroySidebar(): void {
  if (sidebarContainer && sidebarContainer.parentNode) {
    sidebarContainer.parentNode.removeChild(sidebarContainer)
  }
  if (sidebarToggleBtn && sidebarToggleBtn.parentNode) {
    sidebarToggleBtn.parentNode.removeChild(sidebarToggleBtn)
  }
  sidebarContainer = null
  sidebarIframe = null
  sidebarToggleBtn = null
  sidebarMinimized = false
}
