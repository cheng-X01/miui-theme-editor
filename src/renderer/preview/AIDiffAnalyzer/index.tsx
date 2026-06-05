/**
 * AI 预览差异分析器
 * 将编辑器中的设计预览与真机截图进行对比，AI 分析差异
 *
 * 功能说明：
 * - 左右对比视图（设计稿 | 真机截图）
 * - 叠加差异高亮层（红色 = 不匹配区域，黄色 = 轻微差异）
 * - 差异列表（按严重程度排序）
 * - AI 分析按钮（调用 AI 对比分析）
 * - 一键修复建议（点击后自动调整设计参数）
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Button,
  Card,
  List,
  Tag,
  Space,
  Tooltip,
  Progress,
  Empty,
  Spin,
  Badge,
  Divider,
  message,
} from 'antd'
import {
  CameraOutlined,
  RobotOutlined,
  BugOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  ArrowRightOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SyncOutlined,
} from '@ant-design/icons'

// ==================== 类型定义 ====================

/** 差异类型 */
type DiffType = 'color' | 'position' | 'size' | 'missing' | 'extra' | 'font'

/** 严重程度 */
type Severity = 'critical' | 'warning' | 'info'

/** 差异项 */
interface Difference {
  type: DiffType
  severity: Severity
  description: string
  expected: string
  actual: string
  suggestion: string
}

/** 差异分析结果 */
interface DiffAnalysisResult {
  overallMatch: number
  differences: Difference[]
  summary: string
}

/** 组件 Props */
interface AIDiffAnalyzerProps {
  /** 设计稿预览图 base64/URL */
  designPreview: string
  /** 真机截图 base64/URL（通过 ADB 获取） */
  deviceScreenshot?: string
  /** 请求截屏的回调 */
  onRequestScreenshot: () => Promise<string>
  /** 分析完成回调 */
  onAnalyze: (result: DiffAnalysisResult) => void
}

// ==================== 常量 ====================

/** 严重程度配置 */
const SEVERITY_CONFIG: Record<
  Severity,
  { color: string; bgColor: string; icon: React.ReactNode; label: string }
> = {
  critical: {
    color: '#ff4d4f',
    bgColor: 'rgba(255, 77, 79, 0.15)',
    icon: <ExclamationCircleOutlined />,
    label: '严重',
  },
  warning: {
    color: '#faad14',
    bgColor: 'rgba(250, 173, 20, 0.15)',
    icon: <WarningOutlined />,
    label: '警告',
  },
  info: {
    color: '#1890ff',
    bgColor: 'rgba(24, 144, 255, 0.15)',
    icon: <InfoCircleOutlined />,
    label: '提示',
  },
}

/** 差异类型标签 */
const DIFF_TYPE_LABELS: Record<DiffType, string> = {
  color: '颜色',
  position: '位置',
  size: '尺寸',
  missing: '缺失',
  extra: '多余',
  font: '字体',
}

/** 差异类型颜色 */
const DIFF_TYPE_COLORS: Record<DiffType, string> = {
  color: '#ff6b6b',
  position: '#4ecdc4',
  size: '#45b7d1',
  missing: '#ff4d4f',
  extra: '#faad14',
  font: '#96ceb4',
}

// ==================== 辅助函数 ====================

/**
 * 模拟 AI 分析差异
 * 实际项目中应调用 AI 服务进行图像对比分析
 */
const mockAIAnalyze = async (
  _designPreview: string,
  _deviceScreenshot: string
): Promise<DiffAnalysisResult> => {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 2000))

  return {
    overallMatch: 85,
    differences: [
      {
        type: 'position',
        severity: 'critical',
        description: '图标位置偏移',
        expected: 'x=100, y=200',
        actual: 'x=120, y=210',
        suggestion: '调整图标位置至设计稿坐标，建议检查布局对齐方式',
      },
      {
        type: 'color',
        severity: 'warning',
        description: '主色调偏差',
        expected: '#ff6b6b',
        actual: '#ff7b7b',
        suggestion: '颜色存在轻微偏差，建议重新校准色值',
      },
      {
        type: 'size',
        severity: 'warning',
        description: '按钮尺寸不一致',
        expected: '宽 200px, 高 48px',
        actual: '宽 196px, 高 46px',
        suggestion: '调整按钮尺寸以匹配设计规范',
      },
      {
        type: 'font',
        severity: 'info',
        description: '字体大小建议调整',
        expected: '16px',
        actual: '15px',
        suggestion: '字体大小接近标准，可根据实际显示效果微调',
      },
      {
        type: 'missing',
        severity: 'info',
        description: '阴影效果未显示',
        expected: '包含阴影层',
        actual: '无阴影',
        suggestion: '检查设备是否支持阴影渲染，或简化阴影效果',
      },
    ],
    summary:
      '整体设计还原度良好（85%），存在 2 个警告项和 3 个提示项。主要问题为图标位置偏移和颜色轻微偏差，建议优先修复位置问题。',
  }
}

