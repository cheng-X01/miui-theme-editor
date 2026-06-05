/**
 * MIUI Theme Editor - AI 配置管理器
 * 负责读取/保存 AI Provider 配置，支持多 Provider 配置管理
 * 配置使用 localStorage 持久化，API Key 使用简单 Base64 编码存储
 */

// ==================== 类型定义 ====================

/** AI Provider 类型 */
export type AIProviderType = 'openai' | 'claude' | 'ollama' | 'custom';

/** AI Provider 配置 */
export interface AIProviderConfig {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** Provider 类型 */
  provider: AIProviderType;
  /** API 密钥 */
  apiKey?: string;
  /** API 端点地址 */
  endpoint?: string;
  /** 使用的模型 */
  model: string;
  /** 最大 Token 数 */
  maxTokens?: number;
  /** 温度参数（0-2） */
  temperature?: number;
  /** 是否启用 */
  enabled: boolean;
}

/** 配置变更监听器 */
type ConfigChangeListener = () => void;

// ==================== 常量定义 ====================

/** localStorage 配置键名 */
const STORAGE_KEY = 'miui-theme-editor-ai-config';

/** 默认 Provider 配置模板 */
const DEFAULT_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'openai-default',
    name: 'OpenAI',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7,
    enabled: true,
  },
  {
    id: 'claude-default',
    name: 'Claude',
    provider: 'claude',
    endpoint: 'https://api.anthropic.com/v1',
    model: 'claude-3-sonnet-20240229',
    maxTokens: 4096,
    temperature: 0.7,
    enabled: false,
  },
  {
    id: 'ollama-default',
    name: 'Ollama',
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    model: 'llama3',
    maxTokens: 4096,
    temperature: 0.7,
    enabled: false,
  },
];

/** 各 Provider 推荐的模型列表 */
export const RECOMMENDED_MODELS: Record<AIProviderType, string[]> = {
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
  ],
  claude: [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ],
  ollama: [
    'llama3',
    'llama3.1',
    'qwen2',
    'mistral',
    'gemma2',
    'phi3',
    'codellama',
  ],
  custom: [
    'custom-model',
  ],
};

/** Provider 显示名称映射 */
export const PROVIDER_LABELS: Record<AIProviderType, string> = {
  openai: 'OpenAI',
  claude: 'Claude (Anthropic)',
  ollama: 'Ollama (本地)',
  custom: '自定义',
};

// ==================== 工具函数 ====================

/**
 * 简单 Base64 编码（用于 API Key 加密存储）
 * @param text 原始文本
 * @returns Base64 编码后的文本
 */
function simpleEncrypt(text: string): string {
  try {
    return btoa(encodeURIComponent(text));
  } catch {
    return text;
  }
}

/**
 * 简单 Base64 解码
 * @param encrypted Base64 编码的文本
 * @returns 原始文本
 */
function simpleDecrypt(encrypted: string): string {
  try {
    return decodeURIComponent(atob(encrypted));
  } catch {
    return encrypted;
  }
}

/**
 * 生成唯一 ID
 * @returns 唯一标识符
 */
