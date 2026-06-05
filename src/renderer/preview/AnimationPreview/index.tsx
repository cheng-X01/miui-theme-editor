/**
 * 动画预览组件
 * 预览 MAML 动画效果，支持时间轴控制、关键帧展示、缓动函数可视化
 *
 * 功能说明：
 * - 时间轴控制（播放/暂停/停止/快进/快退）
 * - 关键帧展示
 * - 动画属性实时变化显示
 * - 缓动函数可视化曲线
 * - 支持多动画叠加预览
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Button,
  Card,
  Space,
  Slider,
  Tag,
  Tooltip,
  Progress,
  Empty,
  Badge,
  Divider,
  List,
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  FastForwardOutlined,
  FastBackwardOutlined,
  RetweetOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LineChartOutlined,
} from '@ant-design/icons'
import type { AnimationConfig } from '../../editors/MAMLEditor/components/AnimationEditor'

// ==================== 类型定义 ====================

/** 动画预览组件 Props */
interface AnimationPreviewProps {
  /** 动画配置列表（复用 MAMLEditor 的 AnimationConfig） */
  animations: AnimationConfig[]
  /** 元素当前状态 */
  elementState: Record<string, any>
  /** 状态变化回调 */
  onStateChange: (state: Record<string, any>) => void
}

/** 播放状态 */
interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  totalDuration: number
  progress: number
}

/** 缓动函数类型 */
type EasingFunction = (t: number) => number

// ==================== 常量 ====================

/** 动画类型颜色映射 */
const ANIMATION_TYPE_COLORS: Record<string, string> = {
  AlphaAnimation: '#ff6b6b',
  PositionAnimation: '#4ecdc4',
  RotationAnimation: '#45b7d1',
  ScaleAnimation: '#96ceb4',
  NumberAnimation: '#ffeaa7',
}

/** 动画类型中文标签 */
const ANIMATION_TYPE_LABELS: Record<string, string> = {
  AlphaAnimation: '透明度',
  PositionAnimation: '位移',
  RotationAnimation: '旋转',
  ScaleAnimation: '缩放',
  NumberAnimation: '数值',
}

/** 缓动函数实现 */
const EASING_FUNCTIONS: Record<string, EasingFunction> = {
  Linear: (t) => t,
  QuadIn: (t) => t * t,
  QuadOut: (t) => 1 - (1 - t) * (1 - t),
  QuadInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  Bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
  },
  Elastic: (t) => {
    if (t === 0) return 0
    if (t === 1) return 1
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI)
  },
}

/** 缓动函数中文标签 */
const EASE_LABELS: Record<string, string> = {
  Linear: '线性',
  QuadIn: '加速',
  QuadOut: '减速',
  QuadInOut: '加减速',
  Bounce: '弹跳',
  Elastic: '弹性',
}

// ==================== 辅助函数 ====================

/**
 * 解析动画数值
 */
const parseValue = (value: string | number): number => {
  if (typeof value === 'number') return value
  const parsed = parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * 计算动画当前值
 */
const calculateAnimationValue = (
  animation: AnimationConfig,
  currentTime: number
): number => {
  const from = parseValue(animation.from)
  const to = parseValue(animation.to)
  const duration = animation.duration
  const delay = animation.delay

  if (currentTime < delay) return from
  if (currentTime >= delay + duration) return to

  const progress = (currentTime - delay) / duration
  const easeFunc = EASING_FUNCTIONS[animation.ease] || EASING_FUNCTIONS.Linear
  const easedProgress = easeFunc(progress)

  return from + (to - from) * easedProgress
}

// ==================== 子组件 ====================

/**
 * 缓动函数曲线可视化
 */
const EasingCurve: React.FC<{
  ease: string
  color: string
}> = ({ ease, color }) => {
  const easeFunc = EASING_FUNCTIONS[ease] || EASING_FUNCTIONS.Linear
  const points: string[] = []
  const width = 120
  const height = 60

  for (let i = 0; i <= 50; i++) {
    const t = i / 50
    const x = t * width
    const y = height - easeFunc(t) * height
    points.push(`${x},${y}`)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={width} height={height} style={{ background: '#1a1a2e', borderRadius: 4 }}>
        {/* 网格线 */}
        <line x1="0" y1={height} x2={width} y2={height} stroke="#2a2a3e" strokeWidth={1} />
        <line x1="0" y1="0" x2="0" y2={height} stroke="#2a2a3e" strokeWidth={1} />
        {/* 曲线 */}
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* 端点 */}
        <circle cx="0" cy={height} r={3} fill={color} />
        <circle cx={width} cy="0" r={3} fill={color} />
      </svg>
      <span style={{ color: '#666', fontSize: 11 }}>{EASE_LABELS[ease] || ease}</span>
    </div>
  )
}

/**
 * 时间轴轨道
 */
