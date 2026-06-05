/**
 * MIUI Theme Editor - AI 代码块组件
 *
 * 用于展示 AI 生成的代码，带语法高亮和操作按钮。
 * 支持代码复制、应用到编辑器等操作。
 */

import React, { useState, useCallback } from 'react';
import { Button, Tooltip, message, Space } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  CheckCircleOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import styles from './styles.module.less';

// ==================== 类型定义 ====================

/** 支持的代码语言 */
export type CodeLanguage = 'xml' | 'json' | 'css' | 'javascript' | 'plaintext';

/** AICodeBlock 组件 Props */
export interface AICodeBlockProps {
  /** 代码内容 */
  code: string;
  /** 代码语言 */
  language: CodeLanguage;
  /** 复制回调 */
  onCopy?: () => void;
  /** 应用到编辑器回调 */
  onApply?: () => void;
  /** 文件名 */
  filename?: string;
}

// ==================== 语法高亮规则 ====================

/** 语法高亮 Token 类型 */
type TokenType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'tag'
  | 'attr'
  | 'number'
  | 'operator'
  | 'function'
  | 'plain';

/** 高亮规则 */
interface HighlightRule {
  /** 匹配正则 */
  regex: RegExp;
  /** Token 类型 */
  type: TokenType;
}

/** XML/HTML 高亮规则 */
const XML_RULES: HighlightRule[] = [
  { regex: /<!--[\s\S]*?-->/g, type: 'comment' },
  { regex: /<!DOCTYPE[^>]*>/gi, type: 'comment' },
  { regex: /<\/?[\w:-]+/g, type: 'tag' },
  { regex: /[\w:-]+(?=\s*=)/g, type: 'attr' },
  { regex: /"[^"]*"|'[^']*'/g, type: 'string' },
  { regex: /&\w+;/g, type: 'keyword' },
];

/** JSON 高亮规则 */
const JSON_RULES: HighlightRule[] = [
  { regex: /"(?:\\.|[^"\\])*"/g, type: 'string' },
  { regex: /\b(?:true|false|null)\b/g, type: 'keyword' },
  { regex: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, type: 'number' },
];

/** CSS 高亮规则 */
const CSS_RULES: HighlightRule[] = [
  { regex: /\/\*[\s\S]*?\*\//g, type: 'comment' },
  { regex: /@[\w-]+/g, type: 'keyword' },
  { regex: /[.#][\w-]+/g, type: 'tag' },
  { regex: /[\w-]+(?=\s*:)/g, type: 'attr' },
  { regex: /"[^"]*"|'[^']*'/g, type: 'string' },
  { regex: /#(?:[\da-fA-F]{3}){1,2}\b/g, type: 'number' },
  { regex: /-?\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg)?\b/g, type: 'number' },
];

/** JavaScript 高亮规则 */
const JS_RULES: HighlightRule[] = [
  { regex: /\/\/[\s\S]*?$/gm, type: 'comment' },
  { regex: /\/\*[\s\S]*?\*\//g, type: 'comment' },
  { regex: /\b(?:const|let|var|function|return|if|else|for|while|switch|case|break|continue|new|this|typeof|instanceof|import|export|from|default|async|await|try|catch|throw|class|extends|super|static|get|set)\b/g, type: 'keyword' },
  { regex: /\b(?:true|false|null|undefined|NaN|Infinity)\b/g, type: 'keyword' },
  { regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, type: 'string' },
  { regex: /\b\d+(?:\.\d+)?\b/g, type: 'number' },
  { regex: /\b[A-Z]\w*\b/g, type: 'tag' },
  { regex: /\b\w+(?=\s*\()/g, type: 'function' },
];

/** 语言规则映射 */
const LANGUAGE_RULES: Record<CodeLanguage, HighlightRule[]> = {
  xml: XML_RULES,
  json: JSON_RULES,
  css: CSS_RULES,
  javascript: JS_RULES,
  plaintext: [],
};

/** 语言显示标签映射 */
const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  xml: 'XML',
  json: 'JSON',
  css: 'CSS',
  javascript: 'JavaScript',
  plaintext: 'Plain Text',
};

// ==================== 工具函数 ====================

/**
 * 简单的语法高亮实现
 * 基于正则规则将代码拆分为 Token 列表
 */
function highlightCode(code: string, language: CodeLanguage): Array<{ text: string; type: TokenType }> {
  const rules = LANGUAGE_RULES[language] || [];
  if (rules.length === 0 || language === 'plaintext') {
    return [{ text: code, type: 'plain' }];
  }

  // 收集所有匹配位置
  interface MatchInfo {
    start: number;
    end: number;
    type: TokenType;
  }

  const matches: MatchInfo[] = [];

  for (const rule of rules) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags.includes('g') ? rule.regex.flags : rule.regex.flags + 'g');
    let match;
    while ((match = regex.exec(code)) !== null) {
      // 避免零宽匹配导致无限循环
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
        continue;
      }
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: rule.type,
      });
    }
  }

  // 按位置排序，并处理重叠（保留第一个匹配的）
  matches.sort((a, b) => a.start - b.start);
  const filteredMatches: MatchInfo[] = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filteredMatches.push(m);
      lastEnd = m.end;
    }
  }

  // 构建 Token 列表
  const tokens: Array<{ text: string; type: TokenType }> = [];
  let currentPos = 0;

  for (const m of filteredMatches) {
    if (m.start > currentPos) {
      tokens.push({ text: code.slice(currentPos, m.start), type: 'plain' });
    }
    tokens.push({ text: code.slice(m.start, m.end), type: m.type });
    currentPos = m.end;
  }

  if (currentPos < code.length) {
    tokens.push({ text: code.slice(currentPos), type: 'plain' });
  }

  return tokens;
}

