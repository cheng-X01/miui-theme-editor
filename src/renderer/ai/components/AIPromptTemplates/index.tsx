/**
 * MIUI Theme Editor - AI 提示词模板管理组件
 * 预置提示词模板列表（按场景分类），支持用户自定义模板
 * 点击模板自动填充到 AI 对话输入框
 * 使用 Ant Design 组件，暗色主题风格
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Tooltip,
  Empty,
  Tabs,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  ThunderboltOutlined,
  CodeOutlined,
  BgColorsOutlined,
  FileImageOutlined,
  SafetyOutlined,
  CommentOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

// ==================== 样式常量 ====================

/** 暗色主题配色 */
const DARK_THEME = {
  background: '#141414',
  cardBackground: '#1f1f1f',
  borderColor: '#434343',
  textColor: '#e0e0e0',
  secondaryText: '#a0a0a0',
  activeItem: '#177ddc',
  hoverItem: '#2c2c2c',
  successColor: '#52c41a',
  errorColor: '#ff4d4f',
};

// ==================== 类型定义 ====================

/** 提示词模板分类 */
export type PromptCategory = 'maml' | 'icon' | 'color' | 'explain' | 'check' | 'custom';

/** 提示词模板 */
export interface PromptTemplate {
  /** 唯一标识 */
  id: string;
  /** 模板名称 */
  name: string;
  /** 分类 */
  category: PromptCategory;
  /** 提示词内容 */
  prompt: string;
  /** 描述 */
  description: string;
  /** 是否预置（不可删除） */
  isBuiltin: boolean;
}

/** 模板选择回调 */
export type OnTemplateSelect = (prompt: string) => void;

// ==================== 预置模板 ====================

