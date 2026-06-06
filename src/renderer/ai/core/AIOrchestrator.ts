/**
 * MIUI Theme Editor - AI 调度器
 * 统一管理多个 AI 提供者，协调 AI 功能的调用
 * 支持对话历史管理、主题上下文注入、多种 AI 功能
 * 集成 AIConfigManager，支持动态 Provider 切换和流式输出
 */

import { AIProvider } from './AIProvider';
import { AIConfigManager } from './AIConfigManager';
import type {
  AIProviderConfig as AIBaseProviderConfig,
  AIGenerateRequest,
  AIGenerateResponse,
  AIStreamChunk,
} from './AIProvider';
import type { AIProviderConfig } from './AIConfigManager';

// ==================== 类型定义 ====================

/** 主题上下文信息 */
interface ThemeContext {
  /** 当前主题名称 */
  themeName?: string;
  /** 当前编辑的资源类型 */
  currentResource?: string;
  /** 主题描述 */
  description?: string;
  /** 额外上下文数据 */
  metadata?: Record<string, any>;
}

/** 对话消息 */
interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/** 重试配置 */
interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试间隔（毫秒） */
  retryDelay: number;
}

/** 流式输出控制器 */
export interface StreamController {
  /** 中断生成 */
  abort: () => void;
  /** 是否已中断 */
  aborted: boolean;
}

// ==================== AI 调度器 ====================

/**
 * AI 调度器
 * 负责管理 AI 提供者、维护对话历史、协调 AI 功能调用
 * 支持动态 Provider 切换、流式输出、错误重试
 */
export class AIOrchestrator {
  /** 已注册的 AI 提供者 */
  private providers: Map<string, AIProvider> = new Map();

  /** 当前激活的提供者名称 */
  private activeProviderName: string | null = null;

  /** 对话历史 */
  private conversationHistory: ConversationMessage[] = [];

  /** 主题上下文 */
  private themeContext: ThemeContext = {};

  /** 最大对话历史长度 */
  private maxHistoryLength: number = 50;

  /** AI 配置管理器 */
  private configManager: AIConfigManager;

