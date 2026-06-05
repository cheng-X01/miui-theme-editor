/**
 * 推送前 AI 检查器
 * 在主题推送到手机前进行自动检查，确保主题质量和兼容性
 *
 * 检查项：
 * 1. 完整性检查：description.xml、必需文件、资源文件
 * 2. 兼容性检查：MIUI 版本、分辨率适配、文件大小
 * 3. 性能检查：图片大小、MAML 复杂度、内存占用
 * 4. 设计检查：对比度 WCAG、颜色一致性、图标风格
 * 5. AI 智能建议：优化建议、常见问题预警
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Button,
  Card,
  List,
  Tag,
  Space,
  Progress,
  Steps,
  Tooltip,
  Empty,
  Spin,
  Badge,
  Divider,
  message,
  Result,
} from 'antd'
import {
  SafetyOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  RocketOutlined,
  FileTextOutlined,
  MobileOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  RobotOutlined,
  SyncOutlined,
  InfoCircleOutlined,
  FileImageOutlined,
  SoundOutlined,
  FontSizeOutlined,
  BranchesOutlined,
} from '@ant-design/icons'
import type { ThemeProject } from '../../../../shared/types'

// ==================== 类型定义 ====================

/** 检查状态 */
type CheckStatus = 'pass' | 'warning' | 'fail'

/** 检查项 */
interface CheckItem {
  category: string
  status: CheckStatus
  message: string
  details?: string[]
  autoFixable?: boolean
  issueId: string
}

/** 推送前检查结果 */
interface PrePushResult {
  passed: boolean
  score: number
  checks: CheckItem[]
}

/** 组件 Props */
interface AIPrePushCheckerProps {
  /** 主题项目 */
  project: ThemeProject
  /** 检查完成回调 */
  onCheckComplete: (result: PrePushResult) => void
  /** 修复问题回调 */
  onFixIssue: (issueId: string) => void
}

// ==================== 常量 ====================

/** 检查类别配置 */
const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  completeness: {
    icon: <FileTextOutlined />,
    color: '#4ecdc4',
    label: '完整性检查',
  },
  compatibility: {
    icon: <MobileOutlined />,
    color: '#45b7d1',
    label: '兼容性检查',
  },
  performance: {
    icon: <ThunderboltOutlined />,
    color: '#ffeaa7',
    label: '性能检查',
  },
  design: {
    icon: <EyeOutlined />,
    color: '#ff6b6b',
    label: '设计检查',
  },
  ai: {
    icon: <RobotOutlined />,
    color: '#96ceb4',
    label: 'AI 智能建议',
  },
}

/** 状态配置 */
const STATUS_CONFIG: Record<
  CheckStatus,
  { color: string; icon: React.ReactNode; label: string; bgColor: string }
> = {
  pass: {
    color: '#52c41a',
    icon: <CheckCircleOutlined />,
    label: '通过',
    bgColor: 'rgba(82, 196, 26, 0.15)',
  },
  warning: {
    color: '#faad14',
    icon: <WarningOutlined />,
    label: '警告',
    bgColor: 'rgba(250, 173, 20, 0.15)',
  },
  fail: {
    color: '#ff4d4f',
    icon: <CloseCircleOutlined />,
    label: '失败',
    bgColor: 'rgba(255, 77, 79, 0.15)',
  },
}

/** 检查步骤 */
const CHECK_STEPS = [
  { title: '完整性', description: '检查必需文件' },
  { title: '兼容性', description: '版本与分辨率' },
  { title: '性能', description: '资源优化' },
  { title: '设计', description: '视觉规范' },
  { title: 'AI 建议', description: '智能优化' },
]

// ==================== 辅助函数 ====================

/**
 * 模拟执行各项检查
 * 实际项目中应调用真实检查逻辑
 */
