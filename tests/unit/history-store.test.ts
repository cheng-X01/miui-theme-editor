/**
 * MIUI Theme Editor - 历史记录 Store 单元测试
 * 测试 history-store 的核心功能：
 * - execute: 操作记录
 * - undo/redo: 撤销重做
 * - canUndo/canRedo: 状态判断
 * - jumpTo: 跳转
 * - maxHistory: 最大记录限制
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ==================== Mock localStorage ====================

/** 存储 localStorage 数据的 Map */
const storageMap = new Map<string, string>();

/** Mock localStorage */
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() {
    return storageMap.size;
  },
  key: (_index: number) => null,
};

// 替换全局 localStorage
Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });

// 导入被测模块
import { useHistoryStore } from '../../src/renderer/stores/history-store';
import type { HistoryAction } from '../../src/renderer/stores/history-store';

// ==================== 辅助函数 ====================

/**
 * 创建一个测试用的操作参数
 * @param type 操作类型
 * @param module 模块名
 * @param description 描述
 * @param beforeState 前置状态
 * @param afterState 后置状态
 */
function createAction(
  type: HistoryAction['type'],
  module: string,
  description: string,
  beforeState: any = { value: 0 },
  afterState: any = { value: 1 }
) {
  return {
    type,
    module,
    description,
    beforeState,
    afterState,
  };
}

// ==================== 测试用例 ====================

