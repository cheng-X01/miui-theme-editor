/**
 * MIUI Theme Editor - 壁纸编辑器组件
 *
 * 功能：
 * - 桌面壁纸和锁屏壁纸两个区域
 * - 每个区域显示当前壁纸预览（有数据时显示图片，无数据时显示占位）
 * - 点击上传替换壁纸（支持 .jpg/.png）
 * - 壁纸尺寸信息显示
 * - 拖拽上传支持
 * - 预览模式：模拟手机屏幕比例（9:16）展示壁纸效果
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Button,
  Card,
  Space,
  Modal,
  message,
  Tooltip,
  Typography,
  Tag,
  Empty,
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  DesktopOutlined,
  LockOutlined,
  PictureOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons';
import type { WallpaperResource } from '../../../shared/types';

const { Text, Title } = Typography;

// ==================== 类型定义 ====================

/** 壁纸编辑器组件 Props */
export interface WallpaperEditorProps {
  /** 壁纸资源列表 */
  wallpapers: WallpaperResource[];
  /** 替换壁纸回调 */
  onWallpaperReplace: (type: 'desktop' | 'lockscreen', file: File) => void;
  /** 移除壁纸回调 */
  onWallpaperRemove: (type: 'desktop' | 'lockscreen') => void;
}

/** 壁纸区域类型 */
type WallpaperType = 'desktop' | 'lockscreen';

/** 壁纸区域配置 */
interface WallpaperSectionConfig {
  /** 类型标识 */
  type: WallpaperType;
  /** 显示标题 */
  title: string;
  /** 图标 */
  icon: React.ReactNode;
  /** 描述文字 */
  description: string;
}

// ==================== 工具函数 ====================

/**
 * 从壁纸列表中获取指定类型的壁纸
 */
const getWallpaperByType = (
  wallpapers: WallpaperResource[],
  type: WallpaperType
): WallpaperResource | undefined => {
  return wallpapers.find((w) =>
    type === 'desktop'
      ? w.type === 'homescreen'
      : w.type === 'lockscreen'
  );
};

/**
 * 格式化文件大小
 * 将字节数转换为可读的字符串
 */
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '未知';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * 解析壁纸分辨率字符串为宽高数值
 * 例如: "1080x1920" -> { width: 1080, height: 1920 }
 */
const parseResolution = (
  resolution?: string
): { width: number; height: number } | null => {
  if (!resolution) return null;
  const parts = resolution.toLowerCase().split('x');
  if (parts.length === 2) {
    const width = parseInt(parts[0], 10);
    const height = parseInt(parts[1], 10);
    if (!isNaN(width) && !isNaN(height)) {
      return { width, height };
    }
  }
  return null;
};

// ==================== 壁纸预览弹窗子组件 ====================