const runChecks = async (
  _project: ThemeProject,
  onProgress: (step: number, message: string) => void
): Promise<CheckItem[]> => {
  const checks: CheckItem[] = []

  // 步骤 1: 完整性检查
  onProgress(0, '正在检查文件完整性...')
  await delay(800)
  checks.push(
    {
      issueId: 'comp-001',
      category: 'completeness',
      status: 'pass',
      message: 'description.xml 文件完整',
      details: ['作者信息已填写', '版本号格式正确', '主题描述字数充足'],
    },
    {
      issueId: 'comp-002',
      category: 'completeness',
      status: 'pass',
      message: '必需资源文件齐全',
      details: ['壁纸资源: 2 个', '图标资源: 120 个', '字体资源: 1 个'],
    },
    {
      issueId: 'comp-003',
      category: 'completeness',
      status: 'warning',
      message: '部分可选资源缺失',
      details: ['锁屏音效未配置', '充电动画使用默认'],
      autoFixable: true,
    }
  )

  // 步骤 2: 兼容性检查
  onProgress(1, '正在检查兼容性...')
  await delay(800)
  checks.push(
    {
      issueId: 'compat-001',
      category: 'compatibility',
      status: 'pass',
      message: 'MIUI 版本兼容性良好',
      details: ['支持 MIUI 12+', '支持 MIUI 13+', '支持 MIUI 14+'],
    },
    {
      issueId: 'compat-002',
      category: 'compatibility',
      status: 'pass',
      message: '分辨率适配正常',
      details: ['1080p 已适配', '2K 分辨率已适配'],
    },
    {
      issueId: 'compat-003',
      category: 'compatibility',
      status: 'warning',
      message: '主题包大小接近限制',
      details: ['当前大小: 48.5MB', '建议上限: 50MB'],
      autoFixable: true,
    }
  )

  // 步骤 3: 性能检查
  onProgress(2, '正在评估性能...')
  await delay(800)
  checks.push(
    {
      issueId: 'perf-001',
      category: 'performance',
      status: 'warning',
      message: '部分图片文件过大',
      details: ['wallpaper_main.jpg: 3.2MB (建议 < 2MB)', 'lockscreen_bg.png: 2.8MB (建议 < 2MB)'],
      autoFixable: true,
    },
    {
      issueId: 'perf-002',
      category: 'performance',
      status: 'pass',
      message: 'MAML 动画复杂度正常',
      details: ['动画元素: 12 个', '触发器: 5 个', '预计内存占用: 15MB'],
    },
    {
      issueId: 'perf-003',
      category: 'performance',
      status: 'pass',
      message: '字体文件优化良好',
      details: ['字体大小: 1.2MB', '字重覆盖: Regular, Bold'],
    }
  )

  // 步骤 4: 设计检查
  onProgress(3, '正在检查设计规范...')
  await delay(800)
  checks.push(
    {
      issueId: 'design-001',
      category: 'design',
      status: 'pass',
      message: '对比度符合 WCAG AA 标准',
      details: ['主文字对比度: 7.2:1', '次要文字对比度: 4.8:1'],
    },
    {
      issueId: 'design-002',
      category: 'design',
      status: 'warning',
      message: '部分图标风格不统一',
      details: ['设置图标使用线性风格', '相机图标使用面性风格', '建议统一为线性风格'],
      autoFixable: true,
    },
    {
      issueId: 'design-003',
      category: 'design',
      status: 'pass',
      message: '颜色一致性良好',
      details: ['主色调: #ff6b6b', '辅助色: #4ecdc4', '共使用 8 种颜色'],
    }
  )

  // 步骤 5: AI 智能建议
  onProgress(4, 'AI 正在分析优化建议...')
  await delay(1200)
  checks.push(
    {
      issueId: 'ai-001',
      category: 'ai',
      status: 'warning',
      message: '建议增加暗色模式适配',
      details: ['当前主题仅支持亮色模式', '暗色模式用户占比 65%'],
      autoFixable: false,
    },
    {
      issueId: 'ai-002',
      category: 'ai',
      status: 'info' as CheckStatus,
      message: '图标数量可进一步丰富',
      details: ['当前图标: 120 个', '建议覆盖: 150+ 个常用应用'],
      autoFixable: false,
    },
    {
      issueId: 'ai-003',
      category: 'ai',
      status: 'pass',
      message: '主题整体质量评估优秀',
      details: ['视觉设计: 85 分', '功能完整度: 90 分', '用户体验: 88 分'],
    }
  )

  return checks
}

/** 延迟辅助函数 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 计算综合得分 */
const calculateScore = (checks: CheckItem[]): number => {
  const weights: Record<CheckStatus, number> = { pass: 100, warning: 60, fail: 0 }
  const categoryWeights: Record<string, number> = {
    completeness: 0.25,
    compatibility: 0.2,
    performance: 0.2,
    design: 0.2,
    ai: 0.15,
  }

  const categoryScores: Record<string, number[]> = {}
  checks.forEach((check) => {
    if (!categoryScores[check.category]) {
      categoryScores[check.category] = []
    }
    categoryScores[check.category].push(weights[check.status])
  })

  let totalScore = 0
  Object.entries(categoryScores).forEach(([category, scores]) => {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    totalScore += avgScore * (categoryWeights[category] || 0.2)
  })

  return Math.round(totalScore)
}

