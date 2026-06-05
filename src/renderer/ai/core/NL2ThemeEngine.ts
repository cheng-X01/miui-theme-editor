/**
 * MIUI Theme Editor - NL2Theme 核心引擎
 * 自然语言描述 → 完整 MIUI 主题的生成 Pipeline
 *
 * 功能：
 * - 解析用户自然语言描述，提取风格、颜色、元素偏好
 * - 生成完整配色方案（主色、辅色、背景色、文字色）
 * - 生成 description.xml 和 theme_config.json 元数据
 * - 生成壁纸描述/提示词
 * - 生成图标风格描述
 * - 生成锁屏 MAML 代码
 * - 组装完整 ThemeProject
 */

import { getAIOrchestrator } from './AIOrchestrator';
import type {
  ThemeProject,
  ThemeDescription,
  ThemeResources,
  WallpaperResource,
  IconResource,
  MAMLModule,
  FontResource,
  SoundResource,
  LockscreenResource,
  StatusbarResource,
} from '../../../shared/types';

// ==================== 类型定义 ====================

/** 主题风格类型 */
export type ThemeStyle =
  | 'minimal'
  | 'vibrant'
  | 'dark'
  | 'light'
  | 'gradient'
  | 'retro'
  | 'neon'
  | 'nature';

/** 主题风格中文映射 */
export const THEME_STYLE_LABELS: Record<ThemeStyle, string> = {
  minimal: '极简',
  vibrant: '活力',
  dark: '暗色',
  light: '浅色',
  gradient: '渐变',
  retro: '复古',
  neon: '霓虹',
  nature: '自然',
};

/** 主题生成请求 */
export interface ThemeGenerationRequest {
  /** 用户自然语言描述 */
  description: string;
  /** 主题风格偏好 */
  style?: ThemeStyle;
  /** 目标 MIUI 版本 */
  targetMIUIVersion?: string;
  /** 是否包含图标 */
  includeIcons?: boolean;
  /** 是否包含壁纸 */
  includeWallpaper?: boolean;
  /** 是否包含锁屏 */
  includeLockscreen?: boolean;
  /** 是否包含字体 */
  includeFont?: boolean;
  /** 是否包含音效 */
  includeSounds?: boolean;
}

/** 生成步骤状态 */
export interface GenerationStep {
  /** 步骤唯一标识 */
  id: string;
  /** 步骤名称 */
  name: string;
  /** 步骤状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  /** 进度百分比（0-100） */
  progress: number;
  /** 步骤消息 */
  message?: string;
  /** 步骤结果数据 */
  result?: any;
}

/** 主题意图（从自然语言中解析） */
export interface ThemeIntent {
  /** 主题名称 */
  themeName: string;
  /** 主题描述 */
  description: string;
  /** 风格偏好 */
  style: ThemeStyle;
  /** 颜色偏好（用户提到的颜色关键词） */
  colorKeywords: string[];
  /** 元素偏好（用户提到的元素关键词） */
  elementKeywords: string[];
  /** 情感/氛围关键词 */
  moodKeywords: string[];
  /** 目标 MIUI 版本 */
  targetMIUIVersion: string;
  /** 是否需要图标 */
  needIcons: boolean;
  /** 是否需要壁纸 */
  needWallpaper: boolean;
  /** 是否需要锁屏 */
  needLockscreen: boolean;
  /** 是否需要字体 */
  needFont: boolean;
  /** 是否需要音效 */
  needSounds: boolean;
}

/** 配色方案 */
export interface ColorScheme {
  /** 主色调 */
  primaryColor: string;
  /** 辅助色 */
  secondaryColor: string;
  /** 强调色 */
  accentColor: string;
  /** 背景色 */
  backgroundColor: string;
  /** 次要背景色 */
  secondaryBackgroundColor: string;
  /** 主文字色 */
  textColor: string;
  /** 次要文字色 */
  secondaryTextColor: string;
  /** 边框色 */
  borderColor: string;
  /** 成功色 */
  successColor: string;
  /** 警告色 */
  warningColor: string;
  /** 错误色 */
  errorColor: string;
  /** 是否为暗色主题 */
  isDark: boolean;
}

/** 主题生成结果 */
export interface ThemeGenerationResult {
  /** 生成的主题项目 */
  project: ThemeProject;
  /** 所有生成步骤的状态 */
  steps: GenerationStep[];
  /** 总耗时（毫秒） */
  totalDuration: number;
  /** 消耗的 token 数 */
  tokensUsed?: number;
}

