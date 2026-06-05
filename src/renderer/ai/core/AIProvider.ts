/**
 * MIUI Theme Editor - AI 提供者抽象接口
 * 定义 AI 服务的统一接口，支持多种 AI 提供者（OpenAI、Ollama 等）
 */

// ==================== 类型定义 ====================

/** AI 提供者配置 */
export interface AIProviderConfig {
  /** 提供者名称 */
  name: string;
  /** 提供者类型 */
  type: 'openai' | 'ollama' | 'custom';
  /** API 地址 */
  baseUrl: string;
  /** API 密钥 */
  apiKey?: string;
  /** 默认使用的模型 */
  model: string;
  /** 温度参数（0-1） */
  temperature?: number;
  /** 最大 token 数 */
  maxTokens?: number;
  /** 是否启用 */
  enabled: boolean;
}

/** AI 文本生成请求 */
export interface AIGenerateRequest {
  /** 提示词 */
  prompt: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大 token 数 */
  maxTokens?: number;
  /** 对话历史 */
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

/** AI 文本生成响应 */
export interface AIGenerateResponse {
  /** 生成的文本 */
  text: string;
  /** 使用的模型 */
  model: string;
  /** 消耗的 token 数 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 生成耗时（毫秒） */
  duration: number;
}

/** AI 流式响应块 */
export interface AIStreamChunk {
  /** 增量文本 */
  delta: string;
  /** 是否已完成 */
  done: boolean;
  /** 累计 token 数 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** AI 图像生成请求 */
export interface AIImageRequest {
  /** 图像描述提示词 */
  prompt: string;
  /** 图像尺寸 */
  size?: '256x256' | '512x512' | '1024x1024';
  /** 图像数量 */
  n?: number;
  /** 图像风格 */
  style?: string;
}

/** AI 图像生成响应 */
export interface AIImageResponse {
  /** 生成的图像 URL 列表 */
  urls: string[];
  /** 使用的模型 */
  model: string;
  /** 生成耗时（毫秒） */
  duration: number;
}

// ==================== 抽象基类 ====================

/**
 * AI 提供者抽象基类
 * 所有 AI 服务适配器都需要继承此类并实现相应方法
 */
export abstract class AIProvider {
  /** 提供者配置 */
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  /**
   * 获取提供者名称
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * 获取提供者类型
   */
  getType(): string {
    return this.config.type;
  }

  /**
   * 获取提供者配置
   */
  getConfig(): AIProviderConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 生成文本（一次性返回完整结果）
   * @param request 生成请求
   * @returns 生成响应
   */
  abstract generateText(request: AIGenerateRequest): Promise<AIGenerateResponse>;

  /**
   * 流式生成文本（逐步返回结果）
   * @param request 生成请求
   * @param onChunk 每次收到新内容时的回调
   * @returns 完整的生成响应
   */
  abstract streamText(
    request: AIGenerateRequest,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIGenerateResponse>;

  /**
   * 生成图像（可选功能）
   * @param request 图像生成请求
   * @returns 图像生成响应
   */
  async generateImage?(request: AIImageRequest): Promise<AIImageResponse>;

  /**
   * 检查提供者是否可用
   * @returns 是否可用
   */
  abstract checkAvailability(): Promise<boolean>;
}
