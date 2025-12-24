<template>
  <div class="app">
    <h1>📚 小说语音阅读器</h1>

    <div class="form-group">
      <label for="urlInput">小说页面URL：</label>
      <div class="url-row">
        <input
          id="urlInput"
          v-model="settings.url"
          type="text"
          placeholder="https://example.com/book/1.html"
        />
        <button type="button" class="btn btn-small" @click="handleFillCurrentUrl">当前页</button>
      </div>
    </div>

    <div class="form-group">
      <label for="contentSelector">内容选择器（CSS）：</label>
      <input
        id="contentSelector"
        v-model="settings.contentSelector"
        type="text"
        placeholder="#chaptercontent 或 .content"
      />
      <small>使用CSS选择器定位小说内容区域</small>
    </div>

    <div class="form-group">
      <label for="nextButtonSelector">下一章按钮选择器（CSS）：</label>
      <input
        id="nextButtonSelector"
        v-model="settings.nextButtonSelector"
        type="text"
        placeholder="#pb_next 或 .next-btn"
      />
      <small>使用CSS选择器定位"下一章"按钮</small>
    </div>

    <div class="form-group">
      <label for="speedInput">
        播放速度：<span class="speed-value">{{ settings.speed }}x</span>
      </label>
      <input
        id="speedInput"
        v-model.number="settings.speed"
        type="range"
        min="0.5"
        max="3.0"
        step="0.1"
      />
    </div>

    <div class="button-group">
      <button class="btn btn-primary" :disabled="isPlaying" @click="handleStart">开始阅读</button>
      <button class="btn btn-secondary" :disabled="!isPlaying" @click="handleTogglePause">
        {{ isPaused ? '继续' : '暂停' }}
      </button>
      <button class="btn btn-secondary" :disabled="!isPlaying" @click="handleNextChapter">
        下一章
      </button>
      <button class="btn btn-danger" :disabled="!isPlaying" @click="handleStop">停止</button>
    </div>

    <div class="status" :class="{ error: isError }">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useReaderStore } from '@/stores/reader'

const readerStore = useReaderStore()

const settings = ref({
  url: '', // 默认空，后续自动填充当前页面URL
  contentSelector: '#chaptercontent',
  nextButtonSelector: '#pb_next',
  speed: 3.0
})

const statusMessage = ref('准备就绪')
const isError = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)

// 获取当前活动标签页 URL
const getCurrentTabUrl = (): Promise<string | null> => {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0]
      resolve(tab && tab.url ? tab.url : null)
    })
  })
}

// 从当前激活标签页填充URL
const fillUrlFromCurrentTab = async () => {
  const url = await getCurrentTabUrl()
  if (url) {
    settings.value.url = url
  }
}

// 加载保存的设置和状态
onMounted(async () => {
  await readerStore.loadSettings()
  if (readerStore.settings) {
    settings.value = { ...readerStore.settings }
  }

  // 每次打开 popup 时都用当前标签页 URL 覆盖（用户手动改除外）
  await fillUrlFromCurrentTab()

  // 加载并恢复阅读状态
  const savedState = await readerStore.loadReaderState()
  if (savedState) {
    // 检查保存的标签页是否还存在
    if (savedState.tabId) {
      try {
        chrome.tabs.get(savedState.tabId, () => {
          if (chrome.runtime.lastError) {
            // 标签页不存在，清除状态
            readerStore.clearReaderState()
          } else {
            // 标签页存在，查询实际状态
            readerStore.getCurrentStatus().then(
              (
                currentStatus: {
                  isPlaying: boolean
                  isPaused: boolean
                  statusMessage: string
                  currentSentenceIndex?: number
                } | null
              ) => {
                if (currentStatus) {
                  isPlaying.value = currentStatus.isPlaying
                  isPaused.value = currentStatus.isPaused
                  statusMessage.value = currentStatus.statusMessage
                  isError.value = currentStatus.statusMessage.includes('❌')
                } else {
                  // 无法获取状态，使用保存的状态
                  isPlaying.value = savedState.isPlaying
                  isPaused.value = savedState.isPaused
                  statusMessage.value = savedState.statusMessage
                  isError.value = savedState.statusMessage.includes('❌')
                }
              }
            )
          }
        })
      } catch (e) {
        // 出错时清除状态
        readerStore.clearReaderState()
      }
    }
  } else {
    // 没有保存的状态，尝试查询当前标签页的状态
    const currentStatus = await readerStore.getCurrentStatus()
    if (currentStatus) {
      isPlaying.value = currentStatus.isPlaying
      isPaused.value = currentStatus.isPaused
      statusMessage.value = currentStatus.statusMessage
      isError.value = currentStatus.statusMessage.includes('❌')
    }
  }

  // 监听状态更新
  chrome.runtime.onMessage.addListener(request => {
    if (request.action === 'statusUpdate') {
      statusMessage.value = request.message || request.statusMessage || statusMessage.value
      isError.value = statusMessage.value.includes('❌')
      if (request.paused !== undefined) {
        isPaused.value = request.paused
      }
      if (request.isPlaying !== undefined) {
        isPlaying.value = request.isPlaying
      }
      if (request.stopped) {
        isPlaying.value = false
        isPaused.value = false
      }
    }
  })
})