// ==================== 默认配置 ====================

/** 默认 MIUI 版本 */
const DEFAULT_MIUI_VERSION = 'V14';

/** MIUI 版本选项 */
export const MIUI_VERSIONS = ['V12', 'V13', 'V14', 'V15'];

/** 生成步骤定义 */
const GENERATION_STEPS = [
  { id: 'parse-intent', name: '解析用户意图' },
  { id: 'generate-colors', name: '生成配色方案' },
  { id: 'generate-metadata', name: '生成主题元数据' },
  { id: 'generate-wallpaper', name: '生成壁纸' },
  { id: 'generate-icons', name: '生成图标规范' },
  { id: 'generate-lockscreen', name: '生成锁屏' },
  { id: 'assemble-theme', name: '组装主题' },
] as const;

// ==================== NL2Theme 核心引擎 ====================

/**
 * NL2Theme 核心引擎
 * 将自然语言描述转换为完整的 MIUI 主题项目
 *
 * 生成 Pipeline：
 * 1. 解析用户意图（提取风格、颜色、元素偏好）
 * 2. 生成配色方案（主色、辅色、背景色、文字色）
 * 3. 生成 description.xml 和 theme_config.json
 * 4. 生成壁纸描述/提示词（AI 生成壁纸设计）
 * 5. 生成图标风格描述（AI 生成图标设计规范）
 * 6. 生成锁屏 MAML 代码（AI 生成锁屏组件）
 * 7. 组装完整 ThemeProject
 */
export class NL2ThemeEngine {
  /** 生成步骤状态列表 */
  private steps: GenerationStep[] = [];

  /** 累计 token 使用量 */
  private totalTokensUsed: number = 0;

  /** 生成开始时间 */
  private startTime: number = 0;

  /**
   * 生成主题
   * @param request 主题生成请求
   * @param onStepUpdate 步骤状态更新回调
   * @returns 主题生成结果
   */
  async generate(
    request: ThemeGenerationRequest,
    onStepUpdate?: (steps: GenerationStep[]) => void
  ): Promise<ThemeGenerationResult> {
    this.startTime = Date.now();
    this.totalTokensUsed = 0;

    // 初始化所有步骤为 pending 状态
    this.steps = GENERATION_STEPS.map((step) => ({
      id: step.id,
      name: step.name,
      status: 'pending',
      progress: 0,
    }));
    this.notifySteps(onStepUpdate);

    try {
      // ========== 步骤 1：解析用户意图 ==========
      const intent = await this.runStep('parse-intent', onStepUpdate, () =>
        this.parseIntent(request.description, request)
      );

      // ========== 步骤 2：生成配色方案 ==========
      const colors = await this.runStep('generate-colors', onStepUpdate, () =>
        this.generateColorScheme(intent)
      );

      // ========== 步骤 3：生成主题元数据 ==========
      const metadata = await this.runStep('generate-metadata', onStepUpdate, () =>
        this.generateMetadata(intent, colors)
      );

      // ========== 步骤 4：生成壁纸 ==========
      let wallpapers: WallpaperResource[] = [];
      if (intent.needWallpaper) {
        wallpapers = await this.runStep('generate-wallpaper', onStepUpdate, () =>
          this.generateWallpaper(intent, colors)
        );
      } else {
        this.skipStep('generate-wallpaper', onStepUpdate);
      }

      // ========== 步骤 5：生成图标规范 ==========
      let icons: IconResource[] = [];
      if (intent.needIcons) {
        icons = await this.runStep('generate-icons', onStepUpdate, () =>
          this.generateIconSpecs(intent, colors)
        );
      } else {
        this.skipStep('generate-icons', onStepUpdate);
      }

      // ========== 步骤 6：生成锁屏 ==========
      let lockscreens: MAMLModule[] = [];
      if (intent.needLockscreen) {
        lockscreens = await this.runStep('generate-lockscreen', onStepUpdate, () =>
          this.generateLockscreen(intent, colors)
        );
      } else {
        this.skipStep('generate-lockscreen', onStepUpdate);
      }

      // ========== 步骤 7：组装主题 ==========
      const project = await this.runStep('assemble-theme', onStepUpdate, () =>
        this.assembleTheme(metadata, colors, wallpapers, icons, lockscreens, intent)
      );

      const totalDuration = Date.now() - this.startTime;

      return {
        project,
        steps: [...this.steps],
        totalDuration,
        tokensUsed: this.totalTokensUsed || undefined,
      };
    } catch (error: any) {
      // 标记当前运行中的步骤为失败
      this.steps = this.steps.map((step) =>
        step.status === 'running'
          ? { ...step, status: 'failed' as const, message: error.message }
          : step
      );
      this.notifySteps(onStepUpdate);

      throw error;
    }
  }

