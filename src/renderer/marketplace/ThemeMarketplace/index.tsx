/**
 * MIUI Theme Editor - 主题市场/社区
 *
 * 基础框架：在线主题列表展示、搜索、分类过滤、排序、下载/收藏、上传分享
 * 使用 Ant Design 组件：Card, Input, Select, Tag, Button, List
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Input,
  Select,
  Tag,
  Button,
  List,
  Space,
  Typography,
  Row,
  Col,
  Empty,
  Badge,
  Tooltip,
  Modal,
  Form,
  Upload,
  message,
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  HeartOutlined,
  HeartFilled,
  UploadOutlined,
  FireOutlined,
  ClockCircleOutlined,
  StarOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ==================== 类型定义 ====================

/** 主题分类 */
type ThemeCategory = '全部' | '简约' | '动漫' | '风景' | '科技' | '暗黑' | '可爱' | '商务';

/** 排序方式 */
type SortBy = 'hot' | 'newest' | 'downloads' | 'rating';

/** 在线主题数据 */
interface OnlineTheme {
  id: string;
  name: string;
  author: string;
  description: string;
  category: ThemeCategory;
  tags: string[];
  downloads: number;
  likes: number;
  rating: number;
  views: number;
  createdAt: string;
  coverImage?: string;
  isLiked: boolean;
}

// ==================== 模拟数据 ====================

const MOCK_THEMES: OnlineTheme[] = [
  {
    id: 'theme-001',
    name: '极夜星空',
    author: '星空设计师',
    description: '深邃的星空主题，搭配流光粒子效果，适合夜间使用',
    category: '暗黑',
    tags: ['星空', '粒子', '夜间'],
    downloads: 12580,
    likes: 3420,
    rating: 4.8,
    views: 56800,
    createdAt: '2024-11-15',
    isLiked: false,
  },
  {
    id: 'theme-002',
    name: '樱花物语',
    author: '樱花工作室',
    description: '粉色樱花飘落动画，浪漫唯美风格',
    category: '可爱',
    tags: ['樱花', '粉色', '动画'],
    downloads: 8920,
    likes: 2150,
    rating: 4.6,
    views: 32100,
    createdAt: '2024-12-01',
    isLiked: true,
  },
  {
    id: 'theme-003',
    name: '极简白',
    author: '极简主义',
    description: '纯粹的白色极简设计，清爽干净',
    category: '简约',
    tags: ['极简', '白色', '清爽'],
    downloads: 23400,
    likes: 5600,
    rating: 4.9,
    views: 89200,
    createdAt: '2024-10-20',
    isLiked: false,
  },
  {
    id: 'theme-004',
    name: '赛博朋克2077',
    author: '霓虹设计师',
    description: '霓虹灯光与暗黑科技风格，未来感十足',
    category: '科技',
    tags: ['霓虹', '赛博', '未来'],
    downloads: 15600,
    likes: 4200,
    rating: 4.7,
    views: 67800,
    createdAt: '2024-11-28',
    isLiked: false,
  },
  {
    id: 'theme-005',
    name: '山水画卷',
    author: '国风工作室',
    description: '中国传统水墨山水画，意境深远',
    category: '风景',
    tags: ['国风', '水墨', '山水'],
    downloads: 6700,
    likes: 1890,
    rating: 4.5,
    views: 24500,
    createdAt: '2024-12-10',
    isLiked: false,
  },
  {
    id: 'theme-006',
    name: '海贼王',
    author: '动漫迷',
    description: '海贼王路飞主题，热血冒险风格',
    category: '动漫',
    tags: ['海贼王', '路飞', '热血'],
    downloads: 18900,
    likes: 5100,
    rating: 4.8,
    views: 72300,
    createdAt: '2024-11-05',
    isLiked: true,
  },
  {
    id: 'theme-007',
    name: '商务精英',
    author: '职场达人',
    description: '专业商务风格，沉稳大气',
    category: '商务',
    tags: ['商务', '专业', '沉稳'],
    downloads: 4500,
    likes: 980,
    rating: 4.3,
    views: 18200,
    createdAt: '2024-12-15',
    isLiked: false,
  },
  {
    id: 'theme-008',
    name: '深海秘境',
    author: '海洋设计师',
    description: '深海蓝色调，神秘梦幻',
    category: '风景',
    tags: ['深海', '蓝色', '梦幻'],
    downloads: 11200,
    likes: 3100,
    rating: 4.7,
    views: 45600,
    createdAt: '2024-11-20',
    isLiked: false,
  },
];

const CATEGORIES: ThemeCategory[] = ['全部', '简约', '动漫', '风景', '科技', '暗黑', '可爱', '商务'];

// ==================== 样式常量 ====================

