// 小说语音阅读器 Content Script

let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isPlaying = false;
let isPaused = false;
let currentSpeed = 1.0;
let contentSelector = '';
let nextButtonSelector = '';
let currentSentenceIndex = 0;
let sentences = [];
let contentElement = null;
let highlightElements = [];

// 初始化
function init() {
  // 等待页面加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    return;
  }
}

// 开始阅读
function startReading(selector, nextBtnSelector, speed) {
  contentSelector = selector;
  nextButtonSelector = nextBtnSelector;
  currentSpeed = speed;
  currentSentenceIndex = 0;
  isPaused = false;

  // 查找内容元素
  try {
    contentElement = document.querySelector(contentSelector);
    if (!contentElement) {
      sendStatus('❌ 未找到内容元素，请检查选择器是否正确');
      return { success: false, message: '未找到内容元素' };
    }

    // 提取文本并分割成句子
    extractAndSplitText();

    if (sentences.length === 0) {
      sendStatus('❌ 未找到可阅读的内容');
      return { success: false, message: '未找到可阅读的内容' };
    }

    // 开始播放
    isPlaying = true;
    playNextSentence();
    sendStatus('▶️ 开始阅读');

    return { success: true };
  } catch (error) {
    sendStatus('❌ 错误：' + error.message);
    return { success: false, message: error.message };
  }
}

// 提取并分割文本
function extractAndSplitText() {
  if (!contentElement) return;

  // 克隆元素以避免修改原始DOM
  const clone = contentElement.cloneNode(true);

  // 移除脚本和样式标签
  const scripts = clone.querySelectorAll('script, style');
  scripts.forEach(el => el.remove());

  // 获取纯文本
  let text = clone.textContent || clone.innerText || '';

  // 清理文本：移除多余空白
  text = text.replace(/\s+/g, ' ').trim();

  // 按句号、问号、感叹号分割句子
  sentences = text.split(/([。！？\n])/).filter(s => s.trim().length > 0);

  // 合并标点符号到前一句
  const mergedSentences = [];
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].match(/^[。！？\n]$/)) {
      if (mergedSentences.length > 0) {
        mergedSentences[mergedSentences.length - 1] += sentences[i];
      }
    } else {
      mergedSentences.push(sentences[i].trim());
    }
  }

  sentences = mergedSentences.filter(s => s.length > 0);

  // 如果句子太少，按逗号分割
  if (sentences.length < 3) {
    const temp = text.split(/([，,])/).filter(s => s.trim().length > 0);
    const merged = [];
    for (let i = 0; i < temp.length; i++) {
      if (temp[i].match(/^[，,]$/)) {
        if (merged.length > 0) {
          merged[merged.length - 1] += temp[i];
        }
      } else {
        merged.push(temp[i].trim());
      }
    }
    sentences = merged.filter(s => s.length > 5);
  }
}

// 播放下一句
function playNextSentence() {
  if (!isPlaying || isPaused) return;

  if (currentSentenceIndex >= sentences.length) {
    // 本章播放完毕，自动翻页
    goToNextChapter();
    return;
  }

  const sentence = sentences[currentSentenceIndex];

  // 高亮当前句子
  highlightCurrentSentence(sentence);

  // 创建语音合成
  if (currentUtterance) {
    speechSynthesis.cancel();
  }

  currentUtterance = new SpeechSynthesisUtterance(sentence);
  currentUtterance.lang = 'zh-CN';
  currentUtterance.rate = currentSpeed;
  currentUtterance.pitch = 1.0;
  currentUtterance.volume = 1.0;

  // 播放完成回调
  currentUtterance.onend = function () {
    removeHighlight();
    currentSentenceIndex++;

    // 短暂延迟后播放下一句
    setTimeout(() => {
      playNextSentence();
    }, 300);
  };

  // 错误处理
  currentUtterance.onerror = function (event) {
    console.error('语音合成错误:', event);
    removeHighlight();
    currentSentenceIndex++;
    setTimeout(() => {
      playNextSentence();
    }, 500);
  };

  speechSynthesis.speak(currentUtterance);
}

