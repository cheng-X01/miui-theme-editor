/**
 * MAML 编辑器类型定义
 * MAML (小米动画标记语言) 是小米主题中用于定义锁屏、桌面、动态图标的 XML 标记语言
 */

// MAML 元素类型
export type MAMLElementType =
  | 'Lockscreen'
  | 'Desktop'
  | 'Text'
  | 'Image'
  | 'Rectangle'
  | 'Circle'
  | 'Ellipse'
  | 'Line'
  | 'Path'
  | 'Group'
  | 'Animation'
  | 'Trigger'
  | 'Var'
  | 'Array'
  | 'Plugin'
  | 'Button'
  | 'Slider'
  | 'Switch'

// 属性值类型
export type MAMLAttributeValue = string | number | boolean

// MAML 属性定义
export interface MAMLAttribute {
  name: string
  type: 'string' | 'number' | 'boolean' | 'color' | 'expression' | 'enum'
  required?: boolean
  default?: MAMLAttributeValue
  options?: string[] // enum 类型选项
  description?: string
  min?: number // number 类型最小值
  max?: number // number 类型最大值
  step?: number // number 类型步长
}

// MAML 元素定义
export interface MAMLElementDefinition {
  type: MAMLElementType
  displayName: string
  icon: string
  category: 'layout' | 'shape' | 'text' | 'image' | 'animation' | 'interaction' | 'data'
  attributes: MAMLAttribute[]
  children?: MAMLElementType[] // 允许子元素类型
  selfClosing?: boolean
  description?: string
}

// 画布上的元素实例
export interface MAMLElementInstance {
  id: string
  type: MAMLElementType
  name: string
  x: number
  y: number
  width: number
  height: number
  attributes: Record<string, MAMLAttributeValue>
  children: MAMLElementInstance[]
  parentId?: string
  selected?: boolean
  locked?: boolean
  visible?: boolean
  // 变换属性
  rotation?: number
  scaleX?: number
  scaleY?: number
  alpha?: number
}

// 画布状态
export interface CanvasState {
  scale: number
  offsetX: number
  offsetY: number
  gridSize: number
  showGrid: boolean
  snapToGrid: boolean
}

// 编辑器历史记录
export interface EditorHistory {
  past: MAMLElementInstance[][]
  present: MAMLElementInstance[]
  future: MAMLElementInstance[][]
}

// 对齐类型
export type AlignType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

// 分布类型
export type DistributeType = 'horizontal' | 'vertical'

// 调整手柄位置
export type ResizeHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate'

// 拖拽数据
export interface DragData {
  type: 'element' | 'library'
  elementType?: MAMLElementType
  elementId?: string
  offsetX?: number
  offsetY?: number
}

// 编辑器配置
export interface EditorConfig {
  canvasWidth: number
  canvasHeight: number
  minScale: number
  maxScale: number
  gridSizes: number[]
  defaultGridSize: number
}

// 编辑器 Props
export interface MAMLEditorProps {
  manifest?: string // 初始 MAML XML
  onChange: (xml: string) => void
  onElementSelect?: (element: MAMLElementInstance | null) => void
  width?: number
  height?: number
  config?: Partial<EditorConfig>
}

// 快捷键定义
export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  action: string
  description: string
}

// 主题配置
export interface ThemeConfig {
  backgroundColor: string
  panelBackground: string
  accentColor: string
  textColor: string
  borderColor: string
  gridColor: string
  selectionColor: string
  hoverColor: string
}

// 默认主题配置
export const defaultTheme: ThemeConfig = {
  backgroundColor: '#1a1a2e',
  panelBackground: '#0f0f23',
  accentColor: '#ff6b6b',
  textColor: '#e0e0e0',
  borderColor: '#2a2a3e',
  gridColor: '#2a2a3e',
  selectionColor: '#ff6b6b',
  hoverColor: '#3a3a4e',
}

// 默认编辑器配置
export const defaultEditorConfig: EditorConfig = {
  canvasWidth: 1080,
  canvasHeight: 1920,
  minScale: 0.1,
  maxScale: 3,
  gridSizes: [10, 20, 50, 100],
  defaultGridSize: 20,
}

// 动画缓动函数类型
export type EasingType =
  | 'linear'
  | 'ease'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bounce'
  | 'elastic'
  | 'back'

// 动画类型
export type AnimationType =
  | 'alpha'
  | 'position'
  | 'scale'
  | 'rotation'
  | 'color'
  | 'number'

// 触发器动作类型
export type TriggerAction =
  | 'click'
  | 'longClick'
  | 'doubleClick'
  | 'swipe'
  | 'pinch'
  | 'shake'
  | 'time'
  | 'battery'
  | 'charging'
  | 'unlock'
  | 'lock'