// 监听速度变化
watch(
  () => settings.value.speed,
  newSpeed => {
    readerStore.updateSpeed(newSpeed)
  }
)

const handleStart = async () => {
  // 每次点击开始阅读时，都优先使用当前标签页 URL
  const currentUrl = await getCurrentTabUrl()
  if (currentUrl) {
    settings.value.url = currentUrl
  }

  if (
    !settings.value.url ||
    !settings.value.contentSelector ||
    !settings.value.nextButtonSelector
  ) {
    statusMessage.value = '❌ 请填写所有字段'
    isError.value = true
    return
  }

  // 检查是否已有保存的状态，如果有且正在播放，则恢复播放
  const savedState = await readerStore.loadReaderState()
  if (
    savedState &&
    savedState.isPlaying &&
    !savedState.isPaused &&
    savedState.currentSentenceIndex !== undefined &&
    savedState.contentSelector === settings.value.contentSelector
  ) {
    // 恢复播放
    statusMessage.value = '✅ 正在恢复...'
    isError.value = false
    isPlaying.value = true

    await readerStore.saveSettings(settings.value)
    const result = await readerStore.resumeReading(savedState.currentSentenceIndex)

    if (result.success) {
      statusMessage.value = '▶️ 继续播放'
      isError.value = false
    } else {
      // 恢复失败，重新开始
      const startResult = await readerStore.startReading(settings.value)
      if (startResult.success) {
        statusMessage.value = '▶️ 正在播放'
        isError.value = false
      } else {
        statusMessage.value = `❌ ${startResult.message || '启动失败'}`
        isError.value = true
        isPlaying.value = false
      }
    }
  } else {
    // 重新开始
    statusMessage.value = '✅ 正在启动...'
    isError.value = false
    isPlaying.value = true

    await readerStore.saveSettings(settings.value)
    const result = await readerStore.startReading(settings.value)

    if (result.success) {
      statusMessage.value = '▶️ 正在播放'
      isError.value = false
    } else {
      statusMessage.value = `❌ ${result.message || '启动失败'}`
      isError.value = true
      isPlaying.value = false
    }
  }
}

// 供按钮调用
const handleFillCurrentUrl = () => {
  void fillUrlFromCurrentTab()
}

const handleTogglePause = async () => {
  const result = await readerStore.togglePause()
  if (result) {
    isPaused.value = result.paused
    statusMessage.value = result.paused ? '⏸️ 已暂停' : '▶️ 正在播放'
    // 更新保存的状态
    const currentStatus = await readerStore.getCurrentStatus()
    if (currentStatus) {
      await readerStore.saveReaderState({
        isPlaying: isPlaying.value,
        isPaused: isPaused.value,
        statusMessage: statusMessage.value
      })
    }
  }
}

const handleNextChapter = async () => {
  const result = await readerStore.nextChapter()
  if (!result.success && result.message) {
    statusMessage.value = `❌ ${result.message}`
    isError.value = true
  }
}

const handleStop = async () => {
  await readerStore.stop()
  isPlaying.value = false
  isPaused.value = false
  statusMessage.value = '⏹️ 已停止'
  isError.value = false
}
</script>

<style lang="scss" scoped>
.app {
  width: 400px;
  padding: 20px;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: white;
  border-radius: 8px;
}

h1 {
  font-size: 20px;
  margin-bottom: 20px;
  text-align: center;
  color: #667eea;
}

.form-group {
  margin-bottom: 15px;

  label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #555;
    font-size: 14px;
  }

  input[type='text'] {
    width: 100%;
    padding: 10px;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.3s;

    &:focus {
      outline: none;
      border-color: #667eea;
    }
  }

  small {
    display: block;
    margin-top: 5px;
    color: #888;
    font-size: 12px;
  }

  input[type='range'] {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #e0e0e0;
    outline: none;
    appearance: none;
    -webkit-appearance: none;

    &::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #667eea;
      cursor: pointer;
    }

    &::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #667eea;
      cursor: pointer;
      border: none;
    }
  }
}

.speed-value {
  color: #667eea;
  font-weight: bold;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &-primary {
    background: #667eea;
    color: white;

    &:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
    }
  }

  &-secondary {
    background: #f39c12;
    color: white;

    &:hover:not(:disabled) {
      background: #e67e22;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(243, 156, 18, 0.3);
    }
  }

  &-danger {
    background: #e74c3c;
    color: white;

    &:hover:not(:disabled) {
      background: #c0392b;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
    }
  }
}

.url-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-small {
  flex: 0 0 auto;
  padding: 8px 10px;
  font-size: 12px;
}

.status {
  margin-top: 15px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  text-align: center;
  font-size: 13px;
  color: #666;
  min-height: 20px;

  &.error {
    color: #e74c3c;
  }
}
</style>
