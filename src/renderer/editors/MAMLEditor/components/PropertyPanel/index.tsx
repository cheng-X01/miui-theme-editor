/**
 * 属性面板
 * 根据选中元素动态显示属性表单
 */

import React, { useState, useMemo } from 'react'
import { Input, InputNumber, Switch, Select, Collapse, Tooltip, Button, Row, Col } from 'antd'
import { LockOutlined, UnlockOutlined, LinkOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import type { MAMLElementInstance, MAMLAttribute } from '../../types'
import { getElementDefinition } from '../../elementLibrary'

interface PropertyPanelProps {
  element: MAMLElementInstance | null
  onUpdate: (id: string, updates: Partial<MAMLElementInstance>) => void
  onUpdateAttribute: (id: string, name: string, value: string | number | boolean) => void
}

const { Panel } = Collapse

// 颜色选择器组件（简化版）
const ColorPicker: React.FC<{
  value: string
  onChange: (color: string) => void
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const presetColors = [
    '#ffffff', '#000000', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
    '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe', '#00b894', '#e17055',
  ]

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          padding: '4px 8px',
          background: '#1a1a2e',
          border: '1px solid #2a2a3e',
          borderRadius: 4,
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: value || '#ffffff',
            border: '1px solid #444',
          }}
        />
        <span style={{ color: '#e0e0e0', fontSize: 12 }}>{value || '#ffffff'}</span>
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 100,
            background: '#0f0f23',
            border: '1px solid #2a2a3e',
            borderRadius: 8,
            padding: 12,
            marginTop: 4,
            width: 200,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
            {presetColors.map((color) => (
              <div
                key={color}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: color,
                  cursor: 'pointer',
                  border: value === color ? '2px solid #ff6b6b' : '1px solid #444',
                }}
                onClick={() => {
                  onChange(color)
                  setIsOpen(false)
                }}
              />
            ))}
          </div>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ marginTop: 8, background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
            placeholder="#RRGGBB"
          />
        </div>
      )}
    </div>
  )
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ element, onUpdate, onUpdateAttribute }) => {
  const [ratioLocked, setRatioLocked] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(1)

  const elementDef = useMemo(() => {
    if (!element) return null
    return getElementDefinition(element.type)
  }, [element])

  if (!element || !elementDef) {
    return (
      <div
        style={{
          width: 280,
          height: '100%',
          background: '#0f0f23',
          borderLeft: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: 14,
        }}
      >
        选择一个元素以编辑属性
      </div>
    )
  }

  // 渲染单个属性输入
  const renderAttributeInput = (attr: MAMLAttribute) => {
    const value = element.attributes[attr.name]

    switch (attr.type) {
      case 'string':
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => onUpdateAttribute(element.id, attr.name, e.target.value)}
            style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
            placeholder={attr.description}
          />
        )
      case 'number':
        return (
          <InputNumber
            value={value as number}
            onChange={(val) => onUpdateAttribute(element.id, attr.name, val || 0)}
            min={attr.min}
            max={attr.max}
            step={attr.step || 1}
            style={{ width: '100%', background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
            placeholder={attr.description}
          />
        )
      case 'boolean':
        return (
          <Switch
            checked={!!value}
            onChange={(checked) => onUpdateAttribute(element.id, attr.name, checked)}
          />
        )
      case 'color':
        return (
          <ColorPicker
            value={(value as string) || '#ffffff'}
            onChange={(color) => onUpdateAttribute(element.id, attr.name, color)}
          />
        )
      case 'expression':
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => onUpdateAttribute(element.id, attr.name, e.target.value)}
            style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
            placeholder={`表达式: ${attr.description}`}
          />
        )
      case 'enum':
        return (
          <Select
            value={value as string}
            onChange={(val) => onUpdateAttribute(element.id, attr.name, val)}
            style={{ width: '100%' }}
            dropdownStyle={{ background: '#1a1a2e', borderColor: '#2a2a3e' }}
          >
            {attr.options?.map((opt) => (
              <Select.Option key={opt} value={opt}>
                {opt}
              </Select.Option>
            ))}
          </Select>
        )
      default:
        return null
    }
  }

  // 处理尺寸变化（带锁定比例）
  const handleWidthChange = (width: number) => {
    if (ratioLocked) {
      const newHeight = width / aspectRatio
      onUpdate(element.id, { width, height: newHeight })
    } else {
      onUpdate(element.id, { width })
    }
  }

  const handleHeightChange = (height: number) => {
    if (ratioLocked) {
      const newWidth = height * aspectRatio
      onUpdate(element.id, { height, width: newWidth })
    } else {
      onUpdate(element.id, { height })
    }
  }

  // 锁定比例
  const toggleRatioLock = () => {
    if (!ratioLocked) {
      setAspectRatio(element.width / element.height)
    }
    setRatioLocked(!ratioLocked)
  }

  return (
    <div
      style={{
        width: 280,
        height: '100%',
        background: '#0f0f23',
        borderLeft: '1px solid #2a2a3e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}
    >
      {/* 标题 */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #2a2a3e',
        }}
      >
        <div style={{ color: '#e0e0e0', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {elementDef.displayName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Input
            value={element.name}
            onChange={(e) => onUpdate(element.id, { name: e.target.value })}
            style={{
              flex: 1,
              background: '#1a1a2e',
              borderColor: '#2a2a3e',
              color: '#e0e0e0',
              fontSize: 12,
            }}
          />
          <Tooltip title={element.locked ? '解锁' : '锁定'}>
            <Button
              size="small"
              icon={element.locked ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => onUpdate(element.id, { locked: !element.locked })}
              style={{
                background: element.locked ? '#ff6b6b' : '#1a1a2e',
                borderColor: '#2a2a3e',
                color: element.locked ? '#fff' : '#e0e0e0',
              }}
            />
          </Tooltip>
          <Tooltip title={element.visible ? '隐藏' : '显示'}>
            <Button
              size="small"
              icon={element.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => onUpdate(element.id, { visible: !element.visible })}
              style={{
                background: '#1a1a2e',
                borderColor: '#2a2a3e',
                color: element.visible ? '#e0e0e0' : '#666',
              }}
            />
          </Tooltip>
        </div>
      </div>

      {/* 属性表单 */}
      <div style={{ padding: '12px 16px', flex: 1 }}>
        <Collapse
          defaultActiveKey={['transform', 'style', 'attributes']}
          ghost
          style={{ background: 'transparent' }}
        >
          {/* 变换属性 */}
          <Panel
            header={<span style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500 }}>位置与尺寸</span>}
            key="transform"
            style={{ borderBottom: '1px solid #2a2a3e' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Row gutter={8}>
                <Col span={12}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>X</div>
                  <InputNumber
                    value={element.x}
                    onChange={(val) => onUpdate(element.id, { x: val || 0 })}
                    style={{ width: '100%', background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                  />
                </Col>
                <Col span={12}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>Y</div>
                  <InputNumber
                    value={element.y}
                    onChange={(val) => onUpdate(element.id, { y: val || 0 })}
                    style={{ width: '100%', background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                  />
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>宽度</div>
                  <InputNumber
                    value={element.width}
                    onChange={(val) => handleWidthChange(val || 0)}
                    min={1}
                    style={{ width: '100%', background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                  />
                </Col>
                <Col span={12}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>高度</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <InputNumber
                      value={element.height}
                      onChange={(val) => handleHeightChange(val || 0)}
                      min={1}
                      style={{ flex: 1, background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                    />
                    <Button
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={toggleRatioLock}
                      style={{
                        background: ratioLocked ? '#ff6b6b' : '#1a1a2e',
                        borderColor: '#2a2a3e',
                        color: ratioLocked ? '#fff' : '#e0e0e0',
                      }}
                    />
                  </div>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>旋转</div>
                  <InputNumber
                    value={element.rotation || 0}
                    onChange={(val) => onUpdate(element.id, { rotation: val || 0 })}
                    min={-360}
                    max={360}
                    style={{ width: '100%', background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                    addonAfter="°"
                  />
                </Col>
                <Col span={12}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>透明度</div>
                  <InputNumber
                    value={element.alpha ?? 1}
                    onChange={(val) => onUpdate(element.id, { alpha: Math.max(0, Math.min(1, val || 0)) })}
                    min={0}
                    max={1}
                    step={0.01}
                    style={{ width: '100%', background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                  />
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>缩放 X</div>
                  <InputNumber
                    value={element.scaleX || 1}
                    onChange={(val) => onUpdate(element.id, { scaleX: val || 1 })}
                    min={0}
                    step={0.01}
                    style={{ width: '100%', background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                  />
                </Col>
                <Col span={12}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>缩放 Y</div>
                  <InputNumber
                    value={element.scaleY || 1}
                    onChange={(val) => onUpdate(element.id, { scaleY: val || 1 })}
                    min={0}
                    step={0.01}
                    style={{ width: '100%', background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                  />
                </Col>
              </Row>
            </div>
          </Panel>

          {/* 元素特有属性 */}
          <Panel
            header={<span style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500 }}>属性</span>}
            key="attributes"
            style={{ borderBottom: '1px solid #2a2a3e' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {elementDef.attributes.map((attr) => (
                <div key={attr.name}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <span style={{ color: '#888', fontSize: 11 }}>{attr.description || attr.name}</span>
                    {attr.required && <span style={{ color: '#ff6b6b', fontSize: 10 }}>*</span>}
                  </div>
                  {renderAttributeInput(attr)}
                </div>
              ))}
            </div>
          </Panel>
        </Collapse>
      </div>

      {/* 元素信息 */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #2a2a3e',
          color: '#666',
          fontSize: 11,
        }}
      >
        <div>ID: {element.id.slice(0, 16)}...</div>
        <div>类型: {element.type}</div>
      </div>
    </div>
  )
}

export default PropertyPanel
