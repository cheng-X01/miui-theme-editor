/**
 * MIUI Theme Editor - 配色编辑器组件
 *
 * 功能：
 * - 颜色值列表展示（名称 + 颜色预览 + 十六进制值）
 * - 点击颜色值打开颜色选择器修改
 * - 批量修改颜色值（选择多个后统一修改）
 * - 搜索/筛选颜色值
 * - 颜色分组展示（按模块分组：framework-res, systemui, notification 等）
 * - 导入/导出颜色方案（JSON格式）
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Input,
  Button,
  Space,
  Modal,
  message,
  Tooltip,
  Tag,
  Empty,
  Typography,
  Checkbox,
  Badge,
  Tree,
  Popover,
} from 'antd';
import {
  SearchOutlined,
  ExportOutlined,
  ImportOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  MinusOutlined,
  AppstoreOutlined,
  PaletteOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  CopyOutlined,
  SwapOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { HexColorPicker } from 'react-colorful';

const { Text } = Typography;

// ==================== 类型定义 ====================

/** 颜色值数据 */
export interface ColorValue {
  /** 颜色名称 */
  name: string;
  /** 颜色值（#RRGGBB） */
  value: string;
  /** 所属模块 */
  module: string;
}

/** 配色编辑器组件 Props */
export interface ColorEditorProps {
  /** 颜色值列表 */
  colors: ColorValue[];
  /** 单个颜色修改回调 */
  onColorChange: (name: string, value: string) => void;
  /** 批量颜色修改回调 */
  onColorBatchChange: (names: string[], value: string) => void;
}

/** 颜色分组数据 */
interface ColorGroup {
  /** 模块名称 */
  module: string;
  /** 该模块下的颜色列表 */
  colors: ColorValue[];
}

/** 树节点数据 */
interface TreeNode {
  /** 节点标题 */
  title: string;
  /** 节点键值 */
  key: string;
  /** 子节点 */
  children?: TreeNode[];
  /** 是否为叶子节点 */
  isLeaf?: boolean;
}

// ==================== 工具函数 ====================

/**
 * 验证十六进制颜色值格式
 * 支持 #RGB, #RRGGBB 格式
 */
const isValidHexColor = (value: string): boolean => {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
};

/**
 * 将颜色值标准化为 #RRGGBB 格式
 */
const normalizeColor = (value: string): string => {
  const hex = value.replace('#', '');
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  return `#${hex.toUpperCase()}`;
};

/**
 * 从颜色名称中提取简短显示名
 * 例如: color_primary_text -> primary_text
 */
const extractColorDisplayName = (name: string): string => {
  // 去掉常见前缀
  const prefixes = ['color_', 'bg_', 'text_', 'accent_'];
  let shortName = name;
  for (const prefix of prefixes) {
    if (shortName.startsWith(prefix)) {
      shortName = shortName.slice(prefix.length);
      break;
    }
  }
  return shortName;
};

/**
 * 判断颜色是否为浅色（用于决定文字颜色）
 */
const isLightColor = (hex: string): boolean => {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  // 使用亮度公式判断
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

// ==================== 颜色选择器弹窗子组件 ====================

/** 颜色选择器弹窗 Props */
interface ColorPickerPopoverProps {
  /** 当前颜色值 */
  color: string;
  /** 颜色名称 */
  colorName: string;
  /** 颜色修改回调 */
  onChange: (value: string) => void;
  /** 子元素（触发器） */
  children: React.ReactNode;
}

/**
 * 颜色选择器弹出框
 * 使用 react-colorful 的 HexColorPicker
 */
const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  color,
  colorName,
  onChange,
  children,
}) => {
  const [inputValue, setInputValue] = useState(color);

  /**
   * 处理颜色选择器变化
   */
  const handleColorChange = useCallback(
    (newColor: string) => {
      const normalized = normalizeColor(newColor);
      setInputValue(normalized);
      onChange(normalized);
    },
    [onChange]
  );

  /**
   * 处理手动输入十六进制值
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      if (isValidHexColor(val)) {
        onChange(normalizeColor(val));
      }
    },
    [onChange]
  );

  return (
    <Popover
      trigger="click"
      placement="left"
      title={
        <Space>
          <PaletteOutlined />
          <span>{colorName}</span>
        </Space>
      }
      content={
        <div style={{ width: '240px' }}>
          {/* 颜色选择器 */}
          <HexColorPicker
            color={color}
            onChange={handleColorChange}
            style={{ width: '100%' }}
          />

          {/* 手动输入十六进制值 */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Input
              value={inputValue}
              onChange={handleInputChange}
              placeholder="#RRGGBB"
              prefix={<EditOutlined style={{ fontSize: '12px' }} />}
              style={{
                flex: 1,
                fontSize: '12px',
                background: 'rgba(255,255,255,0.05)',
                borderColor: '#2a2a4a',
              }}
            />
            {/* 当前颜色预览 */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: color,
                flexShrink: 0,
              }}
            />
          </div>
        </div>
      }
      styles={{
        body: {
          background: '#16213e',
          border: '1px solid #2a2a4a',
          borderRadius: '8px',
          padding: '12px',
        },
      }}
    >
      {children}
    </Popover>
  );
};

