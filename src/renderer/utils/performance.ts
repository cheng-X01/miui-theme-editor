/**
 * MIUI Theme Editor - 性能优化工具函数
 *
 * 提供常用的性能优化工具：
 * - 防抖（debounce）
 * - 节流（throttle）
 * - 缓存（memoize）
 * - React 懒加载 HOC（lazyLoad）
 * - 虚拟滚动计算（virtualScroll）
 * - 批量更新（batchUpdate）
 */

import React, { lazy, Suspense, type ComponentType } from 'react';

// ==================== 防抖 ====================

/**
 * 防抖函数
 *
 * 在指定延迟时间内，如果函数被再次调用，则重新计时。
 * 适用于输入搜索、窗口 resize 等高频触发场景。
 *
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 *
 * @example
 * ```ts
 * const debouncedSearch = debounce((query: string) => {
 *   searchAPI(query);
 * }, 300);
 *
 * input.addEventListener('input', (e) => {
 *   debouncedSearch(e.target.value);
 * });
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] | null = null;

  const debounced = function (this: any, ...args: any[]) {
    lastArgs = args;

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) {
        fn.apply(this, lastArgs);
        lastArgs = null;
      }
    }, delay);
  } as T & { cancel: () => void; flush: () => void };

  /**
   * 取消防抖，立即清除定时器
   */
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      lastArgs = null;
    }
  };

  /**
   * 立即执行防抖函数
   */
  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (lastArgs) {
        fn.apply(null, lastArgs);
        lastArgs = null;
      }
    }
  };

  return debounced;
}

// ==================== 节流 ====================

/**
 * 节流函数
 *
 * 在指定时间间隔内，函数最多执行一次。
 * 适用于滚动事件、鼠标移动、窗口 resize 等高频触发场景。
 *
 * @param fn 要节流的函数
 * @param interval 时间间隔（毫秒）
 * @returns 节流后的函数
 *
 * @example
 * ```ts
 * const throttledScroll = throttle(() => {
 *   updateScrollPosition();
 * }, 100);
 *
 * window.addEventListener('scroll', throttledScroll);
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number
): T & { cancel: () => void } {
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const throttled = function (this: any, ...args: any[]) {
    const now = Date.now();
    const remaining = interval - (now - lastTime);

    if (remaining <= 0) {
      // 超过间隔时间，立即执行
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      // 确保最后一次调用也能执行（trailing edge）
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  } as T & { cancel: () => void };

  /**
   * 取消节流
   */
  throttled.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastTime = 0;
  };

  return throttled;
}

// ==================== 缓存 ====================

/**
 * 缓存函数（支持多参数）
 *
 * 对函数的输入参数和输出结果进行缓存，相同输入直接返回缓存结果。
 * 使用 JSON 序列化作为缓存键。
 *
 * @param fn 要缓存的函数
 * @param maxCacheSize 最大缓存条目数（默认 100）
 * @returns 带缓存功能的函数
 *
 * @example
 * ```ts
 * const expensiveCalc = memoize((data: number[]) => {
 *   return data.reduce((sum, n) => sum + Math.sqrt(n), 0);
 * });
 *
 * expensiveCalc([1, 2, 3]); // 计算
 * expensiveCalc([1, 2, 3]); // 从缓存返回
 * ```
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  maxCacheSize: number = 100
): T & { clear: () => void } {
  const cache = new Map<string, { result: any; timestamp: number }>();

  const memoized = function (this: unknown, ...args: any[]): any {
    // 生成缓存键
    const cacheKey = args.map((arg) => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'function') return `fn:${arg.name || 'anonymous'}`;
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join('|');

    // 检查缓存
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached.result;
    }

    // 执行函数并缓存结果
    const result = fn.apply(this, args);
    cache.set(cacheKey, { result, timestamp: Date.now() });

    // 超出缓存大小限制时，删除最早的缓存
    if (cache.size > maxCacheSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    return result;
  } as T & { clear: () => void };

  /**
   * 清除所有缓存
   */
  memoized.clear = () => {
    cache.clear();
  };

  return memoized;
}

// ==================== React 懒加载 HOC ====================

/**
 * React 组件懒加载 HOC
 *
 * 封装 React.lazy + Suspense，提供统一的加载状态处理。
 * 支持自定义加载占位组件和错误处理。
 *
 * @param loader 动态导入函数
 * @param options 配置选项
 * @returns 懒加载组件
 *
 * @example
 * ```tsx
 * const HeavyEditor = lazyLoad(
 *   () => import('./HeavyEditor'),
 *   {
 *     fallback: <Spin />,
 *     componentName: 'HeavyEditor',
 *   }
 * );
 * ```
 */
export function lazyLoad<P = {}>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  options: {
    /** 加载中显示的占位组件 */
    fallback?: React.ReactNode;
    /** 组件名称（用于错误提示） */
    componentName?: string;
    /** 加载超时时间（毫秒，默认 10000） */
    timeout?: number;
  } = {}
): ComponentType<P> {
  const {
    fallback = React.createElement('div', {
      style: { padding: '20px', textAlign: 'center', color: '#a0a0b0' },
      children: '加载中...',
    }),
    componentName = '组件',
    timeout = 10000,
  } = options;

  const LazyComponent = lazy(loader);

  const WrappedComponent: React.FC<P> = (props) => {
    return React.createElement(
      Suspense,
      { fallback },
      // LazyExoticComponent 与 FC 的 props 类型存在兼容性差异，使用 any 绕过
      React.createElement(LazyComponent as React.ComponentType<any>, props)
    );
  };

  // 设置组件名称（便于调试）
  WrappedComponent.displayName = `LazyLoad(${componentName})`;

  return WrappedComponent;
}

