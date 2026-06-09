/**
 * 主题信息导出器插件
 *
 * 读取当前项目信息，生成 JSON 格式的主题摘要（名称、版本、作者、资源统计等）。
 * 仅使用沙箱提供的上下文变量：log, error, notify, getProject
 */

/**
 * 统计数组或对象的数量
 */
function countItems(data) {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data === 'object') return Object.keys(data).length;
  return 0;
}

/**
 * 生成主题摘要
 */
function generateThemeSummary(project) {
  if (!project) {
    return null;
  }

  var summary = {
    name: project.name || '未命名主题',
    version: project.version || '未知版本',
    author: project.author || '未知作者',
    description: project.description || '',
    resources: {}
  };

  // 统计各类资源数量
  summary.resources.colors = countItems(project.colors);
  summary.resources.icons = countItems(project.icons);
  summary.resources.wallpapers = countItems(project.wallpapers || project.wallpaper);
  summary.resources.fonts = countItems(project.fonts);
  summary.resources.sounds = countItems(project.sounds);
  summary.resources.ringtones = countItems(project.ringtones);
  summary.resources.notificationSounds = countItems(project.notificationSounds);
  summary.resources.bootAnimations = countItems(project.bootAnimations);
  summary.resources.thirdPartyThemes = countItems(project.thirdPartyThemes);

  // 计算总资源数
  var total = 0;
  var resourceKeys = Object.keys(summary.resources);
  for (var i = 0; i < resourceKeys.length; i++) {
    total += summary.resources[resourceKeys[i]];
  }
  summary.resources.total = total;

  // 附加元信息
  if (project.style) {
    summary.style = project.style;
  }
  if (project.targetApi) {
    summary.targetApi = project.targetApi;
  }
  if (project.designWidth) {
    summary.designWidth = project.designWidth;
  }

  return summary;
}

module.exports = {
  activate: function () {
    log('[主题信息导出器] 插件已激活');

    var project = getProject();

    if (!project) {
      log('[主题信息导出器] 当前没有打开的项目');
      notify('当前没有打开的项目', 'warning');
      return;
    }

    var summary = generateThemeSummary(project);
    var jsonStr = JSON.stringify(summary, null, 2);

    log('[主题信息导出器] 主题摘要信息：');
    log(jsonStr);

    log('[主题信息导出器] 摘要统计：');
    log('  主题名称: ' + summary.name);
    log('  版本: ' + summary.version);
    log('  作者: ' + summary.author);
    log('  资源总数: ' + summary.resources.total);

    var resourceKeys = Object.keys(summary.resources);
    for (var i = 0; i < resourceKeys.length; i++) {
      var key = resourceKeys[i];
      if (key !== 'total' && summary.resources[key] > 0) {
        log('  ' + key + ': ' + summary.resources[key]);
      }
    }

    notify('主题摘要已生成: ' + summary.name + ' v' + summary.version, 'success');
  },

  deactivate: function () {
    log('[主题信息导出器] 插件已停用');
  }
};
