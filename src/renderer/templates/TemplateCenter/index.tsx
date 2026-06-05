/**
 * MIUI Theme Editor - 主题模板中心
 * 内置模板库和用户模板管理界面
 *
 * 功能：
 * - 模板分类浏览（全部/热门/最新/经典/AI生成）
 * - 模板卡片展示（预览缩略图 + 名称 + 作者 + 下载量 + 标签）
 * - 模板搜索（按名称/标签搜索）
 * - 模板详情弹窗（完整预览 + 描述 + 资源列表）
 * - "使用模板" 按钮（基于模板创建新项目）
 * - "AI 改进" 按钮（基于模板 + 用户描述生成变体）
 * - 用户收藏模板
 * - 用户自定义模板保存/管理
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  Tag,
  Rate,
  Empty,
  Modal,
  Row,
  Col,
  Tabs,
  Tooltip,
  message,
  Badge,
  Popconfirm,
  Dropdown,
  Divider,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  HeartOutlined,
  HeartFilled,
  DownloadOutlined,
  StarOutlined,
  StarFilled,
  ThunderboltOutlined,
  EyeOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  AppstoreOutlined,
  FireOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  RobotOutlined,
  UserOutlined,
  TagOutlined,
  PictureOutlined,
  LockOutlined,
  FontSizeOutlined,
  SoundOutlined,
  SettingOutlined,
  CopyOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { builtInTemplates, searchTemplates } from './builtInTemplates';
import { getUserTemplateManager } from './UserTemplateManager';
import type { ThemeProject } from '../../../shared/types';

const { Text, Title, Paragraph } = Typography;

// ==================== 类型定义 ====================

/** 模板数据 */
export interface Template {
  /** 模板唯一 ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 作者 */
  author: string;
  /** 模板描述 */
  description: string;
  /** 预览缩略图（Base64） */
  preview: string;
  /** 标签 */
  tags: string[];
  /** 下载量 */
  downloads: number;
  /** 评分 */
  rating: number;
  /** 是否为内置模板 */
  isBuiltIn: boolean;
  /** 是否已收藏 */
  isFavorite?: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 完整项目数据 */
  projectData?: ThemeProject;
}

/** 模板中心组件 Props */
export interface TemplateCenterProps {
  /** 选择模板回调 */
  onSelectTemplate: (template: Template) => void;
  /** AI 改进回调（基于模板 + 用户描述生成变体） */
  onAIVariant?: (template: Template, description: string) => void;
}

/** 模板分类 */
type TemplateCategory = 'all' | 'popular' | 'latest' | 'classic' | 'ai-generated';

/** 分类配置 */
interface CategoryConfig {
  key: TemplateCategory;
  label: string;
  icon: React.ReactNode;
}

// ==================== 常量 ====================

/** 分类配置列表 */
const CATEGORIES: CategoryConfig[] = [
  { key: 'all', label: '全部', icon: <AppstoreOutlined /> },
  { key: 'popular', label: '热门', icon: <FireOutlined /> },
  { key: 'latest', label: '最新', icon: <ClockCircleOutlined /> },
  { key: 'classic', label: '经典', icon: <CrownOutlined /> },
  { key: 'ai-generated', label: 'AI 生成', icon: <RobotOutlined /> },
];

// ==================== 工具函数 ====================

/**
 * 格式化下载量
 */
