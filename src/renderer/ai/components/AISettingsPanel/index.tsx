/**
 * MIUI Theme Editor - AI 设置面板组件
 * 左侧 Provider 列表管理，右侧配置表单编辑
 * 使用 Ant Design 组件，暗色主题风格
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Form,
  Input,
  Select,
  Slider,
  Button,
  Card,
  List,
  Tag,
  message,
  Modal,
  Space,
  Tooltip,
  Row,
  Col,
  Typography,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ThunderboltOutlined,
  SaveOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  AIConfigManager,
  AIProviderConfig,
  AIProviderType,
  RECOMMENDED_MODELS,
  PROVIDER_LABELS,
} from '../../core/AIConfigManager';

const { Title, Text } = Typography;
const { Option } = Select;
const { Password } = Input;

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

// ==================== 组件 ====================

/**
 * AI 设置面板组件
 * 管理 AI Provider 的添加、编辑、删除和测试
 */
export const AISettingsPanel: React.FC = () => {
  const [form] = Form.useForm();
  const configManager = AIConfigManager.getInstance();

  // 状态
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newProviderType, setNewProviderType] = useState<AIProviderType>('openai');

  // 加载 Provider 列表
  const loadProviders = useCallback(() => {
    const list = configManager.getProviders();
    setProviders(list);
    if (list.length > 0 && !selectedProviderId) {
      const active = configManager.getActiveProvider();
      setSelectedProviderId(active?.id || list[0].id);
    }
  }, [configManager, selectedProviderId]);

  // 初始化加载
  useEffect(() => {
    loadProviders();
    // 注册配置变更监听
    const unsubscribe = configManager.onChange(loadProviders);
    return () => unsubscribe();
  }, [configManager, loadProviders]);

  // 选中 Provider 变更时，更新表单
  useEffect(() => {
    if (selectedProviderId) {
      const provider = providers.find((p) => p.id === selectedProviderId);
      if (provider) {
        form.setFieldsValue({
          ...provider,
          // 解密后的 API Key 不直接显示，需要用户重新输入或留空
          apiKey: '',
        });
      }
    }
  }, [selectedProviderId, providers, form]);

  /**
   * 保存 Provider 配置
   */
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const values = await form.validateFields();

      if (!selectedProviderId) {
        message.error('请先选择一个 Provider');
        return;
      }

      // 如果 API Key 为空，不更新（保留原值）
      const updateData: Partial<AIProviderConfig> = {
        name: values.name,
        provider: values.provider,
        endpoint: values.endpoint,
        model: values.model,
        maxTokens: values.maxTokens,
        temperature: values.temperature,
      };

      if (values.apiKey && values.apiKey.trim() !== '') {
        updateData.apiKey = values.apiKey;
      }

      configManager.updateProvider(selectedProviderId, updateData);
      message.success('配置已保存');
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error('保存失败，请检查表单');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 测试 Provider 连接
   */
  const handleTest = async () => {
    if (!selectedProviderId) return;

    try {
      setIsTesting(true);
      const success = await configManager.testProvider(selectedProviderId);
      if (success) {
        message.success('连接测试成功');
      } else {
        message.error('连接测试失败，请检查配置');
      }
    } catch (error: any) {
      message.error(`测试失败: ${error.message || '未知错误'}`);
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * 添加新 Provider
   */
  const handleAddProvider = () => {
    const type = newProviderType;
    const defaultModels = RECOMMENDED_MODELS[type];
    const defaultEndpoints: Record<AIProviderType, string> = {
      openai: 'https://api.openai.com/v1',
      claude: 'https://api.anthropic.com/v1',
      ollama: 'http://localhost:11434',
      custom: '',
    };

    const newProvider: Omit<AIProviderConfig, 'id'> = {
      name: `${PROVIDER_LABELS[type]} - ${providers.length + 1}`,
      provider: type,
      endpoint: defaultEndpoints[type],
      model: defaultModels[0] || '',
      maxTokens: 4096,
      temperature: 0.7,
      enabled: true,
    };

    configManager.addProvider(newProvider);
    setIsAddModalVisible(false);

    // 选中新添加的 Provider
    const updatedProviders = configManager.getProviders();
    const added = updatedProviders[updatedProviders.length - 1];
    if (added) {
      setSelectedProviderId(added.id);
    }

    message.success('Provider 已添加');
  };

  /**
   * 删除 Provider
   */
  const handleDeleteProvider = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个 Provider 配置吗？此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        configManager.removeProvider(id);
        if (selectedProviderId === id) {
          setSelectedProviderId(null);
        }
        message.success('Provider 已删除');
      },
    });
  };

  /**
   * 切换激活 Provider
   */
  const handleSetActive = (id: string) => {
    configManager.setActiveProvider(id);
    setSelectedProviderId(id);
    message.success('已切换为当前使用的 Provider');
  };

  /**
   * 获取 Provider 类型标签颜色
   */
  const getProviderTagColor = (type: AIProviderType): string => {
    const colorMap: Record<AIProviderType, string> = {
      openai: 'cyan',
      claude: 'purple',
      ollama: 'green',
      custom: 'orange',
    };
    return colorMap[type] || 'default';
  };

  // 当前选中的 Provider
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        background: DARK_THEME.background,
        color: DARK_THEME.textColor,
      }}
    >
      {/* 左侧 Provider 列表 */}
      <div
        style={{
          width: 280,
          minWidth: 280,
          borderRight: `1px solid ${DARK_THEME.borderColor}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '16px', borderBottom: `1px solid ${DARK_THEME.borderColor}` }}>
          <Title level={5} style={{ color: DARK_THEME.textColor, margin: 0 }}>
            <RobotOutlined style={{ marginRight: 8 }} />
            AI Provider
          </Title>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <List
            dataSource={providers}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background:
                    selectedProviderId === item.id
                      ? `${DARK_THEME.activeItem}22`
                      : 'transparent',
                  borderLeft:
                    selectedProviderId === item.id
                      ? `3px solid ${DARK_THEME.activeItem}`
                      : '3px solid transparent',
                  transition: 'all 0.2s',
                }}
                onClick={() => setSelectedProviderId(item.id)}
                actions={[
                  <Tooltip title="设为当前使用">
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      style={{
                        color: item.enabled ? DARK_THEME.successColor : DARK_THEME.secondaryText,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetActive(item.id);
                      }}
                    />
                  </Tooltip>,
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProvider(item.id);
                      }}
                    />
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text style={{ color: DARK_THEME.textColor }}>{item.name}</Text>
                      {item.enabled && (
                        <Tag color="success" style={{ fontSize: 10, lineHeight: '16px' }}>
                          当前使用
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space size={4}>
                      <Tag color={getProviderTagColor(item.provider)} style={{ fontSize: 10 }}>
                        {PROVIDER_LABELS[item.provider]}
                      </Tag>
                      <Text style={{ color: DARK_THEME.secondaryText, fontSize: 12 }}>
                        {item.model}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </div>

        <div style={{ padding: '16px', borderTop: `1px solid ${DARK_THEME.borderColor}` }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            onClick={() => setIsAddModalVisible(true)}
            style={{ background: DARK_THEME.activeItem }}
          >
            添加 Provider
          </Button>
        </div>
      </div>

      {/* 右侧配置表单 */}
      <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
        {selectedProvider ? (
          <Card
            title={
              <Space>
                <EditOutlined />
                <span>配置: {selectedProvider.name}</span>
                <Tag color={getProviderTagColor(selectedProvider.provider)}>
                  {PROVIDER_LABELS[selectedProvider.provider]}
                </Tag>
              </Space>
            }
            style={{
              background: DARK_THEME.cardBackground,
              borderColor: DARK_THEME.borderColor,
            }}
            headStyle={{ color: DARK_THEME.textColor, borderColor: DARK_THEME.borderColor }}
            bodyStyle={{ color: DARK_THEME.textColor }}
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={selectedProvider}
              onValuesChange={(changedValues) => {
                // Provider 类型变更时，更新推荐模型列表
                if (changedValues.provider) {
                  const models = RECOMMENDED_MODELS[changedValues.provider as AIProviderType];
                  form.setFieldsValue({ model: models[0] || '' });
                }
              }}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label={<Text style={{ color: DARK_THEME.textColor }}>Provider 类型</Text>}
                    name="provider"
                    rules={[{ required: true, message: '请选择 Provider 类型' }]}
                  >
                    <Select
                      placeholder="选择 Provider 类型"
                      style={{ background: DARK_THEME.background }}
                      dropdownStyle={{ background: DARK_THEME.cardBackground }}
                    >
                      <Option value="openai">{PROVIDER_LABELS.openai}</Option>
                      <Option value="claude">{PROVIDER_LABELS.claude}</Option>
                      <Option value="ollama">{PROVIDER_LABELS.ollama}</Option>
                      <Option value="custom">{PROVIDER_LABELS.custom}</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<Text style={{ color: DARK_THEME.textColor }}>显示名称</Text>}
                    name="name"
                    rules={[{ required: true, message: '请输入显示名称' }]}
                  >
                    <Input placeholder="例如: 我的 OpenAI" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label={<Text style={{ color: DARK_THEME.textColor }}>API Key</Text>}
                name="apiKey"
              >
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="输入 API Key（留空则保留原值）"
                  suffix={
                    <Button
                      type="text"
                      size="small"
                      icon={showApiKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      onClick={() => setShowApiKey(!showApiKey)}
                      style={{ color: DARK_THEME.secondaryText }}
                    />
                  }
                />
              </Form.Item>

              <Form.Item
                label={<Text style={{ color: DARK_THEME.textColor }}>API 端点</Text>}
                name="endpoint"
                rules={[{ required: true, message: '请输入 API 端点地址' }]}
              >
                <Input placeholder="例如: https://api.openai.com/v1" />
              </Form.Item>

              <Form.Item
                label={<Text style={{ color: DARK_THEME.textColor }}>模型</Text>}
                name="model"
                rules={[{ required: true, message: '请选择或输入模型' }]}
              >
                <Select
                  placeholder="选择模型"
                  showSearch
                  allowClear
                  dropdownStyle={{ background: DARK_THEME.cardBackground }}
                  options={
                    ((RECOMMENDED_MODELS as Record<string, string[]>)[form.getFieldValue('provider') || 'openai'] || []).map(
                      (model: string) => ({
                        label: model,
                        value: model,
                      })
                    )
                  }
                  dropdownRender={(menu) => (
                    <div>
                      {menu}
                      <Divider style={{ margin: '8px 0', borderColor: DARK_THEME.borderColor }} />
                      <div style={{ padding: '0 12px 8px' }}>
                        <Text style={{ color: DARK_THEME.secondaryText, fontSize: 12 }}>
                          也可以直接输入自定义模型名称
                        </Text>
                      </div>
                    </div>
                  )}
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <Text style={{ color: DARK_THEME.textColor }}>Max Tokens</Text>
                    <Text style={{ color: DARK_THEME.secondaryText }}>
                      ({form.getFieldValue('maxTokens') || 4096})
                    </Text>
                  </Space>
                }
                name="maxTokens"
              >
                <Slider
                  min={512}
                  max={8192}
                  step={256}
                  marks={{
                    512: '512',
                    2048: '2K',
                    4096: '4K',
                    8192: '8K',
                  }}
                  tooltip={{ formatter: (value) => `${value}` }}
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <Text style={{ color: DARK_THEME.textColor }}>Temperature</Text>
                    <Text style={{ color: DARK_THEME.secondaryText }}>
                      ({form.getFieldValue('temperature') || 0.7})
                    </Text>
                  </Space>
                }
                name="temperature"
              >
                <Slider
                  min={0}
                  max={2}
                  step={0.1}
                  marks={{
                    0: '精确',
                    1: '平衡',
                    2: '创意',
                  }}
                  tooltip={{ formatter: (value) => `${value}` }}
                />
              </Form.Item>

              <Form.Item style={{ marginTop: 24 }}>
                <Space size="middle">
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={isSaving}
                    onClick={handleSave}
                    style={{ background: DARK_THEME.activeItem }}
                  >
                    保存配置
                  </Button>
                  <Button
                    icon={<ThunderboltOutlined />}
                    loading={isTesting}
                    onClick={handleTest}
                  >
                    测试连接
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: DARK_THEME.secondaryText,
            }}
          >
            <Space direction="vertical" align="center">
              <RobotOutlined style={{ fontSize: 48, opacity: 0.5 }} />
              <Text style={{ color: DARK_THEME.secondaryText }}>请从左侧选择一个 Provider 进行配置</Text>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsAddModalVisible(true)}
                style={{ background: DARK_THEME.activeItem }}
              >
                添加 Provider
              </Button>
            </Space>
          </div>
        )}
      </div>

      {/* 添加 Provider 弹窗 */}
      <Modal
        title="添加新 Provider"
        open={isAddModalVisible}
        onOk={handleAddProvider}
        onCancel={() => setIsAddModalVisible(false)}
        okText="添加"
        cancelText="取消"
        bodyStyle={{ background: DARK_THEME.cardBackground }}
        style={{ top: 20 }}
      >
        <Form layout="vertical">
          <Form.Item label="Provider 类型">
            <Select
              value={newProviderType}
              onChange={(value) => setNewProviderType(value)}
              dropdownStyle={{ background: DARK_THEME.cardBackground }}
            >
              <Option value="openai">{PROVIDER_LABELS.openai}</Option>
              <Option value="claude">{PROVIDER_LABELS.claude}</Option>
              <Option value="ollama">{PROVIDER_LABELS.ollama}</Option>
              <Option value="custom">{PROVIDER_LABELS.custom}</Option>
            </Select>
          </Form.Item>
          <Text type="secondary">
            将创建默认配置的 {PROVIDER_LABELS[newProviderType]} Provider，您可以在右侧编辑详细配置。
          </Text>
        </Form>
      </Modal>
    </div>
  );
};

export default AISettingsPanel;
