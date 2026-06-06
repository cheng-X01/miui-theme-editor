/**
 * MIUI Theme Editor - NinePatch 编辑器单元测试
 * 测试 .9 图编辑逻辑：
 * - patchData 解析
 * - 拉伸区域计算
 * - 导出格式验证
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ==================== 类型定义 ====================

/** NinePatch 标记数据结构 */
interface PatchData {
  /** 左侧可拉伸列 */
  stretchLeft: boolean[];
  /** 顶部可拉伸行 */
  stretchTop: boolean[];
  /** 右侧内容区域列 */
  contentRight: boolean[];
  /** 底部内容区域行 */
  contentBottom: boolean[];
}

// ==================== 辅助函数（从 NinePatchEditor 提取的纯逻辑） ====================

/**
 * 创建空的九宫格标记数据
 * @param width 图片宽度（不含边框像素）
 * @param height 图片高度（不含边框像素）
 */
function createEmptyPatchData(width: number, height: number): PatchData {
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
function clonePatchData(data: PatchData): PatchData {
  return {
    stretchLeft: [...data.stretchLeft],
    stretchTop: [...data.stretchTop],
    contentRight: [...data.contentRight],
    contentBottom: [...data.contentBottom],
  };
}

/**
 * 从像素数据中解析九宫格标记
 * 模拟 .9.png 图片的解析逻辑
 *
 * @param pixels 像素数据（RGBA 数组）
 * @param width 图片总宽度（含边框）
 * @param height 图片总高度（含边框）
 * @returns 解析后的标记数据，如果图片太小则返回 null
 */
function parsePatchDataFromPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): PatchData | null {
  const contentW = width - 2;
  const contentH = height - 2;

  if (contentW <= 0 || contentH <= 0) return null;

  const patchData = createEmptyPatchData(contentW, contentH);

  // 判断像素是否为黑色标记
  const isBlack = (idx: number) =>
    pixels[idx + 3] > 128 && pixels[idx] < 50 && pixels[idx + 1] < 50 && pixels[idx + 2] < 50;

  // 解析左侧边框（第 0 列） -> 可拉伸列
  for (let y = 0; y < contentH; y++) {
    const idx = (y + 1) * width * 4;
    if (isBlack(idx)) {
      patchData.stretchLeft[y] = true;
    }
  }

  // 解析顶部边框（第 0 行） -> 可拉伸行
  for (let x = 0; x < contentW; x++) {
    const idx = (x + 1) * 4;
    if (isBlack(idx)) {
      patchData.stretchTop[x] = true;
    }
  }

  // 解析右侧边框（最后一列） -> 内容区域列
  for (let y = 0; y < contentH; y++) {
    const idx = (y + 1) * width * 4 + (width - 1) * 4;
    if (isBlack(idx)) {
      patchData.contentRight[y] = true;
    }
  }

  // 解析底部边框（最后一行） -> 内容区域行
  for (let x = 0; x < contentW; x++) {
    const idx = (height - 1) * width * 4 + (x + 1) * 4;
    if (isBlack(idx)) {
      patchData.contentBottom[x] = true;
    }
  }

  return patchData;
}

/**
 * 计算拉伸区域的目标尺寸
 * 根据标记数据和目标容器尺寸，计算每个像素的拉伸目标大小
 *
 * @param patchData 标记数据
 * @param targetWidth 目标宽度
 * @param targetHeight 目标高度
 * @returns 拉伸计算结果
 */
