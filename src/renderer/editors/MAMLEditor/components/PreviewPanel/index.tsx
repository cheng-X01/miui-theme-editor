/**
 * 预览面板
 * 模拟手机屏幕预览 MAML 效果
 */

import React, { useState, useEffect, useRef } from 'react'
import { Button, Tooltip, Slider } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  MobileOutlined,
} from '@ant-design/icons'
import type { MAMLElementInstance } from '../../types'

interface PreviewPanelProps {
  elements: MAMLElementInstance[]
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ elements }) => {
  const [isPlaying, setIsPlaying] = useState(true)
  const [scale, setScale] = useState(0.3)
  const containerRef = useRef<HTMLDivElement>(null)

  // 屏幕尺寸
  const screenWidth = 1080
  const screenHeight = 1920

  // 渲染预览元素
  const renderPreviewElement = (element: MAMLElementInstance): React.ReactNode => {
    if (!element.visible) return null

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      transform: `rotate(${element.rotation || 0}deg) scale(${element.scaleX || 1}, ${element.scaleY || 1})`,
      opacity: element.alpha ?? 1,
      pointerEvents: 'none',
    }

    switch (element.type) {
      case 'Rectangle':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              backgroundColor: (element.attributes.fillColor as string) || '#ffffff',
              border: `${(element.attributes.strokeWidth as number) || 0}px solid ${(element.attributes.strokeColor as string) || '#000000'}`,
              borderRadius: (element.attributes.cornerRadius as number) || 0,
            }}
          />
        )
      case 'Circle':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              backgroundColor: (element.attributes.fillColor as string) || '#ffffff',
              border: `${(element.attributes.strokeWidth as number) || 0}px solid ${(element.attributes.strokeColor as string) || '#000000'}`,
              borderRadius: '50%',
            }}
          />
        )
      case 'Ellipse':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              backgroundColor: (element.attributes.fillColor as string) || '#ffffff',
              border: `${(element.attributes.strokeWidth as number) || 0}px solid ${(element.attributes.strokeColor as string) || '#000000'}`,
              borderRadius: '50%',
            }}
          />
        )
      case 'Text':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              display: 'flex',
              alignItems: (element.attributes.alignV as string) === 'top' ? 'flex-start' : (element.attributes.alignV as string) === 'bottom' ? 'flex-end' : 'center',
              justifyContent: (element.attributes.align as string) === 'left' ? 'flex-start' : (element.attributes.align as string) === 'right' ? 'flex-end' : 'center',
              color: (element.attributes.color as string) || '#ffffff',
              fontSize: (element.attributes.size as number) || 48,
              fontWeight: element.attributes.bold ? 'bold' : 'normal',
              fontStyle: element.attributes.italic ? 'italic' : 'normal',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {(element.attributes.text as string) || 'Text'}
          </div>
        )
      case 'Image':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              backgroundColor: '#333',
              borderRadius: (element.attributes.cornerRadius as number) || 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: 12,
            }}
          >
            {(element.attributes.src as string) ? (
              <img
                src={element.attributes.src as string}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              'Image'
            )}
          </div>
        )
      case 'Line': {
        const x1 = (element.attributes.x1 as number) || 0
        const y1 = (element.attributes.y1 as number) || 0
        const x2 = (element.attributes.x2 as number) || 100
        const y2 = (element.attributes.y2 as number) || 100
        const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              width: length,
              height: (element.attributes.strokeWidth as number) || 2,
              backgroundColor: (element.attributes.strokeColor as string) || '#000000',
              transform: `rotate(${angle}deg)`,
              transformOrigin: '0 50%',
            }}
          />
        )
      }
      case 'Button':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              backgroundColor: '#ff6b6b',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: (element.attributes.textColor as string) || '#ffffff',
              fontSize: (element.attributes.textSize as number) || 32,
            }}
          >
            {(element.attributes.text as string) || 'Button'}
          </div>
        )
      case 'Group':
        return (
          <div key={element.id} style={baseStyle}>
            {element.children?.map(renderPreviewElement)}
          </div>
        )
      default:
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px dashed #666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#888',
              fontSize: 12,
            }}
          >
            {element.type}
          </div>
        )
    }
  }

  // 过滤出根元素
  const rootElements = elements.filter((el) => !el.parentId)

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
          gap: 12,
          padding: '8px 16px',
          borderBottom: '1px solid #2a2a3e',
        }}
      >
        <Tooltip title={isPlaying ? '暂停' : '播放'}>
          <Button
            size="small"
            icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
          />
        </Tooltip>
        <Tooltip title="重置">
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => setIsPlaying(true)}
            style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
          />
        </Tooltip>
        <div style={{ flex: 1 }} />
        <MobileOutlined style={{ color: '#666' }} />
        <span style={{ color: '#666', fontSize: 12 }}>1080 x 1920</span>
      </div>

      {/* 预览区域 */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        {/* 手机外框 */}
        <div
          style={{
            width: screenWidth * scale + 20,
            height: screenHeight * scale + 40,
            background: '#1a1a2e',
            borderRadius: 24,
            padding: '10px 10px 30px',
            boxShadow: '0 0 30px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* 听筒 */}
          <div
            style={{
              width: 60,
              height: 4,
              background: '#333',
              borderRadius: 2,
              marginBottom: 8,
            }}
          />

          {/* 屏幕 */}
          <div
            style={{
              width: screenWidth * scale,
              height: screenHeight * scale,
              background: '#000',
              borderRadius: 4,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {rootElements.map(renderPreviewElement)}
          </div>
        </div>
      </div>

      {/* 缩放控制 */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ color: '#666', fontSize: 12 }}>缩放</span>
        <Slider
          value={scale}
          onChange={setScale}
          min={0.1}
          max={0.5}
          step={0.01}
          style={{ flex: 1 }}
        />
        <span style={{ color: '#666', fontSize: 12, minWidth: 40 }}>
          {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  )
}

export default PreviewPanel
