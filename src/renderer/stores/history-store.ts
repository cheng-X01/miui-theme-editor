/**
 * MIUI Theme Editor - 全局历史记录管理 Store
 *
 * 基于 Zustand + Immer 的撤销/重做系统，支持跨编辑器的统一操作历史。
 * 所有编辑器模块（图标、壁纸、配色、字体、MAML 等）的操作都通过此 Store 统一管理，
 * 实现全局撤销/重做功能。
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';

// ==================== 类型定义 ====================

/** 历史操作类型标识 */
export type HistoryActionType =
  | 'icon-replace'
  | 'wallpaper-change'
  | 'color-change'
  | 'maml-edit'
  | 'font-replace'
  | 'description-edit'
  | 'sound-replace'
  | 'batch-operation'
  | 'resource-import'
  | 'resource-delete';

/** 历史操作记录 */
export interface HistoryAction {
  /** 操作唯一 ID */
  id: string;
  /** 操作类型 */
  type: HistoryActionType;
  /** 所属编辑器模块名 */
  module: string;
  /** 操作描述（中文） */
  description: string;
  /** 操作时间戳 */
  timestamp: number;
  /** 前置状态快照 */
  beforeState: any;
  /** 后置状态快照 */
  afterState: any;
}

/** 历史记录状态 */
interface HistoryState {
  /** 操作历史栈 */
  actions: HistoryAction[];
  /** 当前指针位置（指向最近一次操作） */
  currentIndex: number;
  /** 最大历史记录数 */
  maxHistory: number;
}

/** 历史记录操作方法 */
interface HistoryActions {
  /**
   * 执行操作并自动记录历史
   * 会截断当前位置之后的重做栈，将新操作追加到末尾
   */
  execute: (action: Omit<HistoryAction, 'id' | 'timestamp'>) => void;

  /**
   * 撤销操作
   * 将指针前移一位，返回被撤销的操作记录
   */
  undo: () => HistoryAction | null;

  /**
   * 重做操作
   * 将指针后移一位，返回被重做的操作记录
   */
  redo: () => HistoryAction | null;

  /** 是否可撤销 */
  canUndo: () => boolean;

  /** 是否可重做 */
  canRedo: () => boolean;

  /** 获取当前操作描述（用于 UI 提示） */
  getCurrentActionDescription: () => string;

  /** 获取可撤销的操作描述 */
  getUndoDescription: () => string;

  /** 获取可重做的操作描述 */
  getRedoDescription: () => string;

  /** 清空所有历史记录 */
  clear: () => void;

  /**
   * 跳转到指定历史位置
   * 用于历史面板中点击某条记录直接跳转
   */
  jumpTo: (index: number) => void;

  /** 获取撤销栈大小 */
  getUndoStackSize: () => number;

  /** 获取重做栈大小 */
  getRedoStackSize: () => number;
}

/** 完整的历史 Store 类型 */
type HistoryStore = HistoryState & HistoryActions;

// ==================== 默认配置 ====================

/** 默认最大历史记录数 */
const DEFAULT_MAX_HISTORY = 50;

// ==================== 工具函数 ====================

/**
 * JSON 深拷贝
 * 使用 JSON 序列化/反序列化实现简单可靠的状态快照
 * 注意：不支持函数、Symbol、undefined 等特殊类型
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 生成操作描述的类型映射
 * 用于在没有手动提供描述时自动生成
 */
const ACTION_TYPE_LABELS: Record<HistoryActionType, string> = {
  'icon-replace': '替换图标',
  'wallpaper-change': '更换壁纸',
  'color-change': '修改配色',
  'maml-edit': '编辑 MAML',
  'font-replace': '替换字体',
  'description-edit': '编辑描述',
  'sound-replace': '替换音效',
  'batch-operation': '批量操作',
  'resource-import': '导入资源',
  'resource-delete': '删除资源',
};

// ==================== Store 创建 ====================

/**
 * 全局历史记录管理 Store
 *
 * 使用 Zustand + Immer 中间件实现不可变状态更新。
 * 维护一个操作历史栈和当前指针，支持撤销/重做操作。
 *
 * 数据结构示意：
 * actions: [A0, A1, A2, A3, A4]
 * currentIndex: 2
 * => 可撤销: A2, A1, A0
 * => 可重做: A3, A4
 */