  /**
   * 执行单个生成步骤
   * @param stepId 步骤 ID
   * @param onStepUpdate 步骤更新回调
   * @param fn 步骤执行函数
   * @returns 步骤执行结果
   */
  private async runStep<T>(
    stepId: string,
    onStepUpdate: ((steps: GenerationStep[]) => void) | undefined,
    fn: () => T | Promise<T>
  ): Promise<T> {
    // 更新步骤状态为 running
    this.updateStep(stepId, { status: 'running', progress: 10, message: '正在处理...' }, onStepUpdate);

    try {
      const result = await fn();

      // 更新步骤状态为 completed
      this.updateStep(stepId, { status: 'completed', progress: 100, message: '完成', result }, onStepUpdate);

      return result;
    } catch (error: any) {
      // 更新步骤状态为 failed
      this.updateStep(stepId, { status: 'failed', progress: 0, message: error.message }, onStepUpdate);
      throw error;
    }
  }

  /**
   * 跳过某个步骤
   * @param stepId 步骤 ID
   * @param onStepUpdate 步骤更新回调
   */
  private skipStep(
    stepId: string,
    onStepUpdate: ((steps: GenerationStep[]) => void) | undefined
  ): void {
    this.updateStep(stepId, { status: 'skipped', progress: 100, message: '已跳过' }, onStepUpdate);
  }

  /**
   * 更新步骤状态
   * @param stepId 步骤 ID
   * @param updates 要更新的字段
   * @param onStepUpdate 步骤更新回调
   */
  private updateStep(
    stepId: string,
    updates: Partial<GenerationStep>,
    onStepUpdate: ((steps: GenerationStep[]) => void) | undefined
  ): void {
    this.steps = this.steps.map((step) =>
      step.id === stepId ? { ...step, ...updates } : step
    );
    this.notifySteps(onStepUpdate);
  }

  /**
   * 通知步骤更新
   * @param onStepUpdate 回调函数
   */
  private notifySteps(onStepUpdate?: (steps: GenerationStep[]) => void): void {
    if (onStepUpdate) {
      onStepUpdate([...this.steps]);
    }
  }

