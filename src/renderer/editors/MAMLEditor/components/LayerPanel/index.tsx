/**
 * 图层面板
 * 树形结构展示所有元素层级，支持可见性/锁定切换、重命名、拖拽排序
 */

import React, { useState } from 'react'
import { Tree, Button, Tooltip, Input } from 'antd'
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  FolderOutlined,
  FileOutlined,
} from '@ant-design/icons'
import type { MAMLElementInstance } from '../../types'

interface LayerPanelProps {
  elements: MAMLElementInstance[]
  selectedIds: string[]
  onSelect: (id: string) => void
  onToggleVisible: (id: string) => void
  onToggleLock: (id: string) => void
  onRename: (id: string, name: string) => void
  onReorder: (dragId: string, dropId: string, dropPosition: number) => void
}

interface TreeNodeData {
  key: string
  title: React.ReactNode
  children?: TreeNodeData[]
  icon?: React.ReactNode
  isLeaf?: boolean
}

const LayerPanel: React.FC<LayerPanelProps> = ({
  elements,
  selectedIds,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onRename,
  onReorder,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // 递归构建树节点
  const buildTreeNodes = (items: MAMLElementInstance[]): TreeNodeData[] => {
    return items.map((item) => ({
      key: item.id,
      title: (
        <LayerItem
          element={item}
          isSelected={selectedIds.includes(item.id)}
          isEditing={editingId === item.id}
          editName={editName}
          onSelect={() => onSelect(item.id)}
          onToggleVisible={() => onToggleVisible(item.id)}
          onToggleLock={() => onToggleLock(item.id)}
          onStartEdit={() => {
            setEditingId(item.id)
            setEditName(item.name)
          }}
          onFinishEdit={() => {
            if (editingId) {
              onRename(editingId, editName)
              setEditingId(null)
            }
          }}
          onEditNameChange={setEditName}
        />
      ),
      children: item.children && item.children.length > 0 ? buildTreeNodes(item.children) : undefined,
      icon: item.children && item.children.length > 0 ? <FolderOutlined /> : <FileOutlined />,
      isLeaf: !item.children || item.children.length === 0,
    }))
  }

  const treeData = buildTreeNodes(elements)

  // 处理拖拽
  const handleDrop = (info: any) => {
    const dragId = info.dragNode.key as string
    const dropId = info.node.key as string
    const dropPosition = info.dropPosition
    onReorder(dragId, dropId, dropPosition)
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
      {/* 标题 */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #2a2a3e',
          color: '#e0e0e0',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        图层
      </div>

      {/* 树形列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        <Tree
          treeData={treeData}
          selectedKeys={selectedIds}
          onSelect={(keys) => {
            if (keys.length > 0) {
              onSelect(keys[0] as string)
            }
          }}
          draggable
          onDrop={handleDrop}
          style={{ background: 'transparent' }}
          showIcon
          defaultExpandAll
        />
      </div>
    </div>
  )
}

// 单个图层项组件
interface LayerItemProps {
  element: MAMLElementInstance
  isSelected: boolean
  isEditing: boolean
  editName: string
  onSelect: () => void
  onToggleVisible: () => void
  onToggleLock: () => void
  onStartEdit: () => void
  onFinishEdit: () => void
  onEditNameChange: (name: string) => void
}

const LayerItem: React.FC<LayerItemProps> = ({
  element,
  isSelected,
  isEditing,
  editName,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onStartEdit,
  onFinishEdit,
  onEditNameChange,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 0',
        cursor: 'pointer',
        background: isSelected ? 'rgba(255, 107, 107, 0.15)' : 'transparent',
        borderRadius: 4,
      }}
      onClick={onSelect}
      onDoubleClick={onStartEdit}
    >
      {/* 可见性切换 */}
      <div
        style={{ cursor: 'pointer', color: element.visible ? '#e0e0e0' : '#666' }}
        onClick={(e) => {
          e.stopPropagation()
          onToggleVisible()
        }}
      >
        {element.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
      </div>

      {/* 锁定切换 */}
      <div
        style={{ cursor: 'pointer', color: element.locked ? '#ff6b6b' : '#666' }}
        onClick={(e) => {
          e.stopPropagation()
          onToggleLock()
        }}
      >
        {element.locked ? <LockOutlined /> : <UnlockOutlined />}
      </div>

      {/* 名称 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onBlur={onFinishEdit}
            onPressEnter={onFinishEdit}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            size="small"
            style={{
              background: '#1a1a2e',
              borderColor: '#ff6b6b',
              color: '#e0e0e0',
              fontSize: 12,
            }}
          />
        ) : (
          <span
            style={{
              color: element.visible ? '#e0e0e0' : '#666',
              fontSize: 12,
              textDecoration: element.visible ? 'none' : 'line-through',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
            }}
          >
            {element.name}
          </span>
        )}
      </div>

      {/* 类型标签 */}
      <span
        style={{
          color: '#666',
          fontSize: 10,
          padding: '2px 6px',
          background: '#1a1a2e',
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}
      >
        {element.type}
      </span>
    </div>
  )
}

export default LayerPanel
