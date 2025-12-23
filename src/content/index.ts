import './content.css'
import { createSidebar, destroySidebar } from './sidebar'
import { extractAndSplitText } from './text'
import { highlightCurrentSentence, removeHighlight } from './highlight'

// 小说语音阅读器 Content Script

const speechSynthesis: SpeechSynthesis = window.speechSynthesis
let currentUtterance: SpeechSynthesisUtterance | null = null
let isPlaying = false
let isPaused = false
let currentSpeed = 1.0
let contentSelector = ''
let nextButtonSelector = ''
let currentSentenceIndex = 0
let sentences: string[] = []
let contentElement: Element | null = null
// 连续语音错误计数，用于避免死循环
let consecutiveErrors = 0
const MAX_CONSECUTIVE_ERRORS = 3

// 初始化
function init(): void {
  // 等待页面加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
    return
  }

  // 根据开关状态决定是否显示侧边栏
  chrome.storage.sync.get(['enabled'], result => {
    const enabled = Boolean(result.enabled)
    if (enabled) {
      createSidebar()
    }
  })

  // 检查是否需要在新页面自动继续阅读
  restoreReadingIfNeeded()
}

// 如果 storage 中记录了当前 URL 正在播放，则自动继续阅读
function restoreReadingIfNeeded(): void {
  chrome.storage.local.get(['readerState'], result => {
    const state = result.readerState as
      | {
          isPlaying: boolean
          isPaused: boolean
          statusMessage?: string
          url?: string
          currentSentenceIndex?: number
          contentSelector?: string
          nextButtonSelector?: string
          speed?: number
        }
      | undefined

    if (!state) return

    // 仅当标记为正在播放且URL匹配当前页面时才自动恢复
    if (!state.isPlaying || state.isPaused) return
    if (!state.url || state.url !== window.location.href) return

    // 使用保存的配置恢复
    if (state.contentSelector) {
      contentSelector = state.contentSelector
    }
    if (state.nextButtonSelector) {
      nextButtonSelector = state.nextButtonSelector
    }
    if (state.speed) {
      currentSpeed = state.speed
    }

    // 从章节开头重新开始（或根据需要使用保存的句子索引）
    const resumeIndex =
      typeof state.currentSentenceIndex === 'number' && state.currentSentenceIndex >= 0
        ? state.currentSentenceIndex
        : 0

    startReading(contentSelector, nextButtonSelector, currentSpeed, resumeIndex)
  })
}

// 开始阅读
function startReading(
  selector: string,
  nextBtnSelector: string,
  speed: number,
  resumeFromIndex?: number
): { success: boolean; message?: string } {
  contentSelector = selector
  nextButtonSelector = nextBtnSelector
  currentSpeed = speed
  // 如果提供了恢复索引，使用它；否则从头开始
  currentSentenceIndex = resumeFromIndex !== undefined ? resumeFromIndex : 0
  isPaused = false

  // 查找内容元素
  try {
    contentElement = document.querySelector(contentSelector)
    if (!contentElement) {
      sendStatus('❌ 未找到内容元素，请检查选择器是否正确')
      return { success: false, message: '未找到内容元素' }
    }

    // 提取文本并分割成句子
    sentences = extractAndSplitText(contentElement)

    if (sentences.length === 0) {
      sendStatus('❌ 未找到可阅读的内容')
      return { success: false, message: '未找到可阅读的内容' }
    }

    // 确保索引在有效范围内
    if (currentSentenceIndex >= sentences.length) {
      currentSentenceIndex = 0
    }

    // 开始播放
    isPlaying = true
    playNextSentence()
    sendStatus(resumeFromIndex !== undefined ? '▶️ 继续阅读' : '▶️ 开始阅读')
    sendStatusUpdate()

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    sendStatus('❌ 错误：' + message)
    return { success: false, message }
  }
}

// 播放下一句
function playNextSentence(): void {
  if (!isPlaying || isPaused) return

  if (currentSentenceIndex >= sentences.length) {
    // 本章播放完毕，自动翻页
    goToNextChapter()
    return
  }

  const sentence = sentences[currentSentenceIndex]
  // 新的一句，重置错误计数
  consecutiveErrors = 0

  // 高亮当前句子
  highlightCurrentSentence(contentElement, sentence)

  // 创建语音合成
  if (currentUtterance) {
    speechSynthesis.cancel()
  }

  currentUtterance = new SpeechSynthesisUtterance(sentence)
  currentUtterance.lang = 'zh-CN'
  currentUtterance.rate = currentSpeed
  currentUtterance.pitch = 1.0
  currentUtterance.volume = 1.0

  // 播放完成回调
  currentUtterance.onend = () => {
    removeHighlight()
    currentSentenceIndex++

    // 短暂延迟后播放下一句
    setTimeout(() => {
      playNextSentence()
    }, 300)
  }

  // 错误处理
  currentUtterance.onerror = event => {
    console.error('语音合成错误:', event)
    removeHighlight()

    // 累计错误次数，防止无限循环
    consecutiveErrors += 1
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      sendStatus('❌ 语音合成连续出错，已停止阅读')
      isPlaying = false
      sendStatusUpdate(true)
      return
    }

    // 尝试跳过当前句子，继续后面的内容
    currentSentenceIndex++
    setTimeout(() => {
      playNextSentence()
    }, 500)
  }

  speechSynthesis.speak(currentUtterance)
}

