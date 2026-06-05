/**
 * MIUI Theme Editor - AI 快捷生成按钮组组件
 *
 * 在编辑器各模块中嵌入的 AI 快捷操作按钮。
 * 根据 module 类型显示不同的快捷按钮，帮助用户快速调用 AI 功能。
 */

import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import {
  FileImageOutlined,
  PictureOutlined,
  BgColorsOutlined,
  CodeOutlined,
  FontSizeOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  FormatPainterOutlined,
  BulbOutlined,
  AuditOutlined,
  ClusterOutlined,
  MergeCellsOutlined,
} from '@ant-design/icons';

// ==================== 类型定义 ====================

/** 支持的模块类型 */
export type AIGenerateModule = 'icon' | 'wallpaper' | 'color' | 'maml' | 'font' | 'general';

/** AIGenerateButtons 组件 Props */
export interface AIGenerateButtonsProps {
  /** 当前模块类型 */
  module: AIGenerateModule;
  /** 生成回调 */
  onGenerate: (prompt: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/** 按钮配置项 */
interface ButtonConfig {
  /** 按钮标签 */
  label: string;
  /** 提示词 */
  prompt: string;
  /** 图标 */
  icon: React.ReactNode;
}

// ==================== 模块按钮配置 ====================

/** 图标模块快捷按钮 */
const ICON_BUTTONS: ButtonConfig[] = [
  {
    label: 'AI生成图标',
    prompt: '请为 MIUI 主题设计一个图标，要求：',
    icon: <FileImageOutlined />,
  },
  {
    label: '批量生成图标',
    prompt: '请为以下 MIUI 主题应用批量设计图标，要求风格统一：',
    icon: <ClusterOutlined />,
  },
  {
    label: '图标风格转换',
    prompt: '请将以下图标转换为新的风格，要求保持辨识度：',
    icon: <FormatPainterOutlined />,
  },
];

/** 壁纸模块快捷按钮 */
const WALLPAPER_BUTTONS: ButtonConfig[] = [
  {
    label: 'AI生成壁纸',
    prompt: '请为 MIUI 主题生成一张壁纸，风格要求：',
    icon: <PictureOutlined />,
  },
  {
    label: '壁纸风格迁移',
    prompt: '请将以下壁纸转换为新的风格，保持构图不变：',
    icon: <FormatPainterOutlined />,
  },
];

/** 配色模块快捷按钮 */
const COLOR_BUTTONS: ButtonConfig[] = [
  {
    label: 'AI生成配色',
    prompt: '请为 MIUI 主题生成一套完整的配色方案，风格要求：',
    icon: <BgColorsOutlined />,
  },
  {
    label: '智能配色建议',
    prompt: '请根据以下主色调，为 MIUI 主题提供智能配色建议：',
    icon: <BulbOutlined />,
  },
];

/** MAML 模块快捷按钮 */
const MAML_BUTTONS: ButtonConfig[] = [
  {
    label: '生成MAML代码',
    prompt: '请帮我生成一个 MIUI MAML 动画组件代码，描述我的需求如下：',
    icon: <CodeOutlined />,
  },
  {
    label: '解释代码',
    prompt: '请解释以下 MIUI MAML 代码的功能和实现原理：\n\n',
    icon: <ThunderboltOutlined />,
  },
  {
    label: '优化代码',
    prompt: '请优化以下 MIUI MAML 代码，提高性能和可读性：\n\n',
    icon: <MergeCellsOutlined />,
  },
];

/** 字体模块快捷按钮 */
const FONT_BUTTONS: ButtonConfig[] = [
  {
    label: '推荐字体',
    prompt: '请为 MIUI 主题推荐合适的字体，主题风格：',
    icon: <FontSizeOutlined />,
  },
  {
    label: '字体搭配',
    prompt: '请为 MIUI 主题提供字体搭配方案，包括标题、正文和数字字体：',
    icon: <BranchesOutlined />,
  },
];

/** 通用模块快捷按钮 */
const GENERAL_BUTTONS: ButtonConfig[] = [
  {
    label: '设计建议',
    prompt: '请为以下 MIUI 主题设计提供改进建议：',
    icon: <BulbOutlined />,
  },
  {
    label: '代码审查',
    prompt: '请审查以下代码，找出潜在问题和优化空间：\n\n',
    icon: <AuditOutlined />,
  },
];

/** 模块按钮映射表 */
const MODULE_BUTTONS: Record<AIGenerateModule, ButtonConfig[]> = {
  icon: ICON_BUTTONS,
  wallpaper: WALLPAPER_BUTTONS,
  color: COLOR_BUTTONS,
  maml: MAML_BUTTONS,
  font: FONT_BUTTONS,
  general: GENERAL_BUTTONS,
};

// ==================== 组件 ====================

/**
 * AI 快捷生成按钮组组件
 *
 * 根据当前模块类型渲染对应的 AI 快捷操作按钮。
 * 点击按钮会触发 onGenerate 回调，传入对应的提示词。
 *
 * @example
 * ```tsx
 * <AIGenerateButtons
 *   module="icon"
 *   onGenerate={(prompt) => aiChatPanelRef.sendMessage(prompt)}
 * />
 * ```
 */
export const AIGenerateButtons: React.FC<AIGenerateButtonsProps> = ({
  module,
  onGenerate,
  disabled = false,
}) => {
  const buttons = MODULE_BUTTONS[module] || GENERAL_BUTTONS;

  return (
    <Space size={8} wrap className="ai-generate-buttons">
      {buttons.map((btn) => (
        <Tooltip key={btn.label} title={btn.label}>
          <Button
            size="small"
            icon={btn.icon}
            onClick={() => onGenerate(btn.prompt)}
            disabled={disabled}
            style={{
              background: 'rgba(74, 108, 247, 0.1)',
              borderColor: 'rgba(74, 108, 247, 0.3)',
              color: '#a0a0b0',
            }}
            className="ai-generate-btn"
          >
            {btn.label}
          </Button>
        </Tooltip>
      ))}
    </Space>
  );
};

export default AIGenerateButtons;
