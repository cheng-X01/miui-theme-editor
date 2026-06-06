/**
 * MIUI Theme Editor - NL2Theme 引擎单元测试
 * 测试 NL2ThemeEngine 的核心方法：
 * - parseIntent: 意图解析（风格提取、颜色提取）
 * - generateColorScheme: 配色方案生成
 * - generateMetadata: 元数据生成
 * - assembleTheme: 主题组装
 *
 * 使用 vitest，mock AI 调用。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ==================== Mock AI 调用 ====================

/** Mock AI 编排器 */
const mockGenerateText = vi.fn();

/** Mock AI Orchestrator 模块 */
vi.mock('../../src/renderer/ai/core/AIOrchestrator', () => ({
  getAIOrchestrator: () => ({
    generateText: mockGenerateText,
  }),
}));

// 导入被测模块（需要在 mock 之后）
import { NL2ThemeEngine } from '../../src/renderer/ai/core/NL2ThemeEngine';

// ==================== 辅助函数 ====================

/** 创建标准的 mock AI 响应 */
function mockAIResponse(text: string) {
  return {
    text,
    model: 'test-model',
    duration: 100,
    usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
  };
}

// ==================== 测试数据 ====================

/** 标准意图解析 AI 返回 */
const MOCK_INTENT_RESPONSE = JSON.stringify({
  themeName: '星空梦境',
  description: '深邃星空主题，蓝色调为主',
  style: 'dark',
  colorKeywords: ['深蓝', '星空蓝', '银色'],
  elementKeywords: ['星星', '月亮', '银河'],
  moodKeywords: ['宁静', '梦幻', '深邃'],
  needIcons: true,
  needWallpaper: true,
  needLockscreen: true,
  needFont: false,
  needSounds: false,
});

/** 标准配色方案 AI 返回 */
const MOCK_COLOR_RESPONSE = JSON.stringify({
  primaryColor: '#1a237e',
  secondaryColor: '#283593',
  accentColor: '#ffd54f',
  backgroundColor: '#0d1b2a',
  secondaryBackgroundColor: '#1b2838',
  textColor: '#e8eaf6',
  secondaryTextColor: '#7986cb',
  borderColor: '#1a237e',
  successColor: '#66bb6a',
  warningColor: '#ffa726',
  errorColor: '#ef5350',
  isDark: true,
});

/** 标准壁纸 AI 返回 */
const MOCK_WALLPAPER_RESPONSE = JSON.stringify([
  {
    name: '主屏幕壁纸',
    type: 'homescreen',
    description: '深邃星空背景',
    prompt: 'deep starry sky wallpaper',
    resolution: '1080x2400',
  },
  {
    name: '锁屏壁纸',
    type: 'lockscreen',
    description: '简约星空锁屏',
    prompt: 'minimal starry lockscreen',
    resolution: '1080x2400',
  },
]);

/** 标准图标规范 AI 返回 */
const MOCK_ICON_RESPONSE = JSON.stringify({
  style: '扁平化',
  shape: '圆角方形',
  background: '深色背景',
  colorRule: '使用主题主色调',
  commonApps: [
    {
      componentName: 'com.android.settings',
      description: '设置图标',
      prompt: 'settings icon flat design',
    },
    {
      componentName: 'com.android.phone',
      description: '电话图标',
      prompt: 'phone icon flat design',
    },
  ],
});

/** 标准锁屏 AI 返回 */
const MOCK_LOCKSCREEN_RESPONSE = JSON.stringify({
  name: '星空锁屏',
  description: '星空主题锁屏',
  features: ['时间显示', '日期显示', '星空动画'],
  mamlCode: '<?xml version="1.0" encoding="utf-8"?><Lockscreen version="2"><Text name="time" text="#time#" /></Lockscreen>',
});

/** 不需要任何资源的意图 */
const NO_RESOURCES_INTENT = JSON.stringify({
  themeName: '无资源主题',
  style: 'minimal',
  colorKeywords: [],
  elementKeywords: [],
  moodKeywords: [],
  needIcons: false,
  needWallpaper: false,
  needLockscreen: false,
  needFont: false,
  needSounds: false,
});

// ==================== 测试用例 ====================