// ==================== 子组件 ====================

/**
 * 检查结果卡片
 */
const CheckResultCard: React.FC<{
  check: CheckItem
  onFix: (issueId: string) => void
}> = ({ check, onFix }) => {
  const statusConfig = STATUS_CONFIG[check.status]
  const categoryConfig = CATEGORY_CONFIG[check.category]

  return (
    <div
      style={{
        background: '#1a1a2e',
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 10,
        border: `1px solid ${statusConfig.color}30`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* 头部信息 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${categoryConfig?.color || '#888'}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: categoryConfig?.color || '#888',
              fontSize: 14,
            }}
          >
            {categoryConfig?.icon}
          </div>
          <div>
            <div
              style={{
                color: '#e0e0e0',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {check.message}
            </div>
            <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
              {categoryConfig?.label}
            </div>
          </div>
        </div>

        <Tag
          icon={statusConfig.icon}
          style={{
            margin: 0,
            background: statusConfig.bgColor,
            color: statusConfig.color,
            border: `1px solid ${statusConfig.color}40`,
            fontSize: 12,
          }}
        >
          {statusConfig.label}
        </Tag>
      </div>

      {/* 详情列表 */}
      {check.details && check.details.length > 0 && (
        <div
          style={{
            background: '#0f0f23',
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: 10,
          }}
        >
          {check.details.map((detail, index) => (
            <div
              key={index}
              style={{
                color: '#888',
                fontSize: 12,
                padding: '3px 0',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: statusConfig.color,
                  flexShrink: 0,
                }}
              />
              {detail}
            </div>
          ))}
        </div>
      )}

      {/* 修复按钮 */}
      {check.autoFixable && check.status !== 'pass' && (
        <Button
          size="small"
          type="primary"
          ghost
          icon={<SyncOutlined />}
          onClick={() => onFix(check.issueId)}
          style={{
            borderColor: '#ff6b6b',
            color: '#ff6b6b',
            fontSize: 12,
          }}
        >
          一键修复
        </Button>
      )}
    </div>
  )
}

/**
 * 检查进度面板
 */
const CheckProgress: React.FC<{
  currentStep: number
  progress: number
  message: string
}> = ({ currentStep, progress, message }) => {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <Spin size="large" style={{ marginBottom: 24 }} />
      <Progress
        percent={progress}
        strokeColor="#ff6b6b"
        trailColor="#2a2a3e"
        showInfo={false}
        style={{ marginBottom: 16, maxWidth: 300 }}
      />
      <div style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 500, marginBottom: 8 }}>
        {message}
      </div>
      <Steps
        current={currentStep}
        size="small"
        items={CHECK_STEPS.map((step) => ({
          title: <span style={{ color: '#888', fontSize: 12 }}>{step.title}</span>,
        }))}
        style={{ maxWidth: 400, margin: '0 auto' }}
      />
    </div>
  )
}

/**
 * 检查结果总览
 */
