/**
 * 桌面预览引擎
 * 渲染 MIUI 桌面效果，包括图标网格、Dock 栏、状态栏和页面指示器
 * 支持多种图标形状和编辑模式（长按抖动）
 */

import React, { useState, useCallback, useMemo } from 'react'

// ==================== 类型定义 ====================

/** 桌面图标数据 */
interface DesktopIcon {
  /** 应用包名 */
  packageName: string
  /** 应用标签 */
  label: string
  /** 图标数据（base64） */
  iconData?: string
  /** 自定义位置 */
  position?: { x: number; y: number }
}

/** 桌面预览组件属性 */
interface DesktopPreviewProps {
  /** 图标列表 */
  icons: DesktopIcon[]
  /** 壁纸背景（base64 或 URL） */
  wallpaper?: string
  /** 图标形状 */
  iconShape?: 'rounded' | 'circle' | 'square'
  /** Dock 栏图标包名列表 */
  dockIcons?: string[]
}

// ==================== 常量 ====================

/** 手机屏幕设计尺寸 */
const PHONE_WIDTH = 360
const PHONE_HEIGHT = 640

/** 图标网格配置 */
const GRID_COLS = 4
const GRID_ROWS = 5
const ICON_SIZE = 56
const ICON_LABEL_HEIGHT = 20
const GRID_GAP_X = 16
const GRID_GAP_Y = 24
const GRID_PADDING_TOP = 80
const GRID_PADDING_LEFT = 20

/** Dock 栏配置 */
const DOCK_HEIGHT = 72
const DOCK_ICON_COUNT = 4
const DOCK_PADDING = 16

/** 状态栏高度 */
const STATUS_BAR_HEIGHT = 24

/** 默认图标颜色 */
const DEFAULT_ICON_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
]

// ==================== 辅助函数 ====================

/**
 * 生成默认图标（使用首字母和颜色）
 */
