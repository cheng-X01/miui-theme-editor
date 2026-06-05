/**
 * MIUI Theme Editor - 图标编辑器类型定义
 * 定义图标编辑器组件所需的 Props、状态及相关类型
 */

import type { IconResource } from '../../../shared/types';

// ==================== 图标尺寸相关类型 ====================

/** Android 密度桶枚举 */
export type DensityBucket =
  | 'mdpi'     // 基准密度 (160dpi)
  | 'hdpi'     // 高密度 (240dpi)
  | 'xhdpi'    // 超高密度 (320dpi)
  | 'xxhdpi'   // 超超高密度 (480dpi)
  | 'xxxhdpi'; // 超超超高密度 (640dpi)

/** 密度桶对应的图标尺寸映射 */
export const DENSITY_SIZE_MAP: Record<DensityBucket, number> = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

/** 密度桶中文名称映射 */
export const DENSITY_LABEL_MAP: Record<DensityBucket, string> = {
  mdpi: 'MDPI',
  hdpi: 'HDPI',
  xhdpi: 'XHDPI',
  xxhdpi: 'XXHDPI',
  xxxhdpi: 'XXXHDPI',
};

/** 密度桶颜色标签映射（用于 Tag 颜色） */
export const DENSITY_COLOR_MAP: Record<DensityBucket, string> = {
  mdpi: 'default',
  hdpi: 'blue',
  xhdpi: 'cyan',
  xxhdpi: 'green',
  xxxhdpi: 'gold',
};

// ==================== 图标编辑器 Props ====================

/** 图标编辑器组件 Props */
export interface IconEditorProps {
  /** 图标资源列表 */
  icons: IconResource[];
  /** 替换单个图标的回调（包名 + 新文件） */
  onIconReplace: (packageName: string, file: File) => void;
  /** 批量导入图标的回调（文件列表） */
  onIconImport: (files: File[]) => void;
  /** 删除图标的回调（包名列表） */
  onIconDelete: (packageNames: string[]) => void;
}

// ==================== 图标编辑器内部状态 ====================

/** 图标卡片项（扩展自 IconResource，附加 UI 状态） */
export interface IconCardItem {
  /** 原始图标资源 */
  icon: IconResource;
  /** 推断的密度桶 */
  density?: DensityBucket;
  /** 是否被选中 */
  selected: boolean;
  /** 是否正在拖拽悬停 */
  dragOver: boolean;
}

/** 拖拽文件信息 */
export interface DragFileItem {
  /** 文件对象 */
  file: File;
  /** 目标图标包名 */
  targetPackageName: string;
}

// ==================== 图标预览弹窗 Props ====================

/** 图标预览弹窗 Props */
export interface IconPreviewModalProps {
  /** 是否显示 */
  open: boolean;
  /** 当前预览的图标 */
  icon: IconResource | null;
  /** 关闭回调 */
  onClose: () => void;
}