const ResultSummary: React.FC<{
  score: number
  checks: CheckItem[]
  onPush: () => void
}> = ({ score, checks, onPush }) => {
  const passCount = checks.filter((c) => c.status === 'pass').length
  const warningCount = checks.filter((c) => c.status === 'warning').length
  const failCount = checks.filter((c) => c.status === 'fail').length

  const scoreColor = score >= 90 ? '#52c41a' : score >= 70 ? '#faad14' : '#ff4d4f'
  const canPush = failCount === 0

  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      {/* 总分环形进度 */}
      <Card
        style={{
          background: '#0f0f23',
          border: `1px solid ${scoreColor}40`,
          flex: 1,
          minWidth: 200,
        }}
        bodyStyle={{ padding: 20, textAlign: 'center' }}
      >
        <Progress
          type="circle"
          percent={score}
          width={100}
          strokeColor={scoreColor}
          trailColor="#2a2a3e"
          format={(percent) => (
            <div>
              <div style={{ color: scoreColor, fontSize: 28, fontWeight: 700 }}>{percent}</div>
              <div style={{ color: '#666', fontSize: 11 }}>综合得分</div>
            </div>
          )}
        />
      </Card>

      {/* 统计卡片 */}
      <div style={{ flex: 2, display: 'flex', gap: 12, minWidth: 280 }}>
        <Card
          style={{
            background: '#0f0f23',
            border: '1px solid #52c41a40',
            flex: 1,
            textAlign: 'center',
          }}
          bodyStyle={{ padding: 16 }}
        >
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24, marginBottom: 8 }} />
          <div style={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }}>{passCount}</div>
          <div style={{ color: '#888', fontSize: 12 }}>通过</div>
        </Card>
        <Card
          style={{
            background: '#0f0f23',
            border: '1px solid #faad1440',
            flex: 1,
            textAlign: 'center',
          }}
          bodyStyle={{ padding: 16 }}
        >
          <WarningOutlined style={{ color: '#faad14', fontSize: 24, marginBottom: 8 }} />
          <div style={{ color: '#faad14', fontSize: 24, fontWeight: 700 }}>{warningCount}</div>
          <div style={{ color: '#888', fontSize: 12 }}>警告</div>
        </Card>
        <Card
          style={{
            background: '#0f0f23',
            border: '1px solid #ff4d4f40',
            flex: 1,
            textAlign: 'center',
          }}
          bodyStyle={{ padding: 16 }}
        >
          <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 24, marginBottom: 8 }} />
          <div style={{ color: '#ff4d4f', fontSize: 24, fontWeight: 700 }}>{failCount}</div>
          <div style={{ color: '#888', fontSize: 12 }}>失败</div>
        </Card>
      </div>

      {/* 推送按钮 */}
      <Card
        style={{
          background: '#0f0f23',
          border: `1px solid ${canPush ? '#52c41a40' : '#ff4d4f40'}`,
          minWidth: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        bodyStyle={{ padding: 20, textAlign: 'center', width: '100%' }}
      >
        <Button
          type="primary"
          size="large"
          icon={<RocketOutlined />}
          disabled={!canPush}
          onClick={onPush}
          style={{
            background: canPush ? '#52c41a' : '#666',
            borderColor: canPush ? '#52c41a' : '#666',
            width: '100%',
            height: 48,
            fontSize: 15,
          }}
        >
          {canPush ? '推送到手机' : '存在失败项'}
        </Button>
        <div style={{ color: '#666', fontSize: 11, marginTop: 8 }}>
          {canPush ? '检查通过，可以推送' : '请修复失败项后再推送'}
        </div>
      </Card>
    </div>
  )
}

// ==================== 主组件 ====================

