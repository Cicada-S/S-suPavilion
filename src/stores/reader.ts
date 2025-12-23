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

export const useReaderStore = defineStore('reader', () => {
  const settings = ref<ReaderSettings | null>(null)

  // 加载设置
  const loadSettings = async (): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['url', 'contentSelector', 'nextButtonSelector', 'speed'], (result) => {
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

  // 保存设置
  const saveSettings = async (newSettings: ReaderSettings): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.sync.set(newSettings, () => {
        settings.value = newSettings
        resolve()
      })
    })
  }

  // 等待content script准备就绪
  const waitForContentScript = async (tabId: number, maxRetries = 10, retryDelay = 500): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise<void>((resolve, reject) => {
          chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
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
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
        }
      }
    }
    return false
  }

  // 开始阅读
  const startReading = async (config: ReaderSettings): Promise<ReaderResult> => {
    return new Promise((resolve) => {
      chrome.tabs.query({ url: config.url }, (tabs) => {
        if (tabs.length > 0) {
          // 页面已打开，切换到该标签页
          chrome.tabs.update(tabs[0].id!, { active: true })
          chrome.tabs.get(tabs[0].id!, (tab) => {
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
          chrome.tabs.create({ url: config.url }, (tab) => {
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
      (response) => {
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
            message: response?.message || '启动失败'
          })
        }
      }
    )
  }

  // 暂停/继续
  const togglePause = async (): Promise<{ paused: boolean } | null> => {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          resolve(null)
          return
        }
        chrome.tabs.sendMessage(tabs[0].id!, { action: 'togglePause' }, (response) => {
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
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          resolve()
          return
        }
        chrome.tabs.sendMessage(tabs[0].id!, { action: 'stop' }, () => {
          resolve()
        })
      })
    })
  }

  // 更新速度
  const updateSpeed = async (speed: number): Promise<void> => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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
    loadSettings,
    saveSettings,
    startReading,
    togglePause,
    stop,
    updateSpeed
  }
})
