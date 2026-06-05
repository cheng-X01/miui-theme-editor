/**
 * MIUI Theme Editor - 全局键盘快捷键 Hook
 *
 * 统一管理应用级别的键盘快捷键。
 * 使用 React useEffect 监听 keydown 事件，支持组合键（Ctrl/Shift/Alt + Key）。
 *
 * 内置快捷键：
 * - Ctrl+Z: 撤销
 * - Ctrl+Shift+Z / Ctrl+Y: 重做
 * - Ctrl+S: 保存
 * - Ctrl+E: 导出 MTZ
 * - Delete: 删除选中元素
 * - Ctrl+A: 全选
 * - Ctrl+D: 复制
 * - Escape: 取消/关闭
 */

import { useEffect, useRef, useCallback } from 'react';

// ==================== 类型定义 ====================

/** 快捷键配置 */
export interface ShortcutConfig {
  /** 快捷键组合，如 'ctrl+z', 'ctrl+shift+z', 'ctrl+s', 'delete' */
  key: string;
  /** 快捷键描述（中文） */
  description: string;
  /** 快捷键触发的回调函数 */
  handler: () => void;
  /** 是否启用（默认 true） */
  enabled?: boolean;
  /** 是否阻止默认行为（默认 true） */
  preventDefault?: boolean;
}

/** 解析后的快捷键信息 */
interface ParsedKey {
  /** 是否需要 Ctrl 键 */
  ctrl: boolean;
  /** 是否需要 Shift 键 */
  shift: boolean;
  /** 是否需要 Alt 键 */
  alt: boolean;
  /** 是否需要 Meta 键（Cmd on Mac） */
  meta: boolean;
  /** 主按键（小写） */
  key: string;
}

// ==================== 工具函数 ====================

/**
 * 解析快捷键字符串为结构化信息
 *
 * 支持的格式：
 * - 'ctrl+z' -> Ctrl+Z
 * - 'ctrl+shift+z' -> Ctrl+Shift+Z
 * - 'ctrl+s' -> Ctrl+S
 * - 'delete' -> Delete
 * - 'escape' -> Escape
 *
 * @param shortcut 快捷键字符串
 * @returns 解析后的快捷键信息
 */
function parseShortcut(shortcut: string): ParsedKey {
  const parts = shortcut.toLowerCase().split('+').map((p) => p.trim());

  return {
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
    key: parts.filter(
      (p) =>
        !['ctrl', 'control', 'shift', 'alt', 'meta', 'cmd', 'command'].includes(p)
    )[0] || '',
  };
}

/**
 * 检查键盘事件是否匹配快捷键
 *
 * @param event 键盘事件
 * @param parsed 解析后的快捷键信息
 * @returns 是否匹配
 */
function matchesShortcut(event: KeyboardEvent, parsed: ParsedKey): boolean {
  // 检查修饰键是否匹配
  const ctrlMatch = parsed.ctrl === (event.ctrlKey || event.metaKey);
  const shiftMatch = parsed.shift === event.shiftKey;
  const altMatch = parsed.alt === event.altKey;
  const metaMatch = parsed.meta === event.metaKey;

  // 检查主按键是否匹配
  const keyMatch = event.key.toLowerCase() === parsed.key;

  return ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch;
}

/**
 * 判断事件目标是否为输入元素
 * 在输入框、文本域等元素中，某些快捷键不应触发全局行为
 *
 * @param event 键盘事件
 * @returns 是否为输入元素
 */
function isInputElement(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  if (!target) return false;

  const tagName = target.tagName.toLowerCase();
  const isContentEditable = target.isContentEditable;

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isContentEditable ||
    target.getAttribute('role') === 'textbox'
  );
}

// ==================== Hook ====================

