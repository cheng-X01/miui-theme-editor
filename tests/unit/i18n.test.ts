/**
 * MIUI Theme Editor - 国际化 (i18n) 单元测试
 *
 * 测试范围：
 * - 翻译切换功能
 * - fallback 机制
 * - 语言变更监听器
 * - useTranslation Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  getLocale,
  setLocale,
  t,
  onLocaleChange,
  useTranslation,
  type Locale,
} from '../../src/renderer/i18n';

// ==================== 测试套件 ====================

describe('i18n', () => {
  beforeEach(() => {
    // 每次测试前重置为中文
    setLocale('zh-CN');
  });

  /**
   * 测试1：默认语言为中文
   */
  it('默认语言应该是中文', () => {
    expect(getLocale()).toBe('zh-CN');
  });

  /**
   * 测试2：翻译切换功能 - 中文
   */
  it('应该正确返回中文翻译', () => {
    expect(t('btn.save')).toBe('保存');
    expect(t('btn.cancel')).toBe('取消');
    expect(t('settings.title')).toBe('设置');
    expect(t('editor.icons')).toBe('图标');
  });

  /**
   * 测试3：翻译切换功能 - 英文
   */
  it('应该正确返回英文翻译', () => {
    setLocale('en-US');
    expect(t('btn.save')).toBe('Save');
    expect(t('btn.cancel')).toBe('Cancel');
    expect(t('settings.title')).toBe('Settings');
    expect(t('editor.icons')).toBe('Icons');
  });

  /**
   * 测试4：fallback 机制 - 不存在的 key 返回 key 本身
   */
  it('对于不存在的翻译 key 应该返回 key 本身', () => {
    const nonExistentKey = 'this.key.does.not.exist';
    expect(t(nonExistentKey)).toBe(nonExistentKey);
  });

  /**
   * 测试5：fallback 机制 - 指定语言不存在时返回 key
   */
  it('对于指定语言不存在的 key 应该返回 key 本身', () => {
    // 中文下不存在的 key
    expect(t('nonexistent.key')).toBe('nonexistent.key');

    // 切换到英文再测试
    setLocale('en-US');
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  /**
   * 测试6：语言变更监听器
   */
  it('应该正确触发语言变更监听器', () => {
    const listener = vi.fn();
    const unsubscribe = onLocaleChange(listener);

    // 切换语言
    setLocale('en-US');
    expect(listener).toHaveBeenCalledWith('en-US');

    // 再次切换
    setLocale('zh-CN');
    expect(listener).toHaveBeenCalledWith('zh-CN');
    expect(listener).toHaveBeenCalledTimes(2);

    // 取消监听
    unsubscribe();

    // 再次切换，监听器不应被调用
    setLocale('en-US');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  /**
   * 测试7：useTranslation Hook - 初始状态
   */
  it('useTranslation Hook 应该返回正确的初始状态', () => {
    setLocale('zh-CN');
    const { result } = renderHook(() => useTranslation());

    expect(result.current.locale).toBe('zh-CN');
    expect(result.current.t('btn.save')).toBe('保存');
  });

  /**
   * 测试8：useTranslation Hook - 语言切换
   */
  it('useTranslation Hook 应该响应语言切换', () => {
    setLocale('zh-CN');
    const { result } = renderHook(() => useTranslation());

    // 初始为中文
    expect(result.current.t('btn.save')).toBe('保存');

    // 切换到英文
    act(() => {
      result.current.setLocale('en-US');
    });

    expect(result.current.locale).toBe('en-US');
    expect(result.current.t('btn.save')).toBe('Save');

    // 切换回中文
    act(() => {
      result.current.setLocale('zh-CN');
    });

    expect(result.current.locale).toBe('zh-CN');
    expect(result.current.t('btn.save')).toBe('保存');
  });

  /**
   * 测试9：多个监听器独立工作
   */
  it('多个监听器应该独立工作', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsubscribe1 = onLocaleChange(listener1);
    const unsubscribe2 = onLocaleChange(listener2);

    setLocale('en-US');

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    // 取消第一个监听器
    unsubscribe1();

    setLocale('zh-CN');

    expect(listener1).toHaveBeenCalledTimes(1); // 不再增加
    expect(listener2).toHaveBeenCalledTimes(2);

    unsubscribe2();
  });

  /**
   * 测试10：t 函数支持指定语言参数
   */
  it('t 函数应该支持指定语言参数', () => {
    // 当前语言为中文
    setLocale('zh-CN');

    // 不指定语言，使用当前语言
    expect(t('btn.save')).toBe('保存');

    // 指定英文
    expect(t('btn.save', 'en-US')).toBe('Save');

    // 指定中文
    expect(t('btn.save', 'zh-CN')).toBe('保存');

    // 当前语言仍为中文
    expect(getLocale()).toBe('zh-CN');
  });
});