// ==================== 颜色行子组件 ====================

/** 颜色行 Props */
interface ColorRowProps {
  /** 颜色数据 */
  color: ColorValue;
  /** 是否选中 */
  selected: boolean;
  /** 选中状态变更回调 */
  onSelectChange: (name: string, checked: boolean) => void;
  /** 颜色修改回调 */
  onColorChange: (name: string, value: string) => void;
}

/**
 * 单个颜色行组件
 * 显示颜色预览块、名称、十六进制值和操作按钮
 */
const ColorRow: React.FC<ColorRowProps> = ({
  color,
  selected,
  onSelectChange,
  onColorChange,
}) => {
  /**
   * 复制颜色值到剪贴板
   */
  const handleCopyValue = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(color.value).then(() => {
        message.success(`已复制 ${color.value}`);
      }).catch(() => {
        message.error('复制失败');
      });
    },
    [color.value]
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        background: selected
          ? 'rgba(255,107,107,0.08)'
          : 'rgba(255,255,255,0.02)',
        border: selected
          ? '1px solid rgba(255,107,107,0.3)'
          : '1px solid rgba(255,255,255,0.05)',
        borderRadius: '6px',
        marginBottom: '4px',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      }}
      onClick={() => onSelectChange(color.name, !selected)}
    >
      {/* 选中复选框 */}
      <Checkbox
        checked={selected}
        onChange={(e) => {
          e.stopPropagation();
          onSelectChange(color.name, e.target.checked);
        }}
        style={{ marginRight: '10px' }}
      />

      {/* 颜色预览块（可点击打开颜色选择器） */}
      <ColorPickerPopover
        color={color.value}
        colorName={color.name}
        onChange={(value) => onColorChange(color.name, value)}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: color.value,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'transform 0.15s ease',
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
          }}
        />
      </ColorPickerPopover>

      {/* 颜色名称 */}
      <Tooltip title={color.name} placement="topLeft">
        <Text
          ellipsis
          style={{
            color: '#e0e0e0',
            fontSize: '12px',
            marginLeft: '10px',
            flex: 1,
            minWidth: 0,
          }}
        >
          {extractColorDisplayName(color.name)}
        </Text>
      </Tooltip>

      {/* 十六进制值 */}
      <Text
        code
        style={{
          color: '#a0a0b0',
          fontSize: '11px',
          fontFamily: 'monospace',
          background: 'rgba(255,255,255,0.05)',
          padding: '2px 6px',
          borderRadius: '3px',
          marginRight: '8px',
          flexShrink: 0,
        }}
      >
        {color.value}
      </Text>

      {/* 复制按钮 */}
      <Tooltip title="复制颜色值">
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          onClick={handleCopyValue}
          style={{ color: '#a0a0b0', flexShrink: 0 }}
        />
      </Tooltip>
    </div>
  );
};

// ==================== 主组件 ====================

/**
 * 配色编辑器主组件
 *
 * 提供完整的颜色管理功能：
 * - 左侧分组树（按模块分组）
 * - 右侧颜色值列表
 * - 搜索筛选
 * - 单个/批量颜色修改
 * - 导入/导出颜色方案（JSON格式）
 */