// 自动翻页到下一章
function goToNextChapter(): void {
  sendStatus('📖 本章播放完毕，正在跳转到下一章...')

  try {
    const nextButton = document.querySelector(nextButtonSelector) as HTMLElement
    if (nextButton) {
      const anchor = nextButton as HTMLAnchorElement
      const href = anchor.href || anchor.getAttribute('href') || ''

      // 如果是 javascript: 链接，受扩展 CSP 限制无法执行，给出提示
      if (href.toLowerCase().startsWith('javascript:')) {
        sendStatus('❌ 下一章按钮是 javascript 链接，扩展无法自动点击，请手动翻页')
        isPlaying = false
        sendStatusUpdate(true)
        return
      }

      if (!href) {
        sendStatus('❌ 下一章按钮没有有效链接')
        isPlaying = false
        sendStatusUpdate(true)
        return
      }

      // 在跳转前记录下一章的阅读状态，供新页面自动恢复
      chrome.storage.local.set({
        readerState: {
          isPlaying: true,
          isPaused: false,
          statusMessage: '▶️ 正在播放',
          url: href,
          currentSentenceIndex: 0,
          contentSelector,
          nextButtonSelector,
          speed: currentSpeed
        }
      })

      // 通过直接跳转 URL 的方式进入下一章（等价于用户点击普通链接）
      window.location.href = href
    } else {
      sendStatus('❌ 未找到下一章按钮，阅读已停止')
      isPlaying = false
      sendStatusUpdate(true)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    sendStatus('❌ 翻页错误：' + message)
    isPlaying = false
    sendStatusUpdate(true)
  }
}

// 暂停/继续
function togglePause(): { paused: boolean } {
  if (isPaused) {
    isPaused = false
    if (currentUtterance && speechSynthesis.paused) {
      speechSynthesis.resume()
    } else {
      playNextSentence()
    }
    sendStatus('▶️ 继续播放')
    return { paused: false }
  } else {
    isPaused = true
    if (speechSynthesis.speaking) {
      speechSynthesis.pause()
    }
    sendStatus('⏸️ 已暂停')
    return { paused: true }
  }
}

// 停止
function stop(): void {
  isPlaying = false
  isPaused = false
  currentSentenceIndex = 0

  if (speechSynthesis.speaking) {
    speechSynthesis.cancel()
  }

  removeHighlight()
  currentUtterance = null
  sendStatus('⏹️ 已停止')
  sendStatusUpdate(true)
}

// 更新播放速度
function updateSpeed(speed: number): void {
  currentSpeed = speed
  // 不强制打断当前句子，只影响后续播放的语速
  // 某些浏览器支持在播放中直接修改 rate
  if (currentUtterance) {
    currentUtterance.rate = currentSpeed
  }
}

// 发送状态消息
function sendStatus(message: string): void {
  chrome.runtime.sendMessage({
    action: 'statusUpdate',
    message
  })
}

// 发送状态更新
function sendStatusUpdate(stopped = false): void {
  const status = {
    action: 'statusUpdate',
    paused: isPaused,
    stopped,
    isPlaying,
    statusMessage: getCurrentStatusMessage()
  }

  // 保存状态到storage
  if (stopped) {
    chrome.storage.local.remove('readerState')
  } else {
    // Content script 不能直接使用 chrome.tabs API
    // 通过发送消息给 background script 获取 tabId
    chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, response => {
      const tabId = response?.tabId || null
      const url = window.location.href

      chrome.storage.local.set({
        readerState: {
          isPlaying,
          isPaused,
          statusMessage: getCurrentStatusMessage(),
          tabId,
          url,
          currentSentenceIndex, // 保存当前句子索引
          contentSelector,
          nextButtonSelector,
          speed: currentSpeed
        }
      })
    })
  }

  chrome.runtime.sendMessage(status)
}

// 获取当前状态消息
function getCurrentStatusMessage(): string {
  if (!isPlaying) return '⏹️ 已停止'
  if (isPaused) return '⏸️ 已暂停'
  return '▶️ 正在播放'
}

// 获取状态
function getStatus(): {
  isPlaying: boolean
  isPaused: boolean
  statusMessage: string
  currentSentenceIndex?: number
} {
  return {
    isPlaying,
    isPaused,
    statusMessage: getCurrentStatusMessage(),
    currentSentenceIndex
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  switch (request.action) {
    case 'ping':
      // 响应ping消息，表示content script已准备好
      sendResponse({ ready: true })
      break

    case 'start':
      {
        const result = startReading(
          request.contentSelector,
          request.nextButtonSelector,
          request.speed,
          request.sentenceIndex
        )
        sendResponse(result)
      }
      break

    case 'resume':
      {
        const result = startReading(
          request.contentSelector,
          request.nextButtonSelector,
          request.speed,
          request.sentenceIndex
        )
        sendResponse(result)
      }
      break

    case 'togglePause':
      {
        const pauseResult = togglePause()
        sendStatusUpdate()
        sendResponse(pauseResult)
      }
      break

    case 'stop':
      stop()
      sendResponse({ success: true })
      break

    case 'updateSpeed':
      updateSpeed(request.speed)
      sendResponse({ success: true })
      break

    case 'nextChapter':
      // 立即中断当前朗读，不再继续本章
      if (currentUtterance) {
        // 避免触发 onend/onerror 里继续播放当前章节的逻辑
        currentUtterance.onend = null
        currentUtterance.onerror = null
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel()
        }
      }
      // 跳转到下一章，新页面会根据保存的状态自动开始阅读
      goToNextChapter()
      sendResponse({ success: true })
      break

    case 'setEnabled':
      if (request.enabled) {
        createSidebar()
      } else {
        destroySidebar()
        // 状态关闭时，停止阅读，清理高亮和进度
        stop()
      }
      sendResponse({ success: true })
      break

    case 'getStatus':
      {
        const status = getStatus()
        sendResponse(status)
      }
      break
  }

  return true // 保持消息通道开放
})

// 初始化
init()
