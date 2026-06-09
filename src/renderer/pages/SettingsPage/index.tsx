/**
 * MIUI Theme Editor - 设置/偏好页面
 *
 * 功能：
 * - 语言切换（中文/English）
 * - 主题切换（深色/浅色）
 * - 快捷键列表展示
 * - 默认 MTZ 导出路径设置
 * - 自动保存配置
 *
 * 设置通过 localStorage 持久化（key: 'miui-theme-editor-settings'）
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Select,
  Switch,
  Form,
  Input,
  List,
  Tag,
  Divider,
  Typography,
  Space,
  Tooltip,
  InputNumber,
  Button,
  message,
} from 'antd';
import {
  GlobalOutlined,
  BulbOutlined,
  KeyOutlined,
  FolderOutlined,
  SaveOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from '../../i18n';
import { createBuiltinShortcuts } from '../../hooks/useKeyboardShortcuts';

const { Text, Title } = Typography;

// ==================== 类型定义 ====================

/** 应用设置类型 */
export interface AppSettings {
  /** 语言 */
  language: 'zh-CN' | 'en-US';
  /** 主题 */
  theme: 'dark' | 'light';
  /** 自动保存 */
  autoSave: boolean;
  /** 自动保存间隔（秒） */
  autoSaveInterval: number;
  /** 默认导出路径 */
  defaultExportPath: string;
  /** 显示快捷键提示 */
  showShortcutHints: boolean;
}

/** 设置变更回调 */
export interface SettingsPageProps {
  /** 设置变更时的回调 */
  onSettingsChange?: (settings: AppSettings) => void;
}

// ==================== 常量 ====================

/** localStorage 存储键 */
const SETTINGS_STORAGE_KEY = 'miui-theme-editor-settings';

/** 默认设置 */
export const DEFAULT_SETTINGS: AppSettings = {
  language: 'zh-CN',
  theme: 'dark',
  autoSave: true,
  autoSaveInterval: 30,
  defaultExportPath: '',
  showShortcutHints: true,
};

// ==================== 工具函数 ====================

/**
 * 从 localStorage 读取设置
 */
export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('读取设置失败:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * 保存设置到 localStorage
 */
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('保存设置失败:', e);
  }
}

// ==================== 样式常量 ====================

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  cardBg: '#16213e',
  borderColor: '#2a2a4a',
  textPrimary: '#e0e0e0',
  textSecondary: '#a0a0b0',
  textMuted: '#606080',
} as const;

// ==================== 组件 ====================

