/**
 * 可视化画布组件
 * 支持元素拖拽、缩放、选中、对齐线等功能
 * 使用 div + CSS 实现，不使用 Canvas API
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { MAMLElementInstance, CanvasState, ResizeHandle, AlignType } from '../../types'
import { defaultEditorConfig } from '../../types'

interface CanvasProps {
  elements: MAMLElementInstance[]
  selectedIds: string[]
  canvasState: CanvasState
  onElementSelect: (ids: string[], append?: boolean) => void
  onElementMove: (id: string, x: number, y: number) => void
  onElementResize: (id: string, width: number, height: number, x?: number, y?: number) => void
  onElementDrop: (type: string, x: number, y: number) => void
  onCanvasStateChange: (state: Partial<CanvasState>) => void
  onContextMenu: (e: React.MouseEvent, elementId?: string) => void
  onDeleteElement: (id: string) => void
}

// 调整手柄配置
const resizeHandles: { position: ResizeHandle; cursor: string; style: React.CSSProperties }[] = [
  { position: 'nw', cursor: 'nw-resize', style: { top: -6, left: -6 } },
  { position: 'n', cursor: 'n-resize', style: { top: -6, left: '50%', transform: 'translateX(-50%)' } },
  { position: 'ne', cursor: 'ne-resize', style: { top: -6, right: -6 } },
  { position: 'e', cursor: 'e-resize', style: { top: '50%', right: -6, transform: 'translateY(-50%)' } },
  { position: 'se', cursor: 'se-resize', style: { bottom: -6, right: -6 } },
  { position: 's', cursor: 's-resize', style: { bottom: -6, left: '50%', transform: 'translateX(-50%)' } },
  { position: 'sw', cursor: 'sw-resize', style: { bottom: -6, left: -6 } },
  { position: 'w', cursor: 'w-resize', style: { top: '50%', left: -6, transform: 'translateY(-50%)' } },
]

const Canvas: React.FC<CanvasProps> = ({
  elements,
  selectedIds,
  canvasState,
  onElementSelect,
  onElementMove,
  onElementResize,
  onElementDrop,
  onCanvasStateChange,
  onContextMenu,
  onDeleteElement,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragElement, setDragElement] = useState<MAMLElementInstance | null>(null)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [initialRect, setInitialRect] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [alignLines, setAlignLines] = useState<{ x?: number; y?: number }[]>([])
  const [spacePressed, setSpacePressed] = useState(false)

  const { scale, offsetX, offsetY, gridSize, showGrid, snapToGrid } = canvasState
  const config = defaultEditorConfig

  // 屏幕坐标转画布坐标
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return {
        x: (screenX - rect.left - offsetX) / scale,
        y: (screenY - rect.top - offsetY) / scale,
      }
    },
    [scale, offsetX, offsetY]
  )

  // 吸附到网格
  const snapToGridValue = useCallback(
    (value: number) => {
      if (!snapToGrid) return value
      return Math.round(value / gridSize) * gridSize
    },
    [snapToGrid, gridSize]
  )

  // 计算对齐线
  const calculateAlignLines = useCallback(
    (element: MAMLElementInstance, x: number, y: number) => {
      const lines: { x?: number; y?: number }[] = []
      const threshold = 5

      for (const el of elements) {
        if (el.id === element.id || !el.visible) continue

        // 水平对齐线
        if (Math.abs(y - el.y) < threshold) lines.push({ y: el.y })
        if (Math.abs(y + element.height / 2 - (el.y + el.height / 2)) < threshold)
          lines.push({ y: el.y + el.height / 2 - element.height / 2 })
        if (Math.abs(y + element.height - (el.y + el.height)) < threshold)
          lines.push({ y: el.y + el.height - element.height })

        // 垂直对齐线
        if (Math.abs(x - el.x) < threshold) lines.push({ x: el.x })
        if (Math.abs(x + element.width / 2 - (el.x + el.width / 2)) < threshold)
          lines.push({ x: el.x + el.width / 2 - element.width / 2 })
        if (Math.abs(x + element.width - (el.x + el.width)) < threshold)
          lines.push({ x: el.x + el.width - element.width })
      }

      return lines
    },
    [elements]
  )

  // 渲染网格背景
  const renderGrid = () => {
    if (!showGrid) return null
    const gridPattern = `repeating-linear-gradient(
      0deg,
      transparent,
      transparent ${gridSize * scale - 1}px,
      #2a2a3e ${gridSize * scale - 1}px,
      #2a2a3e ${gridSize * scale}px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent ${gridSize * scale - 1}px,
      #2a2a3e ${gridSize * scale - 1}px,
      #2a2a3e ${gridSize * scale}px
    )`

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: config.canvasWidth * scale,
          height: config.canvasHeight * scale,
          background: gridPattern,
          pointerEvents: 'none',
        }}
      />
    )
  }

  // 渲染元素
  const renderElement = (element: MAMLElementInstance) => {
    if (!element.visible) return null

    const isSelected = selectedIds.includes(element.id)
    const isLocked = element.locked

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x * scale,
      top: element.y * scale,
      width: element.width * scale,
      height: element.height * scale,
      transform: `rotate(${element.rotation || 0}deg) scale(${element.scaleX || 1}, ${element.scaleY || 1})`,
      opacity: element.alpha ?? 1,
      cursor: isLocked ? 'not-allowed' : isSelected ? 'move' : 'pointer',
      pointerEvents: isLocked ? 'none' : 'auto',
      boxSizing: 'border-box',
    }

    // 根据元素类型渲染不同内容
    const renderContent = () => {
      switch (element.type) {
        case 'Rectangle':
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: (element.attributes.fillColor as string) || '#ffffff',
                border: `${(element.attributes.strokeWidth as number) || 0}px solid ${(element.attributes.strokeColor as string) || '#000000'}`,
                borderRadius: (element.attributes.cornerRadius as number) || 0,
              }}
            />
          )
        case 'Circle':
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: (element.attributes.fillColor as string) || '#ffffff',
                border: `${(element.attributes.strokeWidth as number) || 0}px solid ${(element.attributes.strokeColor as string) || '#000000'}`,
                borderRadius: '50%',
              }}
            />
          )
        case 'Ellipse':
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: (element.attributes.fillColor as string) || '#ffffff',
                border: `${(element.attributes.strokeWidth as number) || 0}px solid ${(element.attributes.strokeColor as string) || '#000000'}`,
                borderRadius: '50%',
              }}
            />
          )
        case 'Text':
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: (element.attributes.alignV as string) === 'top' ? 'flex-start' : (element.attributes.alignV as string) === 'bottom' ? 'flex-end' : 'center',
                justifyContent: (element.attributes.align as string) === 'left' ? 'flex-start' : (element.attributes.align as string) === 'right' ? 'flex-end' : 'center',
                color: (element.attributes.color as string) || '#ffffff',
                fontSize: ((element.attributes.size as number) || 48) * scale,
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
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#333',
                borderRadius: (element.attributes.cornerRadius as number) || 0,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: 12 * scale,
              }}
            >
              {(element.attributes.src as string) ? (
                <img
                  src={element.attributes.src as string}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  draggable={false}
                />
              ) : (
                'Image'
              )}
            </div>
          )
        case 'Line':
          const x1 = (element.attributes.x1 as number) || 0
          const y1 = (element.attributes.y1 as number) || 0
          const x2 = (element.attributes.x2 as number) || 100
          const y2 = (element.attributes.y2 as number) || 100
          const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
          const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
          return (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: length * scale,
                height: (element.attributes.strokeWidth as number) || 2,
                backgroundColor: (element.attributes.strokeColor as string) || '#000000',
                transform: `rotate(${angle}deg)`,
                transformOrigin: '0 50%',
              }}
            />
          )
        case 'Button':
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#ff6b6b',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (element.attributes.textColor as string) || '#ffffff',
                fontSize: ((element.attributes.textSize as number) || 32) * scale,
              }}
            >
              {(element.attributes.text as string) || 'Button'}
            </div>
          )
        case 'Group':
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                border: '1px dashed #666',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}
            />
          )
        default:
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px dashed #666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
                fontSize: 12 * scale,
              }}
            >
              {element.type}
            </div>
          )
      }
    }

    return (
      <div
        key={element.id}
        style={baseStyle}
        onMouseDown={(e) => handleElementMouseDown(e, element)}
        onContextMenu={(e) => {
          e.preventDefault()
          onContextMenu(e, element.id)
        }}
      >
        {renderContent()}

        {/* 选中框和调整手柄 */}
        {isSelected && !isLocked && (
          <>
            <div
              style={{
                position: 'absolute',
                top: -2,
                left: -2,
                right: -2,
                bottom: -2,
                border: '2px solid #ff6b6b',
                pointerEvents: 'none',
              }}
            />
            {resizeHandles.map((handle) => (
              <div
                key={handle.position}
                style={{
                  position: 'absolute',
                  width: 12,
                  height: 12,
                  background: '#ff6b6b',
                  border: '2px solid #fff',
                  borderRadius: '50%',
                  ...handle.style,
                  cursor: handle.cursor,
                  pointerEvents: 'auto',
                  zIndex: 10,
                }}
                onMouseDown={(e) => handleResizeMouseDown(e, element, handle.position)}
              />
            ))}
          </>
        )}
      </div>
    )
  }

  // 元素鼠标按下
  const handleElementMouseDown = (e: React.MouseEvent, element: MAMLElementInstance) => {
    if (element.locked || isResizing) return
    e.stopPropagation()

    const append = e.ctrlKey || e.metaKey || e.shiftKey
    onElementSelect([element.id], append)

    if (!spacePressed) {
      setIsDragging(true)
      setDragElement(element)
      setDragStart({ x: e.clientX, y: e.clientY })
      setInitialRect({ x: element.x, y: element.y, width: element.width, height: element.height })
    }
  }

  // 调整大小鼠标按下
  const handleResizeMouseDown = (e: React.MouseEvent, element: MAMLElementInstance, handle: ResizeHandle) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    setDragElement(element)
    setDragStart({ x: e.clientX, y: e.clientY })
    setInitialRect({ x: element.x, y: element.y, width: element.width, height: element.height })
  }

  // 画布鼠标按下
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || spacePressed) {
      // 中键或空格+拖拽 = 平移
      setIsPanning(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      return
    }

    if (e.button === 0) {
      // 左键点击空白处取消选择
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        onElementSelect([])
      }
    }
  }

  // 鼠标移动
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && dragElement) {
        const dx = (e.clientX - dragStart.x) / scale
        const dy = (e.clientY - dragStart.y) / scale
        let newX = snapToGridValue(initialRect.x + dx)
        let newY = snapToGridValue(initialRect.y + dy)

        // 计算对齐线
        const lines = calculateAlignLines(dragElement, newX, newY)
        setAlignLines(lines)

        // 吸附对齐
        for (const line of lines) {
          if (line.x !== undefined) newX = line.x
          if (line.y !== undefined) newY = line.y
        }

        onElementMove(dragElement.id, newX, newY)
      } else if (isResizing && dragElement && resizeHandle) {
        const dx = (e.clientX - dragStart.x) / scale
        const dy = (e.clientY - dragStart.y) / scale
        let newX = initialRect.x
        let newY = initialRect.y
        let newWidth = initialRect.width
        let newHeight = initialRect.height

        if (resizeHandle.includes('e')) newWidth = Math.max(10, initialRect.width + dx)
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(10, initialRect.width - dx)
          newX = initialRect.x + initialRect.width - newWidth
        }
        if (resizeHandle.includes('s')) newHeight = Math.max(10, initialRect.height + dy)
        if (resizeHandle.includes('n')) {
          newHeight = Math.max(10, initialRect.height - dy)
          newY = initialRect.y + initialRect.height - newHeight
        }

        newX = snapToGridValue(newX)
        newY = snapToGridValue(newY)
        newWidth = snapToGridValue(newWidth)
        newHeight = snapToGridValue(newHeight)

        onElementResize(dragElement.id, newWidth, newHeight, newX, newY)
      } else if (isPanning) {
        const dx = e.clientX - dragStart.x
        const dy = e.clientY - dragStart.y
        onCanvasStateChange({ offsetX: offsetX + dx, offsetY: offsetY + dy })
        setDragStart({ x: e.clientX, y: e.clientY })
      }
    },
    [isDragging, isResizing, isPanning, dragElement, dragStart, scale, initialRect, resizeHandle, offsetX, offsetY, snapToGridValue, calculateAlignLines, onElementMove, onElementResize, onCanvasStateChange]
  )

  // 鼠标抬起
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setIsPanning(false)
    setDragElement(null)
    setResizeHandle(null)
    setAlignLines([])
  }, [])

  // 滚轮缩放
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        const newScale = Math.max(config.minScale, Math.min(config.maxScale, scale * delta))
        onCanvasStateChange({ scale: newScale })
      }
    },
    [scale, config.minScale, config.maxScale, onCanvasStateChange]
  )

  // 拖拽放置
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/maml-element')
    if (type) {
      const pos = screenToCanvas(e.clientX, e.clientY)
      onElementDrop(type, pos.x, pos.y)
    }
  }

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setSpacePressed(true)
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        selectedIds.forEach((id) => onDeleteElement(id))
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [selectedIds, onDeleteElement])

  return (
    <div
      ref={canvasRef}
      style={{
        flex: 1,
        height: '100%',
        background: '#1a1a2e',
        overflow: 'hidden',
        position: 'relative',
        cursor: spacePressed ? 'grab' : isPanning ? 'grabbing' : 'default',
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu(e)
      }}
    >
      {/* 画布容器 */}
      <div
        style={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          width: config.canvasWidth * scale,
          height: config.canvasHeight * scale,
          background: '#0f0f23',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        }}
      >
        {/* 网格 */}
        {renderGrid()}

        {/* 元素 */}
        {elements.map(renderElement)}

        {/* 对齐线 */}
        {alignLines.map((line, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              background: '#ff6b6b',
              ...(line.x !== undefined
                ? {
                    left: line.x * scale,
                    top: 0,
                    width: 1,
                    height: '100%',
                  }
                : {
                    top: line.y! * scale,
                    left: 0,
                    height: 1,
                    width: '100%',
                  }),
              pointerEvents: 'none',
              zIndex: 100,
            }}
          />
        ))}
      </div>

      {/* 画布信息 */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          color: '#666',
          fontSize: 12,
          pointerEvents: 'none',
        }}
      >
        {Math.round(scale * 100)}% | {config.canvasWidth}x{config.canvasHeight}
      </div>
    </div>
  )
}

export default Canvas
