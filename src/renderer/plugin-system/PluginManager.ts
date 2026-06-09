/**
 * MIUI Theme Editor - 插件系统管理器
 *
 * 功能：
 * - 定义插件接口（PluginManifest）
 * - 从用户目录 plugins/ 读取并加载 JS 插件文件
 * - 提供注册、卸载、启用、禁用插件的 API
 * - 插件沙箱执行（通过 Function 构造器隔离）
 * - 导出 PluginManager 单例类
 */

// ==================== 类型定义 ====================

/** 插件权限枚举 */
export type PluginPermission =
  | 'read:project'      // 读取项目数据
  | 'write:project'     // 修改项目数据
  | 'read:file'         // 读取文件系统
  | 'write:file'        // 写入文件系统
  | 'ui:panel'          // 注册 UI 面板
  | 'ui:toolbar'        // 注册工具栏按钮
  | 'network'           // 网络请求
  | 'clipboard'         // 剪贴板访问
  | 'notification';     // 发送通知

/** 插件清单 */
export interface PluginManifest {
  /** 插件名称 */
  name: string;
  /** 插件版本（语义化版本） */
  version: string;
  /** 插件作者 */
  author: string;
  /** 入口文件路径（相对于插件目录） */
  entry: string;
  /** 所需权限列表 */
  permissions: PluginPermission[];
  /** 插件描述（可选） */
  description?: string;
  /** 支持的编辑器版本范围（可选） */
  supportedVersions?: string;
}

/** 插件实例 */
export interface PluginInstance {
  /** 插件唯一标识 */
  id: string;
  /** 插件清单 */
  manifest: PluginManifest;
  /** 插件目录路径 */
  directory: string;
  /** 是否已启用 */
  enabled: boolean;
  /** 插件导出的 API */
  exports?: Record<string, any>;
  /** 插件激活时调用 */
  activate?: () => void;
  /** 插件停用时调用 */
  deactivate?: () => void;
}

/** 插件加载结果 */
export interface PluginLoadResult {
  /** 是否成功 */
  success: boolean;
  /** 插件实例（成功时） */
  plugin?: PluginInstance;
  /** 错误信息（失败时） */
  error?: string;
}

/** 插件沙箱上下文 */
export interface PluginSandboxContext {
  /** 日志输出 */
  log: (...args: any[]) => void;
  /** 错误输出 */
  error: (...args: any[]) => void;
  /** 通知 */
  notify: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  /** 获取当前项目数据（需 read:project 权限） */
  getProject?: () => any;
  /** 注册 UI 面板（需 ui:panel 权限） */
  registerPanel?: (panel: { id: string; title: string; render: () => any }) => void;
  /** 注册工具栏按钮（需 ui:toolbar 权限） */
  registerToolbarButton?: (button: { id: string; icon: string; tooltip: string; onClick: () => void }) => void;
}

// ==================== 工具函数 ====================

/**
 * 生成唯一插件 ID
 */
function generatePluginId(manifest: PluginManifest): string {
  return `${manifest.name}@${manifest.version}`;
}

/**
 * 验证插件清单格式
 */
function validateManifest(manifest: any): manifest is PluginManifest {
  if (!manifest || typeof manifest !== 'object') return false;
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) return false;
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) return false;
  if (typeof manifest.author !== 'string' || manifest.author.length === 0) return false;
  if (typeof manifest.entry !== 'string' || manifest.entry.length === 0) return false;
  if (!Array.isArray(manifest.permissions)) return false;
  return true;
}

/**
 * 创建插件沙箱上下文
 */
function createSandboxContext(permissions: PluginPermission[]): PluginSandboxContext {
  const ctx: PluginSandboxContext = {
    log: (...args: any[]) => console.log(`[插件]`, ...args),
    error: (...args: any[]) => console.error(`[插件]`, ...args),
    notify: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      console.log(`[插件通知][${type}] ${message}`);
    },
  };

  if (permissions.includes('read:project')) {
    ctx.getProject = () => {
      console.warn('[插件] getProject 尚未绑定到实际项目 Store');
      return null;
    };
  }

  if (permissions.includes('ui:panel')) {
    ctx.registerPanel = (panel) => {
      console.log(`[插件] 注册面板: ${panel.id} - ${panel.title}`);
    };
  }

  if (permissions.includes('ui:toolbar')) {
    ctx.registerToolbarButton = (button) => {
      console.log(`[插件] 注册工具栏按钮: ${button.id} - ${button.tooltip}`);
    };
  }

  return ctx;
}

