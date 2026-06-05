/**
 * MIUI Theme Editor - AI 模块统一导出文件
 *
 * 集中导出所有 AI 相关的核心类、Hooks 和组件，
 * 方便其他模块通过单一入口引入 AI 功能。
 *
 * @example
 * ```typescript
 * import {
 *   AIProvider,
 *   AIOrchestrator,
 *   getAIOrchestrator,
 *   AIConfigManager,
 *   useAI,
 *   useAISpecialized,
 *   AIChatPanel,
 *   AISettingsPanel,
 *   AIPromptTemplates,
 *   AIGenerateButtons,
 *   AICodeBlock,
 * } from './ai';
 * ```
 */

// ==================== 核心类 ====================

/** AI 提供者抽象基类及类型定义 */
export { AIProvider, AICapability } from './core/AIProvider';

/** AI 调度器：统一管理多个 AI 提供者和对话历史 */
export { AIOrchestrator, getAIOrchestrator } from './core/AIOrchestrator';

/** AI 配置管理器：管理 AI Provider 配置的读取、保存和测试 */
export { AIConfigManager } from './core/AIConfigManager';

// ==================== React Hooks ====================

/** AI 功能 Hook：提供流式生成、中断、错误处理等能力 */
export { useAI, useAISpecialized } from './hooks/useAI';

// ==================== 组件 ====================

/** AI 对话面板：完整的 AI 对话界面，支持流式输出和代码高亮 */
export { AIChatPanel } from './components/AIChatPanel';

/** AI 设置面板：管理 AI Provider 的添加、编辑、删除和测试 */
export { AISettingsPanel } from './components/AISettingsPanel';

/** AI 提示词模板：预置和用户自定义的提示词模板管理 */
export { AIPromptTemplates } from './components/AIPromptTemplates';

/** AI 快捷生成按钮组：根据模块类型显示不同的 AI 快捷操作 */
export { AIGenerateButtons } from './components/AIGenerateButtons';

/** AI 代码块：带语法高亮和复制/应用操作的代码展示组件 */
export { AICodeBlock } from './components/AICodeBlock';