/**
 * 为代码添加行号
 */
function addLineNumbers(code: string): string[] {
  return code.split('\n');
}

// ==================== 组件 ====================

/**
 * AI 代码块组件
 *
 * 展示带语法高亮的代码，支持复制和应用操作。
 */
export const AICodeBlock: React.FC<AICodeBlockProps> = ({
  code,
  language,
  onCopy,
  onApply,
  filename,
}) => {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  /**
   * 处理复制操作
   */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      message.success('代码已复制');
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('复制失败');
    }
  }, [code, onCopy]);

  /**
   * 处理应用操作
   */
  const handleApply = useCallback(() => {
    onApply?.();
    message.success('代码已应用到编辑器');
  }, [onApply]);

  const lines = addLineNumbers(code);
  const displayLanguage = LANGUAGE_LABELS[language] || language;

  return (
    <div className={styles.codeBlock}>
      {/* 顶部标题栏 */}
      <div className={styles.codeHeader}>
        <Space size={8}>
          {/* 折叠按钮 */}
          <Button
            type="text"
            size="small"
            icon={collapsed ? <RightOutlined /> : <DownOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className={styles.headerBtn}
          />
          {/* 语言标签 */}
          <span className={styles.languageTag}>{displayLanguage}</span>
          {/* 文件名 */}
          {filename && <span className={styles.filename}>{filename}</span>}
        </Space>

        <Space size={8}>
          {/* 复制按钮 */}
          <Tooltip title={copied ? '已复制' : '复制'}>
            <Button
              type="text"
              size="small"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={handleCopy}
              className={styles.headerBtn}
            />
          </Tooltip>
          {/* 应用按钮 */}
          {onApply && (
            <Tooltip title="应用到编辑器">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={handleApply}
                className={styles.headerBtn}
              />
            </Tooltip>
          )}
        </Space>
      </div>

      {/* 代码内容区域 */}
      {!collapsed && (
        <div className={styles.codeBody}>
          <pre className={styles.codePre}>
            <code className={styles.codeContent}>
              {lines.map((line, lineIndex) => {
                const tokens = highlightCode(line, language);
                return (
                  <div key={lineIndex} className={styles.codeLine}>
                    {/* 行号 */}
                    <span className={styles.lineNumber}>{lineIndex + 1}</span>
                    {/* 代码内容 */}
                    <span className={styles.lineContent}>
                      {tokens.map((token, tokenIndex) => (
                        <span
                          key={tokenIndex}
                          className={styles[`token${token.type.charAt(0).toUpperCase()}${token.type.slice(1)}`]}
                        >
                          {token.text}
                        </span>
                      ))}
                    </span>
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default AICodeBlock;
