/**
 * 动画编辑器
 * 用于编辑 MAML 元素的动画效果
 * 包括动画列表、属性编辑、时间轴可视化、播放预览等功能
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Button,
  Input,
  InputNumber,
  Select,
  Switch,
  Tooltip,
  List,
  Tag,
  Modal,
  Form,
  Row,
  Col,
  Slider,
  Empty,
  message,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  RetweetOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons'

// 动画类型定义
export interface AnimationConfig {
  id: string
  type: 'AlphaAnimation' | 'PositionAnimation' | 'RotationAnimation' | 'ScaleAnimation' | 'NumberAnimation'
  property?: string // NumberAnimation 对应的属性名
  from: string | number
  to: string | number
  duration: number
  delay: number
  repeat: number
  ease: string
  loop: boolean
}

interface AnimationEditorProps {
  animations: AnimationConfig[]
  onChange: (animations: AnimationConfig[]) => void
}

// 动画类型选项
const ANIMATION_TYPES = [
  { value: 'AlphaAnimation', label: '透明度动画', color: '#ff6b6b' },
  { value: 'PositionAnimation', label: '位移动画', color: '#4ecdc4' },
  { value: 'RotationAnimation', label: '旋转动画', color: '#45b7d1' },
  { value: 'ScaleAnimation', label: '缩放动画', color: '#96ceb4' },
  { value: 'NumberAnimation', label: '数值动画', color: '#ffeaa7' },
]

// 缓动函数选项
const EASE_OPTIONS = [
  { value: 'Linear', label: 'Linear (线性)' },
  { value: 'QuadIn', label: 'QuadIn (加速)' },
  { value: 'QuadOut', label: 'QuadOut (减速)' },
  { value: 'QuadInOut', label: 'QuadInOut (加减速)' },
  { value: 'Bounce', label: 'Bounce (弹跳)' },
  { value: 'Elastic', label: 'Elastic (弹性)' },
]

// 生成唯一 ID
const generateId = () => `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// 获取动画类型标签
const getAnimationTypeLabel = (type: string) => {
  const found = ANIMATION_TYPES.find((t) => t.value === type)
  return found ? found.label : type
}

// 获取动画类型颜色
const getAnimationTypeColor = (type: string) => {
  const found = ANIMATION_TYPES.find((t) => t.value === type)
  return found ? found.color : '#888'
}

// 时间轴条形图组件
const TimelineBar: React.FC<{
  animation: AnimationConfig
  totalDuration: number
  index: number
}> = ({ animation, totalDuration, index }) => {
  const startPercent = totalDuration > 0 ? (animation.delay / totalDuration) * 100 : 0
  const durationPercent = totalDuration > 0 ? (animation.duration / totalDuration) * 100 : 0

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        padding: '4px 0',
      }}
    >
      <div style={{ width: 60, fontSize: 11, color: '#888', textAlign: 'right' }}>
        {getAnimationTypeLabel(animation.type)}
      </div>
      <div
        style={{
          flex: 1,
          height: 20,
          background: '#1a1a2e',
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 延迟区域 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${startPercent}%`,
            background: 'repeating-linear-gradient(45deg, #2a2a3e, #2a2a3e 4px, #1a1a2e 4px, #1a1a2e 8px)',
          }}
        />
        {/* 动画执行区域 */}
        <div
          style={{
            position: 'absolute',
            left: `${startPercent}%`,
            top: 0,
            height: '100%',
            width: `${durationPercent}%`,
            background: getAnimationTypeColor(animation.type),
            borderRadius: 4,
            opacity: 0.7,
            transition: 'all 0.3s ease',
          }}
        />
        {/* 循环标记 */}
        {animation.loop && (
          <div
            style={{
              position: 'absolute',
              right: 4,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#fff',
              fontSize: 10,
            }}
          >
            <RetweetOutlined />
          </div>
        )}
      </div>
      <div style={{ width: 50, fontSize: 10, color: '#666' }}>
        {animation.duration}ms
      </div>
    </div>
  )
}

