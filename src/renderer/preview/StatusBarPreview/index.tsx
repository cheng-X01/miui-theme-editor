/**
 * 状态栏预览组件
 * 渲染 MIUI 状态栏效果，支持深色/浅色模式、自定义图标颜色
 * 包含通知图标、时间、信号、WiFi、电量等元素
 */

import React, { useMemo } from 'react'

// ==================== 类型定义 ====================

/** 状态栏预览组件属性 */
interface StatusBarPreviewProps {
  /** 模式：深色 / 浅色 */
  mode?: 'dark' | 'light'
  /** 显示时间 */
  time?: string
  /** 电量百分比（0-100） */
  batteryLevel?: number
  /** 是否充电中 */
  charging?: boolean
  /** 信号强度（0-4） */
  signalStrength?: number
  /** WiFi 是否连接 */
  wifiConnected?: boolean
  /** 通知数量 */
  notifications?: number
  /** 自定义图标颜色 */
  customColor?: string
}

// ==================== 常量 ====================

/** 状态栏高度 */
const STATUS_BAR_HEIGHT = 28

/** 状态栏宽度 */
const STATUS_BAR_WIDTH = 360

// ==================== 子组件：信号图标 ====================

/**
 * 信号强度图标
 * 根据信号强度显示不同格数的信号塔
 */
const SignalIcon: React.FC<{
  strength: number
  color: string
  size?: number
}> = ({ strength, color, size = 14 }) => {
  const bars = 4
  const activeBars = Math.max(0, Math.min(bars, strength))

  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      {Array.from({ length: bars }).map((_, i) => {
        const barHeight = 4 + i * 3
        const isActive = i < activeBars
        return (
          <rect
            key={i}
            x={i * 4}
            y={16 - barHeight}
            width="3"
            height={barHeight}
            rx="0.5"
            fill={isActive ? color : `${color}30`}
          />
        )
      })}
    </svg>
  )
}

// ==================== 子组件：WiFi 图标 ====================

/**
 * WiFi 图标
 * 显示连接状态
 */
const WifiIcon: React.FC<{
  connected: boolean
  color: string
  size?: number
}> = ({ connected, color, size = 14 }) => {
  const fillColor = connected ? color : `${color}30`

  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      {/* WiFi 弧线 */}
      <path
        d="M8 2C5 2 2.5 3.5 1 5.5L8 13l7-7.5C13.5 3.5 11 2 8 2z"
        fill="none"
        stroke={fillColor}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 内部小弧线 */}
      <path
        d="M8 6c-1.5 0-2.8 0.8-3.8 2L8 12l3.8-4C10.8 6.8 9.5 6 8 6z"
        fill="none"
        stroke={fillColor}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 中心点 */}
      <circle cx="8" cy="9.5" r="1" fill={fillColor} />
    </svg>
  )
}

// ==================== 子组件：电池图标 ====================

/**
 * 电池图标
 * 根据电量值显示填充比例和颜色
 */
const BatteryIcon: React.FC<{
  level: number
  charging?: boolean
  color: string
  size?: number
}> = ({ level, charging, color, size = 16 }) => {
  const fillPercent = Math.max(0, Math.min(100, level))
  const lowBattery = level <= 20
  const batteryColor = lowBattery ? '#ff4444' : color

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {charging && (
        <span style={{ fontSize: size * 0.6, color: '#ffaa00' }}>⚡</span>
      )}
      <svg width={size * 1.4} height={size} viewBox="0 0 20 14">
        {/* 电池外壳 */}
        <rect
          x="0.5"
          y="0.5"
          width="17"
          height="13"
          rx="2"
          fill="none"
          stroke={batteryColor}
          strokeWidth="1"
        />
        {/* 电池正极 */}
        <rect x="18" y="4" width="2" height="6" rx="0.5" fill={batteryColor} />
        {/* 电量填充 */}
        <rect
          x="2"
          y="2"
          width={(13 * fillPercent) / 100}
          height="10"
          rx="1"
          fill={batteryColor}
          opacity={0.9}
        />
      </svg>
    </div>
  )
}

// ==================== 子组件：通知图标 ====================

/**
 * 通知图标
 * 显示未读通知数量
 */
const NotificationIcon: React.FC<{
  count: number
  color: string
  size?: number
}> = ({ count, color, size = 14 }) => {
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <svg width={size} height={size} viewBox="0 0 16 16">
        <path
          d="M8 1.5c-3.5 0-6.5 2.5-6.5 6v3.5L1 12.5h14l-0.5-1.5V7.5c0-3.5-3-6-6.5-6z"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 12.5c0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      {count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: '#ff4444',
            color: '#ffffff',
            fontSize: 9,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  )
}

// ==================== 主组件：状态栏预览 ====================

/**
 * 状态栏预览组件
 * 模拟 MIUI 顶部状态栏，支持多种显示模式和自定义
 */