/**
 * 在沙箱中执行插件代码
 *
 * 使用 Function 构造器创建隔离执行环境，
 * 限制全局对象访问，防止插件污染主应用。
 */
function executeInSandbox(
  code: string,
  context: PluginSandboxContext,
  manifest: PluginManifest
): any {
  const sandboxKeys = Object.keys(context);
  const sandboxValues = Object.values(context);

  // 构建沙箱函数：只暴露指定的上下文对象
  const sandboxFn = new Function(
    ...sandboxKeys,
    `
    "use strict";
    // 禁止访问危险全局对象
    const window = undefined;
    const document = undefined;
    const globalThis = undefined;
    const self = undefined;
    const top = undefined;
    const parent = undefined;
    const location = undefined;
    const localStorage = undefined;
    const sessionStorage = undefined;
    const indexedDB = undefined;
    const fetch = undefined;
    const XMLHttpRequest = undefined;
    const WebSocket = undefined;

    // 插件代码包装
    var exports = {};
    var module = { exports: exports };

    ${code}

    return module.exports;
    `
  );

  try {
    return sandboxFn(...sandboxValues);
  } catch (error: any) {
    throw new Error(`插件 "${manifest.name}" 执行失败: ${error.message}`);
  }
}

// ==================== 插件管理器 ====================

/**
 * 插件管理器（单例类）
 *
 * 负责插件的全生命周期管理：
 * - 扫描、加载、注册插件
 * - 启用/禁用插件
 * - 卸载插件
 * - 沙箱执行隔离
 */
export class PluginManager {
  private static instance: PluginManager | null = null;

  /** 已注册的插件映射表 */
  private plugins: Map<string, PluginInstance> = new Map();

  /** 插件目录路径 */
  private pluginsDirectory: string = 'plugins/';

  /** 插件变更监听器 */
  private listeners: Array<(plugins: PluginInstance[]) => void> = [];

  /** 私有构造函数（单例模式） */
  private constructor() {}

  /**
   * 获取 PluginManager 单例实例
   */
  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * 销毁单例实例（主要用于测试）
   */
  public static destroyInstance(): void {
    PluginManager.instance = null;
  }

  // ==================== 目录配置 ====================

  /**
   * 设置插件目录路径
   */
  public setPluginsDirectory(directory: string): void {
    this.pluginsDirectory = directory;
  }

  /**
   * 获取当前插件目录路径
   */
  public getPluginsDirectory(): string {
    return this.pluginsDirectory;
  }

  // ==================== 插件注册 ====================

  /**
   * 注册插件
   *
   * 将插件实例加入管理器，但不会自动启用。
   * 需要调用 enablePlugin 手动启用。
   */
  public registerPlugin(plugin: PluginInstance): boolean {
    if (this.plugins.has(plugin.id)) {
      console.warn(`插件 "${plugin.id}" 已存在，跳过注册`);
      return false;
    }

    this.plugins.set(plugin.id, plugin);
    this.notifyListeners();
    return true;
  }

  /**
   * 从清单和代码加载并注册插件
   */
  public loadPlugin(manifest: PluginManifest, code: string, directory: string): PluginLoadResult {
    if (!validateManifest(manifest)) {
      return { success: false, error: '插件清单格式无效' };
    }

    const id = generatePluginId(manifest);

    if (this.plugins.has(id)) {
      return { success: false, error: `插件 "${id}" 已存在` };
    }

    try {
      // 创建沙箱上下文
      const sandboxContext = createSandboxContext(manifest.permissions);

      // 在沙箱中执行插件代码
      const pluginExports = executeInSandbox(code, sandboxContext, manifest);

      const plugin: PluginInstance = {
        id,
        manifest,
        directory,
        enabled: false,
        exports: pluginExports,
        activate: pluginExports?.activate,
        deactivate: pluginExports?.deactivate,
      };

      this.plugins.set(id, plugin);
      this.notifyListeners();

      return { success: true, plugin };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== 启用/禁用 ====================

  /**
   * 启用插件
   *
   * 调用插件的 activate 方法（如果存在）。
   */
  public enablePlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`插件 "${pluginId}" 不存在`);
      return false;
    }

    if (plugin.enabled) {
      return true; // 已经是启用状态
    }

    plugin.enabled = true;

    if (typeof plugin.activate === 'function') {
      try {
        plugin.activate();
      } catch (error: any) {
        console.error(`插件 "${pluginId}" 激活失败:`, error);
        plugin.enabled = false;
        return false;
      }
    }

