/**
 * MIUI Theme Editor - 通义千问（Qwen）AI 适配器
 *
 * 通过阿里云 DashScope API 实现 AI 文本生成和流式输出。
 * 通义千问兼容 OpenAI API 格式，可复用 OpenAI 的请求构建逻辑。
 *
 * 默认端点：https://dashscope.aliyuncs.com/compatible-mode/v1
 * 请求/响应格式与 OpenAI 兼容
 * 支持模型：qwen-turbo、qwen-plus、qwen-max、qwen-vl-max 等
 */

import {
  AIProvider,
  AIProviderConfig,
  AIGenerateRequest,
  AIGenerateResponse,
  AIStreamChunk,
  AIImageRequest,
  AIImageResponse,
} from '../core/AIProvider';

// ==================== 类型定义 ====================

/** OpenAI 兼容的 Chat Completion 请求体 */
interface OpenAICompatibleRequest {
  /** 使用的模型 */
  model: string;
  /** 消息列表 */
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  /** 温度参数 */
  temperature?: number;
  /** 最大生成 token 数 */
  max_tokens?: number;
  /** 是否流式输出 */
  stream?: boolean;
}

/** OpenAI 兼容的 Chat Completion 非流式响应体 */
interface OpenAICompatibleResponse {
  /** 响应 ID */
  id: string;
  /** 使用的模型 */
  model: string;
  /** 选择列表 */
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string | null;
  }>;
  /** 使用情况 */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** OpenAI 兼容的流式响应块 */
interface OpenAICompatibleStreamChunk {
  /** 选择列表 */
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
  /** 使用情况 */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** 图像生成请求体（通义千问格式） */
interface QwenImageGenerateRequest {
  /** 使用的模型 */
  model: string;
  /** 输入参数 */
  input: {
    prompt: string;
  };
  /** 请求参数 */
  parameters: {
    size?: string;
    n?: number;
    style?: string;
  };
}

/** 图像生成响应体（通义千问格式） */
interface QwenImageGenerateResponse {
  /** 请求 ID */
  request_id: string;
  /** 输出结果 */
  output: {
    choices: Array<{
      message: {
        content: Array<{
          image_url?: string;
        }>;
      };
    }>;
  };
  /** 使用情况 */
  usage: {
    image_count: number;
  };
}

// ==================== Qwen Provider ====================

/**
 * 通义千问（Qwen）AI 提供者适配器
 * 使用阿里云 DashScope API（OpenAI 兼容模式）实现文本生成和流式输出
 */
export class QwenProvider extends AIProvider {
  /** DashScope API 基础端点 */
  private readonly defaultEndpoint: string = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  constructor(config: AIProviderConfig) {
    super(config);
  }

  /**
   * 获取提供者名称
   */
  get name(): string {
    return 'Qwen';
  }

  /**
   * 获取提供者能力列表
   */
  get capabilities() {
    return ['text-generation', 'code-completion', 'streaming', 'image-generation'] as const;
  }

  /**
   * 获取完整的 API 端点 URL
   */
  private getApiUrl(path: string): string {
    const base = this.config.baseUrl || this.defaultEndpoint;
    return `${base.replace(/\/+$/, '')}${path}`;
  }

  /**
   * 构建请求头（OpenAI 兼容格式）
   */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey || ''}`,
    };
  }

  /**
   * 构建请求体（OpenAI 兼容格式）
   * 将通用的 AIGenerateRequest 转换为 OpenAI 兼容的消息格式
   */
  private buildRequestBody(request: AIGenerateRequest, stream: boolean = false): OpenAICompatibleRequest {
    // 构建消息列表
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

    // 添加系统提示词
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    // 添加对话历史
    if (request.conversationHistory) {
      for (const msg of request.conversationHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // 添加当前用户消息
    messages.push({
      role: 'user',
      content: request.prompt,
    });

    return {
      model: this.config.model,
      messages,
      temperature: request.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
      stream,
    };
  }

  /**
   * 生成文本（一次性返回完整结果）
   * 调用通义千问 Chat Completions API（OpenAI 兼容格式）
   */
  async generateText(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    if (!this.config.apiKey) {
      throw new Error('[QwenProvider] API Key 未配置');
    }

    const startTime = Date.now();

    const body = this.buildRequestBody(request, false);

    const response = await fetch(this.getApiUrl('/chat/completions'), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[QwenProvider] API 请求失败 (${response.status}): ${errorText}`
      );
    }

    const data: OpenAICompatibleResponse = await response.json();

    const duration = Date.now() - startTime;

    const choice = data.choices[0];

    return {
      text: choice?.message?.content || '',
      model: data.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      duration,
    };
  }

  /**
   * 流式生成文本
   * 使用通义千问 SSE 流式 API（OpenAI 兼容格式）逐步返回结果
   */
  async streamText(
    request: AIGenerateRequest,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AIGenerateResponse> {
    if (!this.config.apiKey) {
      throw new Error('[QwenProvider] API Key 未配置');
    }

    const startTime = Date.now();

    const body = this.buildRequestBody(request, true);

    const response = await fetch(this.getApiUrl('/chat/completions'), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[QwenProvider] 流式 API 请求失败 (${response.status}): ${errorText}`
      );
    }

    let fullText = '';
    let promptTokens = 0;
    let completionTokens = 0;

    // 读取 SSE 流
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('[QwenProvider] 无法获取响应流');
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
              const chunk: OpenAICompatibleStreamChunk = JSON.parse(jsonStr);

              // 提取增量文本
              const delta = chunk.choices[0]?.delta?.content || '';
              if (delta) {
                fullText += delta;
                onChunk({
                  delta,
                  done: false,
                });
              }

              // 检查是否完成
              if (chunk.choices[0]?.finish_reason === 'stop') {
                // 流结束
              }

              // 提取使用情况
              if (chunk.usage) {
                promptTokens = chunk.usage.prompt_tokens;
                completionTokens = chunk.usage.completion_tokens;
              }
            } catch {
              // JSON 解析失败，跳过此行
              console.warn('[QwenProvider] SSE 事件解析失败:', jsonStr);
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
   * 生成图像
   * 使用通义千问图像生成 API（DashScope 原生格式）
   */
  async generateImage(request: AIImageRequest): Promise<AIImageResponse> {
    if (!this.config.apiKey) {
      throw new Error('[QwenProvider] API Key 未配置');
    }

    const startTime = Date.now();

    // 通义千问使用 DashScope 原生 API 进行图像生成
    const imageEndpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';

    const body: QwenImageGenerateRequest = {
      model: this.config.model || 'qwen-turbo',
      input: {
        prompt: request.prompt,
      },
      parameters: {
        size: request.size || '1024*1024',
        n: request.n || 1,
        style: request.style || '<auto>',
      },
    };

    const response = await fetch(imageEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[QwenProvider] 图像生成 API 请求失败 (${response.status}): ${errorText}`
      );
    }

    const data: QwenImageGenerateResponse = await response.json();

    const duration = Date.now() - startTime;

    // 提取图像 URL 列表
    const urls = data.output?.choices?.flatMap((choice) =>
      choice.message?.content
        ?.map((item) => item.image_url || '')
        .filter(Boolean) || []
    ) || [];

    return {
      urls,
      model: this.config.model,
      duration,
    };
  }

  /**
   * 检查通义千问 API 是否可用
   * 通过发送一个最小请求来验证 API Key 和网络连通性
   */
  async checkAvailability(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    try {
      // 使用 OpenAI 兼容端点检查可用性
      const response = await fetch(this.getApiUrl('/models'), {
        method: 'GET',
        headers: this.buildHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
