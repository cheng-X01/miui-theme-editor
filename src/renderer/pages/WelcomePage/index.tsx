/**
 * MIUI Theme Editor - 欢迎页面
 * 提供三个入口：打开主题、新建主题、AI一键生成
 */

import React, { useState } from 'react';
import { Card, Typography, Space, Button, message, Spin } from 'antd';
import {
  FolderOpenOutlined,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import type { ThemeProject } from '../../shared/types';

const { Title, Text } = Typography;

interface WelcomePageProps {
  /** 打开项目后的回调 */
  onOpenProject: (project: ThemeProject) => void;
}

/**
 * 欢迎页面组件
 * 用户首次打开应用或关闭项目后显示
 */
const WelcomePage: React.FC<WelcomePageProps> = ({ onOpenProject }) => {
  const [loading, setLoading] = useState(false);

  /**
   * 处理打开主题文件
   * 通过 Electron API 打开文件对话框，读取并解析 MTZ 文件
   */
  const handleOpenTheme = async () => {
    try {
      setLoading(true);

      // 调用 Electron API 打开文件对话框
      const dialogResult = await window.electronAPI.openFile({
        title: '打开 MIUI 主题文件',
        filters: [
          { name: 'MIUI 主题文件', extensions: ['mtz'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
        setLoading(false);
        return;
      }

      const filePath = dialogResult.filePaths[0];

      // 读取文件内容
      const fileResult = await window.electronAPI.readFile(filePath);
      if (!fileResult.success) {
        message.error(`读取文件失败: ${fileResult.error}`);
        setLoading(false);
        return;
      }

      // 解析 MTZ 主题包
      const parseResult = await window.electronAPI.parseMTZ(fileResult.data);
      if (!parseResult.success) {
        message.error(`解析主题失败: ${parseResult.error}`);
        setLoading(false);
        return;
      }

      // 设置文件路径并回调
      const project = parseResult.data.project as ThemeProject;
      project.filePath = filePath;
      onOpenProject(project);
    } catch (error: any) {
      message.error(`打开主题时出错: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理新建主题
   * 创建一个空白主题项目
   */
  const handleNewTheme = () => {
    const now = new Date().toISOString();
    const project: ThemeProject = {
      id: uuidv4(),
      name: '新建主题',
      description: {
        name: '新建主题',
        author: '',
        version: '1.0.0',
        description: '',
        uiVersion: 'V12',
        designWidth: 1080,
        designHeight: 2400,
        supportsDarkMode: true,
        minMIUIVersion: '12.0.0',
        category: 'personalization',
        tags: ['新建'],
      },
      resources: {
        icons: [],
        wallpapers: [],
        fonts: [],
        sounds: [],
        lockscreens: [],
        statusbar: {
          showCarrier: true,
        },
        mamlModules: [],
      },
      createdAt: now,
      updatedAt: now,
      isDirty: true,
    };

    onOpenProject(project);
  };

  /**
   * 处理 AI 一键生成主题
   * TODO: 接入 AI 生成功能
   */
  const handleAIGenerate = () => {
    message.info('AI 生成功能即将上线，敬请期待！');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
        padding: '40px',
      }}
    >
      {/* 标题区域 */}
      <Space direction="vertical" size="large" style={{ marginBottom: 60, textAlign: 'center' }}>
        <Title
          level={1}
          style={{
            color: '#ff6b6b',
            margin: 0,
            fontSize: '48px',
            fontWeight: 700,
          }}
        >
          MIUI Theme Editor
        </Title>
        <Text style={{ color: '#a0a0b0', fontSize: '16px' }}>
          全功能小米手机主题编辑生成器 - AI 增强版
        </Text>
      </Space>

      {/* 功能卡片 */}
      <Spin spinning={loading} tip="正在加载主题...">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            maxWidth: '900px',
            width: '100%',
          }}
        >
          {/* 打开主题卡片 */}
          <Card
            hoverable
            style={{
              background: '#16213e',
              border: '1px solid #2a2a4a',
              borderRadius: '12px',
              textAlign: 'center',
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '40px 24px' } }}
            onClick={handleOpenTheme}
          >
            <FolderOpenOutlined style={{ fontSize: '48px', color: '#ff6b6b', marginBottom: '16px' }} />
            <Title level={4} style={{ color: '#e0e0e0', margin: '0 0 8px 0' }}>
              打开主题
            </Title>
            <Text style={{ color: '#a0a0b0' }}>
              打开已有的 .mtz 主题文件进行编辑
            </Text>
          </Card>

          {/* 新建主题卡片 */}
          <Card
            hoverable
            style={{
              background: '#16213e',
              border: '1px solid #2a2a4a',
              borderRadius: '12px',
              textAlign: 'center',
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '40px 24px' } }}
            onClick={handleNewTheme}
          >
            <PlusOutlined style={{ fontSize: '48px', color: '#4ecdc4', marginBottom: '16px' }} />
            <Title level={4} style={{ color: '#e0e0e0', margin: '0 0 8px 0' }}>
              新建主题
            </Title>
            <Text style={{ color: '#a0a0b0' }}>
              从零开始创建一个全新的 MIUI 主题
            </Text>
          </Card>

          {/* AI 生成卡片 */}
          <Card
            hoverable
            style={{
              background: '#16213e',
              border: '1px solid #2a2a4a',
              borderRadius: '12px',
              textAlign: 'center',
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '40px 24px' } }}
            onClick={handleAIGenerate}
          >
            <RobotOutlined style={{ fontSize: '48px', color: '#ffd93d', marginBottom: '16px' }} />
            <Title level={4} style={{ color: '#e0e0e0', margin: '0 0 8px 0' }}>
              AI 一键生成
            </Title>
            <Text style={{ color: '#a0a0b0' }}>
              使用 AI 智能生成完整主题方案
            </Text>
          </Card>
        </div>
      </Spin>

      {/* 底部信息 */}
      <Text
        style={{
          color: '#606080',
          marginTop: '60px',
          fontSize: '12px',
        }}
      >
        v0.1.0 | 支持 MIUI 12+ 主题格式
      </Text>
    </div>
  );
};

export default WelcomePage;
