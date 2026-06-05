/**
 * MIUI Theme Editor - Electron 主进程入口
 * 负责创建窗口、注册 IPC 处理程序、管理应用生命周期
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { IPC_CHANNELS } from '../shared/types';
import { MTZParser } from './engine/mtz-parser';
import { MTZPacker } from './engine/mtz-packer';

// ==================== 全局变量 ====================

/** 主窗口实例 */
let mainWindow: BrowserWindow | null = null;

/** MTZ 解析引擎 */
const mtzParser = new MTZParser();

/** MTZ 打包引擎 */
const mtzPacker = new MTZPacker();

// ==================== 窗口创建 ====================

/**
 * 创建主窗口
 * 使用 hiddenInset 样式实现 macOS 风格的无边框标题栏
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'MIUI Theme Editor',
    // 使用 hiddenInset 样式实现无边框标题栏
    titleBarStyle: 'hiddenInset',
    // Windows 下使用无边框窗口
    frame: process.platform !== 'darwin',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // 启用上下文隔离，确保安全性
      contextIsolation: true,
      // 禁用 Node.js 集成
      nodeIntegration: false,
      sandbox: false,
    },
    show: false, // 先隐藏，等加载完成后再显示
  });

  // 窗口准备好后显示，避免白屏闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 开发环境加载 Vite 开发服务器，生产环境加载打包后的文件
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
    // 开发环境打开 DevTools
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // 外部链接在系统浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==================== IPC 处理程序 ====================

/**
 * 设置所有 IPC 通信处理程序
 */
function setupIPC(): void {
  // ---------- 文件对话框 ----------

  /** 打开文件对话框 */
  ipcMain.handle(IPC_CHANNELS.OPEN_FILE, async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: options?.title || '打开文件',
      defaultPath: options?.defaultPath,
      filters: options?.filters || [
        { name: 'MIUI 主题文件', extensions: ['mtz'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    };
  });

  /** 保存文件对话框 */
  ipcMain.handle(IPC_CHANNELS.SAVE_FILE, async (_event, options) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: options?.title || '保存文件',
      defaultPath: options?.defaultPath,
      filters: options?.filters || [
        { name: 'MIUI 主题文件', extensions: ['mtz'] },
      ],
    });
    return {
      canceled: result.canceled,
      filePaths: result.filePath ? [result.filePath] : [],
    };
  });

  // ---------- 文件读写 ----------

  /** 读取文件内容 */
  ipcMain.handle(IPC_CHANNELS.READ_FILE, async (_event, filePath: string) => {
    try {
      const buffer = await fs.promises.readFile(filePath);
      return { success: true, data: buffer };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /** 写入文件内容 */
  ipcMain.handle(IPC_CHANNELS.WRITE_FILE, async (_event, filePath: string, data: Buffer) => {
    try {
      await fs.promises.writeFile(filePath, data);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ---------- MTZ 解析与打包 ----------

  /** 解析 MTZ 主题包 */
  ipcMain.handle(IPC_CHANNELS.PARSE_MTZ, async (_event, buffer: Buffer) => {
    try {
      const result = await mtzParser.parse(buffer, {});
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /** 打包 MTZ 主题包 */
  ipcMain.handle(IPC_CHANNELS.PACK_MTZ, async (_event, project, options) => {
    try {
      const result = await mtzPacker.pack(project, options || {});
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ---------- ADB 设备管理 ----------

  /** 列出已连接的设备 */
  ipcMain.handle(IPC_CHANNELS.LIST_DEVICES, async () => {
    try {
      // TODO: 集成 adbkit 实现设备列表
      return { success: true, data: [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /** 推送主题到设备 */
  ipcMain.handle(IPC_CHANNELS.PUSH_THEME, async (_event, _deviceSerial: string, _filePath: string) => {
    try {
      // TODO: 集成 adbkit 实现主题推送
      return { success: true, data: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /** 应用主题到设备 */
  ipcMain.handle(IPC_CHANNELS.APPLY_THEME, async (_event, _deviceSerial: string, _packageName: string) => {
    try {
      // TODO: 集成 adbkit 实现主题应用
      return { success: true, data: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ---------- AI 功能 ----------

  /** AI 生成文本 */
  ipcMain.handle(IPC_CHANNELS.AI_GENERATE_TEXT, async (_event, _request) => {
    try {
      // TODO: AI 生成功能在渲染进程中通过 API 直接调用
      return { success: true, data: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /** AI 流式生成文本 */
  ipcMain.handle(IPC_CHANNELS.AI_STREAM_TEXT, async (_event, _request) => {
    try {
      // TODO: AI 流式生成功能
      return { success: true, data: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}

// ==================== 应用生命周期 ====================

// 应用准备就绪
app.whenReady().then(() => {
  createWindow();
  setupIPC();

  // macOS 激活窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭
app.on('window-all-closed', () => {
  // macOS 上保持应用运行
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
