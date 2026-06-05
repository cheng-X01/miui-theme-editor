/**
 * MIUI Theme Editor - 图标编辑器组件
 *
 * 功能：
 * - 图标网格展示（每个图标显示包名 + 缩略图占位）
 * - 拖拽上传替换单个图标（支持 .png 文件）
 * - 批量导入图标（选择文件夹或多个文件）
 * - 图标搜索/筛选（按包名搜索）
 * - 图标删除（单个/批量）
 * - 图标预览（点击放大查看）
 * - 图标尺寸信息显示（xxhdpi 等）
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Input,
  Button,
  Card,
  Space,
  Modal,
  message,
  Tooltip,
  Badge,
  Checkbox,
  Tag,
  Empty,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  ImportOutlined,
  DeleteOutlined,
  SwapOutlined,
  EyeOutlined,
  AppstoreOutlined,
  FolderOpenOutlined,
  CheckOutlined,
  MinusOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import type { IconResource } from '../../../shared/types';
import {
  DENSITY_SIZE_MAP,
  DENSITY_LABEL_MAP,
  DENSITY_COLOR_MAP,
} from './types';
import type {
  IconEditorProps,
  DensityBucket,
  IconCardItem,
  IconPreviewModalProps,
} from './types';

const { Text } = Typography;

// ==================== 工具函数 ====================

/**
 * 根据图标文件路径推断密度桶
 * MIUI 主题包中图标路径通常包含密度信息，如:
 * - icons/xxhdpi/com.android.settings.png
 * - icons/xxxhdpi/com.android.settings.png
 */
const inferDensity = (filePath: string, size?: number): DensityBucket => {
  const path = filePath.toLowerCase();

  // 优先从路径中匹配密度桶
  if (path.includes('xxxhdpi')) return 'xxxhdpi';
  if (path.includes('xxhdpi')) return 'xxhdpi';
  if (path.includes('xhdpi')) return 'xhdpi';
  if (path.includes('hdpi')) return 'hdpi';
  if (path.includes('mdpi')) return 'mdpi';

  // 根据尺寸推断（以 launcher 图标尺寸为参考）
  if (size) {
    if (size >= 192) return 'xxxhdpi';
    if (size >= 144) return 'xxhdpi';
    if (size >= 96) return 'xhdpi';
    if (size >= 72) return 'hdpi';
    return 'mdpi';
  }

  // 默认 xxhdpi（MIUI 主题最常用的密度）
  return 'xxhdpi';
};

/**
 * 从包名中提取简短显示名称
 * 例如: com.android.settings -> settings
 */
const extractShortName = (componentName: string): string => {
  const parts = componentName.split('.');
  return parts[parts.length - 1] || componentName;
};

// ==================== 图标预览弹窗子组件 ====================

/**
 * 图标预览弹窗
 * 点击图标卡片后弹出，放大显示图标预览
 */
const IconPreviewModal: React.FC<IconPreviewModalProps> = ({
  open,
  icon,
  onClose,
}) => {
  if (!icon) return null;

  const density = inferDensity(icon.filePath, icon.size);

  return (
    <Modal
      title={
        <Space>
          <PictureOutlined />
          <span>图标预览</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px',
          background: '#0f0f23',
          borderRadius: '0 0 8px 8px',
        },
        header: {
          background: '#16213e',
          borderBottom: '1px solid #2a2a4a',
        },
      }}
    >
      {/* 预览图 */}
      <div
        style={{
          width: '192px',
          height: '192px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {icon.previewData ? (
          <img
            src={`data:image/png;base64,${icon.previewData}`}
            alt={icon.componentName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '16px',
            }}
          />
        ) : (
          <PictureOutlined style={{ fontSize: '64px', color: '#2a2a4a' }} />
        )}
      </div>

      {/* 图标信息 */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        <Text
          ellipsis
          style={{
            color: '#e0e0e0',
            fontSize: '14px',
            display: 'block',
            marginBottom: '8px',
          }}
        >
          {icon.componentName}
        </Text>
        <Space size="small">
          <Tag color={DENSITY_COLOR_MAP[density]}>
            {DENSITY_LABEL_MAP[density]}
          </Tag>
          {icon.size && (
            <Tag color="blue">
              {icon.size} x {icon.size}
            </Tag>
          )}
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {icon.filePath}
          </Text>
        </Space>
      </div>
    </Modal>
  );
};

// ==================== 图标卡片子组件 ====================