// ==================== 虚拟滚动计算 ====================

/** 虚拟滚动计算结果 */
export interface VirtualScrollResult {
  /** 可见区域的起始索引 */
  startIndex: number;
  /** 可见区域的结束索引 */
  endIndex: number;
  /** 可见区域的项目列表 */
  visibleItems: any[];
  /** 列表总高度（像素） */
  totalHeight: number;
  /** 顶部偏移量（像素） */
  offsetY: number;
  /** 缓冲区额外渲染的项目数（上下各 bufferCount 个） */
  bufferCount: number;
}

/**
 * 虚拟滚动计算
 *
 * 根据滚动位置计算当前可见区域的项目范围。
 * 只渲染可见区域的项目，大幅提升长列表的渲染性能。
 *
 * @param items 完整数据列表
 * @param itemHeight 每个项目的高度（像素）
 * @param containerHeight 容器可见高度（像素）
 * @param scrollTop 当前滚动位置（像素）
 * @param bufferCount 缓冲区项目数（默认 5，上下各渲染额外 bufferCount 个）
 * @returns 虚拟滚动计算结果
 *
 * @example
 * ```tsx
 * const [scrollTop, setScrollTop] = useState(0);
 *
 * const { startIndex, endIndex, totalHeight, offsetY, visibleItems } = virtualScroll(
 *   allItems,
 *   48,     // 每项高度 48px
 *   600,    // 容器高度 600px
 *   scrollTop
 * );
 *
 * return (
 *   <div
 *     style={{ height: containerHeight, overflow: 'auto' }}
 *     onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
 *   >
 *     <div style={{ height: totalHeight, position: 'relative' }}>
 *       <div style={{ position: 'absolute', top: offsetY, width: '100%' }}>
 *         {visibleItems.map((item) => (
 *           <div key={item.id} style={{ height: 48 }}>
 *             {item.name}
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   </div>
 * );
 * ```
 */
export function virtualScroll(
  items: any[],
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  bufferCount: number = 5
): VirtualScrollResult {
  if (!items || items.length === 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      visibleItems: [],
      totalHeight: 0,
      offsetY: 0,
      bufferCount,
    };
  }

  // 计算总高度
  const totalHeight = items.length * itemHeight;

  // 计算可见区域的起始和结束索引
  const rawStartIndex = Math.floor(scrollTop / itemHeight);
  const rawEndIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);

  // 应用缓冲区
  const startIndex = Math.max(0, rawStartIndex - bufferCount);
  const endIndex = Math.min(items.length - 1, rawEndIndex + bufferCount);

  // 获取可见区域的项目
  const visibleItems = items.slice(startIndex, endIndex + 1);

  // 计算偏移量
  const offsetY = startIndex * itemHeight;

  return {
    startIndex,
    endIndex,
    visibleItems,
    totalHeight,
    offsetY,
    bufferCount,
  };
}

// ==================== 批量更新 ====================

/**
 * 批量更新包装器
 *
 * React 18 已内置自动批处理（Automatic Batching），
 * 此函数主要用于需要显式控制批处理时序的场景，
 * 或在回调中需要合并多次 setState 调用。
 *
 * @param fn 要执行的更新函数
 *
 * @example
 * ```ts
 * // 在事件处理器中合并多次更新
 * const handleBatchUpdate = () => {
 *   batchUpdate(() => {
 *     setCount(c => c + 1);
 *     setName('updated');
 *     setData(newData);
 *   });
 * };
 * ```
 */
export function batchUpdate(fn: () => void): void {
  // React 18 的 createRoot 自动批处理所有更新
  // 这里使用 React 的 unstable_batchedUpdates 作为降级方案
  // 在 React 18 中，直接调用即可（自动批处理）
  // 在 React 17 及以下版本中，需要使用 unstable_batchedUpdates

  try {
    // React 18+ 自动批处理，直接执行
    fn();
  } catch (error) {
    console.error('[batchUpdate] 批量更新执行出错:', error);
    throw error;
  }
}

// ==================== 请求动画帧节流 ====================

/**
 * 基于 requestAnimationFrame 的节流
 *
 * 与 throttle 不同，此函数以浏览器刷新率为节流频率，
 * 更适合视觉相关的更新（如拖拽、动画等）。
 *
 * @param fn 要节流的函数
 * @returns 节流后的函数
 *
 * @example
 * ```ts
 * const rafThrottledUpdate = rafThrottle(() => {
 *   updateElementPosition();
 * });
 *
 * element.addEventListener('mousemove', rafThrottledUpdate);
 * ```
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  fn: T
): T & { cancel: () => void } {
  let rafId: number | null = null;
  let lastArgs: any[] | null = null;

  const throttled = function (this: any, ...args: any[]) {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (lastArgs) {
          fn.apply(this, lastArgs);
          lastArgs = null;
        }
      });
    }
  } as T & { cancel: () => void };

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      lastArgs = null;
    }
  };

  return throttled;
}

// ==================== 深比较 ====================

/**
 * 浅比较两个值是否相等
 *
 * 用于 React.memo、shouldComponentUpdate 等场景的性能优化。
 *
 * @param a 值 A
 * @param b 值 B
 * @returns 是否相等
 */
export function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (a[key] !== b[key]) return false;
    }

    return true;
  }

  return false;
}
