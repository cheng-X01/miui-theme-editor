/**
 * MAML 代码补全组件
 * 实现 Copilot 式的实时代码补全
 * 监听 textarea 输入，当用户停止输入 500ms 后触发补全请求
 * 在光标位置显示幽灵文本（灰色半透明建议）
 * 用户按 Tab 接受建议，按 Esc 拒绝
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Spin, Tooltip } from 'antd'
import { LoadingOutlined, RobotOutlined } from '@ant-design/icons'

// AI Orchestrator 接口（模拟，实际项目中应从对应模块导入）
interface AIOrchestrator {
  completeCode: (context: CodeCompletionContext) => Promise<string>
}

interface CodeCompletionContext {
  codeBeforeCursor: string
  codeAfterCursor: string
  elementType?: string
  language: string
}

// 模拟 AI Orchestrator 代码补全服务
const mockAIOrchestrator: AIOrchestrator = {
  completeCode: async (context: CodeCompletionContext): Promise<string> => {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400))

    const code = context.codeBeforeCursor.trim()

    // 根据上下文提供智能补全建议
    if (code.endsWith('<Ani')) {
      return `mation type="AlphaAnimation" from="0" to="1" duration="1000" ease="Linear"/>`
    }
    if (code.endsWith('<Trig')) {
      return `ger action="click" target="element1" operation="show"/>`
    }
    if (code.endsWith('<Text')) {
      return ` text="Hello World" x="100" y="200" color="#ffffff"/>`
    }
    if (code.endsWith('<Image')) {
      return ` src="image.png" x="0" y="0" width="100" height="100"/>`
    }
    if (code.endsWith('ease="')) {
      return 'Linear"'
    }
    if (code.endsWith('type="')) {
      return 'AlphaAnimation"'
    }
    if (code.endsWith('from="')) {
      return '0"'
    }
    if (code.endsWith('to="')) {
      return '1"'
    }
    if (code.endsWith('duration="')) {
      return '1000"'
    }
    if (code.endsWith('delay="')) {
      return '0"'
    }

    // 通用属性补全
    if (code.endsWith(' ')) {
      const lastTag = code.match(/<(\w+)[^>]*\s$/)?.[1]
      if (lastTag === 'Text') {
        return 'text="" x="0" y="0" color="#ffffff" size="16"'
      }
      if (lastTag === 'Image') {
        return 'src="" x="0" y="0" width="100" height="100"'
      }
      if (lastTag === 'Rectangle') {
        return 'x="0" y="0" width="100" height="100" fill="#ff6b6b"'
      }
      if (lastTag === 'Animation' || lastTag?.includes('Animation')) {
        return 'from="0" to="1" duration="1000" ease="Linear" loop="false"'
      }
    }

    // 默认补全：闭合标签
    const lastOpenTag = code.match(/<(\w+)[^>]*>$/)?.[1]
    if (lastOpenTag) {
      return `/>`
    }

    return ''
  },
}

interface MAMLCodeCompletionProps {
  code: string
  cursorPosition: number
  elementType?: string // 当前编辑的元素类型，用于上下文
  onAccept: (completion: string) => void
}

// 获取光标在屏幕上的位置
const getCaretCoordinates = (
  textarea: HTMLTextAreaElement,
  position: number
): { top: number; left: number } => {
  // 创建临时元素来计算位置
  const div = document.createElement('div')
  const style = getComputedStyle(textarea)

  // 复制 textarea 的样式到 div
  const propertiesToCopy = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'letterSpacing',
    'lineHeight',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderWidth',
    'boxSizing',
    'whiteSpace',
    'wordWrap',
    'overflowX',
  ]

  propertiesToCopy.forEach((prop) => {
    div.style.setProperty(prop, style.getPropertyValue(prop))
  })

  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.width = `${textarea.clientWidth}px`
  div.style.height = 'auto'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordWrap = 'break-word'

  // 获取光标前的文本
  const textBeforeCursor = textarea.value.substring(0, position)
  const textAfterCursor = textarea.value.substring(position)

  // 创建 span 标记光标位置
  const span = document.createElement('span')
  span.textContent = '|'

  div.textContent = textBeforeCursor
  div.appendChild(span)
  div.appendChild(document.createTextNode(textAfterCursor))

  document.body.appendChild(div)

  const spanRect = span.getBoundingClientRect()
  const textareaRect = textarea.getBoundingClientRect()

  const result = {
    top: spanRect.top - textareaRect.top + textarea.scrollTop,
    left: spanRect.left - textareaRect.left + textarea.scrollLeft,
  }

  document.body.removeChild(div)

  return result
}

const MAMLCodeCompletion: React.FC<MAMLCodeCompletionProps> = ({
  code,
  cursorPosition,
  elementType,
  onAccept,
}) => {
  // 幽灵文本状态
  const [ghostText, setGhostText] = useState('')
  const [ghostPosition, setGhostPosition] = useState({ top: 0, left: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // 用于防抖的定时器引用
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  // textarea 引用（由父组件通过 ref 传递）
  const containerRef = useRef<HTMLDivElement>(null)

  // 触发补全请求
  const requestCompletion = useCallback(
    async (textarea: HTMLTextAreaElement, pos: number) => {
      const codeBeforeCursor = code.substring(0, pos)
      const codeAfterCursor = code.substring(pos)

      // 如果光标前没有内容，不请求补全
      if (codeBeforeCursor.trim().length === 0) {
        setIsVisible(false)
        return
      }

      setIsLoading(true)
      setIsVisible(true)

      try {
        const context: CodeCompletionContext = {
          codeBeforeCursor,
          codeAfterCursor,
          elementType,
          language: 'maml',
        }

        // 调用 AI Orchestrator 的 completeCode 方法
        const completion = await mockAIOrchestrator.completeCode(context)

        if (completion && completion.trim().length > 0) {
          // 计算光标位置
          const coords = getCaretCoordinates(textarea, pos)
          setGhostPosition(coords)
          setGhostText(completion)
        } else {
          setIsVisible(false)
        }
      } catch (error) {
        console.error('代码补全请求失败:', error)
        setIsVisible(false)
      } finally {
        setIsLoading(false)
      }
    },
    [code, elementType]
  )

  // 接受建议
  const acceptCompletion = useCallback(() => {
    if (ghostText && isVisible) {
      onAccept(ghostText)
      setIsVisible(false)
      setGhostText('')
    }
  }, [ghostText, isVisible, onAccept])

  // 拒绝建议
  const rejectCompletion = useCallback(() => {
    setIsVisible(false)
    setGhostText('')
  }, [])

  // 监听键盘事件（Tab 接受，Esc 拒绝）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return

      if (e.key === 'Tab') {
        e.preventDefault()
        acceptCompletion()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        rejectCompletion()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, acceptCompletion, rejectCompletion])

  // 监听代码和光标位置变化，触发防抖补全
  useEffect(() => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 隐藏当前建议
    setIsVisible(false)
    setGhostText('')

    // 设置新的防抖定时器（500ms）
    debounceTimerRef.current = setTimeout(() => {
      // 查找 textarea 元素
      const textarea = document.querySelector('.code-editor-textarea') as HTMLTextAreaElement
      if (textarea) {
        requestCompletion(textarea, cursorPosition)
      }
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [code, cursorPosition, requestCompletion])

  // 如果没有显示，不渲染任何内容
  if (!isVisible) {
    return <div ref={containerRef} style={{ display: 'none' }} />
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', pointerEvents: 'none' }}>
      {/* 幽灵文本层 */}
      <div
        style={{
          position: 'absolute',
          top: ghostPosition.top,
          left: ghostPosition.left,
          zIndex: 10,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            color: 'rgba(255, 255, 255, 0.35)',
            fontFamily: '"Fira Code", "Consolas", monospace',
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: 'pre',
            userSelect: 'none',
          }}
        >
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LoadingOutlined style={{ color: '#4ecdc4', fontSize: 12 }} />
              <span style={{ color: '#4ecdc4', fontSize: 12 }}>AI 思考中...</span>
            </span>
          ) : (
            ghostText
          )}
        </span>

        {/* 操作提示 */}
        {!isLoading && ghostText && (
          <Tooltip title="按 Tab 接受，Esc 拒绝">
            <span
              style={{
                color: '#666',
                fontSize: 10,
                background: '#1a1a2e',
                padding: '2px 6px',
                borderRadius: 3,
                border: '1px solid #2a2a3e',
                whiteSpace: 'nowrap',
              }}
            >
              <RobotOutlined style={{ marginRight: 4, color: '#4ecdc4' }} />
              Tab 接受
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

export default MAMLCodeCompletion