/** 图标卡片 Props */
interface IconCardProps {
  /** 图标卡片数据 */
  item: IconCardItem;
  /** 是否全选模式 */
  selectMode: boolean;
  /** 选中状态变更回调 */
  onSelectChange: (componentName: string, checked: boolean) => void;
  /** 替换图标回调 */
  onReplace: (componentName: string, file: File) => void;
  /** 删除图标回调 */
  onDelete: (componentName: string) => void;
  /** 预览图标回调 */
  onPreview: (icon: IconResource) => void;
}

/**
 * 单个图标卡片组件
 * 显示缩略图、包名、尺寸标签和操作按钮
 * 支持拖拽上传替换图标
 */
const IconCard: React.FC<IconCardProps> = ({
  item,
  selectMode,
  onSelectChange,
  onReplace,
  onDelete,
  onPreview,
}) => {
  const { icon, density, selected, dragOver } = item;
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 处理拖拽进入事件
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * 处理拖拽悬停事件（通过 CSS 类控制视觉反馈）
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 通过 state 控制高亮
    item.dragOver = true;
  }, [item]);

  /**
   * 处理拖拽离开事件
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    item.dragOver = false;
  }, [item]);

  /**
   * 处理文件拖放完成
   * 验证文件类型后触发替换回调
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      item.dragOver = false;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type === 'image/png' || file.name.endsWith('.png')) {
          onReplace(icon.componentName, file);
          message.success(`已替换图标: ${extractShortName(icon.componentName)}`);
        } else {
          message.error('仅支持 .png 格式的图标文件');
        }
      }
    },
    [icon.componentName, onReplace, item]
  );

  /**
   * 处理替换按钮点击
   * 触发隐藏的文件输入框
   */
  const handleReplaceClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 处理文件选择完成
   */
  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onReplace(icon.componentName, files[0]);
        message.success(`已替换图标: ${extractShortName(icon.componentName)}`);
      }
      // 重置 input 以允许重复选择同一文件
      e.target.value = '';
    },
    [icon.componentName, onReplace]
  );

  /**
   * 处理删除按钮点击
   */
  const handleDelete = useCallback(() => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除图标 "${icon.componentName}" 吗？此操作不可撤销。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        onDelete(icon.componentName);
        message.success('图标已删除');
      },
    });
  }, [icon.componentName, onDelete]);

  /** 卡片容器样式 */
  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: dragOver
      ? '2px dashed #ff6b6b'
          : selected
            ? '2px solid #ff6b6b'
            : '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div
      style={cardStyle}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 选中复选框（选择模式下显示） */}
      {selectMode && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: 10,
          }}
        >
          <Checkbox
            checked={selected}
            onChange={(e) =>
              onSelectChange(icon.componentName, e.target.checked)
            }
          />
        </div>
      )}

      {/* 缩略图区域 */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          background: 'rgba(255,255,255,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
        onClick={() => onPreview(icon)}
      >
        {icon.previewData ? (
          <img
            src={`data:image/png;base64,${icon.previewData}`}
            alt={icon.componentName}
            style={{
              width: '60%',
              height: '60%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <PictureOutlined
            style={{ fontSize: '36px', color: '#2a2a4a' }}
          />
        )}
      </div>

      {/* 信息区域 */}
      <div style={{ padding: '10px 12px' }}>
        {/* 包名 */}
        <Tooltip title={icon.componentName} placement="top">
          <Text
            ellipsis
            style={{
              color: '#e0e0e0',
              fontSize: '12px',
              display: 'block',
              marginBottom: '6px',
              lineHeight: '1.4',
            }}
          >
            {extractShortName(icon.componentName)}
          </Text>
        </Tooltip>

        {/* 尺寸标签 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {density && (
            <Tag
              color={DENSITY_COLOR_MAP[density]}
              style={{ fontSize: '10px', lineHeight: '18px', padding: '0 4px', margin: 0 }}
            >
              {DENSITY_LABEL_MAP[density]}
            </Tag>
          )}
          {icon.size && (
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {icon.size}px
            </Text>
          )}
        </div>

        {/* 操作按钮 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '4px',
            marginTop: '8px',
          }}
        >
          <Tooltip title="预览">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onPreview(icon);
              }}
              style={{ color: '#a0a0b0' }}
            />
          </Tooltip>
          <Tooltip title="替换图标">
            <Button
              type="text"
              size="small"
              icon={<SwapOutlined />}
              onClick={handleReplaceClick}
              style={{ color: '#a0a0b0' }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              danger
              style={{ color: '#ff4d4f' }}
            />
          </Tooltip>
        </div>
      </div>

      {/* 拖拽提示覆盖层 */}
      {dragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,107,107,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            pointerEvents: 'none',
          }}
        >
          <Space direction="vertical" align="center">
            <SwapOutlined style={{ fontSize: '24px', color: '#ff6b6b' }} />
            <Text style={{ color: '#ff6b6b', fontSize: '12px' }}>
              释放以替换图标
            </Text>
          </Space>
        </div>
      )}

      {/* 隐藏的文件输入框（用于替换图标） */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,image/png"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
    </div>
  );
};

