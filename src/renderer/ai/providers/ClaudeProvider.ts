/**
 * MIUI Theme Editor - Claude（Anthropic）AI 适配器
 *
 * 通过 Anthropic Messages API 实现 AI 文本生成和流式输出。
 * 支持模型：claude-3-5-sonnet、claude-3-opus、claude-3-haiku 等。
 *
 * API 端点：https://api.anthropic.com/v1/messages
 * 请求头：x-api-key, anthropic-version: 2023-06-01, content-type: application/json
 * 请求体：{ model, max_tokens, system, messages: [{role, content}] }
 * 流式响应：{ type: 'content_block_delta', delta: { type: 'text_delta', text: '...' } }
 */

import {
  AIProvider,
  AIProviderConfig,
  AIGenerateRequest,
  AIGenerateResponse,
  AIStreamChunk,
} from '../core/AIProvider';

// ==================== 类型定义 ====================

/** Anthropic API 请求体 */
interface AnthropicMessageRequest {
  /** 使用的模型 */
  model: string;
  /** 最大生成 token 数 */
  max_tokens: number;
  /** 系统提示词 */
  system?: string;
  /** 消息列表 */
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  /** 温度参数 */
  temperature?: number;
  /** 流式输出标志 */
  stream?: boolean;
}

/** Anthropic API 非流式响应体 */
interface AnthropicMessageResponse {
  /** 响应 ID */
  id: string;
  /** 使用的模型 */
  model: string;
  /** 停止原因 */
  stop_reason: string | null;
  /** 使用情况 */
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  /** 内容块列表 */
  content: Array<{
    type: string;
    text?: string;
  }>;
}

/** Anthropic SSE 流式事件类型 */
interface AnthropicStreamEvent {
  /** 事件类型 */
  type: string;
  /** 事件索引 */
  index?: number;
  /** 增量数据 */
  delta?: {
    type: string;
    text?: string;
  };
  /** 使用情况（在 message_stop 事件中） */
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ==================== Claude Provider ====================

/**
 * Claude（Anthropic）AI 提供者适配器
 * 使用 Anthropic Messages API 实现文本生成和流式输出
 */
export class ClaudeProvider extends AIProvider {
  /** Anthropic API 端点 */
  private readonly apiEndpoint: string = 'https://api.anthropic.com/v1/messages';

  /** Anthropic API 版本 */
  private readonly apiVersion: string = '2023-06-01';

  constructor(config: AIProviderConfig) {
    super(config);
  }

  /**
   * 获取提供者名称
   */
  get name(): string {
    return 'Claude';
  }

  /**
   * 获取提供者能力列表
   */
  get capabilities() {
    return ['text-generation', 'code-completion', 'streaming'] as const;
  }

  /**
   * 构建请求头
   */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey || '',
      'anthropic-version': this.apiVersion,
    };
  }

  /**
   * 构建请求体
   * 将通用的 AIGenerateRequest 转换为 Anthropic API 格式
   */
  private buildRequestBody(request: AIGenerateRequest, stream: boolean = false): AnthropicMessageRequest {
    // 构建消息列表
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // 添加对话历史（Claude API 不支持 system role 的消息，需单独处理）
    if (request.conversationHistory) {
      for (const msg of request.conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // 添加当前用户消息
    messages.push({
      role: 'user',
      content: request.prompt,
    });

    return {
      model: this.config.model,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
      system: request.systemPrompt || undefined,
      messages,
      temperature: request.temperature ?? this.config.temperature ?? 0.7,
      stream,
    };
  }

  /**
   * 生成文本（一次性返回完整结果）
   * 调用 Anthropic Messages API
   */
  async generateText(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    if (!this.config.apiKey) {
      throw new Error('[ClaudeProvider] API Key 未配置');
    }

    const startTime = Date.now();

    const body = this.buildRequestBody(request, false);

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[ClaudeProvider] API 请求失败 (${response.status}): ${errorText}`
      );
    }

    const data: AnthropicMessageResponse = await response.json();

    const duration = Date.now() - startTime;

    // 提取生成的文本
    const text = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text || '')
      .join('');

    return {
      text,
      model: data.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      duration,
    };
  }

  /**
   * 流式生成文本
   * 使用 Anthropic SSE（Server-Sent Events）流式 API 逐步返回结果
   */
  async streamText(
    request: AIGenerateRequest,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIGenerateResponse> {
    if (!this.config.apiKey) {
      throw new Error('[ClaudeProvider] API Key 未配置');
    }

    const startTime = Date.now();

    const body = this.buildRequestBody(request, true);

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[ClaudeProvider] 流式 API 请求失败 (${response.status}): ${errorText}`
      );
    }

    let fullText = '';
    let promptTokens = 0;
    let completionTokens = 0;

    // 读取 SSE 流
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('[ClaudeProvider] 无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 按行解析 SSE 事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留未完成的行

        for (const line of lines) {
          const trimmed = line.trim();

          // 跳过空行和注释
          if (!trimmed || trimmed.startsWith(':')) continue;

          // 解析 SSE 数据行
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);

            // 检查流结束标记
            if (jsonStr === '[DONE]') continue;

            try {
              const event: AnthropicStreamEvent = JSON.parse(jsonStr);

              switch (event.type) {
                case 'content_block_delta':
                  // 文本增量
                  if (event.delta?.type === 'text_delta' && event.delta.text) {
                    fullText += event.delta.text;
                    onChunk({
                      delta: event.delta.text,
                      done: false,
                    });
                  }
                  break;

                case 'message_stop':
                  // 消息结束，尝试获取使用情况
                  if (event.usage) {
                    promptTokens = event.usage.input_tokens;
                    completionTokens = event.usage.output_tokens;
                  }
                  break;

                case 'message_delta':
                  // 消息级别的增量信息（包含使用情况）
                  if (event.usage) {
                    promptTokens = event.usage.input_tokens;
                    completionTokens = event.usage.output_tokens;
                  }
                  break;

                default:
                  // 其他事件类型（message_start, content_block_start 等）忽略
                  break;
              }
            } catch {
              // JSON 解析失败，跳过此行
              console.warn('[ClaudeProvider] SSE 事件解析失败:', jsonStr);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // 通知流式输出完成
    onChunk({
      delta: '',
      done: true,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    });

    const duration = Date.now() - startTime;

    return {
      text: fullText,
      model: this.config.model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      duration,
    };
  }

  /**
   * 检查 Claude API 是否可用
   * 通过发送一个最小请求来验证 API Key 和网络连通性
   */
  async checkAvailability(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      // 200 表示成功，400 也表示 API 可达（可能是参数问题）
      return response.status === 200 || response.status === 400;
    } catch {
      return false;
    }
  }
}
