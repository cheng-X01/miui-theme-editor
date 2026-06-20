/**
 * 设备 IPC 处理器
 * 注册所有与 ADB 设备相关的 IPC 通道
 * 通过 IPC 将 ADBManager 功能暴露给渲染进程
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import ADBManager, { DeviceInfo, DeviceMonitorCallback } from '../device/ADBManager'

// ==================== 输入验证 ====================

/**
 * 验证主题名称安全性（防止 ADB 命令注入）
 * 仅允许字母、数字、下划线、连字符、中文、点号
 */
function validateThemeName(name: string): boolean {
  return /^[\w\u4e00-\u9fff.\-]+$/.test(name);
}

/**
 * 验证主题路径安全性（防止 ADB 命令注入和路径遍历）
 * 必须以 /sdcard/MIUI/theme/ 开头，且不包含 shell 特殊字符
 */
function validateThemePath(themePath: string): boolean {
  if (!themePath.startsWith('/sdcard/MIUI/theme/')) {
    return false;
  }
  // 检查 shell 特殊字符
  const dangerousChars = [';', '|', '&', '$', '`', '(', ')', '{', '}', '<', '>', '\n', '\r'];
  return !dangerousChars.some(c => themePath.includes(c));
}

// ==================== 全局变量 ====================

/** ADB 管理器单例实例 */
const adbManager = ADBManager.getInstance()

/** 监控状态标记 */
let isMonitoring = false

// ==================== IPC 处理器注册 ====================

/**
 * 注册所有设备相关的 IPC 处理程序
 */
export function registerDeviceHandlers(): void {
  // ---------- 设备列表 ----------

  /** 列出所有已连接的设备 */
  ipcMain.handle(IPC_CHANNELS.LIST_DEVICES, async () => {
    try {
      const devices = await adbManager.listDevices()
      return { success: true, data: devices }
    } catch (error: any) {
      console.error('[DeviceHandler] 列出设备失败:', error)
      return { success: false, error: error.message }
    }
  })

  // ---------- 设备信息 ----------

  /** 获取指定设备的详细信息 */
  ipcMain.handle(IPC_CHANNELS.GET_DEVICE_INFO, async (_event: IpcMainInvokeEvent, deviceId: string) => {
    try {
      const info = await adbManager.getDeviceInfo(deviceId)
      return { success: true, data: info }
    } catch (error: any) {
      console.error(`[DeviceHandler] 获取设备 ${deviceId} 信息失败:`, error)
      return { success: false, error: error.message }
    }
  })

  // ---------- 推送主题 ----------

  /** 推送主题文件到设备 */
  ipcMain.handle(
    IPC_CHANNELS.PUSH_THEME,
    async (
      _event: IpcMainInvokeEvent,
      deviceId: string,
      mtzBuffer: Buffer,
      themeName: string
    ) => {
      try {
        // 输入验证：防止命令注入
        if (!validateThemeName(themeName)) {
          return { success: false, error: '主题名称包含非法字符' };
        }
        await adbManager.pushTheme(deviceId, mtzBuffer, themeName)
        return { success: true, data: null }
      } catch (error: any) {
        console.error('[DeviceHandler] 推送主题失败:', error)
        return { success: false, error: error.message }
      }
    }
  )

  // ---------- 应用主题 ----------

  /** 在设备上应用主题 */
  ipcMain.handle(
    IPC_CHANNELS.APPLY_THEME,
    async (_event: IpcMainInvokeEvent, deviceId: string, themePath: string) => {
      try {
        // 输入验证：防止命令注入
        if (!validateThemePath(themePath)) {
          return { success: false, error: '主题路径不合法' };
        }
        await adbManager.applyTheme(deviceId, themePath)
        return { success: true, data: null }
      } catch (error: any) {
        console.error('[DeviceHandler] 应用主题失败:', error)
        return { success: false, error: error.message }
      }
    }
  )

  // ---------- 截屏 ----------

  /** 截取设备屏幕 */
  ipcMain.handle(IPC_CHANNELS.SCREENSHOT, async (_event: IpcMainInvokeEvent, deviceId: string) => {
    try {
      const buffer = await adbManager.screenshot(deviceId)
      return { success: true, data: buffer }
    } catch (error: any) {
      console.error('[DeviceHandler] 截屏失败:', error)
      return { success: false, error: error.message }
    }
  })

  // ---------- WiFi 连接 ----------

  /** 通过 WiFi 连接 ADB 设备 */
  ipcMain.handle(
    IPC_CHANNELS.CONNECT_WIFI,
    async (_event: IpcMainInvokeEvent, ip: string, port?: number) => {
      try {
        const result = await adbManager.connectWifi(ip, port)
        return { success: true, data: result }
      } catch (error: any) {
        console.error(`[DeviceHandler] WiFi 连接失败 ${ip}:`, error)
        return { success: false, error: error.message }
      }
    }
  )

  // ---------- 设备监控 ----------

  /**
   * 开始/停止设备监控
   * 使用 IPC 通道进行监控控制，通过不同的窗口发送事件通知
   */
  ipcMain.handle(
    IPC_CHANNELS.MONITOR_DEVICES,
    async (_event: IpcMainInvokeEvent, action: 'start' | 'stop') => {
      try {
        if (action === 'start') {
          if (isMonitoring) {
            return { success: true, data: '监控已在运行中' }
          }

          // 创建监控回调，通过 IPC 发送设备变化事件
          const callback: DeviceMonitorCallback = (devices: DeviceInfo[]) => {
            // 获取所有窗口并发送设备变化事件
            const { BrowserWindow } = require('electron')
            BrowserWindow.getAllWindows().forEach((win: any) => {
              win.webContents.send('device:changed', devices)
            })
          }

          adbManager.startMonitoring(callback)
          isMonitoring = true

          return { success: true, data: '设备监控已启动' }
        } else if (action === 'stop') {
          adbManager.stopMonitoring()
          isMonitoring = false
          return { success: true, data: '设备监控已停止' }
        }

        return { success: false, error: '未知的监控操作' }
      } catch (error: any) {
        console.error('[DeviceHandler] 设备监控操作失败:', error)
        return { success: false, error: error.message }
      }
    }
  )

  console.log('[DeviceHandler] 设备 IPC 处理器注册完成')
}

/**
 * 注销设备相关的 IPC 处理程序
 * 在应用退出前调用，清理资源
 */
export function unregisterDeviceHandlers(): void {
  // 停止设备监控
  if (isMonitoring) {
    adbManager.stopMonitoring()
    isMonitoring = false
  }

  // 移除 IPC 处理器
  ipcMain.removeHandler(IPC_CHANNELS.LIST_DEVICES)
  ipcMain.removeHandler(IPC_CHANNELS.GET_DEVICE_INFO)
  ipcMain.removeHandler(IPC_CHANNELS.PUSH_THEME)
  ipcMain.removeHandler(IPC_CHANNELS.APPLY_THEME)
  ipcMain.removeHandler(IPC_CHANNELS.SCREENSHOT)
  ipcMain.removeHandler(IPC_CHANNELS.CONNECT_WIFI)
  ipcMain.removeHandler(IPC_CHANNELS.MONITOR_DEVICES)

  console.log('[DeviceHandler] 设备 IPC 处理器已注销')
}
