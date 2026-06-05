"use strict";
/**
 * ADB 设备管理器
 * 基于 adbkit 的 Node.js 主进程模块
 * 负责设备检测、主题推送、应用主题、截屏和无线 ADB 连接
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
const adbkit = __importStar(require("adbkit"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
// ==================== ADB 管理器类 ====================
/**
 * ADB 设备管理器（单例模式）
 * 封装 adbkit 客户端，提供设备管理和主题操作功能
 */
class ADBManager {
    // ---------- 单例获取 ----------
    /**
     * 获取 ADBManager 单例实例
     */
    static getInstance() {
        if (!ADBManager.instance) {
            ADBManager.instance = new ADBManager();
        }
        return ADBManager.instance;
    }
    /**
     * 私有构造函数，防止外部实例化
     */
    constructor() {
        /** adbkit 客户端实例 */
        Object.defineProperty(this, "client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** 设备监控定时器 */
        Object.defineProperty(this, "monitorTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** 设备监控回调 */
        Object.defineProperty(this, "monitorCallback", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** 上次检测到的设备列表 */
        Object.defineProperty(this, "lastDevices", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.initClient();
    }
    // ---------- 客户端初始化 ----------
    /**
     * 初始化 adbkit 客户端
     */
    initClient() {
        try {
            this.client = adbkit.createClient({
                host: '127.0.0.1',
                port: 5037,
            });
            console.log('[ADBManager] adbkit 客户端初始化成功');
        }
        catch (error) {
            console.error('[ADBManager] adbkit 客户端初始化失败:', error);
            this.client = null;
        }
    }
    /**
     * 确保客户端可用
     */
    ensureClient() {
        if (!this.client) {
            this.initClient();
        }
        if (!this.client) {
            throw new Error('ADB 客户端初始化失败，请检查 ADB 环境');
        }
        return this.client;
    }
    // ---------- 设备检测 ----------
    /**
     * 列出所有已连接的设备
     * @returns 设备信息列表
     */
    async listDevices() {
        try {
            const client = this.ensureClient();
            const devices = await client.listDevices();
            const deviceInfos = [];
            for (const device of devices) {
                const info = await this.parseDeviceInfo(device);
                deviceInfos.push(info);
            }
            this.lastDevices = deviceInfos;
            return deviceInfos;
        }
        catch (error) {
            console.error('[ADBManager] 列出设备失败:', error);
            return [];
        }
    }
    /**
     * 获取指定设备的详细信息
     * @param deviceId 设备序列号
     * @returns 设备详细信息
     */
    async getDeviceInfo(deviceId) {
        try {
            const client = this.ensureClient();
            const devices = await client.listDevices();
            const device = devices.find((d) => d.id === deviceId);
            if (!device) {
                throw new Error(`未找到设备: ${deviceId}`);
            }
            return await this.parseDeviceInfo(device);
        }
        catch (error) {
            console.error(`[ADBManager] 获取设备 ${deviceId} 信息失败:`, error);
            throw error;
        }
    }
    /**
     * 解析设备信息
     * @param device adbkit 设备对象
     * @returns 标准化的设备信息
     */
    async parseDeviceInfo(device) {
        const client = this.ensureClient();
        const deviceClient = client.getDevice(device.id);
        // 获取设备属性
        const properties = {};
        try {
            const props = await deviceClient.getProperties();
            for (const [key, value] of Object.entries(props)) {
                properties[key] = String(value);
            }
        }
        catch {
            // 部分设备可能无法获取属性
        }
        // 判断连接类型
        const connectionType = device.id.includes(':') || device.id.includes('.') ? 'wifi' : 'usb';
        // 解析状态
        let status = 'offline';
        if (device.type === 'device')
            status = 'device';
        else if (device.type === 'unauthorized')
            status = 'unauthorized';
        else if (device.type === 'offline')
            status = 'offline';
        // 提取 MIUI 版本
        const miuiVersion = properties['ro.miui.ui.version.name'] ??
            properties['ro.build.version.incremental'] ??
            undefined;
        return {
            id: device.id,
            model: properties['ro.product.model'] ?? '未知型号',
            brand: properties['ro.product.brand'] ?? '未知品牌',
            androidVersion: properties['ro.build.version.release'] ?? '未知版本',
            miuiVersion,
            connectionType,
            status,
        };
    }
    // ---------- 主题操作 ----------
    /**
     * 推送主题文件到手机
     * @param deviceId 设备序列号
     * @param mtzBuffer MTZ 主题文件 Buffer
     * @param themeName 主题名称
     */
    async pushTheme(deviceId, mtzBuffer, themeName) {
        try {
            const client = this.ensureClient();
            const device = client.getDevice(deviceId);
            // MIUI 主题目录
            const themeDir = '/sdcard/MIUI/theme';
            const themePath = `${themeDir}/${themeName}.mtz`;
            // 确保主题目录存在
            try {
                await device.shell(`mkdir -p ${themeDir}`);
            }
            catch {
                // 目录可能已存在
            }
            // 将 Buffer 写入临时文件
            const tempPath = path.join(os.tmpdir(), `${themeName}.mtz`);
            await fs.promises.writeFile(tempPath, mtzBuffer);
            try {
                // 推送文件到设备
                await device.push(tempPath, themePath);
                console.log(`[ADBManager] 主题已推送到设备: ${themePath}`);
            }
            finally {
                // 清理临时文件
                try {
                    await fs.promises.unlink(tempPath);
                }
                catch {
                    // 忽略清理错误
                }
            }
        }
        catch (error) {
            console.error('[ADBManager] 推送主题失败:', error);
            throw error;
        }
    }
    /**
     * 应用主题到设备
     * @param deviceId 设备序列号
     * @param themePath 主题在设备上的路径
     */
    async applyTheme(deviceId, themePath) {
        try {
            const client = this.ensureClient();
            const device = client.getDevice(deviceId);
            // 使用 am 命令启动主题应用
            // MIUI 主题应用通常通过 com.android.thememanager 处理
            const command = [
                'am',
                'start',
                '-a',
                'android.intent.action.VIEW',
                '-d',
                `file://${themePath}`,
                '-t',
                'application/octet-stream',
                '-f',
                '0x10000000',
            ].join(' ');
            const output = await device.shell(command);
            const outputStr = output.toString();
            if (outputStr.includes('Error')) {
                throw new Error(`应用主题失败: ${outputStr}`);
            }
            console.log(`[ADBManager] 主题应用命令已发送: ${themePath}`);
        }
        catch (error) {
            console.error('[ADBManager] 应用主题失败:', error);
            throw error;
        }
    }
    // ---------- 截屏 ----------
    /**
     * 截取设备屏幕
     * @param deviceId 设备序列号
     * @returns 截屏图片 Buffer（PNG 格式）
     */
    async screenshot(deviceId) {
        try {
            const client = this.ensureClient();
            const device = client.getDevice(deviceId);
            // 使用 screencap 命令截屏
            const screenshotStream = await device.screencap();
            // 将流转换为 Buffer
            const chunks = [];
            return new Promise((resolve, reject) => {
                screenshotStream.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                screenshotStream.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    console.log(`[ADBManager] 截屏成功，大小: ${buffer.length} 字节`);
                    resolve(buffer);
                });
                screenshotStream.on('error', (err) => {
                    reject(err);
                });
            });
        }
        catch (error) {
            console.error('[ADBManager] 截屏失败:', error);
            throw error;
        }
    }
    // ---------- 设备监控 ----------
    /**
     * 开始监控设备连接状态
     * @param callback 设备变化回调函数
     */
    startMonitoring(callback) {
        this.monitorCallback = callback;
        // 立即执行一次检测
        this.checkDevices();
        // 设置定时器，每 3 秒检测一次
        this.monitorTimer = setInterval(() => {
            this.checkDevices();
        }, 3000);
        console.log('[ADBManager] 设备监控已启动');
    }
    /**
     * 停止设备监控
     */
    stopMonitoring() {
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = null;
        }
        this.monitorCallback = null;
        console.log('[ADBManager] 设备监控已停止');
    }
    /**
     * 检测设备变化
     */
    async checkDevices() {
        try {
            const devices = await this.listDevices();
            // 检查设备列表是否有变化
            const hasChanged = this.hasDeviceListChanged(devices, this.lastDevices);
            if (hasChanged) {
                this.lastDevices = devices;
                this.monitorCallback?.(devices);
            }
        }
        catch (error) {
            console.error('[ADBManager] 设备检测失败:', error);
        }
    }
    /**
     * 比较两个设备列表是否有变化
     */
    hasDeviceListChanged(newDevices, oldDevices) {
        if (newDevices.length !== oldDevices.length)
            return true;
        const newIds = new Set(newDevices.map((d) => d.id));
        const oldIds = new Set(oldDevices.map((d) => d.id));
        if (newIds.size !== oldIds.size)
            return true;
        for (const id of newIds) {
            if (!oldIds.has(id))
                return true;
        }
        // 检查设备状态是否有变化
        for (const newDevice of newDevices) {
            const oldDevice = oldDevices.find((d) => d.id === newDevice.id);
            if (!oldDevice || oldDevice.status !== newDevice.status) {
                return true;
            }
        }
        return false;
    }
    // ---------- 无线 ADB ----------
    /**
     * 通过 WiFi 连接 ADB 设备
     * @param ip 设备 IP 地址
     * @param port ADB 端口，默认 5555
     * @returns 是否连接成功
     */
    async connectWifi(ip, port = 5555) {
        try {
            const client = this.ensureClient();
            await client.connect(ip, port);
            console.log(`[ADBManager] WiFi 连接成功: ${ip}:${port}`);
            return true;
        }
        catch (error) {
            console.error(`[ADBManager] WiFi 连接失败 ${ip}:${port}:`, error);
            return false;
        }
    }
    /**
     * 断开 WiFi ADB 连接
     * @param ip 设备 IP 地址
     * @returns 是否断开成功
     */
    async disconnectWifi(ip) {
        try {
            const client = this.ensureClient();
            await client.disconnect(ip);
            console.log(`[ADBManager] WiFi 连接已断开: ${ip}`);
            return true;
        }
        catch (error) {
            console.error(`[ADBManager] WiFi 断开失败 ${ip}:`, error);
            return false;
        }
    }
    // ---------- 辅助方法 ----------
    /**
     * 执行 ADB shell 命令
     * @param deviceId 设备序列号
     * @param command shell 命令
     * @returns 命令输出
     */
    async shell(deviceId, command) {
        try {
            const client = this.ensureClient();
            const device = client.getDevice(deviceId);
            const output = await device.shell(command);
            return output.toString();
        }
        catch (error) {
            console.error(`[ADBManager] 执行命令失败: ${command}`, error);
            throw error;
        }
    }
    /**
     * 检查设备是否已连接且可用
     * @param deviceId 设备序列号
     * @returns 是否可用
     */
    async isDeviceAvailable(deviceId) {
        try {
            const devices = await this.listDevices();
            const device = devices.find((d) => d.id === deviceId);
            return device?.status === 'device';
        }
        catch {
            return false;
        }
    }
}
/** 单例实例 */
Object.defineProperty(ADBManager, "instance", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: null
});
exports.default = ADBManager;
//# sourceMappingURL=ADBManager.js.map