/**
 * MIUI Theme Editor - 编辑器主页面
 *
 * 三栏布局：
 * - 顶部工具栏：返回、主题名（可编辑）、保存、导出MTZ、预览、推送手机、AI助手
 * - 左侧导航面板（200px）：模块列表，带图标和数量 Badge
 * - 中间内容区（flex: 1）：根据选中模块渲染对应编辑器
 * - 右侧属性面板（280px）：根据当前模块显示属性
 * - 底部状态栏（32px）：文件数、资源大小、MIUI版本、上次保存时间
 *
 * AI 集成：
 * - AIChatPanel：完整的 AI 对话面板，替换原有的简单 AI Drawer
 * - AIGenerateButtons：在各编辑器模块上方嵌入 AI 快捷操作按钮
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Layout,
  Button,
  Space,
  Input,
  Badge,
  Tooltip,
  Divider,
  Typography,
  Descriptions,
  Tag,
  Empty,
  Card,
  Form,
  message,
  List,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  ExportOutlined,
  EyeOutlined,
  MobileOutlined,
  RobotOutlined,
  SoundOutlined,
  PictureOutlined,
  BgColorsOutlined,
  FontSizeOutlined,
  CodeOutlined,
  AppstoreOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import type { ThemeProject } from '../../../shared/types';

// AI 组件
import { AIChatPanel } from '../../ai/components/AIChatPanel';
import { AIGenerateButtons } from '../../ai/components/AIGenerateButtons';

// 编辑器组件
import IconEditor from '../../editors/IconEditor';
import WallpaperEditor from '../../editors/WallpaperEditor';
import ColorEditor from '../../editors/ColorEditor';
import FontEditor from '../../editors/FontEditor';

const { Text } = Typography;

// ==================== 类型定义 ====================

interface EditorPageProps {
  /** 当前编辑的主题项目 */
  project: ThemeProject;
  /** 返回欢迎页的回调 */
  onBack: () => void;
}