function calculateStretchRegions(
  patchData: PatchData,
  targetWidth: number,
  targetHeight: number
) {
  const contentW = patchData.stretchLeft.length;
  const contentH = patchData.stretchTop.length;

  // 可拉伸的列数和固定列数
  const stretchColCount = patchData.stretchLeft.filter(Boolean).length;
  const fixedColCount = contentW - stretchColCount;
  // 可拉伸的行数和固定行数
  const stretchRowCount = patchData.stretchTop.filter(Boolean).length;
  const fixedRowCount = contentH - stretchRowCount;

  // 计算每个拉伸像素的目标大小
  const stretchPixelW = stretchColCount > 0
    ? Math.max(1, (targetWidth - fixedColCount) / stretchColCount)
    : 0;
  const stretchPixelH = stretchRowCount > 0
    ? Math.max(1, (targetHeight - fixedRowCount) / stretchRowCount)
    : 0;

  return {
    contentW,
    contentH,
    stretchColCount,
    fixedColCount,
    stretchRowCount,
    fixedRowCount,
    stretchPixelW,
    stretchPixelH,
  };
}

/**
 * 生成导出用的像素数据
 * 将标记数据转换为 .9.png 格式的黑色边框像素
 *
 * @param patchData 标记数据
 * @param contentW 内容宽度
 * @param contentH 内容高度
 * @returns 像素位置数组（标记为黑色的坐标）
 */
function generateExportPixels(
  patchData: PatchData,
  contentW: number,
  contentH: number
): Array<{ x: number; y: number; type: string }> {
  const markedPixels: Array<{ x: number; y: number; type: string }> = [];

  // 左侧边框 - 可拉伸列标记
  patchData.stretchLeft.forEach((enabled, i) => {
    if (enabled) {
      markedPixels.push({ x: 0, y: i + 1, type: 'stretch-left' });
    }
  });

  // 顶部边框 - 可拉伸行标记
  patchData.stretchTop.forEach((enabled, i) => {
    if (enabled) {
      markedPixels.push({ x: i + 1, y: 0, type: 'stretch-top' });
    }
  });

  // 右侧边框 - 内容列标记
  patchData.contentRight.forEach((enabled, i) => {
    if (enabled) {
      markedPixels.push({ x: contentW + 1, y: i + 1, type: 'content-right' });
    }
  });

  // 底部边框 - 内容行标记
  patchData.contentBottom.forEach((enabled, i) => {
    if (enabled) {
      markedPixels.push({ x: i + 1, y: contentH + 1, type: 'content-bottom' });
    }
  });

  return markedPixels;
}

/**
 * 创建模拟的 .9.png 像素数据
 * @param contentW 内容宽度
 * @param contentH 内容高度
 * @param stretchLeftRange 左侧拉伸范围 [start, end)
 * @param stretchTopRange 顶部拉伸范围 [start, end)
 * @param contentRightRange 右侧内容范围 [start, end)
 * @param contentBottomRange 底部内容范围 [start, end)
 */
function createMockNinePatchPixels(
  contentW: number,
  contentH: number,
  stretchLeftRange: [number, number] = [0, 0],
  stretchTopRange: [number, number] = [0, 0],
  contentRightRange: [number, number] = [0, 0],
  contentBottomRange: [number, number] = [0, 0]
): Uint8ClampedArray {
  const totalW = contentW + 2;
  const totalH = contentH + 2;
  const pixels = new Uint8ClampedArray(totalW * totalH * 4);

  // 设置黑色标记像素 (R=0, G=0, B=0, A=255)
  const setBlack = (x: number, y: number) => {
    const idx = (y * totalW + x) * 4;
    pixels[idx] = 0;
    pixels[idx + 1] = 0;
    pixels[idx + 2] = 0;
    pixels[idx + 3] = 255;
  };

  // 左侧边框拉伸标记
  for (let y = stretchLeftRange[0]; y < stretchLeftRange[1]; y++) {
    setBlack(0, y + 1);
  }

  // 顶部边框拉伸标记
  for (let x = stretchTopRange[0]; x < stretchTopRange[1]; x++) {
    setBlack(x + 1, 0);
  }

  // 右侧边框内容标记
  for (let y = contentRightRange[0]; y < contentRightRange[1]; y++) {
    setBlack(totalW - 1, y + 1);
  }

  // 底部边框内容标记
  for (let x = contentBottomRange[0]; x < contentBottomRange[1]; x++) {
    setBlack(x + 1, totalH - 1);
  }

  return pixels;
}

