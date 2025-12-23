document.addEventListener('DOMContentLoaded', function () {
  const urlInput = document.getElementById('urlInput');
  const contentSelector = document.getElementById('contentSelector');
  const nextButtonSelector = document.getElementById('nextButtonSelector');
  const speedInput = document.getElementById('speedInput');
  const speedValue = document.getElementById('speedValue');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const status = document.getElementById('status');

  // 加载保存的设置
  chrome.storage.sync.get(['url', 'contentSelector', 'nextButtonSelector', 'speed'], function (result) {
    if (result.url) urlInput.value = result.url;
    if (result.contentSelector) contentSelector.value = result.contentSelector;
    if (result.nextButtonSelector) nextButtonSelector.value = result.nextButtonSelector;
    if (result.speed) {
      speedInput.value = result.speed;
      speedValue.textContent = result.speed;
    }
  });

  // 播放速度显示
  speedInput.addEventListener('input', function () {
    speedValue.textContent = speedInput.value;
    chrome.storage.sync.set({ speed: speedInput.value });

    // 通知content script更新速度
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length === 0) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateSpeed',
        speed: parseFloat(speedInput.value)
      }, function () {
        // 忽略错误，因为可能还没有开始阅读
      });
    });
  });

  // 开始阅读
  startBtn.addEventListener('click', function () {
    const url = urlInput.value.trim();
    const contentSel = contentSelector.value.trim();
    const nextBtnSel = nextButtonSelector.value.trim();

    if (!url || !contentSel || !nextBtnSel) {
      status.textContent = '❌ 请填写所有字段';
      status.style.color = '#e74c3c';
      return;
    }

    // 保存设置
    chrome.storage.sync.set({
      url: url,
      contentSelector: contentSel,
      nextButtonSelector: nextBtnSel,
      speed: speedInput.value
    });

    // 打开或切换到目标页面
    chrome.tabs.query({ url: url }, function (tabs) {
      if (tabs.length > 0) {
        // 页面已打开，切换到该标签页
        chrome.tabs.update(tabs[0].id, { active: true });
        // 检查页面状态
        chrome.tabs.get(tabs[0].id, function (tab) {
          if (tab.status === 'complete') {
            waitForContentScript(tabs[0].id, contentSel, nextBtnSel, speedInput.value);
          } else {
            // 页面还在加载，等待加载完成
            const onUpdatedListener = function (tabId, changeInfo) {
              if (tabId === tabs[0].id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(onUpdatedListener);
                waitForContentScript(tabs[0].id, contentSel, nextBtnSel, speedInput.value);
              }
            };
            chrome.tabs.onUpdated.addListener(onUpdatedListener);
          }
        });
      } else {
        // 打开新页面
        chrome.tabs.create({ url: url }, function (tab) {
          // 监听页面加载完成
          const onUpdatedListener = function (tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(onUpdatedListener);
              waitForContentScript(tab.id, contentSel, nextBtnSel, speedInput.value);
            }
          };
          chrome.tabs.onUpdated.addListener(onUpdatedListener);
        });
      }
    });

    status.textContent = '✅ 正在启动...';
    status.style.color = '#27ae60';
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
  });

  // 暂停/继续
  pauseBtn.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length === 0) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePause' }, function (response) {
        if (chrome.runtime.lastError) {
          status.textContent = '❌ 无法连接到页面';
          status.style.color = '#e74c3c';
          return;
        }
        if (response && response.paused) {
          pauseBtn.textContent = '继续';
          status.textContent = '⏸️ 已暂停';
        } else {
          pauseBtn.textContent = '暂停';
          status.textContent = '▶️ 正在播放';
        }
      });
    });
  });

  // 停止
  stopBtn.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length === 0) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stop' }, function () {
        if (chrome.runtime.lastError) {
          // 即使出错也重置UI
        }
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        pauseBtn.textContent = '暂停';
        status.textContent = '⏹️ 已停止';
        status.style.color = '#666';
      });
    });
  });

  // 等待content script准备就绪并发送消息
  function waitForContentScript(tabId, contentSel, nextBtnSel, speed, retryCount = 0) {
    const maxRetries = 10;
    const retryDelay = 500;

    chrome.tabs.sendMessage(tabId, {
      action: 'ping'
    }, function (response) {
      if (chrome.runtime.lastError) {
        // content script 还未注入，重试
        if (retryCount < maxRetries) {
          setTimeout(() => {
            waitForContentScript(tabId, contentSel, nextBtnSel, speed, retryCount + 1);
          }, retryDelay);
        } else {
          status.textContent = '❌ 无法连接到页面，请刷新页面后重试';
          status.style.color = '#e74c3c';
          startBtn.disabled = false;
          pauseBtn.disabled = true;
          stopBtn.disabled = true;
        }
      } else {
        // content script 已准备好，发送开始消息
        sendStartMessage(tabId, contentSel, nextBtnSel, speed);
      }
    });
  }

  function sendStartMessage(tabId, contentSel, nextBtnSel, speed) {
    chrome.tabs.sendMessage(tabId, {
      action: 'start',
      contentSelector: contentSel,
      nextButtonSelector: nextBtnSel,
      speed: parseFloat(speed)
    }, function (response) {
      if (chrome.runtime.lastError) {
        status.textContent = '❌ 错误：' + chrome.runtime.lastError.message;
        status.style.color = '#e74c3c';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
      } else if (response && response.success) {
        status.textContent = '▶️ 正在播放';
        status.style.color = '#27ae60';
      } else if (response && !response.success) {
        status.textContent = '❌ ' + (response.message || '启动失败');
        status.style.color = '#e74c3c';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
      }
    });
  }

  // 监听来自content script的状态更新
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'statusUpdate') {
      status.textContent = request.message;
      if (request.paused !== undefined) {
        pauseBtn.textContent = request.paused ? '继续' : '暂停';
      }
      if (request.stopped) {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        pauseBtn.textContent = '暂停';
      }
    }
  });
});

