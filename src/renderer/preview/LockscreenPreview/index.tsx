/**
 * 锁屏预览引擎
 * 使用 div + CSS 渲染 MAML 锁屏组件（简化版，不使用 Canvas API）
 * 支持模拟手机屏幕、MAML 元素渲染、动态数据模拟和交互
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { MAMLElementInstance } from '../../editors/MAMLEditor/types'

// ==================== 类型定义 ====================

/** 锁屏预览组件属性 */
interface LockscreenPreviewProps {
  /** MAML 元素实例列表 */
  elements: MAMLElementInstance[]
  /** 壁纸背景（base64 或 URL） */
  wallpaper?: string
  /** 模拟数据 */
  simulatedData?: {
    /** 电量百分比（0-100） */
    batteryLevel?: number
    /** 是否充电中 */
    charging?: boolean
    /** 天气状况 */
    weather?: string
  }
  /** 模拟数据变化回调 */
  onSimulatedDataChange?: (data: any) => void
}

/** 当前时间数据 */
interface TimeData {
  hour: string
  minute: string
  second: string
  year: string
  month: string
  date: string
  dayOfWeek: string
}

// ==================== 常量 ====================

/** 手机屏幕设计尺寸 */
const PHONE_WIDTH = 360
const PHONE_HEIGHT = 640

/** 星期名称映射 */
const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 天气图标映射 */
const WEATHER_ICONS: Record<string, string> = {
  晴: '☀️',
  多云: '⛅',
  阴: '☁️',
  雨: '🌧️',
  雪: '❄️',
  雷: '⛈️',
  雾: '🌫️',
}

// ==================== 辅助函数 ====================

/**
 * 获取当前时间数据
 */
function getCurrentTimeData(): TimeData {
  const now = new Date()
  return {
    hour: String(now.getHours()).padStart(2, '0'),
    minute: String(now.getMinutes()).padStart(2, '0'),
    second: String(now.getSeconds()).padStart(2, '0'),
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, '0'),
    date: String(now.getDate()).padStart(2, '0'),
    dayOfWeek: WEEK_DAYS[now.getDay()],
  }
}

/**
 * 解析表达式中的变量
 * 支持 #hour, #minute, #second, #year, #month, #date, #dayOfWeek
 * #batteryLevel, #charging, #weather
 */
function resolveExpression(
  expr: string,
  timeData: TimeData,
  simulatedData: LockscreenPreviewProps['simulatedData']
): string {
  if (!expr) return ''

  const vars: Record<string, string> = {
    '#hour': timeData.hour,
    '#minute': timeData.minute,
    '#second': timeData.second,
    '#year': timeData.year,
    '#month': timeData.month,
    '#date': timeData.date,
    '#dayOfWeek': timeData.dayOfWeek,
    '#batteryLevel': String(simulatedData?.batteryLevel ?? 80),
    '#charging': simulatedData?.charging ? '充电中' : '未充电',
    '#weather': simulatedData?.weather ?? '晴',
  }

  let result = expr
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replace(new RegExp(key, 'g'), value)
  })

  return result
}

/**
 * 根据电量值获取电池颜色
 */
function getBatteryColor(level: number): string {
  if (level <= 20) return '#ff4444'
  if (level <= 50) return '#ffaa00'
  return '#44ff44'
}

// ==================== 子组件：电池图标 ====================

/** 电池图标组件 */
const BatteryIcon: React.FC<{
  level: number
  charging?: boolean
  size?: number
}> = ({ level, charging, size = 24 }) => {
  const color = getBatteryColor(level)
  const fillWidth = Math.max(0, Math.min(100, level))

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {charging && (
        <span style={{ fontSize: size * 0.7, color: '#ffaa00' }}>⚡</span>
      )}
      <svg width={size * 1.5} height={size} viewBox="0 0 24 16">
        {/* 电池外壳 */}
        <rect
          x="0.5"
          y="0.5"
          width="21"
          height="15"
          rx="2"
          fill="none"
          stroke={color}
          strokeWidth="1"
        />
        {/* 电池正极 */}
        <rect x="22" y="4" width="2" height="8" rx="1" fill={color} />
        {/* 电量填充 */}
        <rect
          x="2"
          y="2"
          width={(17 * fillWidth) / 100}
          height="12"
          rx="1"
          fill={color}
        />
      </svg>
      <span style={{ fontSize: size * 0.6, color, minWidth: 30 }}>
        {level}%
      </span>
    </div>
  )
}

// ==================== 子组件：天气图标 ====================

/** 天气显示组件 */
const WeatherDisplay: React.FC<{
  weather: string
  size?: number
}> = ({ weather, size = 20 }) => {
  const icon = WEATHER_ICONS[weather] ?? '🌤️'

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: size,
        color: '#ffffff',
      }}
    >
      <span>{icon}</span>
      <span>{weather}</span>
    </div>
  )
}

