/**
 * MIUI Theme Editor - AI 对话面板组件
 *
 * 完整的 AI 对话界面，用于替换/增强 EditorPage 中简单的 AI Drawer。
 * 功能：
 * - 消息列表展示（用户消息靠右，AI消息靠左，系统消息居中）
 * - 流式输出动画（打字机效果）
 * - 代码块高亮（使用 AICodeBlock 组件）
 * - 消息操作：复制、重新生成、删除
 * - 快捷操作按钮（在输入框上方）
 * - 支持 Markdown 渲染（粗体、列表、代码块）
 * - 对话历史持久化（localStorage）
 * - 清空对话按钮
 * - 加载历史对话
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Drawer,
  Button,
  Input,
  Space,
  Tooltip,
  Typography,
  message,
  Popconfirm,
  Empty,
  Spin,
  Badge,
} from 'antd';
import {
  RobotOutlined,
  CloseOutlined,
  SettingOutlined,
  SendOutlined,
  CopyOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ClearOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  CodeOutlined,
  BgColorsOutlined,
  SafetyOutlined,
  FileImageOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { useAI } from '../../hooks/useAI';
import { AISettingsPanel } from '../AISettingsPanel';
import { AIPromptTemplates } from '../AIPromptTemplates';
import { AICodeBlock } from '../AICodeBlock';
import styles from './styles.module.less';

const { Text } = Typography;
const { TextArea } = Input;

// ==================== 类型定义 ====================

/** 消息角色 */
type MessageRole = 'user' | 'assistant' | 'system';

/** 对话消息 */
interface ChatMessage {
  /** 唯一标识 */
  id: string;
  /** 消息角色 */
  role: MessageRole;
  /** 消息内容 */
  content: string;
  /** 时间戳 */
  timestamp: number;
  /** 是否正在流式输出 */
  isStreaming?: boolean;
  /** 关联的代码块 */
  codeBlocks?: Array<{
    code: string;
    language: string;
    filename?: string;
  }>;
}

/** AIChatPanel 组件 Props */
export interface AIChatPanelProps {
  /** 是否可见 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 上下文信息 */
  context?: {
    /** 项目名称 */
    projectName?: string;
    /** 当前激活模块 */
    activeModule?: string;
    /** 选中的资源 */
    selectedResource?: string;
  };
}

/** 快捷操作按钮配置 */
interface QuickAction {
  /** 按钮标签 */
  label: string;
  /** 提示词 */
  prompt: string;
  /** 图标 */
  icon: React.ReactNode;
}

// ==================== 常量 ====================

/** localStorage 键名 */
const STORAGE_KEY = 'miui-theme-editor-ai-chat-history';

/** 最大历史消息数 */
const MAX_HISTORY_MESSAGES = 100;

/** 默认快捷操作 */
const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    label: '生成MAML',
    prompt: '请帮我生成一个 MIUI MAML 动画组件代码，描述我的需求如下：',
    icon: <CodeOutlined />,
  },
  {
    label: '解释代码',
    prompt: '请解释以下代码的功能和实现原理：\n\n',
    icon: <ThunderboltOutlined />,
  },
  {
    label: '检查设计',
    prompt: '请检查以下 MIUI 主题设计方案，找出潜在问题并提供改进建议：\n\n',
    icon: <SafetyOutlined />,
  },
  {
    label: '生成配色',
    prompt: '请为 MIUI 主题生成一套完整的配色方案，风格要求：',
    icon: <BgColorsOutlined />,
  },
];

// ==================== 工具函数 ====================

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 从 localStorage 加载对话历史
 */
function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(-MAX_HISTORY_MESSAGES);
      }
    }
  } catch (error) {
    console.error('[AIChatPanel] 加载历史失败:', error);
  }
  return [];
}

/**
 * 保存对话历史到 localStorage
 */
function saveHistory(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY_MESSAGES)));
  } catch (error) {
    console.error('[AIChatPanel] 保存历史失败:', error);
  }
}

/**
 * 解析消息内容中的代码块
 * 提取 ```language\ncode\n``` 格式的代码块
 */
