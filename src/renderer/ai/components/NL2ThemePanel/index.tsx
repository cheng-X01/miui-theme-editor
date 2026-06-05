/**
 * MIUI Theme Editor - NL2Theme 交互面板
 * 用户输入自然语言描述，一键生成主题的交互界面
 *
 * 功能：
 * - 文本输入区域（支持多行描述）
 * - 风格选择（8 种预设风格卡片）
 * - 选项开关（图标/壁纸/锁屏/字体/音效）
 * - 目标 MIUI 版本选择
 * - "开始生成" 按钮
 * - 生成进度展示（Steps 步骤条 + 每步进度条）
 * - 生成结果预览（缩略图 + 基本信息）
 * - "应用到编辑器" 按钮
 * - 生成历史记录
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Select,
  Switch,
  Space,
  Typography,
  Tag,
  Progress,
  message,
  Tooltip,
  Empty,
  Divider,
  Row,
  Col,
  Modal,
  Badge,
  Spin,
} from 'antd';
import {
  RocketOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  HistoryOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  PictureOutlined,
  AppstoreOutlined,
  LockOutlined,
  FontSizeOutlined,
  SoundOutlined,
  BulbOutlined,
  StarFilled,
  ExperimentOutlined,
} from '@ant-design/icons';
import {
  NL2ThemeEngine,
  getNL2ThemeEngine,
  THEME_STYLE_LABELS,
  MIUI_VERSIONS,
} from '../../core/NL2ThemeEngine';
import type {
  ThemeGenerationRequest,
  ThemeStyle,
  GenerationStep,
  ThemeGenerationResult,
} from '../../core/NL2ThemeEngine';
import type { ThemeProject } from '../../../../shared/types';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

// ==================== 类型定义 ====================

/** NL2ThemePanel 组件 Props */
export interface NL2ThemePanelProps {
  /** 生成完成后的回调 */
  onGenerated?: (project: ThemeProject) => void;
  /** 是否为紧凑模式（嵌入其他面板时使用） */
  compact?: boolean;
}

/** 生成历史记录项 */
interface GenerationHistoryItem {
  /** 唯一标识 */
  id: string;
  /** 用户描述 */
  description: string;
  /** 风格 */
  style: ThemeStyle;
  /** 生成时间 */
  timestamp: number;
  /** 生成结果 */
  result?: ThemeGenerationResult;
}

/** 风格卡片配置 */
interface StyleCard {
  style: ThemeStyle;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

// ==================== 常量 ====================

/** localStorage 历史记录键名 */
const HISTORY_STORAGE_KEY = 'miui-theme-editor-nl2-history';

/** 最大历史记录数量 */
const MAX_HISTORY = 20;

/** 风格卡片配置列表 */
const STYLE_CARDS: StyleCard[] = [
  { style: 'minimal', label: '极简', icon: <MinusCircleOutlined />, color: '#607d8b', description: '简洁干净' },
  { style: 'vibrant', label: '活力', icon: <ThunderboltOutlined />, color: '#ff6b6b', description: '色彩鲜明' },
  { style: 'dark', label: '暗色', icon: <BulbOutlined />, color: '#1a1a2e', description: '深色护眼' },
  { style: 'light', label: '浅色', icon: <StarFilled />, color: '#f5f5f5', description: '明亮清新' },
  { style: 'gradient', label: '渐变', icon: <ExperimentOutlined />, color: '#6c5ce7', description: '色彩过渡' },
  { style: 'retro', label: '复古', icon: <ClockCircleOutlined />, color: '#d4a574', description: '怀旧经典' },
  { style: 'neon', label: '霓虹', icon: <ThunderboltOutlined />, color: '#00ffff', description: '科技未来' },
  { style: 'nature', label: '自然', icon: <PictureOutlined />, color: '#2e7d32', description: '清新自然' },
];

// ==================== 工具函数 ====================

/**
 * 加载历史记录
 */
function loadHistory(): GenerationHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw).slice(0, MAX_HISTORY);
    }
  } catch (error) {
    console.error('[NL2ThemePanel] 加载历史失败:', error);
  }
  return [];
}

/**
 * 保存历史记录
 */
