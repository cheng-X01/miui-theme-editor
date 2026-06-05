/**
 * MIUI Theme Editor - Zustand 状态管理
 * 管理主题项目的全局状态
 */

import { create } from 'zustand';
import type { ThemeProject, ThemeDescription } from '../../shared/types';

// ==================== 类型定义 ====================

/** 项目状态 Store */
interface ProjectState {
  /** 当前主题项目 */
  project: ThemeProject | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
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
  /** 更新主题描述信息 */
  updateDescription: (description: Partial<ThemeDescription>) => void;
}

/** 完整的项目 Store 类型 */
type ProjectStore = ProjectState & ProjectActions;

// ==================== Store 创建 ====================

/**
 * 项目状态管理 Store
 * 使用 Zustand 管理主题项目的全局状态
 */
export const useProjectStore = create<ProjectStore>((set) => ({
  // 初始状态
  project: null,
  isLoading: false,
  error: null,

  // 操作方法

  /**
   * 设置当前主题项目
   */
  setProject: (project) =>
    set({
      project,
      isLoading: false,
      error: null,
    }),

  /**
   * 清除当前主题项目
   * 回到欢迎页时调用
   */
  clearProject: () =>
    set({
      project: null,
      isLoading: false,
      error: null,
    }),

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
   * 更新主题描述信息
   * 部分更新，只修改传入的字段
   */
  updateDescription: (description) =>
    set((state) => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          description: {
            ...state.project.description,
            ...description,
          },
          updatedAt: new Date().toISOString(),
          isDirty: true,
        },
      };
    }),
}));
