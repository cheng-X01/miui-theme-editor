/**
 * MIUI Theme Editor - 主应用组件
 * 负责全局主题配置、路由管理、状态初始化和全局快捷键。
 *
 * 集成功能：
 * - 全局键盘快捷键（撤销/重做/保存/导出等）
 * - 未保存修改提示（关闭窗口时）
 * - 全局保存/导出操作
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ConfigProvider, theme as antdTheme, Modal, message } from 'antd';
import WelcomePage from './pages/WelcomePage';
import EditorPage from './pages/EditorPage';
import type { ThemeProject } from '../shared/types';

// 全局状态管理
import { useProjectStore } from './stores/project-store';
import { useHistoryStore } from './stores/history-store';

// 全局快捷键 Hook
import {
  useKeyboardShortcuts,
  createBuiltinShortcuts,
} from './hooks/useKeyboardShortcuts';

// 性能工具
import { debounce } from './utils/performance';

/**
 * 主应用组件
 * - 使用 ConfigProvider 配置 Ant Design 暗色主题
 * - 管理当前打开的主题项目状态
 * - 根据是否有打开的项目切换欢迎页/编辑器页
 * - 集成全局键盘快捷键
 * - 未保存时关闭窗口提示
 */
const App: React.FC = () => {
  /** 当前打开的主题项目 */
  const [currentProject, setCurrentProject] = useState<ThemeProject | null>(null);

  // ==================== Store 状态 ====================

  const projectStore = useProjectStore();
  const historyStore = useHistoryStore();

  /** 是否有未保存的修改 */
  const isDirty = useProjectStore((s) => s.isDirty);

  /** 是否显示关闭确认弹窗 */
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  /** 关闭后的回调（用于确认关闭后执行） */
  const closeCallbackRef = useState<(() => void) | null>(null);

  // ==================== 保存/导出操作 ====================

  /**
   * 处理保存主题
   * 使用防抖避免重复保存
   */
  const handleSave = useCallback(
    debounce(async () => {
      try {
        const project = useProjectStore.getState().project;
        if (!project) return;

        const dialogResult = await window.electronAPI.saveFile({
          title: '保存 MIUI 主题文件',
          defaultPath: `${project.description.name}.mtz`,
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
              // 标记为已保存
              useProjectStore.getState().markAsSaved();
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
    }, 500),
    []
  );

  /**
   * 处理导出 MTZ
   */
  const handleExport = useCallback(async () => {
    try {
      const project = useProjectStore.getState().project;
      if (!project) return;

      const dialogResult = await window.electronAPI.saveFile({
        title: '导出 MTZ 主题包',
        defaultPath: `${project.description.name}.mtz`,
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
  }, []);

  // ==================== 撤销/重做操作 ====================

  /**
   * 撤销操作
   */
  const handleUndo = useCallback(() => {
    if (!historyStore.canUndo()) {
      message.info('没有可撤销的操作');
      return;
    }
    const action = historyStore.getUndoDescription();
    projectStore.undo();
    message.success(`撤销: ${action}`);
  }, [historyStore, projectStore]);

  /**
   * 重做操作
   */
  const handleRedo = useCallback(() => {
    if (!historyStore.canRedo()) {
      message.info('没有可重做的操作');
      return;
    }
    const action = historyStore.getRedoDescription();
    projectStore.redo();
    message.success(`重做: ${action}`);
  }, [historyStore, projectStore]);

  // ==================== 项目生命周期 ====================

  /**
   * 打开项目的回调
   * 从欢迎页或新建主题后触发
   */
  const handleOpenProject = useCallback((project: ThemeProject) => {
    setCurrentProject(project);
    useProjectStore.getState().setProject(project);
  }, []);

  /**
   * 返回欢迎页的回调
   * 如果有未保存的修改，先弹出确认框
   */
  const handleBackToWelcome = useCallback(() => {
    if (isDirty) {
      // 有未保存的修改，弹出确认框
      closeCallbackRef[0] = () => {
        setCurrentProject(null);
        useProjectStore.getState().clearProject();
      };
      setShowCloseConfirm(true);
    } else {
      setCurrentProject(null);
      useProjectStore.getState().clearProject();
    }
  }, [isDirty]);

  /**
   * 确认关闭（有未保存修改时）
   */
  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    if (closeCallbackRef[0]) {
      closeCallbackRef[0]();
      closeCallbackRef[0] = null;
    }
  }, []);

  /**
   * 取消关闭
   */
  const handleCancelClose = useCallback(() => {
    setShowCloseConfirm(false);
    closeCallbackRef[0] = null;
  }, []);

  // ==================== 全局快捷键 ====================

  /**
   * 构建内置快捷键配置
   * 仅在有打开项目时启用编辑相关快捷键
   */
  const shortcuts = useMemo(() => {
    return createBuiltinShortcuts({
      onUndo: currentProject ? handleUndo : undefined,
      onRedo: currentProject ? handleRedo : undefined,
      onSave: currentProject ? handleSave : undefined,
      onExport: currentProject ? handleExport : undefined,
      onDelete: currentProject ? () => message.info('删除选中元素') : undefined,
      onSelectAll: currentProject ? () => message.info('全选') : undefined,
      onDuplicate: currentProject ? () => message.info('复制') : undefined,
      onCancel: () => {
        // Escape 关闭弹窗或取消操作
        setShowCloseConfirm(false);
      },
    });
  }, [currentProject, handleUndo, handleRedo, handleSave, handleExport]);

  // 注册全局快捷键
  useKeyboardShortcuts(shortcuts);

  // ==================== 窗口关闭拦截 ====================

  /**
   * 监听窗口关闭事件（Electron 环境）
   * 如果有未保存的修改，阻止关闭并弹出确认框
   */
  useEffect(() => {
    // 仅在 Electron 环境中注册
    if (window.electronAPI?.onBeforeClose) {
      const cleanup = window.electronAPI.onBeforeClose(() => {
        if (isDirty) {
          setShowCloseConfirm(true);
          return false; // 阻止关闭
        }
        return true; // 允许关闭
      });

      return cleanup;
    }
  }, [isDirty]);

  // ==================== 渲染 ====================

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

      {/* ========== 未保存修改确认弹窗 ========== */}
      <Modal
        title="未保存的修改"
        open={showCloseConfirm}
        onOk={handleConfirmClose}
        onCancel={handleCancelClose}
        okText="不保存并关闭"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        closable={false}
        maskClosable={false}
      >
        <p>当前主题有未保存的修改，关闭后将丢失这些更改。</p>
        <p>确定要关闭吗？</p>
      </Modal>
    </ConfigProvider>
  );
};

export default App;
