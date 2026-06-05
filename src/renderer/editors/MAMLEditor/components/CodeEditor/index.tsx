/**
 * 代码编辑器
 * XML 语法高亮，与可视化画布双向绑定
 * 集成 MAML 代码补全功能
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Tooltip, message } from 'antd'
import {
  FormatPainterOutlined,
  CopyOutlined,
  CheckOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import MAMLCodeCompletion from './MAMLCodeCompletion'

interface CodeEditorProps {
  xml: string
  onChange: (xml: string) => void
  elementType?: string // 当前编辑的元素类型，用于代码补全上下文
}

// 简单的 XML 格式化
const formatXML = (xml: string): string => {
  let formatted = ''
  let indent = 0
  const tab = '  '
  xml = xml.replace(/>\s*</g, '><')

  xml.split(/(<[^>]+>)/g).filter(Boolean).forEach((node) => {
    if (node.match(/^<\//)) {
      indent--
      formatted += tab.repeat(Math.max(0, indent)) + node + '\n'
    } else if (node.match(/^<[^/][^>]*\/>/)) {
      formatted += tab.repeat(Math.max(0, indent)) + node + '\n'
    } else if (node.match(/^<[^/][^>]*[^/]>/)) {
      formatted += tab.repeat(Math.max(0, indent)) + node + '\n'
      indent++
    } else if (node.match(/^<!--/)) {
      formatted += tab.repeat(Math.max(0, indent)) + node + '\n'
    } else {
      if (node.trim()) {
        formatted += tab.repeat(Math.max(0, indent)) + node.trim() + '\n'
      }
    }
  })

  return formatted.trim()
}

// XML 语法高亮
const highlightXML = (xml: string): string => {
  return xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(&lt;\/?)([\w:]+)/g, '<span class="xml-tag">$1$2</span>')
    .replace(/(\s)([\w:-]+)(=)("[^"]*")/g, '$1<span class="xml-attr">$2</span>$3<span class="xml-string">$4</span>')
    .replace(/(&lt;!--.*?--&gt;)/g, '<span class="xml-comment">$1</span>')
}

const CodeEditor: React.FC<CodeEditorProps> = ({ xml, onChange, elementType }) => {
  const [code, setCode] = useState(xml)
  const [copied, setCopied] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)

  // 同步外部 xml 变化
  useEffect(() => {
    setCode(xml)
  }, [xml])

  // 同步滚动
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  // 处理代码变更
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
    setCode(newCode)
    setCursorPosition(e.target.selectionStart)
    onChange(newCode)
  }

  // 处理光标位置变化
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement
    setCursorPosition(target.selectionStart)
  }

  // 接受代码补全建议
  const handleAcceptCompletion = useCallback((completion: string) => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newCode = code.substring(0, start) + completion + code.substring(end)
    setCode(newCode)
    setCursorPosition(start + completion.length)
    onChange(newCode)
    // 设置新的光标位置
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + completion.length, start + completion.length)
    }, 0)
  }, [code, onChange])

  // 格式化
  const handleFormat = () => {
    try {
      const formatted = formatXML(code)
      setCode(formatted)
      onChange(formatted)
      message.success('格式化完成')
    } catch {
      message.error('格式化失败，请检查 XML 语法')
    }
  }

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败')
    }
  }

  // 重置
  const handleReset = () => {
    setCode(xml)
    onChange(xml)
  }

  return (
    <div
      style={{
        height: '100%',
        background: '#0f0f23',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 工具栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderBottom: '1px solid #2a2a3e',
        }}
      >
        <Tooltip title="格式化">
          <Button
            size="small"
            icon={<FormatPainterOutlined />}
            onClick={handleFormat}
            style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
          />
        </Tooltip>
        <Tooltip title={copied ? '已复制' : '复制'}>
          <Button
            size="small"
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={handleCopy}
            style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: copied ? '#52c41a' : '#e0e0e0' }}
          />
        </Tooltip>
        <Tooltip title="重置">
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleReset}
            style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
          />
        </Tooltip>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#666', fontSize: 12 }}>MAML XML</span>
      </div>

      {/* 编辑器区域 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* 语法高亮层 */}
        <pre
          ref={highlightRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            padding: '12px 16px',
            overflow: 'auto',
            fontFamily: '"Fira Code", "Consolas", monospace',
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: 'pre',
            wordWrap: 'normal',
            color: '#e0e0e0',
            pointerEvents: 'none',
            zIndex: 1,
          }}
          dangerouslySetInnerHTML={{ __html: highlightXML(code) }}
        />

        {/* 编辑层 */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleChange}
          onSelect={handleSelect}
          onScroll={handleScroll}
          spellCheck={false}
          className="code-editor-textarea"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            padding: '12px 16px',
            background: 'transparent',
            color: 'transparent',
            caretColor: '#ff6b6b',
            fontFamily: '"Fira Code", "Consolas", monospace',
            fontSize: 13,
            lineHeight: 1.6,
            border: 'none',
            outline: 'none',
            resize: 'none',
            whiteSpace: 'pre',
            wordWrap: 'normal',
            zIndex: 2,
          }}
        />

        {/* MAML 代码补全层 */}
        <MAMLCodeCompletion
          code={code}
          cursorPosition={cursorPosition}
          elementType={elementType}
          onAccept={handleAcceptCompletion}
        />

        {/* 样式 */}
        <style>{`
          .xml-tag { color: #ff6b6b; }
          .xml-attr { color: #4ecdc4; }
          .xml-string { color: #ffeaa7; }
          .xml-comment { color: #666; font-style: italic; }
        `}</style>
      </div>
    </div>
  )
}

export default CodeEditor
