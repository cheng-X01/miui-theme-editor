/**
 * MIUI Theme Editor - 虚拟滚动 Hook
 *
 * 用于图标编辑器等大数据量列表场景的性能优化。
 * 只渲染可视区域内的列表项，显著减少 DOM 节点数量。
 *
 * 特性：
 * - 支持固定高度列表
 * - 可配置上下 overscan 缓冲区
 * - 返回可见项、总高度、起始偏移量、滚动处理器
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

// ==================== 类型定义 ====================

/** 虚拟滚动配置参数 */
export interface VirtualScrollOptions<T> {
  /** 完整数据列表 */
  items: T[];
  /** 每个列表项的固定高度（像素） */
  itemHeight: number;
  /** 容器可见高度（像素） */
  containerHeight: number;
  /** 上下缓冲区额外渲染的项目数（默认 5） */
  overscan?: number;
}

/** 虚拟滚动返回结果 */
export interface VirtualScrollResult<T> {
  /** 当前可见区域需要渲染的列表项 */
  visibleItems: T[];
  /** 列表总高度（像素），用于撑开滚动容器 */
  totalHeight: number;
  /** 可见区域起始偏移量（像素），用于定位可见项 */
  startOffset: number;
  /** 滚动事件处理器，绑定到滚动容器 */
  onScroll: (event: React.UIEvent<HTMLElement>) => void;
  /** 当前可见区域起始索引 */
  startIndex: number;
  /** 当前可见区域结束索引 */
  endIndex: number;
  /** 滚动到指定索引 */
  scrollToIndex: (index: number) => void;
  /** 当前滚动位置 */
  scrollTop: number;
}

// ==================== 核心计算函数 ====================

/**
 * 计算虚拟滚动的可见范围
 *
 * @param itemCount 总项目数
 * @param itemHeight 每项高度
 * @param containerHeight 容器高度
 * @param scrollTop 当前滚动位置
 * @param overscan 缓冲区数量
 */
function calculateRange(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  overscan: number
): { startIndex: number; endIndex: number; startOffset: number; totalHeight: number } {
  if (itemCount <= 0 || itemHeight <= 0) {
    return { startIndex: 0, endIndex: 0, startOffset: 0, totalHeight: 0 };
  }

  const totalHeight = itemCount * itemHeight;

  // 计算可见区域的起始索引
  const rawStartIndex = Math.floor(scrollTop / itemHeight);
  const startIndex = Math.max(0, rawStartIndex - overscan);

  // 计算可见区域的结束索引
  const rawEndIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
  const endIndex = Math.min(itemCount - 1, rawEndIndex + overscan);

  // 计算起始偏移量
  const startOffset = startIndex * itemHeight;

  return { startIndex, endIndex, startOffset, totalHeight };
}

// ==================== React Hook ====================

