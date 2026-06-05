/**
 * MIUI Theme Editor - OpenAI 适配器
 * 使用 OpenAI SDK 实现的 AI 提供者适配器
 * 支持 GPT-4、GPT-3.5 等模型，以及 DALL-E 图像生成
 */

import OpenAI from 'openai';
import {
  AIProvider,
  AIProviderConfig,
  AIGenerateRequest,
  AIGenerateResponse,
  AIStreamChunk,
  AIImageRequest,
  AIImageResponse,
} from '../core/AIProvider';

/**
 * OpenAI 提供者适配器
 * 通过 OpenAI SDK 与 OpenAI API 通信
 */
export class OpenAIProvider extends AIProvider {
  /** OpenAI 客户端实例 */
  private client: OpenAI | null = null;

  constructor(config: AIProviderConfig) {
    super(config);
    this.initClient();
  }

  /**
   * 初始化 OpenAI 客户端
   */
  private initClient(): void {
    try {
      this.client = new OpenAI({
        apiKey: this.config.apiKey || '',
        baseURL: this.config.baseUrl || undefined,
        dangerouslyAllowBrowser: true, // 允许在浏览器中使用（开发环境）
      });
    } catch (error) {
      console.error('[OpenAIProvider] 初始化客户端失败:', error);
      this.client = null;
    }
  }

  /**
   * 生成文本
   * 使用 OpenAI Chat Completions API
   */
  async generateText(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    if (!this.client) {
      throw new Error('OpenAI 客户端未初始化');
    }

    const startTime = Date.now();

    // 构建消息列表
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // 添加系统提示词
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    // 添加对话历史
    if (request.conversationHistory) {
      for (const msg of request.conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // 添加用户提示词
    messages.push({ role: 'user', content: request.prompt });

    // 调用 OpenAI API
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages,
      temperature: request.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 2000,
    });

    const duration = Date.now() - startTime;
    const choice = response.choices[0];

    return {
      text: choice?.message?.content || '',
      model: response.model,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      duration,
    };
  }

  /**
   * 流式生成文本
   * 使用 OpenAI Streaming API 逐步返回结果
   */
  async streamText(
    request: AIGenerateRequest,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIGenerateResponse> {
    if (!this.client) {
      throw new Error('OpenAI 客户端未初始化');
    }

    const startTime = Date.now();

    // 构建消息列表
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    if (request.conversationHistory) {
      for (const msg of request.conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: request.prompt });

    // 调用 OpenAI Streaming API
    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages,
      temperature: request.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 2000,
      stream: true,
    });

    let fullText = '';

    // 逐块读取流式响应
    for await (const chunk of stream as any) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullText += delta;
        onChunk({
          delta,
          done: false,
        });
      }
    }

    // 通知完成
    onChunk({
      delta: '',
      done: true,
    });

    const duration = Date.now() - startTime;

    return {
      text: fullText,
      model: this.config.model,
      duration,
    };
  }

  /**
   * 生成图像
   * 使用 DALL-E API 生成图像
   */
  async generateImage(request: AIImageRequest): Promise<AIImageResponse> {
    if (!this.client) {
      throw new Error('OpenAI 客户端未初始化');
    }

    const startTime = Date.now();

    const response = await this.client.images.generate({
      model: 'dall-e-3',
      prompt: request.prompt,
      n: request.n || 1,
      size: request.size || '1024x1024',
      style: (request.style as any) || 'vivid',
    });

    const duration = Date.now() - startTime;

    return {
      urls: response.data.map((item) => item.url || ''),
      model: 'dall-e-3',
      duration,
    };
  }

  /**
   * 检查 OpenAI 服务是否可用
   * 通过发送一个简单的 API 请求来验证
   */
  async checkAvailability(): Promise<boolean> {
    if (!this.client || !this.config.apiKey) {
      return false;
    }

    try {
      // 尝试获取模型列表来验证 API 密钥
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 更新配置时重新初始化客户端
   */
  updateConfig(config: Partial<AIProviderConfig>): void {
    super.updateConfig(config);
    this.initClient();
  }
}
