/**
 * MIUI Theme Editor - 主应用组件
 * 负责全局主题配置、路由管理和状态初始化
 */

import React, { useState, useCallback } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import WelcomePage from './pages/WelcomePage';
import EditorPage from './pages/EditorPage';
import type { ThemeProject } from '../shared/types';

/**
 * 主应用组件
 * - 使用 ConfigProvider 配置 Ant Design 暗色主题
 * - 管理当前打开的主题项目状态
 * - 根据是否有打开的项目切换欢迎页/编辑器页
 */
const App: React.FC = () => {
  /** 当前打开的主题项目 */
  const [currentProject, setCurrentProject] = useState<ThemeProject | null>(null);

  /**
   * 打开项目的回调
   * 从欢迎页或新建主题后触发
   */
  const handleOpenProject = useCallback((project: ThemeProject) => {
    setCurrentProject(project);
  }, []);

  /**
   * 返回欢迎页的回调
   * 关闭当前项目，回到欢迎页
   */
  const handleBackToWelcome = useCallback(() => {
    setCurrentProject(null);
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          // 主色调：珊瑚红
          colorPrimary: '#ff6b6b',
          // 背景色：深蓝紫
          colorBgBase: '#1a1a2e',
          colorBgContainer: '#16213e',
          colorBgElevated: '#1a1a2e',
          colorBorder: '#2a2a4a',
          colorText: '#e0e0e0',
          colorTextSecondary: '#a0a0b0',
          borderRadius: 8,
          fontSize: 14,
        },
        components: {
          Layout: {
            siderBg: '#0f0f23',
            headerBg: '#0f0f23',
            bodyBg: '#1a1a2e',
          },
          Menu: {
            darkItemBg: '#0f0f23',
            darkSubMenuItemBg: '#0f0f23',
          },
          Card: {
            colorBgContainer: '#16213e',
          },
        },
      }}
    >
      {currentProject ? (
        <EditorPage
          project={currentProject}
          onBack={handleBackToWelcome}
        />
      ) : (
        <WelcomePage onOpenProject={handleOpenProject} />
      )}
    </ConfigProvider>
  );
};

export default App;
