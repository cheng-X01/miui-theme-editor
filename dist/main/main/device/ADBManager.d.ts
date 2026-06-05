/**
 * ADB 设备管理器
 * 基于 adbkit 的 Node.js 主进程模块
 * 负责设备检测、主题推送、应用主题、截屏和无线 ADB 连接
 */
/** 设备信息 */
export interface DeviceInfo {
    /** 设备序列号 */
    id: string;
    /** 设备型号 */
    model: string;
    /** 设备品牌 */
    brand: string;
    /** Android 版本 */
    androidVersion: string;
    /** MIUI 版本 */
    miuiVersion?: string;
    /** 连接类型 */
    connectionType: 'usb' | 'wifi';
    /** 设备状态 */
    status: 'device' | 'offline' | 'unauthorized';
}
/** 设备监控回调 */
export type DeviceMonitorCallback = (devices: DeviceInfo[]) => void;
/**
 * ADB 设备管理器（单例模式）
 * 封装 adbkit 客户端，提供设备管理和主题操作功能
 */
declare class ADBManager {
    /** adbkit 客户端实例 */
    private client;
    /** 单例实例 */
    private static instance;
    /** 设备监控定时器 */
    private monitorTimer;
    /** 设备监控回调 */
    private monitorCallback;
    /** 上次检测到的设备列表 */
    private lastDevices;
    /**
     * 获取 ADBManager 单例实例
     */
    static getInstance(): ADBManager;
    /**
     * 私有构造函数，防止外部实例化
     */
    private constructor();
    /**
     * 初始化 adbkit 客户端
     */
    private initClient;
    /**
     * 确保客户端可用
     */
    private ensureClient;
    /**
     * 列出所有已连接的设备
     * @returns 设备信息列表
     */
    listDevices(): Promise<DeviceInfo[]>;
    /**
     * 获取指定设备的详细信息
     * @param deviceId 设备序列号
     * @returns 设备详细信息
     */
    getDeviceInfo(deviceId: string): Promise<DeviceInfo>;
    /**
     * 解析设备信息
     * @param device adbkit 设备对象
     * @returns 标准化的设备信息
     */
    private parseDeviceInfo;
    /**
     * 推送主题文件到手机
     * @param deviceId 设备序列号
     * @param mtzBuffer MTZ 主题文件 Buffer
     * @param themeName 主题名称
     */
    pushTheme(deviceId: string, mtzBuffer: Buffer, themeName: string): Promise<void>;
    /**
     * 应用主题到设备
     * @param deviceId 设备序列号
     * @param themePath 主题在设备上的路径
     */
    applyTheme(deviceId: string, themePath: string): Promise<void>;
    /**
     * 截取设备屏幕
     * @param deviceId 设备序列号
     * @returns 截屏图片 Buffer（PNG 格式）
     */
    screenshot(deviceId: string): Promise<Buffer>;
    /**
     * 开始监控设备连接状态
     * @param callback 设备变化回调函数
     */
    startMonitoring(callback: DeviceMonitorCallback): void;
    /**
     * 停止设备监控
     */
    stopMonitoring(): void;
    /**
     * 检测设备变化
     */
    private checkDevices;
    /**
     * 比较两个设备列表是否有变化
     */
    private hasDeviceListChanged;
    /**
     * 通过 WiFi 连接 ADB 设备
     * @param ip 设备 IP 地址
     * @param port ADB 端口，默认 5555
     * @returns 是否连接成功
     */
    connectWifi(ip: string, port?: number): Promise<boolean>;
    /**
     * 断开 WiFi ADB 连接
     * @param ip 设备 IP 地址
     * @returns 是否断开成功
     */
    disconnectWifi(ip: string): Promise<boolean>;
    /**
     * 执行 ADB shell 命令
     * @param deviceId 设备序列号
     * @param command shell 命令
     * @returns 命令输出
     */
    shell(deviceId: string, command: string): Promise<string>;
    /**
     * 检查设备是否已连接且可用
     * @param deviceId 设备序列号
     * @returns 是否可用
     */
    isDeviceAvailable(deviceId: string): Promise<boolean>;
}
export default ADBManager;
//# sourceMappingURL=ADBManager.d.ts.map