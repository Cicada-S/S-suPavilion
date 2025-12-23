// Background Script
// 用于处理需要 tabs API 的操作

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 获取当前标签页 ID
  if (request.action === 'getCurrentTabId') {
    if (sender.tab && sender.tab.id) {
      sendResponse({ tabId: sender.tab.id })
    } else {
      // 如果没有 sender.tab，尝试查询当前活动标签页
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length > 0 && tabs[0].id) {
          sendResponse({ tabId: tabs[0].id })
        } else {
          sendResponse({ tabId: null })
        }
      })
      return true // 保持消息通道开放
    }
  }
  return true
})
