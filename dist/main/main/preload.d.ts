/**
 * MIUI Theme Editor - 预加载脚本
 * 通过 contextBridge 安全地向渲染进程暴露主进程 API
 */
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
        };
    }
}
export {};
//# sourceMappingURL=preload.d.ts.map