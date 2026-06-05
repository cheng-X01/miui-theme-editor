"use strict";
/**
 * 设备 IPC 处理器
 * 注册所有与 ADB 设备相关的 IPC 通道
 * 通过 IPC 将 ADBManager 功能暴露给渲染进程
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDeviceHandlers = registerDeviceHandlers;
exports.unregisterDeviceHandlers = unregisterDeviceHandlers;
const electron_1 = require("electron");
const types_1 = require("../../shared/types");
const ADBManager_1 = __importDefault(require("../device/ADBManager"));
// ==================== 全局变量 ====================
/** ADB 管理器单例实例 */
const adbManager = ADBManager_1.default.getInstance();
/** 监控状态标记 */
let isMonitoring = false;
// ==================== IPC 处理器注册 ====================
/**
 * 注册所有设备相关的 IPC 处理程序
 */
function registerDeviceHandlers() {
    // ---------- 设备列表 ----------
    /** 列出所有已连接的设备 */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.LIST_DEVICES, async () => {
        try {
            const devices = await adbManager.listDevices();
            return { success: true, data: devices };
        }
        catch (error) {
            console.error('[DeviceHandler] 列出设备失败:', error);
            return { success: false, error: error.message };
        }
    });
    // ---------- 设备信息 ----------
    /** 获取指定设备的详细信息 */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.GET_DEVICE_INFO, async (_event, deviceId) => {
        try {
            const info = await adbManager.getDeviceInfo(deviceId);
            return { success: true, data: info };
        }
        catch (error) {
            console.error(`[DeviceHandler] 获取设备 ${deviceId} 信息失败:`, error);
            return { success: false, error: error.message };
        }
    });
    // ---------- 推送主题 ----------
    /** 推送主题文件到设备 */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PUSH_THEME, async (_event, deviceId, mtzBuffer, themeName) => {
        try {
            await adbManager.pushTheme(deviceId, mtzBuffer, themeName);
            return { success: true, data: null };
        }
        catch (error) {
            console.error('[DeviceHandler] 推送主题失败:', error);
            return { success: false, error: error.message };
        }
    });
    // ---------- 应用主题 ----------
    /** 在设备上应用主题 */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.APPLY_THEME, async (_event, deviceId, themePath) => {
        try {
            await adbManager.applyTheme(deviceId, themePath);
            return { success: true, data: null };
        }
        catch (error) {
            console.error('[DeviceHandler] 应用主题失败:', error);
            return { success: false, error: error.message };
        }
    });
    // ---------- 截屏 ----------
    /** 截取设备屏幕 */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SCREENSHOT, async (_event, deviceId) => {
        try {
            const buffer = await adbManager.screenshot(deviceId);
            return { success: true, data: buffer };
        }
        catch (error) {
            console.error('[DeviceHandler] 截屏失败:', error);
            return { success: false, error: error.message };
        }
    });
    // ---------- WiFi 连接 ----------
    /** 通过 WiFi 连接 ADB 设备 */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CONNECT_WIFI, async (_event, ip, port) => {
        try {
            const result = await adbManager.connectWifi(ip, port);
            return { success: true, data: result };
        }
        catch (error) {
            console.error(`[DeviceHandler] WiFi 连接失败 ${ip}:`, error);
            return { success: false, error: error.message };
        }
    });
    // ---------- 设备监控 ----------
    /**
     * 开始/停止设备监控
     * 使用 IPC 通道进行监控控制，通过不同的窗口发送事件通知
     */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.MONITOR_DEVICES, async (_event, action) => {
        try {
            if (action === 'start') {
                if (isMonitoring) {
                    return { success: true, data: '监控已在运行中' };
                }
                // 创建监控回调，通过 IPC 发送设备变化事件
                const callback = (devices) => {
                    // 获取所有窗口并发送设备变化事件
                    const { BrowserWindow } = require('electron');
                    BrowserWindow.getAllWindows().forEach((win) => {
                        win.webContents.send('device:changed', devices);
                    });
                };
                adbManager.startMonitoring(callback);
                isMonitoring = true;
                return { success: true, data: '设备监控已启动' };
            }
            else if (action === 'stop') {
                adbManager.stopMonitoring();
                isMonitoring = false;
                return { success: true, data: '设备监控已停止' };
            }
            return { success: false, error: '未知的监控操作' };
        }
        catch (error) {
            console.error('[DeviceHandler] 设备监控操作失败:', error);
            return { success: false, error: error.message };
        }
    });
    console.log('[DeviceHandler] 设备 IPC 处理器注册完成');
}
/**
 * 注销设备相关的 IPC 处理程序
 * 在应用退出前调用，清理资源
 */
function unregisterDeviceHandlers() {
    // 停止设备监控
    if (isMonitoring) {
        adbManager.stopMonitoring();
        isMonitoring = false;
    }
    // 移除 IPC 处理器
    electron_1.ipcMain.removeHandler(types_1.IPC_CHANNELS.LIST_DEVICES);
    electron_1.ipcMain.removeHandler(types_1.IPC_CHANNELS.GET_DEVICE_INFO);
    electron_1.ipcMain.removeHandler(types_1.IPC_CHANNELS.PUSH_THEME);
    electron_1.ipcMain.removeHandler(types_1.IPC_CHANNELS.APPLY_THEME);
    electron_1.ipcMain.removeHandler(types_1.IPC_CHANNELS.SCREENSHOT);
    electron_1.ipcMain.removeHandler(types_1.IPC_CHANNELS.CONNECT_WIFI);
    electron_1.ipcMain.removeHandler(types_1.IPC_CHANNELS.MONITOR_DEVICES);
    console.log('[DeviceHandler] 设备 IPC 处理器已注销');
}
//# sourceMappingURL=device-handler.js.map