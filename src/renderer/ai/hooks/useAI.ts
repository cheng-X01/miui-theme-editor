/**
 * MIUI Theme Editor - AI React Hook
 * 封装 AI 调度器的 React Hook，提供响应式的 AI 功能接口
 * 支持流式输出、中断生成、配置变更监听和更好的错误处理
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getAIOrchestrator } from '../core/AIOrchestrator';
import { AIConfigManager } from '../core/AIConfigManager';
import type { AIStreamChunk } from '../core/AIProvider';

// ==================== 类型定义 ====================

/** useAI Hook 选项 */
interface UseAIOptions {
  /** 自定义系统提示词 */
  systemPrompt?: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大 token 数 */
  maxTokens?: number;
  /** 是否在生成时自动清除之前的响应 */
  autoClear?: boolean;
}

/** useAI Hook 返回值 */
interface UseAIResult {
  /** 是否正在加载（非流式） */
  isLoading: boolean;
  /** 是否正在流式生成 */
  isStreaming: boolean;
  /** 当前响应文本 */
  response: string;
  /** 错误信息 */
  error: string | null;
  /** 生成文本（非流式） */
  generate: (prompt: string) => Promise<string>;
  /** 流式生成文本 */
  stream: (prompt: string) => Promise<string>;
  /** 中断生成 */
  abort: () => void;
  /** 清除响应 */
  clear: () => void;
  /** 当前激活的 Provider 名称 */
  activeProvider: string | null;
  /** Provider 是否已配置 */
  isConfigured: boolean;
}

// ==================== Hook 实现 ====================

/**
 * AI 功能 React Hook
 * 提供简洁的接口来调用 AI 生成功能
 *
 * 增强功能：
 * - 支持流式输出（stream 方法）
 * - 支持中断生成（abort 方法）
 * - 更好的错误处理
 * - 支持配置变更监听
 * - Provider 配置状态跟踪
 *
 * @example
 * ```tsx
 * const { generate, stream, abort, response, isLoading, isStreaming, clear } = useAI({
 *   systemPrompt: '你是一个 MIUI 主题设计专家',
 *   temperature: 0.7,
 * });
 *
 * // 非流式生成
 * const result = await generate('帮我设计一个科技感的图标');
 *
 * // 流式生成
 * await stream('解释这段 MAML 代码');
 *
 * // 中断生成
 * abort();
 * ```
 */
