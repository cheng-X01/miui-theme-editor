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
import { registerDeviceHandlers, unregisterDeviceHandlers } from './ipc/device-handler';

// Linux arm64 兼容性修复：禁用 GPU sandbox 和启用软件渲染（如果启动失败）
// 必须在 app ready 之前设置
if (process.platform === 'linux') {
  const arch = process.arch;
  console.log(`[Linux] Architecture: ${arch}`);

  // 检测是否在容器/受限环境中运行
  const isContainer = !fs.existsSync('/dev/dri') || process.env.CONTAINER_ID;
  if (isContainer || arch === 'arm64') {
    console.log('[Linux] Applying arm64/container compatibility flags');
    app.commandLine.appendSwitch('--no-sandbox');
    app.commandLine.appendSwitch('--disable-gpu-sandbox');
    app.commandLine.appendSwitch('--disable-setuid-sandbox');
  }
}

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
  const isMac = process.platform === 'darwin';
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'MIUI Theme Editor',
    // macOS 使用 hiddenInset 样式实现无边框标题栏，Windows 不使用
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    // Windows 下使用标准窗口框架，避免兼容性问题
    frame: !isMac,
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

  /** 注册设备 IPC 处理器（adbkit 集成） */
  registerDeviceHandlers();

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
// 捕获未处理的错误，防止应用静默崩溃
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Windows 下将错误写入日志文件以便调试
  if (process.platform === 'win32') {
    const logPath = path.join(app.getPath('userData'), 'error.log');
    const log = `[${new Date().toISOString()}] Uncaught Exception: ${error.stack || error.message}\n`;
    fs.appendFileSync(logPath, log);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

app.whenReady().then(() => {
  console.log('App is ready, platform:', process.platform);
  createWindow();
  setupIPC();

  // macOS 激活窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  console.error('Failed to initialize app:', error);
  // Windows 下将启动错误写入日志
  if (process.platform === 'win32') {
    const logPath = path.join(app.getPath('userData'), 'startup-error.log');
    const log = `[${new Date().toISOString()}] Startup Error: ${error.stack || error.message}\n`;
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.writeFileSync(logPath, log);
    } catch (e) {
      // 忽略写入错误
    }
  }
  app.exit(1);
});

// 所有窗口关闭
app.on('window-all-closed', () => {
  // 注销设备 IPC 处理器，释放资源
  unregisterDeviceHandlers();

  // macOS 上保持应用运行
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