function generateDefaultIcon(label: string, index: number): string {
  const color = DEFAULT_ICON_COLORS[index % DEFAULT_ICON_COLORS.length]
  const letter = label.charAt(0).toUpperCase()

  // 创建 SVG 数据 URI
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}">
      <rect width="100%" height="100%" rx="12" fill="${color}"/>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui, sans-serif" font-size="24" font-weight="600" fill="white">
        ${letter}
      </text>
    </svg>
  `

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

/**
 * 获取图标形状样式
 */
function getIconShapeStyle(shape: 'rounded' | 'circle' | 'square'): React.CSSProperties {
  switch (shape) {
    case 'circle':
      return { borderRadius: '50%' }
    case 'rounded':
      return { borderRadius: '14px' }
    case 'square':
    default:
      return { borderRadius: '4px' }
  }
}

// ==================== 子组件：状态栏 ====================

/** 状态栏组件 */
const StatusBar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })

  // 每分钟更新时间
  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: STATUS_BAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 100%)',
        zIndex: 10,
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {/* 左侧：通知图标区域 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10 }}>📶</span>
        <span style={{ fontSize: 10 }}>📡</span>
      </div>

      {/* 中间：时间 */}
      <span>{currentTime}</span>

      {/* 右侧：信号、WiFi、电量 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10 }}>📶</span>
        <span style={{ fontSize: 10 }}>🔋</span>
        <span style={{ fontSize: 10 }}>85%</span>
      </div>
    </div>
  )
}

// ==================== 子组件：图标项 ====================

/** 图标项组件 */
const IconItem: React.FC<{
  icon: DesktopIcon
  index: number
  shape: 'rounded' | 'circle' | 'square'
  isEditing: boolean
  isDock?: boolean
  onLongPress?: (packageName: string) => void
}> = ({ icon, index, shape, isEditing, isDock = false, onLongPress }) => {
  const [pressing, setPressing] = useState(false)
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null)

  // 图标图片源
  const iconSrc = icon.iconData ?? generateDefaultIcon(icon.label, index)

  // 图标形状样式
  const shapeStyle = getIconShapeStyle(shape)

  // 处理长按开始
  const handlePressStart = useCallback(() => {
    setPressing(true)
    longPressTimer.current = setTimeout(() => {
      onLongPress?.(icon.packageName)
    }, 500)
  }, [icon.packageName, onLongPress])

  // 处理长按结束
  const handlePressEnd = useCallback(() => {
    setPressing(false)
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // 编辑模式抖动动画
  const shakeAnimation = isEditing
    ? {
        animation: `iconShake 0.3s ease-in-out infinite`,
        animationDelay: `${(index % 5) * 0.05}s`,
      }
    : {}

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        cursor: isEditing ? 'grab' : 'pointer',
        transform: pressing ? 'scale(0.92)' : 'scale(1)',
        transition: 'transform 0.1s ease',
        ...shakeAnimation,
      }}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
    >
      {/* 图标图片 */}
      <div
        style={{
          width: isDock ? ICON_SIZE + 4 : ICON_SIZE,
          height: isDock ? ICON_SIZE + 4 : ICON_SIZE,
          overflow: 'hidden',
          boxShadow: isDock
            ? '0 2px 8px rgba(0,0,0,0.3)'
            : '0 1px 4px rgba(0,0,0,0.2)',
          ...shapeStyle,
        }}
      >
        <img
          src={iconSrc}
          alt={icon.label}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          draggable={false}
        />
      </div>

      {/* 图标标签 */}
      <span
        style={{
          fontSize: 11,
          color: '#ffffff',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
          maxWidth: ICON_SIZE + 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {icon.label}
      </span>

      {/* 编辑模式删除按钮 */}
      {isEditing && (
        <div
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: '#ff4444',
            color: '#ffffff',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          ×
        </div>
      )}
    </div>
  )
}

// ==================== 子组件：页面指示器 ====================

/** 页面指示器组件 */
const PageIndicator: React.FC<{
  total: number
  current: number
}> = ({ total, current }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        position: 'absolute',
        bottom: DOCK_HEIGHT + 12,
        left: 0,
        right: 0,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 16 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor:
              i === current
                ? 'rgba(255,255,255,0.9)'
                : 'rgba(255,255,255,0.4)',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}

// ==================== 主组件：桌面预览引擎 ====================

/**
 * 桌面预览引擎组件
 * 模拟 MIUI 桌面效果，包括图标网格、Dock 栏、状态栏
 */
const DesktopPreview: React.FC<DesktopPreviewProps> = ({
  icons,
  wallpaper,
  iconShape = 'rounded',
  dockIcons,
}) => {
  // 编辑模式状态
  const [isEditing, setIsEditing] = useState(false)
  // 当前页面
  const [currentPage, setCurrentPage] = useState(0)

  // 默认壁纸
  const defaultWallpaper = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'

  // 分离 Dock 图标和普通图标
  const { dockIconList, gridIcons } = useMemo(() => {
    const dockSet = new Set(dockIcons ?? [])
    const dock: DesktopIcon[] = []
    const grid: DesktopIcon[] = []

    icons.forEach((icon) => {
      if (dockSet.has(icon.packageName)) {
        dock.push(icon)
      } else {
        grid.push(icon)
      }
    })

    // 如果 Dock 图标不足，补充默认图标
    while (dock.length < DOCK_ICON_COUNT) {
      dock.push({
        packageName: `dock-placeholder-${dock.length}`,
        label: ['电话', '信息', '浏览器', '相机'][dock.length] ?? '应用',
      })
    }

    return { dockIconList: dock.slice(0, DOCK_ICON_COUNT), gridIcons: grid }
  }, [icons, dockIcons])

  // 计算页面数量
  const iconsPerPage = GRID_COLS * GRID_ROWS
  const totalPages = Math.max(1, Math.ceil(gridIcons.length / iconsPerPage))

  // 获取当前页面的图标
  const currentPageIcons = useMemo(() => {
    const start = currentPage * iconsPerPage
    return gridIcons.slice(start, start + iconsPerPage)
  }, [gridIcons, currentPage, iconsPerPage])

  // 处理长按进入编辑模式
  const handleLongPress = useCallback(() => {
    setIsEditing(true)
  }, [])

  // 处理点击空白处退出编辑模式
  const handleBackgroundClick = useCallback(() => {
    if (isEditing) {
      setIsEditing(false)
    }
  }, [isEditing])

  // 处理页面切换
  const handlePageChange = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'prev' && currentPage > 0) {
        setCurrentPage(currentPage - 1)
      } else if (direction === 'next' && currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1)
      }
    },
    [currentPage, totalPages]
  )

  // 监听键盘左右键切换页面
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePageChange('prev')
      if (e.key === 'ArrowRight') handlePageChange('next')
      if (e.key === 'Escape') setIsEditing(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePageChange])

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
          userSelect: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
        onClick={handleBackgroundClick}
      >
        {/* 壁纸模糊层（当没有自定义壁纸时） */}
        {!wallpaper && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backdropFilter: 'blur(0px)',
            }}
          />
        )}

        {/* 状态栏 */}
        <StatusBar />

        {/* 图标网格区域 */}
        <div
          style={{
            position: 'absolute',
            top: STATUS_BAR_HEIGHT + 16,
            left: GRID_PADDING_LEFT,
            right: GRID_PADDING_LEFT,
            bottom: DOCK_HEIGHT + 32,
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            gap: `${GRID_GAP_Y}px ${GRID_GAP_X}px`,
            alignItems: 'start',
            justifyItems: 'center',
          }}
        >
          {currentPageIcons.map((icon, index) => (
            <IconItem
              key={icon.packageName}
              icon={icon}
              index={index}
              shape={iconShape}
              isEditing={isEditing}
              onLongPress={handleLongPress}
            />
          ))}

          {/* 填充空位保持网格对齐 */}
          {Array.from({
            length: Math.max(0, iconsPerPage - currentPageIcons.length),
          }).map((_, i) => (
            <div key={`empty-${i}`} style={{ width: ICON_SIZE, height: ICON_SIZE + ICON_LABEL_HEIGHT }} />
          ))}
        </div>

        {/* 页面指示器 */}
        {totalPages > 1 && (
          <PageIndicator total={totalPages} current={currentPage} />
        )}

        {/* 左右翻页按钮 */}
        {totalPages > 1 && (
          <>
            {currentPage > 0 && (
              <button
                onClick={() => handlePageChange('prev')}
                style={{
                  position: 'absolute',
                  left: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 24,
                  height: 48,
                  borderRadius: '0 8px 8px 0',
                  border: 'none',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 5,
                }}
              >
                ‹
              </button>
            )}
            {currentPage < totalPages - 1 && (
              <button
                onClick={() => handlePageChange('next')}
                style={{
                  position: 'absolute',
                  right: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 24,
                  height: 48,
                  borderRadius: '8px 0 0 8px',
                  border: 'none',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 5,
                }}
              >
                ›
              </button>
            )}
          </>
        )}

        {/* Dock 栏 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: DOCK_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: `0 ${DOCK_PADDING}px`,
            background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {dockIconList.map((icon, index) => (
            <IconItem
              key={icon.packageName}
              icon={icon}
              index={index + 100} // 避免与网格图标动画冲突
              shape={iconShape}
              isEditing={isEditing}
              isDock
              onLongPress={handleLongPress}
            />
          ))}
        </div>

        {/* 编辑模式提示 */}
        {isEditing && (
          <div
            style={{
              position: 'absolute',
              top: STATUS_BAR_HEIGHT + 4,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '4px 16px',
              borderRadius: 12,
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: '#ffffff',
              fontSize: 12,
              zIndex: 20,
            }}
          >
            编辑模式 - 按 ESC 退出
          </div>
        )}
      </div>

      {/* 控制面板 */}
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
          桌面设置
        </div>

        {/* 图标形状选择 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#a0a0a0' }}>图标形状</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['rounded', 'circle', 'square'] as const).map((shape) => (
              <button
                key={shape}
                onClick={() => {
                  // 通过事件通知父组件
                  window.dispatchEvent(
                    new CustomEvent('desktop:iconShapeChange', { detail: shape })
                  )
                }}
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  border: '1px solid #2a2a3e',
                  backgroundColor: iconShape === shape ? '#ff6b6b' : '#0f0f23',
                  color: '#ffffff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {shape === 'rounded' ? '圆角' : shape === 'circle' ? '圆形' : '方形'}
              </button>
            ))}
          </div>
        </div>

        {/* 页面信息 */}
        {totalPages > 1 && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: '#a0a0a0',
              textAlign: 'center',
            }}
          >
            第 {currentPage + 1} / {totalPages} 页
          </div>
        )}
      </div>

      {/* CSS 动画 */}
      <style>{`
        @keyframes iconShake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-2deg); }
          75% { transform: rotate(2deg); }
        }
      `}</style>
    </div>
  )
}

export default DesktopPreview
