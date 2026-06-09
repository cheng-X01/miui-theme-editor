/**
 * 快捷操作工具栏插件
 *
 * 注册几个工具栏快捷按钮（全选图标、重置颜色、清空壁纸等），按钮点击时通过 notify 发送通知。
 * 仅使用沙箱提供的上下文变量：log, error, notify, registerToolbarButton
 */

/** 已注册的按钮 ID 列表 */
var _registeredButtons = [];

module.exports = {
  activate: function () {
    log('[快捷操作工具栏] 插件已激活');

    // 注册"全选图标"按钮
    registerToolbarButton({
      id: 'quick-action-select-all-icons',
      icon: 'check-square',
      tooltip: '全选图标',
      onClick: function () {
        log('[快捷操作工具栏] 执行操作: 全选图标');
        notify('已执行"全选图标"操作', 'info');
      }
    });
    _registeredButtons.push('quick-action-select-all-icons');

    // 注册"重置颜色"按钮
    registerToolbarButton({
      id: 'quick-action-reset-colors',
      icon: 'palette',
      tooltip: '重置颜色',
      onClick: function () {
        log('[快捷操作工具栏] 执行操作: 重置颜色');
        notify('已执行"重置颜色"操作，所有颜色已恢复为默认值', 'success');
      }
    });
    _registeredButtons.push('quick-action-reset-colors');

    // 注册"清空壁纸"按钮
    registerToolbarButton({
      id: 'quick-action-clear-wallpapers',
      icon: 'image',
      tooltip: '清空壁纸',
      onClick: function () {
        log('[快捷操作工具栏] 执行操作: 清空壁纸');
        notify('已执行"清空壁纸"操作', 'warning');
      }
    });
    _registeredButtons.push('quick-action-clear-wallpapers');

    // 注册"预览主题"按钮
    registerToolbarButton({
      id: 'quick-action-preview-theme',
      icon: 'eye',
      tooltip: '预览主题',
      onClick: function () {
        log('[快捷操作工具栏] 执行操作: 预览主题');
        notify('正在生成主题预览...', 'info');
      }
    });
    _registeredButtons.push('quick-action-preview-theme');

    // 注册"导出主题"按钮
    registerToolbarButton({
      id: 'quick-action-export-theme',
      icon: 'download',
      tooltip: '导出主题',
      onClick: function () {
        log('[快捷操作工具栏] 执行操作: 导出主题');
        notify('主题正在导出中，请稍候...', 'info');
      }
    });
    _registeredButtons.push('quick-action-export-theme');

    log('[快捷操作工具栏] 已注册 ' + _registeredButtons.length + ' 个快捷操作按钮');
    notify('快捷操作工具栏已加载，共 ' + _registeredButtons.length + ' 个快捷按钮', 'success');
  },

  deactivate: function () {
    log('[快捷操作工具栏] 插件已停用，已注销 ' + _registeredButtons.length + ' 个按钮');
    _registeredButtons = [];
  }
};
