/**
 * 通知预览组件
 * 渲染 MIUI 通知效果，支持多种通知类型和快捷设置面板
 *
 * 功能说明：
 * - 通知栏下拉效果（从顶部滑下）
 * - 通知卡片（应用图标 + 标题 + 内容 + 时间）
 * - 多种通知类型：普通通知、媒体控制、进度通知、大文本、大图
 * - 快捷设置面板（WiFi、蓝牙、亮度等开关）
 * - 支持主题颜色自定义
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Button,
  Card,
  Space,
  Slider,
  Switch,
  Tooltip,
  Badge,
  Progress,
  Avatar,
  Divider,
} from 'antd'
import {
  WifiOutlined,
  BluetoothOutlined,
  FlashlightOutlined,
  CalculatorOutlined,
  CameraOutlined,
  SoundOutlined,
  BellOutlined,
  SettingOutlined,
  LeftOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  CloseOutlined,
  DownOutlined,
  UpOutlined,
  MessageOutlined,
  MailOutlined,
  AppstoreOutlined,
  MusicOutlined,
  FileTextOutlined,
  PictureOutlined,
} from '@ant-design/icons'

// ==================== 类型定义 ====================

/** 通知类型 */
type NotificationType = 'normal' | 'media' | 'progress' | 'bigText' | 'bigPicture'

/** 通知数据 */
interface NotificationItem {
  id: string
  appName: string
  title: string
  content: string
  time: string
  icon?: string
  type: NotificationType
  progress?: number
  actions?: string[]
}

/** 主题颜色配置 */
interface ThemeColors {
  background: string
  textColor: string
  accentColor: string
}

/** 组件 Props */
interface NotificationPreviewProps {
  /** 通知列表 */
  notifications: NotificationItem[]
  /** 主题颜色 */
  themeColors?: ThemeColors
}

// ==================== 常量 ====================

/** 默认主题颜色 */
const DEFAULT_THEME: ThemeColors = {
  background: '#1a1a2e',
  textColor: '#e0e0e0',
  accentColor: '#ff6b6b',
}

/** 快捷设置项 */
const QUICK_SETTINGS = [
  { key: 'wifi', label: 'WLAN', icon: <WifiOutlined /> },
  { key: 'bluetooth', label: '蓝牙', icon: <BluetoothOutlined /> },
  { key: 'flashlight', label: '手电筒', icon: <FlashlightOutlined /> },
  { key: 'calculator', label: '计算器', icon: <CalculatorOutlined /> },
  { key: 'camera', label: '相机', icon: <CameraOutlined /> },
  { key: 'mute', label: '静音', icon: <SoundOutlined /> },
  { key: 'dnd', label: '勿扰', icon: <BellOutlined /> },
  { key: 'settings', label: '设置', icon: <SettingOutlined /> },
]

/** 通知类型图标映射 */
const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  message: <MessageOutlined />,
  mail: <MailOutlined />,
  appstore: <AppstoreOutlined />,
  music: <MusicOutlined />,
  file: <FileTextOutlined />,
  picture: <PictureOutlined />,
}

/** 通知类型颜色映射 */
const NOTIFICATION_TYPE_COLORS: Record<NotificationType, string> = {
  normal: '#4ecdc4',
  media: '#ff6b6b',
  progress: '#45b7d1',
  bigText: '#96ceb4',
  bigPicture: '#ffeaa7',
}

// ==================== 子组件 ====================

/**
 * 快捷设置开关按钮
 */
const QuickToggle: React.FC<{
  item: (typeof QUICK_SETTINGS)[0]
  active: boolean
  theme: ThemeColors
  onToggle: (key: string) => void
}> = ({ item, active, theme, onToggle }) => {
  return (
    <div
      onClick={() => onToggle(item.key)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 8px',
        borderRadius: 12,
        background: active ? `${theme.accentColor}30` : '#2a2a3e',
        border: `1px solid ${active ? theme.accentColor : 'transparent'}`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        minWidth: 60,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: active ? theme.accentColor : '#1a1a2e',
          color: active ? '#fff' : '#888',
          fontSize: 16,
          transition: 'all 0.3s ease',
        }}
      >
        {item.icon}
      </div>
      <span
        style={{
          fontSize: 11,
          color: active ? theme.accentColor : '#888',
          transition: 'color 0.3s ease',
        }}
      >
        {item.label}
      </span>
    </div>
  )
}