function formatDownloads(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

/**
 * 格式化日期
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * 根据模板 ID 生成默认预览色块
 * 用于没有缩略图的模板
 */
function getPreviewGradient(id: string): string {
  // 根据模板 ID 生成一个稳定的渐变色
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hash * 7) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 60%, 30%), hsl(${hue2}, 50%, 20%))`;
}

// ==================== 组件 ====================

/**
 * 主题模板中心组件
 * 提供模板浏览、搜索、收藏、使用等功能
 */
export const TemplateCenter: React.FC<TemplateCenterProps> = ({
  onSelectTemplate,
  onAIVariant,
}) => {
  // ==================== 状态 ====================

  /** 当前分类 */
  const [category, setCategory] = useState<TemplateCategory>('all');

  /** 搜索关键词 */
  const [searchKeyword, setSearchKeyword] = useState('');

  /** 选中的模板（用于详情弹窗） */
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  /** 详情弹窗是否可见 */
  const [detailVisible, setDetailVisible] = useState(false);

  /** AI 改进弹窗是否可见 */
  const [aiVariantVisible, setAiVariantVisible] = useState(false);

  /** AI 改进描述输入 */
  const [aiVariantDescription, setAiVariantDescription] = useState('');

  /** 收藏的模板 ID 列表 */
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  /** 用户自定义模板 */
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);

  /** 导入文件引用 */
  const importInputRef = useRef<HTMLInputElement>(null);

  // ==================== 初始化 ====================

  useEffect(() => {
    const manager = getUserTemplateManager();
    // 加载收藏
    setFavoriteIds(new Set(manager.getFavoriteIds()));
    // 加载用户模板
    setUserTemplates(manager.getUserTemplates());
  }, []);

  // ==================== 数据处理 ====================

  /**
   * 合并所有模板（内置 + 用户自定义）
   */
  const allTemplates = useMemo(() => {
    const merged = [
      ...builtInTemplates.map((t) => ({
        ...t,
        isFavorite: favoriteIds.has(t.id),
      })),
      ...userTemplates.map((t) => ({
        ...t,
        isFavorite: favoriteIds.has(t.id),
      })),
    ];
    return merged;
  }, [favoriteIds, userTemplates]);

  /**
   * 根据分类和搜索过滤模板
   */
  const filteredTemplates = useMemo(() => {
    let result = allTemplates;

    // 搜索过滤
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(keyword) ||
          t.description.toLowerCase().includes(keyword) ||
          t.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );
    }

    // 分类过滤
    switch (category) {
      case 'popular':
        result = [...result].sort((a, b) => b.downloads - a.downloads);
        break;
      case 'latest':
        result = [...result].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'classic':
        result = result.filter((t) =>
          ['极简深色', '星空夜景', '中国风', '赛博朋克'].includes(t.name)
        );
        break;
      case 'ai-generated':
        result = result.filter((t) => t.tags.includes('AI 生成'));
        break;
      default:
        break;
    }

    return result;
  }, [allTemplates, category, searchKeyword]);

  // ==================== 事件处理 ====================

  /**
   * 切换收藏
   */
  const handleToggleFavorite = useCallback((templateId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const manager = getUserTemplateManager();
    const isFav = manager.toggleFavorite(templateId);
    setFavoriteIds(new Set(manager.getFavoriteIds()));
    message.success(isFav ? '已添加到收藏' : '已取消收藏');
  }, []);

  /**
   * 查看模板详情
   */
  const handleViewDetail = useCallback((template: Template, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedTemplate(template);
    setDetailVisible(true);
  }, []);

  /**
   * 使用模板
   */
  const handleUseTemplate = useCallback((template: Template) => {
    onSelectTemplate(template);
    setDetailVisible(false);
    message.success(`已选择模板 "${template.name}"`);
  }, [onSelectTemplate]);

  /**
   * AI 改进模板
   */
  const handleAIVariant = useCallback((template: Template) => {
    if (!onAIVariant) {
      message.warning('AI 改进功能未启用');
      return;
    }
    setSelectedTemplate(template);
    setAiVariantVisible(true);
    setAiVariantDescription('');
  }, [onAIVariant]);

  /**
   * 确认 AI 改进
   */
  const handleConfirmAIVariant = useCallback(() => {
    if (!aiVariantDescription.trim()) {
      message.warning('请输入改进描述');
      return;
    }
    if (selectedTemplate && onAIVariant) {
      onAIVariant(selectedTemplate, aiVariantDescription.trim());
    }
    setAiVariantVisible(false);
  }, [aiVariantDescription, selectedTemplate, onAIVariant]);

  /**
   * 删除用户模板
   */
  const handleDeleteTemplate = useCallback((templateId: string) => {
    const manager = getUserTemplateManager();
    manager.deleteTemplate(templateId);
    setUserTemplates(manager.getUserTemplates());
    setFavoriteIds(new Set(manager.getFavoriteIds()));
    message.success('模板已删除');
  }, []);

  /**
   * 导出模板
   */
  const handleExportTemplates = useCallback(() => {
    const manager = getUserTemplateManager();
    manager.exportAsFile();
    message.success('模板已导出');
  }, []);

  /**
   * 导入模板
   */
  const handleImportTemplates = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const manager = getUserTemplateManager();
      const count = await manager.importFromFile(file);
      setUserTemplates(manager.getUserTemplates());
      message.success(`成功导入 ${count} 个模板`);
    } catch (error: any) {
      message.error(error.message);
    }

    // 重置 input，允许重复选择同一文件
    if (importInputRef.current) {
      importInputRef.current.value = '';
    }
  }, []);

  // ==================== 渲染子组件 ====================

  /**
   * 渲染模板卡片
   */
  const renderTemplateCard = (template: Template) => {
    const isFav = favoriteIds.has(template.id);

    return (
      <Col key={template.id} xs={24} sm={12} md={8} lg={6}>
        <Card
          hoverable
          style={{
            background: '#16213e',
            border: '1px solid #2a2a4a',
            borderRadius: 8,
            overflow: 'hidden',
            cursor: 'pointer',
            height: '100%',
          }}
          styles={{
            body: {
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            },
          }}
          onClick={() => handleViewDetail(template)}
        >
          {/* 预览缩略图区域 */}
          <div
            style={{
              height: 140,
              background: template.preview
                ? `url(${template.preview}) center/cover`
                : getPreviewGradient(template.id),
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* 收藏按钮 */}
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
              }}
              onClick={(e) => handleToggleFavorite(template.id, e)}
            >
              <Badge
                count={0}
                style={{ display: 'none' }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {isFav ? (
                    <HeartFilled style={{ color: '#ff4d4f', fontSize: 14 }} />
                  ) : (
                    <HeartOutlined style={{ color: '#fff', fontSize: 14 }} />
                  )}
                </div>
              </Badge>
            </div>

            {/* 内置/用户标签 */}
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
              }}
            >
              <Tag
                color={template.isBuiltIn ? 'blue' : 'green'}
                style={{ margin: 0, fontSize: 10, borderRadius: 4 }}
              >
                {template.isBuiltIn ? '内置' : '自定义'}
              </Tag>
            </div>

            {/* 无预览时显示名称 */}
            {!template.preview && (
              <Text
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 16,
                  fontWeight: 500,
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                }}
              >
                {template.name}
              </Text>
            )}
          </div>

          {/* 信息区域 */}
          <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* 名称和评分 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text
                strong
                style={{
                  fontSize: 14,
                  color: '#e0e0e0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '70%',
                }}
              >
                {template.name}
              </Text>
              {template.rating > 0 && (
                <Space size={2} style={{ flexShrink: 0 }}>
                  <StarFilled style={{ color: '#faad14', fontSize: 12 }} />
                  <Text style={{ fontSize: 11, color: '#a0a0b0' }}>{template.rating}</Text>
                </Space>
              )}
            </div>

            {/* 描述 */}
            <Paragraph
              type="secondary"
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: '18px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                flex: 1,
              }}
            >
              {template.description}
            </Paragraph>

            {/* 底部信息 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid #2a2a4a',
              }}
            >
              <Space size={8} style={{ fontSize: 11 }}>
                <Text type="secondary">
                  <DownloadOutlined style={{ marginRight: 2 }} />
                  {formatDownloads(template.downloads)}
                </Text>
                <Text type="secondary">
                  {template.author}
                </Text>
              </Space>

              {/* 标签（最多显示 2 个） */}
              <Space size={2}>
                {template.tags.slice(0, 2).map((tag) => (
                  <Tag
                    key={tag}
                    style={{
                      margin: 0,
                      fontSize: 10,
                      background: '#2a2a4a',
                      color: '#a0a0b0',
                      border: 'none',
                      borderRadius: 3,
                    }}
                  >
                    {tag}
                  </Tag>
                ))}
                {template.tags.length > 2 && (
                  <Tag
                    style={{
                      margin: 0,
                      fontSize: 10,
                      background: '#2a2a4a',
                      color: '#a0a0b0',
                      border: 'none',
                      borderRadius: 3,
                    }}
                  >
                    +{template.tags.length - 2}
                  </Tag>
                )}
              </Space>
            </div>
          </div>
        </Card>
      </Col>
    );
  };

  /**
   * 渲染模板详情弹窗
   */
  const renderDetailModal = () => {
    if (!selectedTemplate) return null;

    const t = selectedTemplate;
    const project = t.projectData;

    return (
      <Modal
        title={
          <Space>
            <AppstoreOutlined style={{ color: '#4a6cf7' }} />
            <span>{t.name}</span>
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={640}
        footer={[
          <Button key="cancel" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
          onAIVariant && (
            <Button
              key="ai-variant"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                setDetailVisible(false);
                handleAIVariant(t);
              }}
            >
              AI 改进
            </Button>
          ),
          <Button
            key="use"
            type="primary"
            icon={<RocketOutlined />}
            onClick={() => handleUseTemplate(t)}
          >
            使用模板
          </Button>,
        ].filter(Boolean)}
      >
        {/* 预览缩略图 */}
        <div
          style={{
            height: 200,
            borderRadius: 8,
            background: t.preview
              ? `url(${t.preview}) center/cover`
              : getPreviewGradient(t.id),
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!t.preview && (
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 24 }}>
              {t.name}
            </Text>
          )}
        </div>

        {/* 基本信息 */}
        <Descriptions
          column={2}
          size="small"
          style={{ marginBottom: 16 }}
          labelStyle={{ color: '#a0a0b0' }}
          contentStyle={{ color: '#e0e0e0' }}
        >
          <Descriptions.Item label="作者">{t.author}</Descriptions.Item>
          <Descriptions.Item label="评分">
            <Space>
              <Rate disabled value={t.rating} allowHalf style={{ fontSize: 12 }} />
              <Text type="secondary">{t.rating}</Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="下载量">{formatDownloads(t.downloads)}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDate(t.createdAt)}</Descriptions.Item>
        </Descriptions>

        {/* 描述 */}
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>描述</Text>
          <Paragraph style={{ color: '#e0e0e0', marginTop: 4 }}>{t.description}</Paragraph>
        </div>

        {/* 标签 */}
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>标签</Text>
          <div style={{ marginTop: 4 }}>
            <Space size={4} wrap>
              {t.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </div>
        </div>

        {/* 资源统计 */}
        {project && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>包含资源</Text>
            <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: 8, background: '#0f0f23', borderRadius: 6 }}>
                  <AppstoreOutlined style={{ fontSize: 18, color: '#4a6cf7', display: 'block', marginBottom: 4 }} />
                  <Text style={{ fontSize: 12 }}>{project.resources.icons.length} 个图标</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: 8, background: '#0f0f23', borderRadius: 6 }}>
                  <PictureOutlined style={{ fontSize: 18, color: '#52c41a', display: 'block', marginBottom: 4 }} />
                  <Text style={{ fontSize: 12 }}>{project.resources.wallpapers.length} 张壁纸</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: 8, background: '#0f0f23', borderRadius: 6 }}>
                  <LockOutlined style={{ fontSize: 18, color: '#faad14', display: 'block', marginBottom: 4 }} />
                  <Text style={{ fontSize: 12 }}>{project.resources.mamlModules.length} 个锁屏</Text>
                </div>
              </Col>
            </Row>
          </div>
        )}

        {/* 收藏按钮 */}
        <div style={{ textAlign: 'center' }}>
          <Button
            type={favoriteIds.has(t.id) ? 'primary' : 'default'}
            danger={favoriteIds.has(t.id)}
            icon={favoriteIds.has(t.id) ? <HeartFilled /> : <HeartOutlined />}
            onClick={() => handleToggleFavorite(t.id)}
          >
            {favoriteIds.has(t.id) ? '已收藏' : '收藏'}
          </Button>
        </div>
      </Modal>
    );
  };

  /**
   * 渲染 AI 改进弹窗
   */
  const renderAIVariantModal = () => (
    <Modal
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#4a6cf7' }} />
          <span>AI 改进模板</span>
        </Space>
      }
      open={aiVariantVisible}
      onCancel={() => setAiVariantVisible(false)}
      onOk={handleConfirmAIVariant}
      okText="开始改进"
      cancelText="取消"
    >
      {selectedTemplate && (
        <>
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">基于模板：</Text>
            <Text strong style={{ marginLeft: 8 }}>{selectedTemplate.name}</Text>
          </div>
          <Input.TextArea
            value={aiVariantDescription}
            onChange={(e) => setAiVariantDescription(e.target.value)}
            placeholder="描述你想要的改进方向，例如：把主色调换成红色，增加更多动画效果..."
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={{
              background: '#0f0f23',
              borderColor: '#2a2a4a',
              borderRadius: 8,
            }}
          />
        </>
      )}
    </Modal>
  );

  // ==================== 主渲染 ====================

  return (
    <div style={{ width: '100%' }}>
      <Card
        title={
          <Space>
            <AppstoreOutlined style={{ color: '#4a6cf7' }} />
            <span>主题模板中心</span>
            <Badge
              count={allTemplates.length}
              style={{ backgroundColor: '#4a6cf7' }}
              overflowCount={99}
            />
          </Space>
        }
        extra={
          <Space>
            {/* 导入按钮 */}
            <Tooltip title="导入模板">
              <Button
                type="text"
                size="small"
                icon={<ImportOutlined />}
                onClick={() => importInputRef.current?.click()}
              />
            </Tooltip>

            {/* 导出按钮 */}
            <Tooltip title="导出自定义模板">
              <Button
                type="text"
                size="small"
                icon={<ExportOutlined />}
                onClick={handleExportTemplates}
                disabled={userTemplates.length === 0}
              />
            </Tooltip>

            {/* 隐藏的文件输入 */}
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportTemplates}
            />
          </Space>
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
            padding: 16,
          },
        }}
      >
        {/* 搜索栏 */}
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索模板名称、标签..."
            prefix={<SearchOutlined style={{ color: '#a0a0b0' }} />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            style={{
              background: '#0f0f23',
              borderColor: '#2a2a4a',
              borderRadius: 8,
            }}
          />
        </div>

        {/* 分类标签 */}
        <div style={{ marginBottom: 16 }}>
          <Space size={4} wrap>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.key}
                type={category === cat.key ? 'primary' : 'text'}
                size="small"
                icon={cat.icon}
                onClick={() => setCategory(cat.key)}
                style={{
                  borderRadius: 16,
                  fontSize: 12,
                }}
              >
                {cat.label}
              </Button>
            ))}
          </Space>
        </div>

        {/* 模板列表 */}
        {filteredTemplates.length === 0 ? (
          <Empty
            description={searchKeyword ? '未找到匹配的模板' : '暂无模板'}
            style={{ padding: '40px 0' }}
          >
            {searchKeyword && (
              <Button type="link" onClick={() => setSearchKeyword('')}>
                清除搜索
              </Button>
            )}
          </Empty>
        ) : (
          <Row gutter={[12, 12]}>
            {filteredTemplates.map(renderTemplateCard)}
          </Row>
        )}
      </Card>

      {/* 模板详情弹窗 */}
      {renderDetailModal()}

      {/* AI 改进弹窗 */}
      {renderAIVariantModal()}
    </div>
  );
};

export default TemplateCenter;
