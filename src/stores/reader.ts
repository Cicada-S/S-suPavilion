import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ReaderSettings {
  url: string
  contentSelector: string
  nextButtonSelector: string
  speed: number
}

export interface ReaderResult {
  success: boolean
  message?: string
}

export interface ReaderState {
  isPlaying: boolean
  isPaused: boolean
  statusMessage: string
  tabId?: number
  url?: string
  currentSentenceIndex?: number
  contentSelector?: string
  nextButtonSelector?: string
  speed?: number
}

export const useReaderStore = defineStore('reader', () => {
  const settings = ref<ReaderSettings | null>(null)
  const readerState = ref<ReaderState | null>(null)

  // 加载设置
  const loadSettings = async (): Promise<void> => {
    return new Promise(resolve => {
      chrome.storage.sync.get(['url', 'contentSelector', 'nextButtonSelector', 'speed'], result => {
        if (result.url) {
          settings.value = {
            url: result.url,
            contentSelector: result.contentSelector || '#chaptercontent',
            nextButtonSelector: result.nextButtonSelector || '#pb_next',
            speed: result.speed || 1.0
          }
        }
        resolve()
      })
    })
  }

  // 加载阅读状态
  const loadReaderState = async (): Promise<ReaderState | null> => {
    return new Promise(resolve => {
      chrome.storage.local.get(['readerState'], result => {
        if (result.readerState) {
          readerState.value = result.readerState
          resolve(result.readerState)
        } else {
          resolve(null)
        }
      })
    })
  }

  // 保存阅读状态
  const saveReaderState = async (state: ReaderState): Promise<void> => {
    return new Promise(resolve => {
      chrome.storage.local.set({ readerState: state }, () => {
        readerState.value = state
        resolve()
      })
    })
  }

  // 清除阅读状态
  const clearReaderState = async (): Promise<void> => {
    return new Promise(resolve => {
      chrome.storage.local.remove('readerState', () => {
        readerState.value = null
        resolve()
      })
    })
  }

  // 获取当前标签页的阅读状态
  const getCurrentStatus = async (): Promise<{
    isPlaying: boolean
    isPaused: boolean
    statusMessage: string
  } | null> => {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length === 0 || !tabs[0].id) {
          resolve(null)
          return
        }
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, response => {
          if (chrome.runtime.lastError) {
            resolve(null)
          } else {
            resolve(
              response
                ? (response as { isPlaying: boolean; isPaused: boolean; statusMessage: string })
                : null
            )
          }
        })
      })
    })
  }

  // 保存设置
  const saveSettings = async (newSettings: ReaderSettings): Promise<void> => {
    return new Promise(resolve => {
      chrome.storage.sync.set(newSettings, () => {
        settings.value = newSettings
        resolve()
      })
    })
  }

  // 等待content script准备就绪
  const waitForContentScript = async (
    tabId: number,
    maxRetries = 10,
    retryDelay = 500
  ): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise<void>((resolve, reject) => {
          chrome.tabs.sendMessage(tabId, { action: 'ping' }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              resolve()
            }
          })
        })
        return true
      } catch (error) {
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }
    return false
  }

  // 开始阅读
  const startReading = async (config: ReaderSettings): Promise<ReaderResult> => {
    return new Promise(resolve => {
      chrome.tabs.query({ url: config.url }, tabs => {
        if (tabs.length > 0) {
          // 页面已打开，切换到该标签页
          chrome.tabs.update(tabs[0].id!, { active: true })
          chrome.tabs.get(tabs[0].id!, tab => {
            if (tab.status === 'complete') {
              handleStartReading(tabs[0].id!, config, resolve)
            } else {
              const onUpdatedListener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
                if (tabId === tabs[0].id && changeInfo.status === 'complete') {
                  chrome.tabs.onUpdated.removeListener(onUpdatedListener)
                  handleStartReading(tabId, config, resolve)
                }
              }
              chrome.tabs.onUpdated.addListener(onUpdatedListener)
            }
          })
        } else {
          // 打开新页面
          chrome.tabs.create({ url: config.url }, tab => {
            const onUpdatedListener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
              if (tabId === tab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(onUpdatedListener)
                handleStartReading(tabId, config, resolve)
              }
            }
            chrome.tabs.onUpdated.addListener(onUpdatedListener)
          })
        }
      })
    })
  }

  const handleStartReading = async (
    tabId: number,
    config: ReaderSettings,
    resolve: (value: ReaderResult) => void
  ) => {
    const ready = await waitForContentScript(tabId)
    if (!ready) {
      resolve({
        success: false,
        message: '无法连接到页面，请刷新页面后重试'
      })
      return
    }

    chrome.tabs.sendMessage(
      tabId,
      {
        action: 'start',
        contentSelector: config.contentSelector,
        nextButtonSelector: config.nextButtonSelector,
        speed: config.speed
      },
      response => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            message: chrome.runtime.lastError.message
          })
        } else if (response && response.success) {
          // 保存状态
          saveReaderState({
            isPlaying: true,
            isPaused: false,
            statusMessage: '▶️ 正在播放',
            tabId,
            url: config.url
          })
          resolve({ success: true })
        } else {
          resolve({
            success: false,
            message: response?.message || '启动失败'
          })
        }
      }
    )
  }

  // 恢复阅读
  const resumeReading = async (sentenceIndex: number): Promise<ReaderResult> => {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length === 0 || !tabs[0].id) {
          resolve({ success: false, message: '未找到活动标签页' })
          return
        }
        const savedState = readerState.value
        if (!savedState || !savedState.contentSelector || !savedState.nextButtonSelector) {
          resolve({ success: false, message: '缺少配置信息' })
          return
        }
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            action: 'resume',
            contentSelector: savedState.contentSelector,
            nextButtonSelector: savedState.nextButtonSelector,
            speed: savedState.speed || 1.0,
            sentenceIndex
          },
          response => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                message: chrome.runtime.lastError.message
              })
            } else if (response && response.success) {
              resolve({ success: true })
            } else {
              resolve({
                success: false,
                message: response?.message || '恢复失败'
              })
            }
          }
        )
      })
    })
  }

  // 手动切换到下一章
  const nextChapter = async (): Promise<ReaderResult> => {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length === 0 || !tabs[0].id) {
          resolve({ success: false, message: '未找到活动标签页' })
          return
        }
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            action: 'nextChapter'
          },
          response => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                message: chrome.runtime.lastError.message
              })
            } else if (response && response.success) {
              resolve({ success: true })
            } else {
              resolve({
                success: false,
                message: response?.message || '切换下一章失败'
              })
            }
          }
        )
      })
    })
  }

  // 暂停/继续
  const togglePause = async (): Promise<{ paused: boolean } | null> => {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length === 0) {
          resolve(null)
          return
        }
        chrome.tabs.sendMessage(tabs[0].id!, { action: 'togglePause' }, response => {
          if (chrome.runtime.lastError) {
            resolve(null)
          } else {
            resolve(response || { paused: false })
          }
        })
      })
    })
  }

  // 停止
  const stop = async (): Promise<void> => {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length === 0) {
          clearReaderState()
          resolve()
          return
        }
        chrome.tabs.sendMessage(tabs[0].id!, { action: 'stop' }, () => {
          clearReaderState()
          resolve()
        })
      })
    })
  }

  // 更新速度
  const updateSpeed = async (speed: number): Promise<void> => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs.length === 0) return
      chrome.tabs.sendMessage(
        tabs[0].id!,
        {
          action: 'updateSpeed',
          speed
        },
        () => {
          // 忽略错误
        }
      )
    })
  }

  return {
    settings,
    readerState,
    loadSettings,
    saveSettings,
    loadReaderState,
    saveReaderState,
    clearReaderState,
    getCurrentStatus,
    startReading,
    resumeReading,
    nextChapter,
    togglePause,
    stop,
    updateSpeed
  }
})