describe('history-store', () => {
  /** 每个测试前重置 store */
  beforeEach(() => {
    // 获取 store 实例并清空
    const store = useHistoryStore.getState();
    store.clear();
  });

  afterEach(() => {
    storageMap.clear();
  });

  // ==================== execute 测试 ====================

  describe('execute', () => {
    it('应该正确记录一个操作', () => {
      const store = useHistoryStore.getState();

      store.execute(
        createAction('icon-replace', 'IconEditor', '替换设置图标')
      );

      const state = useHistoryStore.getState();
      expect(state.actions).toHaveLength(1);
      expect(state.actions[0].type).toBe('icon-replace');
      expect(state.actions[0].module).toBe('IconEditor');
      expect(state.actions[0].description).toBe('替换设置图标');
      expect(state.actions[0].id).toBeDefined();
      expect(state.actions[0].timestamp).toBeDefined();
    });

    it('应该自动生成唯一 ID', () => {
      const store = useHistoryStore.getState();

      store.execute(
        createAction('color-change', 'ColorEditor', '修改主色')
      );
      store.execute(
        createAction('wallpaper-change', 'WallpaperEditor', '更换壁纸')
      );

      const state = useHistoryStore.getState();
      expect(state.actions[0].id).not.toBe(state.actions[1].id);
    });

    it('应该深拷贝前后状态快照', () => {
      const store = useHistoryStore.getState();

      const beforeState = { items: [1, 2, 3] };
      const afterState = { items: [1, 2, 3, 4] };

      store.execute(
        createAction('batch-operation', 'BatchEditor', '批量操作', beforeState, afterState)
      );

      const state = useHistoryStore.getState();
      // 修改原始对象不应影响快照
      beforeState.items.push(999);
      expect(state.actions[0].beforeState.items).toHaveLength(3);
      expect(state.actions[0].afterState.items).toHaveLength(4);
    });

    it('应该在中间位置执行新操作时截断重做栈', () => {
      const store = useHistoryStore.getState();

      // 执行 3 个操作
      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.execute(createAction('icon-replace', 'IconEditor', '操作2'));
      store.execute(createAction('icon-replace', 'IconEditor', '操作3'));

      // 撤销到操作 1
      store.undo();
      store.undo();

      // 在当前位置执行新操作（应截断操作 2 和 3）
      store.execute(createAction('color-change', 'ColorEditor', '新操作'));

      const state = useHistoryStore.getState();
      // 应该只有操作 1 和新操作
      expect(state.actions).toHaveLength(2);
      expect(state.actions[0].description).toBe('操作1');
      expect(state.actions[1].description).toBe('新操作');
      expect(state.currentIndex).toBe(1);
    });

    it('应该在没有手动提供描述时使用默认描述', () => {
      const store = useHistoryStore.getState();

      store.execute({
        type: 'wallpaper-change',
        module: 'WallpaperEditor',
        beforeState: {},
        afterState: {},
        // 不提供 description
      });

      const state = useHistoryStore.getState();
      expect(state.actions[0].description).toBe('更换壁纸');
    });
  });

  // ==================== undo 测试 ====================

  describe('undo', () => {
    it('应该正确撤销操作并返回被撤销的记录', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '替换图标'));
      store.execute(createAction('color-change', 'ColorEditor', '修改颜色'));

      const undone = store.undo();

      expect(undone).toBeDefined();
      expect(undone!.description).toBe('修改颜色');

      const state = useHistoryStore.getState();
      expect(state.currentIndex).toBe(0);
    });

    it('在没有任何操作时应该返回 null', () => {
      const store = useHistoryStore.getState();

      const undone = store.undo();

      expect(undone).toBeNull();
    });

    it('在已经全部撤销后应该返回 null', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.undo();
      const undone = store.undo();

      expect(undone).toBeNull();
    });

    it('应该按顺序撤销多个操作', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.execute(createAction('color-change', 'ColorEditor', '操作2'));
      store.execute(createAction('wallpaper-change', 'WallpaperEditor', '操作3'));

      // 撤销操作 3
      const undone1 = store.undo();
      expect(undone1!.description).toBe('操作3');

      // 撤销操作 2
      const undone2 = store.undo();
      expect(undone2!.description).toBe('操作2');

      // 撤销操作 1
      const undone3 = store.undo();
      expect(undone3!.description).toBe('操作1');

      const state = useHistoryStore.getState();
      expect(state.currentIndex).toBe(-1);
    });
  });

  // ==================== redo 测试 ====================

  describe('redo', () => {
    it('应该正确重做操作并返回被重做的记录', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.execute(createAction('color-change', 'ColorEditor', '操作2'));
      store.undo();

      const redone = store.redo();

      expect(redone).toBeDefined();
      expect(redone!.description).toBe('操作2');

      const state = useHistoryStore.getState();
      expect(state.currentIndex).toBe(1);
    });

    it('在没有可重做操作时应该返回 null', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));

      // 没有撤销过，无法重做
      const redone = store.redo();

      expect(redone).toBeNull();
    });

    it('在全部重做完毕后应该返回 null', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.undo();
      store.redo();

      const redone = store.redo();

      expect(redone).toBeNull();
    });
  });

  // ==================== canUndo / canRedo 测试 ====================

  describe('canUndo / canRedo', () => {
    it('初始状态应该不可撤销也不可重做', () => {
      const store = useHistoryStore.getState();

      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(false);
    });

    it('执行操作后应该可撤销但不可重做', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));

      expect(store.canUndo()).toBe(true);
      expect(store.canRedo()).toBe(false);
    });

    it('撤销后应该可重做', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.undo();

      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(true);
    });

    it('执行多个操作后撤销部分应该既可撤销也可重做', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.execute(createAction('color-change', 'ColorEditor', '操作2'));
      store.execute(createAction('wallpaper-change', 'WallpaperEditor', '操作3'));
      store.undo(); // 撤销操作 3

      expect(store.canUndo()).toBe(true);
      expect(store.canRedo()).toBe(true);
    });

    it('全部撤销后应该不可撤销', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.execute(createAction('color-change', 'ColorEditor', '操作2'));
      store.undo();
      store.undo();

      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(true);
    });
  });

  // ==================== jumpTo 测试 ====================

  describe('jumpTo', () => {
    it('应该正确跳转到指定位置', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.execute(createAction('color-change', 'ColorEditor', '操作2'));
      store.execute(createAction('wallpaper-change', 'WallpaperEditor', '操作3'));

      // 跳转到操作 1（索引 0）
      const jumped = store.jumpTo(0);

      expect(jumped).toBeDefined();
      expect(jumped!.description).toBe('操作1');

      const state = useHistoryStore.getState();
      expect(state.currentIndex).toBe(0);
    });

    it('跳转后应该可以重做', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.execute(createAction('color-change', 'ColorEditor', '操作2'));
      store.execute(createAction('wallpaper-change', 'WallpaperEditor', '操作3'));

      store.jumpTo(0);

      expect(store.canRedo()).toBe(true);
    });

    it('跳转到最后一个位置后应该不可重做', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.execute(createAction('color-change', 'ColorEditor', '操作2'));
      store.execute(createAction('wallpaper-change', 'WallpaperEditor', '操作3'));

      store.jumpTo(2);

      expect(store.canRedo()).toBe(false);
    });

    it('无效索引应该返回 null', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));

      // 负数索引
      expect(store.jumpTo(-1)).toBeNull();

      // 超出范围索引
      expect(store.jumpTo(5)).toBeNull();

      // 状态不应改变
      expect(useHistoryStore.getState().currentIndex).toBe(0);
    });

    it('跳转到第一个位置后应该可以撤销第一步', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.execute(createAction('color-change', 'ColorEditor', '操作2'));

      store.jumpTo(0);

      // currentIndex=0 表示指向第一个操作，可以撤销该操作
      expect(store.canUndo()).toBe(true);
    });
  });

  // ==================== maxHistory 测试 ====================

  describe('maxHistory', () => {
    it('默认最大记录数应为 50', () => {
      const state = useHistoryStore.getState();
      expect(state.maxHistory).toBe(50);
    });

    it('超出最大记录数时应自动移除最早的记录', () => {
      const store = useHistoryStore.getState();

      // 手动设置较小的 maxHistory 用于测试
      useHistoryStore.setState({ maxHistory: 5 });

      // 执行 7 个操作
      for (let i = 0; i < 7; i++) {
        store.execute(
          createAction('icon-replace', 'IconEditor', `操作${i + 1}`)
        );
      }

      const state = useHistoryStore.getState();

      // 应该只保留最近的 5 个操作
      expect(state.actions).toHaveLength(5);
      // 最早的应该是操作 3（操作 1 和 2 被移除）
      expect(state.actions[0].description).toBe('操作3');
      expect(state.actions[4].description).toBe('操作7');
      // 当前索引应正确调整
      expect(state.currentIndex).toBe(4);
    });

    it('超出最大记录数后 currentIndex 应正确调整', () => {
      const store = useHistoryStore.getState();

      useHistoryStore.setState({ maxHistory: 3 });

      for (let i = 0; i < 5; i++) {
        store.execute(
          createAction('color-change', 'ColorEditor', `操作${i + 1}`)
        );
      }

      const state = useHistoryStore.getState();
      expect(state.actions).toHaveLength(3);
      expect(state.currentIndex).toBe(2);
    });
  });

  // ==================== clear 测试 ====================

  describe('clear', () => {
    it('应该清空所有历史记录', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.execute(createAction('color-change', 'ColorEditor', '操作2'));
      store.execute(createAction('wallpaper-change', 'WallpaperEditor', '操作3'));

      store.clear();

      const state = useHistoryStore.getState();
      expect(state.actions).toHaveLength(0);
      expect(state.currentIndex).toBe(-1);
      expect(state.canUndo()).toBe(false);
      expect(state.canRedo()).toBe(false);
    });
  });

  // ==================== 辅助方法测试 ====================

  describe('辅助方法', () => {
    it('getCurrentActionDescription 应返回当前操作描述', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '替换设置图标'));

      expect(store.getCurrentActionDescription()).toBe('替换设置图标');
    });

    it('getCurrentActionDescription 在无操作时应返回默认值', () => {
      const store = useHistoryStore.getState();

      expect(store.getCurrentActionDescription()).toBe('无操作');
    });

    it('getUndoDescription 应返回可撤销操作的描述', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('color-change', 'ColorEditor', '修改主色'));

      expect(store.getUndoDescription()).toBe('修改主色');
    });

    it('getRedoDescription 应返回可重做操作的描述', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('wallpaper-change', 'WallpaperEditor', '更换壁纸'));
      store.undo();

      expect(store.getRedoDescription()).toBe('更换壁纸');
    });

    it('getUndoStackSize 应返回正确的撤销栈大小', () => {
      const store = useHistoryStore.getState();

      expect(store.getUndoStackSize()).toBe(0);

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      expect(store.getUndoStackSize()).toBe(1);

      store.execute(createAction('color-change', 'ColorEditor', '操作2'));
      expect(store.getUndoStackSize()).toBe(2);

      store.undo();
      expect(store.getUndoStackSize()).toBe(1);
    });

    it('getRedoStackSize 应返回正确的重做栈大小', () => {
      const store = useHistoryStore.getState();

      store.execute(createAction('icon-replace', 'IconEditor', '操作1'));
      store.execute(createAction('color-change', 'ColorEditor', '操作2'));
      store.undo();

      expect(store.getRedoStackSize()).toBe(1);
    });
  });
});
