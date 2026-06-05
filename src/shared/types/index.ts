/**
 * MIUI Theme Editor - 共享类型定义
 * 主进程和渲染进程共用的类型和常量
 */

// ==================== IPC 通道常量 ====================

/** IPC 通信通道名称 */
export const IPC_CHANNELS = {
  /** 打开文件对话框 */
  OPEN_FILE: 'dialog:open-file',
  /** 保存文件对话框 */
  SAVE_FILE: 'dialog:save-file',
  /** 读取文件内容 */
  READ_FILE: 'fs:read-file',
  /** 写入文件内容 */
  WRITE_FILE: 'fs:write-file',
  /** 解析 MTZ 主题包 */
  PARSE_MTZ: 'mtz:parse',
  /** 打包 MTZ 主题包 */
  PACK_MTZ: 'mtz:pack',
  /** 列出已连接设备 */
  LIST_DEVICES: 'device:list',
  /** 获取设备详细信息 */
  GET_DEVICE_INFO: 'device:info',
  /** 推送主题到设备 */
  PUSH_THEME: 'device:push',
  /** 应用主题到设备 */
  APPLY_THEME: 'device:apply',
  /** 截屏 */
  SCREENSHOT: 'device:screenshot',
  /** WiFi 连接设备 */
  CONNECT_WIFI: 'device:connect-wifi',
  /** 监控设备连接状态 */
  MONITOR_DEVICES: 'device:monitor',
  /** AI 生成文本 */
  AI_GENERATE_TEXT: 'ai:generate-text',
  /** AI 流式生成文本 */
  AI_STREAM_TEXT: 'ai:stream-text',
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

// ==================== 文件对话框类型 ====================

/** 文件对话框选项 */
export interface FileDialogOptions {
  /** 对话框标题 */
  title?: string;
  /** 默认路径 */
  defaultPath?: string;
  /** 允许的文件扩展名过滤 */
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  /** 是否允许选择多个文件 */
  multiSelections?: boolean;
  /** 是否选择文件夹 */
  directories?: boolean;
}

/** 文件对话框结果 */
export interface FileDialogResult {
  /** 是否被用户取消 */
  canceled: boolean;
  /** 选择的文件路径列表 */
  filePaths: string[];
}

// ==================== 主题项目类型 ====================

/** 主题描述信息 */
export interface ThemeDescription {
  /** 主题名称 */
  name: string;
  /** 主题作者 */
  author: string;
  /** 主题版本 */
  version: string;
  /** 主题描述 */
  description: string;
  /** UI 风格版本 */
  uiVersion: string;
  /** 设计分辨率宽度 */
  designWidth: number;
  /** 设计分辨率高度 */
  designHeight: number;
  /** 是否支持暗色模式 */
  supportsDarkMode: boolean;
  /** 最低支持的 MIUI 版本 */
  minMIUIVersion: string;
  /** 主题分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
}

/** 图标资源 */
export interface IconResource {
  /** 图标组件名（如 com.android.settings） */
  componentName: string;
  /** 图标文件路径（在 MTZ 包内） */
  filePath: string;
  /** 图标预览数据（Base64） */
  previewData?: string;
  /** 图标尺寸 */
  size?: number;
}

/** 壁纸资源 */
export interface WallpaperResource {
  /** 壁纸名称 */
  name: string;
  /** 壁纸文件路径（在 MTZ 包内） */
  filePath: string;
  /** 壁纸预览数据（Base64） */
  previewData?: string;
  /** 壁纸类型：lockscreen / homescreen */
  type: 'lockscreen' | 'homescreen';
  /** 壁纸分辨率 */
  resolution?: string;
}

/** 字体资源 */
export interface FontResource {
  /** 字体名称 */
  name: string;
  /** 字体文件路径（在 MTZ 包内） */
  filePath: string;
  /** 字体类型 */
  type: 'regular' | 'bold' | 'italic' | 'bold-italic' | 'light' | 'thin';
  /** 字体文件大小（字节） */
  fileSize?: number;
}

/** 声音资源 */
export interface SoundResource {
  /** 声音名称 */
  name: string;
  /** 声音文件路径（在 MTZ 包内） */
  filePath: string;
  /** 声音类型：notification / ringtone / alarm */
  type: 'notification' | 'ringtone' | 'alarm';
  /** 声音时长（秒） */
  duration?: number;
}

/** 锁屏资源 */
export interface LockscreenResource {
  /** 锁屏名称 */
  name: string;
  /** 锁屏文件路径（在 MTZ 包内） */
  filePath: string;
  /** 锁屏类型 */
  type: 'lockscreen' | 'always-on-display';
  /** 是否支持密码锁屏 */
  supportsPassword?: boolean;
}

/** 状态栏资源 */
export interface StatusbarResource {
  /** 状态栏图标样式路径 */
  iconStyle?: string;
  /** 状态栏背景颜色 */
  bgColor?: string;
  /** 状态栏文字颜色 */
  textColor?: string;
  /** 是否显示运营商名称 */
  showCarrier?: boolean;
  /** 网络速度指示器样式 */
  networkSpeedStyle?: string;
}

/** MAML 模块 */
export interface MAMLModule {
  /** 模块名称 */
  name: string;
  /** 模块类型：lockscreen / homescreen / widget / other */
  type: 'lockscreen' | 'homescreen' | 'widget' | 'other';
  /** 模块文件路径（在 MTZ 包内） */
  filePath: string;
  /** MAML 源代码 */
  sourceCode?: string;
  /** 预览图片路径 */
  previewPath?: string;
  /** 模块描述 */
  description?: string;
}

/** 主题资源集合 */
export interface ThemeResources {
  /** 图标资源列表 */
  icons: IconResource[];
  /** 壁纸资源列表 */
  wallpapers: WallpaperResource[];
  /** 字体资源列表 */
  fonts: FontResource[];
  /** 声音资源列表 */
  sounds: SoundResource[];
  /** 锁屏资源列表 */
  lockscreens: LockscreenResource[];
  /** 状态栏配置 */
  statusbar: StatusbarResource;
  /** MAML 模块列表 */
  mamlModules: MAMLModule[];
}

/** 主题项目（完整） */
export interface ThemeProject {
  /** 项目唯一 ID */
  id: string;
  /** 项目名称 */
  name: string;
  /** 项目文件路径 */
  filePath?: string;
  /** 主题描述信息 */
  description: ThemeDescription;
  /** 主题资源集合 */
  resources: ThemeResources;
  /** 创建时间 */
  createdAt: string;
  /** 最后修改时间 */
  updatedAt: string;
  /** 是否已修改（未保存） */
  isDirty: boolean;
}

// ==================== AI 相关类型 ====================

/** AI 提供者配置 */
export interface AIProviderConfig {
  /** 提供者名称 */
  name: string;
  /** 提供者类型 */
  type: 'openai' | 'ollama' | 'custom';
  /** API 地址 */
  baseUrl: string;
  /** API 密钥 */
  apiKey?: string;
  /** 默认使用的模型 */
  model: string;
  /** 温度参数（0-1） */
  temperature?: number;
  /** 最大 token 数 */
  maxTokens?: number;
  /** 是否启用 */
  enabled: boolean;
}

/** AI 文本生成请求 */
export interface AIGenerateRequest {
  /** 提示词 */
  prompt: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大 token 数 */
  maxTokens?: number;
  /** 对话历史 */
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

/** AI 文本生成响应 */
export interface AIGenerateResponse {
  /** 生成的文本 */
  text: string;
  /** 使用的模型 */
  model: string;
  /** 消耗的 token 数 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 生成耗时（毫秒） */
  duration: number;
}