  /**
   * 解析用户意图
   * 从自然语言描述中提取风格、颜色、元素偏好等信息
   * @param description 用户描述
   * @param request 完整的生成请求（可选）
   * @returns 主题意图
   */
  private async parseIntent(description: string, request?: ThemeGenerationRequest): Promise<ThemeIntent> {
    const orchestrator = getAIOrchestrator();

    const prompt = `请分析以下 MIUI 主题描述，提取关键信息并以 JSON 格式返回：

用户描述："${description}"

请返回以下 JSON 结构（不要包含 markdown 代码块标记）：
{
  "themeName": "为这个主题起一个简洁有吸引力的中文名称（2-6个字）",
  "description": "用一句话概括这个主题的核心特点",
  "style": "从以下选择最匹配的风格：minimal/vibrant/dark/light/gradient/retro/neon/nature",
  "colorKeywords": ["用户提到的颜色关键词，如：蓝色、深蓝、星空蓝等"],
  "elementKeywords": ["用户提到的元素关键词，如：星空、月亮、时钟等"],
  "moodKeywords": ["情感/氛围关键词，如：宁静、科技感、温馨等"],
  "needIcons": true/false,
  "needWallpaper": true/false,
  "needLockscreen": true/false,
  "needFont": true/false,
  "needSounds": true/false
}

注意：
1. 如果用户没有明确说明某个元素，根据风格和描述智能推断是否需要
2. themeName 要简洁有创意
3. 只返回 JSON，不要其他文字`;

    const response = await orchestrator.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 1000,
    });

    // 累计 token
    if (response.usage) {
      this.totalTokensUsed += response.usage.totalTokens;
    }

    // 解析 AI 返回的 JSON
    try {
      // 尝试提取 JSON（可能被包裹在 markdown 代码块中）
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI 返回的数据格式不正确');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        themeName: parsed.themeName || '未命名主题',
        description: parsed.description || description,
        style: parsed.style || 'minimal',
        colorKeywords: parsed.colorKeywords || [],
        elementKeywords: parsed.elementKeywords || [],
        moodKeywords: parsed.moodKeywords || [],
        targetMIUIVersion: 'V14',
        needIcons: parsed.needIcons !== false,
        needWallpaper: parsed.needWallpaper !== false,
        needLockscreen: parsed.needLockscreen !== false,
        needFont: parsed.needFont || false,
        needSounds: parsed.needSounds || false,
      };
    } catch (error) {
      // JSON 解析失败时返回默认意图
      console.warn('[NL2ThemeEngine] 意图解析 JSON 失败，使用默认值:', error);
      return {
        themeName: 'AI 生成主题',
        description: description,
        style: 'minimal',
        colorKeywords: [],
        elementKeywords: [],
        moodKeywords: [],
        targetMIUIVersion: 'V14',
        needIcons: true,
        needWallpaper: true,
        needLockscreen: true,
        needFont: false,
        needSounds: false,
      };
    }
  }

  /**
   * 生成配色方案
   * 根据意图生成完整的主题配色方案
   * @param intent 主题意图
   * @returns 配色方案
   */
  private async generateColorScheme(intent: ThemeIntent): Promise<ColorScheme> {
    const orchestrator = getAIOrchestrator();

    const styleLabel = THEME_STYLE_LABELS[intent.style] || intent.style;

    const prompt = `请为 MIUI 主题生成一套完整的配色方案。

主题信息：
- 名称：${intent.themeName}
- 风格：${styleLabel}
- 描述：${intent.description}
- 颜色偏好：${intent.colorKeywords.join('、') || '无特别要求'}
- 氛围：${intent.moodKeywords.join('、') || '无特别要求'}

请返回以下 JSON 结构（不要包含 markdown 代码块标记）：
{
  "primaryColor": "#主色调 HEX",
  "secondaryColor": "#辅助色 HEX",
  "accentColor": "#强调色 HEX",
  "backgroundColor": "#背景色 HEX",
  "secondaryBackgroundColor": "#次要背景色 HEX",
  "textColor": "#主文字色 HEX",
  "secondaryTextColor": "#次要文字色 HEX",
  "borderColor": "#边框色 HEX",
  "successColor": "#成功色 HEX",
  "warningColor": "#警告色 HEX",
  "errorColor": "#错误色 HEX",
  "isDark": true/false
}

要求：
1. 颜色之间要和谐搭配，确保足够的对比度
2. 文字色在背景色上要清晰可读
3. 如果风格是 dark/neon/retro，isDark 应为 true
4. 只返回 JSON，不要其他文字`;

    const response = await orchestrator.generateText(prompt, {
      temperature: 0.5,
      maxTokens: 800,
    });

    if (response.usage) {
      this.totalTokensUsed += response.usage.totalTokens;
    }

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('配色方案格式不正确');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // 验证颜色格式
      const isValidColor = (color: string) => /^#[0-9a-fA-F]{6}$/.test(color);

      return {
        primaryColor: isValidColor(parsed.primaryColor) ? parsed.primaryColor : '#4a6cf7',
        secondaryColor: isValidColor(parsed.secondaryColor) ? parsed.secondaryColor : '#6c5ce7',
        accentColor: isValidColor(parsed.accentColor) ? parsed.accentColor : '#ff6b6b',
        backgroundColor: isValidColor(parsed.backgroundColor) ? parsed.backgroundColor : '#1a1a2e',
        secondaryBackgroundColor: isValidColor(parsed.secondaryBackgroundColor)
          ? parsed.secondaryBackgroundColor
          : '#16213e',
        textColor: isValidColor(parsed.textColor) ? parsed.textColor : '#e0e0e0',
        secondaryTextColor: isValidColor(parsed.secondaryTextColor)
          ? parsed.secondaryTextColor
          : '#a0a0b0',
        borderColor: isValidColor(parsed.borderColor) ? parsed.borderColor : '#2a2a4a',
        successColor: isValidColor(parsed.successColor) ? parsed.successColor : '#52c41a',
        warningColor: isValidColor(parsed.warningColor) ? parsed.warningColor : '#faad14',
        errorColor: isValidColor(parsed.errorColor) ? parsed.errorColor : '#ff4d4f',
        isDark: parsed.isDark ?? true,
      };
    } catch (error) {
      // 解析失败时返回默认配色
      console.warn('[NL2ThemeEngine] 配色方案解析失败，使用默认值:', error);
      return {
        primaryColor: '#4a6cf7',
        secondaryColor: '#6c5ce7',
        accentColor: '#ff6b6b',
        backgroundColor: '#1a1a2e',
        secondaryBackgroundColor: '#16213e',
        textColor: '#e0e0e0',
        secondaryTextColor: '#a0a0b0',
        borderColor: '#2a2a4a',
        successColor: '#52c41a',
        warningColor: '#faad14',
        errorColor: '#ff4d4f',
        isDark: true,
      };
    }
  }

  /**
   * 生成主题元数据
   * 生成 description.xml 内容和 theme_config.json
   * @param intent 主题意图
   * @param colors 配色方案
   * @returns 主题描述信息
   */
  private async generateMetadata(
    intent: ThemeIntent,
    colors: ColorScheme
  ): Promise<ThemeDescription> {
    // 元数据主要由意图和配色直接构建，不需要额外 AI 调用
    const now = new Date().toISOString();
    const version = '1.0.0';

    const metadata: ThemeDescription = {
      name: intent.themeName,
      author: 'AI 生成',
      version,
      description: intent.description,
      uiVersion: intent.targetMIUIVersion.replace('V', ''),
      designWidth: 1080,
      designHeight: 2400,
      supportsDarkMode: colors.isDark,
      minMIUIVersion: intent.targetMIUIVersion,
      category: this.styleToCategory(intent.style),
      tags: [
        THEME_STYLE_LABELS[intent.style],
        'AI 生成',
        ...intent.moodKeywords.slice(0, 3),
      ],
    };

    return metadata;
  }

  /**
   * 生成壁纸描述
   * 使用 AI 生成壁纸设计提示词和描述
   * @param intent 主题意图
   * @param colors 配色方案
   * @returns 壁纸资源列表
   */
  private async generateWallpaper(
    intent: ThemeIntent,
    colors: ColorScheme
  ): Promise<WallpaperResource[]> {
    const orchestrator = getAIOrchestrator();

    const prompt = `请为 MIUI 主题生成壁纸设计描述。

主题信息：
- 名称：${intent.themeName}
- 风格：${THEME_STYLE_LABELS[intent.style]}
- 描述：${intent.description}
- 主色调：${colors.primaryColor}
- 背景色：${colors.backgroundColor}
- 元素：${intent.elementKeywords.join('、') || '根据风格自动设计'}
- 氛围：${intent.moodKeywords.join('、') || '根据风格自动设计'}

请返回 JSON 数组（不要包含 markdown 代码块标记）：
[
  {
    "name": "壁纸名称",
    "type": "homescreen",
    "description": "壁纸的详细视觉描述（用于 AI 图像生成）",
    "prompt": "英文图像生成提示词（用于 DALL-E/Midjourney 等工具）",
    "resolution": "1080x2400"
  },
  {
    "name": "锁屏壁纸名称",
    "type": "lockscreen",
    "description": "锁屏壁纸的详细视觉描述",
    "prompt": "英文锁屏壁纸生成提示词",
    "resolution": "1080x2400"
  }
]

要求：
1. homescreen 壁纸要大气、有层次感
2. lockscreen 壁纸要简洁，不影响时间显示
3. 壁纸风格要与主题整体风格一致
4. 只返回 JSON，不要其他文字`;

    const response = await orchestrator.generateText(prompt, {
      temperature: 0.7,
      maxTokens: 1500,
    });

    if (response.usage) {
      this.totalTokensUsed += response.usage.totalTokens;
    }

    try {
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('壁纸描述格式不正确');
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        name: string;
        type: 'lockscreen' | 'homescreen';
        description: string;
        prompt: string;
        resolution?: string;
      }>;

      return parsed.map((item) => ({
        name: item.name || '默认壁纸',
        filePath: `wallpaper/${item.type === 'lockscreen' ? 'lockscreen' : 'homescreen'}.jpg`,
        type: item.type || 'homescreen',
        resolution: item.resolution || '1080x2400',
        // 将描述和提示词存储在 previewData 中（临时存储，后续可替换为实际图像）
        previewData: JSON.stringify({
          description: item.description,
          prompt: item.prompt,
        }),
      }));
    } catch (error) {
      // 解析失败时返回默认壁纸
      console.warn('[NL2ThemeEngine] 壁纸生成解析失败，使用默认值:', error);
      return [
        {
          name: '主屏幕壁纸',
          filePath: 'wallpaper/homescreen.jpg',
          type: 'homescreen',
          resolution: '1080x2400',
          previewData: JSON.stringify({
            description: `${intent.themeName} 主题默认壁纸`,
            prompt: `${intent.themeName} theme wallpaper, ${THEME_STYLE_LABELS[intent.style]} style, primary color ${colors.primaryColor}`,
          }),
        },
        {
          name: '锁屏壁纸',
          filePath: 'wallpaper/lockscreen.jpg',
          type: 'lockscreen',
          resolution: '1080x2400',
          previewData: JSON.stringify({
            description: `${intent.themeName} 主题锁屏壁纸`,
            prompt: `${intent.themeName} lockscreen wallpaper, minimal, ${colors.primaryColor}`,
          }),
        },
      ];
    }
  }

  /**
   * 生成图标规范
   * 使用 AI 生成图标设计规范和描述
   * @param intent 主题意图
   * @param colors 配色方案
   * @returns 图标资源列表
   */
  private async generateIconSpecs(
    intent: ThemeIntent,
    colors: ColorScheme
  ): Promise<IconResource[]> {
    const orchestrator = getAIOrchestrator();

    const prompt = `请为 MIUI 主题生成图标设计规范。

主题信息：
- 名称：${intent.themeName}
- 风格：${THEME_STYLE_LABELS[intent.style]}
- 主色调：${colors.primaryColor}
- 辅助色：${colors.secondaryColor}
- 强调色：${colors.accentColor}

请返回 JSON（不要包含 markdown 代码块标记）：
{
  "style": "图标风格描述（如：扁平化、线性、渐变、圆润等）",
  "shape": "图标形状（如：圆角方形、圆形、方形等）",
  "background": "图标背景样式",
  "colorRule": "图标配色规则",
  "commonApps": [
    {
      "componentName": "com.android.settings",
      "description": "设置图标的视觉描述",
      "prompt": "英文图像生成提示词"
    },
    {
      "componentName": "com.android.phone",
      "description": "电话图标的视觉描述",
      "prompt": "英文图像生成提示词"
    },
    {
      "componentName": "com.android.messaging",
      "description": "短信图标的视觉描述",
      "prompt": "英文图像生成提示词"
    },
    {
      "componentName": "com.android.camera",
      "description": "相机图标的视觉描述",
      "prompt": "英文图像生成提示词"
    },
    {
      "componentName": "com.android.browser",
      "description": "浏览器图标的视觉描述",
      "prompt": "英文图像生成提示词"
    }
  ]
}

要求：
1. 图标风格要与主题整体风格一致
2. 图标要清晰可辨、美观大方
3. 只返回 JSON，不要其他文字`;

    const response = await orchestrator.generateText(prompt, {
      temperature: 0.6,
      maxTokens: 2000,
    });

    if (response.usage) {
      this.totalTokensUsed += response.usage.totalTokens;
    }

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('图标规范格式不正确');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const icons: IconResource[] = [];

      // 添加图标风格规范作为第一个"图标"（存储元数据）
      icons.push({
        componentName: '__style_spec__',
        filePath: 'icons/style_spec.json',
        size: 0,
        previewData: JSON.stringify({
          style: parsed.style || '扁平化',
          shape: parsed.shape || '圆角方形',
          background: parsed.background || '纯色背景',
          colorRule: parsed.colorRule || '使用主题主色调',
        }),
      });

      // 添加常见应用图标
      if (parsed.commonApps && Array.isArray(parsed.commonApps)) {
        for (const app of parsed.commonApps) {
          icons.push({
            componentName: app.componentName,
            filePath: `icons/${app.componentName.replace(/\./g, '_')}.png`,
            size: 192,
            previewData: JSON.stringify({
              description: app.description,
              prompt: app.prompt,
            }),
          });
        }
      }

      return icons;
    } catch (error) {
      // 解析失败时返回默认图标
      console.warn('[NL2ThemeEngine] 图标规范解析失败，使用默认值:', error);
      return this.getDefaultIcons(colors);
    }
  }

  /**
   * 生成锁屏 MAML 代码
   * 使用 AI 生成锁屏组件的 MAML 源代码
   * @param intent 主题意图
   * @param colors 配色方案
   * @returns MAML 模块列表
   */
  private async generateLockscreen(
    intent: ThemeIntent,
    colors: ColorScheme
  ): Promise<MAMLModule[]> {
    const orchestrator = getAIOrchestrator();

    const prompt = `请为 MIUI 主题生成锁屏 MAML（MIUI Animation Markup Language）代码。

主题信息：
- 名称：${intent.themeName}
- 风格：${THEME_STYLE_LABELS[intent.style]}
- 描述：${intent.description}
- 主色调：${colors.primaryColor}
- 文字色：${colors.textColor}
- 背景色：${colors.backgroundColor}
- 元素：${intent.elementKeywords.join('、') || '根据风格自动设计'}

请返回 JSON（不要包含 markdown 代码块标记）：
{
  "name": "锁屏名称",
  "description": "锁屏的视觉描述",
  "features": ["功能特性列表"],
  "mamlCode": "完整的 MAML XML 代码字符串（注意转义引号和特殊字符）"
}

MAML 代码要求：
1. 包含时间显示（大号数字时钟）
2. 包含日期显示
3. 包含解锁提示
4. 使用主题配色方案
5. 包含适当的动画效果
6. 兼容 MIUI ${intent.targetMIUIVersion}
7. 代码结构清晰，添加中文注释

只返回 JSON，不要其他文字`;

    const response = await orchestrator.generateText(prompt, {
      temperature: 0.5,
      maxTokens: 4000,
    });

    if (response.usage) {
      this.totalTokensUsed += response.usage.totalTokens;
    }

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('锁屏 MAML 格式不正确');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return [
        {
          name: parsed.name || `${intent.themeName} 锁屏`,
          type: 'lockscreen',
          filePath: 'lockscreen/lockscreen.xml',
          sourceCode: parsed.mamlCode || this.getDefaultLockscreenMAML(colors),
          description: parsed.description || `${intent.themeName} 主题锁屏`,
        },
      ];
    } catch (error) {
      // 解析失败时返回默认锁屏
      console.warn('[NL2ThemeEngine] 锁屏 MAML 解析失败，使用默认值:', error);
      return [
        {
          name: `${intent.themeName} 锁屏`,
          type: 'lockscreen',
          filePath: 'lockscreen/lockscreen.xml',
          sourceCode: this.getDefaultLockscreenMAML(colors),
          description: `${intent.themeName} 主题默认锁屏`,
        },
      ];
    }
  }

  /**
   * 组装完整主题项目
   * 将所有生成的资源组装为一个 ThemeProject
   * @param metadata 主题元数据
   * @param colors 配色方案
   * @param wallpapers 壁纸资源
   * @param icons 图标资源
   * @param lockscreens 锁屏模块
   * @param intent 主题意图
   * @returns 完整的主题项目
   */
  private assembleTheme(
    metadata: ThemeDescription,
    colors: ColorScheme,
    wallpapers: WallpaperResource[],
    icons: IconResource[],
    lockscreens: MAMLModule[],
    intent: ThemeIntent
  ): ThemeProject {
    const now = new Date().toISOString();

    // 构建状态栏配置
    const statusbar: StatusbarResource = {
      bgColor: colors.backgroundColor,
      textColor: colors.textColor,
      showCarrier: false,
    };

    // 构建锁屏资源
    const lockscreenResources: LockscreenResource[] = lockscreens.map((ls) => ({
      name: ls.name,
      filePath: ls.filePath,
      type: 'lockscreen',
      supportsPassword: true,
    }));

    // 构建字体资源（默认空）
    const fonts: FontResource[] = [];

    // 构建音效资源（默认空）
    const sounds: SoundResource[] = [];

    // 组装资源集合
    const resources: ThemeResources = {
      icons,
      wallpapers,
      fonts,
      sounds,
      lockscreens: lockscreenResources,
      statusbar,
      mamlModules: lockscreens,
    };

    // 构建完整项目
    const project: ThemeProject = {
      id: `theme-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: metadata.name,
      description: metadata,
      resources,
      createdAt: now,
      updatedAt: now,
      isDirty: false,
    };

    return project;
  }

  /**
   * 将风格类型转换为主题分类
   * @param style 风格类型
   * @returns 主题分类
   */
  private styleToCategory(style: ThemeStyle): string {
    const categoryMap: Record<ThemeStyle, string> = {
      minimal: '极简',
      vibrant: '活力',
      dark: '暗色',
      light: '浅色',
      gradient: '渐变',
      retro: '复古',
      neon: '科技',
      nature: '自然',
    };
    return categoryMap[style] || '其他';
  }

  /**
   * 获取默认图标列表
   * @param colors 配色方案
   * @returns 默认图标资源
   */
  private getDefaultIcons(colors: ColorScheme): IconResource[] {
    const commonApps = [
      'com.android.settings',
      'com.android.phone',
      'com.android.messaging',
      'com.android.camera',
      'com.android.browser',
      'com.android.calendar',
      'com.android.contacts',
      'com.android.gallery3d',
      'com.android.music',
      'com.android.filemanager',
    ];

    return commonApps.map((componentName) => ({
      componentName,
      filePath: `icons/${componentName.replace(/\./g, '_')}.png`,
      size: 192,
      previewData: JSON.stringify({
        description: `${componentName} 图标`,
        prompt: `MIUI app icon, ${componentName}, flat design, primary color ${colors.primaryColor}`,
      }),
    }));
  }

  /**
   * 获取默认锁屏 MAML 代码
   * @param colors 配色方案
   * @returns MAML XML 代码
   */
  private getDefaultLockscreenMAML(colors: ColorScheme): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<Lockscreen version="2" frameRate="30">
  <!-- ${colors.primaryColor} 主题默认锁屏 -->
  <Var name="hour" type="string" expression="hour(#time#)" />
  <Var name="minute" type="string" expression="minute(#time#)" />
  <Var name="year" type="string" expression="year(#time#)" />
  <Var name="month" type="string" expression="month(#time#)" />
  <Var name="day" type="string" expression="day(#time#)" />
  <Var name="weekday" type="string" expression="weekday(#time#)" />

  <!-- 背景 -->
  <Rectangle name="bg" w="#screen_w" h="#screen_h" fillColor="${colors.backgroundColor}" />

  <!-- 时间显示 -->
  <Text name="time_hour"
    x="#screen_w/2" y="#screen_h*0.35"
    align="center" alignV="center"
    size="120" color="${colors.textColor}"
    fontFamily="miui-light"
    text="#hour#" />

  <Text name="time_colon"
    x="#screen_w/2 + 80" y="#screen_h*0.35 - 20"
    align="center" alignV="center"
    size="100" color="${colors.secondaryTextColor}"
    fontFamily="miui-light"
    text=":" alpha="180" />

  <Text name="time_minute"
    x="#screen_w/2 + 160" y="#screen_h*0.35"
    align="center" alignV="center"
    size="120" color="${colors.textColor}"
    fontFamily="miui-light"
    text="#minute#" />

  <!-- 日期显示 -->
  <Text name="date"
    x="#screen_w/2" y="#screen_h*0.35 + 80"
    align="center" alignV="center"
    size="36" color="${colors.secondaryTextColor}"
    fontFamily="miui-regular"
    text="#year#年#month#月#day#日 #weekday#" />

  <!-- 解锁提示 -->
  <Text name="unlock_hint"
    x="#screen_w/2" y="#screen_h*0.85"
    align="center" alignV="center"
    size="28" color="${colors.secondaryTextColor}"
    fontFamily="miui-regular"
    text="上滑解锁" alpha="150">
    <Animation target="alpha">
      <Item time="0" value="150" />
      <Item time="1500" value="80" />
      <Item time="3000" value="150" />
    </Animation>
  </Text>

  <!-- 底部装饰线 -->
  <Rectangle name="bottom_line"
    x="#screen_w*0.3" y="#screen_h*0.9"
    w="#screen_w*0.4" h="1"
    fillColor="${colors.primaryColor}" alpha="100" />
</Lockscreen>`;
  }
}

// ==================== 单例 ====================

/** NL2Theme 引擎单例实例 */
let engineInstance: NL2ThemeEngine | null = null;

/**
 * 获取 NL2Theme 引擎单例
 * @returns NL2ThemeEngine 实例
 */
export function getNL2ThemeEngine(): NL2ThemeEngine {
  if (!engineInstance) {
    engineInstance = new NL2ThemeEngine();
  }
  return engineInstance;
}