function saveHistory(history: GenerationHistoryItem[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch (error) {
    console.error('[NL2ThemePanel] 保存历史失败:', error);
  }
}

/**
 * 格式化耗时
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// ==================== 组件 ====================

/**
 * NL2Theme 交互面板组件
 * 提供自然语言输入、风格选择、生成进度展示等功能
 */
export const NL2ThemePanel: React.FC<NL2ThemePanelProps> = ({
  onGenerated,
  compact = false,
}) => {
  // ==================== 状态 ====================

  /** 用户描述文本 */
  const [description, setDescription] = useState('');

  /** 选中的风格 */
  const [selectedStyle, setSelectedStyle] = useState<ThemeStyle>('dark');

  /** 目标 MIUI 版本 */
  const [miuiVersion, setMiuiVersion] = useState('V14');

  /** 是否包含图标 */
  const [includeIcons, setIncludeIcons] = useState(true);

  /** 是否包含壁纸 */
  const [includeWallpaper, setIncludeWallpaper] = useState(true);

  /** 是否包含锁屏 */
  const [includeLockscreen, setIncludeLockscreen] = useState(true);

  /** 是否包含字体 */
  const [includeFont, setIncludeFont] = useState(false);

  /** 是否包含音效 */
  const [includeSounds, setIncludeSounds] = useState(false);

  /** 是否正在生成 */
  const [isGenerating, setIsGenerating] = useState(false);

  /** 生成步骤状态 */
  const [steps, setSteps] = useState<GenerationStep[]>([]);

  /** 生成结果 */
  const [generationResult, setGenerationResult] = useState<ThemeGenerationResult | null>(null);

  /** 生成历史 */
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);

  /** 显示历史面板 */
  const [showHistory, setShowHistory] = useState(false);

  // 引用
  const engineRef = useRef<NL2ThemeEngine | null>(null);

  // ==================== 初始化 ====================

  useEffect(() => {
    // 加载历史记录
    setHistory(loadHistory());
    // 初始化引擎
    engineRef.current = getNL2ThemeEngine();
  }, []);

  // ==================== 事件处理 ====================

  /**
   * 开始生成主题
   */
  const handleGenerate = useCallback(async () => {
    if (!description.trim()) {
      message.warning('请输入主题描述');
      return;
    }

    if (isGenerating) return;

    setIsGenerating(true);
    setGenerationResult(null);
    setSteps([]);

    const engine = engineRef.current || getNL2ThemeEngine();

    const request: ThemeGenerationRequest = {
      description: description.trim(),
      style: selectedStyle,
      targetMIUIVersion: miuiVersion,
      includeIcons,
      includeWallpaper,
      includeLockscreen,
      includeFont,
      includeSounds,
    };

    try {
      const result = await engine.generate(request, (updatedSteps: GenerationStep[]) => {
        setSteps([...updatedSteps]);
      });

      setGenerationResult(result);

      // 添加到历史记录
      const historyItem: GenerationHistoryItem = {
        id: `history-${Date.now()}`,
        description: description.trim(),
        style: selectedStyle,
        timestamp: Date.now(),
        result,
      };

      setHistory((prev) => {
        const newHistory = [historyItem, ...prev].slice(0, MAX_HISTORY);
        saveHistory(newHistory);
        return newHistory;
      });

      message.success(`主题 "${result.project.name}" 生成成功！耗时 ${formatDuration(result.totalDuration)}`);
    } catch (error: any) {
      message.error(`生成失败: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [
    description,
    selectedStyle,
    miuiVersion,
    includeIcons,
    includeWallpaper,
    includeLockscreen,
    includeFont,
    includeSounds,
    isGenerating,
  ]);

  /**
   * 应用到编辑器
   */
  const handleApplyToEditor = useCallback(() => {
    if (generationResult && onGenerated) {
      onGenerated(generationResult.project);
      message.success('主题已应用到编辑器');
    }
  }, [generationResult, onGenerated]);

  /**
   * 使用历史记录重新生成
   */
  const handleUseHistory = useCallback((item: GenerationHistoryItem) => {
    setDescription(item.description);
    setSelectedStyle(item.style);
    setShowHistory(false);
  }, []);

  /**
   * 删除历史记录
   */
  const handleDeleteHistory = useCallback((id: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter((item) => item.id !== id);
      saveHistory(newHistory);
      return newHistory;
    });
  }, []);

  /**
   * 清空历史记录
   */
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
    message.success('历史记录已清空');
  }, []);

  // ==================== 渲染子组件 ====================

  /**
   * 渲染步骤状态图标
   */
  const renderStepIcon = (step: GenerationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'running':
        return <LoadingOutlined style={{ color: '#4a6cf7' }} spin />;
      case 'skipped':
        return <MinusCircleOutlined style={{ color: '#8c8c8c' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  /**
   * 渲染风格选择卡片
   */
  const renderStyleCards = () => (
    <div style={{ marginBottom: 16 }}>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
        风格选择：
      </Text>
      <Row gutter={[8, 8]}>
        {STYLE_CARDS.map((card) => {
          const isSelected = selectedStyle === card.style;
          return (
            <Col key={card.style} span={6}>
              <div
                onClick={() => setSelectedStyle(card.style)}
                style={{
                  padding: '10px 8px',
                  borderRadius: 8,
                  border: `2px solid ${isSelected ? card.color : 'transparent'}`,
                  background: isSelected ? `${card.color}22` : '#1a1a2e',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  opacity: isSelected ? 1 : 0.7,
                }}
              >
                <div style={{ fontSize: 20, color: card.color, marginBottom: 4 }}>
                  {card.icon}
                </div>
                <div style={{ fontSize: 12, color: isSelected ? card.color : '#a0a0b0' }}>
                  {card.label}
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );

  /**
   * 渲染选项开关
   */
  const renderOptions = () => (
    <div style={{ marginBottom: 16 }}>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
        包含内容：
      </Text>
      <Row gutter={[16, 8]}>
        <Col span={8}>
          <Space>
            <AppstoreOutlined style={{ color: '#4a6cf7' }} />
            <Text>图标</Text>
            <Switch size="small" checked={includeIcons} onChange={setIncludeIcons} />
          </Space>
        </Col>
        <Col span={8}>
          <Space>
            <PictureOutlined style={{ color: '#52c41a' }} />
            <Text>壁纸</Text>
            <Switch size="small" checked={includeWallpaper} onChange={setIncludeWallpaper} />
          </Space>
        </Col>
        <Col span={8}>
          <Space>
            <LockOutlined style={{ color: '#faad14' }} />
            <Text>锁屏</Text>
            <Switch size="small" checked={includeLockscreen} onChange={setIncludeLockscreen} />
          </Space>
        </Col>
        <Col span={8}>
          <Space>
            <FontSizeOutlined style={{ color: '#7c4dff' }} />
            <Text>字体</Text>
            <Switch size="small" checked={includeFont} onChange={setIncludeFont} />
          </Space>
        </Col>
        <Col span={8}>
          <Space>
            <SoundOutlined style={{ color: '#ff6b6b' }} />
            <Text>音效</Text>
            <Switch size="small" checked={includeSounds} onChange={setIncludeSounds} />
          </Space>
        </Col>
      </Row>
    </div>
  );

  /**
   * 渲染生成进度
   */
  const renderProgress = () => {
    if (steps.length === 0) return null;

    return (
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
          生成进度：
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((step, index) => (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 6,
                background: step.status === 'running' ? '#1a237e22' : 'transparent',
                border: step.status === 'running' ? '1px solid #4a6cf744' : '1px solid transparent',
              }}
            >
              {/* 序号 */}
              <Text
                style={{
                  fontSize: 11,
                  color: step.status === 'pending' ? '#555' : '#a0a0b0',
                  minWidth: 16,
                }}
              >
                {index + 1}.
              </Text>

              {/* 状态图标 */}
              {renderStepIcon(step)}

              {/* 步骤名称 */}
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: step.status === 'pending' ? '#555' : '#e0e0e0',
                }}
              >
                {step.name}
              </Text>

              {/* 进度条（运行中时显示） */}
              {step.status === 'running' && (
                <Progress
                  percent={step.progress}
                  size="small"
                  strokeColor="#4a6cf7"
                  style={{ width: 100, margin: 0 }}
                  showInfo={false}
                />
              )}

              {/* 状态标签 */}
              {step.status === 'completed' && (
                <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
                  完成
                </Tag>
              )}
              {step.status === 'failed' && (
                <Tooltip title={step.message}>
                  <Tag color="error" style={{ margin: 0, fontSize: 11 }}>
                    失败
                  </Tag>
                </Tooltip>
              )}
              {step.status === 'skipped' && (
                <Tag style={{ margin: 0, fontSize: 11, background: '#333', color: '#888', border: 'none' }}>
                  跳过
                </Tag>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * 渲染生成结果预览
   */
  const renderResult = () => {
    if (!generationResult) return null;

    const { project, totalDuration, tokensUsed } = generationResult;

    return (
      <div
        style={{
          marginBottom: 16,
          padding: 16,
          borderRadius: 8,
          background: '#16213e',
          border: '1px solid #2a2a4a',
        }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
          生成结果：
        </Text>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* 缩略图占位 */}
          <div
            style={{
              width: 80,
              height: 140,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${project.resources.statusbar.bgColor || '#1a1a2e'}, ${project.description.category === '极简' ? '#333' : '#2a2a4a'})`,
              border: '1px solid #2a2a4a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Text type="secondary" style={{ fontSize: 11, textAlign: 'center' }}>
              预览
            </Text>
          </div>

          {/* 基本信息 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Title level={5} style={{ margin: '0 0 4px 0', color: '#e0e0e0' }}>
              {project.name}
            </Title>
            <Paragraph
              type="secondary"
              style={{ margin: '0 0 8px 0', fontSize: 12 }}
              ellipsis={{ rows: 2 }}
            >
              {project.description.description}
            </Paragraph>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {project.description.tags?.map((tag: string) => (
                <Tag key={tag} style={{ margin: 0, fontSize: 11 }}>
                  {tag}
                </Tag>
              ))}
            </div>

            <Space size={16} style={{ fontSize: 12 }}>
              <Text type="secondary">
                耗时: {formatDuration(totalDuration)}
              </Text>
              {tokensUsed && (
                <Text type="secondary">
                  Token: {tokensUsed.toLocaleString()}
                </Text>
              )}
              <Text type="secondary">
                图标: {project.resources.icons.length}
              </Text>
              <Text type="secondary">
                壁纸: {project.resources.wallpapers.length}
              </Text>
              <Text type="secondary">
                锁屏: {project.resources.mamlModules.length}
              </Text>
            </Space>
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <Button
            type="primary"
            icon={<RocketOutlined />}
            onClick={handleApplyToEditor}
            disabled={!onGenerated}
          >
            应用到编辑器
          </Button>
        </div>
      </div>
    );
  };

  /**
   * 渲染历史记录面板
   */
  const renderHistoryPanel = () => (
    <Modal
      title="生成历史"
      open={showHistory}
      onCancel={() => setShowHistory(false)}
      footer={[
        <Button key="clear" danger onClick={handleClearHistory} disabled={history.length === 0}>
          清空历史
        </Button>,
        <Button key="close" onClick={() => setShowHistory(false)}>
          关闭
        </Button>,
      ]}
      width={600}
    >
      {history.length === 0 ? (
        <Empty description="暂无生成历史" />
      ) : (
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {history.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: '#16213e',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {/* 风格标签 */}
              <Tag color="blue" style={{ margin: 0, flexShrink: 0 }}>
                {THEME_STYLE_LABELS[item.style]}
              </Tag>

              {/* 描述 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{ fontSize: 13 }}
                  ellipsis
                >
                  {item.description}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(item.timestamp).toLocaleString()}
                  {item.result && ` | 耗时 ${formatDuration(item.result.totalDuration)}`}
                </Text>
              </div>

              {/* 操作按钮 */}
              <Space size={4}>
                <Tooltip title="使用此描述">
                  <Button
                    type="text"
                    size="small"
                    icon={<RocketOutlined />}
                    onClick={() => handleUseHistory(item)}
                  />
                </Tooltip>
                <Tooltip title="删除">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteHistory(item.id)}
                  />
                </Tooltip>
              </Space>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );

  // ==================== 主渲染 ====================

  return (
    <div style={{ width: '100%' }}>
      <Card
        title={
          <Space>
            <RocketOutlined style={{ color: '#4a6cf7' }} />
            <span>AI 一键主题生成</span>
          </Space>
        }
        extra={
          <Tooltip title="生成历史">
            <Badge count={history.length} size="small" offset={[-4, 4]}>
              <Button
                type="text"
                size="small"
                icon={<HistoryOutlined />}
                onClick={() => setShowHistory(true)}
              />
            </Badge>
          </Tooltip>
        }
        style={{
          background: '#16213e',
          border: '1px solid #2a2a4a',
          borderRadius: 8,
        }}
        styles={{
          header: {
            borderBottom: '1px solid #2a2a4a',
            minHeight: 48,
          },
          body: {
            padding: compact ? 12 : 16,
          },
        }}
      >
        {/* 描述输入 */}
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
            描述你的理想主题：
          </Text>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例如：一个深色极简风格的主题，主色调为深蓝色，壁纸是星空夜景，锁屏显示简约时钟..."
            autoSize={{ minRows: 3, maxRows: 6 }}
            disabled={isGenerating}
            style={{
              background: '#0f0f23',
              borderColor: '#2a2a4a',
              borderRadius: 8,
            }}
          />
        </div>

        {/* 风格选择 */}
        {renderStyleCards()}

        {/* 选项开关 */}
        {renderOptions()}

        {/* MIUI 版本选择 */}
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
            MIUI 版本：
          </Text>
          <Select
            value={miuiVersion}
            onChange={setMiuiVersion}
            disabled={isGenerating}
            style={{ width: 120 }}
            options={MIUI_VERSIONS.map((v: string) => ({ label: v, value: v }))}
          />
        </div>

        {/* 生成按钮 */}
        <Button
          type="primary"
          icon={isGenerating ? <LoadingOutlined spin /> : <RocketOutlined />}
          onClick={handleGenerate}
          disabled={isGenerating || !description.trim()}
          loading={isGenerating}
          block
          size="large"
          style={{
            background: isGenerating ? undefined : 'linear-gradient(135deg, #4a6cf7, #6c5ce7)',
            border: 'none',
            height: 44,
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          {isGenerating ? '正在生成...' : '开始生成'}
        </Button>

        {/* 生成进度 */}
        {renderProgress()}

        {/* 生成结果 */}
        {renderResult()}
      </Card>

      {/* 历史记录弹窗 */}
      {renderHistoryPanel()}
    </div>
  );
};

export default NL2ThemePanel;