/**
 * 普通通知卡片
 */
const NormalNotification: React.FC<{
  notification: NotificationItem
  theme: ThemeColors
  onDismiss: (id: string) => void
}> = ({ notification, theme, onDismiss }) => {
  return (
    <div
      style={{
        background: '#2a2a3e',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 8,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        borderLeft: `3px solid ${NOTIFICATION_TYPE_COLORS[notification.type]}`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* 应用图标 */}
      <Avatar
        size={40}
        style={{
          background: NOTIFICATION_TYPE_COLORS[notification.type],
          flexShrink: 0,
        }}
        icon={NOTIFICATION_ICONS[notification.icon || 'appstore']}
      />

      {/* 通知内容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <span
            style={{
              color: theme.textColor,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {notification.appName}
          </span>
          <span style={{ color: '#666', fontSize: 11 }}>{notification.time}</span>
        </div>
        <div
          style={{
            color: theme.textColor,
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {notification.title}
        </div>
        <div
          style={{
            color: '#888',
            fontSize: 12,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {notification.content}
        </div>
      </div>

      {/* 关闭按钮 */}
      <Button
        type="text"
        size="small"
        icon={<CloseOutlined style={{ color: '#666', fontSize: 12 }} />}
        onClick={() => onDismiss(notification.id)}
        style={{ padding: 0, minWidth: 20, height: 20 }}
      />
    </div>
  )
}

/**
 * 媒体控制通知卡片
 */
const MediaNotification: React.FC<{
  notification: NotificationItem
  theme: ThemeColors
  onDismiss: (id: string) => void
}> = ({ notification, theme, onDismiss }) => {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div
      style={{
        background: '#2a2a3e',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 8,
        borderLeft: `3px solid ${NOTIFICATION_TYPE_COLORS.media}`,
      }}
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <Avatar
          size={48}
          shape="square"
          style={{
            background: '#1a1a2e',
            borderRadius: 8,
            flexShrink: 0,
          }}
          icon={<MusicOutlined style={{ fontSize: 24 }} />}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#888', fontSize: 11 }}>{notification.appName}</span>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined style={{ color: '#666', fontSize: 12 }} />}
              onClick={() => onDismiss(notification.id)}
              style={{ padding: 0, minWidth: 20, height: 20 }}
            />
          </div>
          <div
            style={{
              color: theme.textColor,
              fontSize: 14,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {notification.title}
          </div>
          <div
            style={{
              color: '#888',
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {notification.content}
          </div>
        </div>
      </div>

      {/* 媒体控制按钮 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <StepBackwardOutlined
          style={{ color: theme.textColor, fontSize: 20, cursor: 'pointer' }}
        />
        <div
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: theme.accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isPlaying ? (
            <PauseCircleOutlined style={{ color: '#fff', fontSize: 24 }} />
          ) : (
            <PlayCircleOutlined style={{ color: '#fff', fontSize: 24 }} />
          )}
        </div>
        <StepForwardOutlined
          style={{ color: theme.textColor, fontSize: 20, cursor: 'pointer' }}
        />
      </div>
    </div>
  )
}

/**
 * 进度通知卡片
 */
const ProgressNotification: React.FC<{
  notification: NotificationItem
  theme: ThemeColors
  onDismiss: (id: string) => void
}> = ({ notification, theme, onDismiss }) => {
  const progress = notification.progress || 0

  return (
    <div
      style={{
        background: '#2a2a3e',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 8,
        borderLeft: `3px solid ${NOTIFICATION_TYPE_COLORS.progress}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: theme.textColor, fontSize: 13, fontWeight: 500 }}>
          {notification.title}
        </span>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined style={{ color: '#666', fontSize: 12 }} />}
          onClick={() => onDismiss(notification.id)}
          style={{ padding: 0, minWidth: 20, height: 20 }}
        />
      </div>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>{notification.content}</div>
      <Progress
        percent={progress}
        size="small"
        strokeColor={theme.accentColor}
        trailColor="#1a1a2e"
        format={(percent) => <span style={{ color: '#888', fontSize: 11 }}>{percent}%</span>}
      />
    </div>
  )
}

/**
 * 大文本通知卡片
 */
const BigTextNotification: React.FC<{
  notification: NotificationItem
  theme: ThemeColors
  onDismiss: (id: string) => void
}> = ({ notification, theme, onDismiss }) => {
  return (
    <div
      style={{
        background: '#2a2a3e',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 8,
        borderLeft: `3px solid ${NOTIFICATION_TYPE_COLORS.bigText}`,
      }}
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        <Avatar
          size={40}
          style={{
            background: NOTIFICATION_TYPE_COLORS.bigText,
            flexShrink: 0,
          }}
          icon={NOTIFICATION_ICONS[notification.icon || 'file']}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: theme.textColor, fontSize: 13, fontWeight: 600 }}>
              {notification.appName}
            </span>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined style={{ color: '#666', fontSize: 12 }} />}
              onClick={() => onDismiss(notification.id)}
              style={{ padding: 0, minWidth: 20, height: 20 }}
            />
          </div>
          <span style={{ color: '#666', fontSize: 11 }}>{notification.time}</span>
        </div>
      </div>
      <div
        style={{
          color: theme.textColor,
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 6,
        }}
      >
        {notification.title}
      </div>
      <div
        style={{
          color: '#888',
          fontSize: 13,
          lineHeight: 1.6,
          maxHeight: 80,
          overflow: 'auto',
        }}
      >
        {notification.content}
      </div>
    </div>
  )
}

/**
 * 大图通知卡片
 */
const BigPictureNotification: React.FC<{
  notification: NotificationItem
  theme: ThemeColors
  onDismiss: (id: string) => void
}> = ({ notification, theme, onDismiss }) => {
  return (
    <div
      style={{
        background: '#2a2a3e',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
        borderLeft: `3px solid ${NOTIFICATION_TYPE_COLORS.bigPicture}`,
      }}
    >
      {/* 大图区域 */}
      <div
        style={{
          height: 120,
          background: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
        }}
      >
        <PictureOutlined style={{ fontSize: 32, marginRight: 8 }} />
        <span>大图预览区域</span>
      </div>

      {/* 内容区域 */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar
            size={36}
            style={{
              background: NOTIFICATION_TYPE_COLORS.bigPicture,
              flexShrink: 0,
            }}
            icon={NOTIFICATION_ICONS[notification.icon || 'picture']}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: theme.textColor, fontSize: 13, fontWeight: 600 }}>
                {notification.appName}
              </span>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined style={{ color: '#666', fontSize: 12 }} />}
                onClick={() => onDismiss(notification.id)}
                style={{ padding: 0, minWidth: 20, height: 20 }}
              />
            </div>
            <div
              style={{
                color: theme.textColor,
                fontSize: 14,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {notification.title}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 通知卡片渲染分发
 */
const NotificationCard: React.FC<{
  notification: NotificationItem
  theme: ThemeColors
  onDismiss: (id: string) => void
}> = ({ notification, theme, onDismiss }) => {
  switch (notification.type) {
    case 'media':
      return <MediaNotification notification={notification} theme={theme} onDismiss={onDismiss} />
    case 'progress':
      return <ProgressNotification notification={notification} theme={theme} onDismiss={onDismiss} />
    case 'bigText':
      return <BigTextNotification notification={notification} theme={theme} onDismiss={onDismiss} />
    case 'bigPicture':
      return <BigPictureNotification notification={notification} theme={theme} onDismiss={onDismiss} />
    default:
      return <NormalNotification notification={notification} theme={theme} onDismiss={onDismiss} />
  }
}

// ==================== 主组件 ====================

const NotificationPreview: React.FC<NotificationPreviewProps> = ({
  notifications: initialNotifications,
  themeColors,
}) => {
  const theme = { ...DEFAULT_THEME, ...themeColors }
  const [isExpanded, setIsExpanded] = useState(true)
  const [brightness, setBrightness] = useState(80)
  const [activeToggles, setActiveToggles] = useState<Set<string>>(new Set(['wifi']))
  const [notificationList, setNotificationList] = useState<NotificationItem[]>(initialNotifications)

  /**
   * 切换快捷设置
   */
  const handleToggle = useCallback((key: string) => {
    setActiveToggles((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  /**
   * 移除通知
   */
  const handleDismiss = useCallback((id: string) => {
    setNotificationList((prev) => prev.filter((n) => n.id !== id))
  }, [])

  /**
   * 通知类型统计
   */
  const typeStats = useMemo(() => {
    const stats: Record<string, number> = {}
    notificationList.forEach((n) => {
      stats[n.type] = (stats[n.type] || 0) + 1
    })
    return stats
  }, [notificationList])

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 400,
        background: theme.background,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid #2a2a3e',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* 状态栏 */}
      <div
        style={{
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0f0f23',
        }}
      >
        <span style={{ color: '#888', fontSize: 12, fontWeight: 500 }}>12:30</span>
        <Space size={12}>
          <WifiOutlined style={{ color: '#888', fontSize: 12 }} />
          <span style={{ color: '#888', fontSize: 11 }}>5G</span>
          <div
            style={{
              width: 18,
              height: 10,
              border: '1px solid #888',
              borderRadius: 2,
              position: 'relative',
              padding: 1,
            }}
          >
            <div
              style={{
                width: '70%',
                height: '100%',
                background: '#52c41a',
                borderRadius: 1,
              }}
            />
          </div>
        </Space>
      </div>

      {/* 展开/收起按钮 */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'center',
          cursor: 'pointer',
          background: '#0f0f23',
          borderBottom: isExpanded ? '1px solid #2a2a3e' : 'none',
        }}
      >
        {isExpanded ? (
          <UpOutlined style={{ color: '#666', fontSize: 12 }} />
        ) : (
          <DownOutlined style={{ color: '#666', fontSize: 12 }} />
        )}
      </div>

      {/* 通知面板内容 */}
      {isExpanded && (
        <div
          style={{
            maxHeight: 600,
            overflow: 'auto',
            animation: 'slideDown 0.3s ease',
          }}
        >
          {/* 快捷设置面板 */}
          <div style={{ padding: '16px', background: '#0f0f23' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {QUICK_SETTINGS.map((item) => (
                <QuickToggle
                  key={item.key}
                  item={item}
                  active={activeToggles.has(item.key)}
                  theme={theme}
                  onToggle={handleToggle}
                />
              ))}
            </div>

            {/* 亮度调节 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 4px',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#2a2a3e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#888',
                  fontSize: 12,
                }}
              >
                <FlashlightOutlined />
              </div>
              <Slider
                value={brightness}
                onChange={setBrightness}
                style={{ flex: 1 }}
                trackStyle={{ background: theme.accentColor }}
                handleStyle={{ borderColor: theme.accentColor }}
              />
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#2a2a3e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#888',
                  fontSize: 12,
                }}
              >
                <FlashlightOutlined />
              </div>
            </div>
          </div>

          <Divider style={{ margin: 0, borderColor: '#2a2a3e' }} />

          {/* 通知列表 */}
          <div style={{ padding: '12px 16px' }}>
            {/* 类型标签 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {Object.entries(typeStats).map(([type, count]) => (
                <Badge
                  key={type}
                  count={count}
                  style={{
                    backgroundColor: NOTIFICATION_TYPE_COLORS[type as NotificationType],
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: '#888',
                      padding: '2px 8px',
                      background: '#1a1a2e',
                      borderRadius: 10,
                    }}
                  >
                    {type === 'normal' && '普通'}
                    {type === 'media' && '媒体'}
                    {type === 'progress' && '进度'}
                    {type === 'bigText' && '大文本'}
                    {type === 'bigPicture' && '大图'}
                  </span>
                </Badge>
              ))}
            </div>

            {/* 通知卡片列表 */}
            {notificationList.length > 0 ? (
              notificationList.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  theme={theme}
                  onDismiss={handleDismiss}
                />
              ))
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#666',
                  fontSize: 13,
                }}
              >
                暂无通知
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default NotificationPreview
export type { NotificationItem, NotificationType, ThemeColors, NotificationPreviewProps }