function parseCodeBlocks(content: string): Array<{ code: string; language: string; filename?: string }> {
  const blocks: Array<{ code: string; language: string; filename?: string }> = [];
  const regex = /```(\w+)?\s*(?:filename[:=]\s*([^\n]+))?\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const language = match[1] || 'plaintext';
    const filename = match[2]?.trim();
    const code = match[3].trim();
    blocks.push({ code, language, filename });
  }

  return blocks;
}

/**
 * 移除消息内容中的代码块，返回纯文本部分
 */
function removeCodeBlocks(content: string): string {
  return content.replace(/```(\w+)?\s*(?:filename[:=]\s*[^\n]+)?\n[\s\S]*?```/g, '\n[代码块]\n').trim();
}

/**
 * 简单的 Markdown 渲染（将纯文本转为 HTML 字符串）
 * 支持：粗体、斜体、列表、代码行、换行
 */
function renderMarkdown(text: string): string {
  let html = text
    // 转义 HTML 特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 粗体 **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体 *text*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 行内代码 `code`
    .replace(/`(.+?)`/g, '<code class="inline-code">$1</code>')
    // 无序列表
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
    // 有序列表
    .replace(/^\s*(\d+)\.\s+(.+)$/gm, '<li value="$1">$2</li>')
    // 换行
    .replace(/\n/g, '<br/>');

  // 包裹列表项
  if (html.includes('<li>')) {
    html = html.replace(/(<li>.*?<\/li>)(?:<br\/>)?/gs, '<ul>$1</ul>');
  }

  return html;
}

// ==================== 组件 ====================

/**
 * AI 对话面板组件
 */
export const AIChatPanel: React.FC<AIChatPanelProps> = ({ visible, onClose, context }) => {
  // AI Hook
  const { stream, abort, isStreaming, response, error, clear, isConfigured } = useAI({
    systemPrompt: `你是一个专业的 MIUI 主题设计助手，精通以下领域：
- MIUI 主题设计和开发
- MAML（MIUI Animation Markup Language）动画编程
- UI/UX 设计原则
- MIUI 设计规范和最佳实践
- 图标设计、壁纸设计、配色方案

当前项目：${context?.projectName || '未命名'}
当前模块：${context?.activeModule || '未知'}`,
    autoClear: false,
  });

  // 状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [templatesVisible, setTemplatesVisible] = useState(false);
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null);

  // 引用
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  // ==================== 初始化 ====================

  // 加载历史对话
  useEffect(() => {
    if (visible && messages.length === 0) {
      const history = loadHistory();
      if (history.length > 0) {
        setMessages(history);
      }
    }
  }, [visible]);

  // 保存历史对话
  useEffect(() => {
    if (messages.length > 0) {
      saveHistory(messages);
    }
  }, [messages]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, response]);

  // 错误处理
  useEffect(() => {
    if (error) {
      message.error(error);
    }
  }, [error]);

  // ==================== 事件处理 ====================

  /**
   * 发送消息
   */
  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;
    if (isStreaming) return;
    if (!isConfigured) {
      message.warning('AI Provider 未配置，请先打开设置进行配置');
      setSettingsVisible(true);
      return;
    }

    const userContent = inputValue.trim();
    setInputValue('');

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // 添加 AI 占位消息（流式输出）
    const assistantId = generateId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setCurrentStreamingId(assistantId);
    clear();

    try {
      await stream(userContent);
    } catch (err: any) {
      // 流式输出出错，更新消息为错误状态
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: `抱歉，发生了错误: ${err.message}`, isStreaming: false }
            : msg
        )
      );
      setCurrentStreamingId(null);
      return;
    }

    // 流式输出完成
    setCurrentStreamingId(null);
  }, [inputValue, isStreaming, isConfigured, stream, clear]);

  /**
   * 处理流式输出响应更新
   */
  useEffect(() => {
    if (currentStreamingId && response) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentStreamingId
            ? {
                ...msg,
                content: response,
                codeBlocks: parseCodeBlocks(response),
                isStreaming: isStreaming,
              }
            : msg
        )
      );
    }

    // 流式输出结束时，更新最终状态
    if (!isStreaming && currentStreamingId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentStreamingId
            ? {
                ...msg,
                content: response,
                codeBlocks: parseCodeBlocks(response),
                isStreaming: false,
              }
            : msg
        )
      );
      setCurrentStreamingId(null);
    }
  }, [response, isStreaming, currentStreamingId]);

  /**
   * 处理快捷操作点击
   */
  const handleQuickAction = useCallback((action: QuickAction) => {
    setInputValue(action.prompt);
    inputRef.current?.focus();
  }, []);

  /**
   * 复制消息内容
   */
  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  }, []);

  /**
   * 删除消息
   */
  const handleDeleteMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  /**
   * 重新生成消息
   */
  const handleRegenerate = useCallback(
    async (messageId: string) => {
      if (!isConfigured) {
        message.warning('AI Provider 未配置');
        return;
      }

      // 找到要重新生成的消息及其前一条用户消息
      const index = messages.findIndex((msg) => msg.id === messageId);
      if (index <= 0) return;

      const userMsg = messages[index - 1];
      if (userMsg.role !== 'user') return;

      // 删除当前 AI 消息及之后的所有消息
      setMessages((prev) => prev.slice(0, index));

      // 重新发送
      const assistantId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentStreamingId(assistantId);
      clear();

      try {
        await stream(userMsg.content);
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: `抱歉，发生了错误: ${err.message}`, isStreaming: false }
              : msg
          )
        );
        setCurrentStreamingId(null);
      }
    },
    [messages, isConfigured, stream, clear]
  );

  /**
   * 清空对话
   */
  const handleClearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    message.success('对话已清空');
  }, []);

  /**
   * 中断生成
   */
  const handleAbort = useCallback(() => {
    abort();
    setCurrentStreamingId(null);
    setMessages((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    );
  }, [abort]);

  /**
   * 处理模板选择
   */
  const handleTemplateSelect = useCallback((prompt: string) => {
    setInputValue(prompt);
    setTemplatesVisible(false);
    inputRef.current?.focus();
  }, []);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ==================== 渲染 ====================

  /**
   * 渲染消息气泡
   */
  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';

    if (isSystem) {
      return (
        <div key={msg.id} className={styles.systemMessage}>
          <Text className={styles.systemText}>{msg.content}</Text>
        </div>
      );
    }

    // 解析代码块和纯文本
    const codeBlocks = msg.codeBlocks || parseCodeBlocks(msg.content);
    const hasCodeBlocks = codeBlocks.length > 0;
    const textContent = hasCodeBlocks ? removeCodeBlocks(msg.content) : msg.content;

    return (
      <div
        key={msg.id}
        className={`${styles.messageRow} ${isUser ? styles.userRow : styles.aiRow}`}
      >
        <div className={`${styles.messageBubble} ${isUser ? styles.userBubble : styles.aiBubble}`}>
          {/* 消息头部 */}
          <div className={styles.messageHeader}>
            {isUser ? (
              <span className={styles.roleLabel}>你</span>
            ) : (
              <Space size={4}>
                <RobotOutlined className={styles.aiIcon} />
                <span className={styles.roleLabel}>AI 助手</span>
                {msg.isStreaming && (
                  <Badge status="processing" color="#4a6cf7" />
                )}
              </Space>
            )}
          </div>

          {/* 消息内容 */}
          <div className={styles.messageContent}>
            {textContent && (
              <div
                className={styles.markdownContent}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(textContent) }}
              />
            )}

            {/* 代码块 */}
            {codeBlocks.map((block, idx) => (
              <AICodeBlock
                key={idx}
                code={block.code}
                language={block.language as any}
                filename={block.filename}
                onCopy={() => handleCopyMessage(block.code)}
              />
            ))}

            {/* 流式输出中的加载指示器 */}
            {msg.isStreaming && !msg.content && (
              <Spin size="small" className={styles.streamingSpin} />
            )}
          </div>

          {/* 消息操作栏 */}
          <div className={styles.messageActions}>
            <Tooltip title="复制">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                className={styles.actionBtn}
                onClick={() => handleCopyMessage(msg.content)}
              />
            </Tooltip>
            {!isUser && !msg.isStreaming && (
              <Tooltip title="重新生成">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  className={styles.actionBtn}
                  onClick={() => handleRegenerate(msg.id)}
                />
              </Tooltip>
            )}
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                className={styles.actionBtn}
                onClick={() => handleDeleteMessage(msg.id)}
              />
            </Tooltip>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* AI 对话 Drawer */}
      <Drawer
        title={
          <div className={styles.drawerHeader}>
            <Space>
              <RobotOutlined className={styles.headerIcon} />
              <span className={styles.headerTitle}>AI 助手</span>
              {!isConfigured && (
                <Badge count="未配置" style={{ backgroundColor: '#ff4d4f', fontSize: 10 }} />
              )}
            </Space>
            <Space>
              <Tooltip title="提示词模板">
                <Button
                  type="text"
                  size="small"
                  icon={<ThunderboltOutlined />}
                  className={styles.headerBtn}
                  onClick={() => setTemplatesVisible(true)}
                />
              </Tooltip>
              <Tooltip title="设置">
                <Button
                  type="text"
                  size="small"
                  icon={<SettingOutlined />}
                  className={styles.headerBtn}
                  onClick={() => setSettingsVisible(true)}
                />
              </Tooltip>
              <Tooltip title="清空对话">
                <Popconfirm
                  title="确认清空"
                  description="确定要清空所有对话记录吗？"
                  onConfirm={handleClearChat}
                  okText="清空"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<ClearOutlined />}
                    className={styles.headerBtn}
                  />
                </Popconfirm>
              </Tooltip>
              <Tooltip title="关闭">
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  className={styles.headerBtn}
                  onClick={onClose}
                />
              </Tooltip>
            </Space>
          </div>
        }
        placement="right"
        width={400}
        open={visible}
        onClose={onClose}
        className={styles.aiChatDrawer}
        closable={false}
      >
        {/* 消息列表区域 */}
        <div className={styles.messagesArea}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <RobotOutlined className={styles.emptyIcon} />
              <Text className={styles.emptyText}>
                你好！我是 MIUI 主题设计助手，可以帮你优化配色方案、生成图标描述、调试 MAML 代码等。
              </Text>
              <div className={styles.quickActionsGrid}>
                {DEFAULT_QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.label}
                    className={styles.quickActionCard}
                    onClick={() => handleQuickAction(action)}
                  >
                    <span className={styles.quickActionIcon}>{action.icon}</span>
                    <span className={styles.quickActionLabel}>{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 底部输入区域 */}
        <div className={styles.inputArea}>
          {/* 快捷操作栏 */}
          <div className={styles.quickActionsBar}>
            <Space size={4} wrap>
              {DEFAULT_QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  size="small"
                  className={styles.quickActionBtn}
                  icon={action.icon}
                  onClick={() => handleQuickAction(action)}
                >
                  {action.label}
                </Button>
              ))}
            </Space>
          </div>

          {/* 输入框和发送按钮 */}
          <div className={styles.inputRow}>
            <TextArea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              className={styles.chatInput}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button
                type="primary"
                danger
                icon={<PauseCircleOutlined />}
                onClick={handleAbort}
                className={styles.sendBtn}
              >
                停止
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={styles.sendBtn}
              >
                发送
              </Button>
            )}
          </div>
        </div>
      </Drawer>

      {/* AI 设置面板弹窗 */}
      <Drawer
        title="AI 设置"
        placement="right"
        width={720}
        open={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        className={styles.settingsDrawer}
      >
        <AISettingsPanel />
      </Drawer>

      {/* 提示词模板弹窗 */}
      <Drawer
        title="提示词模板"
        placement="right"
        width={600}
        open={templatesVisible}
        onClose={() => setTemplatesVisible(false)}
        className={styles.templatesDrawer}
      >
        <AIPromptTemplates onSelect={handleTemplateSelect} showTabs={true} />
      </Drawer>
    </>
  );
};

export default AIChatPanel;