const SettingsPage: React.FC<SettingsPageProps> = ({ onSettingsChange }) => {
  const { t, locale, setLocale } = useTranslation();

  /** 当前设置 */
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  /** 表单值 */
  const [formValues, setFormValues] = useState<AppSettings>({ ...settings });

  // 监听设置变更，通知父组件
  useEffect(() => {
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  /**
   * 更新设置项
   */
  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      saveSettings(newSettings);
      setFormValues(newSettings);
      message.success('设置已保存');
    },
    [settings]
  );

  /**
   * 处理语言切换
   */
  const handleLanguageChange = useCallback(
    (value: 'zh-CN' | 'en-US') => {
      setLocale(value);
      updateSetting('language', value);
    },
    [updateSetting, setLocale]
  );

  /**
   * 处理主题切换
   */
  const handleThemeChange = useCallback(
    (checked: boolean) => {
      updateSetting('theme', checked ? 'dark' : 'light');
    },
    [updateSetting]
  );

  /**
   * 处理自动保存切换
   */
  const handleAutoSaveChange = useCallback(
    (checked: boolean) => {
      updateSetting('autoSave', checked);
    },
    [updateSetting]
  );

  /**
   * 处理自动保存间隔变更
   */
  const handleAutoSaveIntervalChange = useCallback(
    (value: number | null) => {
      if (value !== null && value > 0) {
        updateSetting('autoSaveInterval', value);
      }
    },
    [updateSetting]
  );

  /**
   * 处理默认导出路径变更
   */
  const handleExportPathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues({ ...formValues, defaultExportPath: e.target.value });
    },
    [formValues]
  );

  /**
   * 处理导出路径失焦时保存
   */
  const handleExportPathBlur = useCallback(() => {
    updateSetting('defaultExportPath', formValues.defaultExportPath);
  }, [formValues.defaultExportPath, updateSetting]);

  /**
   * 处理快捷键提示切换
   */
  const handleShortcutHintsChange = useCallback(
    (checked: boolean) => {
      updateSetting('showShortcutHints', checked);
    },
    [updateSetting]
  );

  /**
   * 选择导出路径（通过文件对话框）
   */
  const handleSelectExportPath = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.openFile({
          title: '选择默认导出目录',
          properties: ['openDirectory', 'createDirectory'],
        });
        if (!result.canceled && result.filePaths.length > 0) {
          updateSetting('defaultExportPath', result.filePaths[0]);
        }
      }
    } catch (e) {
      message.error('选择路径失败');
    }
  }, [updateSetting]);

  // ==================== 快捷键数据 ====================

  /** 获取内置快捷键列表（仅用于展示） */
  const shortcutList = createBuiltinShortcuts({
    onUndo: () => {},
    onRedo: () => {},
    onSave: () => {},
    onExport: () => {},
    onDelete: () => {},
    onSelectAll: () => {},
    onDuplicate: () => {},
    onCancel: () => {},
  });

  /** 格式化快捷键显示 */
  const formatShortcutKey = (key: string): string => {
    return key
      .split('+')
      .map((part) => {
        const p = part.trim().toUpperCase();
        if (p === 'CTRL' || p === 'CONTROL') return 'Ctrl';
        if (p === 'SHIFT') return 'Shift';
        if (p === 'ALT') return 'Alt';
        if (p === 'META' || p === 'CMD' || p === 'COMMAND') return 'Cmd';
        // 首字母大写
        return p.charAt(0).toUpperCase() + p.slice(1);
      })
      .join(' + ');
  };

  // ==================== 渲染 ====================

  return (
    <div style={styles.container}>
      <Title level={4} style={{ color: styles.textPrimary, marginBottom: '20px' }}>
        {t('settings.title')}
      </Title>

      {/* ========== 外观设置 ========== */}
      <Card
        title={
          <Space>
            <BulbOutlined style={{ color: '#ff6b6b' }} />
            <Text style={{ color: styles.textPrimary }}>{t('settings.appearance')}</Text>
          </Space>
        }
        size="small"
        style={{
          marginBottom: '16px',
          background: styles.cardBg,
          borderColor: styles.borderColor,
        }}
        styles={{ header: { borderBottom: `1px solid ${styles.borderColor}` } }}
      >
        <Form layout="horizontal" labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
          {/* 语言切换 */}
          <Form.Item label={<span style={{ color: styles.textSecondary }}>{t('settings.language')}</span>}>
            <Select
              value={settings.language}
              onChange={handleLanguageChange}
              style={{ width: '200px' }}
              options={[
                { label: '中文', value: 'zh-CN' },
                { label: 'English', value: 'en-US' },
              ]}
            />
          </Form.Item>

          {/* 主题切换 */}
          <Form.Item label={<span style={{ color: styles.textSecondary }}>{t('settings.theme')}</span>}>
            <Space>
              <Switch
                checked={settings.theme === 'dark'}
                onChange={handleThemeChange}
                checkedChildren={t('settings.dark')}
                unCheckedChildren={t('settings.light')}
              />
              <Text style={{ color: styles.textMuted, fontSize: '12px' }}>
                {settings.theme === 'dark' ? t('settings.dark') : t('settings.light')}
              </Text>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* ========== 通用设置 ========== */}
      <Card
        title={
          <Space>
            <GlobalOutlined style={{ color: '#ff6b6b' }} />
            <Text style={{ color: styles.textPrimary }}>{t('settings.general')}</Text>
          </Space>
        }
        size="small"
        style={{
          marginBottom: '16px',
          background: styles.cardBg,
          borderColor: styles.borderColor,
        }}
        styles={{ header: { borderBottom: `1px solid ${styles.borderColor}` } }}
      >
        <Form layout="horizontal" labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
          {/* 自动保存 */}
          <Form.Item label={<span style={{ color: styles.textSecondary }}>{t('settings.autoSave')}</span>}>
            <Space>
              <Switch
                checked={settings.autoSave}
                onChange={handleAutoSaveChange}
              />
              <Text style={{ color: styles.textMuted, fontSize: '12px' }}>
                {settings.autoSave
                  ? `${t('settings.autoSaveInterval')}: ${settings.autoSaveInterval}s`
                  : ''}
              </Text>
            </Space>
          </Form.Item>

          {/* 自动保存间隔 */}
          {settings.autoSave && (
            <Form.Item label={<span style={{ color: styles.textSecondary }}>{t('settings.autoSaveInterval')}</span>}>
              <InputNumber
                value={settings.autoSaveInterval}
                onChange={handleAutoSaveIntervalChange}
                min={5}
                max={300}
                step={5}
                style={{ width: '120px' }}
              />
            </Form.Item>
          )}

          {/* 默认导出路径 */}
          <Form.Item label={<span style={{ color: styles.textSecondary }}>{t('settings.defaultExportPath')}</span>}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={formValues.defaultExportPath}
                onChange={handleExportPathChange}
                onBlur={handleExportPathBlur}
                placeholder="留空则每次手动选择"
                style={{ flex: 1 }}
              />
              <Tooltip title="选择目录">
                <Button
                  icon={<FolderOutlined />}
                  onClick={handleSelectExportPath}
                />
              </Tooltip>
            </Space.Compact>
          </Form.Item>

          {/* 显示快捷键提示 */}
          <Form.Item label={<span style={{ color: styles.textSecondary }}>{t('settings.showShortcutHints')}</span>}>
            <Switch
              checked={settings.showShortcutHints}
              onChange={handleShortcutHintsChange}
            />
          </Form.Item>
        </Form>
      </Card>

      {/* ========== 快捷键列表 ========== */}
      <Card
        title={
          <Space>
            <KeyOutlined style={{ color: '#ff6b6b' }} />
            <Text style={{ color: styles.textPrimary }}>{t('settings.shortcutList')}</Text>
          </Space>
        }
        size="small"
        style={{
          background: styles.cardBg,
          borderColor: styles.borderColor,
        }}
        styles={{ header: { borderBottom: `1px solid ${styles.borderColor}` } }}
      >
        <List
          size="small"
          dataSource={shortcutList}
          renderItem={(item) => (
            <List.Item
              style={{
                borderBottom: `1px solid ${styles.borderColor}`,
                padding: '8px 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <Text style={{ color: styles.textPrimary }}>{item.description}</Text>
                <Tag
                  style={{
                    background: '#0f0f23',
                    borderColor: styles.borderColor,
                    color: styles.textSecondary,
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                >
                  {formatShortcutKey(item.key)}
                </Tag>
              </div>
            </List.Item>
          )}
        />

        <Divider style={{ borderColor: styles.borderColor, margin: '12px 0 8px' }} />

        <Space>
          <QuestionCircleOutlined style={{ color: styles.textMuted }} />
          <Text style={{ color: styles.textMuted, fontSize: '12px' }}>
            按 Ctrl+K 可随时打开快捷键帮助面板
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default SettingsPage;