export function useAI(options: UseAIOptions = {}): UseAIResult {
  const {
    systemPrompt,
    temperature,
    maxTokens,
    autoClear = true,
  } = options;

  // 状态
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // 引用（避免闭包问题）
  const responseRef = useRef('');
  const abortRef = useRef(false);
  const streamIdRef = useRef<string>('');
  const orchestratorRef = useRef(getAIOrchestrator());
  const configManagerRef = useRef(AIConfigManager.getInstance());

  /**
   * 检查并更新 Provider 配置状态
   */
  const checkProviderStatus = useCallback(() => {
    const provider = configManagerRef.current.getActiveProvider();
    setActiveProvider(provider?.name || null);
    setIsConfigured(!!provider && !!provider.model);
  }, []);

  // 初始化时检查 Provider 状态
  useEffect(() => {
    checkProviderStatus();
  }, [checkProviderStatus]);

  // 监听配置变更
  useEffect(() => {
    const unsubscribe = configManagerRef.current.onChange(() => {
      checkProviderStatus();
    });
    return () => unsubscribe();
  }, [checkProviderStatus]);

  /**
   * 非流式生成文本
   * @param prompt 用户提示词
   * @returns 生成的文本
   */
  const generate = useCallback(async (prompt: string): Promise<string> => {
    // 检查 Provider 是否已配置
    if (!isConfigured) {
      const errorMsg = 'AI Provider 未配置，请先配置 AI 服务';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      setIsLoading(true);
      setError(null);
      abortRef.current = false;

      if (autoClear) {
        setResponse('');
        responseRef.current = '';
      }

      const orchestrator = orchestratorRef.current;
      const result = await orchestrator.generateText(prompt, {
        systemPrompt,
        temperature,
        maxTokens,
      });

      // 检查是否在中断后完成
      if (abortRef.current) {
        return responseRef.current;
      }

      setResponse(result.text);
      responseRef.current = result.text;

      return result.text;
    } catch (err: any) {
      const errorMsg = err.message || 'AI 生成失败';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [systemPrompt, temperature, maxTokens, autoClear, isConfigured]);

  /**
   * 流式生成文本
   * @param prompt 用户提示词
   * @returns 完整的生成文本
   */
  const stream = useCallback(async (prompt: string): Promise<string> => {
    // 检查 Provider 是否已配置
    if (!isConfigured) {
      const errorMsg = 'AI Provider 未配置，请先配置 AI 服务';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      setIsStreaming(true);
      setError(null);
      abortRef.current = false;

      if (autoClear) {
        setResponse('');
        responseRef.current = '';
      }

      const orchestrator = orchestratorRef.current;
      const result = await orchestrator.streamText(
        prompt,
        (chunk: AIStreamChunk) => {
          if (abortRef.current) return;

          // 累加文本
          responseRef.current += chunk.delta;
          setResponse(responseRef.current);
        },
        {
          systemPrompt,
          temperature,
          maxTokens,
        }
      );

      // 检查是否被中断
      if (abortRef.current) {
        return responseRef.current;
      }

      setResponse(result.text);
      responseRef.current = result.text;

      return result.text;
    } catch (err: any) {
      // 如果是用户中断，不显示错误
      if (err.message === '生成已被用户中断') {
        return responseRef.current;
      }

      const errorMsg = err.message || 'AI 流式生成失败';
      setError(errorMsg);
      throw err;
    } finally {
      setIsStreaming(false);
    }
  }, [systemPrompt, temperature, maxTokens, autoClear, isConfigured]);

  /**
   * 中断生成
   * 可以中断正在进行的流式或非流式生成
   */
  const abort = useCallback(() => {
    abortRef.current = true;

    // 中断所有流式输出
    try {
      orchestratorRef.current.abortAllStreams();
    } catch (error) {
      console.warn('[useAI] 中断流式输出失败:', error);
    }

    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  /**
   * 清除响应和错误
   */
  const clear = useCallback(() => {
    setResponse('');
    responseRef.current = '';
    setError(null);
    abortRef.current = false;
  }, []);

  return {
    isLoading,
    isStreaming,
    response,
    error,
    generate,
    stream,
    abort,
    clear,
    activeProvider,
    isConfigured,
  };
}

// ==================== 扩展 Hook ====================

/**
 * AI 专用功能 Hook
 * 提供针对 MIUI 主题设计的专用 AI 功能封装
 */
export function useAISpecialized(options: UseAIOptions = {}) {
  const ai = useAI(options);
  const orchestratorRef = useRef(getAIOrchestrator());

  /**
   * 生成 MAML 代码
   */
  const generateMAML = useCallback(
    async (description: string) => {
      if (!ai.isConfigured) {
        throw new Error('AI Provider 未配置');
      }
      ai.clear();
      return orchestratorRef.current.generateMAML(description);
    },
    [ai]
  );

  /**
   * 解释 MAML 代码
   */
  const explainMAML = useCallback(
    async (code: string) => {
      if (!ai.isConfigured) {
        throw new Error('AI Provider 未配置');
      }
      ai.clear();
      return orchestratorRef.current.explainMAML(code);
    },
    [ai]
  );

  /**
   * 生成图标设计提示词
   */
  const generateIconPrompt = useCallback(
    async (componentName: string, style?: string) => {
      if (!ai.isConfigured) {
        throw new Error('AI Provider 未配置');
      }
      ai.clear();
      return orchestratorRef.current.generateIconPrompt(componentName, style);
    },
    [ai]
  );

  /**
   * 检查设计方案
   */
  const checkDesign = useCallback(
    async (designDescription: string) => {
      if (!ai.isConfigured) {
        throw new Error('AI Provider 未配置');
      }
      ai.clear();
      return orchestratorRef.current.checkDesign(designDescription);
    },
    [ai]
  );

  /**
   * 生成配色方案
   */
  const generateColorScheme = useCallback(
    async (style: string, isDark: boolean = false) => {
      if (!ai.isConfigured) {
        throw new Error('AI Provider 未配置');
      }
      ai.clear();
      return orchestratorRef.current.generateColorScheme(style, isDark);
    },
    [ai]
  );

  /**
   * 智能补全代码
   */
  const completeCode = useCallback(
    async (code: string, language: 'maml' | 'xml' | 'css' = 'maml') => {
      if (!ai.isConfigured) {
        throw new Error('AI Provider 未配置');
      }
      ai.clear();
      return orchestratorRef.current.completeCode(code, language);
    },
    [ai]
  );

  return {
    ...ai,
    generateMAML,
    explainMAML,
    generateIconPrompt,
    checkDesign,
    generateColorScheme,
    completeCode,
  };
}