    this.notifyListeners();
    return true;
  }

  /**
   * 禁用插件
   *
   * 调用插件的 deactivate 方法（如果存在）。
   */
  public disablePlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`插件 "${pluginId}" 不存在`);
      return false;
    }

    if (!plugin.enabled) {
      return true; // 已经是禁用状态
    }

    if (typeof plugin.deactivate === 'function') {
      try {
        plugin.deactivate();
      } catch (error: any) {
        console.error(`插件 "${pluginId}" 停用失败:`, error);
      }
    }

    plugin.enabled = false;
    this.notifyListeners();
    return true;
  }

  /**
   * 切换插件启用状态
   */
  public togglePlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    return plugin.enabled ? this.disablePlugin(pluginId) : this.enablePlugin(pluginId);
  }

  // ==================== 卸载 ====================

  /**
   * 卸载插件
   *
   * 先禁用插件，然后从管理器中移除。
   */
  public uninstallPlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`插件 "${pluginId}" 不存在`);
      return false;
    }

    // 如果已启用，先禁用
    if (plugin.enabled) {
      this.disablePlugin(pluginId);
    }

    this.plugins.delete(pluginId);
    this.notifyListeners();
    return true;
  }

  // ==================== 查询 ====================

  /**
   * 获取所有插件列表
   */
  public getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取已启用的插件列表
   */
  public getEnabledPlugins(): PluginInstance[] {
    return this.getAllPlugins().filter((p) => p.enabled);
  }

  /**
   * 获取已禁用的插件列表
   */
  public getDisabledPlugins(): PluginInstance[] {
    return this.getAllPlugins().filter((p) => !p.enabled);
  }

  /**
   * 根据 ID 获取插件
   */
  public getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 检查插件是否已注册
   */
  public hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * 检查插件是否已启用
   */
  public isPluginEnabled(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.enabled ?? false;
  }

  // ==================== 批量操作 ====================

  /**
   * 启用所有插件
   */
  public enableAllPlugins(): void {
    for (const [id] of this.plugins) {
      this.enablePlugin(id);
    }
  }

  /**
   * 禁用所有插件
   */
  public disableAllPlugins(): void {
    for (const [id] of this.plugins) {
      this.disablePlugin(id);
    }
  }

  /**
   * 卸载所有插件
   */
  public uninstallAllPlugins(): void {
    for (const [id] of this.plugins) {
      this.uninstallPlugin(id);
    }
  }

  // ==================== 事件监听 ====================

  /**
   * 注册插件列表变更监听器
   * @returns 取消监听函数
   */
  public onPluginsChange(listener: (plugins: PluginInstance[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const plugins = this.getAllPlugins();
    this.listeners.forEach((listener) => listener(plugins));
  }

  // ==================== 文件系统扫描 ====================

  /**
   * 扫描插件目录并加载所有插件
   *
   * 从用户目录 plugins/ 读取插件文件夹，
   * 每个插件文件夹应包含 manifest.json 和入口 JS 文件。
   *
   * 注意：此方法是异步的，实际文件读取需要适配 Electron 的文件系统 API。
   */
  public async scanPluginsDirectory(): Promise<PluginLoadResult[]> {
    const results: PluginLoadResult[] = [];

    try {
      // 在 Electron 环境中使用 electronAPI 读取目录
      if (typeof window !== 'undefined' && window.electronAPI) {
        // TODO: 通过 Electron IPC 读取插件目录
        console.log(`[PluginManager] 扫描插件目录: ${this.pluginsDirectory}`);
        // 这里需要配合主进程实现目录扫描
        // 目前返回空结果，等待主进程接口实现
        return results;
      }

      // 浏览器环境：无法直接访问文件系统
      console.warn('[PluginManager] 浏览器环境不支持直接扫描插件目录');
      return results;
    } catch (error: any) {
      console.error('[PluginManager] 扫描插件目录失败:', error);
      return [{ success: false, error: error.message }];
    }
  }

  /**
   * 从 manifest.json 和代码字符串加载插件（用于测试或程序化加载）
   */
  public loadPluginFromStrings(
    manifestJson: string,
    code: string,
    directory: string = 'plugins/unknown'
  ): PluginLoadResult {
    try {
      const manifest = JSON.parse(manifestJson);
      return this.loadPlugin(manifest, code, directory);
    } catch (error: any) {
      return { success: false, error: `解析 manifest.json 失败: ${error.message}` };
    }
  }
}

// ==================== 导出单例 ====================

/** 全局插件管理器实例 */
export const pluginManager = PluginManager.getInstance();

export default pluginManager;
