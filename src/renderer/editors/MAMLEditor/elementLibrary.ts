/**
 * MAML 组件库定义
 * 包含所有支持的 MAML 元素及其属性定义
 */

import type { MAMLElementDefinition, MAMLElementType } from './types'

/**
 * 所有 MAML 元素定义
 */
export const elementLibrary: MAMLElementDefinition[] = [
  // ==================== 布局元素 ====================
  {
    type: 'Lockscreen',
    displayName: '锁屏',
    icon: 'lock',
    category: 'layout',
    description: '锁屏根元素，定义屏幕尺寸和基本配置',
    attributes: [
      {
        name: 'screenWidth',
        type: 'number',
        default: 1080,
        description: '屏幕宽度',
        min: 320,
        max: 2560,
      },
      {
        name: 'screenHeight',
        type: 'number',
        default: 1920,
        description: '屏幕高度',
        min: 480,
        max: 3840,
      },
      {
        name: 'frameRate',
        type: 'number',
        default: 60,
        description: '动画帧率',
        min: 1,
        max: 120,
      },
      {
        name: 'version',
        type: 'string',
        default: '1.0',
        description: 'MAML 版本号',
      },
      {
        name: 'author',
        type: 'string',
        default: '',
        description: '作者信息',
      },
      {
        name: 'description',
        type: 'string',
        default: '',
        description: '主题描述',
      },
    ],
    children: ['Text', 'Image', 'Rectangle', 'Circle', 'Ellipse', 'Line', 'Path', 'Group', 'Button', 'Var', 'Array', 'Animation', 'Trigger'],
  },
  {
    type: 'Desktop',
    displayName: '桌面',
    icon: 'desktop',
    category: 'layout',
    description: '桌面根元素',
    attributes: [
      {
        name: 'screenWidth',
        type: 'number',
        default: 1080,
        description: '屏幕宽度',
        min: 320,
        max: 2560,
      },
      {
        name: 'screenHeight',
        type: 'number',
        default: 1920,
        description: '屏幕高度',
        min: 480,
        max: 3840,
      },
      {
        name: 'frameRate',
        type: 'number',
        default: 60,
        description: '动画帧率',
        min: 1,
        max: 120,
      },
      {
        name: 'pageCount',
        type: 'number',
        default: 3,
        description: '桌面页数',
        min: 1,
        max: 10,
      },
    ],
    children: ['Text', 'Image', 'Rectangle', 'Circle', 'Ellipse', 'Line', 'Path', 'Group', 'Button', 'Var', 'Array', 'Animation', 'Trigger'],
  },
  {
    type: 'Group',
    displayName: '组',
    icon: 'group',
    category: 'layout',
    description: '元素分组容器，可对多个元素进行统一变换',
    attributes: [
      {
        name: 'x',
        type: 'number',
        default: 0,
        description: 'X 坐标',
      },
      {
        name: 'y',
        type: 'number',
        default: 0,
        description: 'Y 坐标',
      },
      {
        name: 'rotation',
        type: 'number',
        default: 0,
        description: '旋转角度',
        min: -360,
        max: 360,
      },
      {
        name: 'alpha',
        type: 'number',
        default: 1,
        description: '透明度',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        name: 'scaleX',
        type: 'number',
        default: 1,
        description: 'X 轴缩放',
        min: 0,
        max: 10,
        step: 0.01,
      },
      {
        name: 'scaleY',
        type: 'number',
        default: 1,
        description: 'Y 轴缩放',
        min: 0,
        max: 10,
        step: 0.01,
      },
    ],
    children: ['Text', 'Image', 'Rectangle', 'Circle', 'Ellipse', 'Line', 'Path', 'Group', 'Button', 'Animation', 'Trigger'],
  },

  // ==================== 形状元素 ====================
  {
    type: 'Rectangle',
    displayName: '矩形',
    icon: 'square',
    category: 'shape',
    description: '矩形形状',
    attributes: [
      {
        name: 'x',
        type: 'number',
        default: 0,
        description: 'X 坐标',
      },
      {
        name: 'y',
        type: 'number',
        default: 0,
        description: 'Y 坐标',
      },
      {
        name: 'w',
        type: 'number',
        default: 100,
        description: '宽度',
        min: 0,
      },
      {
        name: 'h',
        type: 'number',
        default: 100,
        description: '高度',
        min: 0,
      },
      {
        name: 'fillColor',
        type: 'color',
        default: '#ffffff',
        description: '填充颜色',
      },
      {
        name: 'strokeColor',
        type: 'color',
        default: '#000000',
        description: '描边颜色',
      },
      {
        name: 'strokeWidth',
        type: 'number',
        default: 0,
        description: '描边宽度',
        min: 0,
      },
      {
        name: 'cornerRadius',
        type: 'number',
        default: 0,
        description: '圆角半径',
        min: 0,
      },
      {
        name: 'alpha',
        type: 'number',
        default: 1,
        description: '透明度',
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    type: 'Circle',
    displayName: '圆形',
    icon: 'circle',
    category: 'shape',
    description: '圆形形状',
    attributes: [
      {
        name: 'x',
        type: 'number',
        default: 0,
        description: '圆心 X 坐标',
      },
      {
        name: 'y',
        type: 'number',
        default: 0,
        description: '圆心 Y 坐标',
      },
      {
        name: 'r',
        type: 'number',
        default: 50,
        description: '半径',
        min: 0,
      },
      {
        name: 'fillColor',
        type: 'color',
        default: '#ffffff',
        description: '填充颜色',
      },
      {
        name: 'strokeColor',
        type: 'color',
        default: '#000000',
        description: '描边颜色',
      },
      {
        name: 'strokeWidth',
        type: 'number',
        default: 0,
        description: '描边宽度',
        min: 0,
      },
      {
        name: 'alpha',
        type: 'number',
        default: 1,
        description: '透明度',
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    type: 'Ellipse',
    displayName: '椭圆',
    icon: 'ellipsis',
    category: 'shape',
    description: '椭圆形状',
    attributes: [
      {
        name: 'x',
        type: 'number',
        default: 0,
        description: '圆心 X 坐标',
      },
      {
        name: 'y',
        type: 'number',
        default: 0,
        description: '圆心 Y 坐标',
      },
      {
        name: 'rx',
        type: 'number',
        default: 100,
        description: 'X 轴半径',
        min: 0,
      },
      {
        name: 'ry',
        type: 'number',
        default: 50,
        description: 'Y 轴半径',
        min: 0,
      },
      {
        name: 'fillColor',
        type: 'color',
        default: '#ffffff',
        description: '填充颜色',
      },
      {
        name: 'strokeColor',
        type: 'color',
        default: '#000000',
        description: '描边颜色',
      },
      {
        name: 'strokeWidth',
        type: 'number',
        default: 0,
        description: '描边宽度',
        min: 0,
      },
      {
        name: 'alpha',
        type: 'number',
        default: 1,
        description: '透明度',
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    type: 'Line',
    displayName: '线条',
    icon: 'minus',
    category: 'shape',
    description: '直线',
    attributes: [
      {
        name: 'x1',
        type: 'number',
        default: 0,
        description: '起点 X 坐标',
      },
      {
        name: 'y1',
        type: 'number',
        default: 0,
        description: '起点 Y 坐标',
      },
      {
        name: 'x2',
        type: 'number',
        default: 100,
        description: '终点 X 坐标',
      },
      {
        name: 'y2',
        type: 'number',
        default: 100,
        description: '终点 Y 坐标',
      },
      {
        name: 'strokeColor',
        type: 'color',
        default: '#000000',
        description: '线条颜色',
      },
      {
        name: 'strokeWidth',
        type: 'number',
        default: 2,
        description: '线条宽度',
        min: 0,
      },
      {
        name: 'alpha',
        type: 'number',
        default: 1,
        description: '透明度',
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    type: 'Path',
    displayName: '路径',
    icon: 'edit',
    category: 'shape',
    description: '自定义路径（SVG path 格式）',
    attributes: [
      {
        name: 'd',
        type: 'string',
        default: 'M0,0 L100,0 L100,100 Z',
        description: '路径数据（SVG path 格式）',
      },
      {
        name: 'x',
        type: 'number',
        default: 0,
        description: 'X 坐标',
      },
      {
        name: 'y',
        type: 'number',
        default: 0,
        description: 'Y 坐标',
      },
      {
        name: 'fillColor',
        type: 'color',
        default: '#ffffff',
        description: '填充颜色',
      },
      {
        name: 'strokeColor',
        type: 'color',
        default: '#000000',
        description: '描边颜色',
      },
      {
        name: 'strokeWidth',
        type: 'number',
        default: 0,
        description: '描边宽度',
        min: 0,
      },
      {
        name: 'alpha',
        type: 'number',
        default: 1,
        description: '透明度',
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },

  // ==================== 文本元素 ====================
  {
    type: 'Text',
    displayName: '文本',
    icon: 'font',
    category: 'text',
    description: '文本元素',
    attributes: [
      {
        name: 'text',
        type: 'string',
        default: 'Hello MAML',
        description: '文本内容',
      },
      {
        name: 'x',
        type: 'number',
        default: 0,
        description: 'X 坐标',
      },
      {
        name: 'y',
        type: 'number',
        default: 0,
        description: 'Y 坐标',
      },
      {
        name: 'size',
        type: 'number',
        default: 48,
        description: '字体大小',
        min: 1,
        max: 500,
      },
      {
        name: 'color',
        type: 'color',
        default: '#ffffff',
        description: '文字颜色',
      },
      {
        name: 'align',
        type: 'enum',
        default: 'center',
        options: ['left', 'center', 'right'],
        description: '水平对齐方式',
      },
      {
        name: 'alignV',
        type: 'enum',
        default: 'center',
        options: ['top', 'center', 'bottom'],
        description: '垂直对齐方式',
      },
      {
        name: 'fontPath',
        type: 'string',
        default: '',
        description: '字体文件路径',
      },
      {
        name: 'alpha',
        type: 'number',
        default: 1,
        description: '透明度',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        name: 'bold',
        type: 'boolean',
        default: false,
        description: '是否加粗',
      },
      {
        name: 'italic',
        type: 'boolean',
        default: false,
        description: '是否斜体',
      },
    ],
  },

  // ==================== 图片元素 ====================
  {
    type: 'Image',
    displayName: '图片',
    icon: 'picture',
    category: 'image',
    description: '图片元素',
    attributes: [
      {
        name: 'src',
        type: 'string',
        default: '',
        description: '图片路径',
      },
      {
        name: 'x',
        type: 'number',
        default: 0,
        description: 'X 坐标',
      },
      {
        name: 'y',
        type: 'number',
        default: 0,
        description: 'Y 坐标',
      },
      {
        name: 'w',
        type: 'number',
        default: 200,
        description: '宽度',
        min: 0,
      },
      {
        name: 'h',
        type: 'number',
        default: 200,
        description: '高度',
        min: 0,
      },
      {
        name: 'alpha',
        type: 'number',
        default: 1,
        description: '透明度',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        name: 'cornerRadius',
        type: 'number',
        default: 0,
        description: '圆角半径',
        min: 0,
      },
    ],
  },

  // ==================== 动画元素 ====================
  {
    type: 'Animation',
    displayName: '动画',
    icon: 'play-circle',
    category: 'animation',
    description: '动画定义',
    attributes: [
      {
        name: 'type',
        type: 'enum',
        default: 'alpha',
        options: ['alpha', 'position', 'scale', 'rotation', 'color', 'number'],
        description: '动画类型',
      },
      {
        name: 'target',
        type: 'string',
        default: '',
        description: '目标元素名称',
      },
      {
        name: 'duration',
        type: 'number',
        default: 1000,
        description: '动画时长（毫秒）',
        min: 0,
      },
      {
        name: 'delay',
        type: 'number',
        default: 0,
        description: '延迟时间（毫秒）',
        min: 0,
      },
      {
        name: 'repeat',
        type: 'number',
        default: 0,
        description: '重复次数（0 为无限循环）',
        min: 0,
      },
      {
        name: 'easing',
        type: 'enum',
        default: 'ease',
        options: ['linear', 'ease', 'easeIn', 'easeOut', 'easeInOut', 'bounce', 'elastic', 'back'],
        description: '缓动函数',
      },
      {
        name: 'from',
        type: 'string',
        default: '',
        description: '起始值',
      },
      {
        name: 'to',
        type: 'string',
        default: '',
        description: '结束值',
      },
      {
        name: 'autoStart',
        type: 'boolean',
        default: true,
        description: '是否自动播放',
      },
    ],
  },
  {
    type: 'Trigger',
    displayName: '触发器',
    icon: 'thunderbolt',
    category: 'animation',
    description: '动画触发器',
    attributes: [
      {
        name: 'action',
        type: 'enum',
        default: 'click',
        options: ['click', 'longClick', 'doubleClick', 'swipe', 'pinch', 'shake', 'time', 'battery', 'charging', 'unlock', 'lock'],
        description: '触发动作',
      },
      {
        name: 'condition',
        type: 'expression',
        default: '',
        description: '触发条件表达式',
      },
      {
        name: 'target',
        type: 'string',
        default: '',
        description: '目标元素',
      },
      {
        name: 'animation',
        type: 'string',
        default: '',
        description: '触发的动画名称',
      },
    ],
  },

  // ==================== 交互元素 ====================
  {
    type: 'Button',
    displayName: '按钮',
    icon: 'interaction',
    category: 'interaction',
    description: '可点击按钮',
    attributes: [
      {
        name: 'x',
        type: 'number',
        default: 0,
        description: 'X 坐标',
      },
      {
        name: 'y',
        type: 'number',
        default: 0,
        description: 'Y 坐标',
      },
      {
        name: 'w',
        type: 'number',
        default: 200,
        description: '宽度',
        min: 0,
      },
      {
        name: 'h',
        type: 'number',
        default: 80,
        description: '高度',
        min: 0,
      },
      {
        name: 'normalImage',
        type: 'string',
        default: '',
        description: '正常状态图片',
      },
      {
        name: 'pressedImage',
        type: 'string',
        default: '',
        description: '按下状态图片',
      },
      {
        name: 'disabledImage',
        type: 'string',
        default: '',
        description: '禁用状态图片',
      },
      {
        name: 'text',
        type: 'string',
        default: '按钮',
        description: '按钮文字',
      },
      {
        name: 'textColor',
        type: 'color',
        default: '#ffffff',
        description: '文字颜色',
      },
      {
        name: 'textSize',
        type: 'number',
        default: 32,
        description: '文字大小',
        min: 1,
        max: 500,
      },
      {
        name: 'alpha',
        type: 'number',
        default: 1,
        description: '透明度',
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
    children: ['Animation', 'Trigger'],
  },
  {
    type: 'Slider',
    displayName: '滑块',
    icon: 'sliders',
    category: 'interaction',
    description: '滑动条控件',
    attributes: [
      {
        name: 'x',
        type: 'number',
        default: 0,
        description: 'X 坐标',
      },
      {
        name: 'y',
        type: 'number',
        default: 0,
        description: 'Y 坐标',
      },
      {
        name: 'w',
        type: 'number',
        default: 400,
        description: '宽度',
        min: 0,
      },
      {
        name: 'h',
        type: 'number',
        default: 60,
        description: '高度',
        min: 0,
      },
      {
        name: 'min',
        type: 'number',
        default: 0,
        description: '最小值',
      },
      {
        name: 'max',
        type: 'number',
        default: 100,
        description: '最大值',
      },
      {
        name: 'value',
        type: 'number',
        default: 0,
        description: '当前值',
      },
      {
        name: 'trackColor',
        type: 'color',
        default: '#cccccc',
        description: '轨道颜色',
      },
      {
        name: 'thumbColor',
        type: 'color',
        default: '#ff6b6b',
        description: '滑块颜色',
      },
    ],
  },
  {
    type: 'Switch',
    displayName: '开关',
    icon: 'switch',
    category: 'interaction',
    description: '开关控件',
    attributes: [
      {
        name: 'x',
        type: 'number',
        default: 0,
        description: 'X 坐标',
      },
      {
        name: 'y',
        type: 'number',
        default: 0,
        description: 'Y 坐标',
      },
      {
        name: 'w',
        type: 'number',
        default: 120,
        description: '宽度',
        min: 0,
      },
      {
        name: 'h',
        type: 'number',
        default: 60,
        description: '高度',
        min: 0,
      },
      {
        name: 'checked',
        type: 'boolean',
        default: false,
        description: '是否选中',
      },
      {
        name: 'onColor',
        type: 'color',
        default: '#52c41a',
        description: '开启颜色',
      },
      {
        name: 'offColor',
        type: 'color',
        default: '#cccccc',
        description: '关闭颜色',
      },
      {
        name: 'thumbColor',
        type: 'color',
        default: '#ffffff',
        description: '滑块颜色',
      },
    ],
  },

  // ==================== 数据元素 ====================
  {
    type: 'Var',
    displayName: '变量',
    icon: 'database',
    category: 'data',
    description: '变量定义',
    attributes: [
      {
        name: 'name',
        type: 'string',
        default: 'var1',
        description: '变量名称',
      },
      {
        name: 'type',
        type: 'enum',
        default: 'number',
        options: ['string', 'number', 'boolean', 'color'],
        description: '变量类型',
      },
      {
        name: 'value',
        type: 'string',
        default: '0',
        description: '变量值',
      },
      {
        name: 'expression',
        type: 'expression',
        default: '',
        description: '表达式（动态计算值）',
      },
      {
        name: 'const',
        type: 'boolean',
        default: false,
        description: '是否为常量',
      },
    ],
  },
  {
    type: 'Array',
    displayName: '数组',
    icon: 'table',
    category: 'data',
    description: '数组定义',
    attributes: [
      {
        name: 'name',
        type: 'string',
        default: 'arr1',
        description: '数组名称',
      },
      {
        name: 'count',
        type: 'number',
        default: 5,
        description: '元素数量',
        min: 0,
      },
      {
        name: 'indexName',
        type: 'string',
        default: 'i',
        description: '索引变量名',
      },
      {
        name: 'type',
        type: 'enum',
        default: 'number',
        options: ['string', 'number', 'boolean', 'color'],
        description: '元素类型',
      },
    ],
    children: ['Var', 'Animation'],
  },
  {
    type: 'Plugin',
    displayName: '插件',
    icon: 'api',
    category: 'data',
    description: '外部插件',
    attributes: [
      {
        name: 'name',
        type: 'string',
        default: '',
        description: '插件名称',
      },
      {
        name: 'src',
        type: 'string',
        default: '',
        description: '插件路径',
      },
      {
        name: 'params',
        type: 'string',
        default: '',
        description: '插件参数（JSON 格式）',
      },
    ],
  },
]

/**
 * 根据类型获取元素定义
 */
export function getElementDefinition(type: MAMLElementType): MAMLElementDefinition | undefined {
  return elementLibrary.find((el) => el.type === type)
}

/**
 * 根据分类获取元素列表
 */
export function getElementsByCategory(category: MAMLElementDefinition['category']): MAMLElementDefinition[] {
  return elementLibrary.filter((el) => el.category === category)
}

/**
 * 获取所有分类
 */
export function getCategories(): { key: MAMLElementDefinition['category']; label: string }[] {
  return [
    { key: 'layout', label: '布局' },
    { key: 'shape', label: '形状' },
    { key: 'text', label: '文本' },
    { key: 'image', label: '图片' },
    { key: 'animation', label: '动画' },
    { key: 'interaction', label: '交互' },
    { key: 'data', label: '数据' },
  ]
}

/**
 * 搜索元素
 */
export function searchElements(query: string): MAMLElementDefinition[] {
  const lowerQuery = query.toLowerCase()
  return elementLibrary.filter(
    (el) =>
      el.displayName.toLowerCase().includes(lowerQuery) ||
      el.type.toLowerCase().includes(lowerQuery) ||
      el.description?.toLowerCase().includes(lowerQuery)
  )
}

/**
 * 创建默认属性值
 */
export function createDefaultAttributes(type: MAMLElementType): Record<string, string | number | boolean> {
  const def = getElementDefinition(type)
  if (!def) return {}

  const attrs: Record<string, string | number | boolean> = {}
  for (const attr of def.attributes) {
    if (attr.default !== undefined) {
      attrs[attr.name] = attr.default
    }
  }
  return attrs
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `maml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 创建元素实例
 */
export function createElementInstance(
  type: MAMLElementType,
  x: number = 0,
  y: number = 0
): import('./types').MAMLElementInstance {
  const def = getElementDefinition(type)
  const attrs = createDefaultAttributes(type)

  return {
    id: generateId(),
    type,
    name: `${def?.displayName || type}_${Math.floor(Math.random() * 1000)}`,
    x,
    y,
    width: (attrs.w as number) || (attrs.rx ? (attrs.rx as number) * 2 : 100),
    height: (attrs.h as number) || (attrs.ry ? (attrs.ry as number) * 2 : 100),
    attributes: attrs,
    children: [],
    visible: true,
    locked: false,
    selected: false,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    alpha: (attrs.alpha as number) ?? 1,
  }
}
