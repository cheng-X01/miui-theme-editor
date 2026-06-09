/**
 * 主题配套海报制作器插件
 * 
 * 功能：
 * 1. 读取当前主题的颜色、图标、壁纸信息
 * 2. 自动生成多种风格的宣传海报（竖版/横版/方形）
 * 3. 支持自定义标题、副标题、作者信息
 * 4. 导出为 PNG 图片
 */

// ==================== 颜色工具函数 ====================

/**
 * HEX 转 RGB
 */
function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * RGB 转 HEX
 */
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * 计算互补色
 */
function getComplementaryColor(hex) {
  var rgb = hexToRgb(hex);
  return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
}

/**
 * 调整颜色亮度
 */
function adjustBrightness(hex, percent) {
  var rgb = hexToRgb(hex);
  var r = Math.min(255, Math.max(0, Math.round(rgb.r * (1 + percent / 100))));
  var g = Math.min(255, Math.max(0, Math.round(rgb.g * (1 + percent / 100))));
  var b = Math.min(255, Math.max(0, Math.round(rgb.b * (1 + percent / 100))));
  return rgbToHex(r, g, b);
}

/**
 * 判断颜色深浅（用于选择文字颜色）
 */
function isLightColor(hex) {
  var rgb = hexToRgb(hex);
  var brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128;
}

/**
 * 获取文字颜色（根据背景色自动选择黑/白）
 */
function getTextColor(bgColor) {
  return isLightColor(bgColor) ? '#1a1a2e' : '#ffffff';
}

// ==================== 海报模板 ====================

/**
 * 海报模板配置
 */
var posterTemplates = {
  // 竖版海报 - 渐变背景 + 主题色点缀
  portrait: {
    name: '竖版海报',
    width: 1080,
    height: 1920,
    background: 'gradient',
    layout: 'center'
  },
  // 横版海报 - 左侧色块 + 右侧预览
  landscape: {
    name: '横版海报',
    width: 1920,
    height: 1080,
    background: 'split',
    layout: 'left-right'
  },
  // 方形海报 - 居中圆形色板
  square: {
    name: '方形海报',
    width: 1080,
    height: 1080,
    background: 'solid',
    layout: 'circle'
  },
  // 极简海报 - 大面积主题色 + 简洁文字
  minimal: {
    name: '极简海报',
    width: 1080,
    height: 1920,
    background: 'solid',
    layout: 'minimal'
  }
};

// ==================== 海报生成器 ====================

/**
 * 生成海报 Canvas
 */
function generatePoster(template, themeData, options) {
  var canvas = document.createElement('canvas');
  canvas.width = template.width;
  canvas.height = template.height;
  var ctx = canvas.getContext('2d');

  var primaryColor = themeData.colors[0] || '#ff6b6b';
  var secondaryColor = themeData.colors[1] || adjustBrightness(primaryColor, -20);
  var accentColor = themeData.colors[2] || getComplementaryColor(primaryColor);

  // 绘制背景
  if (template.background === 'gradient') {
    var gradient = ctx.createLinearGradient(0, 0, 0, template.height);
    gradient.addColorStop(0, primaryColor);
    gradient.addColorStop(1, adjustBrightness(primaryColor, -30));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, template.width, template.height);
  } else if (template.background === 'split') {
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, template.width * 0.4, template.height);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(template.width * 0.4, 0, template.width * 0.6, template.height);
  } else {
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, template.width, template.height);
  }

  // 绘制装饰元素
  drawDecorations(ctx, template, primaryColor, accentColor);

  // 绘制文字
  drawText(ctx, template, themeData, options);

  // 绘制颜色预览
  drawColorPreview(ctx, template, themeData.colors);

  // 绘制图标预览
  if (themeData.icons && themeData.icons.length > 0) {
    drawIconPreview(ctx, template, themeData.icons);
  }

  return canvas;
}

/**
 * 绘制装饰元素
 */
function drawDecorations(ctx, template, primaryColor, accentColor) {
  var w = template.width;
  var h = template.height;

  // 绘制圆形装饰
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.15, w * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = accentColor + '33'; // 20% 透明度
  ctx.fill();

  // 绘制线条装饰
  ctx.strokeStyle = accentColor + '66';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.35);
  ctx.lineTo(w * 0.3, h * 0.35);
  ctx.stroke();

  // 绘制小圆点装饰
  for (var i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(w * 0.15 + i * 30, h * 0.38, 4, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();
  }
}

/**
 * 绘制文字
 */
function drawText(ctx, template, themeData, options) {
  var w = template.width;
  var h = template.height;
  var textColor = getTextColor(template.background === 'split' ? '#1a1a2e' : (themeData.colors[0] || '#ff6b6b'));

  // 标题
  ctx.fillStyle = textColor;
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  var title = options.title || themeData.name || '我的主题';
  ctx.fillText(title, w / 2, h * 0.55);

  // 副标题
  ctx.font = '36px sans-serif';
  ctx.fillStyle = textColor + 'CC';
  var subtitle = options.subtitle || themeData.description || 'MIUI 主题编辑器出品';
  ctx.fillText(subtitle, w / 2, h * 0.6);

  // 作者信息
  ctx.font = '28px sans-serif';
  ctx.fillStyle = textColor + '99';
  var author = options.author || themeData.author || '匿名作者';
  ctx.fillText('by ' + author, w / 2, h * 0.65);

  // 版本号
  ctx.font = '24px sans-serif';
  ctx.fillStyle = textColor + '66';
  ctx.fillText('v' + (themeData.version || '1.0.0'), w / 2, h * 0.68);
}