const TimelineTrack: React.FC<{
  animation: AnimationConfig
  totalDuration: number
  currentTime: number
  isVisible: boolean
  onToggleVisibility: () => void
}> = ({ animation, totalDuration, currentTime, isVisible, onToggleVisibility }) => {
  const color = ANIMATION_TYPE_COLORS[animation.type] || '#888'
  const startPercent = totalDuration > 0 ? (animation.delay / totalDuration) * 100 : 0
  const durationPercent = totalDuration > 0 ? (animation.duration / totalDuration) * 100 : 0
  const currentPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  const currentValue = calculateAnimationValue(animation, currentTime)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0',
        borderBottom: '1px solid #2a2a3e',
      }}
    >
      {/* 动画信息 */}
      <div style={{ width: 120, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Tag
            color={color}
            style={{ margin: 0, fontSize: 10, padding: '0 4px', height: 18, lineHeight: '18px' }}
          >
            {ANIMATION_TYPE_LABELS[animation.type]}
          </Tag>
          <Button
            type="text"
            size="small"
            icon={
              isVisible ? (
                <EyeOutlined style={{ color: '#888', fontSize: 12 }} />
              ) : (
                <EyeInvisibleOutlined style={{ color: '#666', fontSize: 12 }} />
              )
            }
            onClick={onToggleVisibility}
            style={{ padding: 0, minWidth: 20, height: 20 }}
          />
        </div>
        <div style={{ fontSize: 10, color: '#666' }}>
          {animation.from} → {animation.to}
        </div>
        <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
          当前值: <span style={{ color }}>{currentValue.toFixed(2)}</span>
        </div>
      </div>

      {/* 时间轴条 */}
      <div style={{ flex: 1, position: 'relative', height: 28 }}>
        {/* 背景轨道 */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 0,
            right: 0,
            height: 8,
            background: '#1a1a2e',
            borderRadius: 4,
          }}
        />
        {/* 延迟区域 */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 0,
            width: `${startPercent}%`,
            height: 8,
            background:
              'repeating-linear-gradient(45deg, #2a2a3e, #2a2a3e 3px, #1a1a2e 3px, #1a1a2e 6px)',
            borderRadius: '4px 0 0 4px',
          }}
        />
        {/* 动画执行区域 */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: `${startPercent}%`,
            width: `${durationPercent}%`,
            height: 8,
            background: isVisible ? color : '#666',
            borderRadius: 4,
            opacity: 0.7,
          }}
        />
        {/* 当前时间指示器 */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: `${currentPercent}%`,
            width: 2,
            height: 16,
            background: '#fff',
            transform: 'translateX(-50%)',
            zIndex: 2,
          }}
        />
        {/* 循环标记 */}
        {animation.loop && (
          <RetweetOutlined
            style={{
              position: 'absolute',
              top: 8,
              right: 4,
              color: '#4ecdc4',
              fontSize: 10,
            }}
          />
        )}
      </div>

      {/* 缓动曲线 */}
      <div style={{ width: 140, flexShrink: 0 }}>
        <EasingCurve ease={animation.ease} color={color} />
      </div>
    </div>
  )
}

/**
 * 动画属性面板
 */
