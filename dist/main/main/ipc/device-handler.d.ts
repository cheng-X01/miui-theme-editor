/**
 * 设备 IPC 处理器
 * 注册所有与 ADB 设备相关的 IPC 通道
 * 通过 IPC 将 ADBManager 功能暴露给渲染进程
 */
/**
 * 注册所有设备相关的 IPC 处理程序
 */
export declare function registerDeviceHandlers(): void;
/**
 * 注销设备相关的 IPC 处理程序
 * 在应用退出前调用，清理资源
 */
export declare function unregisterDeviceHandlers(): void;
//# sourceMappingURL=device-handler.d.ts.map