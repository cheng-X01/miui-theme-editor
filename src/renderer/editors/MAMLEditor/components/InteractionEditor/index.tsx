/**
 * 交互编辑器
 * 用于编辑 MAML 元素的交互逻辑（触发器）
 * 包括触发器列表、条件表达式编辑、语法提示等功能
 */

import React, { useState, useCallback, useRef } from 'react'
import {
  Button,
  Input,
  Select,
  Tooltip,
  List,
  Tag,
  Modal,
  Form,
  Row,
  Col,
  Empty,
  message,
  Badge,
  Popover,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  InteractionOutlined,
  AimOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SwapOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'

// 触发器配置定义
export interface TriggerConfig {
  id: string
  action: string
  condition?: string
  target: string
  operation: 'show' | 'hide' | 'animate' | 'set_property' | 'toggle'
  params?: Record<string, string | number>
}

interface InteractionEditorProps {
  triggers: TriggerConfig[]
  elements: { id: string; name: string }[] // 可选的目标元素列表
  onChange: (triggers: TriggerConfig[]) => void
}

// 动作类型选项
const ACTION_OPTIONS = [
  { value: 'click', label: '点击', color: '#ff6b6b' },
  { value: 'double_click', label: '双击', color: '#ff6b6b' },
  { value: 'long_press', label: '长按', color: '#ff6b6b' },
  { value: 'swipe_up', label: '上滑', color: '#4ecdc4' },
  { value: 'swipe_down', label: '下滑', color: '#4ecdc4' },
  { value: 'swipe_left', label: '左滑', color: '#4ecdc4' },
  { value: 'swipe_right', label: '右滑', color: '#4ecdc4' },
  { value: 'shake', label: '摇晃', color: '#45b7d1' },
  { value: 'battery_change', label: '电量变化', color: '#ffeaa7' },
  { value: 'time_change', label: '时间变化', color: '#ffeaa7' },
]

// 执行操作选项
const OPERATION_OPTIONS = [
  { value: 'show', label: '显示', icon: <EyeOutlined />, color: '#52c41a' },
  { value: 'hide', label: '隐藏', icon: <EyeInvisibleOutlined />, color: '#ff6b6b' },
  { value: 'animate', label: '播放动画', icon: <ThunderboltOutlined />, color: '#4ecdc4' },
  { value: 'set_property', label: '设置属性', icon: <SettingOutlined />, color: '#45b7d1' },
  { value: 'toggle', label: '切换状态', icon: <SwapOutlined />, color: '#ffeaa7' },
]

// 条件表达式语法提示
const CONDITION_SNIPPETS = [
  { label: '电量低', value: '#batteryLevel < 20', description: '电量低于20%' },
  { label: '白天', value: '#hour >= 6 && #hour < 18', description: '早上6点到晚上6点' },
  { label: '夜晚', value: '#hour >= 18 || #hour < 6', description: '晚上6点到早上6点' },
  { label: '充电中', value: '#charging == true', description: '设备正在充电' },
  { label: '有通知', value: '#hasNotification == true', description: '存在未读通知' },
  { label: '解锁', value: '#unlock == true', description: '设备已解锁' },
]

// 条件表达式变量提示
const CONDITION_VARIABLES = [
  { name: '#batteryLevel', type: 'number', description: '电量百分比 (0-100)' },
  { name: '#charging', type: 'boolean', description: '是否正在充电' },
  { name: '#hour', type: 'number', description: '当前小时 (0-23)' },
  { name: '#minute', type: 'number', description: '当前分钟 (0-59)' },
  { name: '#second', type: 'number', description: '当前秒 (0-59)' },
  { name: '#dayOfWeek', type: 'number', description: '星期几 (0-6)' },
  { name: '#hasNotification', type: 'boolean', description: '是否有未读通知' },
  { name: '#unlock', type: 'boolean', description: '是否已解锁' },
  { name: '#wifiConnected', type: 'boolean', description: '是否连接WiFi' },
  { name: '#musicPlaying', type: 'boolean', description: '是否正在播放音乐' },
]

// 生成唯一 ID
const generateId = () => `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// 获取动作类型标签
const getActionLabel = (action: string) => {
  const found = ACTION_OPTIONS.find((a) => a.value === action)
  return found ? found.label : action
}

// 获取动作类型颜色
const getActionColor = (action: string) => {
  const found = ACTION_OPTIONS.find((a) => a.value === action)
  return found ? found.color : '#888'
}

// 获取操作类型标签
const getOperationLabel = (operation: string) => {
  const found = OPERATION_OPTIONS.find((o) => o.value === operation)
  return found ? found.label : operation
}

// 获取操作类型颜色
const getOperationColor = (operation: string) => {
  const found = OPERATION_OPTIONS.find((o) => o.value === operation)
  return found ? found.color : '#888'
}

// 条件表达式编辑器组件（带语法提示）
const ConditionEditor: React.FC<{
  value?: string
  onChange: (value: string) => void
}> = ({ value, onChange }) => {
  const [showHints, setShowHints] = useState(false)
  const inputRef = useRef<any>(null)

  // 插入变量到光标位置
  const insertVariable = (variableName: string) => {
    const input = inputRef.current?.input
    if (input) {
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const currentValue = value || ''
      const newValue = currentValue.substring(0, start) + variableName + currentValue.substring(end)
      onChange(newValue)
      // 聚焦并设置光标位置
      setTimeout(() => {
        input.focus()
        const newCursorPos = start + variableName.length
        input.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    } else {
      onChange((value || '') + variableName)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Input.TextArea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="输入条件表达式，如: #batteryLevel < 20"
          style={{
            background: '#1a1a2e',
            borderColor: '#2a2a3e',
            color: '#e0e0e0',
            fontFamily: '"Fira Code", "Consolas", monospace',
            fontSize: 13,
          }}
          rows={2}
        />
      </div>

      {/* 语法提示面板 */}
      <div
        style={{
          background: '#1a1a2e',
          border: '1px solid #2a2a3e',
          borderRadius: 6,
          padding: 12,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            marginBottom: showHints ? 8 : 0,
          }}
          onClick={() => setShowHints(!showHints)}
        >
          <span style={{ color: '#888', fontSize: 12, fontWeight: 500 }}>
            <CodeOutlined style={{ marginRight: 6 }} />
            语法提示
          </span>
          <span style={{ color: '#666', fontSize: 11 }}>{showHints ? '收起' : '展开'}</span>
        </div>

        {showHints && (
          <>
            {/* 快速插入变量 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#666', fontSize: 11, marginBottom: 6 }}>可用变量（点击插入）</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CONDITION_VARIABLES.map((variable) => (
                  <Tooltip key={variable.name} title={`${variable.description} (${variable.type})`}>
                    <Tag
                      color="blue"
                      style={{ cursor: 'pointer', fontSize: 11 }}
                      onClick={() => insertVariable(variable.name)}
                    >
                      {variable.name}
                    </Tag>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* 常用表达式模板 */}
            <div>
              <div style={{ color: '#666', fontSize: 11, marginBottom: 6 }}>常用表达式</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {CONDITION_SNIPPETS.map((snippet) => (
                  <div
                    key={snippet.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      background: '#0f0f23',
                      borderRadius: 4,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onClick={() => onChange(snippet.value)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#2a2a3e'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#0f0f23'
                    }}
                  >
                    <div>
                      <span style={{ color: '#4ecdc4', fontSize: 12, fontFamily: 'monospace' }}>
                        {snippet.value}
                      </span>
                      <span style={{ color: '#666', fontSize: 11, marginLeft: 8 }}>
                        {snippet.description}
                      </span>
                    </div>
                    <Tag size="small" style={{ fontSize: 10 }}>
                      {snippet.label}
                    </Tag>
                  </div>
                ))}
              </div>
            </div>

            {/* 运算符说明 */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a3e' }}>
              <div style={{ color: '#666', fontSize: 11, marginBottom: 6 }}>支持的运算符</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['==', '!=', '<', '>', '<=', '>=', '&&', '||', '!'].map((op) => (
                  <code
                    key={op}
                    style={{
                      background: '#0f0f23',
                      padding: '2px 6px',
                      borderRadius: 3,
                      color: '#ffeaa7',
                      fontSize: 12,
                    }}
                  >
                    {op}
                  </code>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const InteractionEditor: React.FC<InteractionEditorProps> = ({ triggers, elements, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTrigger, setEditingTrigger] = useState<TriggerConfig | null>(null)
  const [form] = Form.useForm()

  // 添加触发器
  const handleAdd = useCallback(() => {
    setEditingTrigger(null)
    form.resetFields()
    form.setFieldsValue({
      action: 'click',
      target: elements.length > 0 ? elements[0].id : '',
      operation: 'show',
      condition: '',
      params: {},
    })
    setIsModalOpen(true)
  }, [form, elements])

  // 编辑触发器
  const handleEdit = useCallback(
    (trigger: TriggerConfig) => {
      setEditingTrigger(trigger)
      form.setFieldsValue({
        action: trigger.action,
        condition: trigger.condition,
        target: trigger.target,
        operation: trigger.operation,
        params: trigger.params,
      })
      setIsModalOpen(true)
    },
    [form]
  )

  // 保存触发器
  const handleSave = useCallback(() => {
    form.validateFields().then((values) => {
      if (editingTrigger) {
        // 更新现有触发器
        const updated = triggers.map((t) =>
          t.id === editingTrigger.id ? { ...t, ...values } : t
        )
        onChange(updated)
        message.success('触发器已更新')
      } else {
        // 添加新触发器
        const newTrigger: TriggerConfig = {
          id: generateId(),
          ...values,
        }
        onChange([...triggers, newTrigger])
        message.success('触发器已添加')
      }
      setIsModalOpen(false)
    })
  }, [triggers, editingTrigger, form, onChange])

  // 删除触发器
  const handleDelete = useCallback(
    (id: string) => {
      onChange(triggers.filter((t) => t.id !== id))
      message.success('触发器已删除')
    },
    [triggers, onChange]
  )

  // 获取元素名称
  const getElementName = (elementId: string) => {
    const found = elements.find((e) => e.id === elementId)
    return found ? found.name : elementId
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
        overflow: 'hidden',
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ color: '#e0e0e0', fontSize: 16, fontWeight: 600 }}>
          <InteractionOutlined style={{ marginRight: 8, color: '#4ecdc4' }} />
          交互编辑器
        </div>
        <Tooltip title="添加触发器">
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            style={{ background: '#4ecdc4', borderColor: '#4ecdc4' }}
          />
        </Tooltip>
      </div>

      {/* 触发器列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {triggers.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: '#666' }}>暂无触发器，点击添加</span>}
            style={{ marginTop: 40 }}
          />
        ) : (
          <List
            dataSource={triggers}
            renderItem={(trigger) => (
              <List.Item
                style={{
                  padding: '10px 12px',
                  marginBottom: 8,
                  background: '#1a1a2e',
                  borderRadius: 6,
                  border: '1px solid #2a2a3e',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => handleEdit(trigger)}
                actions={[
                  <Tooltip title="删除" key="delete">
                    <Button
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(trigger.id)
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ff6b6b',
                      }}
                    />
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Tag
                        color={getActionColor(trigger.action)}
                        style={{ fontSize: 11, margin: 0 }}
                      >
                        <AimOutlined style={{ marginRight: 4 }} />
                        {getActionLabel(trigger.action)}
                      </Tag>
                      <span style={{ color: '#666', fontSize: 11 }}>→</span>
                      <Tag
                        color={getOperationColor(trigger.operation)}
                        style={{ fontSize: 11, margin: 0 }}
                      >
                        {getOperationLabel(trigger.operation)}
                      </Tag>
                    </div>
                  }
                  description={
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                        <span style={{ color: '#666' }}>目标: </span>
                        {getElementName(trigger.target)}
                      </div>
                      {trigger.condition && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#4ecdc4',
                            fontFamily: '"Fira Code", "Consolas", monospace',
                            background: '#0f0f23',
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid #2a2a3e',
                          }}
                        >
                          <CodeOutlined style={{ marginRight: 4, color: '#666' }} />
                          {trigger.condition}
                        </div>
                      )}
                      {trigger.params && Object.keys(trigger.params).length > 0 && (
                        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                          参数: {JSON.stringify(trigger.params)}
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>

      {/* 底部提示 */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid #2a2a3e',
          background: '#0a0a1a',
        }}
      >
        <div style={{ color: '#666', fontSize: 11, lineHeight: 1.6 }}>
          <QuestionCircleOutlined style={{ marginRight: 4 }} />
          点击列表项编辑触发器，条件表达式支持变量和运算符
        </div>
      </div>

      {/* 添加/编辑触发器弹窗 */}
      <Modal
        title={editingTrigger ? '编辑触发器' : '添加触发器'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={520}
        styles={{
          header: { background: '#0f0f23', borderBottom: '1px solid #2a2a3e', color: '#e0e0e0' },
          body: { background: '#0f0f23', color: '#e0e0e0' },
          footer: { background: '#0f0f23', borderTop: '1px solid #2a2a3e' },
          mask: { background: 'rgba(0, 0, 0, 0.7)' },
        }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="action"
                label={<span style={{ color: '#888' }}>触发动作</span>}
                rules={[{ required: true, message: '请选择触发动作' }]}
              >
                <Select
                  style={{ width: '100%' }}
                  dropdownStyle={{ background: '#1a1a2e', borderColor: '#2a2a3e' }}
                >
                  {ACTION_OPTIONS.map((action) => (
                    <Select.Option key={action.value} value={action.value}>
                      <span style={{ color: action.color }}>{action.label}</span>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="operation"
                label={<span style={{ color: '#888' }}>执行操作</span>}
                rules={[{ required: true, message: '请选择执行操作' }]}
              >
                <Select
                  style={{ width: '100%' }}
                  dropdownStyle={{ background: '#1a1a2e', borderColor: '#2a2a3e' }}
                >
                  {OPERATION_OPTIONS.map((op) => (
                    <Select.Option key={op.value} value={op.value}>
                      <span style={{ color: op.color }}>{op.icon} {op.label}</span>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="target"
            label={<span style={{ color: '#888' }}>目标元素</span>}
            rules={[{ required: true, message: '请选择目标元素' }]}
          >
            <Select
              style={{ width: '100%' }}
              dropdownStyle={{ background: '#1a1a2e', borderColor: '#2a2a3e' }}
              placeholder="选择要控制的元素"
            >
              {elements.map((element) => (
                <Select.Option key={element.id} value={element.id}>
                  {element.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="condition"
            label={
              <span style={{ color: '#888' }}>
                条件表达式
                <span style={{ color: '#666', fontSize: 11, marginLeft: 8 }}>（可选）</span>
              </span>
            }
          >
            <ConditionEditor />
          </Form.Item>

          {/* 参数配置（根据操作类型显示不同参数） */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.operation !== currentValues.operation
            }
          >
            {({ getFieldValue }) => {
              const operation = getFieldValue('operation')
              if (operation === 'set_property') {
                return (
                  <Form.Item
                    name={['params', 'property']}
                    label={<span style={{ color: '#888' }}>属性名</span>}
                    rules={[{ required: true, message: '请输入属性名' }]}
                  >
                    <Input
                      placeholder="如: alpha, x, y, rotation"
                      style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                    />
                  </Form.Item>
                )
              }
              if (operation === 'animate') {
                return (
                  <Form.Item
                    name={['params', 'animationId']}
                    label={<span style={{ color: '#888' }}>动画 ID</span>}
                    rules={[{ required: true, message: '请输入动画 ID' }]}
                  >
                    <Input
                      placeholder="要播放的动画 ID"
                      style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                    />
                  </Form.Item>
                )
              }
              return null
            }}
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.operation !== currentValues.operation
            }
          >
            {({ getFieldValue }) => {
              const operation = getFieldValue('operation')
              if (operation === 'set_property') {
                return (
                  <Form.Item
                    name={['params', 'value']}
                    label={<span style={{ color: '#888' }}>属性值</span>}
                    rules={[{ required: true, message: '请输入属性值' }]}
                  >
                    <Input
                      placeholder="属性值"
                      style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                    />
                  </Form.Item>
                )
              }
              return null
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default InteractionEditor
