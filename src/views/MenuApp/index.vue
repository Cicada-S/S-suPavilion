<template>
  <div class="menu-app">
    <div class="header">
      <div class="title">📚 小说语音阅读器</div>
      <div class="author">作者：Cicada</div>
    </div>

    <div class="row">
      <span class="label">状态</span>
      <label class="switch">
        <input id="enabledSwitch" v-model="enabled" type="checkbox" @change="onToggle" />
        <span class="slider" />
      </label>
    </div>

    <div class="status" :class="{ active: enabled, inactive: !enabled }">
      状态：{{ enabled ? '已启动' : '已关闭' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const enabled = ref(false)

onMounted(() => {
  chrome.storage.sync.get(['enabled'], result => {
    enabled.value = Boolean(result.enabled)
  })
})

const onToggle = () => {
  const value = enabled.value
  chrome.storage.sync.set({ enabled: value }, () => {
    // 通知当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0]
      if (!tab || !tab.id) return
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: 'setEnabled',
          enabled: value
        },
        () => {
          // 忽略错误（例如当前标签页没有注入 content script）
        }
      )
    })
  })
}
</script>

<style scoped lang="scss">
.menu-app {
  width: 200px;
  padding: 16px;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f7f7fb;
  color: #333;
}

.header {
  margin-bottom: 12px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #4a4a8a;
}

.author {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

.row {
  display: flex;
  align-items: center;
  // justify-content: space-between;
  margin: 12px 0;
}

.label {
  font-size: 14px;
  color: #555;
  margin-right: 10px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
}

.switch input {
  display: none;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.2s;
  border-radius: 24px;
}

.slider::before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #fff;
  transition: 0.2s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

input:checked + .slider {
  background-color: #667eea;
}

input:checked + .slider::before {
  transform: translateX(22px);
}

.status {
  margin-top: 8px;
  font-size: 13px;
  color: #666;

  &.active {
    color: #27ae60;
  }

  &.inactive {
    color: #e74c3c;
  }
}
</style>