const StatusBarPreview: React.FC<StatusBarPreviewProps> = ({
  mode = 'dark',
  time,
  batteryLevel = 85,
  charging = false,
  signalStrength = 4,
  wifiConnected = true,
  notifications = 0,
  customColor,
}) => {
  // 根据模式确定颜色
  const iconColor = useMemo(() => {
    if (customColor) return customColor
    return mode === 'dark' ? '#ffffff' : '#333333'
  }, [mode, customColor])

  // 背景颜色
  const bgColor = mode === 'dark' ? '#1a1a2e' : '#f5f5f5'

  // 当前时间
  const displayTime = useMemo(() => {
    if (time) return time
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }, [time])

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
      {/* 状态栏容器 */}
      <div
        style={{
          width: STATUS_BAR_WIDTH,
          height: STATUS_BAR_HEIGHT,
          backgroundColor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {/* 左侧：通知区域 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
          }}
        >
          {notifications > 0 ? (
            <NotificationIcon count={notifications} color={iconColor} />
          ) : (
            <div style={{ width: 14 }} />
          )}
          {/* 运营商名称（模拟） */}
          <span
            style={{
              fontSize: 11,
              color: iconColor,
              fontWeight: 500,
              opacity: 0.9,
            }}
          >
            MIUI
          </span>
        </div>

        {/* 中间：时间 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: iconColor,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: 0.5,
            }}
          >
            {displayTime}
          </span>
        </div>

        {/* 右侧：系统图标区域 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 6,
            flex: 1,
          }}
        >
          {/* WiFi 图标 */}
          <WifiIcon connected={wifiConnected} color={iconColor} />

          {/* 信号图标 */}
          <SignalIcon strength={signalStrength} color={iconColor} />

          {/* 电池图标 */}
          <BatteryIcon
            level={batteryLevel}
            charging={charging}
            color={iconColor}
          />
        </div>
      </div>

      {/* 控制面板 */}
      <div
        style={{
          width: STATUS_BAR_WIDTH,
          padding: 16,
          backgroundColor: '#1a1a2e',
          borderRadius: 12,
          border: '1px solid #2a2a3e',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#e0e0e0',
            marginBottom: 12,
          }}
        >
          状态栏设置
        </div>

        {/* 模式切换 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 12, color: '#a0a0a0' }}>显示模式</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['dark', 'light'] as const).map((m) => (
              <button
                key={m}
                style={{
                  padding: '3px 10px',
                  borderRadius: 4,
                  border: '1px solid #2a2a3e',
                  backgroundColor: mode === m ? '#ff6b6b' : '#0f0f23',
                  color: '#ffffff',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {m === 'dark' ? '深色' : '浅色'}
              </button>
            ))}
          </div>
        </div>

        {/* 信号强度 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 12, color: '#a0a0a0' }}>信号强度</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 4 + i * 3,
                  backgroundColor:
                    i < signalStrength ? iconColor : `${iconColor}30`,
                  borderRadius: 1,
                }}
              />
            ))}
          </div>
        </div>

        {/* WiFi 状态 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 12, color: '#a0a0a0' }}>WiFi</span>
          <span
            style={{
              fontSize: 11,
              color: wifiConnected ? '#44ff44' : '#ff4444',
            }}
          >
            {wifiConnected ? '已连接' : '未连接'}
          </span>
        </div>

        {/* 电量 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 12, color: '#a0a0a0' }}>电量</span>
          <span
            style={{
              fontSize: 11,
              color:
                batteryLevel <= 20
                  ? '#ff4444'
                  : batteryLevel <= 50
                  ? '#ffaa00'
                  : '#44ff44',
            }}
          >
            {batteryLevel}%{charging ? ' ⚡' : ''}
          </span>
        </div>

        {/* 通知数量 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 12, color: '#a0a0a0' }}>未读通知</span>
          <span style={{ fontSize: 11, color: iconColor }}>
            {notifications} 条
          </span>
        </div>
      </div>

      {/* 多种模式预览 */}
      <div
        style={{
          width: STATUS_BAR_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, color: '#a0a0a0', marginBottom: 4 }}>
          不同模式预览
        </div>

        {/* 浅色模式预览 */}
        <div
          style={{
            width: '100%',
            height: STATUS_BAR_HEIGHT,
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            borderRadius: 4,
          }}
        >
          <span style={{ fontSize: 11, color: '#333333', fontWeight: 500 }}>
            MIUI
          </span>
          <span
            style={{
              fontSize: 13,
              color: '#333333',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {displayTime}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <WifiIcon connected color="#333333" />
            <SignalIcon strength={4} color="#333333" />
            <BatteryIcon level={batteryLevel} color="#333333" />
          </div>
        </div>

        {/* 深色模式预览 */}
        <div
          style={{
            width: '100%',
            height: STATUS_BAR_HEIGHT,
            backgroundColor: '#1a1a2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            borderRadius: 4,
          }}
        >
          <span style={{ fontSize: 11, color: '#ffffff', fontWeight: 500 }}>
            MIUI
          </span>
          <span
            style={{
              fontSize: 13,
              color: '#ffffff',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {displayTime}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <WifiIcon connected color="#ffffff" />
            <SignalIcon strength={4} color="#ffffff" />
            <BatteryIcon level={batteryLevel} color="#ffffff" />
          </div>
        </div>

        {/* 自定义颜色预览 */}
        {customColor && (
          <div
            style={{
              width: '100%',
              height: STATUS_BAR_HEIGHT,
              backgroundColor: '#0f0f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              borderRadius: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: customColor,
                fontWeight: 500,
              }}
            >
              MIUI
            </span>
            <span
              style={{
                fontSize: 13,
                color: customColor,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {displayTime}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <WifiIcon connected color={customColor} />
              <SignalIcon strength={4} color={customColor} />
              <BatteryIcon level={batteryLevel} color={customColor} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatusBarPreview
