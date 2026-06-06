/**
 * MIUI Theme Editor - AI 新手引导教程组件
 * 首次启动时的交互式引导，帮助用户快速了解编辑器功能。
 *
 * 功能：
 * - 步骤式引导（8 步）
 * - 每步包含：标题、描述、插图占位（渐变色块 + 图标）、操作提示
 * - "下一步"/"上一步"/"跳过" 按钮
 * - 完成后显示总结和快速操作入口
 * - 引导进度保存（localStorage，不再显示）
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Modal, Button, Space, Typography, Progress } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  FolderOpenOutlined,
  AppstoreOutlined,
  PictureOutlined,
  BgColorsOutlined,
  CodeOutlined,
  RobotOutlined,
  MobileOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { guideSteps, quickActions, ONBOARDING_COMPLETED_KEY } from './guideData';
import type { GuideStepData, QuickAction } from './guideData';

const { Text, Title } = Typography;

// ==================== 类型定义 ====================

/** OnboardingGuide 组件 Props */
export interface OnboardingGuideProps {
  /** 是否显示引导 */
  visible: boolean;
  /** 完成引导回调 */
  onComplete: () => void;
  /** 跳过引导回调 */
  onSkip: () => void;
}

/** 引导页面状态 */
type GuidePage = 'steps' | 'complete';

// ==================== 图标映射 ====================

/** 图标名称到组件的映射表 */
const ICON_MAP: Record<string, React.ReactNode> = {
  RocketOutlined: <RocketOutlined />,
  FolderOpenOutlined: <FolderOpenOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  PictureOutlined: <PictureOutlined />,
  BgColorsOutlined: <BgColorsOutlined />,
  CodeOutlined: <CodeOutlined />,
  RobotOutlined: <RobotOutlined />,
  MobileOutlined: <MobileOutlined />,
  PlusOutlined: <PlusOutlined />,
};

// ==================== 工具函数 ====================

/**
 * 检查引导是否已完成
 * @returns 是否已完成引导
 */
export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * 标记引导已完成
 */
export function markOnboardingCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch {
    // localStorage 不可用时静默失败
  }
}

/**
 * 重置引导状态（用于测试或重新显示引导）
 */
export function resetOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch {
    // localStorage 不可用时静默失败
  }
}

// ==================== 子组件 ====================

/**
 * 插图占位组件
 * 渐变色块 + 居中图标，作为每步引导的视觉插图
 */
const StepIllustration: React.FC<{
  step: GuideStepData;
}> = ({ step }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '240px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${step.gradientFrom}, ${step.gradientTo})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 装饰性背景圆圈 */}
      <div
        style={{
          position: 'absolute',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          top: '-40px',
          right: '-40px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          bottom: '-30px',
          left: '-30px',
        }}
      />

      {/* 步骤序号 */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          fontSize: '48px',
          fontWeight: 'bold',
          color: 'rgba(255, 255, 255, 0.15)',
          lineHeight: '1',
        }}
      >
        {String(step.step).padStart(2, '0')}
      </div>

      {/* 居中图标 */}
      <div
        style={{
          fontSize: '64px',
          color: 'rgba(255, 255, 255, 0.9)',
          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2))',
        }}
      >
        {ICON_MAP[step.icon] || <RocketOutlined />}
      </div>
    </div>
  );
};

/**
 * 进度指示器组件
 * 圆点样式，当前步骤高亮显示
 */
const ProgressDots: React.FC<{
  total: number;
  current: number;
}> = ({ total, current }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px 0',
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: i === current
              ? '#4a6cf7'
              : i < current
                ? 'rgba(74, 108, 247, 0.4)'
                : 'rgba(255, 255, 255, 0.15)',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
};

/**
 * 完成页组件
 * 显示引导总结和快速操作入口
 */
const CompletePage: React.FC<{
  onComplete: () => void;
  onAction: (actionId: string) => void;
}> = ({ onComplete, onAction }) => {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      {/* 完成图标 */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #52c41a, #73d13d)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}
      >
        <CheckCircleOutlined style={{ fontSize: '40px', color: '#fff' }} />
      </div>

      <Title level={3} style={{ color: '#e0e0e0', marginBottom: '8px' }}>
        引导完成！
      </Title>
      <Text style={{ color: '#a0a0b0', fontSize: '14px', display: 'block', marginBottom: '32px' }}>
        你已经了解了 MIUI Theme Editor 的核心功能，现在开始创建你的专属主题吧！
      </Text>

      {/* 快速操作入口 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '32px',
        }}
      >
        {quickActions.map((action: QuickAction) => (
          <div
            key={action.id}
            onClick={() => onAction(action.id)}
            style={{
              padding: '16px',
              borderRadius: '8px',
              background: '#1a1a2e',
              border: '1px solid #2a2a4a',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#4a6cf7';
              (e.currentTarget as HTMLDivElement).style.background = '#1e1e3a';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#2a2a4a';
              (e.currentTarget as HTMLDivElement).style.background = '#1a1a2e';
            }}
          >
            <div style={{ fontSize: '24px', color: '#4a6cf7', marginBottom: '8px' }}>
              {ICON_MAP[action.icon] || <PlusOutlined />}
            </div>
            <Text strong style={{ color: '#e0e0e0', display: 'block', fontSize: '13px' }}>
              {action.label}
            </Text>
            <Text style={{ color: '#a0a0b0', fontSize: '11px' }}>
              {action.description}
            </Text>
          </div>
        ))}
      </div>

      {/* 开始使用按钮 */}
      <Button
        type="primary"
        size="large"
        onClick={onComplete}
        style={{
          width: '200px',
          height: '44px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #4a6cf7, #6c5ce7)',
          border: 'none',
          fontSize: '15px',
        }}
      >
        开始使用
      </Button>
    </div>
  );
};

// ==================== 主组件 ====================

/**
 * AI 新手引导教程组件
 *
 * 首次启动时显示的交互式引导，帮助用户快速了解编辑器功能。
 * 采用居中 Modal 形式，宽度 640px，暗色主题。
 * 每步左侧为渐变色块插图占位，右侧为文字说明。
 * 底部有进度指示器（圆点）和导航按钮。
 */
const OnboardingGuide: React.FC<OnboardingGuideProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  // -------------------- 状态 --------------------

  /** 当前步骤索引（0-based） */
  const [currentStep, setCurrentStep] = useState(0);

  /** 当前页面状态：步骤引导 / 完成页 */
  const [page, setPage] = useState<GuidePage>('steps');

  // -------------------- 计算属性 --------------------

  /** 当前步骤数据 */
  const currentStepData = useMemo(
    () => guideSteps[currentStep],
    [currentStep]
  );

  /** 是否为第一步 */
  const isFirstStep = currentStep === 0;

  /** 是否为最后一步 */
  const isLastStep = currentStep === guideSteps.length - 1;

  /** 总步骤数 */
  const totalSteps = guideSteps.length;

  /** 进度百分比 */
  const progressPercent = useMemo(
    () => Math.round(((currentStep + 1) / totalSteps) * 100),
    [currentStep, totalSteps]
  );

  // -------------------- 事件处理 --------------------

  /**
   * 下一步
   */
  const handleNext = useCallback(() => {
    if (isLastStep) {
      // 最后一步 -> 显示完成页
      setPage('complete');
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  }, [isLastStep, totalSteps]);

  /**
   * 上一步
   */
  const handlePrev = useCallback(() => {
    if (page === 'complete') {
      // 从完成页返回到最后一步
      setPage('steps');
      setCurrentStep(totalSteps - 1);
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
    }
  }, [page, totalSteps]);

  /**
   * 跳过引导
   */
  const handleSkip = useCallback(() => {
    markOnboardingCompleted();
    onSkip();
  }, [onSkip]);

  /**
   * 完成引导
   */
  const handleComplete = useCallback(() => {
    markOnboardingCompleted();
    onComplete();
  }, [onComplete]);

  /**
   * 完成页快速操作点击
   */
  const handleQuickAction = useCallback(
    (actionId: string) => {
      // 标记引导完成并触发完成回调
      markOnboardingCompleted();
      onComplete();
    },
    [onComplete]
  );

  /**
   * Modal 关闭时的处理（等同跳过）
   */
  const handleModalClose = useCallback(() => {
    handleSkip();
  }, [handleSkip]);

  // -------------------- 重置状态 --------------------

  /** 当 visible 变化时重置步骤 */
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setPage('steps');
    }
  }, [visible]);

  // -------------------- 渲染 --------------------

  return (
    <Modal
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      closable={false}
      centered
      width={640}
      maskClosable={false}
      keyboard={false}
      bodyStyle={{
        padding: '0',
        background: '#0f0f23',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
      style={{ top: 20 }}
      // 覆盖 Modal 默认背景
      styles={{
        mask: {
          background: 'rgba(0, 0, 0, 0.75)',
        },
      }}
    >
      <div
        style={{
          background: '#0f0f23',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {/* ==================== 顶部栏 ==================== */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #2a2a4a',
          }}
        >
          <Space>
            <RocketOutlined style={{ color: '#4a6cf7', fontSize: '16px' }} />
            <Text strong style={{ color: '#e0e0e0', fontSize: '14px' }}>
              {page === 'steps' ? `新手引导 (${currentStep + 1}/${totalSteps})` : '新手引导'}
            </Text>
          </Space>

          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={handleSkip}
            style={{ color: '#a0a0b0' }}
          >
            跳过
          </Button>
        </div>

        {/* ==================== 内容区域 ==================== */}
        <div style={{ padding: '24px' }}>
          {page === 'steps' ? (
            /* ---------- 步骤引导页 ---------- */
            <div
              style={{
                display: 'flex',
                gap: '24px',
                alignItems: 'flex-start',
              }}
            >
              {/* 左侧：插图占位 */}
              <div style={{ flex: '0 0 260px' }}>
                <StepIllustration step={currentStepData} />
              </div>

              {/* 右侧：文字说明 */}
              <div style={{ flex: 1, paddingTop: '8px' }}>
                <Title
                  level={4}
                  style={{
                    color: '#e0e0e0',
                    marginBottom: '16px',
                    marginTop: 0,
                  }}
                >
                  {currentStepData.title}
                </Title>

                {/* 描述文字 */}
                {currentStepData.description.map((line, i) => (
                  <Text
                    key={i}
                    style={{
                      color: '#a0a0b0',
                      fontSize: '13px',
                      lineHeight: '1.8',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    {line}
                  </Text>
                ))}

                {/* 操作提示 */}
                <div
                  style={{
                    marginTop: '16px',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: 'rgba(74, 108, 247, 0.1)',
                    border: '1px solid rgba(74, 108, 247, 0.2)',
                  }}
                >
                  <Text style={{ color: '#4a6cf7', fontSize: '12px' }}>
                    {currentStepData.tip}
                  </Text>
                </div>

                {/* 进度条 */}
                <div style={{ marginTop: '20px' }}>
                  <Progress
                    percent={progressPercent}
                    showInfo={false}
                    strokeColor={{
                      '0%': currentStepData.gradientFrom,
                      '100%': currentStepData.gradientTo,
                    }}
                    trailColor="#2a2a4a"
                    size="small"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ---------- 完成页 ---------- */
            <CompletePage
              onComplete={handleComplete}
              onAction={handleQuickAction}
            />
          )}
        </div>

        {/* ==================== 底部导航 ==================== */}
        <div
          style={{
            padding: '0 24px 20px',
          }}
        >
          {/* 进度指示器（圆点） */}
          {page === 'steps' && (
            <ProgressDots total={totalSteps} current={currentStep} />
          )}

          {/* 导航按钮 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* 左侧：上一步 / 返回 */}
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={handlePrev}
              disabled={page === 'steps' && isFirstStep}
              style={{
                color: page === 'steps' && isFirstStep ? '#3a3a5a' : '#a0a0b0',
                visibility: page === 'steps' && isFirstStep ? 'hidden' : 'visible',
              }}
            >
              {page === 'complete' ? '返回上一步' : '上一步'}
            </Button>

            {/* 右侧：下一步 / 完成 */}
            {page === 'steps' ? (
              <Button
                type="primary"
                icon={<RightOutlined />}
                onClick={handleNext}
                style={{
                  background: `linear-gradient(135deg, ${currentStepData.gradientFrom}, ${currentStepData.gradientTo})`,
                  border: 'none',
                  borderRadius: '6px',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                }}
              >
                {isLastStep ? '完成引导' : '下一步'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OnboardingGuide;
