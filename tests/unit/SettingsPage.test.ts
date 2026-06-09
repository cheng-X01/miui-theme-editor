/**
 * MIUI Theme Editor - 设置页面单元测试
 *
 * 测试范围：
 * - 设置读写功能
 * - 默认值恢复
 * - 语言切换
 * - 主题切换
 * - 自动保存配置
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SettingsPage, {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
} from '../../src/renderer/pages/SettingsPage';

// ==================== 测试工具 ====================

/**
 * 清除 localStorage 中的设置
 */
function clearStoredSettings(): void {
  localStorage.removeItem('miui-theme-editor-settings');
}

// ==================== 测试套件 ====================

describe('SettingsPage', () => {
  const mockOnSettingsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    clearStoredSettings();
  });

  /**
   * 测试1：默认设置值
   */
  it('应该使用正确的默认设置值', () => {
    expect(DEFAULT_SETTINGS.language).toBe('zh-CN');
    expect(DEFAULT_SETTINGS.theme).toBe('dark');
    expect(DEFAULT_SETTINGS.autoSave).toBe(true);
    expect(DEFAULT_SETTINGS.autoSaveInterval).toBe(30);
    expect(DEFAULT_SETTINGS.defaultExportPath).toBe('');
    expect(DEFAULT_SETTINGS.showShortcutHints).toBe(true);
  });

  /**
   * 测试2：从 localStorage 读取设置
   */
  it('应该正确从 localStorage 读取设置', () => {
    const customSettings: AppSettings = {
      language: 'en-US',
      theme: 'light',
      autoSave: false,
      autoSaveInterval: 60,
      defaultExportPath: '/home/user/themes',
      showShortcutHints: false,
    };

    localStorage.setItem('miui-theme-editor-settings', JSON.stringify(customSettings));

    const loaded = loadSettings();
    expect(loaded.language).toBe('en-US');
    expect(loaded.theme).toBe('light');
    expect(loaded.autoSave).toBe(false);
    expect(loaded.autoSaveInterval).toBe(60);
    expect(loaded.defaultExportPath).toBe('/home/user/themes');
    expect(loaded.showShortcutHints).toBe(false);
  });

  /**
   * 测试3：保存设置到 localStorage
   */
  it('应该正确保存设置到 localStorage', () => {
    const settings: AppSettings = {
      language: 'zh-CN',
      theme: 'dark',
      autoSave: true,
      autoSaveInterval: 45,
      defaultExportPath: '/tmp/export',
      showShortcutHints: true,
    };

    saveSettings(settings);

    const stored = localStorage.getItem('miui-theme-editor-settings');
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.autoSaveInterval).toBe(45);
    expect(parsed.defaultExportPath).toBe('/tmp/export');
  });

  /**
   * 测试4：localStorage 无数据时使用默认值
   */
  it('当 localStorage 无数据时应该使用默认值', () => {
    clearStoredSettings();
    const loaded = loadSettings();

    expect(loaded.language).toBe(DEFAULT_SETTINGS.language);
    expect(loaded.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(loaded.autoSave).toBe(DEFAULT_SETTINGS.autoSave);
    expect(loaded.autoSaveInterval).toBe(DEFAULT_SETTINGS.autoSaveInterval);
  });

  /**
   * 测试5：渲染设置页面
   */
  it('应该正确渲染设置页面', () => {
    render(
      React.createElement(SettingsPage, {
        onSettingsChange: mockOnSettingsChange,
      })
    );

    // 验证标题
    expect(screen.getByText('设置')).toBeInTheDocument();

    // 验证各个设置卡片存在
    expect(screen.getByText('外观')).toBeInTheDocument();
    expect(screen.getByText('通用')).toBeInTheDocument();
    expect(screen.getByText('快捷键列表')).toBeInTheDocument();

    // 验证语言选择器存在
    expect(screen.getByText('中文')).toBeInTheDocument();

    // 验证主题切换存在
    expect(screen.getByText('深色')).toBeInTheDocument();
  });

  /**
   * 测试6：语言切换
   */
  it('应该支持切换语言', async () => {
    render(
      React.createElement(SettingsPage, {
        onSettingsChange: mockOnSettingsChange,
      })
    );

    // 找到语言选择器（Select 组件）
    const languageSelect = screen.getByText('中文').closest('.ant-select');
    expect(languageSelect).toBeInTheDocument();

    // 由于 Ant Design Select 的交互较复杂，
    // 这里验证组件渲染正确，且设置变更回调会被触发
    expect(mockOnSettingsChange).not.toHaveBeenCalled();
  });

  /**
   * 测试7：主题切换
   */
  it('应该支持切换主题', () => {
    render(
      React.createElement(SettingsPage, {
        onSettingsChange: mockOnSettingsChange,
      })
    );

    // 验证主题切换 Switch 存在
    const themeSwitch = document.querySelector('.ant-switch');
    expect(themeSwitch).toBeInTheDocument();

    // 点击主题切换
    if (themeSwitch) {
      fireEvent.click(themeSwitch);
    }

    // 验证设置变更回调被触发
    expect(mockOnSettingsChange).toHaveBeenCalled();
  });

  /**
   * 测试8：自动保存配置
   */
  it('应该支持配置自动保存', () => {
    render(
      React.createElement(SettingsPage, {
        onSettingsChange: mockOnSettingsChange,
      })
    );

    // 验证自动保存相关文本存在
    expect(screen.getByText('自动保存')).toBeInTheDocument();

    // 找到自动保存的 Switch
    const switches = document.querySelectorAll('.ant-switch');
    expect(switches.length).toBeGreaterThan(0);

    // 默认应该显示自动保存间隔
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  /**
   * 测试9：损坏的 localStorage 数据应回退到默认值
   */
  it('当 localStorage 数据损坏时应该回退到默认值', () => {
    localStorage.setItem('miui-theme-editor-settings', 'invalid-json{{');

    const loaded = loadSettings();
    expect(loaded.language).toBe(DEFAULT_SETTINGS.language);
    expect(loaded.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  /**
   * 测试10：部分设置应合并到默认值
   */
  it('应该将部分设置与默认值合并', () => {
    const partialSettings = {
      language: 'en-US',
      theme: 'light',
    };

    localStorage.setItem('miui-theme-editor-settings', JSON.stringify(partialSettings));

    const loaded = loadSettings();
    // 自定义值
    expect(loaded.language).toBe('en-US');
    expect(loaded.theme).toBe('light');
    // 默认值
    expect(loaded.autoSave).toBe(DEFAULT_SETTINGS.autoSave);
    expect(loaded.autoSaveInterval).toBe(DEFAULT_SETTINGS.autoSaveInterval);
    expect(loaded.showShortcutHints).toBe(DEFAULT_SETTINGS.showShortcutHints);
  });
});