/** 导航模块项 */
interface NavModule {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

// ==================== 样式常量 ====================

const styles = {
  toolbarBg: '#0f0f23',
  navBg: '#16213e',
  contentBg: '#1a1a2e',
  panelBg: '#16213e',
  borderColor: '#2a2a4a',
  textPrimary: '#e0e0e0',
  textSecondary: '#a0a0b0',
  textMuted: '#606080',
} as const;

// ==================== 组件 ====================

const EditorPage: React.FC<EditorPageProps> = ({ project, onBack }) => {
  const [activeKey, setActiveKey] = useState('overview');
  const [themeName, setThemeName] = useState(project.description.name);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string>(
    project.updatedAt ? new Date(project.updatedAt).toLocaleString('zh-CN') : '未保存'
  );

  // AI Chat Panel 引用，用于通过快捷按钮发送消息
  const aiPanelRef = useRef<{ sendMessage?: (text: string) => void }>({});

  // ==================== 计算属性 ====================

  /** 导航模块列表 */
  const navModules: NavModule[] = useMemo(() => {
    const { resources } = project;
    return [
      { key: 'overview', label: '概览', icon: <AppstoreOutlined /> },
      { key: 'icons', label: '图标', icon: <PictureOutlined />, badge: resources.icons.length || undefined },
      { key: 'wallpaper', label: '壁纸', icon: <PhoneOutlined />, badge: resources.wallpapers.length || undefined },
      { key: 'colors', label: '配色', icon: <BgColorsOutlined /> },
      { key: 'fonts', label: '字体', icon: <FontSizeOutlined />, badge: resources.fonts.length || undefined },
      { key: 'sounds', label: '音效', icon: <SoundOutlined />, badge: resources.sounds.length || undefined },
      { key: 'maml', label: 'MAML', icon: <CodeOutlined />, badge: resources.mamlModules.length || undefined },
      { key: 'preview', label: '预览', icon: <EyeOutlined /> },
    ];
  }, [project]);

  /** 计算总资源数量 */
  const totalFileCount = useMemo(() => {
    const { resources } = project;
    return (
      resources.icons.length +
      resources.wallpapers.length +
      resources.fonts.length +
      resources.sounds.length +
      resources.lockscreens.length +
      resources.mamlModules.length
    );
  }, [project]);

  /** 格式化资源大小（简化估算） */
  const totalResourceSize = useMemo(() => {
    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    let total = 0;
    const { resources } = project;
    // 图标估算：每个约 10KB
    total += resources.icons.length * 10240;
    // 壁纸估算：每个约 2MB
    total += resources.wallpapers.length * 2 * 1024 * 1024;
    // 字体
    resources.fonts.forEach((f) => { total += f.fileSize || 1024 * 1024; });
    // 声音估算：每个约 100KB
    total += resources.sounds.length * 102400;
    // MAML 估算
    resources.mamlModules.forEach((m) => { total += m.sourceCode?.length || 1024; });

    return formatSize(total);
  }, [project]);

  // ==================== 事件处理 ====================

  /** 处理保存主题 */
  const handleSave = async () => {
    try {
      const dialogResult = await window.electronAPI.saveFile({
        title: '保存 MIUI 主题文件',
        defaultPath: `${themeName}.mtz`,
        filters: [{ name: 'MIUI 主题文件', extensions: ['mtz'] }],
      });

      if (!dialogResult.canceled && dialogResult.filePaths.length > 0) {
        const packResult = await window.electronAPI.packMTZ(project);
        if (packResult.success) {
          const writeResult = await window.electronAPI.writeFile(
            dialogResult.filePaths[0],
            packResult.data.buffer
          );
          if (writeResult.success) {
            const now = new Date().toLocaleString('zh-CN');
            setLastSavedTime(now);
            message.success('主题保存成功！');
          } else {
            message.error(`保存失败: ${writeResult.error}`);
          }
        } else {
          message.error(`打包失败: ${packResult.error}`);
        }
      }
    } catch (error: any) {
      message.error(`保存时出错: ${error.message}`);
    }
  };

  /** 处理导出 MTZ */
  const handleExport = async () => {
    try {
      const dialogResult = await window.electronAPI.saveFile({
        title: '导出 MTZ 主题包',
        defaultPath: `${themeName}.mtz`,
        filters: [{ name: 'MIUI 主题文件', extensions: ['mtz'] }],
      });

      if (!dialogResult.canceled && dialogResult.filePaths.length > 0) {
        const packResult = await window.electronAPI.packMTZ(project);
        if (packResult.success) {
          const writeResult = await window.electronAPI.writeFile(
            dialogResult.filePaths[0],
            packResult.data.buffer
          );
          if (writeResult.success) {
            message.success('导出成功！');
          } else {
            message.error(`导出失败: ${writeResult.error}`);
          }
        } else {
          message.error(`打包失败: ${packResult.error}`);
        }
      }
    } catch (error: any) {
      message.error(`导出时出错: ${error.message}`);
    }
  };

  /** 处理预览 */
  const handlePreview = () => {
    setActiveKey('preview');
    message.info('切换到预览页面');
  };

  /** 处理推送手机 */
  const handlePushToPhone = async () => {
    try {
      const devices = await window.electronAPI.listDevices();
      if (devices && devices.length > 0) {
        message.info(`检测到 ${devices.length} 台设备，正在推送...`);
        // TODO: 实际推送逻辑
      } else {
        message.warning('未检测到已连接的手机设备');
      }
    } catch (error: any) {
      message.error(`推送失败: ${error.message}`);
    }
  };

  /** 处理 AI 快捷按钮生成 */
  const handleAIGenerate = useCallback((prompt: string) => {
    setAiInputText(prompt);
    setAiPanelOpen(true);
  }, []);

  // ==================== 渲染中间内容区 ====================

  const renderContent = () => {
    switch (activeKey) {
      case 'overview':
        return renderOverview();
      case 'icons':
        return renderIcons();
      case 'wallpaper':
        return renderWallpaper();
      case 'colors':
        return renderColors();
      case 'fonts':
        return <FontEditor fonts={project.resources.fonts} onFontReplace={() => {}} onFontImport={() => {}} onFontDelete={() => {}} />;
      case 'sounds':
        return renderSounds();
      case 'maml':
        return renderMAML();
      case 'preview':
        return renderPreview();
      default:
        return renderOverview();
    }
  };

  /** 渲染概览 */
  const renderOverview = () => {
    const { description, resources } = project;
    return (
      <div>
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2 }}
          size="small"
          labelStyle={{ background: styles.toolbarBg, color: styles.textSecondary }}
          contentStyle={{ background: styles.navBg, color: styles.textPrimary }}
        >
          <Descriptions.Item label="主题名称">{description.name}</Descriptions.Item>
          <Descriptions.Item label="作者">{description.author || '未设置'}</Descriptions.Item>
          <Descriptions.Item label="版本">{description.version}</Descriptions.Item>
          <Descriptions.Item label="UI 版本">{description.uiVersion}</Descriptions.Item>
          <Descriptions.Item label="设计分辨率">
            {description.designWidth} x {description.designHeight}
          </Descriptions.Item>
          <Descriptions.Item label="暗色模式">
            <Tag color={description.supportsDarkMode ? 'green' : 'default'}>
              {description.supportsDarkMode ? '支持' : '不支持'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="最低 MIUI 版本">{description.minMIUIVersion}</Descriptions.Item>
          <Descriptions.Item label="分类">{description.category || '未分类'}</Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            {description.description || '暂无描述'}
          </Descriptions.Item>
          <Descriptions.Item label="标签" span={2}>
            {description.tags && description.tags.length > 0 ? (
              description.tags.map((tag) => <Tag key={tag} color="blue">{tag}</Tag>)
            ) : (
              <Text type="secondary">无标签</Text>
            )}
          </Descriptions.Item>
        </Descriptions>

        <Card
          title="资源统计"
          size="small"
          style={{ marginTop: '16px', background: styles.navBg, borderColor: styles.borderColor }}
          styles={{ header: { borderBottom: `1px solid ${styles.borderColor}` } }}
        >
          <Space size="large">
            <Text style={{ color: styles.textPrimary }}>图标: <Tag color="blue">{resources.icons.length}</Tag></Text>
            <Text style={{ color: styles.textPrimary }}>壁纸: <Tag color="green">{resources.wallpapers.length}</Tag></Text>
            <Text style={{ color: styles.textPrimary }}>字体: <Tag color="orange">{resources.fonts.length}</Tag></Text>
            <Text style={{ color: styles.textPrimary }}>声音: <Tag color="purple">{resources.sounds.length}</Tag></Text>
            <Text style={{ color: styles.textPrimary }}>锁屏: <Tag color="cyan">{resources.lockscreens.length}</Tag></Text>
            <Text style={{ color: styles.textPrimary }}>MAML: <Tag color="red">{resources.mamlModules.length}</Tag></Text>
          </Space>
        </Card>
      </div>
    );
  };