/** 预置提示词模板列表 */
const BUILTIN_TEMPLATES: PromptTemplate[] = [
  {
    id: 'builtin-maml-clock',
    name: '生成锁屏时钟组件',
    category: 'maml',
    prompt:
      '请生成一个显示当前时间的 MIUI MAML 锁屏组件代码。要求：\n1. 显示时、分、秒\n2. 支持 12/24 小时制切换\n3. 美观的数字字体样式\n4. 添加中文注释说明',
    description: '生成一个功能完整的锁屏时钟 MAML 组件',
    isBuiltin: true,
  },
  {
    id: 'builtin-maml-weather',
    name: '生成天气动画组件',
    category: 'maml',
    prompt:
      '请生成一个 MIUI MAML 天气动画组件代码。要求：\n1. 支持晴、雨、雪、多云等天气状态\n2. 每种天气有对应的动画效果\n3. 使用变量控制天气状态切换\n4. 代码结构清晰，添加中文注释',
    description: '生成带动画效果的天气展示 MAML 组件',
    isBuiltin: true,
  },
  {
    id: 'builtin-icon-flat',
    name: '扁平风格系统图标',
    category: 'icon',
    prompt:
      '请为 MIUI 主题设计一套扁平风格的系统图标，包含以下应用：设置、相机、相册、电话、信息、浏览器、音乐、日历。\n要求：\n1. 统一的视觉风格和配色\n2. 简洁现代的扁平设计\n3. 适合深色和浅色壁纸\n4. 提供每个图标的设计说明和配色方案',
    description: '设计一套现代扁平风格的系统图标',
    isBuiltin: true,
  },
  {
    id: 'builtin-icon-gradient',
    name: '渐变风格应用图标',
    category: 'icon',
    prompt:
      '请为 MIUI 主题设计一套渐变风格的第三方应用图标，包含：微信、支付宝、抖音、淘宝、B站。\n要求：\n1. 使用现代渐变配色\n2. 保持品牌辨识度\n3. 统一的圆角和阴影风格\n4. 提供详细的配色值（HEX/RGB）',
    description: '设计渐变风格的第三方应用图标',
    isBuiltin: true,
  },
  {
    id: 'builtin-color-dark',
    name: '深色主题配色方案',
    category: 'color',
    prompt:
      '请为 MIUI 深色主题生成一套完整的配色方案。\n要求：\n1. 主色调、强调色、背景色、文字色\n2. 符合 WCAG 对比度标准\n3. 提供所有颜色的 HEX 和 RGB 值\n4. 说明每种颜色的使用场景\n5. 考虑 OLED 屏幕的纯黑显示优化',
    description: '生成一套完整的深色主题配色方案',
    isBuiltin: true,
  },
  {
    id: 'builtin-color-light',
    name: '浅色清新配色方案',
    category: 'color',
    prompt:
      '请为 MIUI 浅色主题生成一套清新风格的配色方案。\n要求：\n1. 主色调适合年轻用户群体\n2. 柔和的背景色和清晰的文字色\n3. 提供所有颜色的 HEX 和 RGB 值\n4. 包含渐变色推荐\n5. 说明配色的心理学依据',
    description: '生成一套清新浅色主题配色方案',
    isBuiltin: true,
  },
  {
    id: 'builtin-explain-maml',
    name: '解释 MAML 代码',
    category: 'explain',
    prompt:
      '请解释以下 MIUI MAML 代码的功能和实现原理：\n\n```xml\n[在此处粘贴 MAML 代码]\n```\n\n请用中文详细说明：\n1. 代码的整体功能\n2. 关键变量和参数的含义\n3. 动画逻辑的执行流程\n4. 可能的优化建议',
    description: '详细解释 MAML 代码的工作原理',
    isBuiltin: true,
  },
  {
    id: 'builtin-explain-animation',
    name: '解释动画逻辑',
    category: 'explain',
    prompt:
      '请分析以下 MAML 动画代码的执行逻辑：\n\n```xml\n[在此处粘贴动画代码]\n```\n\n请说明：\n1. 动画的触发条件\n2. 动画的时序和缓动函数\n3. 变量如何影响动画表现\n4. 性能优化建议',
    description: '分析 MAML 动画的执行逻辑',
    isBuiltin: true,
  },
  {
    id: 'builtin-check-design',
    name: '检查主题设计问题',
    category: 'check',
    prompt:
      '请检查以下 MIUI 主题设计方案，找出潜在问题：\n\n[在此处描述你的主题设计]\n\n请从以下维度评估：\n1. 视觉一致性（图标风格、配色是否统一）\n2. 用户体验（对比度、可读性、操作便捷性）\n3. MIUI 设计规范兼容性\n4. 性能影响（资源大小、动画复杂度）\n5. 改进建议和优化方案',
    description: '全面检查主题设计的潜在问题',
    isBuiltin: true,
  },
  {
    id: 'builtin-check-accessibility',
    name: '无障碍设计检查',
    category: 'check',
    prompt:
      '请评估以下 MIUI 主题的无障碍设计水平：\n\n[在此处描述主题设计]\n\n请检查：\n1. 颜色对比度是否符合 WCAG 标准\n2. 文字大小是否可读\n3. 交互元素是否易于辨识\n4. 对色盲用户的友好程度\n5. 改进建议',
    description: '评估主题的无障碍设计水平',
    isBuiltin: true,
  },
];

/** 分类显示配置 */
const CATEGORY_CONFIG: Record<
  PromptCategory,
  { label: string; icon: React.ReactNode; color: string }
> = {
  maml: { label: 'MAML 生成', icon: <CodeOutlined />, color: 'cyan' },
  icon: { label: '图标设计', icon: <FileImageOutlined />, color: 'purple' },
  color: { label: '配色方案', icon: <BgColorsOutlined />, color: 'green' },
  explain: { label: '代码解释', icon: <CommentOutlined />, color: 'blue' },
  check: { label: '设计检查', icon: <SafetyOutlined />, color: 'orange' },
  custom: { label: '自定义', icon: <ThunderboltOutlined />, color: 'default' },
};

/** localStorage 键名 */
const STORAGE_KEY = 'miui-theme-editor-ai-prompt-templates';

// ==================== 工具函数 ====================

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 从 localStorage 加载自定义模板
 */
function loadCustomTemplates(): PromptTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error('[AIPromptTemplates] 加载自定义模板失败:', error);
  }
  return [];
}

/**
 * 保存自定义模板到 localStorage
 */
function saveCustomTemplates(templates: PromptTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('[AIPromptTemplates] 保存自定义模板失败:', error);
  }
}

// ==================== 组件 ====================

interface AIPromptTemplatesProps {
  /** 点击模板时的回调 */
  onSelect?: OnTemplateSelect;
  /** 是否显示分类标签页 */
  showTabs?: boolean;
}

/**
 * AI 提示词模板管理组件
 * 展示预置和用户自定义的提示词模板，支持添加/编辑/删除
 */