export const useHistoryStore = create<HistoryStore>()(
  immer((set, get) => ({
    // ==================== 初始状态 ====================
    actions: [],
    currentIndex: -1,
    maxHistory: DEFAULT_MAX_HISTORY,

    // ==================== 操作方法 ====================

    /**
     * 执行操作并自动记录历史
     *
     * 流程：
     * 1. 截断当前位置之后的所有操作（清除重做栈）
     * 2. 创建新的操作记录（含前后状态快照）
     * 3. 追加到历史栈末尾
     * 4. 移动指针到新操作
     * 5. 如果超出最大记录数，移除最早的记录
     */
    execute: (action) => {
      set((state) => {
        // 截断当前位置之后的重做栈
        if (state.currentIndex < state.actions.length - 1) {
          state.actions.splice(state.currentIndex + 1);
        }

        // 创建新的操作记录
        const newAction: HistoryAction = {
          id: uuidv4(),
          type: action.type,
          module: action.module,
          description: action.description || ACTION_TYPE_LABELS[action.type] || '未知操作',
          timestamp: Date.now(),
          beforeState: deepClone(action.beforeState),
          afterState: deepClone(action.afterState),
        };

        // 追加到历史栈
        state.actions.push(newAction);
        state.currentIndex = state.actions.length - 1;

        // 超出最大记录数时，移除最早的记录
        if (state.actions.length > state.maxHistory) {
          const overflow = state.actions.length - state.maxHistory;
          state.actions.splice(0, overflow);
          state.currentIndex -= overflow;
        }
      });
    },

    /**
     * 撤销操作
     *
     * 将指针前移一位，返回被撤销的操作记录。
     * 调用方需要根据返回的 beforeState 恢复对应模块的状态。
     *
     * @returns 被撤销的操作记录，如果无法撤销则返回 null
     */
    undo: () => {
      const { currentIndex, actions } = get();

      if (currentIndex < 0) return null;

      const undoneAction = actions[currentIndex];

      set((state) => {
        state.currentIndex -= 1;
      });

      return undoneAction;
    },

    /**
     * 重做操作
     *
     * 将指针后移一位，返回被重做的操作记录。
     * 调用方需要根据返回的 afterState 恢复对应模块的状态。
     *
     * @returns 被重做的操作记录，如果无法重做则返回 null
     */
    redo: () => {
      const { currentIndex, actions } = get();

      if (currentIndex >= actions.length - 1) return null;

      const redoneAction = actions[currentIndex + 1];

      set((state) => {
        state.currentIndex += 1;
      });

      return redoneAction;
    },

    /**
     * 是否可撤销
     */
    canUndo: () => {
      return get().currentIndex >= 0;
    },

    /**
     * 是否可重做
     */
    canRedo: () => {
      const { currentIndex, actions } = get();
      return currentIndex < actions.length - 1;
    },

    /**
     * 获取当前操作描述
     * 用于 UI 状态栏或工具提示显示
     */
    getCurrentActionDescription: () => {
      const { currentIndex, actions } = get();
      if (currentIndex < 0 || currentIndex >= actions.length) return '无操作';
      return actions[currentIndex].description;
    },

    /**
     * 获取可撤销的操作描述
     */
    getUndoDescription: () => {
      const { currentIndex, actions } = get();
      if (currentIndex < 0) return '';
      return actions[currentIndex].description;
    },

    /**
     * 获取可重做的操作描述
     */
    getRedoDescription: () => {
      const { currentIndex, actions } = get();
      if (currentIndex >= actions.length - 1) return '';
      return actions[currentIndex + 1].description;
    },

    /**
     * 清空所有历史记录
     * 在打开新项目或重置项目时调用
     */
    clear: () => {
      set((state) => {
        state.actions = [];
        state.currentIndex = -1;
      });
    },

    /**
     * 跳转到指定历史位置
     *
     * 用于历史面板中点击某条记录直接跳转到该状态。
     * 返回目标位置的操作记录，调用方需要根据 beforeState/afterState 恢复状态。
     *
     * @param index 目标位置索引
     * @returns 目标位置的操作记录，如果索引无效则返回 null
     */
    jumpTo: (index) => {
      const { actions } = get();

      if (index < 0 || index >= actions.length) return null;

      set((state) => {
        state.currentIndex = index;
      });

      return actions[index];
    },

    /**
     * 获取撤销栈大小
     */
    getUndoStackSize: () => {
      return get().currentIndex + 1;
    },

    /**
     * 获取重做栈大小
     */
    getRedoStackSize: () => {
      const { currentIndex, actions } = get();
      return actions.length - currentIndex - 1;
    },
  }))
);
