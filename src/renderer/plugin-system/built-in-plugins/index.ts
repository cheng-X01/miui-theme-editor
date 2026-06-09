/**
 * MIUI Theme Editor - 内置插件注册器
 *
 * 负责加载并注册所有内置插件。
 * 内置插件的 manifest.json 和 index.js 以字符串形式内嵌，
 * 通过 PluginManager.loadPluginFromStrings() 注册到插件管理器。
 */

import { PluginManager } from './PluginManager';

// ==================== 内置插件清单 ====================

import colorHarmonyManifest from './built-in-plugins/color-harmony/manifest.json';
import colorHarmonyCode from './built-in-plugins/color-harmony/index.js?raw';

import iconStatsManifest from './built-in-plugins/icon-stats/manifest.json';
import iconStatsCode from './built-in-plugins/icon-stats/index.js?raw';

import wallpaperCheckerManifest from './built-in-plugins/wallpaper-checker/manifest.json';
import wallpaperCheckerCode from './built-in-plugins/wallpaper-checker/index.js?raw';

import themeInfoExporterManifest from './built-in-plugins/theme-info-exporter/manifest.json';
import themeInfoExporterCode from './built-in-plugins/theme-info-exporter/index.js?raw';

import quickActionsManifest from './built-in-plugins/quick-actions/manifest.json';
import quickActionsCode from './built-in-plugins/quick-actions/index.js?raw';

// ==================== 内置插件定义 ====================

/** 内置插件列表（清单 + 代码 + 目录标识） */
const builtinPlugins = [
  {
    manifest: colorHarmonyManifest,
    code: colorHarmonyCode as string,
    directory: 'built-in-plugins/color-harmony',
  },
  {
    manifest: iconStatsManifest,
    code: iconStatsCode as string,
    directory: 'built-in-plugins/icon-stats',
  },
  {
    manifest: wallpaperCheckerManifest,
    code: wallpaperCheckerCode as string,
    directory: 'built-in-plugins/wallpaper-checker',
  },
  {
    manifest: themeInfoExporterManifest,
    code: themeInfoExporterCode as string,
    directory: 'built-in-plugins/theme-info-exporter',
  },
  {
    manifest: quickActionsManifest,
    code: quickActionsCode as string,
    directory: 'built-in-plugins/quick-actions',
  },
];

// ==================== 注册函数 ====================

/**
 * 注册所有内置插件
 *
 * 遍历内置插件列表，通过 PluginManager.loadPluginFromStrings()
 * 将每个插件的 manifest.json 和 index.js 加载到插件管理器中。
 *
 * @returns 加载结果数组
 */
export function registerBuiltinPlugins(): void {
  const manager = PluginManager.getInstance();

  for (const plugin of builtinPlugins) {
    const manifestJson = JSON.stringify(plugin.manifest);
    const result = manager.loadPluginFromStrings(manifestJson, plugin.code, plugin.directory);

    if (result.success) {
      console.log(`[内置插件] "${plugin.manifest.name}" 注册成功 (v${plugin.manifest.version})`);
    } else {
      console.error(`[内置插件] "${plugin.manifest.name}" 注册失败: ${result.error}`);
    }
  }

  console.log(`[内置插件] 注册完成，共 ${builtinPlugins.length} 个内置插件`);
}

export default registerBuiltinPlugins;