// ==================== 子组件：MAML 元素渲染器 ====================

/** 渲染单个 MAML 元素 */
const MAMLElementRenderer: React.FC<{
  element: MAMLElementInstance
  timeData: TimeData
  simulatedData: LockscreenPreviewProps['simulatedData']
  parentWidth?: number
  parentHeight?: number
}> = ({ element, timeData, simulatedData, parentWidth = PHONE_WIDTH, parentHeight = PHONE_HEIGHT }) => {
  const { type, x, y, width, height, attributes, alpha } = element

  // 计算实际像素位置（基于 1080p 设计稿缩放）
  const scaleX = parentWidth / 1080
  const scaleY = parentHeight / 1920

  const style: React.CSSProperties = {
    position: 'absolute',
    left: x * scaleX,
    top: y * scaleY,
    width: width * scaleX,
    height: height * scaleY,
    opacity: alpha ?? 1,
    pointerEvents: 'none',
  }

  // 根据元素类型渲染不同内容
  switch (type) {
    case 'Text': {
      const textContent = resolveExpression(
        String(attributes.text ?? ''),
        timeData,
        simulatedData
      )
      const fontSize = Number(attributes.size ?? 48) * Math.min(scaleX, scaleY)
      const color = String(attributes.color ?? '#ffffff')
      const align = String(attributes.align ?? 'center')

      return (
        <div
          style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              align === 'left'
                ? 'flex-start'
                : align === 'right'
                ? 'flex-end'
                : 'center',
            fontSize,
            color,
            fontFamily: String(attributes.fontFamily ?? ''),
            fontWeight: attributes.bold ? 'bold' : 'normal',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {textContent}
        </div>
      )
    }

    case 'Image': {
      const src = String(attributes.src ?? '')
      const resolvedSrc = src.startsWith('#')

        ? resolveExpression(src, timeData, simulatedData)
        : src

      return (
        <img
          src={resolvedSrc}
          alt=""
          style={{
            ...style,
            objectFit: 'cover',
            borderRadius: Number(attributes.cornerRadius ?? 0) * scaleX,
          }}
          draggable={false}
        />
      )
    }

    case 'Rectangle': {
      const fillColor = String(attributes.fillColor ?? '#ffffff')
      const cornerRadius = Number(attributes.cornerRadius ?? 0) * scaleX
      const borderWidth = Number(attributes.borderWidth ?? 0)
      const borderColor = String(attributes.borderColor ?? 'transparent')

      return (
        <div
          style={{
            ...style,
            backgroundColor: fillColor,
            borderRadius: cornerRadius,
            border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : undefined,
          }}
        />
      )
    }

    case 'Circle': {
      const circleColor = String(attributes.fillColor ?? '#ffffff')
      const circleSize = Math.min(width * scaleX, height * scaleY)

      return (
        <div
          style={{
            ...style,
            width: circleSize,
            height: circleSize,
            backgroundColor: circleColor,
            borderRadius: '50%',
          }}
        />
      )
    }

    case 'Line': {
      const lineColor = String(attributes.color ?? '#ffffff')
      const lineWidth = Number(attributes.strokeWidth ?? 1)

      return (
        <div
          style={{
            ...style,
            backgroundColor: lineColor,
            height: lineWidth,
          }}
        />
      )
    }

    default:
      // 对于未明确支持的类型，渲染一个占位框
      return (
        <div
          style={{
            ...style,
            border: '1px dashed rgba(255,255,255,0.3)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          {type}
        </div>
      )
  }
}

// ==================== 主组件：锁屏预览引擎 ====================

/**
 * 锁屏预览引擎组件
 * 模拟手机屏幕，渲染 MAML 锁屏元素，支持动态数据模拟
 */
const LockscreenPreview: React.FC<LockscreenPreviewProps> = ({
  elements,
  wallpaper,
  simulatedData,
  onSimulatedDataChange,
}) => {
  // 当前时间数据
  const [timeData, setTimeData] = useState<TimeData>(getCurrentTimeData())
  // 解锁动画状态
  const [unlocking, setUnlocking] = useState(false)
  // 解锁进度
  const [unlockProgress, setUnlockProgress] = useState(0)
  // 容器引用
  const containerRef = useRef<HTMLDivElement>(null)

  // 每秒更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeData(getCurrentTimeData())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 处理解锁动画
  const handleUnlock = useCallback(() => {
    if (unlocking) return
    setUnlocking(true)
    setUnlockProgress(0)

    const startTime = Date.now()
    const duration = 600 // 动画持续时间（毫秒）

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setUnlockProgress(progress)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // 动画结束，重置状态
        setTimeout(() => {
          setUnlocking(false)
          setUnlockProgress(0)
        }, 200)
      }
    }

    requestAnimationFrame(animate)
  }, [unlocking])

  // 计算解锁动画样式
  const unlockStyle = useMemo((): React.CSSProperties => {
    if (!unlocking) return {}

    const opacity = 1 - unlockProgress
    const translateY = -unlockProgress * 100
    const scale = 1 - unlockProgress * 0.1

    return {
      opacity,
      transform: `translateY(${translateY}px) scale(${scale})`,
      transition: 'none',
    }
  }, [unlocking, unlockProgress])

  // 默认壁纸（渐变背景）
  const defaultWallpaper = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'

  // 电池电量
  const batteryLevel = simulatedData?.batteryLevel ?? 80
  const charging = simulatedData?.charging ?? false
  const weather = simulatedData?.weather ?? '晴'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: 20,
        backgroundColor: '#0f0f23',
        borderRadius: 12,
      }}
    >
      {/* 手机屏幕容器 */}
      <div
        ref={containerRef}
        style={{
          width: PHONE_WIDTH,
          height: PHONE_HEIGHT,
          borderRadius: 24,
          border: '3px solid #2a2a3e',
          overflow: 'hidden',
          position: 'relative',
          background: wallpaper ?? defaultWallpaper,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
        onClick={handleUnlock}
      >
        {/* 锁屏内容层（带动画） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            ...unlockStyle,
          }}
        >
          {/* 状态栏模拟 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)',
              zIndex: 10,
            }}
          >
            <span style={{ fontSize: 12, color: '#ffffff', fontWeight: 500 }}>
              {timeData.hour}:{timeData.minute}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <BatteryIcon level={batteryLevel} charging={charging} size={14} />
            </div>
          </div>

          {/* MAML 元素渲染 */}
          {elements.map((element) => (
            <MAMLElementRenderer
              key={element.id}
              element={element}
              timeData={timeData}
              simulatedData={simulatedData}
            />
          ))}

          {/* 默认时间显示（当没有 MAML 元素时） */}
          {elements.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: '15%',
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {/* 大时钟 */}
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 200,
                  color: '#ffffff',
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  letterSpacing: 2,
                }}
              >
                {timeData.hour}:{timeData.minute}
              </div>
              {/* 秒数 */}
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 300,
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                {timeData.second}
              </div>
              {/* 日期 */}
              <div
                style={{
                  fontSize: 16,
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 8,
                }}
              >
                {timeData.month}月{timeData.date}日 {timeData.dayOfWeek}
              </div>
              {/* 天气 */}
              <div style={{ marginTop: 16 }}>
                <WeatherDisplay weather={weather} size={18} />
              </div>
              {/* 电池 */}
              <div style={{ marginTop: 12 }}>
                <BatteryIcon level={batteryLevel} charging={charging} size={18} />
              </div>
            </div>
          )}

          {/* 底部解锁提示 */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: 0,
              right: 0,
              textAlign: 'center',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 14,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            点击解锁
          </div>
        </div>

        {/* 解锁后的黑色遮罩 */}
        {unlocking && unlockProgress > 0.8 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#000000',
              opacity: (unlockProgress - 0.8) * 5,
              zIndex: 20,
            }}
          />
        )}
      </div>

      {/* 模拟数据控制面板 */}
      <div
        style={{
          width: PHONE_WIDTH,
          padding: 16,
          backgroundColor: '#1a1a2e',
          borderRadius: 12,
          border: '1px solid #2a2a3e',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0', marginBottom: 12 }}>
          模拟数据控制
        </div>

        {/* 电量滑块 */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 12, color: '#a0a0a0' }}>电量</span>
            <span style={{ fontSize: 12, color: getBatteryColor(batteryLevel) }}>
              {batteryLevel}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={batteryLevel}
            onChange={(e) =>
              onSimulatedDataChange?.({
                ...simulatedData,
                batteryLevel: Number(e.target.value),
              })
            }
            style={{
              width: '100%',
              accentColor: getBatteryColor(batteryLevel),
            }}
          />
        </div>

        {/* 充电状态 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 12, color: '#a0a0a0' }}>充电状态</span>
          <button
            onClick={() =>
              onSimulatedDataChange?.({
                ...simulatedData,
                charging: !charging,
              })
            }
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: charging ? '#44aa44' : '#3a3a4e',
              color: '#ffffff',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {charging ? '充电中' : '未充电'}
          </button>
        </div>

        {/* 天气选择 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#a0a0a0' }}>天气</span>
          <select
            value={weather}
            onChange={(e) =>
              onSimulatedDataChange?.({
                ...simulatedData,
                weather: e.target.value,
              })
            }
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid #2a2a3e',
              backgroundColor: '#0f0f23',
              color: '#e0e0e0',
              fontSize: 12,
            }}
          >
            {Object.keys(WEATHER_ICONS).map((w) => (
              <option key={w} value={w}>
                {WEATHER_ICONS[w]} {w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CSS 动画 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default LockscreenPreview
