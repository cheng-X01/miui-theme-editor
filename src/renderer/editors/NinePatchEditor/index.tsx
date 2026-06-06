/**
 * MIUI Theme Editor - .9 图（NinePatch）编辑器
 *
 * NinePatch 是 Android/MIUI 中用于可拉伸图片的格式，
 * 通过在图片四周添加 1 像素宽的黑色标记线来定义拉伸区域和内容区域。
 *
 * 功能：
 * - 图片加载和显示（支持 .png/.9.png）
 * - 可拉伸区域编辑（左侧和顶部边框的黑色像素）
 * - 内容区域编辑（右侧和底部边框的黑色像素）
 * - 网格叠加显示（显示 9 个区域的划分）
 * - 预览效果（在不同尺寸容器中预览拉伸效果）
 * - 缩放控制（放大/缩小查看像素级细节）
 * - 撤销/重做
 * - 导出 .9.png 文件
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Button,
  Space,
  Tooltip,
  Typography,
  Tag,
  Select,
  Slider,
  Switch,
  Divider,
  Empty,
  message,
} from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  UndoOutlined,
  RedoOutlined,
  DownloadOutlined,
  UploadOutlined,
  EyeOutlined,
  EditOutlined,
  BorderOutlined,
  ScissorOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

// ==================== 类型定义 ====================

/** NinePatch 编辑器组件 Props */
export interface NinePatchEditorProps {
  /** 原始图片 base64 */
  imageData?: string;
  /** 九宫格标记数据 */
  patchData?: {
    /** 左侧可拉伸列（每列是否可拉伸） */
    stretchLeft: boolean[];
    /** 顶部可拉伸行 */
    stretchTop: boolean[];
    /** 右侧内容区域列 */
    contentRight: boolean[];
    /** 底部内容区域行 */
    contentBottom: boolean[];
  };
  /** 标记数据变更回调 */
  onPatchChange: (patchData: any) => void;
  /** 导出回调 */
  onExport?: (imageData: string) => void;
}

/** 编辑模式 */
type EditMode = 'stretch' | 'content';

/** 撤销/重做历史记录项 */
interface HistoryEntry {
  /** 九宫格标记数据快照 */
  patchData: {
    stretchLeft: boolean[];
    stretchTop: boolean[];
    contentRight: boolean[];
    contentBottom: boolean[];
  };
}

/** 预览尺寸配置 */
interface PreviewSize {
  /** 显示名称 */
  label: string;
  /** 宽度（像素） */
  width: number;
  /** 高度（像素） */
  height: number;
}

// ==================== 常量定义 ====================

/** 预览尺寸选项 */
const PREVIEW_SIZES: PreviewSize[] = [
  { label: '小 (100x100)', width: 100, height: 100 },
  { label: '中 (200x150)', width: 200, height: 150 },
  { label: '大 (300x300)', width: 300, height: 300 },
  { label: '宽屏 (400x100)', width: 400, height: 100 },
  { label: '竖屏 (100x400)', width: 100, height: 400 },
];

/** 九宫格标记线颜色 */
const STRETCH_COLOR = '#ff4444';    // 拉伸区域标记线颜色（红色）
const CONTENT_COLOR = '#44aaff';    // 内容区域标记线颜色（蓝色）
const GRID_COLOR = 'rgba(255,255,255,0.15)';  // 网格线颜色
const PATCH_BORDER_COLOR = '#000000';  // 九宫格边框像素颜色（黑色）

/** 缩放范围 */
const MIN_ZOOM = 1;
const MAX_ZOOM = 32;

// ==================== 工具函数 ====================

/**
 * 创建空的九宫格标记数据
 * @param width 图片宽度（不含边框像素）
 * @param height 图片高度（不含边框像素）
 */
function createEmptyPatchData(width: number, height: number) {
  return {
    stretchLeft: new Array(width).fill(false),
    stretchTop: new Array(height).fill(false),
    contentRight: new Array(width).fill(false),
    contentBottom: new Array(height).fill(false),
  };
}

/**
 * 深拷贝九宫格标记数据
 */
function clonePatchData(data: {
  stretchLeft: boolean[];
  stretchTop: boolean[];
  contentRight: boolean[];
  contentBottom: boolean[];
}) {
  return {
    stretchLeft: [...data.stretchLeft],
    stretchTop: [...data.stretchTop],
    contentRight: [...data.contentRight],
    contentBottom: [...data.contentBottom],
  };
}

/**
 * 从 .9.png 图片中解析九宫格标记数据
 * .9.png 图片四周有 1 像素宽的边框，黑色像素表示标记
 * @param img HTMLImageElement
 */
function parsePatchFromImage(img: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  const w = canvas.width;
  const h = canvas.height;

  // 内容区域宽度 = 原始宽度 - 2（左右各 1 像素边框）
  const contentW = w - 2;
  // 内容区域高度 = 原始高度 - 2（上下各 1 像素边框）
  const contentH = h - 2;

  if (contentW <= 0 || contentH <= 0) return null;

  const patchData = createEmptyPatchData(contentW, contentH);

  // 解析左侧边框（第 0 列） -> 可拉伸列
  for (let y = 0; y < contentH; y++) {
    const idx = (y + 1) * w * 4; // 左边框像素位置
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const a = pixels[idx + 3];
    // 黑色像素（alpha > 128 且 RGB 均较低）
    if (a > 128 && r < 50 && g < 50 && b < 50) {
      patchData.stretchLeft[y] = true;
    }
  }

  // 解析顶部边框（第 0 行） -> 可拉伸行
  for (let x = 0; x < contentW; x++) {
    const idx = (x + 1) * 4; // 顶部边框像素位置
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const a = pixels[idx + 3];
    if (a > 128 && r < 50 && g < 50 && b < 50) {
      patchData.stretchTop[x] = true;
    }
  }

  // 解析右侧边框（最后一列） -> 内容区域列
  for (let y = 0; y < contentH; y++) {
    const idx = (y + 1) * w * 4 + (w - 1) * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const a = pixels[idx + 3];
    if (a > 128 && r < 50 && g < 50 && b < 50) {
      patchData.contentRight[y] = true;
    }
  }

  // 解析底部边框（最后一行） -> 内容区域行
  for (let x = 0; x < contentW; x++) {
    const idx = (h - 1) * w * 4 + (x + 1) * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const a = pixels[idx + 3];
    if (a > 128 && r < 50 && g < 50 && b < 50) {
      patchData.contentBottom[x] = true;
    }
  }

  return patchData;
}

