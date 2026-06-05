/**
 * MIUI Theme Editor - 全局类型声明
 * 扩展 Window 接口，声明 electronAPI 属性
 * 使 TypeScript 在渲染进程中能正确识别 window.electronAPI
 */

interface ElectronAPI {
  /** 打开文件对话框 */
  openFile: (options?: any) => Promise<any>;
  /** 保存文件对话框 */
  saveFile: (options?: any) => Promise<any>;
  /** 读取文件内容 */
  readFile: (filePath: string) => Promise<any>;
  /** 写入文件内容 */
  writeFile: (filePath: string, data: ArrayBuffer) => Promise<any>;
  /** 解析 MTZ 主题包 */
  parseMTZ: (buffer: ArrayBuffer) => Promise<any>;
  /** 打包 MTZ 主题包 */
  packMTZ: (project: any, options?: any) => Promise<any>;
  /** 列出已连接的 ADB 设备 */
  listDevices: () => Promise<any>;
  /** 推送主题到设备 */
  pushTheme: (deviceSerial: string, filePath: string) => Promise<any>;
  /** 在设备上应用主题 */
  applyTheme: (deviceSerial: string, packageName: string) => Promise<any>;
  /** AI 生成文本 */
  aiGenerateText: (request: any) => Promise<any>;
  /** AI 流式生成文本 */
  aiStreamText: (request: any) => Promise<any>;
  /** 窗口关闭前回调（返回 false 阻止关闭） */
  onBeforeClose?: (callback: () => boolean) => () => void;
}

declare global {
  interface Window {
    /** Electron 预加载脚本暴露的 API */
    electronAPI: ElectronAPI;
  }

  // 允许 JSX
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
  }
}

declare module '*.module.less' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.less' {
  const content: string;
  export default content;
}

export {};
