/**
 * MIUI Theme Editor - 字体编辑器组件
 *
 * 功能：
 * - 字体列表展示（字体名称 + 文件大小 + 预览文字）
 * - 上传替换字体（支持 .ttf/.otf）
 * - 字体预览（使用该字体渲染示例文字）
 * - 删除字体
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
} from 'antd';
import {
  SearchOutlined,
  ImportOutlined,
  DeleteOutlined,
  SwapOutlined,
  FontColorsOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  FileOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { FontResource } from '../../../shared/types';

const { Text } = Typography;

// ==================== 类型定义 ====================

/** 字体编辑器组件 Props */
export interface FontEditorProps {
  /** 字体资源列表 */
  fonts: FontResource[];
  /** 替换字体回调 */
  onFontReplace: (name: string, file: File) => void;
  /** 导入字体回调 */
  onFontImport: (file: File) => void;
  /** 删除字体回调 */
  onFontDelete: (name: string) => void;
}

/** 字体类型标签配置 */
interface FontTypeConfig {
  /** 显示名称 */
  label: string;
  /** 标签颜色 */
  color: string;
}

// ==================== 常量 ====================

/** 字体类型标签映射 */
const FONT_TYPE_MAP: Record<string, FontTypeConfig> = {
  regular: { label: '常规', color: 'blue' },
  bold: { label: '粗体', color: 'orange' },
  italic: { label: '斜体', color: 'purple' },
  'bold-italic': { label: '粗斜体', color: 'red' },
  light: { label: '细体', color: 'cyan' },
  thin: { label: '极细', color: 'default' },
};

/** 字体预览示例文字 */
const PREVIEW_TEXT = 'MIUI 主题预览 ABCabc 123';

/** 字体预览字号 */
const PREVIEW_FONT_SIZE = 18;

// ==================== 工具函数 ====================

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
 * 获取字体类型的显示配置
 */
const getFontTypeConfig = (type: string): FontTypeConfig => {
  return FONT_TYPE_MAP[type] || { label: type, color: 'default' };
};

/**
 * 验证文件是否为支持的字体格式
 */
const isValidFontFile = (file: File): boolean => {
  const validTypes = [
    'font/ttf',
    'font/otf',
    'application/x-font-ttf',
    'application/x-font-otf',
    'application/font-ttf',
    'application/font-otf',
  ];
  const validExtensions = ['.ttf', '.otf'];
  return (
    validTypes.includes(file.type) ||
    validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
  );
};

/**
 * 从字体文件名中提取字体名称
 * 例如: MiSans-Regular.ttf -> MiSans-Regular
 */
const extractFontName = (name: string): string => {
  return name.replace(/\.(ttf|otf)$/i, '');
};

// ==================== 字体卡片子组件 ====================

/** 字体卡片 Props */
interface FontCardProps {
  /** 字体资源数据 */
  font: FontResource;
  /** 字体预览 URL（Object URL 或 Data URL） */
  fontUrl: string | null;
  /** 替换字体回调 */
  onReplace: (name: string, file: File) => void;
  /** 删除字体回调 */
  onDelete: (name: string) => void;
}

/**
 * 单个字体卡片组件
 * 显示字体预览、名称、文件大小和操作按钮
 */