const ColorEditor: React.FC<ColorEditorProps> = ({
  colors,
  onColorChange,
  onColorBatchChange,
}) => {
  // -------------------- 状态 --------------------

  /** 搜索关键词 */
  const [searchText, setSearchText] = useState('');

  /** 选中的颜色名称集合 */
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());

  /** 当前选中的模块分组（左侧树选中） */
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  /** 批量修改弹窗状态 */
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchColor, setBatchColor] = useState('#FF6B6B');

  /** 导入文件输入引用 */
  const importInputRef = useRef<HTMLInputElement>(null);

  // -------------------- 计算属性 --------------------

  /**
   * 按模块分组颜色
   */
  const colorGroups: ColorGroup[] = useMemo(() => {
    const groupMap = new Map<string, ColorValue[]>();
    colors.forEach((color) => {
      const module = color.module || '未分组';
      if (!groupMap.has(module)) {
        groupMap.set(module, []);
      }
      groupMap.get(module)!.push(color);
    });

    return Array.from(groupMap.entries()).map(([module, groupColors]) => ({
      module,
      colors: groupColors,
    }));
  }, [colors]);

  /**
   * 构建左侧分组树数据
   */
  const treeData: TreeNode[] = useMemo(() => {
    const allNode: TreeNode = {
      title: (
        <Space>
          <AppstoreOutlined />
          <span>全部颜色</span>
          <Tag
            style={{ fontSize: '10px', lineHeight: '16px', padding: '0 4px', margin: 0 }}
            color="blue"
          >
            {colors.length}
          </Tag>
        </Space>
      ),
      key: '__all__',
    };

    const moduleNodes: TreeNode[] = colorGroups.map((group) => ({
      title: (
        <Space>
          <FolderOutlined />
          <span>{group.module}</span>
          <Tag
            style={{ fontSize: '10px', lineHeight: '16px', padding: '0 4px', margin: 0 }}
          >
            {group.colors.length}
          </Tag>
        </Space>
      ),
      key: group.module,
    }));

    return [allNode, ...moduleNodes];
  }, [colorGroups, colors.length]);

  /**
   * 根据搜索关键词和选中模块过滤颜色列表
   */
  const filteredColors: ColorValue[] = useMemo(() => {
    let result = colors;

    // 按模块筛选
    if (selectedModule && selectedModule !== '__all__') {
      result = result.filter((c) => c.module === selectedModule);
    }

    // 按搜索关键词筛选
    if (searchText.trim()) {
      const keyword = searchText.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(keyword) ||
          c.value.toLowerCase().includes(keyword) ||
          c.module.toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [colors, selectedModule, searchText]);

  /** 是否全选 */
  const isAllSelected =
    filteredColors.length > 0 &&
    filteredColors.every((c) => selectedNames.has(c.name));

  /** 是否部分选中 */
  const isPartialSelected =
    filteredColors.some((c) => selectedNames.has(c.name)) && !isAllSelected;

  // -------------------- 回调函数 --------------------

  /**
   * 切换单个颜色的选中状态
   */
  const handleSelectChange = useCallback((name: string, checked: boolean) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  }, []);

  /**
   * 切换全选/取消全选
   */
  const handleToggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedNames((prev) => {
        const next = new Set(prev);
        filteredColors.forEach((c) => next.delete(c.name));
        return next;
      });
    } else {
      setSelectedNames((prev) => {
        const next = new Set(prev);
        filteredColors.forEach((c) => next.add(c.name));
        return next;
      });
    }
  }, [isAllSelected, filteredColors]);

  /**
   * 处理左侧树节点选中
   */
  const handleTreeSelect = useCallback((selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const key = selectedKeys[0] as string;
      setSelectedModule(key === '__all__' ? null : key);
    }
  }, []);

  /**
   * 打开批量修改弹窗
   */
  const handleOpenBatchModal = useCallback(() => {
    if (selectedNames.size === 0) {
      message.warning('请先选择要修改的颜色');
      return;
    }
    setBatchModalOpen(true);
  }, [selectedNames]);

  /**
   * 确认批量修改
   */
  const handleConfirmBatchChange = useCallback(() => {
    const names = Array.from(selectedNames);
    onColorBatchChange(names, normalizeColor(batchColor));
    setBatchModalOpen(false);
    setSelectedNames(new Set());
    message.success(`已批量修改 ${names.length} 个颜色`);
  }, [selectedNames, batchColor, onColorBatchChange]);

  /**
   * 导出颜色方案为 JSON 文件
   */
  const handleExport = useCallback(() => {
    const data = colors.map((c) => ({
      name: c.name,
      value: c.value,
      module: c.module,
    }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'color-scheme.json';
    a.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${colors.length} 个颜色`);
  }, [colors]);

  /**
   * 触发导入文件选择
   */
  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  /**
   * 处理导入文件选择完成
   */
  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (Array.isArray(data)) {
            let importCount = 0;
            data.forEach((item: { name: string; value: string; module?: string }) => {
              if (item.name && item.value && isValidHexColor(item.value)) {
                onColorChange(item.name, normalizeColor(item.value));
                importCount++;
              }
            });
            message.success(`已导入 ${importCount} 个颜色`);
          } else {
            message.error('无效的颜色方案文件格式');
          }
        } catch {
          message.error('无法解析 JSON 文件');
        }
      };
      reader.readAsText(file);
      // 重置 input
      e.target.value = '';
    },
    [onColorChange]
  );

  /**
   * 清除所有选中
   */
  const handleClearSelection = useCallback(() => {
    setSelectedNames(new Set());
  }, []);

  // -------------------- 渲染 --------------------

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#1a1a2e',
      }}
    >
      {/* ==================== 顶部工具栏 ==================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#0f0f23',
          borderBottom: '1px solid #2a2a4a',
          borderRadius: '8px 8px 0 0',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        {/* 左侧：搜索框 */}
        <Input
          placeholder="搜索颜色名称或值..."
          prefix={<SearchOutlined style={{ color: '#a0a0b0' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{
            width: '280px',
            background: 'rgba(255,255,255,0.05)',
            borderColor: '#2a2a4a',
          }}
        />

        {/* 右侧：操作按钮组 */}
        <Space size="small">
          {/* 全选/取消全选 */}
          <Tooltip title={isAllSelected ? '取消全选' : '全选当前列表'}>
            <Button
              type={isAllSelected ? 'primary' : 'default'}
              size="small"
              icon={
                isAllSelected ? (
                  <CheckOutlined />
                ) : isPartialSelected ? (
                  <MinusOutlined />
                ) : (
                  <AppstoreOutlined />
                )
              }
              onClick={handleToggleSelectAll}
              disabled={filteredColors.length === 0}
              style={
                !isAllSelected
                  ? {
                      background: 'rgba(255,255,255,0.05)',
                      borderColor: '#2a2a4a',
                      color: '#a0a0b0',
                    }
                  : undefined
              }
            >
              全选
            </Button>
          </Tooltip>

          {/* 批量修改 */}
          <Tooltip title="将选中颜色统一修改为同一颜色">
            <Badge count={selectedNames.size} offset={[-4, 4]} size="small">
              <Button
                type="default"
                size="small"
                icon={<SwapOutlined />}
                onClick={handleOpenBatchModal}
                disabled={selectedNames.size === 0}
                style={
                  selectedNames.size === 0
                    ? {
                        background: 'rgba(255,255,255,0.05)',
                        borderColor: '#2a2a4a',
                        color: '#a0a0b0',
                      }
                    : undefined
                }
              >
                批量修改
              </Button>
            </Badge>
          </Tooltip>

          {/* 清除选中 */}
          {selectedNames.size > 0 && (
            <Tooltip title="清除所有选中">
              <Button
                type="text"
                size="small"
                icon={<ClearOutlined />}
                onClick={handleClearSelection}
                style={{ color: '#a0a0b0' }}
              />
            </Tooltip>
          )}

          {/* 导出 */}
          <Tooltip title="导出颜色方案为 JSON 文件">
            <Button
              type="default"
              size="small"
              icon={<ExportOutlined />}
              onClick={handleExport}
              disabled={colors.length === 0}
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderColor: '#2a2a4a',
                color: '#a0a0b0',
              }}
            >
              导出
            </Button>
          </Tooltip>

          {/* 导入 */}
          <Tooltip title="从 JSON 文件导入颜色方案">
            <Button
              type="default"
              size="small"
              icon={<ImportOutlined />}
              onClick={handleImportClick}
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderColor: '#2a2a4a',
                color: '#a0a0b0',
              }}
            >
              导入
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* ==================== 主体区域：左侧分组树 + 右侧颜色列表 ==================== */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* 左侧：分组树 */}
        <div
          style={{
            width: '220px',
            flexShrink: 0,
            borderRight: '1px solid #2a2a4a',
            background: 'rgba(255,255,255,0.02)',
            overflow: 'auto',
            padding: '8px 0',
          }}
        >
          <Tree
            treeData={treeData}
            selectedKeys={selectedModule ? [selectedModule] : ['__all__']}
            onSelect={handleTreeSelect}
            style={{
              background: 'transparent',
              color: '#e0e0e0',
              fontSize: '13px',
            }}
            // 暗色主题树样式覆盖
            styles={{
              nodeSelected: {
                background: 'rgba(255,107,107,0.15) !important',
              },
            }}
          />
        </div>

        {/* 右侧：颜色值列表 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px 16px',
          }}
        >
          {filteredColors.length > 0 ? (
            <div>
              {/* 当前分组标题 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {selectedModule || '全部'} ({filteredColors.length} 个颜色)
                </Text>
              </div>

              {/* 颜色列表 */}
              {filteredColors.map((color) => (
                <ColorRow
                  key={color.name}
                  color={color}
                  selected={selectedNames.has(color.name)}
                  onSelectChange={handleSelectChange}
                  onColorChange={onColorChange}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 0',
              }}
            >
              {colors.length === 0 ? (
                /* 无颜色数据时的空状态 */
                <>
                  <Empty
                    description="暂无颜色数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ marginBottom: '16px' }}
                  />
                  <Space direction="vertical" align="center" size="small">
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      点击「导入」加载颜色方案，或打开主题文件自动解析
                    </Text>
                  </Space>
                </>
              ) : (
                /* 搜索无结果时的空状态 */
                <Empty
                  description={`未找到匹配 "${searchText}" 的颜色`}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setSearchText('')}
                  >
                    清除搜索
                  </Button>
                </Empty>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================== 底部状态栏 ==================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: '#0f0f23',
          borderTop: '1px solid #2a2a4a',
          borderRadius: '0 0 8px 8px',
        }}
      >
        <Space size="middle">
          <Text type="secondary" style={{ fontSize: '12px' }}>
            颜色总数：
            <Text style={{ color: '#e0e0e0' }}>{colors.length}</Text>
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            模块数：
            <Text style={{ color: '#e0e0e0' }}>{colorGroups.length}</Text>
          </Text>
          {searchText && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              筛选结果：
              <Text style={{ color: '#e0e0e0' }}>{filteredColors.length}</Text>
            </Text>
          )}
        </Space>
        {selectedNames.size > 0 && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            已选中：
            <Text style={{ color: '#ff6b6b' }}>{selectedNames.size}</Text> 个颜色
          </Text>
        )}
      </div>

      {/* ==================== 批量修改弹窗 ==================== */}
      <Modal
        title={
          <Space>
            <SwapOutlined />
            <span>批量修改颜色</span>
          </Space>
        }
        open={batchModalOpen}
        onOk={handleConfirmBatchChange}
        onCancel={() => setBatchModalOpen(false)}
        okText="应用修改"
        cancelText="取消"
        width={360}
        centered
        styles={{
          body: {
            background: '#0f0f23',
            padding: '24px',
          },
          header: {
            background: '#16213e',
            borderBottom: '1px solid #2a2a4a',
          },
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '16px' }}>
            将选中的 {selectedNames.size} 个颜色统一修改为以下颜色
          </Text>

          {/* 颜色选择器 */}
          <HexColorPicker
            color={batchColor}
            onChange={setBatchColor}
            style={{ width: '100%', marginBottom: '12px' }}
          />

          {/* 当前选择的颜色值 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: batchColor,
              }}
            />
            <Text code style={{ color: '#a0a0b0', fontSize: '12px' }}>
              {normalizeColor(batchColor)}
            </Text>
          </div>
        </div>
      </Modal>

      {/* ==================== 隐藏的导入文件输入 ==================== */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
    </div>
  );
};

export default ColorEditor;
