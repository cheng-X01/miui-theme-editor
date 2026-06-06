/**
 * MIUI Theme Editor - AI 新手引导教程数据
 * 定义每步引导的详细内容（标题、描述、图标、提示文字、渐变色）
 */

// ==================== 类型定义 ====================

/** 单步引导数据 */
export interface GuideStepData {
  /** 步骤唯一标识 */
  id: string;
  /** 步骤序号（从 1 开始） */
  step: number;
  /** 步骤标题 */
  title: string;
  /** 步骤描述（支持多行） */
  description: string[];
  /** 操作提示文字 */
  tip: string;
  /** 插图图标名称（Ant Design Icons） */
  icon: string;
  /** 插图渐变起始色 */
  gradientFrom: string;
  /** 插图渐变结束色 */
  gradientTo: string;
}

// ==================== 引导步骤数据 ====================

/**
 * 8 步引导数据
 * 涵盖编辑器所有核心功能模块
 */
export const guideSteps: GuideStepData[] = [
  // 第 1 步：欢迎页
  {
    id: 'welcome',
    step: 1,
    title: '欢迎使用 MIUI Theme Editor',
    description: [
      'MIUI Theme Editor 是一款功能强大的小米手机主题编辑器，',
      '集成了 AI 智能助手，帮助你轻松创建个性化的 MIUI 主题。',
      '接下来我们将带你快速了解编辑器的核心功能。',
    ],
    tip: '点击「下一步」开始探索，或点击「跳过」直接进入编辑器。',
    icon: 'RocketOutlined',
    gradientFrom: '#4a6cf7',
    gradientTo: '#6c5ce7',
  },

  // 第 2 步：打开主题
  {
    id: 'open-theme',
    step: 2,
    title: '打开与创建主题',
    description: [
      '你可以通过「打开 .mtz 文件」导入已有的 MIUI 主题包，',
      '也可以从模板中心选择内置模板快速开始，',
      '或者使用 AI 助手从自然语言描述直接生成全新主题。',
    ],
    tip: '支持导入 .mtz 格式主题包，自动解析图标、壁纸、锁屏等资源。',
    icon: 'FolderOpenOutlined',
    gradientFrom: '#0277bd',
    gradientTo: '#03a9f4',
  },

  // 第 3 步：图标编辑
  {
    id: 'icon-edit',
    step: 3,
    title: '图标拖拽替换',
    description: [
      '图标编辑器支持拖拽替换应用图标，',
      '你可以将自定义图标直接拖放到对应位置，',
      '也可以批量替换所有图标，统一风格和配色。',
    ],
    tip: '支持 PNG 格式图标，推荐使用 192x192 像素的图标文件。',
    icon: 'AppstoreOutlined',
    gradientFrom: '#f48fb1',
    gradientTo: '#f06292',
  },

  // 第 4 步：壁纸编辑
  {
    id: 'wallpaper-edit',
    step: 4,
    title: '壁纸上传与预览',
    description: [
      '壁纸编辑器支持上传主屏幕壁纸和锁屏壁纸，',
      '提供实时预览功能，让你在编辑时就能看到最终效果，',
      '支持 JPG、PNG 等常见图片格式。',
    ],
    tip: '推荐使用 1080x2400 分辨率的壁纸，以获得最佳显示效果。',
    icon: 'PictureOutlined',
    gradientFrom: '#2e7d32',
    gradientTo: '#66bb6a',
  },

  // 第 5 步：配色编辑
  {
    id: 'color-edit',
    step: 5,
    title: '配色方案修改',
    description: [
      '配色编辑器提供直观的颜色选择器，',
      '你可以修改主题的主色、辅色、强调色、背景色、文字色等，',
      '所有修改都会实时同步到预览界面。',
    ],
    tip: 'AI 助手可以根据你的描述自动生成和谐的配色方案。',
    icon: 'BgColorsOutlined',
    gradientFrom: '#ff6d00',
    gradientTo: '#ffab00',
  },

  // 第 6 步：MAML 编辑
  {
    id: 'maml-edit',
    step: 6,
    title: 'MAML 可视化编辑器',
    description: [
      'MAML（MIUI Animation Markup Language）是 MIUI 锁屏动画的标记语言，',
      '编辑器提供可视化编辑界面，支持组件拖拽、属性调整、',
      '动画预览等功能，无需手写 XML 代码。',
    ],
    tip: '支持实时预览锁屏效果，所见即所得。',
    icon: 'CodeOutlined',
    gradientFrom: '#7c4dff',
    gradientTo: '#ea80fc',
  },

  // 第 7 步：AI 助手
  {
    id: 'ai-assistant',
    step: 7,
    title: 'AI 智能助手',
    description: [
      '内置 AI 助手支持自然语言对话，你可以用文字描述想要的主题风格，',
      'AI 会自动生成完整的配色方案、图标规范、壁纸描述和锁屏代码。',
      '还支持一键生成主题，从描述到成品只需几秒钟。',
    ],
    tip: '试试说「帮我做一个深蓝色的星空主题」，AI 会为你生成完整主题。',
    icon: 'RobotOutlined',
    gradientFrom: '#00e676',
    gradientTo: '#00b0ff',
  },

  // 第 8 步：推送手机
  {
    id: 'push-to-phone',
    step: 8,
    title: 'ADB 推送到手机',
    description: [
      '编辑完成后，你可以通过 ADB 将主题直接推送到小米手机，',
      '支持 USB 连接和 WiFi 无线连接，推送后即可实时预览效果。',
      '无需手动拷贝文件，一键完成主题应用。',
    ],
    tip: '请确保手机已开启 USB 调试模式，并通过 USB 或 WiFi 连接到电脑。',
    icon: 'MobileOutlined',
    gradientFrom: '#c62828',
    gradientTo: '#d4af37',
  },
];

// ==================== 引导完成页数据 ====================

/** 引导完成页的快速操作入口 */
export interface QuickAction {
  /** 操作标识 */
  id: string;
  /** 操作名称 */
  label: string;
  /** 操作描述 */
  description: string;
  /** 操作图标 */
  icon: string;
}

/** 完成页快速操作列表 */
export const quickActions: QuickAction[] = [
  {
    id: 'create-new',
    label: '创建新主题',
    description: '从空白开始创建',
    icon: 'PlusOutlined',
  },
  {
    id: 'use-template',
    label: '使用模板',
    description: '从内置模板开始',
    icon: 'AppstoreOutlined',
  },
  {
    id: 'ai-generate',
    label: 'AI 生成主题',
    description: '用文字描述生成',
    icon: 'RobotOutlined',
  },
  {
    id: 'open-file',
    label: '打开 .mtz 文件',
    description: '导入已有主题',
    icon: 'FolderOpenOutlined',
  },
];

// ==================== localStorage 常量 ====================

/** 引导完成状态 localStorage 键名 */
export const ONBOARDING_COMPLETED_KEY = 'miui-theme-editor-onboarding-completed';