  /** 渲染图标编辑器区域（含 AI 快捷按钮） */
  const renderIcons = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: styles.navBg,
          border: `1px solid ${styles.borderColor}`,
          borderRadius: '6px',
        }}
      >
        <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>
          图标编辑器
        </Text>
        <AIGenerateButtons module="icon" onGenerate={handleAIGenerate} />
      </div>
      <IconEditor icons={project.resources.icons} onIconReplace={() => {}} onIconImport={() => {}} onIconDelete={() => {}} />
    </div>
  );

  /** 渲染壁纸编辑器区域（含 AI 快捷按钮） */
  const renderWallpaper = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: styles.navBg,
          border: `1px solid ${styles.borderColor}`,
          borderRadius: '6px',
        }}
      >
        <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>
          壁纸编辑器
        </Text>
        <AIGenerateButtons module="wallpaper" onGenerate={handleAIGenerate} />
      </div>
      <WallpaperEditor wallpapers={project.resources.wallpapers} onWallpaperReplace={() => {}} onWallpaperRemove={() => {}} />
    </div>
  );

  /** 渲染配色编辑器区域（含 AI 快捷按钮） */
  const renderColors = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: styles.navBg,
          border: `1px solid ${styles.borderColor}`,
          borderRadius: '6px',
        }}
      >
        <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>
          配色编辑器
        </Text>
        <AIGenerateButtons module="color" onGenerate={handleAIGenerate} />
      </div>
      <ColorEditor colors={[]} onColorChange={() => {}} onColorBatchChange={() => {}} />
    </div>
  );

  /** 渲染音效（占位） */
  const renderSounds = () => {
    const { sounds } = project.resources;
    return (
      <div>
        <Card
          title="音效管理"
          size="small"
          style={{ background: styles.navBg, borderColor: styles.borderColor }}
          styles={{ header: { borderBottom: `1px solid ${styles.borderColor}` } }}
        >
          {sounds.length > 0 ? (
            <List
              size="small"
              dataSource={sounds}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <Text style={{ color: styles.textPrimary }}>{item.name}</Text>
                    <Tag color={
                      item.type === 'notification' ? 'blue' :
                      item.type === 'ringtone' ? 'green' : 'orange'
                    }>
                      {item.type === 'notification' ? '通知' :
                       item.type === 'ringtone' ? '铃声' : '闹钟'}
                    </Tag>
                    {item.duration && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>{item.duration}s</Text>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="暂无音效资源" style={{ padding: '60px 0' }} />
          )}
        </Card>
      </div>
    );
  };

  /** 渲染 MAML 编辑器（含 AI 快捷按钮） */
  const renderMAML = () => {
    const { mamlModules } = project.resources;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* AI 快捷按钮栏 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: styles.navBg,
            border: `1px solid ${styles.borderColor}`,
            borderRadius: '6px',
          }}
        >
          <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>
            MAML 编辑器
          </Text>
          <AIGenerateButtons module="maml" onGenerate={handleAIGenerate} />
        </div>

        <Card
          title="MAML 模块"
          size="small"
          style={{ background: styles.navBg, borderColor: styles.borderColor }}
          styles={{ header: { borderBottom: `1px solid ${styles.borderColor}` } }}
        >
          {mamlModules.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mamlModules.map((module, index) => (
                <Card
                  key={index}
                  size="small"
                  title={
                    <Space>
                      <Text style={{ color: styles.textPrimary }}>{module.name}</Text>
                      <Tag color={
                        module.type === 'lockscreen' ? 'cyan' :
                        module.type === 'homescreen' ? 'green' :
                        module.type === 'widget' ? 'orange' : 'default'
                      }>
                        {module.type}
                      </Tag>
                    </Space>
                  }
                  style={{ background: styles.toolbarBg, borderColor: styles.borderColor }}
                  styles={{ header: { borderBottom: `1px solid ${styles.borderColor}` } }}
                >
                  {module.sourceCode ? (
                    <textarea
                      readOnly
                      value={module.sourceCode}
                      style={{
                        width: '100%',
                        minHeight: '200px',
                        background: '#0a0a1a',
                        color: styles.textSecondary,
                        border: 'none',
                        borderRadius: '6px',
                        padding: '12px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        resize: 'vertical',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <Text type="secondary">无源代码</Text>
                  )}
                  <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '12px' }}>
                    路径: {module.filePath}
                  </Text>
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="暂无 MAML 模块" style={{ padding: '60px 0' }} />
          )}
        </Card>
      </div>
    );
  };

  /** 渲染预览（手机模拟器占位） */
  const renderPreview = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <Empty
        description="手机预览功能开发中..."
        style={{ padding: '60px 0' }}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    </div>
  );

  // ==================== 渲染右侧属性面板 ====================

  const renderProperties = () => {
    switch (activeKey) {
      case 'overview':
        return renderOverviewProperties();
      case 'icons':
        return renderIconsProperties();
      case 'wallpaper':
        return renderWallpaperProperties();
      case 'colors':
        return renderColorsProperties();
      case 'fonts':
        return renderFontsProperties();
      case 'sounds':
        return renderSoundsProperties();
      case 'maml':
        return renderMAMLProperties();
      case 'preview':
        return renderPreviewProperties();
      default:
        return renderOverviewProperties();
    }
  };

  /** 概览属性 - 主题描述编辑 */
  const renderOverviewProperties = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>主题信息</Text>
      <Form layout="vertical" size="small">
        <Form.Item label={<span style={{ color: styles.textSecondary }}>主题名称</span>}>
          <Input
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            style={{ background: styles.toolbarBg, borderColor: styles.borderColor, color: styles.textPrimary }}
          />
        </Form.Item>
        <Form.Item label={<span style={{ color: styles.textSecondary }}>作者</span>}>
          <Input
            defaultValue={project.description.author}
            placeholder="输入作者名称"
            style={{ background: styles.toolbarBg, borderColor: styles.borderColor, color: styles.textPrimary }}
          />
        </Form.Item>
        <Form.Item label={<span style={{ color: styles.textSecondary }}>版本</span>}>
          <Input
            defaultValue={project.description.version}
            placeholder="例如: 1.0.0"
            style={{ background: styles.toolbarBg, borderColor: styles.borderColor, color: styles.textPrimary }}
          />
        </Form.Item>
        <Form.Item label={<span style={{ color: styles.textSecondary }}>描述</span>}>
          <Input.TextArea
            defaultValue={project.description.description}
            placeholder="输入主题描述"
            rows={3}
            style={{ background: styles.toolbarBg, borderColor: styles.borderColor, color: styles.textPrimary }}
          />
        </Form.Item>
        <Form.Item label={<span style={{ color: styles.textSecondary }}>分类</span>}>
          <Input
            defaultValue={project.description.category}
            placeholder="输入主题分类"
            style={{ background: styles.toolbarBg, borderColor: styles.borderColor, color: styles.textPrimary }}
          />
        </Form.Item>
      </Form>
    </div>
  );

  /** 图标属性 */
  const renderIconsProperties = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>图标模块</Text>
      <Descriptions column={1} size="small" labelStyle={{ color: styles.textSecondary }} contentStyle={{ color: styles.textPrimary }}>
        <Descriptions.Item label="模块名称">图标</Descriptions.Item>
        <Descriptions.Item label="图标数量">{project.resources.icons.length}</Descriptions.Item>
        <Descriptions.Item label="支持尺寸">xxhdpi (144x144)</Descriptions.Item>
      </Descriptions>
      <Divider style={{ borderColor: styles.borderColor, margin: '8px 0' }} />
      <Text style={{ color: styles.textSecondary, fontSize: '12px' }}>
        点击左侧图标查看详细信息，支持拖拽上传替换图标。
      </Text>
    </div>
  );

  /** 壁纸属性 */
  const renderWallpaperProperties = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>壁纸模块</Text>
      <Descriptions column={1} size="small" labelStyle={{ color: styles.textSecondary }} contentStyle={{ color: styles.textPrimary }}>
        <Descriptions.Item label="模块名称">壁纸</Descriptions.Item>
        <Descriptions.Item label="壁纸数量">{project.resources.wallpapers.length}</Descriptions.Item>
        <Descriptions.Item label="桌面壁纸">
          {project.resources.wallpapers.filter((w) => w.type === 'homescreen').length}
        </Descriptions.Item>
        <Descriptions.Item label="锁屏壁纸">
          {project.resources.wallpapers.filter((w) => w.type === 'lockscreen').length}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  /** 配色属性 */
  const renderColorsProperties = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>配色模块</Text>
      <Descriptions column={1} size="small" labelStyle={{ color: styles.textSecondary }} contentStyle={{ color: styles.textPrimary }}>
        <Descriptions.Item label="模块名称">配色</Descriptions.Item>
        <Descriptions.Item label="暗色模式">
          <Tag color={project.description.supportsDarkMode ? 'green' : 'default'}>
            {project.description.supportsDarkMode ? '支持' : '不支持'}
          </Tag>
        </Descriptions.Item>
      </Descriptions>
      <Divider style={{ borderColor: styles.borderColor, margin: '8px 0' }} />
      <Text style={{ color: styles.textSecondary, fontSize: '12px' }}>
        点击颜色值可打开颜色选择器进行修改。
      </Text>
    </div>
  );

  /** 字体属性 */
  const renderFontsProperties = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>字体模块</Text>
      <Descriptions column={1} size="small" labelStyle={{ color: styles.textSecondary }} contentStyle={{ color: styles.textPrimary }}>
        <Descriptions.Item label="模块名称">字体</Descriptions.Item>
        <Descriptions.Item label="字体数量">{project.resources.fonts.length}</Descriptions.Item>
      </Descriptions>
      <Divider style={{ borderColor: styles.borderColor, margin: '8px 0' }} />
      <Text style={{ color: styles.textSecondary, fontSize: '12px' }}>
        支持 .ttf/.otf 格式字体上传替换。
      </Text>
    </div>
  );

  /** 音效属性 */
  const renderSoundsProperties = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>音效模块</Text>
      <Descriptions column={1} size="small" labelStyle={{ color: styles.textSecondary }} contentStyle={{ color: styles.textPrimary }}>
        <Descriptions.Item label="模块名称">音效</Descriptions.Item>
        <Descriptions.Item label="音效数量">{project.resources.sounds.length}</Descriptions.Item>
        <Descriptions.Item label="通知音">
          {project.resources.sounds.filter((s) => s.type === 'notification').length}
        </Descriptions.Item>
        <Descriptions.Item label="铃声">
          {project.resources.sounds.filter((s) => s.type === 'ringtone').length}
        </Descriptions.Item>
        <Descriptions.Item label="闹钟">
          {project.resources.sounds.filter((s) => s.type === 'alarm').length}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  /** MAML 属性 */
  const renderMAMLProperties = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>MAML 模块</Text>
      <Descriptions column={1} size="small" labelStyle={{ color: styles.textSecondary }} contentStyle={{ color: styles.textPrimary }}>
        <Descriptions.Item label="模块名称">MAML</Descriptions.Item>
        <Descriptions.Item label="模块数量">{project.resources.mamlModules.length}</Descriptions.Item>
        <Descriptions.Item label="锁屏">
          {project.resources.mamlModules.filter((m) => m.type === 'lockscreen').length}
        </Descriptions.Item>
        <Descriptions.Item label="桌面">
          {project.resources.mamlModules.filter((m) => m.type === 'homescreen').length}
        </Descriptions.Item>
        <Descriptions.Item label="小组件">
          {project.resources.mamlModules.filter((m) => m.type === 'widget').length}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  /** 预览属性 */
  const renderPreviewProperties = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>预览设置</Text>
      <Descriptions column={1} size="small" labelStyle={{ color: styles.textSecondary }} contentStyle={{ color: styles.textPrimary }}>
        <Descriptions.Item label="设计分辨率">
          {project.description.designWidth} x {project.description.designHeight}
        </Descriptions.Item>
        <Descriptions.Item label="UI 版本">{project.description.uiVersion}</Descriptions.Item>
      </Descriptions>
      <Divider style={{ borderColor: styles.borderColor, margin: '8px 0' }} />
      <Text style={{ color: styles.textSecondary, fontSize: '12px' }}>
        预览功能将在后续版本中完善，支持实时预览主题效果。
      </Text>
    </div>
  );

  // ==================== 渲染主布局 ====================

  return (
    <Layout style={{ height: '100vh', background: styles.contentBg, display: 'flex', flexDirection: 'column' }}>
      {/* ========== 顶部工具栏 ========== */}
      <div
        style={{
          height: '48px',
          minHeight: '48px',
          background: styles.toolbarBg,
          borderBottom: `1px solid ${styles.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        {/* 返回按钮 */}
        <Tooltip title="返回">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            style={{ color: styles.textSecondary }}
          />
        </Tooltip>

        {/* 主题名称（可编辑） */}
        <Input
          value={themeName}
          onChange={(e) => setThemeName(e.target.value)}
          variant="borderless"
          style={{
            color: styles.textPrimary,
            fontWeight: 600,
            fontSize: '15px',
            width: '200px',
            background: 'transparent',
          }}
        />

        <Divider type="vertical" style={{ borderColor: styles.borderColor, height: '24px', margin: '0 4px' }} />

        {/* 保存 */}
        <Tooltip title="保存主题">
          <Button
            type="text"
            icon={<SaveOutlined />}
            onClick={handleSave}
            style={{ color: styles.textSecondary }}
          >
            保存
          </Button>
        </Tooltip>

        {/* 导出 MTZ */}
        <Tooltip title="导出 MTZ 文件">
          <Button
            type="text"
            icon={<ExportOutlined />}
            onClick={handleExport}
            style={{ color: styles.textSecondary }}
          >
            导出MTZ
          </Button>
        </Tooltip>

        {/* 预览 */}
        <Tooltip title="预览主题">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={handlePreview}
            style={{ color: styles.textSecondary }}
          >
            预览
          </Button>
        </Tooltip>

        {/* 推送手机 */}
        <Tooltip title="推送到手机">
          <Button
            type="text"
            icon={<MobileOutlined />}
            onClick={handlePushToPhone}
            style={{ color: styles.textSecondary }}
          >
            推送手机
          </Button>
        </Tooltip>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* AI 助手 */}
        <Tooltip title="AI 助手">
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={() => setAiPanelOpen(true)}
            style={{ background: '#4a6cf7' }}
          >
            AI助手
          </Button>
        </Tooltip>
      </div>

      {/* ========== 主体区域（三栏） ========== */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ----- 左侧导航面板 ----- */}
        <div
          style={{
            width: '200px',
            minWidth: '200px',
            background: styles.navBg,
            borderRight: `1px solid ${styles.borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {navModules.map((module) => (
            <div
              key={module.key}
              onClick={() => setActiveKey(module.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 16px',
                cursor: 'pointer',
                background: activeKey === module.key ? '#1a1a3e' : 'transparent',
                borderRight: activeKey === module.key ? '2px solid #4a6cf7' : '2px solid transparent',
                transition: 'all 0.2s',
                gap: '10px',
              }}
              onMouseEnter={(e) => {
                if (activeKey !== module.key) {
                  e.currentTarget.style.background = '#1a1a3e';
                }
              }}
              onMouseLeave={(e) => {
                if (activeKey !== module.key) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ color: activeKey === module.key ? '#4a6cf7' : styles.textSecondary, fontSize: '16px' }}>
                {module.icon}
              </span>
              <span style={{
                color: activeKey === module.key ? styles.textPrimary : styles.textSecondary,
                fontSize: '13px',
                flex: 1,
              }}>
                {module.label}
              </span>
              {module.badge !== undefined && (
                <Badge
                  count={module.badge}
                  size="small"
                  style={{
                    background: '#4a6cf7',
                    fontSize: '10px',
                  }}
                  overflowCount={999}
                />
              )}
            </div>
          ))}
        </div>

        {/* ----- 中间内容区 ----- */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '20px',
            background: styles.contentBg,
          }}
        >
          {renderContent()}
        </div>

        {/* ----- 右侧属性面板 ----- */}
        <div
          style={{
            width: '280px',
            minWidth: '280px',
            background: styles.panelBg,
            borderLeft: `1px solid ${styles.borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {/* 属性面板标题 */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${styles.borderColor}`,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Text strong style={{ color: styles.textPrimary, fontSize: '14px' }}>属性</Text>
          </div>

          {/* 属性内容 */}
          <div style={{ padding: '16px', flex: 1 }}>
            {renderProperties()}
          </div>
        </div>
      </div>

      {/* ========== 底部状态栏 ========== */}
      <div
        style={{
          height: '32px',
          minHeight: '32px',
          background: styles.toolbarBg,
          borderTop: `1px solid ${styles.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0,
        }}
      >
        {/* 左侧信息 */}
        <Space size="middle">
          <Text style={{ color: styles.textMuted, fontSize: '12px' }}>
            文件数: {totalFileCount}
          </Text>
          <Text style={{ color: styles.textMuted, fontSize: '12px' }}>
            资源大小: {totalResourceSize}
          </Text>
        </Space>

        {/* 右侧信息 */}
        <Space size="middle">
          <Text style={{ color: styles.textMuted, fontSize: '12px' }}>
            MIUI 版本: {project.description.minMIUIVersion}
          </Text>
          <Text style={{ color: styles.textMuted, fontSize: '12px' }}>
            上次保存: {lastSavedTime}
          </Text>
        </Space>
      </div>

      {/* ========== AI 对话面板（替换原有简单 Drawer） ========== */}
      <AIChatPanel
        visible={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        context={{
          projectName: themeName,
          activeModule: activeKey,
        }}
      />
    </Layout>
  );
};

export default EditorPage;
