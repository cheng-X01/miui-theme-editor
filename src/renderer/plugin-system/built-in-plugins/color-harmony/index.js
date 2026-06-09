/**
 * 颜色和谐调色板生成器插件
 *
 * 读取当前项目的颜色配置，生成互补色、类似色、三色组、四色组等和谐配色方案。
 * 仅使用沙箱提供的上下文变量：log, error, notify, getProject, registerPanel
 */

var _harmonyPanelId = null;

/**
 * 将 HEX 颜色转换为 HSL
 */
function hexToHsl(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  var r = parseInt(hex.substring(0, 2), 16) / 255;
  var g = parseInt(hex.substring(2, 4), 16) / 255;
  var b = parseInt(hex.substring(4, 6), 16) / 255;

  var max = Math.max(r, g, b);
  var min = Math.min(r, g, b);
  var h = 0;
  var s = 0;
  var l = (max + min) / 2;

  if (max !== min) {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * 将 HSL 转换为 HEX 颜色
 */
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  var c = (1 - Math.abs(2 * l - 1)) * s;
  var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  var m = l - c / 2;
  var r = 0;
  var g = 0;
  var b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * 生成互补色（色相环上相隔 180 度）
 */
function getComplementary(hsl) {
  return hslToHex(hsl.h + 180, hsl.s, hsl.l);
}

/**
 * 生成类似色（色相环上相邻 ±30 度）
 */
function getAnalogous(hsl) {
  return [
    hslToHex(hsl.h - 30, hsl.s, hsl.l),
    hslToHex(hsl.h + 30, hsl.s, hsl.l)
  ];
}

/**
 * 生成三色组（色相环上等距 120 度）
 */
function getTriadic(hsl) {
  return [
    hslToHex(hsl.h + 120, hsl.s, hsl.l),
    hslToHex(hsl.h + 240, hsl.s, hsl.l)
  ];
}

/**
 * 生成四色组（色相环上等距 90 度）
 */
function getTetradic(hsl) {
  return [
    hslToHex(hsl.h + 90, hsl.s, hsl.l),
    hslToHex(hsl.h + 180, hsl.s, hsl.l),
    hslToHex(hsl.h + 270, hsl.s, hsl.l)
  ];
}

/**
 * 生成分裂互补色（色相环上 150 度和 210 度）
 */
function getSplitComplementary(hsl) {
  return [
    hslToHex(hsl.h + 150, hsl.s, hsl.l),
    hslToHex(hsl.h + 210, hsl.s, hsl.l)
  ];
}

/**
 * 生成和谐配色方案
 */
function generateHarmonySchemes(hexColor) {
  var hsl = hexToHsl(hexColor);
  return {
    original: hexColor,
    complementary: getComplementary(hsl),
    analogous: getAnalogous(hsl),
    triadic: getTriadic(hsl),
    tetradic: getTetradic(hsl),
    splitComplementary: getSplitComplementary(hsl)
  };
}

/**
 * 从项目数据中提取颜色列表
 */
function extractColorsFromProject(project) {
  var colors = [];
  if (!project) return colors;

  if (project.colors && typeof project.colors === 'object') {
    var keys = Object.keys(project.colors);
    for (var i = 0; i < keys.length; i++) {
      var val = project.colors[keys[i]];
      if (typeof val === 'string' && val.charAt(0) === '#') {
        colors.push({ name: keys[i], hex: val });
      }
    }
  }

  return colors;
}

module.exports = {
  activate: function () {
    log('[颜色和谐调色板] 插件已激活');

    var project = getProject();
    var colors = extractColorsFromProject(project);

    if (colors.length === 0) {
      log('[颜色和谐调色板] 当前项目没有找到颜色配置');
      notify('当前项目没有找到颜色配置', 'warning');
      return;
    }

    log('[颜色和谐调色板] 找到 ' + colors.length + ' 个颜色，正在生成和谐配色方案...');

    // 为每个颜色生成和谐配色方案
    var allSchemes = [];
    for (var i = 0; i < colors.length; i++) {
      var color = colors[i];
      var schemes = generateHarmonySchemes(color.hex);
      allSchemes.push({
        colorName: color.name,
        original: color.hex,
        schemes: schemes
      });

      log('[颜色和谐调色板] 颜色 "' + color.name + '" (' + color.hex + ') 的和谐配色方案：');
      log('  互补色: ' + schemes.complementary);
      log('  类似色: ' + schemes.analogous.join(', '));
      log('  三色组: ' + schemes.triadic.join(', '));
      log('  四色组: ' + schemes.tetradic.join(', '));
      log('  分裂互补色: ' + schemes.splitComplementary.join(', '));
    }

    // 注册 UI 面板
    _harmonyPanelId = 'color-harmony-panel';
    registerPanel({
      id: _harmonyPanelId,
      title: '颜色和谐调色板',
      render: function () {
        return {
          type: 'color-harmony-panel',
          colors: colors,
          schemes: allSchemes
        };
      }
    });

    log('[颜色和谐调色板] UI 面板已注册');
    notify('颜色和谐调色板已生成，共分析 ' + colors.length + ' 个颜色', 'success');
  },

  deactivate: function () {
    log('[颜色和谐调色板] 插件已停用');
    _harmonyPanelId = null;
  }
};
