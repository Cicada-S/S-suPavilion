// 文本提取与分句工具

/**
 * 从内容元素中提取纯文本并按句子拆分。
 * 返回拆分好的句子数组。
 */
export function extractAndSplitText(contentElement: Element | null): string[] {
  if (!contentElement) return []

  // 克隆元素以避免修改原始DOM
  const clone = contentElement.cloneNode(true) as Element

  // 移除脚本和样式标签
  const scripts = clone.querySelectorAll('script, style')
  scripts.forEach(el => el.remove())

  // 获取纯文本
  let text = clone.textContent || (clone as HTMLElement).innerText || ''

  // 清理文本：移除多余空白
  text = text.replace(/\s+/g, ' ').trim()

  // 按句号、问号、感叹号分割句子
  let sentences = text.split(/([。！？\n])/).filter(s => s.trim().length > 0)

  // 合并标点符号到前一句
  const mergedSentences: string[] = []
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].match(/^[。！？\n]$/)) {
      if (mergedSentences.length > 0) {
        mergedSentences[mergedSentences.length - 1] += sentences[i]
      }
    } else {
      mergedSentences.push(sentences[i].trim())
    }
  }

  sentences = mergedSentences.filter(s => s.length > 0)

  // 如果句子太少，按逗号分割
  if (sentences.length < 3) {
    const temp = text.split(/([，,])/).filter(s => s.trim().length > 0)
    const merged: string[] = []
    for (let i = 0; i < temp.length; i++) {
      if (temp[i].match(/^[，,]$/)) {
        if (merged.length > 0) {
          merged[merged.length - 1] += temp[i]
        }
      } else {
        merged.push(temp[i].trim())
      }
    }
    sentences = merged.filter(s => s.length > 5)
  }

  return sentences
}
