// Background Script (如果需要的话)
// 目前主要用于消息转发

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 转发状态更新消息到popup
  if (request.action === 'statusUpdate') {
    // 可以在这里添加后台逻辑
  }
  return true
})