// ==================== 主组件 ====================

/**
 * .9 图（NinePatch）编辑器
 *
 * 提供可视化的九宫格标记编辑功能：
 * - 左侧画布区域：显示图片 + 九宫格标记线，支持点击/拖拽编辑
 * - 右侧属性面板：拉伸/内容区域设置，预览尺寸选择
 * - 底部预览区域：3 种不同尺寸的拉伸预览
 */
const NinePatchEditor: React.FC<NinePatchEditorProps> = ({
  imageData,
  patchData: externalPatchData,
  onPatchChange,
  onExport,
}) => {
  // -------------------- 状态 --------------------

  /** 加载的图片对象 */
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  /** 九宫格标记数据 */
  const [patchData, setPatchData] = useState<{
    stretchLeft: boolean[];
    stretchTop: boolean[];
    contentRight: boolean[];
    contentBottom: boolean[];
  }>({
    stretchLeft: [],
    stretchTop: [],
    contentRight: [],
    contentBottom: [],
  });

  /** 当前编辑模式：拉伸区域 / 内容区域 */
  const [editMode, setEditMode] = useState<EditMode>('stretch');

  /** 缩放倍数 */
  const [zoom, setZoom] = useState(8);

  /** 是否显示网格 */
  const [showGrid, setShowGrid] = useState(true);

  /** 是否显示预览 */
  const [showPreview, setShowPreview] = useState(true);

  /** 自定义预览尺寸 */
  const [customPreviewWidth, setCustomPreviewWidth] = useState(200);
  const [customPreviewHeight, setCustomPreviewHeight] = useState(150);

  /** 撤销/重做历史栈 */
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);

  /** 是否正在拖拽绘制 */
  const [isDrawing, setIsDrawing] = useState(false);

  /** 当前绘制值（true = 画线, false = 擦线） */
  const [drawValue, setDrawValue] = useState(true);

  // -------------------- 引用 --------------------

  /** 编辑画布引用 */
  const editorCanvasRef = useRef<HTMLCanvasElement>(null);

  /** 预览画布引用列表 */
  const previewCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  /** 隐藏的文件输入引用 */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 原始图片数据引用（不含边框） */
  const originalImageDataRef = useRef<ImageData | null>(null);

  // -------------------- 图片加载 --------------------

  /**
   * 加载图片
   * @param src 图片源（base64 或 URL）
   */
  const loadImage = useCallback((src: string) => {
    const img = new Image();
    img.onload = () => {
      setImage(img);

      // 尝试从 .9.png 中解析已有的标记数据
      const parsed = parsePatchFromImage(img);
      if (parsed) {
        setPatchData(parsed);
        onPatchChange(parsed);
      } else {
        // 普通图片，创建空标记数据
        // .9.png 格式：原始尺寸 + 四周各 1 像素边框
        const contentW = img.naturalWidth;
        const contentH = img.naturalHeight;
        const newPatch = createEmptyPatchData(contentW, contentH);
        setPatchData(newPatch);
        onPatchChange(newPatch);
      }

      // 提取原始图片像素数据（不含边框）
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.naturalWidth;
      tempCanvas.height = img.naturalHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        originalImageDataRef.current = tempCtx.getImageData(
          0, 0, img.naturalWidth, img.naturalHeight
        );
      }
    };
    img.onerror = () => {
      message.error('图片加载失败');
    };
    img.src = src;
  }, [onPatchChange]);

  /** 初始加载外部传入的图片 */
  useEffect(() => {
    if (imageData) {
      loadImage(imageData);
    }
  }, [imageData, loadImage]);

  /** 同步外部 patchData 变更 */
  useEffect(() => {
    if (externalPatchData) {
      setPatchData(externalPatchData);
    }
  }, [externalPatchData]);

  // -------------------- 撤销/重做 --------------------

  /**
   * 保存当前状态到撤销栈
   */
  const pushUndo = useCallback((current: typeof patchData) => {
    setUndoStack((prev) => [...prev.slice(-49), { patchData: clonePatchData(current) }]);
    setRedoStack([]);
  }, []);

  /**
   * 撤销操作
   */
  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setPatchData(clonePatchData(last.patchData));
      onPatchChange(clonePatchData(last.patchData));
      setRedoStack((redo) => [...redo, { patchData: clonePatchData(patchData) }]);
      return prev.slice(0, -1);
    });
  }, [patchData, onPatchChange]);

  /**
   * 重做操作
   */
  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setPatchData(clonePatchData(last.patchData));
      onPatchChange(clonePatchData(last.patchData));
      setUndoStack((undo) => [...undo, { patchData: clonePatchData(patchData) }]);
      return prev.slice(0, -1);
    });
  }, [patchData, onPatchChange]);

  // -------------------- 编辑操作 --------------------

  /**
   * 获取画布坐标对应的标记数据索引和类型
   * @param canvasX 画布 X 坐标
   * @param canvasY 画布 Y 坐标
   */
  const getPatchIndex = useCallback(
    (canvasX: number, canvasY: number): { type: 'left' | 'top' | 'right' | 'bottom'; index: number } | null => {
      if (!image) return null;

      // 将画布坐标转换为图片坐标
      const imgX = Math.floor(canvasX / zoom);
      const imgY = Math.floor(canvasY / zoom);

      const contentW = image.naturalWidth;
      const contentH = image.naturalHeight;

      // .9.png 布局（含边框）：
      // [左上角] [顶部边框 1px x contentW] [右上角]
      // [左侧边框 contentH x 1px] [内容区域 contentW x contentH] [右侧边框 contentH x 1px]
      // [左下角] [底部边框 1px x contentW] [右下角]

      const totalW = contentW + 2;
      const totalH = contentH + 2;

      // 检查是否在边框区域内
      if (imgX >= 0 && imgX < totalW && imgY >= 0 && imgY < totalH) {
        // 左侧边框（拉伸列标记）
        if (imgX === 0 && imgY >= 1 && imgY <= contentH) {
          return { type: 'left', index: imgY - 1 };
        }
        // 顶部边框（拉伸行标记）
        if (imgY === 0 && imgX >= 1 && imgX <= contentW) {
          return { type: 'top', index: imgX - 1 };
        }
        // 右侧边框（内容列标记）
        if (imgX === totalW - 1 && imgY >= 1 && imgY <= contentH) {
          return { type: 'right', index: imgY - 1 };
        }
        // 底部边框（内容行标记）
        if (imgY === totalH - 1 && imgX >= 1 && imgX <= contentW) {
          return { type: 'bottom', index: imgX - 1 };
        }
      }

      return null;
    },
    [image, zoom]
  );

  /**
   * 处理画布鼠标按下事件
   */
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = editorCanvasRef.current;
      if (!canvas || !image) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const patchIndex = getPatchIndex(x, y);
      if (!patchIndex) return;

      setIsDrawing(true);

      // 根据当前编辑模式和点击位置确定操作
      const isStretchTarget =
        (editMode === 'stretch' && (patchIndex.type === 'left' || patchIndex.type === 'top')) ||
        (editMode === 'content' && (patchIndex.type === 'right' || patchIndex.type === 'bottom'));

      // 切换当前像素状态
      const newValue = !patchData[
        `stretch${patchIndex.type.charAt(0).toUpperCase() + patchIndex.type.slice(1)}` as keyof typeof patchData
      ][patchIndex.index];

      setDrawValue(newValue);

      // 保存撤销状态
      pushUndo(patchData);

      // 更新标记数据
      setPatchData((prev) => {
        const newData = clonePatchData(prev);
        const key = `stretch${patchIndex.type.charAt(0).toUpperCase() + patchIndex.type.slice(1)}` as keyof typeof newData;
        (newData[key] as boolean[])[patchIndex.index] = newValue;
        onPatchChange(newData);
        return newData;
      });
    },
    [image, patchData, editMode, getPatchIndex, pushUndo, onPatchChange]
  );

  /**
   * 处理画布鼠标移动事件（拖拽绘制）
   */
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = editorCanvasRef.current;
      if (!canvas || !image) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const patchIndex = getPatchIndex(x, y);
      if (!patchIndex) return;

      setPatchData((prev) => {
        const key = `stretch${patchIndex.type.charAt(0).toUpperCase() + patchIndex.type.slice(1)}` as keyof typeof prev;
        const arr = prev[key] as boolean[];
        if (arr[patchIndex.index] === drawValue) return prev; // 无变化

        const newData = clonePatchData(prev);
        (newData[key] as boolean[])[patchIndex.index] = drawValue;
        onPatchChange(newData);
        return newData;
      });
    },
    [isDrawing, image, drawValue, getPatchIndex, onPatchChange]
  );

  /**
   * 处理画布鼠标松开事件
   */
  const handleCanvasMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  /**
   * 处理画布鼠标离开事件
   */
  const handleCanvasMouseLeave = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // -------------------- 画布渲染 --------------------

  /**
   * 渲染编辑画布
   * 绘制图片内容、九宫格标记线、网格叠加
   */
  const renderEditorCanvas = useCallback(() => {
    const canvas = editorCanvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const contentW = image.naturalWidth;
    const contentH = image.naturalHeight;
    // .9.png 总尺寸 = 内容 + 四周各 1 像素边框
    const totalW = contentW + 2;
    const totalH = contentH + 2;

    // 设置画布尺寸（缩放后）
    canvas.width = totalW * zoom;
    canvas.height = totalH * zoom;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制棋盘格背景（表示透明区域）
    const checkSize = Math.max(zoom / 2, 4);
    for (let y = 0; y < canvas.height; y += checkSize) {
      for (let x = 0; x < canvas.width; x += checkSize) {
        const isLight = ((x / checkSize) + (y / checkSize)) % 2 === 0;
        ctx.fillStyle = isLight ? '#2a2a3e' : '#222238';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // 绘制图片内容（偏移 1 像素边框）
    ctx.drawImage(
      image,
      0, 0, contentW, contentH,
      zoom, zoom, contentW * zoom, contentH * zoom
    );

    // 绘制边框区域背景
    ctx.fillStyle = 'rgba(30, 30, 50, 0.8)';
    // 左侧边框
    ctx.fillRect(0, 0, zoom, totalH * zoom);
    // 顶部边框
    ctx.fillRect(0, 0, totalW * zoom, zoom);
    // 右侧边框
    ctx.fillRect((totalW - 1) * zoom, 0, zoom, totalH * zoom);
    // 底部边框
    ctx.fillRect(0, (totalH - 1) * zoom, totalW * zoom, zoom);

    // 绘制九宫格标记像素
    // 左侧边框 - 可拉伸列标记
    patchData.stretchLeft.forEach((enabled, i) => {
      ctx.fillStyle = enabled ? STRETCH_COLOR : 'rgba(100,100,120,0.3)';
      ctx.fillRect(0, (i + 1) * zoom, zoom, zoom);
    });

    // 顶部边框 - 可拉伸行标记
    patchData.stretchTop.forEach((enabled, i) => {
      ctx.fillStyle = enabled ? STRETCH_COLOR : 'rgba(100,100,120,0.3)';
      ctx.fillRect((i + 1) * zoom, 0, zoom, zoom);
    });

    // 右侧边框 - 内容列标记
    patchData.contentRight.forEach((enabled, i) => {
      ctx.fillStyle = enabled ? CONTENT_COLOR : 'rgba(100,100,120,0.3)';
      ctx.fillRect((totalW - 1) * zoom, (i + 1) * zoom, zoom, zoom);
    });

    // 底部边框 - 内容行标记
    patchData.contentBottom.forEach((enabled, i) => {
      ctx.fillStyle = enabled ? CONTENT_COLOR : 'rgba(100,100,120,0.3)';
      ctx.fillRect((i + 1) * zoom, (totalH - 1) * zoom, zoom, zoom);
    });

    // 绘制网格线
    if (showGrid && zoom >= 4) {
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.5;

      // 垂直线
      for (let x = 0; x <= totalW; x++) {
        ctx.beginPath();
        ctx.moveTo(x * zoom, 0);
        ctx.lineTo(x * zoom, totalH * zoom);
        ctx.stroke();
      }

      // 水平线
      for (let y = 0; y <= totalH; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * zoom);
        ctx.lineTo(totalW * zoom, y * zoom);
        ctx.stroke();
      }

      // 绘制九宫格区域分割线（根据拉伸标记）
      ctx.strokeStyle = 'rgba(255, 68, 68, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // 垂直分割线（根据左侧标记）
      patchData.stretchLeft.forEach((enabled, i) => {
        if (enabled) {
          ctx.beginPath();
          ctx.moveTo((i + 1) * zoom, zoom);
          ctx.lineTo((i + 1) * zoom, (totalH - 1) * zoom);
          ctx.stroke();
        }
      });

      // 水平分割线（根据顶部标记）
      patchData.stretchTop.forEach((enabled, i) => {
        if (enabled) {
          ctx.beginPath();
          ctx.moveTo(zoom, (i + 1) * zoom);
          ctx.lineTo((totalW - 1) * zoom, (i + 1) * zoom);
          ctx.stroke();
        }
      });

      ctx.setLineDash([]);

      // 绘制内容区域边框（根据右侧和底部标记）
      const contentStartX = patchData.contentRight.findIndex((v) => v);
      const contentEndX = patchData.contentRight.length - 1 - [...patchData.contentRight].reverse().findIndex((v) => v);
      const contentStartY = patchData.contentBottom.findIndex((v) => v);
      const contentEndY = patchData.contentBottom.length - 1 - [...patchData.contentBottom].reverse().findIndex((v) => v);

      if (contentStartX >= 0 && contentEndX >= contentStartX) {
        ctx.strokeStyle = 'rgba(68, 170, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(
          (contentStartX + 1) * zoom,
          (contentStartY >= 0 ? contentStartY + 1 : 1) * zoom,
          (contentEndX - contentStartX + 1) * zoom,
          (contentStartY >= 0 && contentEndY >= contentStartY
            ? contentEndY - contentStartY + 1
            : contentH) * zoom
        );
        ctx.setLineDash([]);
      }
    }

    // 绘制边框高亮（当前编辑模式的边框）
    ctx.strokeStyle = editMode === 'stretch' ? STRETCH_COLOR : CONTENT_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  }, [image, patchData, zoom, showGrid, editMode]);

  /** 画布数据变化时重新渲染 */
  useEffect(() => {
    renderEditorCanvas();
  }, [renderEditorCanvas]);

  // -------------------- 预览渲染 --------------------

  /**
   * 渲染预览画布
   * 模拟 .9.png 在不同尺寸容器中的拉伸效果
   */
  const renderPreview = useCallback(
    (canvas: HTMLCanvasElement | null, targetWidth: number, targetHeight: number) => {
      if (!canvas || !image) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // 清空画布
      ctx.clearRect(0, 0, targetWidth, targetHeight);

      // 绘制棋盘格背景
      const checkSize = 8;
      for (let y = 0; y < targetHeight; y += checkSize) {
        for (let x = 0; x < targetWidth; x += checkSize) {
          const isLight = ((x / checkSize) + (y / checkSize)) % 2 === 0;
          ctx.fillStyle = isLight ? '#2a2a3e' : '#222238';
          ctx.fillRect(x, y, checkSize, checkSize);
        }
      }

      const contentW = image.naturalWidth;
      const contentH = image.naturalHeight;

      // 计算拉伸区域
      const stretchCols = patchData.stretchLeft;
      const stretchRows = patchData.stretchTop;

      // 可拉伸的列数和固定列数
      const stretchColCount = stretchCols.filter(Boolean).length;
      const fixedColCount = contentW - stretchColCount;
      // 可拉伸的行数和固定行数
      const stretchRowCount = stretchRows.filter(Boolean).length;
      const fixedRowCount = contentH - stretchRowCount;

      // 计算每个拉伸像素的目标大小
      const stretchPixelW = stretchColCount > 0
        ? Math.max(1, (targetWidth - fixedColCount) / stretchColCount)
        : 0;
      const stretchPixelH = stretchRowCount > 0
        ? Math.max(1, (targetHeight - fixedRowCount) / stretchRowCount)
        : 0;

      // 逐像素绘制拉伸后的图片
      for (let srcY = 0; srcY < contentH; srcY++) {
        for (let srcX = 0; srcX < contentW; srcX++) {
          const isStretchX = stretchCols[srcX] || false;
          const isStretchY = stretchRows[srcY] || false;

          // 计算目标区域宽度
          const destW = isStretchX ? stretchPixelW : 1;
          // 计算目标区域高度
          const destH = isStretchY ? stretchPixelH : 1;

          // 计算目标位置
          let destX = 0;
          for (let i = 0; i < srcX; i++) {
            destX += stretchCols[i] ? stretchPixelW : 1;
          }
          let destY = 0;
          for (let i = 0; i < srcY; i++) {
            destY += stretchRows[i] ? stretchPixelH : 1;
          }

          // 从原始图片中取出像素并绘制到目标位置
          ctx.drawImage(
            image,
            srcX, srcY, 1, 1,
            destX, destY, destW, destH
          );
        }
      }

      // 绘制内容区域指示（如果存在）
      const contentCols = patchData.contentRight;
      const contentRows = patchData.contentBottom;
      const contentStartX = contentCols.findIndex((v) => v);
      const contentEndX = contentCols.length - 1 - [...contentCols].reverse().findIndex((v) => v);
      const contentStartY = contentRows.findIndex((v) => v);
      const contentEndY = contentRows.length - 1 - [...contentRows].reverse().findIndex((v) => v);

      if (contentStartX >= 0 && contentEndX >= contentStartX &&
          contentStartY >= 0 && contentEndY >= contentStartY) {
        // 计算内容区域在目标尺寸中的位置
        let cDestX = 0;
        for (let i = 0; i < contentStartX; i++) {
          cDestX += stretchCols[i] ? stretchPixelW : 1;
        }
        let cDestEndX = cDestX;
        for (let i = contentStartX; i <= contentEndX; i++) {
          cDestEndX += stretchCols[i] ? stretchPixelW : 1;
        }
        let cDestY = 0;
        for (let i = 0; i < contentStartY; i++) {
          cDestY += stretchRows[i] ? stretchPixelH : 1;
        }
        let cDestEndY = cDestY;
        for (let i = contentStartY; i <= contentEndY; i++) {
          cDestEndY += stretchRows[i] ? stretchPixelH : 1;
        }

        // 绘制内容区域边框
        ctx.strokeStyle = CONTENT_COLOR;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(cDestX, cDestY, cDestEndX - cDestX, cDestEndY - cDestY);
        ctx.setLineDash([]);
      }
    },
    [image, patchData]
  );

  /** 预览数据变化时重新渲染所有预览 */
  useEffect(() => {
    if (!showPreview || !image) return;

    // 渲染 3 个预设预览
    const previewConfigs = [
      PREVIEW_SIZES[0], // 小
      PREVIEW_SIZES[1], // 中
      PREVIEW_SIZES[2], // 大
    ];

    previewConfigs.forEach((config, index) => {
      const canvas = previewCanvasRefs.current[index];
      if (canvas) {
        renderPreview(canvas, config.width, config.height);
      }
    });
  }, [showPreview, image, patchData, renderPreview]);

  // -------------------- 导出功能 --------------------

  /**
   * 导出 .9.png 文件
   * 将原始图片数据和九宫格标记合成为标准的 .9.png 格式
   */
  const handleExport = useCallback(() => {
    if (!image) {
      message.warning('请先加载图片');
      return;
    }

    const contentW = image.naturalWidth;
    const contentH = image.naturalHeight;
    const totalW = contentW + 2;
    const totalH = contentH + 2;

    // 创建导出画布
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = totalW;
    exportCanvas.height = totalH;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // 绘制原始图片内容（偏移 1 像素）
    ctx.drawImage(image, 1, 1);

    // 绘制九宫格标记像素（黑色 = 标记，透明 = 无标记）
    // 左侧边框
    patchData.stretchLeft.forEach((enabled, i) => {
      if (enabled) {
        ctx.fillStyle = PATCH_BORDER_COLOR;
        ctx.fillRect(0, i + 1, 1, 1);
      }
    });

    // 顶部边框
    patchData.stretchTop.forEach((enabled, i) => {
      if (enabled) {
        ctx.fillStyle = PATCH_BORDER_COLOR;
        ctx.fillRect(i + 1, 0, 1, 1);
      }
    });

    // 右侧边框
    patchData.contentRight.forEach((enabled, i) => {
      if (enabled) {
        ctx.fillStyle = PATCH_BORDER_COLOR;
        ctx.fillRect(totalW - 1, i + 1, 1, 1);
      }
    });

    // 底部边框
    patchData.contentBottom.forEach((enabled, i) => {
      if (enabled) {
        ctx.fillStyle = PATCH_BORDER_COLOR;
        ctx.fillRect(i + 1, totalH - 1, 1, 1);
      }
    });

    // 导出为 PNG
    const dataUrl = exportCanvas.toDataURL('image/png');

    if (onExport) {
      onExport(dataUrl);
    }

    // 同时触发下载
    const link = document.createElement('a');
    link.download = 'nine_patch.9.png';
    link.href = dataUrl;
    link.click();

    message.success('.9.png 文件已导出');
  }, [image, patchData, onExport]);

  // -------------------- 文件上传 --------------------

  /**
   * 处理文件上传
   */
  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 处理文件选择
   */
  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = () => {
          loadImage(reader.result as string);
          message.success('图片已加载');
        };
        reader.readAsDataURL(file);
      }
      e.target.value = '';
    },
    [loadImage]
  );

  // -------------------- 缩放控制 --------------------

  /**
   * 放大
   */
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 2, MAX_ZOOM));
  }, []);

  /**
   * 缩小
   */
  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 2, MIN_ZOOM));
  }, []);

  // -------------------- 计算属性 --------------------

  /** 统计信息 */
  const stats = useMemo(() => {
    const stretchColCount = patchData.stretchLeft.filter(Boolean).length;
    const stretchRowCount = patchData.stretchTop.filter(Boolean).length;
    const contentColCount = patchData.contentRight.filter(Boolean).length;
    const contentRowCount = patchData.contentBottom.filter(Boolean).length;
    return { stretchColCount, stretchRowCount, contentColCount, contentRowCount };
  }, [patchData]);

  /** 是否有可撤销的操作 */
  const canUndo = undoStack.length > 0;
  /** 是否有可重做的操作 */
  const canRedo = redoStack.length > 0;

  // -------------------- 渲染 --------------------

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#1a1a2e',
        color: '#e0e0e0',
      }}
    >
      {/* ==================== 顶部工具栏 ==================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: '#0f0f23',
          borderBottom: '1px solid #2a2a4a',
          borderRadius: '8px 8px 0 0',
        }}
      >
        <Space>
          <BorderOutlined style={{ color: '#ff6b6b', fontSize: '16px' }} />
          <Text strong style={{ color: '#e0e0e0', fontSize: '14px' }}>
            .9 图编辑器
          </Text>
          {image && (
            <Tag color="blue" style={{ fontSize: '10px', lineHeight: '16px', margin: 0 }}>
              {image.naturalWidth} x {image.naturalHeight}
            </Tag>
          )}
        </Space>

        <Space size="small">
          {/* 上传图片 */}
          <Tooltip title="加载图片">
            <Button
              type="text"
              size="small"
              icon={<UploadOutlined />}
              onClick={handleFileUpload}
              style={{ color: '#a0a0b0' }}
            />
          </Tooltip>

          <Divider type="vertical" style={{ borderColor: '#2a2a4a', margin: '0 4px' }} />

          {/* 撤销 */}
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button
              type="text"
              size="small"
              icon={<UndoOutlined />}
              onClick={handleUndo}
              disabled={!canUndo}
              style={{ color: canUndo ? '#a0a0b0' : '#3a3a5a' }}
            />
          </Tooltip>

          {/* 重做 */}
          <Tooltip title="重做 (Ctrl+Y)">
            <Button
              type="text"
              size="small"
              icon={<RedoOutlined />}
              onClick={handleRedo}
              disabled={!canRedo}
              style={{ color: canRedo ? '#a0a0b0' : '#3a3a5a' }}
            />
          </Tooltip>

          <Divider type="vertical" style={{ borderColor: '#2a2a4a', margin: '0 4px' }} />

          {/* 缩小 */}
          <Tooltip title="缩小">
            <Button
              type="text"
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              style={{ color: zoom > MIN_ZOOM ? '#a0a0b0' : '#3a3a5a' }}
            />
          </Tooltip>

          {/* 缩放显示 */}
          <Text style={{ color: '#a0a0b0', fontSize: '12px', minWidth: '40px', textAlign: 'center' }}>
            {zoom}x
          </Text>

          {/* 放大 */}
          <Tooltip title="放大">
            <Button
              type="text"
              size="small"
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              style={{ color: zoom < MAX_ZOOM ? '#a0a0b0' : '#3a3a5a' }}
            />
          </Tooltip>

          <Divider type="vertical" style={{ borderColor: '#2a2a4a', margin: '0 4px' }} />

          {/* 导出 */}
          <Tooltip title="导出 .9.png">
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={!image}
              style={{ borderRadius: '6px' }}
            >
              导出
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* ==================== 主体区域 ==================== */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* ---------- 左侧：编辑画布 ---------- */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflow: 'auto',
            background: '#12122a',
          }}
        >
          {image ? (
            <>
              {/* 编辑模式指示 */}
              <div style={{ marginBottom: '12px' }}>
                <Space>
                  <Button
                    type={editMode === 'stretch' ? 'primary' : 'default'}
                    size="small"
                    icon={<ScissorOutlined />}
                    onClick={() => setEditMode('stretch')}
                    style={
                      editMode === 'stretch'
                        ? { background: STRETCH_COLOR, borderColor: STRETCH_COLOR }
                        : { background: '#1a1a2e', borderColor: '#2a2a4a', color: '#a0a0b0' }
                    }
                  >
                    拉伸区域
                  </Button>
                  <Button
                    type={editMode === 'content' ? 'primary' : 'default'}
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setEditMode('content')}
                    style={
                      editMode === 'content'
                        ? { background: CONTENT_COLOR, borderColor: CONTENT_COLOR }
                        : { background: '#1a1a2e', borderColor: '#2a2a4a', color: '#a0a0b0' }
                    }
                  >
                    内容区域
                  </Button>
                  <Divider type="vertical" style={{ borderColor: '#2a2a4a', margin: '0 4px' }} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {editMode === 'stretch'
                      ? '点击左侧/顶部边框标记可拉伸区域'
                      : '点击右侧/底部边框标记内容区域'}
                  </Text>
                </Space>
              </div>

              {/* 编辑画布 */}
              <div
                style={{
                  overflow: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  border: '1px solid #2a2a4a',
                  borderRadius: '4px',
                  background: '#0a0a1a',
                }}
              >
                <canvas
                  ref={editorCanvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseLeave}
                  style={{
                    cursor: 'crosshair',
                    imageRendering: 'pixelated',
                  }}
                />
              </div>

              {/* 图例 */}
              <div style={{ marginTop: '8px' }}>
                <Space size="middle">
                  <Space size={4}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        background: STRETCH_COLOR,
                        borderRadius: '2px',
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      拉伸区域
                    </Text>
                  </Space>
                  <Space size={4}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        background: CONTENT_COLOR,
                        borderRadius: '2px',
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      内容区域
                    </Text>
                  </Space>
                </Space>
              </div>
            </>
          ) : (
            <Empty
              description={
                <Space direction="vertical" align="center">
                  <Text type="secondary">暂无图片</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    点击上方上传按钮加载 .png 或 .9.png 文件
                  </Text>
                  <Button
                    type="primary"
                    size="small"
                    icon={<UploadOutlined />}
                    onClick={handleFileUpload}
                    style={{ marginTop: '8px' }}
                  >
                    加载图片
                  </Button>
                </Space>
              }
              style={{ color: '#a0a0b0' }}
            />
          )}
        </div>

        {/* ---------- 右侧：属性面板 ---------- */}
        <div
          style={{
            width: '280px',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid #2a2a4a',
            background: '#0f0f23',
            overflow: 'auto',
          }}
        >
          {/* 拉伸区域设置 */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a4a' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <ScissorOutlined style={{ color: STRETCH_COLOR, marginRight: '8px' }} />
              <Text strong style={{ color: '#e0e0e0', fontSize: '13px' }}>
                拉伸区域
              </Text>
            </div>

            {/* 拉伸列（左侧边框） */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  可拉伸列（左侧边框）
                </Text>
                <Tag color="red" style={{ fontSize: '10px', lineHeight: '16px', margin: 0 }}>
                  {stats.stretchColCount} 列
                </Tag>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '2px',
                  maxHeight: '80px',
                  overflow: 'auto',
                  padding: '4px',
                  background: '#1a1a2e',
                  borderRadius: '4px',
                }}
              >
                {patchData.stretchLeft.map((enabled, i) => (
                  <div
                    key={`sl-${i}`}
                    onClick={() => {
                      pushUndo(patchData);
                      const newData = clonePatchData(patchData);
                      newData.stretchLeft[i] = !enabled;
                      setPatchData(newData);
                      onPatchChange(newData);
                    }}
                    style={{
                      width: '8px',
                      height: '8px',
                      background: enabled ? STRETCH_COLOR : '#2a2a4a',
                      borderRadius: '1px',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    title={`列 ${i + 1}: ${enabled ? '可拉伸' : '固定'}`}
                  />
                ))}
              </div>
            </div>

            {/* 拉伸行（顶部边框） */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  可拉伸行（顶部边框）
                </Text>
                <Tag color="red" style={{ fontSize: '10px', lineHeight: '16px', margin: 0 }}>
                  {stats.stretchRowCount} 行
                </Tag>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '2px',
                  maxHeight: '80px',
                  overflow: 'auto',
                  padding: '4px',
                  background: '#1a1a2e',
                  borderRadius: '4px',
                }}
              >
                {patchData.stretchTop.map((enabled, i) => (
                  <div
                    key={`st-${i}`}
                    onClick={() => {
                      pushUndo(patchData);
                      const newData = clonePatchData(patchData);
                      newData.stretchTop[i] = !enabled;
                      setPatchData(newData);
                      onPatchChange(newData);
                    }}
                    style={{
                      width: '8px',
                      height: '8px',
                      background: enabled ? STRETCH_COLOR : '#2a2a4a',
                      borderRadius: '1px',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    title={`行 ${i + 1}: ${enabled ? '可拉伸' : '固定'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 内容区域设置 */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a4a' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <EditOutlined style={{ color: CONTENT_COLOR, marginRight: '8px' }} />
              <Text strong style={{ color: '#e0e0e0', fontSize: '13px' }}>
                内容区域
              </Text>
            </div>

            {/* 内容列（右侧边框） */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  内容列（右侧边框）
                </Text>
                <Tag color="blue" style={{ fontSize: '10px', lineHeight: '16px', margin: 0 }}>
                  {stats.contentColCount} 列
                </Tag>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '2px',
                  maxHeight: '80px',
                  overflow: 'auto',
                  padding: '4px',
                  background: '#1a1a2e',
                  borderRadius: '4px',
                }}
              >
                {patchData.contentRight.map((enabled, i) => (
                  <div
                    key={`cr-${i}`}
                    onClick={() => {
                      pushUndo(patchData);
                      const newData = clonePatchData(patchData);
                      newData.contentRight[i] = !enabled;
                      setPatchData(newData);
                      onPatchChange(newData);
                    }}
                    style={{
                      width: '8px',
                      height: '8px',
                      background: enabled ? CONTENT_COLOR : '#2a2a4a',
                      borderRadius: '1px',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    title={`列 ${i + 1}: ${enabled ? '内容' : '非内容'}`}
                  />
                ))}
              </div>
            </div>

            {/* 内容行（底部边框） */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  内容行（底部边框）
                </Text>
                <Tag color="blue" style={{ fontSize: '10px', lineHeight: '16px', margin: 0 }}>
                  {stats.contentRowCount} 行
                </Tag>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '2px',
                  maxHeight: '80px',
                  overflow: 'auto',
                  padding: '4px',
                  background: '#1a1a2e',
                  borderRadius: '4px',
                }}
              >
                {patchData.contentBottom.map((enabled, i) => (
                  <div
                    key={`cb-${i}`}
                    onClick={() => {
                      pushUndo(patchData);
                      const newData = clonePatchData(patchData);
                      newData.contentBottom[i] = !enabled;
                      setPatchData(newData);
                      onPatchChange(newData);
                    }}
                    style={{
                      width: '8px',
                      height: '8px',
                      background: enabled ? CONTENT_COLOR : '#2a2a4a',
                      borderRadius: '1px',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    title={`行 ${i + 1}: ${enabled ? '内容' : '非内容'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 显示设置 */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a4a' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <AppstoreOutlined style={{ color: '#a0a0b0', marginRight: '8px' }} />
              <Text strong style={{ color: '#e0e0e0', fontSize: '13px' }}>
                显示设置
              </Text>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* 网格显示开关 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  显示网格
                </Text>
                <Switch
                  size="small"
                  checked={showGrid}
                  onChange={setShowGrid}
                />
              </div>

              {/* 预览显示开关 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  显示预览
                </Text>
                <Switch
                  size="small"
                  checked={showPreview}
                  onChange={setShowPreview}
                />
              </div>

              {/* 缩放滑块 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    缩放倍数
                  </Text>
                  <Text style={{ color: '#e0e0e0', fontSize: '12px' }}>
                    {zoom}x
                  </Text>
                </div>
                <Slider
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={1}
                  value={zoom}
                  onChange={(val) => {
                    // 只允许 2 的幂次缩放
                    const power = Math.round(Math.log2(val));
                    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.pow(2, power))));
                  }}
                  tooltip={{ formatter: (val) => `${val}x` }}
                  styles={{
                    track: { background: '#2a2a4a' },
                    rail: { background: '#1a1a2e' },
                  }}
                />
              </div>
            </div>
          </div>

          {/* 预览尺寸选择 */}
          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <EyeOutlined style={{ color: '#a0a0b0', marginRight: '8px' }} />
              <Text strong style={{ color: '#e0e0e0', fontSize: '13px' }}>
                自定义预览尺寸
              </Text>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>
                  宽度
                </Text>
                <Slider
                  min={50}
                  max={600}
                  value={customPreviewWidth}
                  onChange={setCustomPreviewWidth}
                  styles={{
                    track: { background: '#2a2a4a' },
                    rail: { background: '#1a1a2e' },
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>
                  高度
                </Text>
                <Slider
                  min={50}
                  max={600}
                  value={customPreviewHeight}
                  onChange={setCustomPreviewHeight}
                  styles={{
                    track: { background: '#2a2a4a' },
                    rail: { background: '#1a1a2e' },
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {customPreviewWidth} x {customPreviewHeight} px
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 底部：预览区域 ==================== */}
      {showPreview && image && (
        <div
          style={{
            borderTop: '1px solid #2a2a4a',
            background: '#0f0f23',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <EyeOutlined style={{ color: '#a0a0b0', marginRight: '8px' }} />
            <Text strong style={{ color: '#e0e0e0', fontSize: '13px' }}>
              拉伸预览
            </Text>
            <Text type="secondary" style={{ fontSize: '11px', marginLeft: '8px' }}>
              在不同尺寸容器中预览 .9.png 拉伸效果
            </Text>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
              overflow: 'auto',
              paddingBottom: '8px',
            }}
          >
            {/* 3 种预设预览尺寸 */}
            {PREVIEW_SIZES.slice(0, 3).map((size, index) => (
              <div
                key={size.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    border: '1px solid #2a2a4a',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: '#0a0a1a',
                  }}
                >
                  <canvas
                    ref={(el) => {
                      previewCanvasRefs.current[index] = el;
                    }}
                    style={{
                      display: 'block',
                      imageRendering: 'auto',
                    }}
                  />
                </div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {size.label}
                </Text>
              </div>
            ))}

            {/* 自定义预览尺寸 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  border: '1px solid #44aaff',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  background: '#0a0a1a',
                }}
              >
                <canvas
                  ref={(el) => {
                    // 使用第 4 个位置存储自定义预览
                    previewCanvasRefs.current[3] = el;
                    if (el) {
                      renderPreview(el, customPreviewWidth, customPreviewHeight);
                    }
                  }}
                  style={{
                    display: 'block',
                    imageRendering: 'auto',
                  }}
                />
              </div>
              <Text type="secondary" style={{ fontSize: '11px', color: '#44aaff' }}>
                自定义 ({customPreviewWidth}x{customPreviewHeight})
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 底部状态栏 ==================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px',
          background: '#0a0a1a',
          borderTop: '1px solid #2a2a4a',
          borderRadius: '0 0 8px 8px',
        }}
      >
        <Space size="middle">
          <Text type="secondary" style={{ fontSize: '11px' }}>
            缩放: {zoom}x
          </Text>
          {image && (
            <>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                原始: {image.naturalWidth} x {image.naturalHeight}
              </Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                .9.png: {image.naturalWidth + 2} x {image.naturalHeight + 2}
              </Text>
            </>
          )}
        </Space>
        <Space size="middle">
          <Text type="secondary" style={{ fontSize: '11px' }}>
            拉伸: {stats.stretchColCount}列 x {stats.stretchRowCount}行
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            内容: {stats.contentColCount}列 x {stats.contentRowCount}行
          </Text>
        </Space>
      </div>

      {/* 隐藏的文件输入框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.9.png,image/png"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
    </div>
  );
};

export default NinePatchEditor;
