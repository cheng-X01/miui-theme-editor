/**
 * AI 设计评分组件
 * 对主题进行多维度评分，展示雷达图和改进建议
 *
 * 评分维度：
 * - 视觉美观度（30%）：配色、排版、图标质量
 * - 功能完整性（25%）：资源覆盖度
 * - 性能优化（20%）：文件大小、加载速度
 * - 用户体验（15%）：交互流畅度
 * - 创新性（10%）：独特设计元素
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Button,
  Card,
  List,
  Tag,
  Space,
  Progress,
  Empty,
  Spin,
  Badge,
  Tooltip,
  message,
} from 'antd'
import {
  TrophyOutlined,
  StarOutlined,
  RocketOutlined,
  BulbOutlined,
  SyncOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  SmileOutlined,
  ExperimentOutlined,
} from '@ant-design/icons'
import type { ThemeProject } from '../../../../shared/types'

// ==================== 类型定义 ====================

/** 评分维度 */
interface ScoreDimension {
  name: string
  score: number
  weight: number
  comment: string
}

/** 设计评分结果 */
interface DesignScore {
  overall: number
  dimensions: ScoreDimension[]
  suggestions: string[]
}

/** 组件 Props */
interface AIDesignScoreProps {
  /** 主题项目 */
  project: ThemeProject
  /** 评分更新回调 */
  onScoreUpdate?: (score: DesignScore) => void
}

// ==================== 常量 ====================

/** 维度配置 */
const DIMENSION_CONFIG: Record<
  string,
  {
    icon: React.ReactNode
    color: string
    description: string
  }
> = {
  视觉美观度: {
    icon: <EyeOutlined />,
    color: '#ff6b6b',
    description: '配色方案、排版布局、图标质量',
  },
  功能完整性: {
    icon: <AppstoreOutlined />,
    color: '#4ecdc4',
    description: '资源文件覆盖度、功能模块完整度',
  },
  性能优化: {
    icon: <ThunderboltOutlined />,
    color: '#ffeaa7',
    description: '文件大小、加载速度、内存占用',
  },
  用户体验: {
    icon: <SmileOutlined />,
    color: '#45b7d1',
    description: '交互流畅度、操作便利性',
  },
  创新性: {
    icon: <ExperimentOutlined />,
    color: '#96ceb4',
    description: '独特设计元素、创意表现',
  },
}

/** 社区平均分（模拟数据） */
const COMMUNITY_AVERAGE = 72

// ==================== 辅助函数 ====================

/**
 * 模拟 AI 设计评分
 * 实际项目中应调用 AI 服务进行分析
 */
const mockDesignScore = async (_project: ThemeProject): Promise<DesignScore> => {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 1500))

  return {
    overall: 82,
    dimensions: [
      {
        name: '视觉美观度',
        score: 85,
        weight: 0.3,
        comment: '配色方案协调，主色调与辅助色搭配合理。图标设计风格统一，建议增加更多动态效果。',
      },
      {
        name: '功能完整性',
        score: 78,
        weight: 0.25,
        comment: '基础资源覆盖完整，但部分第三方应用图标缺失。锁屏和桌面组件齐全。',
      },
      {
        name: '性能优化',
        score: 80,
        weight: 0.2,
        comment: '整体性能良好，但壁纸文件偏大。MAML 动画复杂度适中，不会影响设备性能。',
      },
      {
        name: '用户体验',
        score: 88,
        weight: 0.15,
        comment: '交互设计流畅，操作反馈及时。建议优化通知栏的视觉效果。',
      },
      {
        name: '创新性',
        score: 75,
        weight: 0.1,
        comment: '设计有一定特色，但创新性方面还有提升空间。可以尝试更多独特的交互方式。',
      },
    ],
    suggestions: [
      '增加暗色模式适配，当前仅支持亮色模式',
      '优化壁纸文件大小，建议压缩至 2MB 以内',
      '丰富第三方应用图标覆盖，建议达到 150+ 个',
      '为锁屏添加更多动态效果，提升视觉吸引力',
      '统一所有图标的描边粗细，保持视觉一致性',
      '考虑添加自定义字体支持，增强主题个性',
      '优化通知栏卡片的设计，增加圆角和阴影效果',
    ],
  }
}

