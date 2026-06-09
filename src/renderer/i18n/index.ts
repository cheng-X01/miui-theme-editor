/**
 * MIUI Theme Editor - 国际化 (i18n) 系统
 *
 * 提供简单的中英文双语支持，包含菜单、按钮、提示、编辑器名称等常用翻译。
 * 导出 useTranslation Hook 和 setLocale 函数。
 */

import { useCallback, useState } from 'react';

// ==================== 类型定义 ====================

/** 支持的语言 */
export type Locale = 'zh-CN' | 'en-US';

/** 翻译字典类型 */
type TranslationMap = Record<string, string>;

/** 完整翻译表 */
type Translations = Record<Locale, TranslationMap>;

// ==================== 翻译字典 ====================

const translations: Translations = {
  'zh-CN': {
    // 应用通用
    'app.title': 'MIUI 主题编辑器',
    'app.name': 'MIUI Theme Editor',
    'app.version': '版本',

    // 菜单
    'menu.file': '文件',
    'menu.edit': '编辑',
    'menu.view': '视图',
    'menu.help': '帮助',
    'menu.settings': '设置',

    // 通用按钮
    'btn.save': '保存',
    'btn.cancel': '取消',
    'btn.confirm': '确认',
    'btn.delete': '删除',
    'btn.export': '导出',
    'btn.import': '导入',
    'btn.close': '关闭',
    'btn.back': '返回',
    'btn.ok': '确定',
    'btn.apply': '应用',
    'btn.reset': '重置',
    'btn.search': '搜索',
    'btn.add': '添加',
    'btn.replace': '替换',
    'btn.remove': '移除',
    'btn.upload': '上传',
    'btn.download': '下载',

    // 编辑器模块
    'editor.overview': '概览',
    'editor.icons': '图标',
    'editor.wallpaper': '壁纸',
    'editor.colors': '配色',
    'editor.fonts': '字体',
    'editor.sounds': '音效',
    'editor.maml': 'MAML',
    'editor.preview': '预览',

    // 工具栏
    'toolbar.save': '保存主题',
    'toolbar.export': '导出 MTZ 文件',
    'toolbar.preview': '预览主题',
    'toolbar.pushPhone': '推送到手机',
    'toolbar.aiAssistant': 'AI 助手',
    'toolbar.undo': '撤销',
    'toolbar.redo': '重做',
    'toolbar.settings': '设置',

    // 提示信息
    'msg.saveSuccess': '主题保存成功！',
    'msg.saveFailed': '保存失败',
    'msg.exportSuccess': '导出成功！',
    'msg.exportFailed': '导出失败',
    'msg.packFailed': '打包失败',
    'msg.noUndo': '没有可撤销的操作',
    'msg.noRedo': '没有可重做的操作',
    'msg.undoSuccess': '撤销',
    'msg.redoSuccess': '重做',
    'msg.unsavedChanges': '未保存的修改',
    'msg.unsavedWarning': '当前主题有未保存的修改，关闭后将丢失这些更改。',
    'msg.discardAndClose': '不保存并关闭',
    'msg.noDevice': '未检测到已连接的手机设备',
    'msg.previewDeveloping': '手机预览功能开发中...',
    'msg.deleteElement': '删除选中元素',
    'msg.selectAll': '全选',
    'msg.duplicate': '复制',

    // 设置页面
    'settings.title': '设置',
    'settings.language': '语言',
    'settings.theme': '主题',
    'settings.dark': '深色',
    'settings.light': '浅色',
    'settings.autoSave': '自动保存',
    'settings.autoSaveInterval': '自动保存间隔（秒）',
    'settings.defaultExportPath': '默认 MTZ 导出路径',
    'settings.shortcuts': '快捷键',
    'settings.showShortcutHints': '显示快捷键提示',
    'settings.general': '通用',
    'settings.appearance': '外观',
    'settings.shortcutList': '快捷键列表',

    // 快捷键
    'shortcut.undo': '撤销',
    'shortcut.redo': '重做',
    'shortcut.save': '保存',
    'shortcut.export': '导出 MTZ',
    'shortcut.delete': '删除选中元素',
    'shortcut.selectAll': '全选',
    'shortcut.duplicate': '复制',
    'shortcut.cancel': '取消/关闭',
    'shortcut.openHelp': '打开快捷键帮助',

    // 属性面板
    'properties.title': '属性',
    'properties.themeInfo': '主题信息',
    'properties.themeName': '主题名称',
    'properties.author': '作者',
    'properties.version': '版本',
    'properties.description': '描述',
    'properties.category': '分类',
    'properties.designResolution': '设计分辨率',
    'properties.darkMode': '暗色模式',
    'properties.supported': '支持',
    'properties.notSupported': '不支持',
    'properties.minMIUIVersion': '最低 MIUI 版本',
    'properties.tags': '标签',
    'properties.noTags': '无标签',
    'properties.noDescription': '暂无描述',

    // 状态栏
    'status.fileCount': '文件数',
    'status.resourceSize': '资源大小',
    'status.miuiVersion': 'MIUI 版本',
    'status.lastSaved': '上次保存',
    'status.notSaved': '未保存',

    // 资源统计
    'stats.resourceStats': '资源统计',
    'stats.iconCount': '图标',
    'stats.wallpaperCount': '壁纸',
    'stats.fontCount': '字体',
    'stats.soundCount': '声音',
    'stats.lockscreenCount': '锁屏',
    'stats.mamlCount': 'MAML',

    // 欢迎页
    'welcome.create': '新建主题',
    'welcome.open': '打开主题',
    'welcome.recent': '最近项目',
    'welcome.template': '模板中心',
    'welcome.noRecent': '暂无最近项目',

    // 更新
    'update.checking': '正在检查更新...',
    'update.available': '发现新版本',
    'update.downloading': '正在下载更新...',
    'update.downloaded': '更新已下载，重启应用以安装',
    'update.progress': '下载进度',
    'update.restart': '重启并安装',
    'update.notAvailable': '当前已是最新版本',
    'update.error': '检查更新失败',
  },
  'en-US': {
    // App
    'app.title': 'MIUI Theme Editor',
    'app.name': 'MIUI Theme Editor',
    'app.version': 'Version',

    // Menu
    'menu.file': 'File',
    'menu.edit': 'Edit',
    'menu.view': 'View',
    'menu.help': 'Help',
    'menu.settings': 'Settings',

    // Buttons
    'btn.save': 'Save',
    'btn.cancel': 'Cancel',
    'btn.confirm': 'Confirm',
    'btn.delete': 'Delete',
    'btn.export': 'Export',
    'btn.import': 'Import',
    'btn.close': 'Close',
    'btn.back': 'Back',
    'btn.ok': 'OK',
    'btn.apply': 'Apply',
    'btn.reset': 'Reset',
    'btn.search': 'Search',
    'btn.add': 'Add',
    'btn.replace': 'Replace',
    'btn.remove': 'Remove',
    'btn.upload': 'Upload',
    'btn.download': 'Download',

    // Editor modules
    'editor.overview': 'Overview',
    'editor.icons': 'Icons',
    'editor.wallpaper': 'Wallpaper',
    'editor.colors': 'Colors',
    'editor.fonts': 'Fonts',
    'editor.sounds': 'Sounds',
    'editor.maml': 'MAML',
    'editor.preview': 'Preview',

    // Toolbar
    'toolbar.save': 'Save Theme',
    'toolbar.export': 'Export MTZ',
    'toolbar.preview': 'Preview Theme',
    'toolbar.pushPhone': 'Push to Phone',
    'toolbar.aiAssistant': 'AI Assistant',
    'toolbar.undo': 'Undo',
    'toolbar.redo': 'Redo',
    'toolbar.settings': 'Settings',

    // Messages
    'msg.saveSuccess': 'Theme saved successfully!',
    'msg.saveFailed': 'Save failed',
    'msg.exportSuccess': 'Export successful!',
    'msg.exportFailed': 'Export failed',
    'msg.packFailed': 'Pack failed',
    'msg.noUndo': 'Nothing to undo',
    'msg.noRedo': 'Nothing to redo',
    'msg.undoSuccess': 'Undo',
    'msg.redoSuccess': 'Redo',
    'msg.unsavedChanges': 'Unsaved Changes',
    'msg.unsavedWarning': 'The current theme has unsaved changes. Closing will lose these changes.',
    'msg.discardAndClose': 'Discard and Close',
    'msg.noDevice': 'No connected phone detected',
    'msg.previewDeveloping': 'Phone preview is under development...',
    'msg.deleteElement': 'Delete selected element',
    'msg.selectAll': 'Select All',
    'msg.duplicate': 'Duplicate',

    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.dark': 'Dark',
    'settings.light': 'Light',
    'settings.autoSave': 'Auto Save',
    'settings.autoSaveInterval': 'Auto Save Interval (seconds)',
    'settings.defaultExportPath': 'Default MTZ Export Path',
    'settings.shortcuts': 'Shortcuts',
    'settings.showShortcutHints': 'Show Shortcut Hints',
    'settings.general': 'General',
    'settings.appearance': 'Appearance',
    'settings.shortcutList': 'Shortcut List',

    // Shortcuts
    'shortcut.undo': 'Undo',
    'shortcut.redo': 'Redo',
    'shortcut.save': 'Save',
    'shortcut.export': 'Export MTZ',
    'shortcut.delete': 'Delete Selected',
    'shortcut.selectAll': 'Select All',
    'shortcut.duplicate': 'Duplicate',
    'shortcut.cancel': 'Cancel/Close',
    'shortcut.openHelp': 'Open Shortcut Help',

    // Properties
    'properties.title': 'Properties',
    'properties.themeInfo': 'Theme Info',
    'properties.themeName': 'Theme Name',
    'properties.author': 'Author',
    'properties.version': 'Version',
    'properties.description': 'Description',
    'properties.category': 'Category',
    'properties.designResolution': 'Design Resolution',
    'properties.darkMode': 'Dark Mode',
    'properties.supported': 'Supported',
    'properties.notSupported': 'Not Supported',
    'properties.minMIUIVersion': 'Min MIUI Version',
    'properties.tags': 'Tags',
    'properties.noTags': 'No tags',
    'properties.noDescription': 'No description',

    // Status bar
    'status.fileCount': 'Files',
    'status.resourceSize': 'Resource Size',
    'status.miuiVersion': 'MIUI Version',
    'status.lastSaved': 'Last Saved',
    'status.notSaved': 'Not Saved',

    // Resource stats
    'stats.resourceStats': 'Resource Statistics',
    'stats.iconCount': 'Icons',
    'stats.wallpaperCount': 'Wallpapers',
    'stats.fontCount': 'Fonts',
    'stats.soundCount': 'Sounds',
    'stats.lockscreenCount': 'Lockscreens',
    'stats.mamlCount': 'MAML',

    // Welcome
    'welcome.create': 'New Theme',
    'welcome.open': 'Open Theme',
    'welcome.recent': 'Recent Projects',
    'welcome.template': 'Template Center',
    'welcome.noRecent': 'No recent projects',

    // Updates
    'update.checking': 'Checking for updates...',
    'update.available': 'New version available',
    'update.downloading': 'Downloading update...',
    'update.downloaded': 'Update downloaded, restart to install',
    'update.progress': 'Download Progress',
    'update.restart': 'Restart and Install',
    'update.notAvailable': 'You are on the latest version',
    'update.error': 'Update check failed',
  },
};