// ==================== 测试用例 ====================

describe('NinePatch 编辑器逻辑', () => {
  // ==================== createEmptyPatchData 测试 ====================

  describe('createEmptyPatchData', () => {
    it('应该创建指定大小的空标记数据', () => {
      const data = createEmptyPatchData(10, 20);

      expect(data.stretchLeft).toHaveLength(10);
      expect(data.stretchTop).toHaveLength(20);
      expect(data.contentRight).toHaveLength(10);
      expect(data.contentBottom).toHaveLength(20);
    });

    it('所有值应初始化为 false', () => {
      const data = createEmptyPatchData(5, 5);

      expect(data.stretchLeft.every((v) => v === false)).toBe(true);
      expect(data.stretchTop.every((v) => v === false)).toBe(true);
      expect(data.contentRight.every((v) => v === false)).toBe(true);
      expect(data.contentBottom.every((v) => v === false)).toBe(true);
    });
  });

  // ==================== clonePatchData 测试 ====================

  describe('clonePatchData', () => {
    it('应该创建标记数据的深拷贝', () => {
      const original = createEmptyPatchData(5, 5);
      original.stretchLeft[0] = true;
      original.stretchTop[2] = true;
      original.contentRight[4] = true;
      original.contentBottom[1] = true;

      const cloned = clonePatchData(original);

      // 验证值相同
      expect(cloned.stretchLeft[0]).toBe(true);
      expect(cloned.stretchTop[2]).toBe(true);
      expect(cloned.contentRight[4]).toBe(true);
      expect(cloned.contentBottom[1]).toBe(true);

      // 验证是独立拷贝
      original.stretchLeft[0] = false;
      expect(cloned.stretchLeft[0]).toBe(true);
    });

    it('修改克隆不应影响原始数据', () => {
      const original = createEmptyPatchData(3, 3);
      const cloned = clonePatchData(original);

      cloned.stretchLeft[1] = true;
      cloned.stretchTop[0] = true;

      expect(original.stretchLeft[1]).toBe(false);
      expect(original.stretchTop[0]).toBe(false);
    });
  });

  // ==================== parsePatchDataFromPixels 测试 ====================

  describe('parsePatchDataFromPixels', () => {
    it('应该正确解析左侧拉伸标记', () => {
      // 创建 10x10 内容 + 边框 = 12x12 总尺寸
      // 左侧边框第 3-7 行标记为拉伸
      const pixels = createMockNinePatchPixels(10, 10, [3, 7]);
      const result = parsePatchDataFromPixels(pixels, 12, 12);

      expect(result).not.toBeNull();
      expect(result!.stretchLeft.filter(Boolean).length).toBe(4); // 7-3=4 行
      expect(result!.stretchLeft[3]).toBe(true);
      expect(result!.stretchLeft[6]).toBe(true);
      expect(result!.stretchLeft[2]).toBe(false);
      expect(result!.stretchLeft[7]).toBe(false);
    });

    it('应该正确解析顶部拉伸标记', () => {
      const pixels = createMockNinePatchPixels(10, 10, [0, 0], [2, 8]);
      const result = parsePatchDataFromPixels(pixels, 12, 12);

      expect(result).not.toBeNull();
      expect(result!.stretchTop.filter(Boolean).length).toBe(6); // 8-2=6 列
      expect(result!.stretchTop[2]).toBe(true);
      expect(result!.stretchTop[7]).toBe(true);
      expect(result!.stretchTop[1]).toBe(false);
      expect(result!.stretchTop[8]).toBe(false);
    });

    it('应该正确解析右侧内容区域标记', () => {
      const pixels = createMockNinePatchPixels(10, 10, [0, 0], [0, 0], [1, 9]);
      const result = parsePatchDataFromPixels(pixels, 12, 12);

      expect(result).not.toBeNull();
      expect(result!.contentRight.filter(Boolean).length).toBe(8); // 9-1=8 行
      expect(result!.contentRight[1]).toBe(true);
      expect(result!.contentRight[8]).toBe(true);
    });

    it('应该正确解析底部内容区域标记', () => {
      const pixels = createMockNinePatchPixels(10, 10, [0, 0], [0, 0], [0, 0], [3, 7]);
      const result = parsePatchDataFromPixels(pixels, 12, 12);

      expect(result).not.toBeNull();
      expect(result!.contentBottom.filter(Boolean).length).toBe(4); // 7-3=4 列
      expect(result!.contentBottom[3]).toBe(true);
      expect(result!.contentBottom[6]).toBe(true);
    });

    it('应该同时解析所有四种标记', () => {
      const pixels = createMockNinePatchPixels(
        10, 10,
        [2, 5],  // 左侧拉伸：第 2-4 行
        [3, 7],  // 顶部拉伸：第 3-6 列
        [1, 8],  // 右侧内容：第 1-7 行
        [4, 9],  // 底部内容：第 4-8 列
      );
      const result = parsePatchDataFromPixels(pixels, 12, 12);

      expect(result).not.toBeNull();

      // 验证左侧拉伸
      expect(result!.stretchLeft.filter(Boolean).length).toBe(3);
      // 验证顶部拉伸
      expect(result!.stretchTop.filter(Boolean).length).toBe(4);
      // 验证右侧内容
      expect(result!.contentRight.filter(Boolean).length).toBe(7);
      // 验证底部内容
      expect(result!.contentBottom.filter(Boolean).length).toBe(5);
    });

    it('没有标记时应返回全 false 的数据', () => {
      const pixels = createMockNinePatchPixels(5, 5);
      const result = parsePatchDataFromPixels(pixels, 7, 7);

      expect(result).not.toBeNull();
      expect(result!.stretchLeft.every((v) => !v)).toBe(true);
      expect(result!.stretchTop.every((v) => !v)).toBe(true);
      expect(result!.contentRight.every((v) => !v)).toBe(true);
      expect(result!.contentBottom.every((v) => !v)).toBe(true);
    });

    it('图片太小（<=2px）时应返回 null', () => {
      const pixels = new Uint8ClampedArray(8); // 2x1
      const result = parsePatchDataFromPixels(pixels, 2, 1);
      expect(result).toBeNull();

      const result2 = parsePatchDataFromPixels(pixels, 1, 2);
      expect(result2).toBeNull();

      const result3 = parsePatchDataFromPixels(pixels, 2, 2);
      expect(result3).toBeNull();
    });

    it('应该忽略 alpha 低于 128 的像素', () => {
      const contentW = 5;
      const contentH = 5;
      const totalW = contentW + 2;
      const totalH = contentH + 2;
      const pixels = new Uint8ClampedArray(totalW * totalH * 4);

      // 设置一个 alpha 低于 128 的"黑色"像素
      const idx = (1 * totalW + 0) * 4; // 左侧边框第一行
      pixels[idx] = 0;
      pixels[idx + 1] = 0;
      pixels[idx + 2] = 0;
      pixels[idx + 3] = 50; // alpha < 128，应被忽略

      const result = parsePatchDataFromPixels(pixels, totalW, totalH);
      expect(result).not.toBeNull();
      expect(result!.stretchLeft[0]).toBe(false);
    });

    it('应该忽略非黑色的深色像素（RGB > 50）', () => {
      const contentW = 5;
      const contentH = 5;
      const totalW = contentW + 2;
      const totalH = contentH + 2;
      const pixels = new Uint8ClampedArray(totalW * totalH * 4);

      // 设置一个深灰色像素（R=60, G=60, B=60, A=255），不应被识别为标记
      const idx = (1 * totalW + 0) * 4;
      pixels[idx] = 60;
      pixels[idx + 1] = 60;
      pixels[idx + 2] = 60;
      pixels[idx + 3] = 255;

      const result = parsePatchDataFromPixels(pixels, totalW, totalH);
      expect(result).not.toBeNull();
      expect(result!.stretchLeft[0]).toBe(false);
    });
  });

  // ==================== calculateStretchRegions 测试 ====================

  describe('calculateStretchRegions', () => {
    it('应该正确计算拉伸区域的像素大小', () => {
      const patchData = createEmptyPatchData(10, 10);
      // 中间 4 列可拉伸（索引 3-6）
      patchData.stretchLeft[3] = true;
      patchData.stretchLeft[4] = true;
      patchData.stretchLeft[5] = true;
      patchData.stretchLeft[6] = true;
      // 中间 4 行可拉伸（索引 3-6）
      patchData.stretchTop[3] = true;
      patchData.stretchTop[4] = true;
      patchData.stretchTop[5] = true;
      patchData.stretchTop[6] = true;

      const result = calculateStretchRegions(patchData, 100, 100);

      expect(result.contentW).toBe(10);
      expect(result.contentH).toBe(10);
      expect(result.stretchColCount).toBe(4);
      expect(result.fixedColCount).toBe(6);
      expect(result.stretchRowCount).toBe(4);
      expect(result.fixedRowCount).toBe(6);

      // 拉伸像素宽度 = (100 - 6) / 4 = 23.5
      expect(result.stretchPixelW).toBeCloseTo(23.5);
      expect(result.stretchPixelH).toBeCloseTo(23.5);
    });

    it('没有拉伸区域时拉伸像素大小应为 0', () => {
      const patchData = createEmptyPatchData(10, 10);

      const result = calculateStretchRegions(patchData, 100, 100);

      expect(result.stretchColCount).toBe(0);
      expect(result.stretchRowCount).toBe(0);
      expect(result.stretchPixelW).toBe(0);
      expect(result.stretchPixelH).toBe(0);
    });

    it('全部列都可拉伸时固定列数应为 0', () => {
      const patchData = createEmptyPatchData(10, 10);
      patchData.stretchLeft.fill(true);

      const result = calculateStretchRegions(patchData, 100, 100);

      expect(result.stretchColCount).toBe(10);
      expect(result.fixedColCount).toBe(0);
      // 拉伸像素宽度 = (100 - 0) / 10 = 10
      expect(result.stretchPixelW).toBe(10);
    });

    it('目标尺寸小于固定区域时拉伸像素大小应为 1（最小值）', () => {
      const patchData = createEmptyPatchData(10, 10);
      // 只有 1 列可拉伸
      patchData.stretchLeft[5] = true;

      // 固定列 = 9，目标宽度 = 10
      // 拉伸像素宽度 = (10 - 9) / 1 = 1
      const result = calculateStretchRegions(patchData, 10, 100);

      expect(result.stretchPixelW).toBe(1);
    });

    it('目标尺寸等于固定区域时拉伸像素大小应为 1', () => {
      const patchData = createEmptyPatchData(10, 10);
      patchData.stretchLeft[5] = true;

      // 固定列 = 9，目标宽度 = 9
      // 拉伸像素宽度 = max(1, (9 - 9) / 1) = 1
      const result = calculateStretchRegions(patchData, 9, 100);

      expect(result.stretchPixelW).toBe(1);
    });
  });

  // ==================== generateExportPixels 测试 ====================

  describe('generateExportPixels', () => {
    it('应该正确生成左侧拉伸标记像素', () => {
      const patchData = createEmptyPatchData(5, 5);
      patchData.stretchLeft[1] = true;
      patchData.stretchLeft[3] = true;

      const pixels = generateExportPixels(patchData, 5, 5);
      const leftPixels = pixels.filter((p) => p.type === 'stretch-left');

      expect(leftPixels).toHaveLength(2);
      expect(leftPixels[0]).toEqual({ x: 0, y: 2, type: 'stretch-left' });
      expect(leftPixels[1]).toEqual({ x: 0, y: 4, type: 'stretch-left' });
    });

    it('应该正确生成顶部拉伸标记像素', () => {
      const patchData = createEmptyPatchData(5, 5);
      patchData.stretchTop[0] = true;
      patchData.stretchTop[4] = true;

      const pixels = generateExportPixels(patchData, 5, 5);
      const topPixels = pixels.filter((p) => p.type === 'stretch-top');

      expect(topPixels).toHaveLength(2);
      expect(topPixels[0]).toEqual({ x: 1, y: 0, type: 'stretch-top' });
      expect(topPixels[1]).toEqual({ x: 5, y: 0, type: 'stretch-top' });
    });

    it('应该正确生成右侧内容标记像素', () => {
      const patchData = createEmptyPatchData(5, 5);
      patchData.contentRight[2] = true;

      const pixels = generateExportPixels(patchData, 5, 5);
      const rightPixels = pixels.filter((p) => p.type === 'content-right');

      expect(rightPixels).toHaveLength(1);
      expect(rightPixels[0]).toEqual({ x: 6, y: 3, type: 'content-right' });
    });

    it('应该正确生成底部内容标记像素', () => {
      const patchData = createEmptyPatchData(5, 5);
      patchData.contentBottom[1] = true;
      patchData.contentBottom[3] = true;

      const pixels = generateExportPixels(patchData, 5, 5);
      const bottomPixels = pixels.filter((p) => p.type === 'content-bottom');

      expect(bottomPixels).toHaveLength(2);
      expect(bottomPixels[0]).toEqual({ x: 2, y: 6, type: 'content-bottom' });
      expect(bottomPixels[1]).toEqual({ x: 4, y: 6, type: 'content-bottom' });
    });

    it('没有标记时不应生成任何像素', () => {
      const patchData = createEmptyPatchData(5, 5);

      const pixels = generateExportPixels(patchData, 5, 5);

      expect(pixels).toHaveLength(0);
    });

    it('导出像素位置应在边框范围内', () => {
      const patchData = createEmptyPatchData(10, 10);
      // 标记所有位置
      patchData.stretchLeft.fill(true);
      patchData.stretchTop.fill(true);
      patchData.contentRight.fill(true);
      patchData.contentBottom.fill(true);

      const pixels = generateExportPixels(patchData, 10, 10);

      for (const pixel of pixels) {
        // 左侧标记 x 应为 0
        if (pixel.type === 'stretch-left') {
          expect(pixel.x).toBe(0);
          expect(pixel.y).toBeGreaterThanOrEqual(1);
          expect(pixel.y).toBeLessThanOrEqual(10);
        }
        // 顶部标记 y 应为 0
        if (pixel.type === 'stretch-top') {
          expect(pixel.y).toBe(0);
          expect(pixel.x).toBeGreaterThanOrEqual(1);
          expect(pixel.x).toBeLessThanOrEqual(10);
        }
        // 右侧标记 x 应为 contentW + 1
        if (pixel.type === 'content-right') {
          expect(pixel.x).toBe(11);
          expect(pixel.y).toBeGreaterThanOrEqual(1);
          expect(pixel.y).toBeLessThanOrEqual(10);
        }
        // 底部标记 y 应为 contentH + 1
        if (pixel.type === 'content-bottom') {
          expect(pixel.y).toBe(11);
          expect(pixel.x).toBeGreaterThanOrEqual(1);
          expect(pixel.x).toBeLessThanOrEqual(10);
        }
      }
    });
  });

  // ==================== 综合场景测试 ====================

  describe('综合场景', () => {
    it('完整的解析 -> 修改 -> 导出流程', () => {
      // 1. 创建模拟 .9.png 像素数据
      const pixels = createMockNinePatchPixels(
        20, 20,
        [5, 15],   // 左侧拉伸：第 5-14 行
        [8, 18],   // 顶部拉伸：第 8-17 列
        [3, 17],   // 右侧内容：第 3-16 行
        [6, 14],   // 底部内容：第 6-13 列
      );

      // 2. 解析标记数据
      const parsed = parsePatchDataFromPixels(pixels, 22, 22);
      expect(parsed).not.toBeNull();

      // 3. 验证解析结果
      expect(parsed!.stretchLeft.filter(Boolean).length).toBe(10);
      expect(parsed!.stretchTop.filter(Boolean).length).toBe(10);
      expect(parsed!.contentRight.filter(Boolean).length).toBe(14);
      expect(parsed!.contentBottom.filter(Boolean).length).toBe(8);

      // 4. 修改标记数据
      const modified = clonePatchData(parsed!);
      modified.stretchLeft[7] = false; // 取消一行拉伸（原范围 5-14 中索引 7）
      modified.stretchTop[2] = true; // 添加一行拉伸（原范围 8-17 中索引 2 不在范围内）

      // 5. 验证修改后的数据
      expect(modified.stretchLeft[7]).toBe(false);
      expect(modified.stretchTop[2]).toBe(true);
      // 原始数据不受影响
      expect(parsed!.stretchLeft[7]).toBe(true);
      expect(parsed!.stretchTop[2]).toBe(false);

      // 6. 计算拉伸区域
      const stretchInfo = calculateStretchRegions(modified, 200, 400);
      expect(stretchInfo.stretchColCount).toBe(9); // 10-1=9
      expect(stretchInfo.stretchRowCount).toBe(11); // 10+1=11

      // 7. 生成导出像素
      const exportPixels = generateExportPixels(modified, 20, 20);
      expect(exportPixels.length).toBeGreaterThan(0);

      // 验证导出像素不包含被取消的标记
      const leftPixel7 = exportPixels.find(
        (p) => p.type === 'stretch-left' && p.y === 8 // y=7+1=8
      );
      expect(leftPixel7).toBeUndefined();

      // 验证导出像素包含新增的标记
      const topPixel2 = exportPixels.find(
        (p) => p.type === 'stretch-top' && p.x === 3 // x=2+1=3
      );
      expect(topPixel2).toBeDefined();
    });

    it('解析和导出应保持数据一致性', () => {
      // 创建标记数据
      const original = createEmptyPatchData(8, 8);
      original.stretchLeft[2] = true;
      original.stretchLeft[3] = true;
      original.stretchTop[5] = true;
      original.stretchTop[6] = true;
      original.contentRight[1] = true;
      original.contentRight[2] = true;
      original.contentRight[3] = true;
      original.contentBottom[4] = true;
      original.contentBottom[5] = true;

      // 生成导出像素
      const exportPixels = generateExportPixels(original, 8, 8);

      // 从导出像素重建标记数据
      const totalW = 10;
      const totalH = 10;
      const rebuiltPixels = new Uint8ClampedArray(totalW * totalH * 4);

      for (const pixel of exportPixels) {
        const idx = (pixel.y * totalW + pixel.x) * 4;
        rebuiltPixels[idx] = 0;
        rebuiltPixels[idx + 1] = 0;
        rebuiltPixels[idx + 2] = 0;
        rebuiltPixels[idx + 3] = 255;
      }

      // 重新解析
      const reparsed = parsePatchDataFromPixels(rebuiltPixels, totalW, totalH);

      // 验证一致性
      expect(reparsed).not.toBeNull();
      expect(reparsed!.stretchLeft).toEqual(original.stretchLeft);
      expect(reparsed!.stretchTop).toEqual(original.stretchTop);
      expect(reparsed!.contentRight).toEqual(original.contentRight);
      expect(reparsed!.contentBottom).toEqual(original.contentBottom);
    });
  });
});