/**
 * 绘制颜色预览
 */
function drawColorPreview(ctx, template, colors) {
  if (!colors || colors.length === 0) return;

  var w = template.width;
  var h = template.height;
  var startX = w * 0.3;
  var startY = h * 0.72;
  var size = 80;
  var gap = 20;

  for (var i = 0; i < Math.min(colors.length, 6); i++) {
    var x = startX + i * (size + gap);
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.roundRect(x, startY, size, size, 12);
    ctx.fill();

    // 绘制 HEX 值
    ctx.fillStyle = getTextColor(colors[i]);
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(colors[i].toUpperCase(), x + size / 2, startY + size / 2 + 5);
  }
}

/**
 * 绘制图标预览
 */
function drawIconPreview(ctx, template, icons) {
  var w = template.width;
  var h = template.height;
  var startX = w * 0.25;
  var startY = h * 0.78;
  var size = 60;
  var gap = 30;

  for (var i = 0; i < Math.min(icons.length, 8); i++) {
    var x = startX + (i % 4) * (size + gap);
    var y = startY + Math.floor(i / 4) * (size + gap);

    // 绘制图标占位符（圆形背景）
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff33';
    ctx.fill();

    // 绘制图标名称首字母
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var label = icons[i].name ? icons[i].name.charAt(0).toUpperCase() : '?';
    ctx.fillText(label, x + size / 2, y + size / 2);
  }
}

// ==================== 插件主逻辑 ====================

/**
 * 激活插件
 */
