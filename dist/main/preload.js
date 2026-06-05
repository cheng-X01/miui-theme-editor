"use strict";
/**
 * MIUI Theme Editor - 预加载脚本
 * 通过 contextBridge 安全地向渲染进程暴露主进程 API
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const types_1 = require("../shared/types");
/**
 * 通过 contextBridge 暴露给渲染进程的 Electron API
 * 所有方法都是异步的，通过 IPC 与主进程通信
 */
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * 打开文件对话框
     * @param options 文件对话框选项
     * @returns 文件对话框结果
     */
    openFile: (options) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.OPEN_FILE, options),
    /**
     * 保存文件对话框
     * @param options 保存对话框选项
     * @returns 文件对话框结果
     */
    saveFile: (options) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SAVE_FILE, options),
    /**
     * 读取文件内容
     * @param filePath 文件路径
     * @returns 文件内容（Buffer）
     */
    readFile: (filePath) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.READ_FILE, filePath),
    /**
     * 写入文件内容
     * @param filePath 文件路径
     * @param data 文件数据（Buffer）
     * @returns 操作结果
     */
    writeFile: (filePath, data) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.WRITE_FILE, filePath, data),
    /**
     * 解析 MTZ 主题包
     * @param buffer MTZ 文件的 ArrayBuffer
     * @returns 解析结果
     */
    parseMTZ: (buffer) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PARSE_MTZ, buffer),
    /**
     * 打包 MTZ 主题包
     * @param project 主题项目数据
     * @param options 打包选项
     * @returns 打包结果
     */
    packMTZ: (project, options) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PACK_MTZ, project, options),
    /**
     * 列出已连接的 ADB 设备
     * @returns 设备列表
     */
    listDevices: () => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.LIST_DEVICES),
    /**
     * 推送主题到设备
     * @param deviceSerial 设备序列号
     * @param filePath 主题文件路径
     * @returns 推送结果
     */
    pushTheme: (deviceSerial, filePath) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PUSH_THEME, deviceSerial, filePath),
    /**
     * 在设备上应用主题
     * @param deviceSerial 设备序列号
     * @param packageName 主题包名
     * @returns 应用结果
     */
    applyTheme: (deviceSerial, packageName) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.APPLY_THEME, deviceSerial, packageName),
    /**
     * AI 生成文本
     * @param request AI 生成请求
     * @returns AI 生成响应
     */
    aiGenerateText: (request) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.AI_GENERATE_TEXT, request),
    /**
     * AI 流式生成文本
     * @param request AI 流式请求
     * @returns 流式响应
     */
    aiStreamText: (request) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.AI_STREAM_TEXT, request),
});
//# sourceMappingURL=preload.js.map