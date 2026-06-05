/**
 * MAML 编辑器主组件
 * 三栏布局：左侧组件库 + 中间画布 + 右侧属性面板
 * 底部标签页：图层 / 代码 / 预览
 * 顶部工具栏：撤销/重做、删除、对齐、分布、组合/解组、锁定/解锁、显示/隐藏网格、缩放控制
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Tabs, Button, Tooltip, message } from 'antd'
import {
  UndoOutlined,
  RedoOutlined,
  DeleteOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
  GroupOutlined,
  UngroupOutlined,
  BorderOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  CodeOutlined,
  ApartmentOutlined,
  EyeOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  InteractionOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { MAMLElementInstance, CanvasState, MAMLElementType } from './types'
import { defaultEditorConfig, defaultTheme } from './types'
import { createElementInstance, generateId } from './elementLibrary'
import ComponentLibrary from './components/ComponentLibrary'
import Canvas from './components/Canvas'
import PropertyPanel from './components/PropertyPanel'
import AnimationEditor from './components/AnimationEditor'
import InteractionEditor from './components/InteractionEditor'
import LayerPanel from './components/LayerPanel'
import CodeEditor from './components/CodeEditor'
import PreviewPanel from './components/PreviewPanel'
import type { AnimationConfig } from './components/AnimationEditor'
import type { TriggerConfig } from './components/InteractionEditor'

interface MAMLEditorProps {
  manifest?: string
  onChange: (xml: string) => void
}

// 元素转 XML
const elementsToXML = (elements: MAMLElementInstance[]): string => {
  const elementToXML = (el: MAMLElementInstance, indent: number = 0): string => {
    const spaces = '  '.repeat(indent)
    const attrs = Object.entries(el.attributes)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')

    const transformAttrs = [
      el.x !== 0 && `x="${el.x}"`,
      el.y !== 0 && `y="${el.y}"`,
      el.rotation && `rotation="${el.rotation}"`,
      el.alpha !== undefined && el.alpha !== 1 && `alpha="${el.alpha}"`,
      el.scaleX !== undefined && el.scaleX !== 1 && `scaleX="${el.scaleX}"`,
      el.scaleY !== undefined && el.scaleY !== 1 && `scaleY="${el.scaleY}"`,
    ].filter(Boolean).join(' ')

    const allAttrs = [attrs, transformAttrs].filter(Boolean).join(' ')

    if (el.children && el.children.length > 0) {
      const childrenXML = el.children.map((c) => elementToXML(c, indent + 1)).join('\n')
      return `${spaces}<${el.type} name="${el.name}"${allAttrs ? ' ' + allAttrs : ''}>\n${childrenXML}\n${spaces}</${el.type}>`
    } else {
      return `${spaces}<${el.type} name="${el.name}"${allAttrs ? ' ' + allAttrs : ''}/>`
    }
  }

  const rootElement = elements.find((e) => e.type === 'Lockscreen' || e.type === 'Desktop')
  if (rootElement) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n${elementToXML(rootElement)}`
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${elements.map((e) => elementToXML(e)).join('\n')}`
}

// XML 解析为元素（简化版）
const parseXMLToElements = (xml: string): MAMLElementInstance[] => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const parseElement = (el: Element, parentId?: string): MAMLElementInstance => {
      const type = el.tagName as MAMLElementType
      const attrs: Record<string, string | number | boolean> = {}
      const transform: Partial<MAMLElementInstance> = {}

      for (const attr of el.attributes) {
        const val = attr.value
        if (['x', 'y', 'width', 'height', 'rotation', 'alpha', 'scaleX', 'scaleY'].includes(attr.name)) {
          ;(transform as any)[attr.name] = parseFloat(val)
        } else if (['true', 'false'].includes(val)) {
          attrs[attr.name] = val === 'true'
        } else if (!isNaN(Number(val)) && val !== '') {
          attrs[attr.name] = Number(val)
        } else {
          attrs[attr.name] = val
        }
      }

      const children: MAMLElementInstance[] = []
      for (const child of el.children) {
        children.push(parseElement(child, generateId()))
      }

      return {
        id: generateId(),
        type,
        name: el.getAttribute('name') || `${type}_${Math.floor(Math.random() * 1000)}`,
        x: transform.x ?? 0,
        y: transform.y ?? 0,
        width: transform.width ?? 100,
        height: transform.height ?? 100,
        rotation: transform.rotation ?? 0,
        alpha: transform.alpha ?? 1,
        scaleX: transform.scaleX ?? 1,
        scaleY: transform.scaleY ?? 1,
        attributes: attrs,
        children,
        parentId,
        visible: true,
        locked: false,
        selected: false,
      }
    }

    return Array.from(doc.documentElement.tagName === 'parsererror' ? [] : doc.children).map((el) =>
      parseElement(el)
    )
  } catch {
    return []
  }
}

const MAMLEditor: React.FC<MAMLEditorProps> = ({ manifest, onChange }) => {
  // 状态
  const [elements, setElements] = useState<MAMLElementInstance[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [canvasState, setCanvasState] = useState<CanvasState>({
    scale: 0.4,
    offsetX: 100,
    offsetY: 50,
    gridSize: 20,
    showGrid: true,
    snapToGrid: true,
  })
  const [history, setHistory] = useState<{ past: MAMLElementInstance[][]; future: MAMLElementInstance[][] }>({
    past: [],
    future: [],
  })
  const [activeBottomTab, setActiveBottomTab] = useState('layers')
  const [activeRightTab, setActiveRightTab] = useState('properties')

  // 动画和触发器状态（存储在元素实例中）
  const [animations, setAnimations] = useState<AnimationConfig[]>([])
  const [triggers, setTriggers] = useState<TriggerConfig[]>([])

  // 初始化
  useEffect(() => {
    if (manifest) {
      const parsed = parseXMLToElements(manifest)
      setElements(parsed)
    } else {
      // 创建默认 Lockscreen
      const lockscreen = createElementInstance('Lockscreen', 0, 0)
      lockscreen.width = defaultEditorConfig.canvasWidth
      lockscreen.height = defaultEditorConfig.canvasHeight
      setElements([lockscreen])
    }
  }, [])

  // 保存历史
  const saveHistory = useCallback(
    (newElements: MAMLElementInstance[]) => {
      setHistory((prev) => ({
        past: [...prev.past, elements],
        future: [],
      }))
      setElements(newElements)

      // 通知外部
      onChange(elementsToXML(newElements))
    },
    [elements, onChange]
  )

  // 撤销
  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev
      const previous = prev.past[prev.past.length - 1]
      const newPast = prev.past.slice(0, -1)
      setElements(previous)
      onChange(elementsToXML(previous))
      return {
        past: newPast,
        future: [elements, ...prev.future],
      }
    })
  }, [elements, onChange])

  // 重做
  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev
      const next = prev.future[0]
      const newFuture = prev.future.slice(1)
      setElements(next)
      onChange(elementsToXML(next))
      return {
        past: [...prev.past, elements],
        future: newFuture,
      }
    })
  }, [elements, onChange])

  // 选择元素
  const handleElementSelect = useCallback(
    (ids: string[], append = false) => {
      if (append) {
        setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])))
      } else {
        setSelectedIds(ids)
      }

      // 更新元素选中状态
      setElements((prev) =>
        prev.map((el) => ({
          ...el,
          selected: ids.includes(el.id),
        }))
      )
    },
    []
  )

  // 移动元素
  const handleElementMove = useCallback(
    (id: string, x: number, y: number) => {
      const updateElement = (el: MAMLElementInstance): MAMLElementInstance => {
        if (el.id === id) {
          return { ...el, x, y }
        }
        if (el.children) {
          return { ...el, children: el.children.map(updateElement) }
        }
        return el
      }
      const newElements = elements.map(updateElement)
      setElements(newElements)
    },
    [elements]
  )

  // 调整元素大小
  const handleElementResize = useCallback(
    (id: string, width: number, height: number, x?: number, y?: number) => {
      const updateElement = (el: MAMLElementInstance): MAMLElementInstance => {
        if (el.id === id) {
          return { ...el, width, height, ...(x !== undefined && { x }), ...(y !== undefined && { y }) }
        }
        if (el.children) {
          return { ...el, children: el.children.map(updateElement) }
        }
        return el
      }
      const newElements = elements.map(updateElement)
      setElements(newElements)
    },
    [elements]
  )

  // 拖拽添加元素
  const handleElementDrop = useCallback(
    (type: string, x: number, y: number) => {
      const newElement = createElementInstance(type as MAMLElementType, x, y)
      const newElements = [...elements, newElement]
      saveHistory(newElements)
      setSelectedIds([newElement.id])
    },
    [elements, saveHistory]
  )

  // 更新元素
  const handleUpdateElement = useCallback(
    (id: string, updates: Partial<MAMLElementInstance>) => {
      const updateElement = (el: MAMLElementInstance): MAMLElementInstance => {
        if (el.id === id) {
          return { ...el, ...updates }
        }
        if (el.children) {
          return { ...el, children: el.children.map(updateElement) }
        }
        return el
      }
      const newElements = elements.map(updateElement)
      setElements(newElements)
      onChange(elementsToXML(newElements))
    },
    [elements, onChange]
  )

  // 更新元素属性
  const handleUpdateAttribute = useCallback(
    (id: string, name: string, value: string | number | boolean) => {
      const updateElement = (el: MAMLElementInstance): MAMLElementInstance => {
        if (el.id === id) {
          return { ...el, attributes: { ...el.attributes, [name]: value } }
        }
        if (el.children) {
          return { ...el, children: el.children.map(updateElement) }
        }
        return el
      }
      const newElements = elements.map(updateElement)
      setElements(newElements)
      onChange(elementsToXML(newElements))
    },
    [elements, onChange]
  )

  // 删除元素
  const handleDeleteElement = useCallback(
    (id: string) => {
      const filterElement = (el: MAMLElementInstance): boolean => el.id !== id
      const filterChildren = (el: MAMLElementInstance): MAMLElementInstance => ({
        ...el,
        children: el.children?.filter(filterElement).map(filterChildren) || [],
      })
      const newElements = elements.filter(filterElement).map(filterChildren)
      saveHistory(newElements)
      setSelectedIds((prev) => prev.filter((sid) => sid !== id))
    },
    [elements, saveHistory]
  )

  // 对齐元素
  const alignElements = useCallback(
    (align: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (selectedIds.length < 2) return

      const selectedElements = elements.filter((el) => selectedIds.includes(el.id))
      let targetValue = 0

      switch (align) {
        case 'left':
          targetValue = Math.min(...selectedElements.map((el) => el.x))
          break
        case 'center':
          targetValue =
            selectedElements.reduce((sum, el) => sum + el.x + el.width / 2, 0) / selectedElements.length
          break
        case 'right':
          targetValue = Math.max(...selectedElements.map((el) => el.x + el.width))
          break
        case 'top':
          targetValue = Math.min(...selectedElements.map((el) => el.y))
          break
        case 'middle':
          targetValue =
            selectedElements.reduce((sum, el) => sum + el.y + el.height / 2, 0) / selectedElements.length
          break
        case 'bottom':
          targetValue = Math.max(...selectedElements.map((el) => el.y + el.height))
          break
      }

      const updateElement = (el: MAMLElementInstance): MAMLElementInstance => {
        if (!selectedIds.includes(el.id)) {
          if (el.children) return { ...el, children: el.children.map(updateElement) }
          return el
        }

        let newX = el.x
        let newY = el.y

        switch (align) {
          case 'left':
            newX = targetValue
            break
          case 'center':
            newX = targetValue - el.width / 2
            break
          case 'right':
            newX = targetValue - el.width
            break
          case 'top':
            newY = targetValue
            break
          case 'middle':
            newY = targetValue - el.height / 2
            break
          case 'bottom':
            newY = targetValue - el.height
            break
        }

        return { ...el, x: newX, y: newY }
      }

      const newElements = elements.map(updateElement)
      saveHistory(newElements)
    },
    [elements, selectedIds, saveHistory]
  )

  // 组合元素
  const groupElements = useCallback(() => {
    if (selectedIds.length < 2) return

    const selectedElements = elements.filter((el) => selectedIds.includes(el.id))
    const minX = Math.min(...selectedElements.map((el) => el.x))
    const minY = Math.min(...selectedElements.map((el) => el.y))

    const group: MAMLElementInstance = {
      id: generateId(),
      type: 'Group',
      name: `Group_${Math.floor(Math.random() * 1000)}`,
      x: minX,
      y: minY,
      width: Math.max(...selectedElements.map((el) => el.x + el.width)) - minX,
      height: Math.max(...selectedElements.map((el) => el.y + el.height)) - minY,
      attributes: {},
      children: selectedElements.map((el) => ({
        ...el,
        x: el.x - minX,
        y: el.y - minY,
        parentId: undefined,
      })),
      visible: true,
      locked: false,
      selected: true,
    }

    const filterElement = (el: MAMLElementInstance): boolean => !selectedIds.includes(el.id)
    const newElements = [...elements.filter(filterElement), group]
    saveHistory(newElements)
    setSelectedIds([group.id])
  }, [elements, selectedIds, saveHistory])

  // 解组元素
  const ungroupElements = useCallback(() => {
    const selectedGroups = elements.filter((el) => selectedIds.includes(el.id) && el.type === 'Group')
    if (selectedGroups.length === 0) return

    const newElements: MAMLElementInstance[] = []
    const ungroupedIds: string[] = []

    for (const el of elements) {
      if (selectedIds.includes(el.id) && el.type === 'Group' && el.children) {
        for (const child of el.children) {
          newElements.push({
            ...child,
            x: child.x + el.x,
            y: child.y + el.y,
            id: generateId(),
          })
          ungroupedIds.push(child.id)
        }
      } else {
        newElements.push(el)
      }
    }

    saveHistory(newElements)
    setSelectedIds(ungroupedIds)
  }, [elements, selectedIds, saveHistory])

  // 切换可见性
  const toggleVisible = useCallback(
    (id: string) => {
      const updateElement = (el: MAMLElementInstance): MAMLElementInstance => {
        if (el.id === id) {
          return { ...el, visible: !el.visible }
        }
        if (el.children) {
          return { ...el, children: el.children.map(updateElement) }
        }
        return el
      }
      const newElements = elements.map(updateElement)
      setElements(newElements)
    },
    [elements]
  )

  // 切换锁定
  const toggleLock = useCallback(
    (id: string) => {
      const updateElement = (el: MAMLElementInstance): MAMLElementInstance => {
        if (el.id === id) {
          return { ...el, locked: !el.locked }
        }
        if (el.children) {
          return { ...el, children: el.children.map(updateElement) }
        }
        return el
      }
      const newElements = elements.map(updateElement)
      setElements(newElements)
    },
    [elements]
  )

  // 重命名
  const renameElement = useCallback(
    (id: string, name: string) => {
      const updateElement = (el: MAMLElementInstance): MAMLElementInstance => {
        if (el.id === id) {
          return { ...el, name }
        }
        if (el.children) {
          return { ...el, children: el.children.map(updateElement) }
        }
        return el
      }
      const newElements = elements.map(updateElement)
      setElements(newElements)
    },
    [elements]
  )

  // 重新排序
  const reorderElements = useCallback(
    (dragId: string, dropId: string, dropPosition: number) => {
      // 简化实现：交换两个元素的位置
      const dragIndex = elements.findIndex((el) => el.id === dragId)
      const dropIndex = elements.findIndex((el) => el.id === dropId)

      if (dragIndex === -1 || dropIndex === -1) return

      const newElements = [...elements]
      const [removed] = newElements.splice(dragIndex, 1)
      const newIndex = dropPosition === -1 ? dropIndex : dropIndex + 1
      newElements.splice(newIndex, 0, removed)

      setElements(newElements)
    },
    [elements]
  )

  // 右键菜单
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, elementId?: string) => {
      // 这里可以显示右键菜单
      if (elementId) {
        message.info(`右键菜单: ${elementId}`)
      }
    },
    []
  )

  // 获取选中元素
  const selectedElement = useMemo(() => {
    if (selectedIds.length !== 1) return null
    const findElement = (els: MAMLElementInstance[]): MAMLElementInstance | null => {
      for (const el of els) {
        if (el.id === selectedIds[0]) return el
        if (el.children) {
          const found = findElement(el.children)
          if (found) return found
        }
      }
      return null
    }
    return findElement(elements)
  }, [elements, selectedIds])

  // 获取所有元素列表（用于交互编辑器选择目标）
  const allElements = useMemo(() => {
    const result: { id: string; name: string }[] = []
    const collect = (els: MAMLElementInstance[]) => {
      for (const el of els) {
        result.push({ id: el.id, name: el.name })
        if (el.children) {
          collect(el.children)
        }
      }
    }
    collect(elements)
    return result
  }, [elements])

  // 处理动画变更
  const handleAnimationsChange = useCallback((newAnimations: AnimationConfig[]) => {
    setAnimations(newAnimations)
    // 将动画同步到选中元素的属性中
    if (selectedElement) {
      const animationXML = newAnimations
        .map(
          (anim) =>
            `    <${anim.type} from="${anim.from}" to="${anim.to}" duration="${anim.duration}" delay="${anim.delay}" repeat="${anim.repeat}" ease="${anim.ease}" loop="${anim.loop}"${anim.property ? ` property="${anim.property}"` : ''}/>`
        )
        .join('\n')
      handleUpdateAttribute(selectedElement.id, 'animations', animationXML)
    }
  }, [selectedElement])

  // 处理触发器变更
  const handleTriggersChange = useCallback((newTriggers: TriggerConfig[]) => {
    setTriggers(newTriggers)
    // 将触发器同步到选中元素的属性中
    if (selectedElement) {
      const triggerXML = newTriggers
        .map(
          (trigger) =>
            `    <Trigger action="${trigger.action}" target="${trigger.target}" operation="${trigger.operation}"${trigger.condition ? ` condition="${trigger.condition}"` : ''}/>`
        )
        .join('\n')
      handleUpdateAttribute(selectedElement.id, 'triggers', triggerXML)
    }
  }, [selectedElement])

  // 工具栏按钮
  const toolbarButtons = [
    { icon: <UndoOutlined />, tooltip: '撤销 (Ctrl+Z)', onClick: undo, disabled: history.past.length === 0 },
    { icon: <RedoOutlined />, tooltip: '重做 (Ctrl+Y)', onClick: redo, disabled: history.future.length === 0 },
    { icon: <DeleteOutlined />, tooltip: '删除 (Delete)', onClick: () => selectedIds.forEach(handleDeleteElement), disabled: selectedIds.length === 0 },
    null,
    {
      icon: <AlignLeftOutlined />,
      tooltip: '左对齐',
      onClick: () => alignElements('left'),
      disabled: selectedIds.length < 2,
    },
    {
      icon: <AlignCenterOutlined />,
      tooltip: '水平居中',
      onClick: () => alignElements('center'),
      disabled: selectedIds.length < 2,
    },
    {
      icon: <AlignRightOutlined />,
      tooltip: '右对齐',
      onClick: () => alignElements('right'),
      disabled: selectedIds.length < 2,
    },
    null,
    {
      icon: <VerticalAlignTopOutlined />,
      tooltip: '顶部对齐',
      onClick: () => alignElements('top'),
      disabled: selectedIds.length < 2,
    },
    {
      icon: <VerticalAlignMiddleOutlined />,
      tooltip: '垂直居中',
      onClick: () => alignElements('middle'),
      disabled: selectedIds.length < 2,
    },
    {
      icon: <VerticalAlignBottomOutlined />,
      tooltip: '底部对齐',
      onClick: () => alignElements('bottom'),
      disabled: selectedIds.length < 2,
    },
    null,
    { icon: <GroupOutlined />, tooltip: '组合 (Ctrl+G)', onClick: groupElements, disabled: selectedIds.length < 2 },
    { icon: <UngroupOutlined />, tooltip: '解组 (Ctrl+Shift+G)', onClick: ungroupElements, disabled: !selectedElement || selectedElement.type !== 'Group' },
    null,
    {
      icon: canvasState.showGrid ? <BorderOutlined style={{ color: '#ff6b6b' }} /> : <BorderOutlined />,
      tooltip: '显示/隐藏网格',
      onClick: () => setCanvasState((prev) => ({ ...prev, showGrid: !prev.showGrid })),
    },
    {
      icon: <ZoomOutOutlined />,
      tooltip: '缩小',
      onClick: () => setCanvasState((prev) => ({ ...prev, scale: Math.max(0.1, prev.scale - 0.1) })),
    },
    {
      icon: <span style={{ color: '#e0e0e0', fontSize: 12 }}>{Math.round(canvasState.scale * 100)}%</span>,
      tooltip: '缩放',
      onClick: () => {},
    },
    {
      icon: <ZoomInOutlined />,
      tooltip: '放大',
      onClick: () => setCanvasState((prev) => ({ ...prev, scale: Math.min(3, prev.scale + 0.1) })),
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: defaultTheme.backgroundColor,
        color: defaultTheme.textColor,
      }}
    >
      {/* 顶部工具栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 16px',
          background: defaultTheme.panelBackground,
          borderBottom: `1px solid ${defaultTheme.borderColor}`,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, marginRight: 16 }}>MAML 编辑器</span>
        {toolbarButtons.map((btn, index) =>
          btn === null ? (
            <div key={index} style={{ width: 1, height: 24, background: defaultTheme.borderColor, margin: '0 8px' }} />
          ) : (
            <Tooltip key={index} title={btn.tooltip}>
              <Button
                size="small"
                icon={btn.icon}
                onClick={btn.onClick}
                disabled={btn.disabled}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: btn.disabled ? '#666' : '#e0e0e0',
                }}
              />
            </Tooltip>
          )
        )}
        <div style={{ flex: 1 }} />
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={() => onChange(elementsToXML(elements))}
          style={{ background: '#ff6b6b', borderColor: '#ff6b6b' }}
        >
          保存
        </Button>
      </div>

      {/* 主编辑区 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧组件库 */}
        <ComponentLibrary onDragStart={() => {}} />

        {/* 中间画布 + 底部面板 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 画布 */}
          <div style={{ flex: 1, display: 'flex' }}>
            <Canvas
              elements={elements}
              selectedIds={selectedIds}
              canvasState={canvasState}
              onElementSelect={handleElementSelect}
              onElementMove={handleElementMove}
              onElementResize={handleElementResize}
              onElementDrop={handleElementDrop}
              onCanvasStateChange={(state) => setCanvasState((prev) => ({ ...prev, ...state }))}
              onContextMenu={handleContextMenu}
              onDeleteElement={handleDeleteElement}
            />
          </div>

          {/* 底部标签页 */}
          <div style={{ height: 200, background: defaultTheme.panelBackground, borderTop: `1px solid ${defaultTheme.borderColor}` }}>
            <Tabs
              activeKey={activeBottomTab}
              onChange={setActiveBottomTab}
              style={{ height: '100%' }}
              items={[
                {
                  key: 'layers',
                  label: (
                    <span style={{ color: activeBottomTab === 'layers' ? '#ff6b6b' : '#e0e0e0' }}>
                      <ApartmentOutlined style={{ marginRight: 6 }} />
                      图层
                    </span>
                  ),
                  children: (
                    <LayerPanel
                      elements={elements}
                      selectedIds={selectedIds}
                      onSelect={(id) => handleElementSelect([id])}
                      onToggleVisible={toggleVisible}
                      onToggleLock={toggleLock}
                      onRename={renameElement}
                      onReorder={reorderElements}
                    />
                  ),
                },
                {
                  key: 'code',
                  label: (
                    <span style={{ color: activeBottomTab === 'code' ? '#ff6b6b' : '#e0e0e0' }}>
                      <CodeOutlined style={{ marginRight: 6 }} />
                      代码
                    </span>
                  ),
                  children: (
                    <CodeEditor
                      xml={elementsToXML(elements)}
                      onChange={(xml) => {
                        const parsed = parseXMLToElements(xml)
                        setElements(parsed)
                        onChange(xml)
                      }}
                    />
                  ),
                },
                {
                  key: 'preview',
                  label: (
                    <span style={{ color: activeBottomTab === 'preview' ? '#ff6b6b' : '#e0e0e0' }}>
                      <EyeOutlined style={{ marginRight: 6 }} />
                      预览
                    </span>
                  ),
                  children: <PreviewPanel elements={elements} />,
                },
              ]}
            />
          </div>
        </div>

        {/* 右侧属性面板（带标签页） */}
        <div style={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column', background: '#0f0f23' }}>
          <Tabs
            activeKey={activeRightTab}
            onChange={setActiveRightTab}
            style={{ height: '100%' }}
            tabBarStyle={{ margin: 0, padding: '0 8px', background: '#0a0a1a', borderBottom: '1px solid #2a2a3e' }}
            items={[
              {
                key: 'properties',
                label: (
                  <span style={{ color: activeRightTab === 'properties' ? '#ff6b6b' : '#e0e0e0', fontSize: 12 }}>
                    <SettingOutlined style={{ marginRight: 4 }} />
                    属性
                  </span>
                ),
                children: (
                  <PropertyPanel
                    element={selectedElement}
                    onUpdate={handleUpdateElement}
                    onUpdateAttribute={handleUpdateAttribute}
                  />
                ),
              },
              {
                key: 'animation',
                label: (
                  <span style={{ color: activeRightTab === 'animation' ? '#ff6b6b' : '#e0e0e0', fontSize: 12 }}>
                    <ThunderboltOutlined style={{ marginRight: 4 }} />
                    动画
                  </span>
                ),
                children: selectedElement ? (
                  <AnimationEditor
                    animations={animations}
                    onChange={handleAnimationsChange}
                  />
                ) : (
                  <div
                    style={{
                      width: 280,
                      height: '100%',
                      background: '#0f0f23',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666',
                      fontSize: 14,
                    }}
                  >
                    选择一个元素以编辑动画
                  </div>
                ),
              },
              {
                key: 'interaction',
                label: (
                  <span style={{ color: activeRightTab === 'interaction' ? '#ff6b6b' : '#e0e0e0', fontSize: 12 }}>
                    <InteractionOutlined style={{ marginRight: 4 }} />
                    交互
                  </span>
                ),
                children: selectedElement ? (
                  <InteractionEditor
                    triggers={triggers}
                    elements={allElements}
                    onChange={handleTriggersChange}
                  />
                ) : (
                  <div
                    style={{
                      width: 280,
                      height: '100%',
                      background: '#0f0f23',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666',
                      fontSize: 14,
                    }}
                  >
                    选择一个元素以编辑交互
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

export default MAMLEditor