const FontCard: React.FC<FontCardProps> = ({
  font,
  fontUrl,
  onReplace,
  onDelete,
}) => {
  /** 隐藏的文件输入引用 */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 字体类型配置 */
  const typeConfig = getFontTypeConfig(font.type);

  /**
   * 处理替换按钮点击
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
        const file = files[0];
        if (isValidFontFile(file)) {
          onReplace(font.name, file);
          message.success(`已替换字体: ${font.name}`);
        } else {
          message.error('仅支持 .ttf/.otf 格式的字体文件');
        }
      }
      // 重置 input 以允许重复选择同一文件
      e.target.value = '';
    },
    [font.name, onReplace]
  );

  /**
   * 处理删除按钮点击
   */
  const handleDelete = useCallback(() => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除字体 "${font.name}" 吗？删除后相关界面将恢复系统默认字体。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        onDelete(font.name);
        message.success(`字体 "${font.name}" 已删除`);
      },
    });
  }, [font.name, onDelete]);

  /** 字体预览样式 */
  const previewStyle: React.CSSProperties = fontUrl
    ? {
        fontFamily: `"${font.name}", sans-serif`,
        fontSize: `${PREVIEW_FONT_SIZE}px`,
        color: '#e0e0e0',
        lineHeight: '1.5',
        wordBreak: 'break-all' as const,
      }
    : {
        fontFamily: 'sans-serif',
        fontSize: `${PREVIEW_FONT_SIZE}px`,
        color: '#2a2a4a',
        lineHeight: '1.5',
        wordBreak: 'break-all' as const,
        fontStyle: 'italic',
      };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* 字体预览区域 */}
      <div
        style={{
          padding: '20px 16px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={previewStyle}>
          {fontUrl ? PREVIEW_TEXT : '无法预览字体'}
        </div>
      </div>

      {/* 字体信息区域 */}
      <div style={{ padding: '12px 16px' }}>
        {/* 字体名称 */}
        <Tooltip title={font.name} placement="top">
          <Text
            ellipsis
            style={{
              color: '#e0e0e0',
              fontSize: '13px',
              fontWeight: 500,
              display: 'block',
              marginBottom: '8px',
            }}
          >
            {extractFontName(font.name)}
          </Text>
        </Tooltip>

        {/* 标签行：字体类型 + 文件大小 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <Tag
            color={typeConfig.color}
            style={{ fontSize: '10px', lineHeight: '16px', padding: '0 4px', margin: 0 }}
          >
            {typeConfig.label}
          </Tag>
          {font.fileSize && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {formatFileSize(font.fileSize)}
            </Text>
          )}
          <Text type="secondary" style={{ fontSize: '11px', marginLeft: 'auto' }}>
            {font.filePath}
          </Text>
        </div>

        {/* 操作按钮 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '4px',
          }}
        >
          <Tooltip title="替换字体">
            <Button
              type="text"
              size="small"
              icon={<SwapOutlined />}
              onClick={handleReplaceClick}
              style={{ color: '#a0a0b0' }}
            />
          </Tooltip>
          <Tooltip title="删除字体">
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

      {/* 隐藏的文件输入框（用于替换字体） */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ttf,.otf,font/ttf,font/otf,application/x-font-ttf,application/x-font-otf"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
    </div>
  );
};

// ==================== 主组件 ====================

/**
 * 字体编辑器主组件
 *
 * 提供完整的字体管理功能：
 * - 字体列表展示（卡片布局）
 * - 搜索筛选
 * - 上传替换字体
 * - 导入新字体
 * - 字体预览
 * - 删除字体
 */
const FontEditor: React.FC<FontEditorProps> = ({
  fonts,
  onFontReplace,
  onFontImport,
  onFontDelete,
}) => {
  // -------------------- 状态 --------------------

  /** 搜索关键词 */
  const [searchText, setSearchText] = useState('');

  /** 导入字体的文件输入引用 */
  const importInputRef = useRef<HTMLInputElement>(null);

  /** 字体预览 URL 映射（字体名 -> Object URL） */
  const [fontUrls, setFontUrls] = useState<Map<string, string>>(new Map());

  // -------------------- 计算属性 --------------------

  /**
   * 根据搜索关键词过滤字体列表
   */
  const filteredFonts = useMemo(() => {
    if (!searchText.trim()) return fonts;
    const keyword = searchText.toLowerCase().trim();
    return fonts.filter(
      (font) =>
        font.name.toLowerCase().includes(keyword) ||
        font.type.toLowerCase().includes(keyword) ||
        font.filePath.toLowerCase().includes(keyword)
    );
  }, [fonts, searchText]);

  // -------------------- 回调函数 --------------------

  /**
   * 处理导入字体按钮点击
   */
  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  /**
   * 处理导入字体文件选择完成
   */
  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (isValidFontFile(file)) {
          onFontImport(file);
          message.success(`已导入字体: ${file.name}`);
        } else {
          message.error('仅支持 .ttf/.otf 格式的字体文件');
        }
      }
      // 重置 input 以允许重复选择同一文件
      e.target.value = '';
    },
    [onFontImport]
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
        const fontFiles = Array.from(files).filter(isValidFontFile);
        if (fontFiles.length > 0) {
          // 逐个导入字体
          fontFiles.forEach((file) => {
            onFontImport(file);
          });
          message.success(`已导入 ${fontFiles.length} 个字体`);
        } else {
          message.warning('仅支持 .ttf/.otf 格式的字体文件');
        }
      }
    },
    [onFontImport]
  );

  /**
   * 处理全局拖拽经过（防止浏览器默认行为）
   */
  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // -------------------- 字体预览 URL 管理 --------------------

  /**
   * 为字体创建预览 URL
   * 在实际项目中，字体数据可能来自文件系统或 MTZ 包
   * 这里通过监听字体列表变化来管理预览 URL
   */
  React.useEffect(() => {
    // 清理旧的预览 URL
    const currentUrls = fontUrls;
    currentUrls.forEach((url) => {
      // 检查该字体是否还在列表中
      const stillExists = fonts.some((f) => f.name === [...currentUrls.entries()].find(([_, v]) => v === url)?.[0]);
      if (!stillExists) {
        URL.revokeObjectURL(url);
      }
    });

    // 注意：实际使用中，字体预览需要从字体文件数据创建 Blob URL
    // 这里仅作为框架，实际实现需要字体文件的二进制数据
    // 如果字体资源包含 previewData 或可以通过 IPC 读取文件内容，
    // 则可以创建 Object URL 用于 @font-face 预览

    return () => {
      // 组件卸载时清理所有预览 URL
      fontUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [fonts]);

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
          placeholder="搜索字体名称..."
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

        {/* 右侧：导入按钮 */}
        <Space size="small">
          <Tooltip title="导入 .ttf/.otf 字体文件">
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
              导入字体
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* ==================== 主体区域：字体卡片网格 ==================== */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
        }}
      >
        {filteredFonts.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredFonts.map((font) => (
              <FontCard
                key={font.name}
                font={font}
                fontUrl={fontUrls.get(font.name) || null}
                onReplace={onFontReplace}
                onDelete={onFontDelete}
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
            {fonts.length === 0 ? (
              /* 无字体时的空状态 */
              <>
                <Empty
                  description="暂无字体资源"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ marginBottom: '16px' }}
                />
                <Space direction="vertical" align="center" size="small">
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    点击「导入字体」添加字体文件，或将 .ttf/.otf 文件拖拽到此处
                  </Text>
                  <Button
                    type="primary"
                    size="small"
                    icon={<UploadOutlined />}
                    onClick={handleImportClick}
                  >
                    选择字体文件
                  </Button>
                </Space>
              </>
            ) : (
              /* 搜索无结果时的空状态 */
              <Empty
                description={`未找到匹配 "${searchText}" 的字体`}
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
            字体总数：
            <Text style={{ color: '#e0e0e0' }}>{fonts.length}</Text>
          </Text>
          {searchText && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              筛选结果：
              <Text style={{ color: '#e0e0e0' }}>{filteredFonts.length}</Text>
            </Text>
          )}
        </Space>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          支持 .ttf/.otf 格式 | 拖拽文件到此处导入
        </Text>
      </div>

      {/* ==================== 隐藏的导入文件输入 ==================== */}
      <input
        ref={importInputRef}
        type="file"
        accept=".ttf,.otf,font/ttf,font/otf,application/x-font-ttf,application/x-font-otf"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
    </div>
  );
};

export default FontEditor;
