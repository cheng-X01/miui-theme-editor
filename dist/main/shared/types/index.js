"use strict";
/**
 * MIUI Theme Editor - 共享类型定义
 * 主进程和渲染进程共用的类型和常量
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
// ==================== IPC 通道常量 ====================
/** IPC 通信通道名称 */
exports.IPC_CHANNELS = {
    /** 打开文件对话框 */
    OPEN_FILE: 'dialog:open-file',
    /** 保存文件对话框 */
    SAVE_FILE: 'dialog:save-file',
    /** 读取文件内容 */
    READ_FILE: 'fs:read-file',
    /** 写入文件内容 */
    WRITE_FILE: 'fs:write-file',
    /** 解析 MTZ 主题包 */
    PARSE_MTZ: 'mtz:parse',
    /** 打包 MTZ 主题包 */
    PACK_MTZ: 'mtz:pack',
    /** 列出已连接设备 */
    LIST_DEVICES: 'device:list',
    /** 获取设备详细信息 */
    GET_DEVICE_INFO: 'device:info',
    /** 推送主题到设备 */
    PUSH_THEME: 'device:push',
    /** 应用主题到设备 */
    APPLY_THEME: 'device:apply',
    /** 截屏 */
    SCREENSHOT: 'device:screenshot',
    /** WiFi 连接设备 */
    CONNECT_WIFI: 'device:connect-wifi',
    /** 监控设备连接状态 */
    MONITOR_DEVICES: 'device:monitor',
    /** AI 生成文本 */
    AI_GENERATE_TEXT: 'ai:generate-text',
    /** AI 流式生成文本 */
    AI_STREAM_TEXT: 'ai:stream-text',
};
//# sourceMappingURL=index.js.map