// ==================== 主组件 ====================

/**
 * 图标编辑器主组件
 *
 * 提供完整的图标管理功能，包括：
 * - 网格展示所有图标
 * - 搜索筛选
 * - 拖拽/点击替换
 * - 批量导入
 * - 批量选择与删除
 * - 图标预览
 */
const IconEditor: React.FC<IconEditorProps> = ({
  icons,
  onIconReplace,
  onIconImport,
  onIconDelete,
}) => {
  // -------------------- 状态 --------------------

  /** 搜索关键词 */
  const [searchText, setSearchText] = useState('');

  /** 选中的图标包名集合 */
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(
    new Set()
  );

  /** 是否处于选择模式（有选中项时自动启用） */
  const [selectMode, setSelectMode] = useState(false);

  /** 预览弹窗状态 */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIcon, setPreviewIcon] = useState<IconResource | null>(null);

  /** 批量导入的文件输入引用 */
  const batchImportInputRef = useRef<HTMLInputElement>(null);

  // -------------------- 计算属性 --------------------

  /**
   * 将原始图标列表转换为带 UI 状态的卡片项列表
   */
  const iconCards: IconCardItem[] = useMemo(() => {
    return icons.map((icon) => ({
      icon,
      density: inferDensity(icon.filePath, icon.size),
      selected: selectedPackages.has(icon.componentName),
      dragOver: false,
    }));
  }, [icons, selectedPackages]);

  /**
   * 根据搜索关键词过滤图标列表
   */
  const filteredCards = useMemo(() => {
    if (!searchText.trim()) return iconCards;
    const keyword = searchText.toLowerCase().trim();
    return iconCards.filter((item) =>
      item.icon.componentName.toLowerCase().includes(keyword)
    );
  }, [iconCards, searchText]);

  /** 是否全选 */
  const isAllSelected =
    filteredCards.length > 0 &&
    filteredCards.every((item) => selectedPackages.has(item.icon.componentName));

  /** 是否部分选中 */
  const isPartialSelected =
    filteredCards.some((item) => selectedPackages.has(item.icon.componentName)) &&
    !isAllSelected;

  // -------------------- 回调函数 --------------------

  /**
   * 切换单个图标的选中状态
   */
  const handleSelectChange = useCallback(
    (componentName: string, checked: boolean) => {
      setSelectedPackages((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(componentName);
        } else {
          next.delete(componentName);
        }
        return next;
      });
    },
    []
  );

  /**
   * 切换全选/取消全选
   */
  const handleToggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      // 取消全选当前过滤结果中的所有图标
      setSelectedPackages((prev) => {
        const next = new Set(prev);
        filteredCards.forEach((item) => next.delete(item.icon.componentName));
        return next;
      });
    } else {
      // 选中当前过滤结果中的所有图标
      setSelectedPackages((prev) => {
        const next = new Set(prev);
        filteredCards.forEach((item) => next.add(item.icon.componentName));
        return next;
      });
    }
  }, [isAllSelected, filteredCards]);

  /**
   * 删除选中的图标
   */
  const handleDeleteSelected = useCallback(() => {
    if (selectedPackages.size === 0) {
      message.warning('请先选择要删除的图标');
      return;
    }

    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedPackages.size} 个图标吗？此操作不可撤销。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        onIconDelete(Array.from(selectedPackages));
        setSelectedPackages(new Set());
        setSelectMode(false);
        message.success(`已删除 ${selectedPackages.size} 个图标`);
      },
    });
  }, [selectedPackages, onIconDelete]);

  /**
   * 删除单个图标
   */
  const handleDeleteSingle = useCallback(
    (componentName: string) => {
      onIconDelete([componentName]);
      setSelectedPackages((prev) => {
        const next = new Set(prev);
        next.delete(componentName);
        return next;
      });
    },
    [onIconDelete]
  );

  /**
   * 处理批量导入按钮点击
   */
  const handleBatchImport = useCallback(() => {
    batchImportInputRef.current?.click();
  }, []);

  /**
   * 处理批量导入文件选择完成
   */
  const handleBatchImportFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        // 过滤出 .png 文件
        const pngFiles = Array.from(files).filter(
          (file) => file.type === 'image/png' || file.name.endsWith('.png')
        );

        if (pngFiles.length > 0) {
          onIconImport(pngFiles);
          message.success(`已导入 ${pngFiles.length} 个图标`);
        } else {
          message.warning('未找到 .png 格式的图标文件');
        }
      }
      // 重置 input 以允许重复选择
      e.target.value = '';
    },
    [onIconImport]
  );

  /**
   * 处理全局拖放（整个编辑器区域的拖放）
   */
  const handleGlobalDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const pngFiles = Array.from(files).filter(
          (file) => file.type === 'image/png' || file.name.endsWith('.png')
        );

        if (pngFiles.length > 0) {
          onIconImport(pngFiles);
          message.success(`已导入 ${pngFiles.length} 个图标`);
        } else {
          message.warning('仅支持 .png 格式的图标文件');
        }
      }
    },
    [onIconImport]
  );

  /**
   * 处理全局拖拽经过（防止浏览器默认行为）
   */
  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * 打开预览弹窗
   */
  const handlePreview = useCallback((icon: IconResource) => {
    setPreviewIcon(icon);
    setPreviewOpen(true);
  }, []);

  /**
   * 关闭预览弹窗
   */
  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewIcon(null);
  }, []);

  // -------------------- 监听选中状态变化 --------------------

  React.useEffect(() => {
    // 有选中项时自动启用选择模式
    setSelectMode(selectedPackages.size > 0);
  }, [selectedPackages]);

  // -------------------- 渲染 --------------------

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#1a1a2e',
      }}
      onDrop={handleGlobalDrop}
      onDragOver={handleGlobalDragOver}
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
          placeholder="搜索图标包名..."
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
              disabled={filteredCards.length === 0}
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

          {/* 批量导入 */}
          <Tooltip title="选择 .png 图标文件批量导入">
            <Button
              type="default"
              size="small"
              icon={<ImportOutlined />}
              onClick={handleBatchImport}
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderColor: '#2a2a4a',
                color: '#a0a0b0',
              }}
            >
              批量导入
            </Button>
          </Tooltip>

          {/* 删除选中 */}
          <Tooltip title="删除选中的图标">
            <Badge count={selectedPackages.size} offset={[-4, 4]} size="small">
              <Button
                type="default"
                size="small"
                icon={<DeleteOutlined />}
                onClick={handleDeleteSelected}
                disabled={selectedPackages.size === 0}
                danger={selectedPackages.size > 0}
                style={
                  selectedPackages.size === 0
                    ? {
                        background: 'rgba(255,255,255,0.05)',
                        borderColor: '#2a2a4a',
                        color: '#a0a0b0',
                      }
                    : undefined
                }
              >
                删除选中
              </Button>
            </Badge>
          </Tooltip>
        </Space>
      </div>

      {/* ==================== 主体区域：图标网格 ==================== */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
        }}
      >
        {filteredCards.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredCards.map((item) => (
              <IconCard
                key={item.icon.componentName}
                item={item}
                selectMode={selectMode}
                onSelectChange={handleSelectChange}
                onReplace={onIconReplace}
                onDelete={handleDeleteSingle}
                onPreview={handlePreview}
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
            {icons.length === 0 ? (
              /* 无图标时的空状态 */
              <>
                <Empty
                  description="暂无图标资源"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ marginBottom: '16px' }}
                />
                <Space direction="vertical" align="center" size="small">
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    点击「批量导入」添加图标，或将 .png 文件拖拽到此处
                  </Text>
                  <Button
                    type="primary"
                    size="small"
                    icon={<FolderOpenOutlined />}
                    onClick={handleBatchImport}
                  >
                    选择图标文件
                  </Button>
                </Space>
              </>
            ) : (
              /* 搜索无结果时的空状态 */
              <Empty
                description={`未找到匹配 "${searchText}" 的图标`}
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
            图标总数：
            <Text style={{ color: '#e0e0e0' }}>{icons.length}</Text>
          </Text>
          {searchText && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              筛选结果：
              <Text style={{ color: '#e0e0e0' }}>{filteredCards.length}</Text>
            </Text>
          )}
        </Space>
        {selectedPackages.size > 0 && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            已选中：
            <Text style={{ color: '#ff6b6b' }}>{selectedPackages.size}</Text> 个图标
          </Text>
        )}
      </div>

      {/* ==================== 图标预览弹窗 ==================== */}
      <IconPreviewModal
        open={previewOpen}
        icon={previewIcon}
        onClose={handleClosePreview}
      />

      {/* ==================== 隐藏的批量导入文件输入 ==================== */}
      <input
        ref={batchImportInputRef}
        type="file"
        accept=".png,image/png"
        multiple
        style={{ display: 'none' }}
        onChange={handleBatchImportFiles}
      />
    </div>
  );
};

export default IconEditor;