function activate(context) {
  var log = context.log;
  var notify = context.notify;
  var getProject = context.getProject;
  var registerPanel = context.registerPanel;

  log('主题海报制作器插件已激活');

  // 注册海报制作面板
  registerPanel({
    id: 'theme-poster-panel',
    title: '主题海报制作器',
    icon: 'picture',
    render: function(container) {
      container.innerHTML = '';
      container.style.padding = '16px';
      container.style.color = '#ffffff';

      // 获取项目数据
      var project = getProject ? getProject() : {};
      var themeData = {
        name: project.name || '未命名主题',
        description: project.description || '',
        author: project.author || '匿名作者',
        version: project.version || '1.0.0',
        colors: project.colors ? project.colors.map(function(c) { return c.value; }) : ['#ff6b6b', '#16213e', '#1a1a2e', '#ffffff'],
        icons: project.icons || []
      };

      // 标题
      var title = document.createElement('h3');
      title.textContent = '主题配套海报制作';
      title.style.marginBottom = '16px';
      title.style.color = '#ff6b6b';
      container.appendChild(title);

      // 模板选择
      var templateLabel = document.createElement('div');
      templateLabel.textContent = '选择海报模板：';
      templateLabel.style.marginBottom = '8px';
      templateLabel.style.fontSize = '14px';
      container.appendChild(templateLabel);

      var templateSelect = document.createElement('select');
      templateSelect.style.width = '100%';
      templateSelect.style.padding = '8px';
      templateSelect.style.marginBottom = '16px';
      templateSelect.style.background = '#16213e';
      templateSelect.style.color = '#ffffff';
      templateSelect.style.border = '1px solid #2a2a4e';
      templateSelect.style.borderRadius = '6px';

      Object.keys(posterTemplates).forEach(function(key) {
        var option = document.createElement('option');
        option.value = key;
        option.textContent = posterTemplates[key].name;
        templateSelect.appendChild(option);
      });
      container.appendChild(templateSelect);

      // 标题输入
      var titleInputLabel = document.createElement('div');
      titleInputLabel.textContent = '海报标题：';
      titleInputLabel.style.marginBottom = '8px';
      titleInputLabel.style.fontSize = '14px';
      container.appendChild(titleInputLabel);

      var titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = themeData.name;
      titleInput.style.width = '100%';
      titleInput.style.padding = '8px';
      titleInput.style.marginBottom = '12px';
      titleInput.style.background = '#16213e';
      titleInput.style.color = '#ffffff';
      titleInput.style.border = '1px solid #2a2a4e';
      titleInput.style.borderRadius = '6px';
      container.appendChild(titleInput);

      // 副标题输入
      var subtitleInputLabel = document.createElement('div');
      subtitleInputLabel.textContent = '副标题：';
      subtitleInputLabel.style.marginBottom = '8px';
      subtitleInputLabel.style.fontSize = '14px';
      container.appendChild(subtitleInputLabel);

      var subtitleInput = document.createElement('input');
      subtitleInput.type = 'text';
      subtitleInput.value = themeData.description || 'MIUI 主题编辑器出品';
      subtitleInput.style.width = '100%';
      subtitleInput.style.padding = '8px';
      subtitleInput.style.marginBottom = '12px';
      subtitleInput.style.background = '#16213e';
      subtitleInput.style.color = '#ffffff';
      subtitleInput.style.border = '1px solid #2a2a4e';
      subtitleInput.style.borderRadius = '6px';
      container.appendChild(subtitleInput);

      // 作者输入
      var authorInputLabel = document.createElement('div');
      authorInputLabel.textContent = '作者：';
      authorInputLabel.style.marginBottom = '8px';
      authorInputLabel.style.fontSize = '14px';
      container.appendChild(authorInputLabel);

      var authorInput = document.createElement('input');
      authorInput.type = 'text';
      authorInput.value = themeData.author;
      authorInput.style.width = '100%';
      authorInput.style.padding = '8px';
      authorInput.style.marginBottom = '16px';
      authorInput.style.background = '#16213e';
      authorInput.style.color = '#ffffff';
      authorInput.style.border = '1px solid #2a2a4e';
      authorInput.style.borderRadius = '6px';
      container.appendChild(authorInput);

      // 预览区域
      var previewLabel = document.createElement('div');
      previewLabel.textContent = '海报预览：';
      previewLabel.style.marginBottom = '8px';
      previewLabel.style.fontSize = '14px';
      container.appendChild(previewLabel);

      var previewContainer = document.createElement('div');
      previewContainer.style.width = '100%';
      previewContainer.style.height = '300px';
      previewContainer.style.background = '#0f0f23';
      previewContainer.style.borderRadius = '8px';
      previewContainer.style.display = 'flex';
      previewContainer.style.alignItems = 'center';
      previewContainer.style.justifyContent = 'center';
      previewContainer.style.marginBottom = '16px';
      previewContainer.style.overflow = 'hidden';
      container.appendChild(previewContainer);

      // 生成按钮
      var generateBtn = document.createElement('button');
      generateBtn.textContent = '生成海报';
      generateBtn.style.width = '100%';
      generateBtn.style.padding = '12px';
      generateBtn.style.background = '#ff6b6b';
      generateBtn.style.color = '#ffffff';
      generateBtn.style.border = 'none';
      generateBtn.style.borderRadius = '6px';
      generateBtn.style.cursor = 'pointer';
      generateBtn.style.fontSize = '16px';
      generateBtn.style.marginBottom = '8px';
      container.appendChild(generateBtn);

      // 导出按钮
      var exportBtn = document.createElement('button');
      exportBtn.textContent = '导出 PNG';
      exportBtn.style.width = '100%';
      exportBtn.style.padding = '12px';
      exportBtn.style.background = '#16213e';
      exportBtn.style.color = '#ffffff';
      exportBtn.style.border = '1px solid #2a2a4e';
      exportBtn.style.borderRadius = '6px';
      exportBtn.style.cursor = 'pointer';
      exportBtn.style.fontSize = '16px';
      container.appendChild(exportBtn);

      // 当前生成的 canvas
      var currentCanvas = null;

      // 生成海报函数
      function doGenerate() {
        var templateKey = templateSelect.value;
        var template = posterTemplates[templateKey];
        var options = {
          title: titleInput.value,
          subtitle: subtitleInput.value,
          author: authorInput.value
        };

        try {
          currentCanvas = generatePoster(template, themeData, options);

          // 缩放显示预览
          var scale = Math.min(
            previewContainer.clientWidth / currentCanvas.width,
            previewContainer.clientHeight / currentCanvas.height
          ) * 0.9;

          var previewCanvas = document.createElement('canvas');
          previewCanvas.width = currentCanvas.width * scale;
          previewCanvas.height = currentCanvas.height * scale;
          var previewCtx = previewCanvas.getContext('2d');
          previewCtx.drawImage(currentCanvas, 0, 0, previewCanvas.width, previewCanvas.height);

          previewContainer.innerHTML = '';
          previewContainer.appendChild(previewCanvas);

          notify('海报生成成功！', 'success');
          log('海报已生成: ' + template.name);
        } catch (e) {
          notify('海报生成失败: ' + e.message, 'error');
          log('海报生成错误: ' + e.message);
        }
      }

      // 导出 PNG 函数
      function doExport() {
        if (!currentCanvas) {
          notify('请先生成海报', 'warning');
          return;
        }

        try {
          var link = document.createElement('a');
          link.download = 'theme-poster-' + Date.now() + '.png';
          link.href = currentCanvas.toDataURL('image/png');
          link.click();
          notify('海报已导出', 'success');
          log('海报已导出');
        } catch (e) {
          notify('导出失败: ' + e.message, 'error');
          log('导出错误: ' + e.message);
        }
      }

      generateBtn.addEventListener('click', doGenerate);
      exportBtn.addEventListener('click', doExport);

      // 初始生成
      doGenerate();
    }
  });

  notify('主题海报制作器已就绪', 'info');
}

/**
 * 停用插件
 */
function deactivate(context) {
  context.log('主题海报制作器插件已停用');
}

// 导出插件接口
module.exports = {
  activate: activate,
  deactivate: deactivate
};