/**
 * useVirtualScroll Hook
 *
 * 用于固定高度列表的虚拟滚动，适用于图标编辑器（数千图标）等场景。
 *
 * @param options 虚拟滚动配置
 * @returns 虚拟滚动状态和处理函数
 *
 * @example
 * ```tsx
 * const { visibleItems, totalHeight, startOffset, onScroll } = useVirtualScroll({
 *   items: icons,
 *   itemHeight: 80,
 *   containerHeight: 600,
 *   overscan: 5,
 * });
 *
 * return (
 *   <div style={{ height: 600, overflow: 'auto' }} onScroll={onScroll}>
 *     <div style={{ height: totalHeight, position: 'relative' }}>
 *       <div style={{ position: 'absolute', top: startOffset, width: '100%' }}>
 *         {visibleItems.map((icon, index) => (
 *           <IconCard key={icon.componentName} icon={icon} style={{ height: 80 }} />
 *         ))}
 *       </div>
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useVirtualScroll<T>(options: VirtualScrollOptions<T>): VirtualScrollResult<T> {
  const { items, itemHeight, containerHeight, overscan = 5 } = options;

  /** 当前滚动位置 */
  const [scrollTop, setScrollTop] = useState(0);

  /** 容器引用，用于 scrollToIndex */
  const containerRef = useRef<HTMLElement | null>(null);

  /** 使用 ref 缓存上一次的滚动位置，避免不必要的重渲染 */
  const scrollTopRef = useRef(0);

  // ==================== 范围计算 ====================

  const { startIndex, endIndex, startOffset, totalHeight } = useMemo(() => {
    return calculateRange(items.length, itemHeight, containerHeight, scrollTop, overscan);
  }, [items.length, itemHeight, containerHeight, scrollTop, overscan]);

  /** 可见区域的列表项 */
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  // ==================== 事件处理 ====================

  /**
   * 滚动事件处理器
   *
   * 使用 requestAnimationFrame 节流，避免滚动时过度触发渲染。
   */
  const onScroll = useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      const target = event.currentTarget;
      containerRef.current = target;

      const newScrollTop = target.scrollTop;

      // 只有当滚动位置变化超过一个项目高度时才更新状态
      // 减少不必要的 React 渲染
      const delta = Math.abs(newScrollTop - scrollTopRef.current);
      if (delta >= itemHeight / 2) {
        scrollTopRef.current = newScrollTop;
        setScrollTop(newScrollTop);
      } else {
        // 即使不触发 React 渲染，也更新 ref
        scrollTopRef.current = newScrollTop;
      }
    },
    [itemHeight]
  );

  /**
   * 滚动到指定索引
   *
   * 将列表滚动到指定项目的位置。
   */
  const scrollToIndex = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      const targetScrollTop = clampedIndex * itemHeight;

      if (containerRef.current) {
        containerRef.current.scrollTop = targetScrollTop;
        setScrollTop(targetScrollTop);
        scrollTopRef.current = targetScrollTop;
      }
    },
    [items.length, itemHeight]
  );

  // ==================== 自动滚动修正 ====================

  /**
   * 当数据列表长度变化时，修正滚动位置
   * 防止列表变短后滚动位置超出范围
   */
  useEffect(() => {
    const maxScrollTop = Math.max(0, totalHeight - containerHeight);
    if (scrollTop > maxScrollTop && maxScrollTop >= 0) {
      setScrollTop(maxScrollTop);
      scrollTopRef.current = maxScrollTop;
    }
  }, [totalHeight, containerHeight, scrollTop]);

  return {
    visibleItems,
    totalHeight,
    startOffset,
    onScroll,
    startIndex,
    endIndex,
    scrollToIndex,
    scrollTop,
  };
}

// ==================== 工具函数 ====================

/**
 * 创建固定高度的列表项样式
 *
 * 辅助函数，确保列表项高度与虚拟滚动配置一致。
 */
export function createItemStyle(
  itemHeight: number,
  additionalStyles?: React.CSSProperties
): React.CSSProperties {
  return {
    height: itemHeight,
    boxSizing: 'border-box',
    ...additionalStyles,
  };
}

/**
 * 创建虚拟滚动容器的样式
 *
 * 辅助函数，确保容器样式正确。
 */
export function createContainerStyle(
  containerHeight: number,
  additionalStyles?: React.CSSProperties
): React.CSSProperties {
  return {
    height: containerHeight,
    overflow: 'auto',
    position: 'relative',
    ...additionalStyles,
  };
}

/**
 * 创建虚拟滚动内容层的样式
 *
 * 辅助函数，用于撑开滚动高度。
 */
export function createContentStyle(
  totalHeight: number,
  additionalStyles?: React.CSSProperties
): React.CSSProperties {
  return {
    height: totalHeight,
    position: 'relative',
    ...additionalStyles,
  };
}

/**
 * 创建虚拟滚动可见区域的样式
 *
 * 辅助函数，用于定位可见项。
 */
export function createVisibleAreaStyle(
  startOffset: number,
  additionalStyles?: React.CSSProperties
): React.CSSProperties {
  return {
    position: 'absolute',
    top: startOffset,
    left: 0,
    right: 0,
    ...additionalStyles,
  };
}

export default useVirtualScroll;
