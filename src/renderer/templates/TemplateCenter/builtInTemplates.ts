/**
 * MIUI Theme Editor - 内置主题模板数据
 * 预置 10 个精心设计的主题模板，涵盖多种风格
 *
 * 每个模板包含：
 * - 基本信息（名称、作者、描述、标签）
 * - 配色方案（主色、辅色、背景色、文字色等）
 * - 壁纸描述
 * - 图标风格描述
 * - 锁屏 MAML 代码片段
 */

import type { ThemeProject, ThemeDescription, ThemeResources } from '../../../shared/types';
import type { ColorScheme } from '../../ai/core/NL2ThemeEngine';
import type { Template } from './index';

// ==================== 辅助函数 ====================

/**
 * 创建模板的完整 ThemeProject 数据
 * @param name 主题名称
 * @param description 主题描述
 * @param colors 配色方案
 * @param wallpaperDesc 壁纸描述
 * @param iconStyle 图标风格
 * @param lockscreenCode 锁屏 MAML 代码
 * @param tags 标签
 * @returns ThemeProject
 */
function createTemplateProject(
  name: string,
  description: string,
  colors: ColorScheme,
  wallpaperDesc: string,
  iconStyle: string,
  lockscreenCode: string,
  tags: string[]
): ThemeProject {
  const now = new Date().toISOString();

  const themeDescription: ThemeDescription = {
    name,
    author: 'MIUI Theme Editor',
    version: '1.0.0',
    description,
    uiVersion: '14',
    designWidth: 1080,
    designHeight: 2400,
    supportsDarkMode: colors.isDark,
    minMIUIVersion: 'V14',
    category: tags[0] || '其他',
    tags,
  };

  const resources: ThemeResources = {
    icons: [
      {
        componentName: '__style_spec__',
        filePath: 'icons/style_spec.json',
        size: 0,
        previewData: JSON.stringify({ style: iconStyle }),
      },
      ...[
        'com.android.settings',
        'com.android.phone',
        'com.android.messaging',
        'com.android.camera',
        'com.android.browser',
      ].map((comp) => ({
        componentName: comp,
        filePath: `icons/${comp.replace(/\./g, '_')}.png`,
        size: 192,
        previewData: JSON.stringify({
          description: `${comp} 图标`,
          prompt: `MIUI icon, ${comp}, ${iconStyle}, primary color ${colors.primaryColor}`,
        }),
      })),
    ],
    wallpapers: [
      {
        name: '主屏幕壁纸',
        filePath: 'wallpaper/homescreen.jpg',
        type: 'homescreen',
        resolution: '1080x2400',
        previewData: JSON.stringify({ description: wallpaperDesc }),
      },
      {
        name: '锁屏壁纸',
        filePath: 'wallpaper/lockscreen.jpg',
        type: 'lockscreen',
        resolution: '1080x2400',
        previewData: JSON.stringify({ description: `${wallpaperDesc}（锁屏简化版）` }),
      },
    ],
    fonts: [],
    sounds: [],
    lockscreens: [
      {
        name: `${name} 锁屏`,
        filePath: 'lockscreen/lockscreen.xml',
        type: 'lockscreen',
        supportsPassword: true,
      },
    ],
    statusbar: {
      bgColor: colors.backgroundColor,
      textColor: colors.textColor,
      showCarrier: false,
    },
    mamlModules: [
      {
        name: `${name} 锁屏`,
        type: 'lockscreen',
        filePath: 'lockscreen/lockscreen.xml',
        sourceCode: lockscreenCode,
        description: `${name} 主题锁屏`,
      },
    ],
  };

  return {
    id: `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    description: themeDescription,
    resources,
    createdAt: now,
    updatedAt: now,
    isDirty: false,
  };
}

// ==================== 模板配色方案 ====================

/** 极简深色配色 */
const MINIMAL_DARK_COLORS: ColorScheme = {
  primaryColor: '#4a6cf7',
  secondaryColor: '#6c5ce7',
  accentColor: '#ff6b6b',
  backgroundColor: '#0a0a0a',
  secondaryBackgroundColor: '#141414',
  textColor: '#ffffff',
  secondaryTextColor: '#888888',
  borderColor: '#2a2a2a',
  successColor: '#52c41a',
  warningColor: '#faad14',
  errorColor: '#ff4d4f',
  isDark: true,
};

/** 星空夜景配色 */
const STARRY_NIGHT_COLORS: ColorScheme = {
  primaryColor: '#1a237e',
  secondaryColor: '#283593',
  accentColor: '#ffd54f',
  backgroundColor: '#0d1b2a',
  secondaryBackgroundColor: '#1b2838',
  textColor: '#e8eaf6',
  secondaryTextColor: '#7986cb',
  borderColor: '#1a237e',
  successColor: '#66bb6a',
  warningColor: '#ffa726',
  errorColor: '#ef5350',
  isDark: true,
};

/** 樱花粉配色 */
const SAKURA_PINK_COLORS: ColorScheme = {
  primaryColor: '#f48fb1',
  secondaryColor: '#f06292',
  accentColor: '#ff80ab',
  backgroundColor: '#fce4ec',
  secondaryBackgroundColor: '#f8bbd0',
  textColor: '#4a1942',
  secondaryTextColor: '#880e4f',
  borderColor: '#f48fb1',
  successColor: '#81c784',
  warningColor: '#ffb74d',
  errorColor: '#e57373',
  isDark: false,
};

/** 赛博朋克配色 */
const CYBERPUNK_COLORS: ColorScheme = {
  primaryColor: '#00ffff',
  secondaryColor: '#ff00ff',
  accentColor: '#ffff00',
  backgroundColor: '#0a0a14',
  secondaryBackgroundColor: '#141428',
  textColor: '#e0e0ff',
  secondaryTextColor: '#8888aa',
  borderColor: '#2a2a4a',
  successColor: '#00ff88',
  warningColor: '#ffaa00',
  errorColor: '#ff0055',
  isDark: true,
};

/** 森林绿配色 */
const FOREST_GREEN_COLORS: ColorScheme = {
  primaryColor: '#2e7d32',
  secondaryColor: '#388e3c',
  accentColor: '#66bb6a',
  backgroundColor: '#1b2e1b',
  secondaryBackgroundColor: '#234023',
  textColor: '#e8f5e9',
  secondaryTextColor: '#81c784',
  borderColor: '#2e7d32',
  successColor: '#4caf50',
  warningColor: '#ff9800',
  errorColor: '#f44336',
  isDark: true,
};

/** 日落橙配色 */
const SUNSET_ORANGE_COLORS: ColorScheme = {
  primaryColor: '#ff6d00',
  secondaryColor: '#ff8f00',
  accentColor: '#ffab00',
  backgroundColor: '#1a1200',
  secondaryBackgroundColor: '#2a1e00',
  textColor: '#fff3e0',
  secondaryTextColor: '#ffb74d',
  borderColor: '#ff6d00',
  successColor: '#66bb6a',
  warningColor: '#ffd54f',
  errorColor: '#ef5350',
  isDark: true,
};

/** 海洋蓝配色 */
const OCEAN_BLUE_COLORS: ColorScheme = {
  primaryColor: '#0277bd',
  secondaryColor: '#0288d1',
  accentColor: '#03a9f4',
  backgroundColor: '#0a1929',
  secondaryBackgroundColor: '#0d2137',
  textColor: '#e1f5fe',
  secondaryTextColor: '#4fc3f7',
  borderColor: '#0277bd',
  successColor: '#26a69a',
  warningColor: '#ffa726',
  errorColor: '#ef5350',
  isDark: true,
};

/** 紫梦配色 */
const PURPLE_DREAM_COLORS: ColorScheme = {
  primaryColor: '#7c4dff',
  secondaryColor: '#b388ff',
  accentColor: '#ea80fc',
  backgroundColor: '#12002e',
  secondaryBackgroundColor: '#1a0044',
  textColor: '#f3e5f5',
  secondaryTextColor: '#ce93d8',
  borderColor: '#7c4dff',
  successColor: '#69f0ae',
  warningColor: '#ffd740',
  errorColor: '#ff5252',
  isDark: true,
};

/** 中国风配色 */
const CHINESE_COLORS: ColorScheme = {
  primaryColor: '#c62828',
  secondaryColor: '#d4af37',
  accentColor: '#ff6f00',
  backgroundColor: '#1a0a0a',
  secondaryBackgroundColor: '#2a1414',
  textColor: '#fff8e1',
  secondaryTextColor: '#d4af37',
  borderColor: '#c62828',
  successColor: '#2e7d32',
  warningColor: '#f9a825',
  errorColor: '#c62828',
  isDark: true,
};

/** 极光配色 */
const AURORA_COLORS: ColorScheme = {
  primaryColor: '#00e676',
  secondaryColor: '#1de9b6',
  accentColor: '#00b0ff',
  backgroundColor: '#0a0a1a',
  secondaryBackgroundColor: '#0e0e24',
  textColor: '#e0f7fa',
  secondaryTextColor: '#80cbc4',
  borderColor: '#00e676',
  successColor: '#00e676',
  warningColor: '#ffab40',
  errorColor: '#ff5252',
  isDark: true,
};

// ==================== 锁屏 MAML 模板 ====================

/** 通用锁屏 MAML 模板 */
function generateLockscreenMAML(name: string, colors: ColorScheme): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<Lockscreen version="2" frameRate="30">
  <!-- ${name} 锁屏 -->
  <Var name="hour" type="string" expression="hour(#time#)" />
  <Var name="minute" type="string" expression="minute(#time#)" />
  <Var name="year" type="string" expression="year(#time#)" />
  <Var name="month" type="string" expression="month(#time#)" />
  <Var name="day" type="string" expression="day(#time#)" />
  <Var name="weekday" type="string" expression="weekday(#time#)" />

  <!-- 背景 -->
  <Rectangle name="bg" w="#screen_w" h="#screen_h" fillColor="${colors.backgroundColor}" />

  <!-- 时间显示 -->
  <Text name="time_hour"
    x="#screen_w/2" y="#screen_h*0.35"
    align="center" alignV="center"
    size="120" color="${colors.textColor}"
    fontFamily="miui-light"
    text="#hour#" />

  <Text name="time_colon"
    x="#screen_w/2 + 80" y="#screen_h*0.35 - 20"
    align="center" alignV="center"
    size="100" color="${colors.secondaryTextColor}"
    fontFamily="miui-light"
    text=":" alpha="180" />

  <Text name="time_minute"
    x="#screen_w/2 + 160" y="#screen_h*0.35"
    align="center" alignV="center"
    size="120" color="${colors.textColor}"
    fontFamily="miui-light"
    text="#minute#" />

  <!-- 日期显示 -->
  <Text name="date"
    x="#screen_w/2" y="#screen_h*0.35 + 80"
    align="center" alignV="center"
    size="36" color="${colors.secondaryTextColor}"
    fontFamily="miui-regular"
    text="#year#年#month#月#day#日 #weekday#" />

  <!-- 解锁提示 -->
  <Text name="unlock_hint"
    x="#screen_w/2" y="#screen_h*0.85"
    align="center" alignV="center"
    size="28" color="${colors.secondaryTextColor}"
    fontFamily="miui-regular"
    text="上滑解锁" alpha="150">
    <Animation target="alpha">
      <Item time="0" value="150" />
      <Item time="1500" value="80" />
      <Item time="3000" value="150" />
    </Animation>
  </Text>

  <!-- 底部装饰线 -->
  <Rectangle name="bottom_line"
    x="#screen_w*0.3" y="#screen_h*0.9"
    w="#screen_w*0.4" h="1"
    fillColor="${colors.primaryColor}" alpha="100" />
</Lockscreen>`;
}

// ==================== 内置模板列表 ====================

/**
 * 内置主题模板列表
 * 包含 10 个预置模板，涵盖多种风格
 */
export const builtInTemplates: Template[] = [
  // 1. 极简深色
  {
    id: 'builtin-minimal-dark',
    name: '极简深色',
    author: 'MIUI Theme Editor',
    description: '纯黑背景搭配白色文字，蓝色强调色点缀，极致简约的暗色主题。适合追求简洁高效的用户。',
    preview: '',
    tags: ['极简', '暗色', '简约', '经典'],
    downloads: 12580,
    rating: 4.8,
    isBuiltIn: true,
    createdAt: '2024-01-15T00:00:00.000Z',
    projectData: createTemplateProject(
      '极简深色',
      '纯黑背景、白色文字、蓝色强调，极致简约的暗色主题',
      MINIMAL_DARK_COLORS,
      '纯黑色背景，极简风格，无多余装饰元素，适合追求简洁的用户',
      '扁平化设计，纯色背景，线性图标，黑白灰为主，蓝色强调',
      generateLockscreenMAML('极简深色', MINIMAL_DARK_COLORS),
      ['极简', '暗色', '简约']
    ),
  },

  // 2. 星空夜景
  {
    id: 'builtin-starry-night',
    name: '星空夜景',
    author: 'MIUI Theme Editor',
    description: '深邃的蓝色渐变背景，点缀闪烁的星星和一轮明月，浪漫的星空锁屏。适合喜欢梦幻夜景的用户。',
    preview: '',
    tags: ['星空', '夜景', '浪漫', '梦幻'],
    downloads: 18920,
    rating: 4.9,
    isBuiltIn: true,
    createdAt: '2024-02-20T00:00:00.000Z',
    projectData: createTemplateProject(
      '星空夜景',
      '深蓝渐变背景，星星点缀，月亮锁屏，浪漫梦幻',
      STARRY_NIGHT_COLORS,
      '深邃的蓝色夜空渐变，散布着闪烁的星星，一轮明月高悬，底部有远山剪影',
      '圆润图标，深蓝色调，星星和月亮装饰元素',
      generateLockscreenMAML('星空夜景', STARRY_NIGHT_COLORS),
      ['星空', '夜景', '浪漫']
    ),
  },

  // 3. 樱花粉
  {
    id: 'builtin-sakura-pink',
    name: '樱花粉',
    author: 'MIUI Theme Editor',
    description: '温柔的粉色系主题，樱花飘落的壁纸，圆润可爱的图标设计。适合喜欢甜美风格的用户。',
    preview: '',
    tags: ['樱花', '粉色', '甜美', '可爱'],
    downloads: 15640,
    rating: 4.7,
    isBuiltIn: true,
    createdAt: '2024-03-10T00:00:00.000Z',
    projectData: createTemplateProject(
      '樱花粉',
      '粉色系主题，樱花壁纸，圆润图标，甜美可爱',
      SAKURA_PINK_COLORS,
      '浅粉色背景，飘落的樱花花瓣，柔和的粉色渐变，温暖甜美',
      '圆润方形图标，粉色系配色，柔和阴影，可爱风格',
      generateLockscreenMAML('樱花粉', SAKURA_PINK_COLORS),
      ['樱花', '粉色', '甜美']
    ),
  },

  // 4. 赛博朋克
  {
    id: 'builtin-cyberpunk',
    name: '赛博朋克',
    author: 'MIUI Theme Editor',
    description: '霓虹色彩与暗色背景的碰撞，充满科技感的未来主义主题。适合追求前卫个性的用户。',
    preview: '',
    tags: ['赛博朋克', '科技', '霓虹', '未来'],
    downloads: 21300,
    rating: 4.9,
    isBuiltIn: true,
    createdAt: '2024-04-05T00:00:00.000Z',
    projectData: createTemplateProject(
      '赛博朋克',
      '霓虹色、暗色背景、科技感，未来主义风格',
      CYBERPUNK_COLORS,
      '暗色城市背景，霓虹灯光效果，赛博朋克风格的未来城市天际线，数据流和电路纹理',
      '科技感图标，霓虹边框，发光效果，几何形状',
      generateLockscreenMAML('赛博朋克', CYBERPUNK_COLORS),
      ['赛博朋克', '科技', '霓虹']
    ),
  },

  // 5. 森林绿
  {
    id: 'builtin-forest-green',
    name: '森林绿',
    author: 'MIUI Theme Editor',
    description: '清新的自然绿色系主题，树叶壁纸，回归自然的清新风格。适合喜欢自然风格的用户。',
    preview: '',
    tags: ['森林', '绿色', '自然', '清新'],
    downloads: 11200,
    rating: 4.6,
    isBuiltIn: true,
    createdAt: '2024-05-18T00:00:00.000Z',
    projectData: createTemplateProject(
      '森林绿',
      '自然绿色系，树叶壁纸，清新风格',
      FOREST_GREEN_COLORS,
      '茂密的森林背景，阳光透过树叶洒下斑驳光影，绿色植物纹理，自然清新',
      '自然风格图标，绿色系配色，树叶和植物装饰元素',
      generateLockscreenMAML('森林绿', FOREST_GREEN_COLORS),
      ['森林', '绿色', '自然']
    ),
  },

  // 6. 日落橙
  {
    id: 'builtin-sunset-orange',
    name: '日落橙',
    author: 'MIUI Theme Editor',
    description: '温暖的橙黄色调主题，日落渐变壁纸，充满活力与温暖。适合喜欢暖色调的用户。',
    preview: '',
    tags: ['日落', '橙色', '温暖', '活力'],
    downloads: 9870,
    rating: 4.5,
    isBuiltIn: true,
    createdAt: '2024-06-01T00:00:00.000Z',
    projectData: createTemplateProject(
      '日落橙',
      '暖色调，日落渐变壁纸，温暖活力',
      SUNSET_ORANGE_COLORS,
      '壮丽的日落渐变天空，从橙色到紫色的过渡，地平线上的剪影，温暖的色调',
      '温暖色调图标，橙色渐变背景，圆润设计',
      generateLockscreenMAML('日落橙', SUNSET_ORANGE_COLORS),
      ['日落', '橙色', '温暖']
    ),
  },

  // 7. 海洋蓝
  {
    id: 'builtin-ocean-blue',
    name: '海洋蓝',
    author: 'MIUI Theme Editor',
    description: '深邃的蓝色系主题，海浪壁纸，水波纹锁屏效果。适合喜欢海洋风格的用户。',
    preview: '',
    tags: ['海洋', '蓝色', '水波纹', '清凉'],
    downloads: 14350,
    rating: 4.7,
    isBuiltIn: true,
    createdAt: '2024-07-12T00:00:00.000Z',
    projectData: createTemplateProject(
      '海洋蓝',
      '蓝色系，海浪壁纸，水波纹锁屏',
      OCEAN_BLUE_COLORS,
      '深邃的海洋蓝色背景，海浪纹理，水波纹效果，海底光影，清凉宁静',
      '水滴风格图标，蓝色系配色，波浪装饰元素',
      generateLockscreenMAML('海洋蓝', OCEAN_BLUE_COLORS),
      ['海洋', '蓝色', '清凉']
    ),
  },

  // 8. 紫梦
  {
    id: 'builtin-purple-dream',
    name: '紫梦',
    author: 'MIUI Theme Editor',
    description: '梦幻的紫色渐变主题，朦胧的紫色调，充满想象力的梦幻风格。适合喜欢紫色系的用户。',
    preview: '',
    tags: ['紫色', '梦幻', '渐变', '浪漫'],
    downloads: 16780,
    rating: 4.8,
    isBuiltIn: true,
    createdAt: '2024-08-25T00:00:00.000Z',
    projectData: createTemplateProject(
      '紫梦',
      '紫色渐变，梦幻风格，浪漫朦胧',
      PURPLE_DREAM_COLORS,
      '紫色到粉色的梦幻渐变，朦胧的光晕效果，星尘粒子，梦幻氛围',
      '梦幻风格图标，紫色渐变，柔和发光效果',
      generateLockscreenMAML('紫梦', PURPLE_DREAM_COLORS),
      ['紫色', '梦幻', '渐变']
    ),
  },

  // 9. 中国风
  {
    id: 'builtin-chinese',
    name: '中国风',
    author: 'MIUI Theme Editor',
    description: '红金配色的中国风主题，水墨元素点缀，传统与现代的融合。适合喜欢中国风的用户。',
    preview: '',
    tags: ['中国风', '红金', '水墨', '传统'],
    downloads: 20100,
    rating: 4.9,
    isBuiltIn: true,
    createdAt: '2024-09-15T00:00:00.000Z',
    projectData: createTemplateProject(
      '中国风',
      '红金配色，水墨元素，传统与现代融合',
      CHINESE_COLORS,
      '深色背景配以红色和金色装饰，水墨山水画元素，祥云纹理，中国传统纹样',
      '中国风图标，红金配色，传统纹样装饰，书法字体',
      generateLockscreenMAML('中国风', CHINESE_COLORS),
      ['中国风', '红金', '水墨']
    ),
  },

  // 10. 极光
  {
    id: 'builtin-aurora',
    name: '极光',
    author: 'MIUI Theme Editor',
    description: '北极光渐变色彩，深色背景衬托绚丽的极光效果。适合喜欢绚丽色彩和自然奇观的用户。',
    preview: '',
    tags: ['极光', '渐变', '绚丽', '自然'],
    downloads: 17560,
    rating: 4.8,
    isBuiltIn: true,
    createdAt: '2024-10-30T00:00:00.000Z',
    projectData: createTemplateProject(
      '极光',
      '北极光渐变，深色背景，绚丽色彩',
      AURORA_COLORS,
      '深色夜空背景，绚丽的北极光渐变色彩，从绿色到蓝色到紫色的光带，星空点缀',
      '极光风格图标，渐变色彩，发光效果，几何形状',
      generateLockscreenMAML('极光', AURORA_COLORS),
      ['极光', '渐变', '绚丽']
    ),
  },
];

/**
 * 根据 ID 获取内置模板
 * @param id 模板 ID
 * @returns 模板数据或 undefined
 */
export function getBuiltInTemplateById(id: string): Template | undefined {
  return builtInTemplates.find((t) => t.id === id);
}

/**
 * 获取热门模板（按下载量排序）
 * @param limit 返回数量
 * @returns 热门模板列表
 */
export function getPopularTemplates(limit: number = 5): Template[] {
  return [...builtInTemplates]
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, limit);
}

/**
 * 获取最新模板（按创建时间排序）
 * @param limit 返回数量
 * @returns 最新模板列表
 */
export function getLatestTemplates(limit: number = 5): Template[] {
  return [...builtInTemplates]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * 搜索模板（按名称和标签搜索）
 * @param keyword 搜索关键词
 * @returns 匹配的模板列表
 */
export function searchTemplates(keyword: string): Template[] {
  const lowerKeyword = keyword.toLowerCase();
  return builtInTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerKeyword) ||
      t.description.toLowerCase().includes(lowerKeyword) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword))
  );
}
