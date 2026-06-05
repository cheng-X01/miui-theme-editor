/**
 * 组件库面板
 * 左侧分类标签页展示所有 MAML 元素，支持拖拽到画布
 */

import React, { useState, useMemo } from 'react'
import { Input, Tabs, Card, Empty } from 'antd'
import {
  LockOutlined,
  DesktopOutlined,
  FontSizeOutlined,
  PictureOutlined,
  BorderOutlined,
  MinusOutlined,
  EditOutlined,
  GroupOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  TableOutlined,
  ApiOutlined,
  InteractionOutlined,
  SlidersOutlined,
  SwitcherOutlined,
  EllipsisOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { MAMLElementType, MAMLElementDefinition } from '../../types'
import { getCategories, getElementsByCategory, searchElements } from '../../elementLibrary'

// Ant Design 图标映射
const iconMap: Record<string, React.ReactNode> = {
  lock: <LockOutlined />,
  desktop: <DesktopOutlined />,
  font: <FontSizeOutlined />,
  picture: <PictureOutlined />,
  square: <BorderOutlined />,
  circle: <BorderOutlined />,
  ellipsis: <EllipsisOutlined />,
  minus: <MinusOutlined />,
  edit: <EditOutlined />,
  group: <GroupOutlined />,
  'play-circle': <PlayCircleOutlined />,
  thunderbolt: <ThunderboltOutlined />,
  database: <DatabaseOutlined />,
  table: <TableOutlined />,
  api: <ApiOutlined />,
  interaction: <InteractionOutlined />,
  sliders: <SlidersOutlined />,
  switch: <SwitcherOutlined />,
}

interface ComponentLibraryProps {
  onDragStart: (type: MAMLElementType) => void
}

const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ onDragStart }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('layout')

  const categories = useMemo(() => getCategories(), [])

  // 根据搜索和分类过滤元素
  const filteredElements = useMemo(() => {
    if (searchQuery.trim()) {
      return searchElements(searchQuery)
    }
    return getElementsByCategory(activeCategory as MAMLElementDefinition['category'])
  }, [searchQuery, activeCategory])

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, type: MAMLElementType) => {
    e.dataTransfer.setData('application/maml-element', type)
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(type)
  }

  // 渲染元素卡片
  const renderElementCard = (element: MAMLElementDefinition) => (
    <Card
      key={element.type}
      size="small"
      className="maml-component-card"
      draggable
      onDragStart={(e) => handleDragStart(e, element.type)}
      style={{
        cursor: 'grab',
        background: '#1a1a2e',
        border: '1px solid #2a2a3e',
        borderRadius: 8,
        marginBottom: 8,
        transition: 'all 0.2s',
      }}
      bodyStyle={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
      onMouseEnter={(e) => {
        const card = e.currentTarget
        card.style.borderColor = '#ff6b6b'
        card.style.background = '#2a2a3e'
      }}
      onMouseLeave={(e) => {
        const card = e.currentTarget
        card.style.borderColor = '#2a2a3e'
        card.style.background = '#1a1a2e'
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: '#0f0f23',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ff6b6b',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {iconMap[element.icon] || <BorderOutlined />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: '#e0e0e0',
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 2,
          }}
        >
          {element.displayName}
        </div>
        <div
          style={{
            color: '#888',
            fontSize: 12,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {element.description || element.type}
        </div>
      </div>
    </Card>
  )

  return (
    <div
      style={{
        width: 260,
        height: '100%',
        background: '#0f0f23',
        borderRight: '1px solid #2a2a3e',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 标题 */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #2a2a3e',
        }}
      >
        <div
          style={{
            color: '#e0e0e0',
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          组件库
        </div>
        <Input
          placeholder="搜索组件..."
          prefix={<SearchOutlined style={{ color: '#666' }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: '#1a1a2e',
            borderColor: '#2a2a3e',
            color: '#e0e0e0',
          }}
          allowClear
        />
      </div>

      {/* 分类标签或搜索结果 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {searchQuery.trim() ? (
          // 搜索结果模式
          <div>
            <div
              style={{
                color: '#888',
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              搜索结果 ({filteredElements.length})
            </div>
            {filteredElements.length > 0 ? (
              filteredElements.map(renderElementCard)
            ) : (
              <Empty
                description="未找到匹配的组件"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ color: '#666' }}
              />
            )}
          </div>
        ) : (
          // 分类标签模式
          <Tabs
            activeKey={activeCategory}
            onChange={setActiveCategory}
            tabPosition="left"
            style={{ height: '100%' }}
            tabBarStyle={{
              width: 60,
              background: '#0f0f23',
              borderRight: '1px solid #2a2a3e',
            }}
            items={categories.map((cat) => ({
              key: cat.key,
              label: (
                <div
                  style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    fontSize: 12,
                    padding: '8px 0',
                    color: activeCategory === cat.key ? '#ff6b6b' : '#888',
                  }}
                >
                  {cat.label}
                </div>
              ),
              children: (
                <div style={{ paddingLeft: 8 }}>
                  <div
                    style={{
                      color: '#888',
                      fontSize: 12,
                      marginBottom: 12,
                    }}
                  >
                    {cat.label} ({filteredElements.length})
                  </div>
                  {filteredElements.map(renderElementCard)}
                </div>
              ),
            }))}
          />
        )}
      </div>

      {/* 底部提示 */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #2a2a3e',
          color: '#666',
          fontSize: 12,
          textAlign: 'center',
        }}
      >
        拖拽组件到画布
      </div>
    </div>
  )
}

export default ComponentLibrary