const COLORS = {
  bg: '#1a1a2e',
  panel: '#16213e',
  toolbar: '#0f0f23',
  primary: '#ff6b6b',
  text: '#e0e0e0',
  textSecondary: '#a0a0b0',
  border: '#2a2a4a',
};

// ==================== 辅助函数 ====================

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + '千';
  }
  return String(num);
}

function getCategoryColor(category: ThemeCategory): string {
  const colorMap: Record<ThemeCategory, string> = {
    '全部': '#888888',
    '简约': '#4ECDC4',
    '动漫': '#FF6B6B',
    '风景': '#45B7D1',
    '科技': '#96CEB4',
    '暗黑': '#6C5CE7',
    '可爱': '#FD79A8',
    '商务': '#FDCB6E',
  };
  return colorMap[category] || '#888888';
}

// ==================== 组件 ====================

/**
 * 主题市场组件
 */
const ThemeMarketplace: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('全部');
  const [sortBy, setSortBy] = useState<SortBy>('hot');
  const [themes, setThemes] = useState<OnlineTheme[]>(MOCK_THEMES);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadForm] = Form.useForm();

  // ==================== 筛选与排序 ====================

  const filteredThemes = useMemo(() => {
    let result = [...themes];

    // 分类筛选
    if (selectedCategory !== '全部') {
      result = result.filter((t) => t.category === selectedCategory);
    }

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.author.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // 排序
    result.sort((a, b) => {
      switch (sortBy) {
        case 'hot':
          return b.views - a.views;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'downloads':
          return b.downloads - a.downloads;
        case 'rating':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

    return result;
  }, [themes, selectedCategory, searchQuery, sortBy]);

  // ==================== 事件处理 ====================

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleCategoryChange = useCallback((category: ThemeCategory) => {
    setSelectedCategory(category);
  }, []);

  const handleSortChange = useCallback((value: SortBy) => {
    setSortBy(value);
  }, []);

  const handleDownload = useCallback((theme: OnlineTheme) => {
    message.success(`开始下载主题「${theme.name}」`);
    // TODO: 实现实际下载逻辑
  }, []);

  const handleToggleLike = useCallback((themeId: string) => {
    setThemes((prev) =>
      prev.map((t) => {
        if (t.id === themeId) {
          const newLiked = !t.isLiked;
          return {
            ...t,
            isLiked: newLiked,
            likes: newLiked ? t.likes + 1 : t.likes - 1,
          };
        }
        return t;
      })
    );
  }, []);

  const handleUpload = useCallback(() => {
    setUploadModalVisible(true);
  }, []);

  const handleUploadSubmit = useCallback(() => {
    uploadForm.validateFields().then((values) => {
      message.success('主题上传成功，等待审核');
      setUploadModalVisible(false);
      uploadForm.resetFields();
      // TODO: 实现实际上传逻辑
    });
  }, [uploadForm]);

  // ==================== 渲染 ====================

  return (
    <div
      style={{
        backgroundColor: COLORS.bg,
        minHeight: '100vh',
        padding: '24px',
        color: COLORS.text,
      }}
    >
      {/* 顶部标题栏 */}
      <div
        style={{
          backgroundColor: COLORS.toolbar,
          padding: '16px 24px',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <Space>
          <Title level={3} style={{ color: COLORS.primary, margin: 0 }}>
            主题市场
          </Title>
          <Badge count={themes.length} style={{ backgroundColor: COLORS.primary }} />
        </Space>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={handleUpload}
          style={{ backgroundColor: COLORS.primary, borderColor: COLORS.primary }}
        >
          上传主题
        </Button>
      </div>

      {/* 搜索与筛选栏 */}
      <Card
        style={{
          backgroundColor: COLORS.panel,
          borderColor: COLORS.border,
          marginBottom: '24px',
        }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="搜索主题名称、作者或标签..."
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space wrap>
              {CATEGORIES.map((cat) => (
                <Tag
                  key={cat}
                  color={selectedCategory === cat ? COLORS.primary : getCategoryColor(cat)}
                  style={{
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px 12px',
                    borderRadius: '16px',
                  }}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </Tag>
              ))}
            </Space>
          </Col>
          <Col xs={24} sm={24} md={8} style={{ textAlign: 'right' }}>
            <Space>
              <Text style={{ color: COLORS.textSecondary }}>排序：</Text>
              <Select
                value={sortBy}
                onChange={handleSortChange}
                style={{ width: 120 }}
                dropdownStyle={{ backgroundColor: COLORS.panel }}
              >
                <Option value="hot">
                  <FireOutlined /> 最热
                </Option>
                <Option value="newest">
                  <ClockCircleOutlined /> 最新
                </Option>
                <Option value="downloads">
                  <DownloadOutlined /> 下载量
                </Option>
                <Option value="rating">
                  <StarOutlined /> 评分
                </Option>
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主题列表 */}
      {filteredThemes.length > 0 ? (
        <List
          grid={{
            gutter: [24, 24],
            xs: 1,
            sm: 2,
            md: 3,
            lg: 4,
            xl: 4,
            xxl: 5,
          }}
          dataSource={filteredThemes}
          renderItem={(theme) => (
            <List.Item>
              <Card
                hoverable
                style={{
                  backgroundColor: COLORS.panel,
                  borderColor: COLORS.border,
                  height: '100%',
                }}
                bodyStyle={{ padding: '16px' }}
                cover={
                  <div
                    style={{
                      height: 160,
                      background: `linear-gradient(135deg, ${getCategoryColor(theme.category)}22, ${getCategoryColor(theme.category)}44)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 48,
                        color: getCategoryColor(theme.category),
                        opacity: 0.6,
                      }}
                    >
                      {theme.name.charAt(0)}
                    </Text>
                  </div>
                }
                actions={[
                  <Tooltip title="下载" key="download">
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(theme)}
                      style={{ color: COLORS.textSecondary }}
                    >
                      {formatNumber(theme.downloads)}
                    </Button>
                  </Tooltip>,
                  <Tooltip title={theme.isLiked ? '取消收藏' : '收藏'} key="like">
                    <Button
                      type="text"
                      icon={theme.isLiked ? <HeartFilled style={{ color: COLORS.primary }} /> : <HeartOutlined />}
                      onClick={() => handleToggleLike(theme.id)}
                      style={{ color: theme.isLiked ? COLORS.primary : COLORS.textSecondary }}
                    >
                      {formatNumber(theme.likes)}
                    </Button>
                  </Tooltip>,
                  <Tooltip title="浏览量" key="views">
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      style={{ color: COLORS.textSecondary, cursor: 'default' }}
                    >
                      {formatNumber(theme.views)}
                    </Button>
                  </Tooltip>,
                ]}
              >
                <Card.Meta
                  title={
                    <Space>
                      <Text strong style={{ color: COLORS.text, fontSize: 16 }}>
                        {theme.name}
                      </Text>
                      <Tag color={getCategoryColor(theme.category)} style={{ fontSize: 12 }}>
                        {theme.category}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
                        <UserOutlined /> {theme.author}
                      </Text>
                      <p
                        style={{
                          color: COLORS.textSecondary,
                          fontSize: 13,
                          marginTop: 8,
                          marginBottom: 8,
                          lineHeight: 1.5,
                          minHeight: 40,
                        }}
                      >
                        {theme.description}
                      </p>
                      <Space wrap size={[4, 4]}>
                        {theme.tags.map((tag) => (
                          <Tag
                            key={tag}
                            style={{
                              backgroundColor: 'transparent',
                              borderColor: COLORS.border,
                              color: COLORS.textSecondary,
                              fontSize: 12,
                            }}
                          >
                            {tag}
                          </Tag>
                        ))}
                      </Space>
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <StarOutlined style={{ color: '#FFD93D' }} />
                          <Text style={{ color: COLORS.text }}>{theme.rating}</Text>
                        </Space>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                          {theme.createdAt}
                        </Text>
                      </div>
                    </div>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
      ) : (
        <Empty
          description="未找到匹配的主题"
          style={{ color: COLORS.textSecondary, marginTop: 80 }}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}

      {/* 上传主题弹窗 */}
      <Modal
        title="上传分享主题"
        open={uploadModalVisible}
        onOk={handleUploadSubmit}
        onCancel={() => setUploadModalVisible(false)}
        okText="上传"
        cancelText="取消"
        okButtonProps={{ style: { backgroundColor: COLORS.primary, borderColor: COLORS.primary } }}
      >
        <Form form={uploadForm} layout="vertical">
          <Form.Item
            name="name"
            label="主题名称"
            rules={[{ required: true, message: '请输入主题名称' }]}
          >
            <Input placeholder="给你的主题起个名字" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="选择主题分类">
              {CATEGORIES.filter((c) => c !== '全部').map((cat) => (
                <Option key={cat} value={cat}>
                  {cat}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="主题描述">
            <TextArea rows={3} placeholder="描述一下你的主题特色..." />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Input placeholder="用逗号分隔多个标签，如：简约,白色,清爽" />
          </Form.Item>
          <Form.Item
            name="file"
            label="主题文件"
            rules={[{ required: true, message: '请上传主题文件' }]}
          >
            <Upload.Dragger
              name="file"
              multiple={false}
              beforeUpload={() => false}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p>点击或拖拽 MTZ 文件到此处上传</p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ThemeMarketplace;