const AIPrePushChecker: React.FC<AIPrePushCheckerProps> = ({
  project,
  onCheckComplete,
  onFixIssue,
}) => {
  const [isChecking, setIsChecking] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [checkProgress, setCheckProgress] = useState(0)
  const [result, setResult] = useState<PrePushResult | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  /**
   * 开始检查
   */
  const handleStartCheck = useCallback(async () => {
    setIsChecking(true)
    setResult(null)
    setCheckProgress(0)

    try {
      const checks = await runChecks(project, (step, message) => {
        setCurrentStep(step)
        setProgressMessage(message)
        setCheckProgress(((step + 1) / CHECK_STEPS.length) * 100)
      })

      const score = calculateScore(checks)
      const passed = !checks.some((c) => c.status === 'fail')

      const finalResult: PrePushResult = {
        passed,
        score,
        checks,
      }

      setResult(finalResult)
      onCheckComplete(finalResult)
      message.success(`检查完成，综合得分: ${score} 分`)
    } catch (error) {
      message.error('检查过程出现错误')
      console.error('Check error:', error)
    } finally {
      setIsChecking(false)
    }
  }, [project, onCheckComplete])

  /**
   * 修复问题
   */
  const handleFix = useCallback(
    (issueId: string) => {
      onFixIssue(issueId)
      message.success(`已尝试修复问题: ${issueId}`)

      // 更新本地状态，标记为已修复
      setResult((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          checks: prev.checks.map((check) =>
            check.issueId === issueId ? { ...check, status: 'pass' as CheckStatus } : check
          ),
        }
      })
    },
    [onFixIssue]
  )

  /**
   * 一键修复所有可修复问题
   */
  const handleFixAll = useCallback(() => {
    if (!result) return

    const fixableIssues = result.checks.filter((c) => c.autoFixable && c.status !== 'pass')
    fixableIssues.forEach((issue) => {
      onFixIssue(issue.issueId)
    })

    setResult((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        checks: prev.checks.map((check) =>
          check.autoFixable && check.status !== 'pass'
            ? { ...check, status: 'pass' as CheckStatus }
            : check
        ),
      }
    })

    message.success(`已自动修复 ${fixableIssues.length} 个问题`)
  }, [result, onFixIssue])

  /**
   * 按类别过滤的检查列表
   */
  const filteredChecks = useMemo(() => {
    if (!result) return []
    if (!activeCategory) return result.checks
    return result.checks.filter((c) => c.category === activeCategory)
  }, [result, activeCategory])

  /**
   * 类别统计
   */
  const categoryStats = useMemo(() => {
    if (!result) return {}
    const stats: Record<string, { total: number; pass: number; warning: number; fail: number }> = {}
    result.checks.forEach((check) => {
      if (!stats[check.category]) {
        stats[check.category] = { total: 0, pass: 0, warning: 0, fail: 0 }
      }
      stats[check.category].total++
      stats[check.category][check.status]++
    })
    return stats
  }, [result])

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
          <SafetyOutlined style={{ color: '#ff6b6b', fontSize: 20 }} />
          <div>
            <div style={{ color: '#e0e0e0', fontSize: 16, fontWeight: 600 }}>
              推送前 AI 检查
            </div>
            <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
              确保主题质量和兼容性
            </div>
          </div>
        </div>

        <Space>
          {result && (
            <Button
              icon={<SyncOutlined />}
              onClick={handleFixAll}
              style={{
                background: '#1a1a2e',
                borderColor: '#2a2a3e',
                color: '#e0e0e0',
              }}
            >
              一键修复全部
            </Button>
          )}
          <Button
            type="primary"
            icon={<SafetyOutlined />}
            loading={isChecking}
            onClick={handleStartCheck}
            style={{
              background: '#ff6b6b',
              borderColor: '#ff6b6b',
            }}
          >
            {result ? '重新检查' : '开始检查'}
          </Button>
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
        {isChecking ? (
          <CheckProgress
            currentStep={currentStep}
            progress={checkProgress}
            message={progressMessage}
          />
        ) : result ? (
          <>
            {/* 结果总览 */}
            <ResultSummary
              score={result.score}
              checks={result.checks}
              onPush={() => message.success('开始推送到手机...')}
            />

            {/* 类别过滤 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <Button
                size="small"
                type={activeCategory === null ? 'primary' : 'default'}
                onClick={() => setActiveCategory(null)}
                style={
                  activeCategory === null
                    ? { background: '#ff6b6b', borderColor: '#ff6b6b' }
                    : { background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }
                }
              >
                全部 ({result.checks.length})
              </Button>
              {Object.entries(categoryStats).map(([category, stats]) => {
                const config = CATEGORY_CONFIG[category]
                return (
                  <Button
                    key={category}
                    size="small"
                    type={activeCategory === category ? 'primary' : 'default'}
                    onClick={() => setActiveCategory(category)}
                    style={
                      activeCategory === category
                        ? { background: config?.color || '#ff6b6b', borderColor: config?.color || '#ff6b6b' }
                        : { background: '#1a1a2e', borderColor: '#2a2a3e', color: '#e0e0e0' }
                    }
                  >
                    {config?.icon}
                    <span style={{ marginLeft: 4 }}>{config?.label}</span>
                    <span style={{ marginLeft: 4, opacity: 0.7 }}>
                      ({stats.pass}/{stats.total})
                    </span>
                  </Button>
                )
              })}
            </div>

            {/* 检查列表 */}
            <div>
              {filteredChecks.map((check) => (
                <CheckResultCard key={check.issueId} check={check} onFix={handleFix} />
              ))}
            </div>
          </>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>
                  点击「开始检查」对主题进行全面检查
                </div>
                <div style={{ color: '#666', fontSize: 12, lineHeight: 1.8 }}>
                  <div>检查内容包括：文件完整性、MIUI 兼容性、性能优化、设计规范等</div>
                  <div>AI 将自动分析并给出优化建议</div>
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

export default AIPrePushChecker
export type { PrePushResult, CheckItem, CheckStatus, AIPrePushCheckerProps }
