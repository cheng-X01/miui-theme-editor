/**
 * 图标统计面板插件
 *
 * 读取当前项目的图标列表，统计图标数量、按密度桶分组统计、计算已替换/未替换比例。
 * 仅使用沙箱提供的上下文变量：log, error, notify, getProject, registerPanel
 */

var _statsPanelId = null;

/**
 * 获取图标密度桶名称
 */
function getDensityBucketName(density) {
  if (density <= 120) return 'ldpi';
  if (density <= 160) return 'mdpi';
  if (density <= 240) return 'hdpi';
  if (density <= 320) return 'xhdpi';
  if (density <= 480) return 'xxhdpi';
  if (density <= 640) return 'xxxhdpi';
  return '自定义';
}

/**
 * 统计图标数据
 */
function analyzeIcons(project) {
  var result = {
    totalIcons: 0,
    replacedCount: 0,
    unreplacedCount: 0,
    densityBuckets: {},
    categories: {}
  };

  if (!project) return result;

  var icons = project.icons;
  if (!icons || !Array.isArray(icons)) {
    // 尝试从 project.icons 对象中获取
    if (project.icons && typeof project.icons === 'object' && !Array.isArray(project.icons)) {
      var iconKeys = Object.keys(project.icons);
      icons = [];
      for (var i = 0; i < iconKeys.length; i++) {
        icons.push({
          name: iconKeys[i],
          data: project.icons[iconKeys[i]]
        });
      }
    } else {
      return result;
    }
  }

  result.totalIcons = icons.length;

  for (var i = 0; i < icons.length; i++) {
    var icon = icons[i];
    var isReplaced = false;
    var density = 0;
    var category = '未分类';

    // 判断是否已替换
    if (typeof icon === 'object') {
      if (icon.replaced === true || icon.customized === true || icon.modified === true) {
        isReplaced = true;
      }
      if (icon.density !== undefined) {
        density = icon.density;
      }
      if (icon.category !== undefined) {
        category = icon.category;
      }
      // 如果图标有自定义数据，视为已替换
      if (icon.data || icon.path || icon.source === 'custom') {
        isReplaced = true;
      }
    }

    if (isReplaced) {
      result.replacedCount++;
    } else {
      result.unreplacedCount++;
    }

    // 按密度桶分组
    var bucketName = getDensityBucketName(density);
    if (!result.densityBuckets[bucketName]) {
      result.densityBuckets[bucketName] = { total: 0, replaced: 0, unreplaced: 0 };
    }
    result.densityBuckets[bucketName].total++;
    if (isReplaced) {
      result.densityBuckets[bucketName].replaced++;
    } else {
      result.densityBuckets[bucketName].unreplaced++;
    }

    // 按类别分组
    if (!result.categories[category]) {
      result.categories[category] = { total: 0, replaced: 0, unreplaced: 0 };
    }
    result.categories[category].total++;
    if (isReplaced) {
      result.categories[category].replaced++;
    } else {
      result.categories[category].unreplaced++;
    }
  }

  return result;
}

module.exports = {
  activate: function () {
    log('[图标统计面板] 插件已激活');

    var project = getProject();
    var stats = analyzeIcons(project);

    log('[图标统计面板] 图标统计结果：');
    log('  图标总数: ' + stats.totalIcons);
    log('  已替换: ' + stats.replacedCount + ' (' + (stats.totalIcons > 0 ? Math.round(stats.replacedCount / stats.totalIcons * 100) : 0) + '%)');
    log('  未替换: ' + stats.unreplacedCount + ' (' + (stats.totalIcons > 0 ? Math.round(stats.unreplacedCount / stats.totalIcons * 100) : 0) + '%)');

    // 输出密度桶统计
    var bucketKeys = Object.keys(stats.densityBuckets);
    if (bucketKeys.length > 0) {
      log('[图标统计面板] 按密度桶分组：');
      for (var i = 0; i < bucketKeys.length; i++) {
        var bucket = stats.densityBuckets[bucketKeys[i]];
        log('  ' + bucketKeys[i] + ': 总计 ' + bucket.total + ' 个（已替换 ' + bucket.replaced + '，未替换 ' + bucket.unreplaced + '）');
      }
    }

    // 输出类别统计
    var catKeys = Object.keys(stats.categories);
    if (catKeys.length > 0) {
      log('[图标统计面板] 按类别分组：');
      for (var j = 0; j < catKeys.length; j++) {
        var cat = stats.categories[catKeys[j]];
        log('  ' + catKeys[j] + ': 总计 ' + cat.total + ' 个（已替换 ' + cat.replaced + '，未替换 ' + cat.unreplaced + '）');
      }
    }

    if (stats.totalIcons === 0) {
      notify('当前项目没有找到图标数据', 'warning');
    }

    // 注册 UI 面板
    _statsPanelId = 'icon-stats-panel';
    registerPanel({
      id: _statsPanelId,
      title: '图标统计',
      render: function () {
        return {
          type: 'icon-stats-panel',
          stats: stats
        };
      }
    });

    log('[图标统计面板] UI 面板已注册');
    notify('图标统计完成，共 ' + stats.totalIcons + ' 个图标', 'success');
  },

  deactivate: function () {
    log('[图标统计面板] 插件已停用');
    _statsPanelId = null;
  }
};
