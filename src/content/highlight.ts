// 高亮当前句子

let highlightElements: Element[] = []

export function highlightCurrentSentence(contentElement: Element | null, sentence: string): void {
  removeHighlight()

  if (!contentElement) return

  // 使用更长的匹配前缀，提高匹配准确性
  // 如果句子长度超过20，使用前20个字符；否则使用完整句子
  const matchLength = Math.min(20, sentence.length)
  const matchText = sentence.substring(0, matchLength).trim()

  // 在原始元素中查找并高亮
  const walker = document.createTreeWalker(contentElement, NodeFilter.SHOW_TEXT)

  let node: Node | null
  let found = false
  while ((node = walker.nextNode()) && !found) {
    const text = node.textContent || ''
    // 使用更精确的匹配：查找完整句子或至少匹配较长的前缀
    const searchText = matchLength >= 20 ? matchText : sentence.trim()
    const index = text.indexOf(searchText)

    if (index !== -1) {
      // 找到包含该句子的文本节点
      const parent = node.parentElement
      if (parent) {
        try {
          const range = document.createRange()
          // 尝试匹配完整句子
          const fullSentenceIndex = text.indexOf(sentence.trim())
          if (fullSentenceIndex !== -1) {
            range.setStart(node, fullSentenceIndex)
            range.setEnd(node, Math.min(fullSentenceIndex + sentence.length, text.length))
          } else {
            // 如果找不到完整句子，使用匹配的前缀
            range.setStart(node, index)
            range.setEnd(node, Math.min(index + searchText.length, text.length))
          }

          const highlight = document.createElement('mark')
          highlight.className = 'novel-reader-highlight'
          highlight.style.cssText =
            'background-color: #ffeb3b; padding: 2px 0; transition: background-color 0.3s;'

          range.surroundContents(highlight)
          highlightElements.push(highlight)

          // 滚动到高亮位置
          highlight.scrollIntoView({ behavior: 'smooth', block: 'center' })
          found = true
        } catch (e) {
          // 如果无法精确高亮，高亮整个父元素
          ;(parent as HTMLElement).style.backgroundColor = '#ffeb3b'
          ;(parent as HTMLElement).style.transition = 'background-color 0.3s'
          highlightElements.push(parent)
          parent.scrollIntoView({ behavior: 'smooth', block: 'center' })
          found = true
        }
      }
    }
  }
}

// 移除高亮
export function removeHighlight(): void {
  highlightElements.forEach(el => {
    if (el.classList && el.classList.contains('novel-reader-highlight')) {
      // 如果是mark标签，需要恢复文本
      const parent = el.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el)
        parent.normalize()
      }
    } else {
      // 如果是其他元素，移除背景色
      ;(el as HTMLElement).style.backgroundColor = ''
    }
  })
  highlightElements = []
}