// ==================== 子组件 ====================

/**
 * 对比图片视图
 */
const ComparisonView: React.FC<{
  designPreview: string
  deviceScreenshot?: string
  showOverlay: boolean
  differences: Difference[]
}> = ({ designPreview, deviceScreenshot, showOverlay, differences }) => {
  const [activeImage, setActiveImage] = useState<'design' | 'device' | 'both'>('both')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 视图切换工具栏 */}
      <Space style={{ justifyContent: 'center' }}>
        <Button
          size="small"
          type={activeImage === 'design' ? 'primary' : 'default'}
          onClick={() => setActiveImage('design')}
          style={
            activeImage === 'design'
              ? { background: '#ff6b6b', borderColor: '#ff6b6b' }
              : { background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }
          }
        >
          设计稿
        </Button>
        <Button
          size="small"
          type={activeImage === 'both' ? 'primary' : 'default'}
          onClick={() => setActiveImage('both')}
          style={
            activeImage === 'both'
              ? { background: '#ff6b6b', borderColor: '#ff6b6b' }
              : { background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }
          }
        >
          左右对比
        </Button>
        <Button
          size="small"
          type={activeImage === 'device' ? 'primary' : 'default'}
          onClick={() => setActiveImage('device')}
          style={
            activeImage === 'device'
              ? { background: '#ff6b6b', borderColor: '#ff6b6b' }
              : { background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }
          }
        >
          真机截图
        </Button>
      </Space>

      {/* 图片对比区域 */}
      <div
        style={{
          display: 'flex',
          gap: activeImage === 'both' ? 16 : 0,
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        {/* 设计稿预览 */}
        {(activeImage === 'design' || activeImage === 'both') && (
          <div style={{ flex: activeImage === 'both' ? 1 : 'none', position: 'relative' }}>
            <div
              style={{
                textAlign: 'center',
                color: '#888',
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              设计稿预览
            </div>
            <div
              style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #2a2a3e',
                background: '#0f0f23',
              }}
            >
              <img
                src={designPreview}
                alt="设计稿预览"
                style={{
                  width: '100%',
                  maxWidth: 280,
                  display: 'block',
                }}
              />
            </div>
          </div>
        )}

        {/* 真机截图 */}
        {(activeImage === 'device' || activeImage === 'both') && (
          <div style={{ flex: activeImage === 'both' ? 1 : 'none', position: 'relative' }}>
            <div
              style={{
                textAlign: 'center',
                color: '#888',
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              真机截图
            </div>
            <div
              style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #2a2a3e',
                background: '#0f0f23',
              }}
            >
              {deviceScreenshot ? (
                <>
                  <img
                    src={deviceScreenshot}
                    alt="真机截图"
                    style={{
                      width: '100%',
                      maxWidth: 280,
                      display: 'block',
                    }}
                  />
                  {/* 差异高亮叠加层 */}
                  {showOverlay && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        pointerEvents: 'none',
                      }}
                    >
                      {differences.map((diff, index) => (
                        <div
                          key={index}
                          style={{
                            position: 'absolute',
                            top: `${20 + index * 15}%`,
                            left: `${15 + index * 10}%`,
                            width: '30%',
                            height: '12%',
                            background:
                              diff.severity === 'critical'
                                ? 'rgba(255, 77, 79, 0.3)'
                                : 'rgba(250, 173, 20, 0.25)',
                            border:
                              diff.severity === 'critical'
                                ? '2px solid rgba(255, 77, 79, 0.6)'
                                : '2px solid rgba(250, 173, 20, 0.5)',
                            borderRadius: 4,
                            animation: 'pulse 2s infinite',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<span style={{ color: '#666' }}>暂无真机截图</span>}
                  style={{ padding: '40px 20px' }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 差异列表项
 */
const DifferenceItem: React.FC<{
  diff: Difference
  index: number
  onFix: (diff: Difference) => void
}> = ({ diff, index, onFix }) => {
  const config = SEVERITY_CONFIG[diff.severity]

  return (
    <List.Item
      style={{
        padding: '12px 16px',
        marginBottom: 8,
        background: '#1a1a2e',
        borderRadius: 8,
        border: '1px solid #2a2a3e',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ width: '100%' }}>
        {/* 头部：序号 + 严重程度 + 类型 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <Badge
            count={index + 1}
            style={{
              backgroundColor: config.color,
              minWidth: 20,
              height: 20,
              lineHeight: '20px',
              fontSize: 11,
            }}
          />
          <Tag
            icon={config.icon}
            style={{
              margin: 0,
              background: config.bgColor,
              color: config.color,
              border: `1px solid ${config.color}40`,
              fontSize: 12,
            }}
          >
            {config.label}
          </Tag>
          <Tag
            style={{
              margin: 0,
              background: `${DIFF_TYPE_COLORS[diff.type]}20`,
              color: DIFF_TYPE_COLORS[diff.type],
              border: `1px solid ${DIFF_TYPE_COLORS[diff.type]}40`,
              fontSize: 12,
            }}
          >
            {DIFF_TYPE_LABELS[diff.type]}
          </Tag>
        </div>

        {/* 描述 */}
        <div
          style={{
            color: '#e0e0e0',
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 8,
          }}
        >
          {diff.description}
        </div>

        {/* 预期 vs 实际 */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginBottom: 8,
            fontSize: 12,
          }}
        >
          <div>
            <span style={{ color: '#666' }}>预期: </span>
            <span style={{ color: '#4ecdc4' }}>{diff.expected}</span>
          </div>
          <ArrowRightOutlined style={{ color: '#666' }} />
          <div>
            <span style={{ color: '#666' }}>实际: </span>
            <span style={{ color: '#ff6b6b' }}>{diff.actual}</span>
          </div>
        </div>

        {/* 建议 */}
        <div
          style={{
            background: '#0f0f23',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            color: '#888',
            marginBottom: 8,
          }}
        >
          <InfoCircleOutlined style={{ marginRight: 6, color: '#1890ff' }} />
          {diff.suggestion}
        </div>

        {/* 修复按钮 */}
        {diff.severity !== 'info' && (
          <Button
            size="small"
            type="primary"
            ghost
            onClick={() => onFix(diff)}
            style={{
              borderColor: '#ff6b6b',
              color: '#ff6b6b',
              fontSize: 12,
            }}
          >
            <SyncOutlined style={{ marginRight: 4 }} />
            一键修复
          </Button>
        )}
      </div>
    </List.Item>
  )
}

// ==================== 主组件 ====================

const AIDiffAnalyzer: React.FC<AIDiffAnalyzerProps> = ({
  designPreview,
  deviceScreenshot: initialScreenshot,
  onRequestScreenshot,
  onAnalyze,
}) => {
  const [deviceScreenshot, setDeviceScreenshot] = useState<string | undefined>(initialScreenshot)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const [analysisResult, setAnalysisResult] = useState<DiffAnalysisResult | null>(null)

  /**
   * 获取真机截图
   */
  const handleRequestScreenshot = useCallback(async () => {
    setIsCapturing(true)
    try {
      const screenshot = await onRequestScreenshot()
      setDeviceScreenshot(screenshot)
      message.success('真机截图获取成功')
    } catch (error) {
      message.error('获取真机截图失败')
      console.error('Screenshot error:', error)
    } finally {
      setIsCapturing(false)
    }
  }, [onRequestScreenshot])

  /**
   * 执行 AI 差异分析
   */
  const handleAnalyze = useCallback(async () => {
    if (!deviceScreenshot) {
      message.warning('请先获取真机截图')
      return
    }

    setIsAnalyzing(true)
    try {
      const result = await mockAIAnalyze(designPreview, deviceScreenshot)
      setAnalysisResult(result)
      onAnalyze(result)
      message.success('AI 差异分析完成')
    } catch (error) {
      message.error('AI 分析失败')
      console.error('Analyze error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [designPreview, deviceScreenshot, onAnalyze])

  /**
   * 一键修复差异
   */
  const handleFix = useCallback((diff: Difference) => {
    message.success(`已自动修复: ${diff.description}`)
    // 实际项目中应调用编辑器 API 调整对应设计参数
  }, [])

  /**
   * 按严重程度排序的差异列表
   */
  const sortedDifferences = useMemo(() => {
    if (!analysisResult) return []
    const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }
    return [...analysisResult.differences].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    )
  }, [analysisResult])

  /**
   * 匹配度颜色
   */
  const matchColor = useMemo(() => {
    if (!analysisResult) return '#888'
    const match = analysisResult.overallMatch
    if (match >= 90) return '#52c41a'
    if (match >= 70) return '#faad14'
    return '#ff4d4f'
  }, [analysisResult])

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
      {/* 顶部工具栏 */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space>
          <Button
            icon={<CameraOutlined />}
            loading={isCapturing}
            onClick={handleRequestScreenshot}
            style={{
              background: '#1a1a2e',
              borderColor: '#2a2a3e',
              color: '#e0e0e0',
            }}
          >
            获取真机截图
          </Button>
          <Button
            icon={<RobotOutlined />}
            type="primary"
            loading={isAnalyzing}
            disabled={!deviceScreenshot}
            onClick={handleAnalyze}
            style={{
              background: '#ff6b6b',
              borderColor: '#ff6b6b',
            }}
          >
            AI 分析差异
          </Button>
        </Space>

        <Space>
          {deviceScreenshot && (
            <Button
              size="small"
              icon={showOverlay ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => setShowOverlay(!showOverlay)}
              style={{
                background: '#1a1a2e',
                borderColor: '#2a2a3e',
                color: '#e0e0e0',
              }}
            >
              {showOverlay ? '隐藏高亮' : '显示高亮'}
            </Button>
          )}
          {analysisResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#888', fontSize: 13 }}>匹配度:</span>
              <Progress
                type="circle"
                percent={analysisResult.overallMatch}
                width={40}
                strokeColor={matchColor}
                trailColor="#2a2a3e"
                format={(percent) => (
                  <span style={{ color: matchColor, fontSize: 11, fontWeight: 600 }}>
                    {percent}%
                  </span>
                )}
              />
            </div>
          )}
        </Space>
      </div>

      {/* 主内容区域 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 20,
        }}
      >
        {/* 图片对比区域 */}
        <Card
          style={{
            background: '#0f0f23',
            border: '1px solid #2a2a3e',
            marginBottom: 20,
          }}
          bodyStyle={{ padding: 16 }}
        >
          <ComparisonView
            designPreview={designPreview}
            deviceScreenshot={deviceScreenshot}
            showOverlay={showOverlay}
            differences={analysisResult?.differences || []}
          />
        </Card>

        {/* AI 分析摘要 */}
        {analysisResult && (
          <Card
            style={{
              background: '#0f0f23',
              border: '1px solid #2a2a3e',
              marginBottom: 20,
            }}
            bodyStyle={{ padding: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <RobotOutlined style={{ color: '#ff6b6b', fontSize: 16 }} />
              <span style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 600 }}>
                AI 分析摘要
              </span>
            </div>
            <div
              style={{
                background: '#1a1a2e',
                padding: '12px 16px',
                borderRadius: 8,
                color: '#888',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {analysisResult.summary}
            </div>
          </Card>
        )}

        {/* 差异列表 */}
        <Card
          style={{
            background: '#0f0f23',
            border: '1px solid #2a2a3e',
          }}
          bodyStyle={{ padding: 16 }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BugOutlined style={{ color: '#ff6b6b' }} />
              <span style={{ color: '#e0e0e0' }}>
                差异列表
                {analysisResult && (
                  <span style={{ color: '#666', marginLeft: 8, fontSize: 13 }}>
                    (共 {analysisResult.differences.length} 项)
                  </span>
                )}
              </span>
            </div>
          }
        >
          {isAnalyzing ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <div style={{ color: '#888', marginTop: 16 }}>AI 正在分析差异...</div>
            </div>
          ) : sortedDifferences.length > 0 ? (
            <List
              dataSource={sortedDifferences}
              renderItem={(diff, index) => (
                <DifferenceItem key={index} diff={diff} index={index} onFix={handleFix} />
              )}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: '#666' }}>
                  {deviceScreenshot
                    ? '点击「AI 分析差异」开始分析'
                    : '请先获取真机截图'}
                </span>
              }
              style={{ padding: '40px 0' }}
            />
          )}
        </Card>
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

export default AIDiffAnalyzer
export type { DiffAnalysisResult, Difference, DiffType, Severity }