// ==================== 全局状态 ====================

/** 当前语言 */
let currentLocale: Locale = 'zh-CN';

/** 语言变更监听器 */
type LocaleChangeListener = (locale: Locale) => void;
const listeners: LocaleChangeListener[] = [];

// ==================== 公共 API ====================

/**
 * 获取当前语言
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * 设置当前语言
 * 会通知所有监听器
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
  // 通知所有监听器
  listeners.forEach((listener) => listener(locale));
}

/**
 * 翻译函数
 * @param key 翻译键
 * @param locale 指定语言（可选，默认使用当前语言）
 * @returns 翻译后的文本，找不到则返回 key
 */
export function t(key: string, locale?: Locale): string {
  const loc = locale || currentLocale;
  return translations[loc]?.[key] || key;
}

/**
 * 注册语言变更监听器
 * @returns 取消监听函数
 */
export function onLocaleChange(listener: LocaleChangeListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
}

// ==================== React Hook ====================

/**
 * useTranslation Hook
 *
 * 在组件中使用翻译功能，语言变更时自动触发重新渲染。
 *
 * @example
 * ```tsx
 * const { t, locale, setLocale } = useTranslation();
 * return <span>{t('btn.save')}</span>;
 * ```
 */
export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(currentLocale);

  const handleLocaleChange = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  // 注册/注销监听器
  useState(() => {
    const unsubscribe = onLocaleChange(handleLocaleChange);
    return unsubscribe;
  });

  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
  }, []);

  return {
    /** 翻译函数 */
    t: useCallback((key: string) => t(key, locale), [locale]),
    /** 当前语言 */
    locale,
    /** 设置语言 */
    setLocale: changeLocale,
  };
}

export default translations;