/**
 * 全局键盘快捷键 Hook
 *
 * 在组件挂载时注册键盘事件监听器，卸载时自动清理。
 * 支持动态更新快捷键配置（通过依赖数组）。
 *
 * @param shortcuts 快捷键配置数组
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 'ctrl+z',
 *     description: '撤销',
 *     handler: () => projectStore.undo(),
 *   },
 *   {
 *     key: 'ctrl+shift+z',
 *     description: '重做',
 *     handler: () => projectStore.redo(),
 *   },
 *   {
 *     key: 'ctrl+s',
 *     description: '保存',
 *     handler: handleSave,
 *   },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]): void {
  // 使用 ref 存储最新的快捷键配置，避免频繁注册/注销事件
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const currentShortcuts = shortcutsRef.current;

    for (const shortcut of currentShortcuts) {
      // 检查是否启用
      if (shortcut.enabled === false) continue;

      // 解析快捷键
      const parsed = parseShortcut(shortcut.key);

      // 检查是否匹配
      if (matchesShortcut(event, parsed)) {
        // 在输入元素中，允许的快捷键白名单
        const allowedInInput = ['escape'];
        if (isInputElement(event) && !allowedInInput.includes(parsed.key)) {
          continue;
        }

        // 阻止默认行为（默认 true）
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
          event.stopPropagation();
        }

        // 执行回调
        shortcut.handler();
        break; // 只执行第一个匹配的快捷键
      }
    }
  }, []);

  useEffect(() => {
    // 在捕获阶段监听，确保优先级高于组件内部的快捷键处理
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);
}

// ==================== 内置快捷键工厂 ====================

/**
 * 创建内置编辑器快捷键配置
 *
 * 返回常用的编辑器快捷键列表，可直接传给 useKeyboardShortcuts。
 * 回调函数需要由调用方提供具体实现。
 *
 * @param handlers 快捷键回调函数映射
 * @returns 快捷键配置数组
 *
 * @example
 * ```tsx
 * const shortcuts = createBuiltinShortcuts({
 *   onUndo: () => projectStore.undo(),
 *   onRedo: () => projectStore.redo(),
 *   onSave: handleSave,
 *   onExport: handleExport,
 *   onDelete: handleDelete,
 *   onSelectAll: handleSelectAll,
 *   onDuplicate: handleDuplicate,
 *   onCancel: handleCancel,
 * });
 *
 * useKeyboardShortcuts(shortcuts);
 * ```
 */
export function createBuiltinShortcuts(handlers: {
  /** 撤销回调 */
  onUndo?: () => void;
  /** 重做回调 */
  onRedo?: () => void;
  /** 保存回调 */
  onSave?: () => void;
  /** 导出 MTZ 回调 */
  onExport?: () => void;
  /** 删除选中元素回调 */
  onDelete?: () => void;
  /** 全选回调 */
  onSelectAll?: () => void;
  /** 复制回调 */
  onDuplicate?: () => void;
  /** 取消/关闭回调 */
  onCancel?: () => void;
}): ShortcutConfig[] {
  const shortcuts: ShortcutConfig[] = [];

  if (handlers.onUndo) {
    shortcuts.push({
      key: 'ctrl+z',
      description: '撤销',
      handler: handlers.onUndo,
    });
  }

  if (handlers.onRedo) {
    // 支持 Ctrl+Shift+Z 和 Ctrl+Y 两种重做方式
    shortcuts.push({
      key: 'ctrl+shift+z',
      description: '重做',
      handler: handlers.onRedo,
    });
    shortcuts.push({
      key: 'ctrl+y',
      description: '重做',
      handler: handlers.onRedo,
    });
  }

  if (handlers.onSave) {
    shortcuts.push({
      key: 'ctrl+s',
      description: '保存',
      handler: handlers.onSave,
    });
  }

  if (handlers.onExport) {
    shortcuts.push({
      key: 'ctrl+e',
      description: '导出 MTZ',
      handler: handlers.onExport,
    });
  }

  if (handlers.onDelete) {
    shortcuts.push({
      key: 'delete',
      description: '删除选中元素',
      handler: handlers.onDelete,
    });
  }

  if (handlers.onSelectAll) {
    shortcuts.push({
      key: 'ctrl+a',
      description: '全选',
      handler: handlers.onSelectAll,
    });
  }

  if (handlers.onDuplicate) {
    shortcuts.push({
      key: 'ctrl+d',
      description: '复制',
      handler: handlers.onDuplicate,
    });
  }

  if (handlers.onCancel) {
    shortcuts.push({
      key: 'escape',
      description: '取消/关闭',
      handler: handlers.onCancel,
      preventDefault: false, // Escape 不阻止默认行为
    });
  }

  return shortcuts;
}
