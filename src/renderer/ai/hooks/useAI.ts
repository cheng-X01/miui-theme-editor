/**
 * MIUI Theme Editor - AI React Hook
 * 封装 AI 调度器的 React Hook，提供响应式的 AI 功能接口
 */

import { useState, useCallback, useRef } from 'react';
import { getAIOrchestrator } from '../core/AIOrchestrator';
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
  /** 清除响应 */
  clear: () => void;
}

// ==================== Hook 实现 ====================

/**
 * AI 功能 React Hook
 * 提供简洁的接口来调用 AI 生成功能
 *
 * @example
 * ```tsx
 * const { generate, stream, response, isLoading, isStreaming, clear } = useAI({
 *   systemPrompt: '你是一个 MIUI 主题设计专家',
 *   temperature: 0.7,
 * });
 *
 * // 非流式生成
 * const result = await generate('帮我设计一个科技感的图标');
 *
 * // 流式生成
 * await stream('解释这段 MAML 代码');
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

  // 引用（避免闭包问题）
  const responseRef = useRef('');
  const abortRef = useRef(false);

  /**
   * 非流式生成文本
   * @param prompt 用户提示词
   * @returns 生成的文本
   */
  const generate = useCallback(async (prompt: string): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);

      if (autoClear) {
        setResponse('');
        responseRef.current = '';
      }

      const orchestrator = getAIOrchestrator();
      const result = await orchestrator.generateText(prompt, {
        systemPrompt,
        temperature,
        maxTokens,
      });

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
  }, [systemPrompt, temperature, maxTokens, autoClear]);

  /**
   * 流式生成文本
   * @param prompt 用户提示词
   * @returns 完整的生成文本
   */
  const stream = useCallback(async (prompt: string): Promise<string> => {
    try {
      setIsStreaming(true);
      setError(null);
      abortRef.current = false;

      if (autoClear) {
        setResponse('');
        responseRef.current = '';
      }

      const orchestrator = getAIOrchestrator();
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

      setResponse(result.text);
      responseRef.current = result.text;

      return result.text;
    } catch (err: any) {
      const errorMsg = err.message || 'AI 流式生成失败';
      setError(errorMsg);
      throw err;
    } finally {
      setIsStreaming(false);
    }
  }, [systemPrompt, temperature, maxTokens, autoClear]);

  /**
   * 清除响应和错误
   */
  const clear = useCallback(() => {
    setResponse('');
    responseRef.current = '';
    setError(null);
    abortRef.current = true;
  }, []);

  return {
    isLoading,
    isStreaming,
    response,
    error,
    generate,
    stream,
    clear,
  };
}
