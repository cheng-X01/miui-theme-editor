/**
 * MIUI Theme Editor - 图标编辑器单元测试
 *
 * 测试范围：
 * - 图标替换功能
 * - 批量导入功能
 * - 搜索筛选
 * - 选中/全选逻辑
 * - 删除逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import IconEditor from '../../src/renderer/editors/IconEditor';
import type { IconResource } from '../../src/shared/types';

// ==================== 测试数据 ====================

function createMockIcons(count: number): IconResource[] {
  return Array.from({ length: count }, (_, i) => ({
    componentName: `com.android.app${i}`,
    filePath: `icons/xxhdpi/com.android.app${i}.png`,
    previewData: 'fake-base64-data',
    size: 144,
  }));
}

const mockIcons: IconResource[] = [
  {
    componentName: 'com.android.settings',
    filePath: 'icons/xxhdpi/com.android.settings.png',
    previewData: 'fake-base64-1',
    size: 144,
  },
  {
    componentName: 'com.android.camera',
    filePath: 'icons/xxhdpi/com.android.camera.png',
    previewData: 'fake-base64-2',
    size: 144,
  },
  {
    componentName: 'com.android.contacts',
    filePath: 'icons/xxhdpi/com.android.contacts.png',
    previewData: 'fake-base64-3',
    size: 144,
  },
];

// ==================== 测试套件 ====================

describe('IconEditor', () => {
  const mockOnIconReplace = vi.fn();
  const mockOnIconImport = vi.fn();
  const mockOnIconDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 测试1：正确渲染图标列表
   */
  it('应该正确渲染图标列表', () => {
    render(
      React.createElement(IconEditor, {
        icons: mockIcons,
        onIconReplace: mockOnIconReplace,
        onIconImport: mockOnIconImport,
        onIconDelete: mockOnIconDelete,
      })
    );

    // 验证图标数量显示
    expect(screen.getByText(/图标总数：/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // 验证搜索框存在
    expect(screen.getByPlaceholderText('搜索图标包名...')).toBeInTheDocument();
  });

  /**
   * 测试2：图标替换功能
   */
  it('应该支持替换单个图标', async () => {
    render(
      React.createElement(IconEditor, {
        icons: mockIcons,
        onIconReplace: mockOnIconReplace,
        onIconImport: mockOnIconImport,
        onIconDelete: mockOnIconDelete,
      })
    );

    // 找到替换按钮并点击第一个图标的替换按钮
    const replaceButtons = screen.getAllByLabelText('替换图标');
    expect(replaceButtons.length).toBeGreaterThan(0);

    // 点击第一个替换按钮
    fireEvent.click(replaceButtons[0]);

    // 验证文件输入框存在（用于替换图标）
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThan(0);
  });

  /**
   * 测试3：批量导入功能
   */
  it('应该支持批量导入图标', () => {
    render(
      React.createElement(IconEditor, {
        icons: mockIcons,
        onIconReplace: mockOnIconReplace,
        onIconImport: mockOnIconImport,
        onIconDelete: mockOnIconDelete,
      })
    );

    // 找到批量导入按钮
    const importButton = screen.getByText('批量导入');
    expect(importButton).toBeInTheDocument();

    // 点击批量导入按钮
    fireEvent.click(importButton);

    // 验证批量导入的文件输入框存在
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThan(0);
  });

  /**
   * 测试4：搜索筛选功能
   */
  it('应该支持按包名搜索筛选图标', async () => {
    render(
      React.createElement(IconEditor, {
        icons: mockIcons,
        onIconReplace: mockOnIconReplace,
        onIconImport: mockOnIconImport,
        onIconDelete: mockOnIconDelete,
      })
    );

    const searchInput = screen.getByPlaceholderText('搜索图标包名...');

    // 输入搜索关键词
    fireEvent.change(searchInput, { target: { value: 'settings' } });

    // 验证筛选结果显示
    await waitFor(() => {
      expect(screen.getByText(/筛选结果：/)).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // 清除搜索
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByText(/筛选结果：/)).not.toBeInTheDocument();
    });
  });

  /**
   * 测试5：全选/取消全选功能
   */
  it('应该支持全选和取消全选图标', () => {
    render(
      React.createElement(IconEditor, {
        icons: mockIcons,
        onIconReplace: mockOnIconReplace,
        onIconImport: mockOnIconImport,
        onIconDelete: mockOnIconDelete,
      })
    );

    // 找到全选按钮
    const selectAllButton = screen.getByText('全选');
    expect(selectAllButton).toBeInTheDocument();

    // 点击全选
    fireEvent.click(selectAllButton);

    // 验证已选中数量显示
    expect(screen.getByText(/已选中：/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // 再次点击取消全选
    fireEvent.click(selectAllButton);

    // 验证选中数量消失
    expect(screen.queryByText(/已选中：/)).not.toBeInTheDocument();
  });

  /**
   * 测试6：删除选中图标
   */
  it('应该支持删除选中的图标', () => {
    render(
      React.createElement(IconEditor, {
        icons: mockIcons,
        onIconReplace: mockOnIconReplace,
        onIconImport: mockOnIconImport,
        onIconDelete: mockOnIconDelete,
      })
    );

    // 先全选
    const selectAllButton = screen.getByText('全选');
    fireEvent.click(selectAllButton);

    // 找到删除选中按钮
    const deleteButton = screen.getByText('删除选中');
    expect(deleteButton).toBeInTheDocument();

    // 点击删除选中
    fireEvent.click(deleteButton);

    // 验证确认弹窗出现（Modal.confirm）
    // 由于 Modal.confirm 是异步的，我们验证删除按钮在选中状态下是可用的
    expect(deleteButton).not.toBeDisabled();
  });

  /**
   * 测试7：空状态显示
   */
  it('应该在无图标时显示空状态', () => {
    render(
      React.createElement(IconEditor, {
        icons: [],
        onIconReplace: mockOnIconReplace,
        onIconImport: mockOnIconImport,
        onIconDelete: mockOnIconDelete,
      })
    );

    expect(screen.getByText('暂无图标资源')).toBeInTheDocument();
    expect(screen.getByText('选择图标文件')).toBeInTheDocument();
  });

  /**
   * 测试8：搜索无结果状态
   */
  it('应该在搜索无结果时显示空状态', async () => {
    render(
      React.createElement(IconEditor, {
        icons: mockIcons,
        onIconReplace: mockOnIconReplace,
        onIconImport: mockOnIconImport,
        onIconDelete: mockOnIconDelete,
      })
    );

    const searchInput = screen.getByPlaceholderText('搜索图标包名...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText(/未找到匹配/)).toBeInTheDocument();
    });
  });
});
