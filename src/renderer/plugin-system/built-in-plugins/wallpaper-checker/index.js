/**
 * 壁纸尺寸检查器插件
 *
 * 检查壁纸尺寸是否符合 MIUI 规范（推荐 1080x1920 或更高），输出检查结果。
 * 仅使用沙箱提供的上下文变量：log, error, notify, getProject
 */

/** MIUI 推荐壁纸尺寸 */
var RECOMMENDED_WIDTH = 1080;
var RECOMMENDED_HEIGHT = 1920;

/** MIUI 最低可接受壁纸尺寸 */
var MIN_WIDTH = 720;
var MIN_HEIGHT = 1280;

/**
 * 检查单个壁纸尺寸
 */
function checkWallpaperSize(wallpaper) {
  var result = {
    name: wallpaper.name || '未知壁纸',
    width: wallpaper.width || 0,
    height: wallpaper.height || 0,
    passed: false,
    level: 'unknown',
    issues: []
  };

  if (!wallpaper.width || !wallpaper.height) {
    result.issues.push('无法获取壁纸尺寸信息');
    result.level = 'error';
    return result;
  }

  // 检查是否达到推荐尺寸
  if (wallpaper.width >= RECOMMENDED_WIDTH && wallpaper.height >= RECOMMENDED_HEIGHT) {
    result.passed = true;
    result.level = 'excellent';
    result.issues.push('符合 MIUI 推荐尺寸（' + RECOMMENDED_WIDTH + 'x' + RECOMMENDED_HEIGHT + ' 或更高）');
  } else if (wallpaper.width >= MIN_WIDTH && wallpaper.height >= MIN_HEIGHT) {
    result.passed = true;
    result.level = 'acceptable';
    result.issues.push('尺寸低于推荐值但可接受（推荐 ' + RECOMMENDED_WIDTH + 'x' + RECOMMENDED_HEIGHT + '）');
  } else {
    result.passed = false;
    result.level = 'error';
    result.issues.push('尺寸过小，不符合 MIUI 规范（最低 ' + MIN_WIDTH + 'x' + MIN_HEIGHT + '）');
  }

  // 检查宽高比是否合理（手机壁纸通常为 9:16 或 9:19.5）
  var ratio = wallpaper.width / wallpaper.height;
  if (ratio > 0.7 && ratio < 0.65) {
    result.issues.push('宽高比 ' + ratio.toFixed(2) + ' 偏离常见手机壁纸比例');
  }

  return result;
}

/**
 * 获取壁纸列表
 */
function getWallpapers(project) {
  if (!project) return [];

  if (Array.isArray(project.wallpapers)) {
    return project.wallpapers;
  }

  if (project.wallpaper && typeof project.wallpaper === 'object') {
    return [project.wallpaper];
  }

  return [];
}

module.exports = {
  activate: function () {
    log('[壁纸尺寸检查器] 插件已激活');

    var project = getProject();
    var wallpapers = getWallpapers(project);

    if (wallpapers.length === 0) {
      log('[壁纸尺寸检查器] 当前项目没有找到壁纸');
      notify('当前项目没有找到壁纸', 'warning');
      return;
    }

    log('[壁纸尺寸检查器] 开始检查 ' + wallpapers.length + ' 张壁纸...');
    log('[壁纸尺寸检查器] MIUI 推荐尺寸: ' + RECOMMENDED_WIDTH + 'x' + RECOMMENDED_HEIGHT + '，最低可接受尺寸: ' + MIN_WIDTH + 'x' + MIN_HEIGHT);

    var passedCount = 0;
    var failedCount = 0;

    for (var i = 0; i < wallpapers.length; i++) {
      var result = checkWallpaperSize(wallpapers[i]);
      var status = result.passed ? '通过' : '未通过';
      log('[壁纸尺寸检查器] "' + result.name + '": ' + result.width + 'x' + result.height + ' — ' + status + ' (' + result.level + ')');
      for (var j = 0; j < result.issues.length; j++) {
        log('  - ' + result.issues[j]);
      }

      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;
      }
    }

    log('[壁纸尺寸检查器] 检查完成：' + passedCount + ' 张通过，' + failedCount + ' 张未通过');

    if (failedCount > 0) {
      notify('有 ' + failedCount + ' 张壁纸尺寸不符合 MIUI 规范，请检查', 'warning');
    } else {
      notify('所有壁纸尺寸检查通过', 'success');
    }
  },

  deactivate: function () {
    log('[壁纸尺寸检查器] 插件已停用');
  }
};