// 高亮当前句子
function highlightCurrentSentence(sentence) {
  removeHighlight();

  if (!contentElement) return;

  // 在原始元素中查找并高亮
  const walker = document.createTreeWalker(
    contentElement,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent;
    if (text.includes(sentence.substring(0, Math.min(10, sentence.length)))) {
      // 找到包含该句子的文本节点
      const parent = node.parentElement;
      if (parent) {
        // 创建高亮标记
        const range = document.createRange();
        const startIndex = text.indexOf(sentence.substring(0, Math.min(10, sentence.length)));
        if (startIndex !== -1) {
          try {
            range.setStart(node, startIndex);
            range.setEnd(node, Math.min(startIndex + sentence.length, text.length));

            const highlight = document.createElement('mark');
            highlight.className = 'novel-reader-highlight';
            highlight.style.cssText = 'background-color: #ffeb3b; padding: 2px 0; transition: background-color 0.3s;';

            range.surroundContents(highlight);
            highlightElements.push(highlight);

            // 滚动到高亮位置
            highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (e) {
            // 如果无法精确高亮，高亮整个父元素
            parent.style.backgroundColor = '#ffeb3b';
            parent.style.transition = 'background-color 0.3s';
            highlightElements.push(parent);
            parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
      break;
    }
  }
}

// 移除高亮
function removeHighlight() {
  highlightElements.forEach(el => {
    if (el.classList && el.classList.contains('novel-reader-highlight')) {
      // 如果是mark标签，需要恢复文本
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      }
    } else {
      // 如果是其他元素，移除背景色
      el.style.backgroundColor = '';
    }
  });
  highlightElements = [];
}

// 自动翻页到下一章
function goToNextChapter() {
  sendStatus('📖 本章播放完毕，正在跳转到下一章...');

  try {
    const nextButton = document.querySelector(nextButtonSelector);
    if (nextButton) {
      // 等待当前语音播放完成
      setTimeout(() => {
        nextButton.click();

        // 等待页面加载
        setTimeout(() => {
          // 重新初始化并开始阅读
          currentSentenceIndex = 0;
          extractAndSplitText();
          if (sentences.length > 0) {
            playNextSentence();
            sendStatus('▶️ 继续阅读下一章');
          } else {
            sendStatus('❌ 下一章未找到内容');
            isPlaying = false;
          }
        }, 2000);
      }, 1000);
    } else {
      sendStatus('❌ 未找到下一章按钮，阅读已停止');
      isPlaying = false;
      sendStatusUpdate(true);
    }
  } catch (error) {
    sendStatus('❌ 翻页错误：' + error.message);
    isPlaying = false;
    sendStatusUpdate(true);
  }
}

// 暂停/继续
function togglePause() {
  if (isPaused) {
    isPaused = false;
    if (currentUtterance && speechSynthesis.paused) {
      speechSynthesis.resume();
    } else {
      playNextSentence();
    }
    sendStatus('▶️ 继续播放');
    return { paused: false };
  } else {
    isPaused = true;
    if (speechSynthesis.speaking) {
      speechSynthesis.pause();
    }
    sendStatus('⏸️ 已暂停');
    return { paused: true };
  }
}

// 停止
function stop() {
  isPlaying = false;
  isPaused = false;
  currentSentenceIndex = 0;

  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }

  removeHighlight();
  currentUtterance = null;
  sendStatus('⏹️ 已停止');
  sendStatusUpdate(true);
}

// 更新播放速度
function updateSpeed(speed) {
  currentSpeed = speed;
  if (currentUtterance && speechSynthesis.speaking) {
    speechSynthesis.cancel();
    playNextSentence();
  }
}

// 发送状态消息
function sendStatus(message) {
  chrome.runtime.sendMessage({
    action: 'statusUpdate',
    message: message
  });
}

// 发送状态更新
function sendStatusUpdate(stopped = false) {
  chrome.runtime.sendMessage({
    action: 'statusUpdate',
    paused: isPaused,
    stopped: stopped
  });
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  switch (request.action) {
    case 'ping':
      // 响应ping消息，表示content script已准备好
      sendResponse({ ready: true });
      break;

    case 'start':
      const result = startReading(
        request.contentSelector,
        request.nextButtonSelector,
        request.speed
      );
      sendResponse(result);
      break;

    case 'togglePause':
      const pauseResult = togglePause();
      sendResponse(pauseResult);
      break;

    case 'stop':
      stop();
      sendResponse({ success: true });
      break;

    case 'updateSpeed':
      updateSpeed(request.speed);
      sendResponse({ success: true });
      break;
  }

  return true; // 保持消息通道开放
});

// 初始化
init();

