/**
 * MIUI Theme Editor - 项目状态管理 Store（增强版）
 *
 * 管理主题项目的全局状态，集成历史记录系统。
 * 所有修改操作通过 execute 方法自动记录历史，支持撤销/重做。
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ThemeProject, ThemeDescription, ThemeResources } from '../../shared/types';
import { useHistoryStore } from './history-store';
import type { HistoryActionType } from './history-store';

// ==================== 类型定义 ====================

/** 项目状态 Store */
interface ProjectState {
  /** 当前主题项目 */
  project: ThemeProject | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 是否有未保存的修改 */
  isDirty: boolean;
  /** 上次保存的项目快照（用于判断是否有修改） */
  lastSavedSnapshot: string | null;
}

/** 带历史记录的操作参数 */
interface HistoryAwareUpdate<T> {
  /** 要更新的数据 */
  data: T;
  /** 操作类型 */
  actionType: HistoryActionType;
  /** 所属模块名 */
  module: string;
  /** 操作描述（中文） */
  description?: string;
}

/** 项目状态操作方法 */
interface ProjectActions {
  /** 设置当前项目 */
  setProject: (project: ThemeProject) => void;
  /** 清除当前项目 */
  clearProject: () => void;
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void;
  /** 设置错误信息 */
  setError: (error: string | null) => void;

  /**
   * 更新主题描述信息（带历史记录）
   * 自动记录操作到历史栈，支持撤销/重做
   */
  updateDescription: (description: Partial<ThemeDescription>) => void;

  /**
   * 更新主题资源（带历史记录）
   * 自动记录操作到历史栈，支持撤销/重做
   */
  updateResources: (update: HistoryAwareUpdate<Partial<ThemeResources>>) => void;

  /**
   * 替换整个项目数据（带历史记录）
   * 用于大范围的状态变更
   */
  replaceProject: (update: HistoryAwareUpdate<ThemeProject>) => void;

  /** 标记为已保存（清除脏标记） */
  markAsSaved: () => void;

  /** 检查是否有未保存的修改 */
  hasUnsavedChanges: () => boolean;

  /** 撤销快捷方法 */
  undo: () => void;

  /** 重做快捷方法 */
  redo: () => void;
}

/** 完整的项目 Store 类型 */
type ProjectStore = ProjectState & ProjectActions;

// ==================== 工具函数 ====================

/**
 * JSON 深拷贝
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 生成项目快照哈希（用于脏检测）
 */
function createSnapshotHash(project: ThemeProject | null): string | null {
  if (!project) return null;
  return JSON.stringify(project);
}

// ==================== Store 创建 ====================

/**
 * 项目状态管理 Store（增强版）
 *
 * 集成历史记录系统：
 * - 所有修改操作通过 execute 方法自动记录到 historyStore
 * - 提供 undo/redo 快捷方法
 * - 自动管理 isDirty 状态
 */