  /** 默认重试配置 */
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 2,
    retryDelay: 1000,
  };

  /** 流式输出中断标志 */
  private streamAbortFlags: Map<string, boolean> = new Map();

  constructor() {
    this.configManager = AIConfigManager.getInstance();
    // 监听配置变更，自动重新初始化 Provider
    this.configManager.onChange(() => this.refreshProviders());
    // 初始化 Provider
    this.refreshProviders();
  }

  /**
   * 根据配置管理器刷新所有 AI Provider
   * 动态创建和更新 Provider 实例
   */
  private refreshProviders(): void {
    const configs = this.configManager.getProviders();
    const activeProvider = this.configManager.getActiveProvider();

    // 清理已失效的 Provider
    const currentIds = new Set(configs.map((c) => c.id));
    for (const [id] of this.providers) {
      if (!currentIds.has(id)) {
        this.providers.delete(id);
      }
    }

    // 创建或更新 Provider
    for (const config of configs) {
      if (!config.enabled) continue;

      const decrypted = this.configManager.getDecryptedProvider(config.id);
      if (!decrypted) continue;

      // 如果 Provider 已存在且配置未变，跳过
      const existing = this.providers.get(config.id);
      if (existing) {
        const existingConfig = existing.getConfig();
        if (
          existingConfig.model === decrypted.model &&
          existingConfig.baseUrl === (decrypted.endpoint || '') &&
          existingConfig.apiKey === decrypted.apiKey
        ) {
          continue;
        }
      }

      // 创建新的 Provider 实例
      try {
        const provider = this.createProvider(decrypted);
        if (provider) {
          this.providers.set(config.id, provider);
        }
      } catch (error) {
        console.error(`[AIOrchestrator] 创建 Provider "${config.id}" 失败:`, error);
      }
    }

    // 更新当前激活的 Provider
    if (activeProvider) {
      this.activeProviderName = activeProvider.id;
    } else {
      const firstProvider = this.providers.keys().next().value;
      this.activeProviderName = firstProvider || null;
    }
  }

  /**
   * 根据配置创建对应的 AI Provider 实例
   * @param config AI Provider 配置
   * @returns AIProvider 实例或 null
   */
  private createProvider(config: AIProviderConfig): AIProvider | null {
    const baseConfig: AIBaseProviderConfig = {
      name: config.name || config.id,
      type: (config.provider === 'custom' ? 'custom' : config.provider) as AIBaseProviderConfig['type'],
      baseUrl: config.endpoint || '',
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enabled: config.enabled,
    };

    switch (config.provider) {
      case 'openai': {
        const { OpenAIProvider } = require('../providers/OpenAIProvider');
        return new OpenAIProvider(baseConfig);
      }
      case 'claude': {
        const { ClaudeProvider } = require('../providers/ClaudeProvider');
        return new ClaudeProvider(baseConfig);
      }
      case 'qwen': {
        const { QwenProvider } = require('../providers/QwenProvider');
        return new QwenProvider(baseConfig);
      }
      case 'ollama': {
        // Ollama 使用 OpenAI 兼容 API
        const { OpenAIProvider } = require('../providers/OpenAIProvider');
        return new OpenAIProvider({
          ...baseConfig,
          type: 'openai',
        });
      }
      case 'custom': {
        // 自定义 Provider 使用 OpenAI 兼容格式
        const { OpenAIProvider } = require('../providers/OpenAIProvider');
        return new OpenAIProvider({
          ...baseConfig,
          type: 'openai',
        });
      }
      default:
        console.warn(`[AIOrchestrator] 不支持的 Provider 类型: ${config.provider}`);
        return null;
    }
  }

  /**
   * 注册 AI 提供者
   * @param provider AI 提供者实例
   */
  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.getName(), provider);

    // 如果没有激活的提供者，自动激活第一个
    if (!this.activeProviderName) {
      this.activeProviderName = provider.getName();
    }
  }

  /**
   * 注销 AI 提供者
   * @param name 提供者名称
   */
  unregisterProvider(name: string): void {
    this.providers.delete(name);

    // 如果注销的是当前激活的提供者，切换到另一个
    if (this.activeProviderName === name) {
      const remaining = Array.from(this.providers.keys());
      this.activeProviderName = remaining.length > 0 ? remaining[0] : null;
    }
  }

  /**
   * 设置激活的 AI 提供者
   * @param name 提供者名称
   */
  setActiveProvider(name: string): void {
    if (this.providers.has(name)) {
      this.activeProviderName = name;
    } else {
      console.warn(`[AIOrchestrator] 提供者 "${name}" 未注册`);
    }
  }

  /**
   * 获取当前激活的 AI 提供者
   */
  getActiveProvider(): AIProvider | null {
    if (!this.activeProviderName) return null;
    return this.providers.get(this.activeProviderName) || null;
  }

  /**
   * 获取所有已注册的提供者名称
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 设置主题上下文
   * @param context 主题上下文信息
   */
  setThemeContext(context: ThemeContext): void {
    this.themeContext = { ...this.themeContext, ...context };
  }

  /**
   * 清除主题上下文
   */
  clearThemeContext(): void {
    this.themeContext = {};
  }

  /**
   * 清除对话历史
   */
  clearConversationHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * 带重试机制的通用执行函数
   * @param fn 要执行的异步函数
   * @param retryConfig 重试配置
   * @returns 执行结果
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        console.warn(`[AIOrchestrator] 第 ${attempt + 1} 次尝试失败:`, error.message);

        if (attempt < config.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, config.retryDelay * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('执行失败，已超出最大重试次数');
  }

  /**
   * 生成文本
   * 自动注入系统提示词和对话历史
   */
  async generateText(prompt: string, options?: Partial<AIGenerateRequest>): Promise<AIGenerateResponse> {
    return this.executeWithRetry(async () => {
      const provider = this.getActiveProvider();
      if (!provider) {
        throw new Error('没有可用的 AI 提供者，请先配置 AI 服务');
      }

      // 构建系统提示词
      const systemPrompt = this.buildSystemPrompt(options?.systemPrompt);

      // 构建请求
      const request: AIGenerateRequest = {
        prompt,
        systemPrompt,
        conversationHistory: this.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        ...options,
      };

      // 调用 AI 提供者
      const response = await provider.generateText(request);

      // 更新对话历史
      this.addMessage('user', prompt);
      this.addMessage('assistant', response.text);

      return response;
    });
  }

  /**
   * 流式生成文本
   * 自动注入系统提示词和对话历史，支持中断
   */
  async streamText(
    prompt: string,
    onChunk: (chunk: AIStreamChunk) => void,
    options?: Partial<AIGenerateRequest>
  ): Promise<AIGenerateResponse> {
    const streamId = `stream-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.streamAbortFlags.set(streamId, false);

    try {
      return await this.executeWithRetry(async () => {
        const provider = this.getActiveProvider();
        if (!provider) {
          throw new Error('没有可用的 AI 提供者，请先配置 AI 服务');
        }

        const systemPrompt = this.buildSystemPrompt(options?.systemPrompt);

        const request: AIGenerateRequest = {
          prompt,
          systemPrompt,
          conversationHistory: this.conversationHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          ...options,
        };

        // 添加用户消息到历史
        this.addMessage('user', prompt);

        // 调用流式生成，包装回调以支持中断
        const response = await provider.streamText(request, (chunk: AIStreamChunk) => {
          if (this.streamAbortFlags.get(streamId)) {
            return;
          }
          onChunk(chunk);
        });

        // 检查是否被中断
        if (this.streamAbortFlags.get(streamId)) {
          throw new Error('生成已被用户中断');
        }

        // 添加助手回复到历史
        this.addMessage('assistant', response.text);

        return response;
      });
    } finally {
      this.streamAbortFlags.delete(streamId);
    }
  }

  /**
   * 中断指定流式生成
   * @param streamId 流式输出 ID
   */
  abortStream(streamId: string): void {
    this.streamAbortFlags.set(streamId, true);
  }

  /**
   * 中断所有流式生成
   */
  abortAllStreams(): void {
    for (const key of this.streamAbortFlags.keys()) {
      this.streamAbortFlags.set(key, true);
    }
  }

  /**
   * 生成 MAML 代码
   * 使用 AI 生成 MIUI 动画标记语言代码
   */
  async generateMAML(description: string): Promise<AIGenerateResponse> {
    const prompt = `请根据以下描述生成 MIUI MAML（MIUI Animation Markup Language）代码：

${description}

要求：
1. 使用标准的 MAML 语法
2. 包含必要的变量定义和动画逻辑
3. 代码结构清晰，添加中文注释
4. 确保兼容 MIUI 12+ 版本`;

    return this.generateText(prompt, {
      temperature: 0.7,
      maxTokens: 4000,
    });
  }

  /**
   * 解释 MAML 代码
   * 使用 AI 解释给定的 MAML 代码
   */
  async explainMAML(code: string): Promise<AIGenerateResponse> {
    const prompt = `请解释以下 MIUI MAML 代码的功能和实现原理：

\`\`\`xml
${code}
\`\`\`

请用中文详细说明：
1. 代码的整体功能
2. 关键变量和参数的含义
3. 动画逻辑的执行流程
4. 可能的优化建议`;

    return this.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 3000,
    });
  }

  /**
   * 生成图标设计提示词
   * 根据图标组件名生成适合 AI 图像生成的提示词
   */
  async generateIconPrompt(componentName: string, style?: string): Promise<AIGenerateResponse> {
    const prompt = `请为 MIUI 主题图标生成一个详细的设计描述，用于 AI 图像生成：

图标组件名：${componentName}
设计风格：${style || '现代扁平化，MIUI 风格'}

请输出：
1. 图标的视觉描述（形状、颜色、细节）
2. 适合的配色方案
3. 图标风格参考（如：线性、填充、渐变等）
4. 直接可用于图像生成的英文提示词`;

    return this.generateText(prompt, {
      temperature: 0.8,
      maxTokens: 1000,
    });
  }

  /**
   * 检查设计方案
   * 使用 AI 评估主题设计的合理性
   */
  async checkDesign(designDescription: string): Promise<AIGenerateResponse> {
    const prompt = `请评估以下 MIUI 主题设计方案的质量和合理性：

${designDescription}

请从以下维度进行评估：
1. 视觉一致性（图标风格、配色方案是否统一）
2. 用户体验（对比度、可读性、操作便捷性）
3. MIUI 设计规范兼容性
4. 性能影响（资源大小、动画复杂度）
5. 改进建议

请用中文输出评估报告。`;

    return this.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 3000,
    });
  }

  /**
   * 生成配色方案
   * 根据主题风格生成完整的配色方案
   */
  async generateColorScheme(style: string, isDark: boolean = false): Promise<AIGenerateResponse> {
    const themeType = isDark ? '深色' : '浅色';
    const prompt = `请为 MIUI ${themeType}主题生成一套${style}风格的完整配色方案。

要求：
1. 包含主色调、强调色、背景色、文字色、边框色
2. 提供所有颜色的 HEX 和 RGB 值
3. 说明每种颜色的使用场景
4. 确保颜色对比度符合可读性标准
5. 提供 2-3 组备选配色`;

    return this.generateText(prompt, {
      temperature: 0.7,
      maxTokens: 2000,
    });
  }

  /**
   * 智能补全代码
   * 根据上下文补全 MAML 或相关代码
   */
  async completeCode(code: string, language: 'maml' | 'xml' | 'css' = 'maml'): Promise<AIGenerateResponse> {
    const prompt = `请补全以下 ${language.toUpperCase()} 代码，使其功能完整且正确：

\`\`\`${language}
${code}
\`\`\`

要求：
1. 保持代码风格一致
2. 添加必要的中文注释
3. 确保语法正确
4. 只输出补全后的完整代码，不需要额外解释`;

    return this.generateText(prompt, {
      temperature: 0.2,
      maxTokens: 4000,
    });
  }

  /**
   * 构建系统提示词
   * 注入主题上下文信息
   */
  private buildSystemPrompt(customSystemPrompt?: string): string {
    const basePrompt = `你是一个专业的 MIUI 主题设计助手，精通以下领域：
- MIUI 主题设计和开发
- MAML（MIUI Animation Markup Language）动画编程
- UI/UX 设计原则
- MIUI 设计规范和最佳实践
- 图标设计、壁纸设计、配色方案`;

    // 如果有主题上下文，注入到系统提示词中
    let contextPrompt = '';
    if (this.themeContext.themeName) {
      contextPrompt += `\n当前正在编辑的主题：${this.themeContext.themeName}`;
    }
    if (this.themeContext.currentResource) {
      contextPrompt += `\n当前编辑的资源类型：${this.themeContext.currentResource}`;
    }
    if (this.themeContext.description) {
      contextPrompt += `\n主题描述：${this.themeContext.description}`;
    }

    const customPrompt = customSystemPrompt
      ? `\n\n额外指令：${customSystemPrompt}`
      : '';

    return basePrompt + contextPrompt + customPrompt;
  }

  /**
   * 添加消息到对话历史
   */
  private addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    this.conversationHistory.push({
      role,
      content,
      timestamp: Date.now(),
    });

    // 限制历史长度
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
  }
}

// ==================== 单例 ====================

/** AI 调度器单例实例 */
let orchestratorInstance: AIOrchestrator | null = null;

/**
 * 获取 AI 调度器单例
 * @returns AIOrchestrator 实例
 */
export function getAIOrchestrator(): AIOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AIOrchestrator();
  }
  return orchestratorInstance;
}