const AnimationProperties: React.FC<{
  animation: AnimationConfig
  currentTime: number
}> = ({ animation, currentTime }) => {
  const color = ANIMATION_TYPE_COLORS[animation.type] || '#888'
  const currentValue = calculateAnimationValue(animation, currentTime)
  const from = parseValue(animation.from)
  const to = parseValue(animation.to)
  const progress = Math.abs((currentValue - from) / (to - from || 1)) * 100

  return (
    <div
      style={{
        background: '#1a1a2e',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 8,
        border: `1px solid ${color}30`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Tag color={color} style={{ margin: 0 }}>
          {ANIMATION_TYPE_LABELS[animation.type]}
        </Tag>
        <span style={{ color: '#666', fontSize: 11 }}>
          {animation.duration}ms
          {animation.delay > 0 && ` (延迟 ${animation.delay}ms)`}
        </span>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#888', fontSize: 12 }}>当前值</span>
          <span style={{ color, fontSize: 12, fontWeight: 600 }}>{currentValue.toFixed(2)}</span>
        </div>
        <Progress
          percent={progress}
          size="small"
          strokeColor={color}
          trailColor="#0f0f23"
          showInfo={false}
        />
      </div>

      <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
        <div>
          <span style={{ color: '#666' }}>起始: </span>
          <span style={{ color: '#4ecdc4' }}>{animation.from}</span>
        </div>
        <div>
          <span style={{ color: '#666' }}>结束: </span>
          <span style={{ color: '#ff6b6b' }}>{animation.to}</span>
        </div>
        <div>
          <span style={{ color: '#666' }}>缓动: </span>
          <span style={{ color: '#ffeaa7' }}>{EASE_LABELS[animation.ease] || animation.ease}</span>
        </div>
      </div>
    </div>
  )
}

// ==================== 主组件 ====================

const AnimationPreview: React.FC<AnimationPreviewProps> = ({
  animations,
  elementState,
  onStateChange,
}) => {
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    totalDuration: 0,
    progress: 0,
  })
  const [visibleAnimations, setVisibleAnimations] = useState<Set<string>>(
    () => new Set(animations.map((a) => a.id))
  )
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>()

  /**
   * 计算总时长
   */
  const totalDuration = useMemo(() => {
    if (animations.length === 0) return 0
    return Math.max(...animations.map((a) => a.delay + a.duration))
  }, [animations])

  /**
   * 更新播放状态
   */
  const updatePlayback = useCallback(
    (updates: Partial<PlaybackState>) => {
      setPlayback((prev) => {
        const next = { ...prev, ...updates }
        next.totalDuration = totalDuration
        next.progress = totalDuration > 0 ? (next.currentTime / totalDuration) * 100 : 0
        return next
      })
    },
    [totalDuration]
  )

  /**
   * 动画循环
   */
  const animate = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const delta = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      setPlayback((prev) => {
        const newTime = prev.currentTime + delta * playbackSpeed
        const clampedTime = Math.min(newTime, totalDuration)
        const isFinished = clampedTime >= totalDuration

        // 更新元素状态
        const newState = { ...elementState }
        animations.forEach((anim) => {
          if (visibleAnimations.has(anim.id)) {
            const value = calculateAnimationValue(anim, clampedTime)
            newState[anim.id] = value
          }
        })
        onStateChange(newState)

        if (isFinished) {
          return {
            ...prev,
            isPlaying: false,
            currentTime: totalDuration,
            progress: 100,
          }
        }

        return {
          ...prev,
          currentTime: clampedTime,
          progress: totalDuration > 0 ? (clampedTime / totalDuration) * 100 : 0,
        }
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    },
    [animations, elementState, onStateChange, playbackSpeed, totalDuration, visibleAnimations]
  )

  /**
   * 开始播放
   */
  const handlePlay = useCallback(() => {
    if (playback.currentTime >= totalDuration) {
      updatePlayback({ currentTime: 0 })
    }
    setPlayback((prev) => ({ ...prev, isPlaying: true }))
    lastTimeRef.current = undefined
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [animate, playback.currentTime, totalDuration, updatePlayback])

  /**
   * 暂停播放
   */
  const handlePause = useCallback(() => {
    setPlayback((prev) => ({ ...prev, isPlaying: false }))
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  /**
   * 停止播放
   */
  const handleStop = useCallback(() => {
    setPlayback((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      progress: 0,
    }))
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    onStateChange(elementState)
  }, [elementState, onStateChange])

  /**
   * 快进
   */
  const handleFastForward = useCallback(() => {
    setPlayback((prev) => {
      const newTime = Math.min(prev.currentTime + 500, totalDuration)
      return {
        ...prev,
        currentTime: newTime,
        progress: totalDuration > 0 ? (newTime / totalDuration) * 100 : 0,
      }
    })
  }, [totalDuration])

  /**
   * 快退
   */
  const handleFastBackward = useCallback(() => {
    setPlayback((prev) => {
      const newTime = Math.max(prev.currentTime - 500, 0)
      return {
        ...prev,
        currentTime: newTime,
        progress: totalDuration > 0 ? (newTime / totalDuration) * 100 : 0,
      }
    })
  }, [totalDuration])

  /**
   * 拖动时间轴
   */
  const handleSliderChange = useCallback(
    (value: number) => {
      const newTime = (value / 100) * totalDuration
      setPlayback((prev) => ({
        ...prev,
        currentTime: newTime,
        progress: value,
      }))

      // 更新元素状态
      const newState = { ...elementState }
      animations.forEach((anim) => {
        if (visibleAnimations.has(anim.id)) {
          const value = calculateAnimationValue(anim, newTime)
          newState[anim.id] = value
        }
      })
      onStateChange(newState)
    },
    [animations, elementState, onStateChange, totalDuration, visibleAnimations]
  )

  /**
   * 切换动画可见性
   */
  const toggleAnimationVisibility = useCallback((id: string) => {
    setVisibleAnimations((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  /**
   * 清理动画帧
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  /**
   * 格式化时间显示
   */
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const milliseconds = Math.floor(ms % 1000)
    return `${seconds}.${milliseconds.toString().padStart(3, '0')}s`
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0f0f23',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThunderboltOutlined style={{ color: '#ff6b6b', fontSize: 18 }} />
          <span style={{ color: '#e0e0e0', fontSize: 16, fontWeight: 600 }}>动画预览</span>
        </div>
        <Space>
          <span style={{ color: '#666', fontSize: 12 }}>
            总时长: {formatTime(totalDuration)}
          </span>
          <Badge
            count={animations.length}
            style={{ backgroundColor: '#ff6b6b' }}
          />
        </Space>
      </div>

      {/* 播放控制栏 */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid #2a2a3e',
          background: '#0a0a1a',
        }}
      >
        {/* 播放按钮 */}
        <Space style={{ marginBottom: 12 }}>
          <Tooltip title="快退">
            <Button
              icon={<FastBackwardOutlined />}
              onClick={handleFastBackward}
              style={{
                background: '#1a1a2e',
                borderColor: '#2a2a3e',
                color: '#e0e0e0',
              }}
            />
          </Tooltip>
          {playback.isPlaying ? (
            <Tooltip title="暂停">
              <Button
                icon={<PauseCircleOutlined />}
                onClick={handlePause}
                style={{
                  background: '#ff6b6b',
                  borderColor: '#ff6b6b',
                  color: '#fff',
                }}
              />
            </Tooltip>
          ) : (
            <Tooltip title="播放">
              <Button
                icon={<PlayCircleOutlined />}
                onClick={handlePlay}
                disabled={animations.length === 0}
                style={{
                  background: '#ff6b6b',
                  borderColor: '#ff6b6b',
                  color: '#fff',
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="停止">
            <Button
              icon={<StopOutlined />}
              onClick={handleStop}
              style={{
                background: '#1a1a2e',
                borderColor: '#2a2a3e',
                color: '#e0e0e0',
              }}
            />
          </Tooltip>
          <Tooltip title="快进">
            <Button
              icon={<FastForwardOutlined />}
              onClick={handleFastForward}
              style={{
                background: '#1a1a2e',
                borderColor: '#2a2a3e',
                color: '#e0e0e0',
              }}
            />
          </Tooltip>
        </Space>

        {/* 时间轴滑块 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ClockCircleOutlined style={{ color: '#666', fontSize: 12 }} />
          <Slider
            value={playback.progress}
            onChange={handleSliderChange}
            style={{ flex: 1 }}
            trackStyle={{ background: '#ff6b6b' }}
            handleStyle={{ borderColor: '#ff6b6b' }}
          />
          <span style={{ color: '#888', fontSize: 12, minWidth: 80, textAlign: 'right' }}>
            {formatTime(playback.currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>

        {/* 播放速度 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{ color: '#666', fontSize: 11 }}>播放速度:</span>
          <Space>
            {[0.25, 0.5, 1, 1.5, 2].map((speed) => (
              <Button
                key={speed}
                size="small"
                type={playbackSpeed === speed ? 'primary' : 'default'}
                onClick={() => setPlaybackSpeed(speed)}
                style={
                  playbackSpeed === speed
                    ? {
                        background: '#ff6b6b',
                        borderColor: '#ff6b6b',
                        color: '#fff',
                        fontSize: 11,
                      }
                    : {
                        background: '#1a1a2e',
                        borderColor: '#2a2a3e',
                        color: '#888',
                        fontSize: 11,
                      }
                }
              >
                {speed}x
              </Button>
            ))}
          </Space>
        </div>
      </div>

      {/* 主内容区域 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 20,
        }}
      >
        {animations.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: '#666' }}>暂无动画配置</span>}
            style={{ marginTop: 60 }}
          />
        ) : (
          <>
            {/* 时间轴轨道 */}
            <Card
              style={{
                background: '#0f0f23',
                border: '1px solid #2a2a3e',
                marginBottom: 20,
              }}
              bodyStyle={{ padding: '12px 16px' }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LineChartOutlined style={{ color: '#ff6b6b' }} />
                  <span style={{ color: '#e0e0e0' }}>时间轴</span>
                </div>
              }
            >
              {animations.map((animation) => (
                <TimelineTrack
                  key={animation.id}
                  animation={animation}
                  totalDuration={totalDuration}
                  currentTime={playback.currentTime}
                  isVisible={visibleAnimations.has(animation.id)}
                  onToggleVisibility={() => toggleAnimationVisibility(animation.id)}
                />
              ))}
            </Card>

            {/* 动画属性面板 */}
            <Card
              style={{
                background: '#0f0f23',
                border: '1px solid #2a2a3e',
              }}
              bodyStyle={{ padding: '12px 16px' }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ThunderboltOutlined style={{ color: '#ff6b6b' }} />
                  <span style={{ color: '#e0e0e0' }}>实时属性</span>
                </div>
              }
            >
              {animations
                .filter((a) => visibleAnimations.has(a.id))
                .map((animation) => (
                  <AnimationProperties
                    key={animation.id}
                    animation={animation}
                    currentTime={playback.currentTime}
                  />
                ))}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export default AnimationPreview
export type { AnimationPreviewProps, PlaybackState }