function generateId(): string {
  return `provider-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ==================== 配置管理器 ====================

/**
 * AI 配置管理器
 * 单例模式，负责所有 AI Provider 配置的读取、保存和管理
 */
export class AIConfigManager {
  /** 单例实例 */
  private static instance: AIConfigManager | null = null;

  /** Provider 配置列表 */
  private providers: AIProviderConfig[] = [];

  /** 当前激活的 Provider ID */
  private activeProviderId: string | null = null;

  /** 配置变更监听器列表 */
  private listeners: ConfigChangeListener[] = [];

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor() {
    this.loadFromStorage();
  }

  /**
   * 获取 AIConfigManager 单例实例
   * @returns AIConfigManager 实例
   */
  static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager();
    }
    return AIConfigManager.instance;
  }

  /**
   * 获取所有 Provider 配置
   * @returns Provider 配置数组
   */
  getProviders(): AIProviderConfig[] {
    return this.providers.map((p) => ({ ...p }));
  }

  /**
   * 获取当前激活的 Provider 配置
   * @returns 激活的 Provider 配置，如果没有则返回 null
   */
  getActiveProvider(): AIProviderConfig | null {
    if (!this.activeProviderId) {
      // 自动选择第一个启用的 Provider
      const enabled = this.providers.find((p) => p.enabled);
      if (enabled) {
        this.activeProviderId = enabled.id;
        return { ...enabled };
      }
      return null;
    }
    const provider = this.providers.find((p) => p.id === this.activeProviderId);
    return provider ? { ...provider } : null;
  }

  /**
   * 设置当前激活的 Provider
   * @param id Provider ID
   */
  setActiveProvider(id: string): void {
    const provider = this.providers.find((p) => p.id === id);
    if (!provider) {
      console.warn(`[AIConfigManager] Provider "${id}" 不存在`);
      return;
    }
    this.activeProviderId = id;
    // 自动启用该 Provider
    if (!provider.enabled) {
      provider.enabled = true;
    }
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * 添加新的 Provider 配置
   * @param config Provider 配置（id 可选，会自动生成）
   */
  addProvider(config: Omit<AIProviderConfig, 'id'> & { id?: string }): void {
    const newProvider: AIProviderConfig = {
      ...config,
      id: config.id || generateId(),
    };

    // 加密存储 API Key
    if (newProvider.apiKey) {
      newProvider.apiKey = simpleEncrypt(newProvider.apiKey);
    }

    this.providers.push(newProvider);

    // 如果是第一个 Provider，自动设为激活
    if (this.providers.length === 1) {
      this.activeProviderId = newProvider.id;
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * 更新 Provider 配置
   * @param id Provider ID
   * @param config 部分配置字段
   */
  updateProvider(id: string, config: Partial<AIProviderConfig>): void {
    const index = this.providers.findIndex((p) => p.id === id);
    if (index === -1) {
      console.warn(`[AIConfigManager] Provider "${id}" 不存在，无法更新`);
      return;
    }

    const provider = this.providers[index];

    // 如果更新包含 apiKey，进行加密
    if (config.apiKey !== undefined) {
      config.apiKey = simpleEncrypt(config.apiKey);
    }

    this.providers[index] = { ...provider, ...config };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * 删除 Provider 配置
   * @param id Provider ID
   */
  removeProvider(id: string): void {
    const index = this.providers.findIndex((p) => p.id === id);
    if (index === -1) {
      console.warn(`[AIConfigManager] Provider "${id}" 不存在，无法删除`);
      return;
    }

    this.providers.splice(index, 1);

    // 如果删除的是当前激活的 Provider，切换到另一个
    if (this.activeProviderId === id) {
      const enabled = this.providers.find((p) => p.enabled);
      this.activeProviderId = enabled ? enabled.id : null;
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * 测试 Provider 连接是否可用
   * @param id Provider ID
   * @returns 连接是否成功
   */
  async testProvider(id: string): Promise<boolean> {
    const provider = this.providers.find((p) => p.id === id);
    if (!provider) {
      console.warn(`[AIConfigManager] Provider "${id}" 不存在，无法测试`);
      return false;
    }

    const config = { ...provider };
    // 解密 API Key
    if (config.apiKey) {
      config.apiKey = simpleDecrypt(config.apiKey);
    }

    try {
      switch (config.provider) {
        case 'openai': {
          const { OpenAIProvider } = await import('../../providers/OpenAIProvider');
          const openai = new OpenAIProvider({
            name: config.name,
            type: 'openai',
            baseUrl: config.endpoint || 'https://api.openai.com/v1',
            apiKey: config.apiKey,
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            enabled: config.enabled,
          });
          return await openai.checkAvailability();
        }
        case 'claude': {
          // 简单的 Claude API 测试
          const response = await fetch(`${config.endpoint}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.apiKey || '',
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: config.model,
              max_tokens: 1,
              messages: [{ role: 'user', content: 'Hi' }],
            }),
          });
          return response.status === 200 || response.status === 400; // 400 也表示 API 可达
        }
        case 'ollama': {
          const response = await fetch(`${config.endpoint}/api/tags`, {
            method: 'GET',
          });
          return response.ok;
        }
        case 'custom': {
          // 自定义 Provider 尝试发送一个简单的请求
          if (!config.endpoint) return false;
          const response = await fetch(`${config.endpoint}/models`, {
            method: 'GET',
            headers: config.apiKey
              ? { Authorization: `Bearer ${config.apiKey}` }
              : undefined,
          });
          return response.ok;
        }
        default:
          return false;
      }
    } catch (error) {
      console.error(`[AIConfigManager] 测试 Provider "${id}" 失败:`, error);
      return false;
    }
  }

  /**
   * 注册配置变更监听器
   * @param listener 监听器函数
   * @returns 取消注册的函数
   */
  onChange(listener: ConfigChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取解密后的 Provider 配置（用于实际调用 AI 服务）
   * @param id Provider ID
   * @returns 解密后的 Provider 配置
   */
  getDecryptedProvider(id: string): AIProviderConfig | null {
    const provider = this.providers.find((p) => p.id === id);
    if (!provider) return null;
    return {
      ...provider,
      apiKey: provider.apiKey ? simpleDecrypt(provider.apiKey) : undefined,
    };
  }

  /**
   * 通知所有监听器配置已变更
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('[AIConfigManager] 监听器执行失败:', error);
      }
    });
  }

  /**
   * 保存配置到 localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        providers: this.providers,
        activeProviderId: this.activeProviderId,
        version: 1,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[AIConfigManager] 保存配置失败:', error);
    }
  }

  /**
   * 从 localStorage 加载配置
   */
  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // 首次使用，加载默认配置
        this.providers = DEFAULT_PROVIDERS.map((p) => ({ ...p }));
        this.activeProviderId = this.providers[0]?.id || null;
        this.saveToStorage();
        return;
      }

      const data = JSON.parse(raw);
      if (data.providers && Array.isArray(data.providers)) {
        this.providers = data.providers;
        this.activeProviderId = data.activeProviderId || null;
      } else {
        // 数据格式不兼容，重置为默认
        this.providers = DEFAULT_PROVIDERS.map((p) => ({ ...p }));
        this.activeProviderId = this.providers[0]?.id || null;
        this.saveToStorage();
      }
    } catch (error) {
      console.error('[AIConfigManager] 加载配置失败:', error);
      this.providers = DEFAULT_PROVIDERS.map((p) => ({ ...p }));
      this.activeProviderId = this.providers[0]?.id || null;
    }
  }
}
