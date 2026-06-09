/**
 * MIUI Theme Editor - 预加载脚本
 * 通过 contextBridge 安全地向渲染进程暴露主进程 API
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

/**
 * 通过 contextBridge 暴露给渲染进程的 Electron API
 * 所有方法都是异步的，通过 IPC 与主进程通信
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 打开文件对话框
   * @param options 文件对话框选项
   * @returns 文件对话框结果
   */
  openFile: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE, options),

  /**
   * 保存文件对话框
   * @param options 保存对话框选项
   * @returns 文件对话框结果
   */
  saveFile: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_FILE, options),

  /**
   * 读取文件内容
   * @param filePath 文件路径
   * @returns 文件内容（Buffer）
   */
  readFile: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),

  /**
   * 写入文件内容
   * @param filePath 文件路径
   * @param data 文件数据（Buffer）
   * @returns 操作结果
   */
  writeFile: (filePath: string, data: ArrayBuffer) =>
    ipcRenderer.invoke(IPC_CHANNELS.WRITE_FILE, filePath, data),

  /**
   * 解析 MTZ 主题包
   * @param buffer MTZ 文件的 ArrayBuffer
   * @returns 解析结果
   */
  parseMTZ: (buffer: ArrayBuffer) => ipcRenderer.invoke(IPC_CHANNELS.PARSE_MTZ, buffer),

  /**
   * 打包 MTZ 主题包
   * @param project 主题项目数据
   * @param options 打包选项
   * @returns 打包结果
   */
  packMTZ: (project: any, options?: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.PACK_MTZ, project, options),

  /**
   * 列出已连接的 ADB 设备
   * @returns 设备列表
   */
  listDevices: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_DEVICES),

  /**
   * 推送主题到设备
   * @param deviceSerial 设备序列号
   * @param filePath 主题文件路径
   * @returns 推送结果
   */
  pushTheme: (deviceSerial: string, filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PUSH_THEME, deviceSerial, filePath),

  /**
   * 在设备上应用主题
   * @param deviceSerial 设备序列号
   * @param packageName 主题包名
   * @returns 应用结果
   */
  applyTheme: (deviceSerial: string, packageName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.APPLY_THEME, deviceSerial, packageName),

  /**
   * AI 生成文本
   * @param request AI 生成请求
   * @returns AI 生成响应
   */
  aiGenerateText: (request: any) => ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_TEXT, request),

  /**
   * AI 流式生成文本
   * @param request AI 流式请求
   * @returns 流式响应
   */
  aiStreamText: (request: any) => ipcRenderer.invoke(IPC_CHANNELS.AI_STREAM_TEXT, request),

  // ==================== 自动更新 API ====================

  /**
   * 检查更新
   * @returns 检查结果
   */
  checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),

  /**
   * 退出并安装更新
   */
  quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),

  /**
   * 监听更新可用事件
   * @param callback 回调函数
   * @returns 取消监听函数
   */
  onUpdateAvailable: (callback: (info: any) => void) => {
    const handler = (_event: any, info: any) => callback(info);
    ipcRenderer.on('updater:available', handler);
    return () => ipcRenderer.removeListener('updater:available', handler);
  },

  /**
   * 监听下载进度事件
   * @param callback 回调函数
   * @returns 取消监听函数
   */
  onDownloadProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('updater:download-progress', handler);
    return () => ipcRenderer.removeListener('updater:download-progress', handler);
  },

  /**
   * 监听更新已下载事件
   * @param callback 回调函数
   * @returns 取消监听函数
   */
  onUpdateDownloaded: (callback: (info: any) => void) => {
    const handler = (_event: any, info: any) => callback(info);
    ipcRenderer.on('updater:downloaded', handler);
    return () => ipcRenderer.removeListener('updater:downloaded', handler);
  },

  /**
   * 监听检查更新中事件
   * @param callback 回调函数
   * @returns 取消监听函数
   */
  onCheckingForUpdate: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('updater:checking', handler);
    return () => ipcRenderer.removeListener('updater:checking', handler);
  },

  /**
   * 监听当前已是最新版本事件
   * @param callback 回调函数
   * @returns 取消监听函数
   */
  onUpdateNotAvailable: (callback: (info: any) => void) => {
    const handler = (_event: any, info: any) => callback(info);
    ipcRenderer.on('updater:not-available', handler);
    return () => ipcRenderer.removeListener('updater:not-available', handler);
  },

  /**
   * 监听更新错误事件
   * @param callback 回调函数
   * @returns 取消监听函数
   */
  onUpdateError: (callback: (error: any) => void) => {
    const handler = (_event: any, error: any) => callback(error);
    ipcRenderer.on('updater:error', handler);
    return () => ipcRenderer.removeListener('updater:error', handler);
  },
});

/**
 * 全局 Window 类型扩展声明
 * 使 TypeScript 识别 window.electronAPI
 */
declare global {
  interface Window {
    electronAPI: {
      openFile: (options?: any) => Promise<any>;
      saveFile: (options?: any) => Promise<any>;
      readFile: (filePath: string) => Promise<any>;
      writeFile: (filePath: string, data: ArrayBuffer) => Promise<any>;
      parseMTZ: (buffer: ArrayBuffer) => Promise<any>;
      packMTZ: (project: any, options?: any) => Promise<any>;
      listDevices: () => Promise<any>;
      pushTheme: (deviceSerial: string, filePath: string) => Promise<any>;
      applyTheme: (deviceSerial: string, packageName: string) => Promise<any>;
      aiGenerateText: (request: any) => Promise<any>;
      aiStreamText: (request: any) => Promise<any>;

      // 自动更新 API
      checkForUpdates: () => Promise<any>;
      quitAndInstall: () => Promise<void>;
      onUpdateAvailable: (callback: (info: any) => void) => () => void;
      onDownloadProgress: (callback: (progress: any) => void) => () => void;
      onUpdateDownloaded: (callback: (info: any) => void) => () => void;
      onCheckingForUpdate: (callback: () => void) => () => void;
      onUpdateNotAvailable: (callback: (info: any) => void) => () => void;
      onUpdateError: (callback: (error: any) => void) => () => void;
    };
  }
}
