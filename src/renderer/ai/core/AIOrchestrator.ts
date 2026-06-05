/**
 * MIUI Theme Editor - AI 调度器
 * 统一管理多个 AI 提供者，协调 AI 功能的调用
 * 支持对话历史管理、主题上下文注入、多种 AI 功能
 */

import { AIProvider } from './AIProvider';
import type {
  AIProviderConfig,
  AIGenerateRequest,
  AIGenerateResponse,
  AIStreamChunk,
} from './AIProvider';

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

// ==================== AI 调度器 ====================

/**
 * AI 调度器
 * 负责管理 AI 提供者、维护对话历史、协调 AI 功能调用
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
   * 生成文本
   * 自动注入系统提示词和对话历史
   */
  async generateText(prompt: string, options?: Partial<AIGenerateRequest>): Promise<AIGenerateResponse> {
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
  }

  /**
   * 流式生成文本
   * 自动注入系统提示词和对话历史
   */
  async streamText(
    prompt: string,
    onChunk: (chunk: AIStreamChunk) => void,
    options?: Partial<AIGenerateRequest>
  ): Promise<AIGenerateResponse> {
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

    // 调用流式生成
    const response = await provider.streamText(request, onChunk);

    // 添加助手回复到历史
    this.addMessage('assistant', response.text);

    return response;
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
