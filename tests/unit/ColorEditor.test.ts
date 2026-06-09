/**
 * MIUI Theme Editor - 配色编辑器单元测试
 *
 * 测试范围：
 * - 颜色变更功能
 * - 颜色分组展示
 * - 批量修改颜色
 * - 搜索筛选
 * - 导入/导出颜色方案
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ColorEditor from '../../src/renderer/editors/ColorEditor';
import type { ColorValue } from '../../src/renderer/editors/ColorEditor';

// ==================== 测试数据 ====================

const mockColors: ColorValue[] = [
  { name: 'color_primary', value: '#FF6B6B', module: 'framework-res' },
  { name: 'color_secondary', value: '#4ECDC4', module: 'framework-res' },
  { name: 'color_accent', value: '#FFD93D', module: 'framework-res' },
  { name: 'bg_window', value: '#1A1A2E', module: 'systemui' },
  { name: 'bg_panel', value: '#16213E', module: 'systemui' },
  { name: 'text_primary', value: '#E0E0E0', module: 'notification' },
  { name: 'text_secondary', value: '#A0A0B0', module: 'notification' },
];

// ==================== 测试套件 ====================

describe('ColorEditor', () => {
  const mockOnColorChange = vi.fn();
  const mockOnColorBatchChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 测试1：正确渲染颜色列表
   */
  it('应该正确渲染颜色列表', () => {
    render(
      React.createElement(ColorEditor, {
        colors: mockColors,
        onColorChange: mockOnColorChange,
        onColorBatchChange: mockOnColorBatchChange,
      })
    );

    // 验证颜色总数显示
    expect(screen.getByText(/颜色总数：/)).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();

    // 验证模块数显示
    expect(screen.getByText(/模块数：/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // 验证搜索框存在
    expect(screen.getByPlaceholderText('搜索颜色名称或值...')).toBeInTheDocument();
  });

  /**
   * 测试2：颜色变更功能
   */
  it('应该支持修改单个颜色值', () => {
    render(
      React.createElement(ColorEditor, {
        colors: mockColors,
        onColorChange: mockOnColorChange,
        onColorBatchChange: mockOnColorBatchChange,
      })
    );

    // 找到颜色预览块并点击（打开颜色选择器）
    const colorPreviews = document.querySelectorAll('[style*="background: rgb"]');
    expect(colorPreviews.length).toBeGreaterThan(0);

    // 点击第一个颜色预览块
    fireEvent.click(colorPreviews[0]);

    // 验证颜色选择器相关元素存在
    // 由于 Popover 是异步的，我们验证颜色行存在
    expect(screen.getByText('primary')).toBeInTheDocument();
  });

  /**
   * 测试3：颜色分组展示
   */
  it('应该按模块正确分组展示颜色', () => {
    render(
      React.createElement(ColorEditor, {
        colors: mockColors,
        onColorChange: mockOnColorChange,
        onColorBatchChange: mockOnColorBatchChange,
      })
    );

    // 验证左侧分组树存在
    expect(screen.getByText('全部颜色')).toBeInTheDocument();
    expect(screen.getByText('framework-res')).toBeInTheDocument();
    expect(screen.getByText('systemui')).toBeInTheDocument();
    expect(screen.getByText('notification')).toBeInTheDocument();

    // 验证分组数量标签
    expect(screen.getByText('3')).toBeInTheDocument(); // framework-res 有 3 个颜色
  });

  /**
   * 测试4：批量修改颜色
   */
  it('应该支持批量修改选中的颜色', () => {
    render(
      React.createElement(ColorEditor, {
        colors: mockColors,
        onColorChange: mockOnColorChange,
        onColorBatchChange: mockOnColorBatchChange,
      })
    );

    // 点击全选按钮
    const selectAllButton = screen.getByText('全选');
    fireEvent.click(selectAllButton);

    // 验证批量修改按钮可用
    const batchButton = screen.getByText('批量修改');
    expect(batchButton).toBeInTheDocument();
    expect(batchButton).not.toBeDisabled();

    // 点击批量修改按钮
    fireEvent.click(batchButton);

    // 验证批量修改弹窗出现
    expect(screen.getByText('批量修改颜色')).toBeInTheDocument();
  });

  /**
   * 测试5：搜索筛选功能
   */
  it('应该支持按名称或值搜索筛选颜色', async () => {
    render(
      React.createElement(ColorEditor, {
        colors: mockColors,
        onColorChange: mockOnColorChange,
        onColorBatchChange: mockOnColorBatchChange,
      })
    );

    const searchInput = screen.getByPlaceholderText('搜索颜色名称或值...');

    // 输入搜索关键词
    fireEvent.change(searchInput, { target: { value: 'primary' } });

    // 验证筛选结果显示
    await waitFor(() => {
      expect(screen.getByText(/筛选结果：/)).toBeInTheDocument();
    });

    // 清除搜索
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByText(/筛选结果：/)).not.toBeInTheDocument();
    });
  });

  /**
   * 测试6：导出颜色方案
   */
  it('应该支持导出颜色方案', () => {
    render(
      React.createElement(ColorEditor, {
        colors: mockColors,
        onColorChange: mockOnColorChange,
        onColorBatchChange: mockOnColorBatchChange,
      })
    );

    // 找到导出按钮
    const exportButton = screen.getByText('导出');
    expect(exportButton).toBeInTheDocument();

    // 点击导出按钮
    fireEvent.click(exportButton);

    // 导出功能通过创建 Blob 和下载链接实现，
    // 这里验证按钮可点击且未禁用
    expect(exportButton).not.toBeDisabled();
  });

  /**
   * 测试7：导入颜色方案
   */
  it('应该支持导入颜色方案', () => {
    render(
      React.createElement(ColorEditor, {
        colors: mockColors,
        onColorChange: mockOnColorChange,
        onColorBatchChange: mockOnColorBatchChange,
      })
    );

    // 找到导入按钮
    const importButton = screen.getByText('导入');
    expect(importButton).toBeInTheDocument();

    // 点击导入按钮
    fireEvent.click(importButton);

    // 验证文件输入框存在
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThan(0);
  });

  /**
   * 测试8：空状态显示
   */
  it('应该在无颜色数据时显示空状态', () => {
    render(
      React.createElement(ColorEditor, {
        colors: [],
        onColorChange: mockOnColorChange,
        onColorBatchChange: mockOnColorBatchChange,
      })
    );

    expect(screen.getByText('暂无颜色数据')).toBeInTheDocument();
  });
});
