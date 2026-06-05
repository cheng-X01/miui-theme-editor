"use strict";
/**
 * MIUI Theme Editor - Electron 主进程入口
 * 负责创建窗口、注册 IPC 处理程序、管理应用生命周期
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const types_1 = require("../shared/types");
const mtz_parser_1 = require("./engine/mtz-parser");
const mtz_packer_1 = require("./engine/mtz-packer");
const device_handler_1 = require("./ipc/device-handler");
// ==================== 全局变量 ====================
/** 主窗口实例 */
let mainWindow = null;
/** MTZ 解析引擎 */
const mtzParser = new mtz_parser_1.MTZParser();
/** MTZ 打包引擎 */
const mtzPacker = new mtz_packer_1.MTZPacker();
// ==================== 窗口创建 ====================
/**
 * 创建主窗口
 * 使用 hiddenInset 样式实现 macOS 风格的无边框标题栏
 */
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
    // 外部链接在系统浏览器中打开
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
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
function setupIPC() {
    // ---------- 文件对话框 ----------
    /** 打开文件对话框 */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.OPEN_FILE, async (_event, options) => {
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
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
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.SAVE_FILE, async (_event, options) => {
        const result = await electron_1.dialog.showSaveDialog(mainWindow, {
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
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.READ_FILE, async (_event, filePath) => {
        try {
            const buffer = await fs.promises.readFile(filePath);
            return { success: true, data: buffer };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    /** 写入文件内容 */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.WRITE_FILE, async (_event, filePath, data) => {
        try {
            await fs.promises.writeFile(filePath, data);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // ---------- MTZ 解析与打包 ----------
    /** 解析 MTZ 主题包 */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PARSE_MTZ, async (_event, buffer) => {
        try {
            const result = await mtzParser.parse(buffer, {});
            return { success: true, data: result };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    /** 打包 MTZ 主题包 */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PACK_MTZ, async (_event, project, options) => {
        try {
            const result = await mtzPacker.pack(project, options || {});
            return { success: true, data: result };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // ---------- ADB 设备管理 ----------
    /** 注册设备 IPC 处理器（adbkit 集成） */
    (0, device_handler_1.registerDeviceHandlers)();
    // ---------- AI 功能 ----------
    /** AI 生成文本 */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.AI_GENERATE_TEXT, async (_event, _request) => {
        try {
            // TODO: AI 生成功能在渲染进程中通过 API 直接调用
            return { success: true, data: null };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    /** AI 流式生成文本 */
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.AI_STREAM_TEXT, async (_event, _request) => {
        try {
            // TODO: AI 流式生成功能
            return { success: true, data: null };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
}
// ==================== 应用生命周期 ====================
// 应用准备就绪
electron_1.app.whenReady().then(() => {
    createWindow();
    setupIPC();
    // macOS 激活窗口
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// 所有窗口关闭
electron_1.app.on('window-all-closed', () => {
    // 注销设备 IPC 处理器，释放资源
    (0, device_handler_1.unregisterDeviceHandlers)();
    // macOS 上保持应用运行
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=index.js.map