export const useProjectStore = create<ProjectStore>()(
  immer((set, get) => ({
    // ==================== 初始状态 ====================
    project: null,
    isLoading: false,
    error: null,
    isDirty: false,
    lastSavedSnapshot: null,

    // ==================== 操作方法 ====================

    /**
     * 设置当前主题项目
     * 初始化时调用，会清空历史记录并重置脏标记
     */
    setProject: (project) => {
      // 清空历史记录（新项目不应继承旧历史）
      useHistoryStore.getState().clear();

      set({
        project,
        isLoading: false,
        error: null,
        isDirty: false,
        lastSavedSnapshot: createSnapshotHash(project),
      });
    },

    /**
     * 清除当前主题项目
     * 回到欢迎页时调用，同时清空历史记录
     */
    clearProject: () => {
      // 清空历史记录
      useHistoryStore.getState().clear();

      set({
        project: null,
        isLoading: false,
        error: null,
        isDirty: false,
        lastSavedSnapshot: null,
      });
    },

    /**
     * 设置加载状态
     */
    setLoading: (loading) =>
      set({ isLoading: loading }),

    /**
     * 设置错误信息
     */
    setError: (error) =>
      set({ error, isLoading: false }),

    /**
     * 更新主题描述信息（带历史记录）
     *
     * 自动记录操作到 historyStore，记录前后状态快照。
     * 部分更新，只修改传入的字段。
     */
    updateDescription: (description) => {
      const { project } = get();
      if (!project) return;

      // 记录前置状态快照
      const beforeState = deepClone(project.description);

      set((state) => {
        if (!state.project) return;

        // 更新描述信息
        state.project.description = {
          ...state.project.description,
          ...description,
        };
        state.project.updatedAt = new Date().toISOString();
        state.project.isDirty = true;
        state.isDirty = true;
      });

      // 记录后置状态快照
      const afterState = deepClone(get().project!.description);

      // 写入历史记录
      useHistoryStore.getState().execute({
        type: 'description-edit',
        module: 'description',
        description: `编辑主题描述: ${Object.keys(description).join(', ')}`,
        beforeState,
        afterState,
      });
    },

    /**
     * 更新主题资源（带历史记录）
     *
     * 用于图标替换、壁纸更换、配色修改、字体替换等操作。
     * 自动记录操作到 historyStore。
     */
    updateResources: (update) => {
      const { project } = get();
      if (!project) return;

      // 记录前置状态快照（只记录受影响的资源部分）
      const beforeState = deepClone(project.resources);

      set((state) => {
        if (!state.project) return;

        // 合并资源更新
        state.project.resources = {
          ...state.project.resources,
          ...update.data,
        };
        state.project.updatedAt = new Date().toISOString();
        state.project.isDirty = true;
        state.isDirty = true;
      });

      // 记录后置状态快照
      const afterState = deepClone(get().project!.resources);

      // 写入历史记录
      useHistoryStore.getState().execute({
        type: update.actionType,
        module: update.module,
        description: update.description || '',
        beforeState,
        afterState,
      });
    },

    /**
     * 替换整个项目数据（带历史记录）
     *
     * 用于大范围的状态变更（如 AI 批量生成、导入主题等）。
     */
    replaceProject: (update) => {
      const { project } = get();
      if (!project) return;

      // 记录前置状态快照
      const beforeState = deepClone(project);

      set((state) => {
        state.project = {
          ...update.data,
          updatedAt: new Date().toISOString(),
          isDirty: true,
        };
        state.isDirty = true;
      });

      // 记录后置状态快照
      const afterState = deepClone(get().project!);

      // 写入历史记录
      useHistoryStore.getState().execute({
        type: update.actionType,
        module: update.module,
        description: update.description || '',
        beforeState,
        afterState,
      });
    },

    /**
     * 标记为已保存
     * 保存成功后调用，清除脏标记并更新快照
     */
    markAsSaved: () => {
      const { project } = get();
      set({
        isDirty: false,
        lastSavedSnapshot: createSnapshotHash(project),
      });

      // 同步更新 project 的 isDirty 字段
      if (project) {
        set((state) => {
          if (state.project) {
            state.project.isDirty = false;
          }
        });
      }
    },

    /**
     * 检查是否有未保存的修改
     * 通过比较当前项目快照与上次保存快照来判断
     */
    hasUnsavedChanges: () => {
      const { project, lastSavedSnapshot } = get();
      if (!project) return false;
      return createSnapshotHash(project) !== lastSavedSnapshot;
    },

    /**
     * 撤销快捷方法
     *
     * 从 historyStore 获取被撤销的操作记录，
     * 根据操作类型和模块恢复对应的状态。
     */
    undo: () => {
      const historyStore = useHistoryStore.getState();
      const action = historyStore.undo();

      if (!action) return;

      const { project } = get();
      if (!project) return;

      // 根据操作模块恢复状态
      set((state) => {
        if (!state.project) return;

        switch (action.module) {
          case 'description':
            // 恢复描述信息
            state.project!.description = deepClone(action.beforeState);
            break;
          case 'icons':
          case 'wallpaper':
          case 'colors':
          case 'fonts':
          case 'sounds':
          case 'maml':
            // 恢复资源状态
            state.project!.resources = deepClone(action.beforeState);
            break;
          case 'project':
            // 恢复整个项目
            state.project = deepClone(action.beforeState);
            break;
          default:
            // 尝试恢复整个项目
            if (action.beforeState && typeof action.beforeState === 'object') {
              // 如果 beforeState 包含 resources 字段，说明是资源级别操作
              if ('resources' in action.beforeState) {
                state.project!.resources = deepClone(action.beforeState.resources);
              } else {
                state.project!.resources = deepClone(action.beforeState);
              }
            }
            break;
        }

        state.project!.updatedAt = new Date().toISOString();
        state.isDirty = true;
      });
    },

    /**
     * 重做快捷方法
     *
     * 从 historyStore 获取被重做的操作记录，
     * 根据操作类型和模块恢复对应的状态。
     */
    redo: () => {
      const historyStore = useHistoryStore.getState();
      const action = historyStore.redo();

      if (!action) return;

      const { project } = get();
      if (!project) return;

      // 根据操作模块恢复状态（与 undo 逻辑相同，但使用 afterState）
      set((state) => {
        if (!state.project) return;

        switch (action.module) {
          case 'description':
            state.project!.description = deepClone(action.afterState);
            break;
          case 'icons':
          case 'wallpaper':
          case 'colors':
          case 'fonts':
          case 'sounds':
          case 'maml':
            state.project!.resources = deepClone(action.afterState);
            break;
          case 'project':
            state.project = deepClone(action.afterState);
            break;
          default:
            if (action.afterState && typeof action.afterState === 'object') {
              if ('resources' in action.afterState) {
                state.project!.resources = deepClone(action.afterState.resources);
              } else {
                state.project!.resources = deepClone(action.afterState);
              }
            }
            break;
        }

        state.project!.updatedAt = new Date().toISOString();
        state.isDirty = true;
      });
    },
  }))
);