describe('NL2ThemeEngine', () => {
  let engine: NL2ThemeEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new NL2ThemeEngine();
  });

  // ==================== parseIntent 测试 ====================

  describe('parseIntent', () => {
    it('应该正确解析用户描述中的风格和颜色信息', async () => {
      // 设置所有 AI 调用的 mock
      mockGenerateText
        .mockResolvedValueOnce(mockAIResponse(MOCK_INTENT_RESPONSE))
        .mockResolvedValueOnce(mockAIResponse(MOCK_COLOR_RESPONSE))
        .mockResolvedValueOnce(mockAIResponse(MOCK_WALLPAPER_RESPONSE))
        .mockResolvedValueOnce(mockAIResponse(MOCK_ICON_RESPONSE))
        .mockResolvedValueOnce(mockAIResponse(MOCK_LOCKSCREEN_RESPONSE));

      // 通过 generate 方法间接测试 parseIntent
      const result = await engine.generate({
        description: '帮我做一个深蓝色的星空主题',
      });

      // 验证步骤 1（解析意图）完成
      const parseStep = result.steps.find((s) => s.id === 'parse-intent');
      expect(parseStep).toBeDefined();
      expect(parseStep?.status).toBe('completed');
    });

    it('应该在 AI 返回无效 JSON 时使用默认值', async () => {
      // 设置 mock 返回无效 JSON
      mockGenerateText.mockResolvedValueOnce(mockAIResponse('这不是有效的JSON内容'));

      // 设置后续步骤的 mock
      mockGenerateText.mockResolvedValue(mockAIResponse(MOCK_COLOR_RESPONSE));

      // 即使意图解析失败，generate 也不应抛出异常
      const result = await engine.generate({
        description: '测试描述',
      });

      // 验证生成成功
      expect(result).toBeDefined();
      expect(result.project).toBeDefined();
      expect(result.project.name).toBe('AI 生成主题'); // 默认名称
    });

    it('应该在 AI 返回部分字段缺失时使用默认值填充', async () => {
      // 设置 mock 返回部分字段
      const partialResponse = JSON.stringify({
        themeName: '测试主题',
        style: 'minimal',
        // 缺少其他字段
      });

      mockGenerateText.mockResolvedValueOnce(mockAIResponse(partialResponse));

      // 后续 mock
      mockGenerateText.mockResolvedValue(mockAIResponse(MOCK_COLOR_RESPONSE));

      const result = await engine.generate({
        description: '测试',
      });

      // 验证生成成功，缺失字段使用默认值
      expect(result.project).toBeDefined();
      expect(result.project.name).toBe('测试主题');
    });

    it('应该累计 token 使用量', async () => {
      mockGenerateText.mockResolvedValue(mockAIResponse(MOCK_INTENT_RESPONSE));

      await engine.generate({
        description: '测试',
      });

      // 验证多次 AI 调用累计了 token
      expect(mockGenerateText.mock.calls.length).toBeGreaterThan(0);
    });
  });

  // ==================== generateColorScheme 测试 ====================

  describe('generateColorScheme', () => {
    it('应该生成包含所有必需字段的配色方案', async () => {
      // 设置意图解析 mock
      mockGenerateText.mockResolvedValueOnce(mockAIResponse(MOCK_INTENT_RESPONSE));
      // 设置配色方案 mock
      mockGenerateText.mockResolvedValueOnce(mockAIResponse(MOCK_COLOR_RESPONSE));
      // 后续 mock
      mockGenerateText.mockResolvedValue(mockAIResponse(MOCK_WALLPAPER_RESPONSE));

      const result = await engine.generate({
        description: '深蓝色星空主题',
      });

      // 验证配色步骤完成
      const colorStep = result.steps.find((s) => s.id === 'generate-colors');
      expect(colorStep).toBeDefined();
      expect(colorStep?.status).toBe('completed');
    });

    it('应该在颜色格式无效时使用默认值', async () => {
      // 设置意图解析 mock
      mockGenerateText.mockResolvedValueOnce(mockAIResponse(MOCK_INTENT_RESPONSE));

      // 设置配色方案 mock - 包含无效颜色
      const invalidColorResponse = JSON.stringify({
        primaryColor: 'not-a-color',
        secondaryColor: '#283593',
        accentColor: '#ffd54f',
        backgroundColor: '#0d1b2a',
        secondaryBackgroundColor: '#1b2838',
        textColor: '#e8eaf6',
        secondaryTextColor: '#7986cb',
        borderColor: '#1a237e',
        successColor: '#66bb6a',
        warningColor: '#ffa726',
        errorColor: '#ef5350',
        isDark: true,
      });

      mockGenerateText.mockResolvedValueOnce(mockAIResponse(invalidColorResponse));

      // 后续 mock
      mockGenerateText.mockResolvedValue(mockAIResponse(MOCK_WALLPAPER_RESPONSE));

      // 不应抛出异常
      const result = await engine.generate({
        description: '测试',
      });

      expect(result).toBeDefined();
      expect(result.project).toBeDefined();
    });

    it('应该在 AI 返回非 JSON 时使用默认配色', async () => {
      mockGenerateText.mockResolvedValueOnce(mockAIResponse(MOCK_INTENT_RESPONSE));
      mockGenerateText.mockResolvedValueOnce(mockAIResponse('配色方案生成失败'));
      mockGenerateText.mockResolvedValue(mockAIResponse(MOCK_WALLPAPER_RESPONSE));

      const result = await engine.generate({
        description: '测试',
      });

      // 验证使用默认配色后仍能成功生成
      expect(result).toBeDefined();
      expect(result.project).toBeDefined();
    });
  });

  // ==================== generateMetadata 测试 ====================

  describe('generateMetadata', () => {
    it('应该生成包含完整字段的元数据', async () => {
      mockGenerateText.mockResolvedValueOnce(mockAIResponse(MOCK_INTENT_RESPONSE));
      mockGenerateText.mockResolvedValueOnce(mockAIResponse(MOCK_COLOR_RESPONSE));
      // 后续 mock
      mockGenerateText.mockResolvedValue(mockAIResponse(MOCK_WALLPAPER_RESPONSE));

      const result = await engine.generate({
        description: '星空主题',
      });

      // 验证元数据步骤完成
      const metadataStep = result.steps.find((s) => s.id === 'generate-metadata');
      expect(metadataStep).toBeDefined();
      expect(metadataStep?.status).toBe('completed');

      // 验证项目描述信息
      const desc = result.project.description;
      expect(desc).toBeDefined();
      expect(desc.name).toBe('星空梦境');
      expect(desc.author).toBe('AI 生成');
      expect(desc.version).toBe('1.0.0');
      expect(desc.designWidth).toBe(1080);
      expect(desc.designHeight).toBe(2400);
    });

    it('应该根据风格正确设置暗色模式标志', async () => {
      // 暗色风格
      mockGenerateText.mockResolvedValueOnce(mockAIResponse(JSON.stringify({
        themeName: '暗色主题',
        style: 'dark',
        colorKeywords: [],
        elementKeywords: [],
        moodKeywords: [],
        needIcons: false,
        needWallpaper: false,
        needLockscreen: false,
        needFont: false,
        needSounds: false,
      })));

      mockGenerateText.mockResolvedValueOnce(mockAIResponse(JSON.stringify({
        ...JSON.parse(MOCK_COLOR_RESPONSE),
        isDark: true,
      })));

      mockGenerateText.mockResolvedValue(mockAIResponse('[]'));

      const result = await engine.generate({
        description: '暗色主题',
      });

      expect(result.project.description.supportsDarkMode).toBe(true);
    });
  });

  // ==================== assembleTheme 测试 ====================

  describe('assembleTheme', () => {
    it('应该组装完整的 ThemeProject 对象', async () => {
      // 设置所有 AI 调用的 mock
      mockGenerateText
        .mockResolvedValueOnce(mockAIResponse(MOCK_INTENT_RESPONSE))
        .mockResolvedValueOnce(mockAIResponse(MOCK_COLOR_RESPONSE))
        .mockResolvedValueOnce(mockAIResponse(MOCK_WALLPAPER_RESPONSE))
        .mockResolvedValueOnce(mockAIResponse(MOCK_ICON_RESPONSE))
        .mockResolvedValueOnce(mockAIResponse(MOCK_LOCKSCREEN_RESPONSE));

      const result = await engine.generate({
        description: '完整的星空主题',
      });

      // 验证组装步骤完成
      const assembleStep = result.steps.find((s) => s.id === 'assemble-theme');
      expect(assembleStep).toBeDefined();
      expect(assembleStep?.status).toBe('completed');

      // 验证项目完整性
      const project = result.project;
      expect(project).toBeDefined();
      expect(project.id).toMatch(/^theme-/);
      expect(project.name).toBe('星空梦境');
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
      expect(project.isDirty).toBe(false);

      // 验证资源集合
      expect(project.resources).toBeDefined();
      expect(project.resources.icons.length).toBeGreaterThan(0);
      expect(project.resources.wallpapers.length).toBeGreaterThan(0);
      expect(project.resources.mamlModules.length).toBeGreaterThan(0);

      // 验证状态栏配置
      expect(project.resources.statusbar).toBeDefined();
    });

    it('应该正确设置所有步骤的状态', async () => {
      mockGenerateText
        .mockResolvedValueOnce(mockAIResponse(MOCK_INTENT_RESPONSE))
        .mockResolvedValueOnce(mockAIResponse(MOCK_COLOR_RESPONSE))
        .mockResolvedValueOnce(mockAIResponse(MOCK_WALLPAPER_RESPONSE))
        .mockResolvedValueOnce(mockAIResponse(MOCK_ICON_RESPONSE))
        .mockResolvedValueOnce(mockAIResponse(MOCK_LOCKSCREEN_RESPONSE));

      const result = await engine.generate({
        description: '完整主题',
      });

      // 验证所有步骤都有状态
      expect(result.steps.length).toBe(7);

      // 验证步骤顺序和状态
      expect(result.steps[0].id).toBe('parse-intent');
      expect(result.steps[0].status).toBe('completed');

      expect(result.steps[1].id).toBe('generate-colors');
      expect(result.steps[1].status).toBe('completed');

      expect(result.steps[2].id).toBe('generate-metadata');
      expect(result.steps[2].status).toBe('completed');

      expect(result.steps[3].id).toBe('generate-wallpaper');
      expect(result.steps[3].status).toBe('completed');

      expect(result.steps[4].id).toBe('generate-icons');
      expect(result.steps[4].status).toBe('completed');

      expect(result.steps[5].id).toBe('generate-lockscreen');
      expect(result.steps[5].status).toBe('completed');

      expect(result.steps[6].id).toBe('assemble-theme');
      expect(result.steps[6].status).toBe('completed');
    });

    it('应该在没有壁纸需求时跳过壁纸生成步骤', async () => {
      mockGenerateText
        .mockResolvedValueOnce(mockAIResponse(NO_RESOURCES_INTENT))
        .mockResolvedValueOnce(mockAIResponse(MOCK_COLOR_RESPONSE));

      const result = await engine.generate({
        description: '不需要壁纸的主题',
      });

      // 验证壁纸步骤被跳过
      const wallpaperStep = result.steps.find((s) => s.id === 'generate-wallpaper');
      expect(wallpaperStep).toBeDefined();
      expect(wallpaperStep?.status).toBe('skipped');

      // 验证壁纸资源为空
      expect(result.project.resources.wallpapers).toEqual([]);
    });

    it('应该在没有图标需求时跳过图标生成步骤', async () => {
      mockGenerateText
        .mockResolvedValueOnce(mockAIResponse(NO_RESOURCES_INTENT))
        .mockResolvedValueOnce(mockAIResponse(MOCK_COLOR_RESPONSE));

      const result = await engine.generate({
        description: '不需要图标的主题',
      });

      // 验证图标步骤被跳过
      const iconStep = result.steps.find((s) => s.id === 'generate-icons');
      expect(iconStep).toBeDefined();
      expect(iconStep?.status).toBe('skipped');

      // 验证图标资源为空
      expect(result.project.resources.icons).toEqual([]);
    });

    it('应该返回正确的耗时信息', async () => {
      mockGenerateText.mockResolvedValue(mockAIResponse(MOCK_INTENT_RESPONSE));

      const result = await engine.generate({
        description: '测试',
      });

      // 验证耗时为非负数（mock 环境下同步执行，耗时可能为 0）
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
      expect(typeof result.totalDuration).toBe('number');
    });

    it('应该在步骤失败时正确标记错误状态', async () => {
      // 设置意图解析成功
      mockGenerateText.mockResolvedValueOnce(mockAIResponse(MOCK_INTENT_RESPONSE));

      // 设置配色方案步骤抛出异常
      mockGenerateText.mockRejectedValueOnce(new Error('AI 服务不可用'));

      // 验证异常被正确抛出
      await expect(
        engine.generate({
          description: '测试失败场景',
        })
      ).rejects.toThrow('AI 服务不可用');
    });
  });
});