/** 壁纸预览弹窗 Props */
interface WallpaperPreviewModalProps {
  /** 是否显示 */
  open: boolean;
  /** 当前预览的壁纸 */
  wallpaper: WallpaperResource | null;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 壁纸预览弹窗
 * 以模拟手机屏幕比例（9:16）展示壁纸效果
 */
const WallpaperPreviewModal: React.FC<WallpaperPreviewModalProps> = ({
  open,
  wallpaper,
  onClose,
}) => {
  if (!wallpaper) return null;

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>壁纸预览</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
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
      {/* 手机屏幕模拟器（9:16 比例） */}
      <div
        style={{
          width: '270px',
          height: '480px', // 9:16 比例
          borderRadius: '24px',
          border: '3px solid #3a3a5a',
          overflow: 'hidden',
          position: 'relative',
          background: '#000',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* 顶部状态栏模拟 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '24px',
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: '40px',
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(255,255,255,0.3)',
            }}
          />
        </div>

        {/* 壁纸图片 */}
        {wallpaper.previewData ? (
          <img
            src={`data:image/jpeg;base64,${wallpaper.previewData}`}
            alt={wallpaper.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <PictureOutlined style={{ fontSize: '48px', color: '#2a2a4a' }} />
          </div>
        )}
      </div>

      {/* 壁纸信息 */}
      <div style={{ textAlign: 'center', marginTop: '16px', width: '100%' }}>
        <Text
          style={{ color: '#e0e0e0', fontSize: '14px', display: 'block', marginBottom: '8px' }}
        >
          {wallpaper.name}
        </Text>
        <Space size="small">
          <Tag color="blue">
            {wallpaper.type === 'homescreen' ? '桌面壁纸' : '锁屏壁纸'}
          </Tag>
          {wallpaper.resolution && (
            <Tag color="green">{wallpaper.resolution}</Tag>
          )}
        </Space>
      </div>
    </Modal>
  );
};

// ==================== 壁纸区域子组件 ====================

/** 壁纸区域 Props */
interface WallpaperSectionProps {
  /** 区域配置 */
  config: WallpaperSectionConfig;
  /** 当前壁纸数据 */
  wallpaper: WallpaperResource | undefined;
  /** 替换壁纸回调 */
  onReplace: (file: File) => void;
  /** 移除壁纸回调 */
  onRemove: () => void;
  /** 预览壁纸回调 */
  onPreview: (wallpaper: WallpaperResource) => void;
}

/**
 * 单个壁纸区域组件
 * 显示壁纸预览、操作按钮和尺寸信息
 * 支持拖拽上传替换壁纸
 */
const WallpaperSection: React.FC<WallpaperSectionProps> = ({
  config,
  wallpaper,
  onReplace,
  onRemove,
  onPreview,
}) => {
  /** 是否正在拖拽悬停 */
  const [dragOver, setDragOver] = useState(false);

  /** 隐藏的文件输入引用 */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 图片加载状态 */
  const [imageLoaded, setImageLoaded] = useState(false);
  /** 图片自然尺寸 */
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  /**
   * 处理拖拽进入事件
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * 处理拖拽悬停事件
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  /**
   * 处理拖拽离开事件
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  /**
   * 验证文件是否为支持的壁纸格式
   */
  const isValidWallpaperFile = useCallback((file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    return (
      validTypes.includes(file.type) ||
      validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
  }, []);

  /**
   * 处理文件拖放完成
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (isValidWallpaperFile(file)) {
          onReplace(file);
          message.success(`已替换${config.title}`);
        } else {
          message.error('仅支持 .jpg/.png 格式的壁纸文件');
        }
      }
    },
    [onReplace, isValidWallpaperFile, config.title]
  );

  /**
   * 处理上传按钮点击
   */
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 处理文件选择完成
   */
  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (isValidWallpaperFile(file)) {
          onReplace(file);
          message.success(`已替换${config.title}`);
        } else {
          message.error('仅支持 .jpg/.png 格式的壁纸文件');
        }
      }
      // 重置 input 以允许重复选择同一文件
      e.target.value = '';
    },
    [onReplace, isValidWallpaperFile, config.title]
  );

  /**
   * 处理删除按钮点击
   */
  const handleRemove = useCallback(() => {
    Modal.confirm({
      title: '确认移除',
      content: `确定要移除当前${config.title}吗？移除后将恢复默认壁纸。`,
      okText: '移除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        onRemove();
        message.success(`${config.title}已移除`);
      },
    });
  }, [onRemove, config.title]);

  /**
   * 处理图片加载完成，获取自然尺寸
   */
  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
    },
    []
  );

  /** 壁纸变化时重置加载状态 */
  useEffect(() => {
    setImageLoaded(false);
    setNaturalSize(null);
  }, [wallpaper?.previewData]);

  /** 解析壁纸分辨率 */
  const resolution = parseResolution(wallpaper?.resolution);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        border: dragOver
          ? '2px dashed #ff6b6b'
          : '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 区域标题 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#16213e',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Space>
          <span style={{ color: '#ff6b6b', fontSize: '16px' }}>{config.icon}</span>
          <Text strong style={{ color: '#e0e0e0', fontSize: '14px' }}>
            {config.title}
          </Text>
        </Space>
        {wallpaper && (
          <Space size="small">
            <Tooltip title="预览壁纸效果">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onPreview(wallpaper)}
                style={{ color: '#a0a0b0' }}
              />
            </Tooltip>
            <Tooltip title="替换壁纸">
              <Button
                type="text"
                size="small"
                icon={<UploadOutlined />}
                onClick={handleUploadClick}
                style={{ color: '#a0a0b0' }}
              />
            </Tooltip>
            <Tooltip title="移除壁纸">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={handleRemove}
                danger
                style={{ color: '#ff4d4f' }}
              />
            </Tooltip>
          </Space>
        )}
      </div>

      {/* 壁纸预览区域（9:16 比例模拟） */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          minHeight: '300px',
        }}
      >
        {wallpaper && wallpaper.previewData ? (
          /* 有壁纸数据时显示预览 */
          <div style={{ width: '100%', maxWidth: '200px' }}>
            {/* 手机屏幕模拟器 */}
            <div
              style={{
                width: '100%',
                aspectRatio: '9/16',
                borderRadius: '16px',
                border: '2px solid #3a3a5a',
                overflow: 'hidden',
                position: 'relative',
                background: '#000',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              <img
                src={`data:image/jpeg;base64,${wallpaper.previewData}`}
                alt={wallpaper.name}
                onLoad={handleImageLoad}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: imageLoaded ? 'block' : 'none',
                }}
              />
              {/* 图片加载中占位 */}
              {!imageLoaded && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <PictureOutlined style={{ fontSize: '32px', color: '#2a2a4a' }} />
                </div>
              )}
            </div>

            {/* 壁纸尺寸信息 */}
            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <Text
                ellipsis
                style={{ color: '#e0e0e0', fontSize: '12px', textAlign: 'center' }}
              >
                {wallpaper.name}
              </Text>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                {(naturalSize || resolution) && (
                  <Tag
                    color="blue"
                    style={{ fontSize: '10px', lineHeight: '16px', padding: '0 4px', margin: 0 }}
                  >
                    {naturalSize
                      ? `${naturalSize.width} x ${naturalSize.height}`
                      : wallpaper.resolution}
                  </Tag>
                )}
                <Tag
                  color="default"
                  style={{ fontSize: '10px', lineHeight: '16px', padding: '0 4px', margin: 0 }}
                >
                  9:16
                </Tag>
              </div>
            </div>
          </div>
        ) : (
          /* 无壁纸数据时显示占位 */
          <div
            style={{
              width: '100%',
              maxWidth: '200px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* 占位手机屏幕 */}
            <div
              style={{
                width: '100%',
                aspectRatio: '9/16',
                borderRadius: '16px',
                border: '2px dashed rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={handleUploadClick}
            >
              <PictureOutlined style={{ fontSize: '32px', color: '#2a2a4a' }} />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                点击上传壁纸
              </Text>
              <Text type="secondary" style={{ fontSize: '10px' }}>
                或拖拽文件到此处
              </Text>
            </div>

            {/* 上传按钮 */}
            <Button
              type="primary"
              size="small"
              icon={<UploadOutlined />}
              onClick={handleUploadClick}
              style={{ borderRadius: '6px' }}
            >
              上传{config.title}
            </Button>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'center',
        }}
      >
        <Text type="secondary" style={{ fontSize: '11px' }}>
          {config.description}
        </Text>
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
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <Space direction="vertical" align="center">
            <UploadOutlined style={{ fontSize: '32px', color: '#ff6b6b' }} />
            <Text style={{ color: '#ff6b6b', fontSize: '14px' }}>
              释放以替换{config.title}
            </Text>
          </Space>
        </div>
      )}

      {/* 隐藏的文件输入框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
    </div>
  );
};

// ==================== 主组件 ====================

/**
 * 壁纸编辑器主组件
 *
 * 提供桌面壁纸和锁屏壁纸的管理功能：
 * - 左右两栏布局，左侧桌面壁纸，右侧锁屏壁纸
 * - 9:16 手机屏幕比例预览
 * - 拖拽/点击上传替换壁纸
 * - 壁纸尺寸信息显示
 * - 预览弹窗
 */
const WallpaperEditor: React.FC<WallpaperEditorProps> = ({
  wallpapers,
  onWallpaperReplace,
  onWallpaperRemove,
}) => {
  // -------------------- 状态 --------------------

  /** 预览弹窗状态 */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewWallpaper, setPreviewWallpaper] = useState<WallpaperResource | null>(null);

  // -------------------- 壁纸区域配置 --------------------

  /** 壁纸区域配置列表 */
  const sections: WallpaperSectionConfig[] = [
    {
      type: 'desktop',
      title: '桌面壁纸',
      icon: <DesktopOutlined />,
      description: '建议分辨率 1080x1920 或更高，支持 .jpg/.png 格式',
    },
    {
      type: 'lockscreen',
      title: '锁屏壁纸',
      icon: <LockOutlined />,
      description: '建议分辨率 1080x1920 或更高，支持 .jpg/.png 格式',
    },
  ];

  // -------------------- 回调函数 --------------------

  /**
   * 打开预览弹窗
   */
  const handlePreview = useCallback((wallpaper: WallpaperResource) => {
    setPreviewWallpaper(wallpaper);
    setPreviewOpen(true);
  }, []);

  /**
   * 关闭预览弹窗
   */
  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewWallpaper(null);
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
      {/* ==================== 顶部标题栏 ==================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#0f0f23',
          borderBottom: '1px solid #2a2a4a',
          borderRadius: '8px 8px 0 0',
        }}
      >
        <Space>
          <PictureOutlined style={{ color: '#ff6b6b', fontSize: '16px' }} />
          <Text strong style={{ color: '#e0e0e0', fontSize: '14px' }}>
            壁纸编辑
          </Text>
        </Space>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          预览比例 9:16 | 支持 .jpg/.png
        </Text>
      </div>

      {/* ==================== 主体区域：左右两栏布局 ==================== */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: '16px',
          padding: '16px',
          overflow: 'auto',
        }}
      >
        {sections.map((section) => (
          <WallpaperSection
            key={section.type}
            config={section}
            wallpaper={getWallpaperByType(wallpapers, section.type)}
            onReplace={(file) => onWallpaperReplace(section.type, file)}
            onRemove={() => onWallpaperRemove(section.type)}
            onPreview={handlePreview}
          />
        ))}
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
            壁纸总数：
            <Text style={{ color: '#e0e0e0' }}>{wallpapers.length}</Text>
          </Text>
          {getWallpaperByType(wallpapers, 'desktop') && (
            <Tag color="blue" style={{ fontSize: '10px', lineHeight: '16px', margin: 0 }}>
              桌面壁纸已设置
            </Tag>
          )}
          {getWallpaperByType(wallpapers, 'lockscreen') && (
            <Tag color="green" style={{ fontSize: '10px', lineHeight: '16px', margin: 0 }}>
              锁屏壁纸已设置
            </Tag>
          )}
        </Space>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          拖拽文件到对应区域即可替换
        </Text>
      </div>

      {/* ==================== 壁纸预览弹窗 ==================== */}
      <WallpaperPreviewModal
        open={previewOpen}
        wallpaper={previewWallpaper}
        onClose={handleClosePreview}
      />
    </div>
  );
};

export default WallpaperEditor;