export const AIPromptTemplates: React.FC<AIPromptTemplatesProps> = ({
  onSelect,
  showTabs = true,
}) => {
  // 状态
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [form] = Form.useForm();
  const [activeCategory, setActiveCategory] = useState<PromptCategory | 'all'>('all');

  // 初始化加载
  useEffect(() => {
    setTemplates(BUILTIN_TEMPLATES);
    setCustomTemplates(loadCustomTemplates());
  }, []);

  // 保存自定义模板变更
  useEffect(() => {
    saveCustomTemplates(customTemplates);
  }, [customTemplates]);

  /**
   * 获取所有模板（预置 + 自定义）
   */
  const allTemplates = [...templates, ...customTemplates];

  /**
   * 根据分类筛选模板
   */
  const filteredTemplates =
    activeCategory === 'all'
      ? allTemplates
      : allTemplates.filter((t) => t.category === activeCategory);

  /**
   * 处理模板点击
   */
  const handleSelect = (template: PromptTemplate) => {
    if (onSelect) {
      onSelect(template.prompt);
      message.success(`已选择模板: ${template.name}`);
    }
  };

  /**
   * 打开添加模板弹窗
   */
  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({ category: 'custom' });
    setIsModalVisible(true);
  };

  /**
   * 打开编辑模板弹窗
   */
  const handleEdit = (template: PromptTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (template.isBuiltin) {
      message.warning('预置模板不能编辑，您可以复制后创建自定义版本');
      return;
    }
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      category: template.category,
      prompt: template.prompt,
      description: template.description,
    });
    setIsModalVisible(true);
  };

  /**
   * 删除自定义模板
   */
  const handleDelete = (template: PromptTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (template.isBuiltin) {
      message.warning('预置模板不能删除');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除模板 "${template.name}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setCustomTemplates((prev) => prev.filter((t) => t.id !== template.id));
        message.success('模板已删除');
      },
    });
  };

  /**
   * 复制模板并创建自定义版本
   */
  const handleDuplicate = (template: PromptTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTemplate: PromptTemplate = {
      ...template,
      id: generateId(),
      name: `${template.name} (副本)`,
      isBuiltin: false,
      category: 'custom',
    };
    setCustomTemplates((prev) => [...prev, newTemplate]);
    message.success('已复制为自定义模板');
  };

  /**
   * 保存模板
   */
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (editingTemplate) {
        // 更新现有模板
        setCustomTemplates((prev) =>
          prev.map((t) =>
            t.id === editingTemplate.id
              ? { ...t, ...values }
              : t
          )
        );
        message.success('模板已更新');
      } else {
        // 创建新模板
        const newTemplate: PromptTemplate = {
          id: generateId(),
          ...values,
          isBuiltin: false,
        };
        setCustomTemplates((prev) => [...prev, newTemplate]);
        message.success('模板已创建');
      }

      setIsModalVisible(false);
    } catch (error) {
      console.error('保存模板失败:', error);
    }
  };

  /**
   * 渲染模板卡片
   */
  const renderTemplateCard = (template: PromptTemplate) => {
    const categoryConfig = CATEGORY_CONFIG[template.category];

    return (
      <Card
        key={template.id}
        hoverable
        size="small"
        onClick={() => handleSelect(template)}
        style={{
          background: DARK_THEME.cardBackground,
          borderColor: DARK_THEME.borderColor,
          marginBottom: 12,
          cursor: 'pointer',
        }}
        bodyStyle={{ padding: '16px' }}
        actions={[
          <Tooltip title="使用此模板">
            <ThunderboltOutlined
              key="use"
              style={{ color: DARK_THEME.activeItem }}
            />
          </Tooltip>,
          <Tooltip title="复制为自定义模板">
            <CopyOutlined
              key="copy"
              onClick={(e: any) => handleDuplicate(template, e)}
            />
          </Tooltip>,
          <Tooltip title={template.isBuiltin ? '预置模板不可编辑' : '编辑'}>
            <EditOutlined
              key="edit"
              style={{ color: template.isBuiltin ? DARK_THEME.secondaryText : undefined }}
              onClick={(e: any) => handleEdit(template, e)}
            />
          </Tooltip>,
          <Tooltip title={template.isBuiltin ? '预置模板不可删除' : '删除'}>
            <DeleteOutlined
              key="delete"
              style={{ color: template.isBuiltin ? DARK_THEME.secondaryText : DARK_THEME.errorColor }}
              onClick={(e: any) => handleDelete(template, e)}
            />
          </Tooltip>,
        ]}
      >
        <Card.Meta
          title={
            <Space>
              <Text style={{ color: DARK_THEME.textColor, fontWeight: 500 }}>
                {template.name}
              </Text>
              <Tag color={categoryConfig.color} style={{ fontSize: 10 }}>
                {categoryConfig.label}
              </Tag>
              {template.isBuiltin && (
                <Tag style={{ fontSize: 10 }}>预置</Tag>
              )}
            </Space>
          }
          description={
            <div>
              <Paragraph
                style={{ color: DARK_THEME.secondaryText, fontSize: 13, marginTop: 8 }}
                ellipsis={{ rows: 2 }}
              >
                {template.description}
              </Paragraph>
              <Paragraph
                style={{
                  color: DARK_THEME.secondaryText,
                  fontSize: 12,
                  marginTop: 8,
                  background: DARK_THEME.background,
                  padding: '8px 12px',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                }}
                ellipsis={{ rows: 2 }}
              >
                {template.prompt}
              </Paragraph>
            </div>
          }
        />
      </Card>
    );
  };

  /**
   * 渲染分类标签页内容
   */
  const renderCategoryContent = (category: PromptCategory | 'all') => {
    const items =
      category === 'all'
        ? allTemplates
        : allTemplates.filter((t) => t.category === category);

    if (items.length === 0) {
      return (
        <Empty
          description="暂无模板"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ color: DARK_THEME.secondaryText }}
        />
      );
    }

    return (
      <List
        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
        dataSource={items}
        renderItem={(item) => <List.Item>{renderTemplateCard(item)}</List.Item>}
      />
    );
  };

  return (
    <div
      style={{
        background: DARK_THEME.background,
        color: DARK_THEME.textColor,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${DARK_THEME.borderColor}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Title level={5} style={{ color: DARK_THEME.textColor, margin: 0 }}>
          <ThunderboltOutlined style={{ marginRight: 8 }} />
          提示词模板
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          style={{ background: DARK_THEME.activeItem }}
        >
          添加模板
        </Button>
      </div>

      {/* 模板列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {showTabs ? (
          <Tabs
            activeKey={activeCategory}
            onChange={(key) => setActiveCategory(key as PromptCategory | 'all')}
            type="card"
            style={{ color: DARK_THEME.textColor }}
          >
            <TabPane
              tab={
                <span>
                  <ThunderboltOutlined />
                  全部
                </span>
              }
              key="all"
            >
              {renderCategoryContent('all')}
            </TabPane>
            {(Object.keys(CATEGORY_CONFIG) as PromptCategory[])
              .filter((c) => c !== 'custom')
              .map((category) => (
                <TabPane
                  tab={
                    <span>
                      {CATEGORY_CONFIG[category].icon}
                      {CATEGORY_CONFIG[category].label}
                    </span>
                  }
                  key={category}
                >
                  {renderCategoryContent(category)}
                </TabPane>
              ))}
            <TabPane
              tab={
                <span>
                  <ThunderboltOutlined />
                  自定义
                </span>
              }
              key="custom"
            >
              {renderCategoryContent('custom')}
            </TabPane>
          </Tabs>
        ) : (
          renderCategoryContent('all')
        )}
      </div>

      {/* 添加/编辑模板弹窗 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '添加自定义模板'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
        bodyStyle={{ background: DARK_THEME.cardBackground }}
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ category: 'custom' }}
        >
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="例如: 生成锁屏组件" />
          </Form.Item>

          <Form.Item
            label="分类"
            name="category"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="选择分类">
              <Option value="maml">MAML 生成</Option>
              <Option value="icon">图标设计</Option>
              <Option value="color">配色方案</Option>
              <Option value="explain">代码解释</Option>
              <Option value="check">设计检查</Option>
              <Option value="custom">自定义</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <Input placeholder="简短描述此模板的用途" />
          </Form.Item>

          <Form.Item
            label="提示词内容"
            name="prompt"
            rules={[{ required: true, message: '请输入提示词内容' }]}
          >
            <TextArea
              rows={8}
              placeholder="输入 AI 提示词内容..."
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AIPromptTemplates;
