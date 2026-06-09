/**
 * MIUI Theme Editor - 快捷键帮助面板
 *
 * 使用 Modal 组件展示所有快捷键列表。
 * 快捷键数据从 useKeyboardShortcuts 的 createBuiltinShortcuts 获取。
 * 格式：快捷键组合 | 描述
 * 支持 Ctrl+K 打开（全局快捷键）
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Table, Typography, Tag } from 'antd';
import { createBuiltinShortcuts, type ShortcutConfig } from '../../hooks/useKeyboardShortcuts';

const { Text } = Typography;

// ==================== 类型定义 ====================

export interface ShortcutHelpPanelProps {
  /** 是否显示面板 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

// ==================== 样式常量 ====================

const styles = {
  tagBg: '#0f0f23',
  borderColor: '#2a2a4a',
  textSecondary: '#a0a0b0',
  textPrimary: '#e0e0e0',
} as const;

// ==================== 工具函数 ====================

/**
 * 格式化快捷键显示文本
 * 'ctrl+z' -> 'Ctrl + Z'
 * 'ctrl+shift+z' -> 'Ctrl + Shift + Z'
 */
function formatShortcutKey(key: string): string {
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
}

// ==================== 组件 ====================

const ShortcutHelpPanel: React.FC<ShortcutHelpPanelProps> = ({ visible, onClose }) => {
  /**
   * 获取内置快捷键列表（仅用于展示，handler 为空函数）
   */
  const shortcutList: ShortcutConfig[] = useMemo(() => {
    return createBuiltinShortcuts({
      onUndo: () => {},
      onRedo: () => {},
      onSave: () => {},
      onExport: () => {},
      onDelete: () => {},
      onSelectAll: () => {},
      onDuplicate: () => {},
      onCancel: () => {},
    });
  }, []);

  /**
   * 去重快捷键列表（同一描述只显示一次，合并快捷键）
   */
  const deduplicatedShortcuts = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of shortcutList) {
      const existing = map.get(item.description);
      if (existing) {
        if (!existing.includes(item.key)) {
          existing.push(item.key);
        }
      } else {
        map.set(item.description, [item.key]);
      }
    }
    return Array.from(map.entries()).map(([description, keys]) => ({
      description,
      keys: keys.map(formatShortcutKey).join(' / '),
    }));
  }, [shortcutList]);

  /**
   * 表格列定义
   */
  const columns = [
    {
      title: '快捷键',
      dataIndex: 'keys',
      key: 'keys',
      width: '40%',
      render: (keys: string) => (
        <Tag
          style={{
            background: styles.tagBg,
            borderColor: styles.borderColor,
            color: styles.textSecondary,
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '2px 8px',
          }}
        >
          {keys}
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => (
        <Text style={{ color: styles.textPrimary }}>{description}</Text>
      ),
    },
  ];

  return (
    <Modal
      title="快捷键帮助"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={520}
      centered
      destroyOnClose={false}
    >
      <div style={{ marginTop: '12px' }}>
        <Table
          dataSource={deduplicatedShortcuts}
          columns={columns}
          rowKey="description"
          pagination={false}
          size="small"
          style={{
            background: 'transparent',
          }}
        />

        <div
          style={{
            marginTop: '16px',
            padding: '8px 12px',
            background: '#16213e',
            borderRadius: '6px',
            border: `1px solid ${styles.borderColor}`,
          }}
        >
          <Text style={{ color: styles.textSecondary, fontSize: '12px' }}>
            提示：按 <Tag
              style={{
                background: styles.tagBg,
                borderColor: styles.borderColor,
                color: styles.textSecondary,
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '0 4px',
              }}
            >Ctrl + K</Tag> 可随时打开此帮助面板
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default ShortcutHelpPanel;