const AnimationEditor: React.FC<AnimationEditorProps> = ({ animations, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAnimation, setEditingAnimation] = useState<AnimationConfig | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [form] = Form.useForm()

  // 计算总时长（用于时间轴缩放）
  const totalDuration = useMemo(() => {
    if (animations.length === 0) return 0
    return Math.max(...animations.map((a) => a.delay + a.duration))
  }, [animations])

  // 添加动画
  const handleAdd = useCallback(() => {
    setEditingAnimation(null)
    form.resetFields()
    form.setFieldsValue({
      type: 'AlphaAnimation',
      from: 0,
      to: 1,
      duration: 1000,
      delay: 0,
      repeat: 0,
      ease: 'Linear',
      loop: false,
    })
    setIsModalOpen(true)
  }, [form])

  // 编辑动画
  const handleEdit = useCallback(
    (animation: AnimationConfig) => {
      setEditingAnimation(animation)
      form.setFieldsValue({
        type: animation.type,
        property: animation.property,
        from: animation.from,
        to: animation.to,
        duration: animation.duration,
        delay: animation.delay,
        repeat: animation.repeat,
        ease: animation.ease,
        loop: animation.loop,
      })
      setIsModalOpen(true)
    },
    [form]
  )

  // 保存动画
  const handleSave = useCallback(() => {
    form.validateFields().then((values) => {
      if (editingAnimation) {
        // 更新现有动画
        const updated = animations.map((a) =>
          a.id === editingAnimation.id ? { ...a, ...values } : a
        )
        onChange(updated)
        message.success('动画已更新')
      } else {
        // 添加新动画
        const newAnimation: AnimationConfig = {
          id: generateId(),
          ...values,
        }
        onChange([...animations, newAnimation])
        message.success('动画已添加')
      }
      setIsModalOpen(false)
    })
  }, [animations, editingAnimation, form, onChange])

  // 删除动画
  const handleDelete = useCallback(
    (id: string) => {
      onChange(animations.filter((a) => a.id !== id))
      message.success('动画已删除')
    },
    [animations, onChange]
  )

  // 播放/暂停预览
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
    if (!isPlaying) {
      message.info('动画预览开始')
      // 模拟播放结束
      setTimeout(() => {
        setIsPlaying(false)
        message.success('动画预览结束')
      }, totalDuration + 500)
    }
  }, [isPlaying, totalDuration])

  // 获取缓动函数标签
  const getEaseLabel = (ease: string) => {
    const found = EASE_OPTIONS.find((e) => e.value === ease)
    return found ? found.label : ease
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
          <ThunderboltOutlined style={{ marginRight: 8, color: '#ff6b6b' }} />
          动画编辑器
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title={isPlaying ? '暂停预览' : '播放预览'}>
            <Button
              size="small"
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handlePlayPause}
              disabled={animations.length === 0}
              style={{
                background: isPlaying ? '#ff6b6b' : '#1a1a2e',
                borderColor: '#2a2a3e',
                color: isPlaying ? '#fff' : '#e0e0e0',
              }}
            />
          </Tooltip>
          <Tooltip title="添加动画">
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              style={{ background: '#ff6b6b', borderColor: '#ff6b6b' }}
            />
          </Tooltip>
        </div>
      </div>

      {/* 动画列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {animations.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: '#666' }}>暂无动画，点击添加</span>}
            style={{ marginTop: 40 }}
          />
        ) : (
          <List
            dataSource={animations}
            renderItem={(animation) => (
              <List.Item
                style={{
                  padding: '8px 12px',
                  marginBottom: 8,
                  background: '#1a1a2e',
                  borderRadius: 6,
                  border: '1px solid #2a2a3e',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => handleEdit(animation)}
                actions={[
                  <Tooltip title="删除" key="delete">
                    <Button
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(animation.id)
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag
                        color={getAnimationTypeColor(animation.type)}
                        style={{ fontSize: 11, margin: 0 }}
                      >
                        {getAnimationTypeLabel(animation.type)}
                      </Tag>
                      {animation.loop && (
                        <RetweetOutlined style={{ color: '#4ecdc4', fontSize: 12 }} />
                      )}
                    </div>
                  }
                  description={
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {animation.duration}ms
                        {animation.delay > 0 && (
                          <span style={{ marginLeft: 8 }}>
                            <FieldTimeOutlined style={{ marginRight: 4 }} />
                            延迟 {animation.delay}ms
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        {animation.from} → {animation.to} | {getEaseLabel(animation.ease)}
                        {animation.repeat !== 0 && (
                          <span style={{ marginLeft: 8 }}>
                            重复 {animation.repeat === -1 ? '无限' : animation.repeat + '次'}
                          </span>
                        )}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>

      {/* 时间轴可视化 */}
      {animations.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #2a2a3e',
            background: '#0a0a1a',
          }}
        >
          <div style={{ color: '#888', fontSize: 12, marginBottom: 8, fontWeight: 500 }}>
            <ClockCircleOutlined style={{ marginRight: 6 }} />
            时间轴
          </div>
          <div style={{ maxHeight: 120, overflow: 'auto' }}>
            {animations.map((animation, index) => (
              <TimelineBar
                key={animation.id}
                animation={animation}
                totalDuration={totalDuration}
                index={index}
              />
            ))}
          </div>
          <div style={{ textAlign: 'right', color: '#666', fontSize: 10, marginTop: 4 }}>
            总时长: {totalDuration}ms
          </div>
        </div>
      )}

      {/* 添加/编辑动画弹窗 */}
      <Modal
        title={editingAnimation ? '编辑动画' : '添加动画'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={480}
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
                name="type"
                label={<span style={{ color: '#888' }}>动画类型</span>}
                rules={[{ required: true, message: '请选择动画类型' }]}
              >
                <Select
                  style={{ width: '100%' }}
                  dropdownStyle={{ background: '#1a1a2e', borderColor: '#2a2a3e' }}
                >
                  {ANIMATION_TYPES.map((type) => (
                    <Select.Option key={type.value} value={type.value}>
                      <span style={{ color: type.color }}>{type.label}</span>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="ease"
                label={<span style={{ color: '#888' }}>缓动函数</span>}
                rules={[{ required: true, message: '请选择缓动函数' }]}
              >
                <Select
                  style={{ width: '100%' }}
                  dropdownStyle={{ background: '#1a1a2e', borderColor: '#2a2a3e' }}
                >
                  {EASE_OPTIONS.map((ease) => (
                    <Select.Option key={ease.value} value={ease.value}>
                      {ease.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* NumberAnimation 特有属性 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) =>
              getFieldValue('type') === 'NumberAnimation' ? (
                <Form.Item
                  name="property"
                  label={<span style={{ color: '#888' }}>目标属性</span>}
                  rules={[{ required: true, message: '请输入目标属性名' }]}
                >
                  <Input
                    placeholder="如: x, y, width, height"
                    style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="from"
                label={<span style={{ color: '#888' }}>起始值 (from)</span>}
                rules={[{ required: true, message: '请输入起始值' }]}
              >
                <Input
                  placeholder="起始值"
                  style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="to"
                label={<span style={{ color: '#888' }}>结束值 (to)</span>}
                rules={[{ required: true, message: '请输入结束值' }]}
              >
                <Input
                  placeholder="结束值"
                  style={{ background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="duration"
                label={<span style={{ color: '#888' }}>时长 (毫秒)</span>}
                rules={[{ required: true, message: '请输入时长' }]}
              >
                <InputNumber
                  min={0}
                  step={100}
                  style={{ width: '100%', background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                  addonAfter="ms"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="delay"
                label={<span style={{ color: '#888' }}>延迟 (毫秒)</span>}
                rules={[{ required: true, message: '请输入延迟' }]}
              >
                <InputNumber
                  min={0}
                  step={100}
                  style={{ width: '100%', background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                  addonAfter="ms"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="repeat"
                label={<span style={{ color: '#888' }}>重复次数</span>}
                rules={[{ required: true, message: '请输入重复次数' }]}
                tooltip="-1 表示无限循环"
              >
                <InputNumber
                  min={-1}
                  style={{ width: '100%', background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="loop"
                label={<span style={{ color: '#888' }}>循环播放</span>}
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="是"
                  unCheckedChildren="否"
                  style={{ background: '#2a2a3e' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default AnimationEditor