/** 获取评分等级 */
const getScoreLevel = (score: number): { label: string; color: string } => {
  if (score >= 90) return { label: '优秀', color: '#52c41a' }
  if (score >= 80) return { label: '良好', color: '#4ecdc4' }
  if (score >= 70) return { label: '一般', color: '#faad14' }
  if (score >= 60) return { label: '及格', color: '#ff7b7b' }
  return { label: '待改进', color: '#ff4d4f' }
}

/** 计算加权得分 */
const calculateWeightedScore = (dimensions: ScoreDimension[]): number => {
  return Math.round(
    dimensions.reduce((sum, dim) => sum + dim.score * dim.weight, 0)
  )
}

// ==================== 子组件 ====================

/**
 * 雷达图（使用 SVG 绘制）
 */
const RadarChart: React.FC<{
  dimensions: ScoreDimension[]
  size?: number
}> = ({ dimensions, size = 240 }) => {
  const center = size / 2
  const radius = size * 0.35
  const angleStep = (Math.PI * 2) / dimensions.length

  // 计算多边形顶点
  const getPoint = (score: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2
    const r = (score / 100) * radius
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    }
  }

  // 生成网格线
  const gridLevels = [20, 40, 60, 80, 100]
  const gridPolygons = gridLevels.map((level) => {
    const points = dimensions.map((_, i) => {
      const p = getPoint(level, i)
      return `${p.x},${p.y}`
    })
    return points.join(' ')
  })

  // 数据多边形
  const dataPoints = dimensions.map((dim, i) => {
    const p = getPoint(dim.score, i)
    return `${p.x},${p.y}`
  })
  const dataPolygon = dataPoints.join(' ')

  // 标签位置
  const labelPoints = dimensions.map((dim, i) => {
    const angle = i * angleStep - Math.PI / 2
    const labelRadius = radius + 28
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
      name: dim.name,
      score: dim.score,
      color: DIMENSION_CONFIG[dim.name]?.color || '#888',
    }
  })

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={size} height={size}>
        {/* 背景圆 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#2a2a3e"
          strokeWidth={1}
        />

        {/* 网格多边形 */}
        {gridPolygons.map((points, index) => (
          <polygon
            key={index}
            points={points}
            fill="none"
            stroke="#2a2a3e"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}

        {/* 轴线 */}
        {dimensions.map((_, i) => {
          const end = getPoint(100, i)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="#2a2a3e"
              strokeWidth={1}
            />
          )
        })}

        {/* 数据区域 */}
        <polygon
          points={dataPolygon}
          fill="rgba(255, 107, 107, 0.2)"
          stroke="#ff6b6b"
          strokeWidth={2}
        />

        {/* 数据点 */}
        {dimensions.map((dim, i) => {
          const p = getPoint(dim.score, i)
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={DIMENSION_CONFIG[dim.name]?.color || '#ff6b6b'}
              stroke="#fff"
              strokeWidth={2}
            />
          )
        })}

        {/* 标签 */}
        {labelPoints.map((label, i) => (
          <g key={i}>
            <text
              x={label.x}
              y={label.y - 6}
              textAnchor="middle"
              fill={label.color}
              fontSize={11}
              fontWeight={500}
            >
              {label.name}
            </text>
            <text
              x={label.x}
              y={label.y + 10}
              textAnchor="middle"
              fill="#888"
              fontSize={10}
            >
              {label.score}分
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/**
 * 环形总分展示
 */
const OverallScoreRing: React.FC<{
  score: number
  size?: number
}> = ({ score, size = 160 }) => {
  const level = getScoreLevel(score)
  const radius = size * 0.4
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - score / 100)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2a2a3e"
          strokeWidth={10}
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={level.color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      {/* 中心文字 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <div style={{ color: level.color, fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
          {score}
        </div>
        <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>综合评分</div>
        <Tag
          style={{
            marginTop: 6,
            background: `${level.color}20`,
            color: level.color,
            border: `1px solid ${level.color}40`,
            fontSize: 11,
          }}
        >
          {level.label}
        </Tag>
      </div>
    </div>
  )
}

/**
 * 维度评分卡片
 */
const DimensionCard: React.FC<{
  dimension: ScoreDimension
  index: number
}> = ({ dimension, index }) => {
  const config = DIMENSION_CONFIG[dimension.name]
  const level = getScoreLevel(dimension.score)

  return (
    <div
      style={{
        background: '#1a1a2e',
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 10,
        border: `1px solid ${config?.color || '#888'}20`,
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: `${config?.color || '#888'}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: config?.color || '#888',
              fontSize: 16,
            }}
          >
            {config?.icon}
          </div>
          <div>
            <div
              style={{
                color: '#e0e0e0',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {dimension.name}
            </div>
            <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
              权重 {Math.round(dimension.weight * 100)}%
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              color: level.color,
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {dimension.score}
          </div>
          <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>{level.label}</div>
        </div>
      </div>

      {/* 进度条 */}
      <Progress
        percent={dimension.score}
        size="small"
        strokeColor={config?.color || '#888'}
        trailColor="#0f0f23"
        showInfo={false}
        style={{ marginBottom: 10 }}
      />

      {/* 评语 */}
      <div
        style={{
          background: '#0f0f23',
          borderRadius: 6,
          padding: '8px 12px',
          color: '#888',
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {dimension.comment}
      </div>
    </div>
  )
}

/**
 * 社区对比
 */
const CommunityComparison: React.FC<{
  score: number
}> = ({ score }) => {
  const diff = score - COMMUNITY_AVERAGE
  const isHigher = diff > 0
  const isEqual = diff === 0

  return (
    <Card
      style={{
        background: '#0f0f23',
        border: '1px solid #2a2a3e',
        marginBottom: 20,
      }}
      bodyStyle={{ padding: 16 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <TrophyOutlined style={{ color: '#faad14', fontSize: 18 }} />
        <span style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 600 }}>社区对比</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* 当前主题 */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>当前主题</div>
          <div style={{ color: '#ff6b6b', fontSize: 28, fontWeight: 700 }}>{score}</div>
        </div>

        {/* 对比指示 */}
        <div style={{ textAlign: 'center' }}>
          {isEqual ? (
            <MinusOutlined style={{ color: '#888', fontSize: 20 }} />
          ) : isHigher ? (
            <div>
              <RiseOutlined style={{ color: '#52c41a', fontSize: 20 }} />
              <div style={{ color: '#52c41a', fontSize: 12, marginTop: 4 }}>+{diff}分</div>
            </div>
          ) : (
            <div>
              <FallOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
              <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{diff}分</div>
            </div>
          )}
        </div>

        {/* 社区平均 */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>社区平均</div>
          <div style={{ color: '#45b7d1', fontSize: 28, fontWeight: 700 }}>
            {COMMUNITY_AVERAGE}
          </div>
        </div>
      </div>

      {/* 排名提示 */}
      <div
        style={{
          marginTop: 12,
          padding: '8px 12px',
          background: '#1a1a2e',
          borderRadius: 6,
          textAlign: 'center',
          color: '#888',
          fontSize: 12,
        }}
      >
        {isHigher
          ? `您的主题评分高于社区平均 ${diff} 分，表现优秀！`
          : isEqual
            ? '您的主题评分与社区平均水平持平'
            : `您的主题评分低于社区平均 ${Math.abs(diff)} 分，还有提升空间`}
      </div>
    </Card>
  )
}

/**
 * 改进建议列表
 */
const SuggestionList: React.FC<{
  suggestions: string[]
}> = ({ suggestions }) => {
  return (
    <Card
      style={{
        background: '#0f0f23',
        border: '1px solid #2a2a3e',
      }}
      bodyStyle={{ padding: 16 }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BulbOutlined style={{ color: '#ffeaa7' }} />
          <span style={{ color: '#e0e0e0' }}>改进建议</span>
          <Badge
            count={suggestions.length}
            style={{ backgroundColor: '#ffeaa7', color: '#0f0f23' }}
          />
        </div>
      }
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 0',
            borderBottom:
              index < suggestions.length - 1 ? '1px solid #2a2a3e' : 'none',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: `${DIMENSION_CONFIG[Object.keys(DIMENSION_CONFIG)[index % 5]]?.color || '#888'}20`,
              color: DIMENSION_CONFIG[Object.keys(DIMENSION_CONFIG)[index % 5]]?.color || '#888',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {index + 1}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.5 }}>
              {suggestion}
            </div>
            <div style={{ marginTop: 6 }}>
              <Tag
                size="small"
                style={{
                  background: '#1a1a2e',
                  borderColor: '#2a2a3e',
                  color: '#888',
                  fontSize: 11,
                }}
              >
                {index < 3 ? '高优先级' : '建议优化'}
              </Tag>
            </div>
          </div>
        </div>
      ))}
    </Card>
  )
}

// ==================== 主组件 ====================

const AIDesignScore: React.FC<AIDesignScoreProps> = ({ project, onScoreUpdate }) => {
  const [isScoring, setIsScoring] = useState(false)
  const [score, setScore] = useState<DesignScore | null>(null)
  const [animatedScore, setAnimatedScore] = useState(0)

  /**
   * 开始评分
   */
  const handleStartScore = useCallback(async () => {
    setIsScoring(true)
    setScore(null)

    try {
      const result = await mockDesignScore(project)
      setScore(result)
      onScoreUpdate?.(result)
      message.success('AI 设计评分完成')
    } catch (error) {
      message.error('评分过程出现错误')
      console.error('Score error:', error)
    } finally {
      setIsScoring(false)
    }
  }, [project, onScoreUpdate])

  /**
   * 数字动画效果
   */
  useEffect(() => {
    if (!score) return

    const duration = 1000
    const startTime = Date.now()
    const targetScore = score.overall

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setAnimatedScore(Math.round(targetScore * eased))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [score])

  /**
   * 重新评分
   */
  const handleRescore = useCallback(() => {
    setAnimatedScore(0)
    handleStartScore()
  }, [handleStartScore])

  const level = score ? getScoreLevel(score.overall) : getScoreLevel(0)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StarOutlined style={{ color: '#ff6b6b', fontSize: 20 }} />
          <div>
            <div style={{ color: '#e0e0e0', fontSize: 16, fontWeight: 600 }}>
              AI 设计评分
            </div>
            <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
              多维度智能评估主题质量
            </div>
          </div>
        </div>

        <Button
          type="primary"
          icon={<StarOutlined />}
          loading={isScoring}
          onClick={score ? handleRescore : handleStartScore}
          style={{
            background: '#ff6b6b',
            borderColor: '#ff6b6b',
          }}
        >
          {score ? '重新评分' : '开始评分'}
        </Button>
      </div>

      {/* 主内容区域 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 20,
        }}
      >
        {isScoring ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Spin size="large" style={{ marginBottom: 24 }} />
            <div style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 500, marginBottom: 8 }}>
              AI 正在分析设计质量...
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>
              正在评估配色、排版、图标、性能等多个维度
            </div>
          </div>
        ) : score ? (
          <>
            {/* 评分总览区域 */}
            <div
              style={{
                display: 'flex',
                gap: 20,
                marginBottom: 24,
                flexWrap: 'wrap',
              }}
            >
              {/* 环形总分 */}
              <Card
                style={{
                  background: '#0f0f23',
                  border: `1px solid ${level.color}40`,
                  flex: 1,
                  minWidth: 200,
                  display: 'flex',
                  justifyContent: 'center',
                }}
                bodyStyle={{ padding: 20, display: 'flex', justifyContent: 'center' }}
              >
                <OverallScoreRing score={animatedScore} />
              </Card>

              {/* 雷达图 */}
              <Card
                style={{
                  background: '#0f0f23',
                  border: '1px solid #2a2a3e',
                  flex: 1.5,
                  minWidth: 280,
                }}
                bodyStyle={{ padding: 16 }}
              >
                <RadarChart dimensions={score.dimensions} />
              </Card>
            </div>

            {/* 社区对比 */}
            <CommunityComparison score={score.overall} />

            {/* 维度评分详情 */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <RocketOutlined style={{ color: '#ff6b6b' }} />
                <span style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 600 }}>
                  维度评分详情
                </span>
              </div>
              {score.dimensions.map((dimension, index) => (
                <DimensionCard
                  key={dimension.name}
                  dimension={dimension}
                  index={index}
                />
              ))}
            </div>

            {/* 改进建议 */}
            <SuggestionList suggestions={score.suggestions} />
          </>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>
                  点击「开始评分」获取 AI 设计评估
                </div>
                <div style={{ color: '#666', fontSize: 12, lineHeight: 1.8 }}>
                  <div>评分维度：视觉美观度、功能完整性、性能优化、用户体验、创新性</div>
                  <div>AI 将基于主题内容给出专业的优化建议</div>
                </div>
              </div>
            }
            style={{ marginTop: 80 }}
          />
        )}
      </div>
    </div>
  )
}

export default AIDesignScore
export type { DesignScore, ScoreDimension, AIDesignScoreProps }
