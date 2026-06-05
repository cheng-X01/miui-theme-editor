/**
 * MIUI Theme Editor - MTZ 解析器单元测试
 * 测试 MTZParser 的核心功能
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as JSZip from 'jszip';
import { MTZParser, ParseResult } from '../../src/main/engine/mtz-parser';

/**
 * 创建一个最小的 MTZ 测试包
 * @returns JSZip 实例
 */
async function createMinimalMTZ(): Promise<JSZip> {
  const zip = new JSZip();

  // 添加 description.xml
  zip.file('description.xml', `<?xml version="1.0" encoding="UTF-8"?>
<MIUI_Theme version="2">
  <name>测试主题</name>
  <author>测试作者</author>
  <version>1.0.0</version>
  <description>这是一个用于单元测试的主题</description>
  <uiVersion>V12</uiVersion>
  <designWidth>1080</designWidth>
  <designHeight>2400</designHeight>
  <supportsDarkMode>true</supportsDarkMode>
  <minMIUIVersion>12.0.0</minMIUIVersion>
  <category>personalization</category>
  <tags>测试,单元测试</tags>
</MIUI_Theme>`);

  // 添加 theme_config.json
  zip.file('theme_config.json', JSON.stringify({
    name: '测试主题',
    author: '测试作者',
    version: '1.0.0',
    supportsDarkMode: true,
  }));

  // 添加图标目录和示例图标
  zip.file('icons/com.android.settings.png', Buffer.alloc(100, 0x89)); // 模拟 PNG 文件头
  zip.file('icons/com.android.camera.png', Buffer.alloc(100, 0x89));
  zip.file('icons/com.android.phone_2.png', Buffer.alloc(100, 0x89)); // 带尺寸后缀

  // 添加壁纸
  zip.file('wallpaper/default_wallpaper.jpg', Buffer.alloc(200, 0xFF));

  // 添加锁屏壁纸
  zip.file('wallpaper/lockscreen_wallpaper.jpg', Buffer.alloc(200, 0xFF));

  // 添加字体
  zip.file('fonts/Roboto-Regular.ttf', Buffer.alloc(500, 0x00));
  zip.file('fonts/Roboto-Bold.ttf', Buffer.alloc(500, 0x00));

  // 添加声音
  zip.file('audio/notification_default.mp3', Buffer.alloc(300, 0x00));
  zip.file('audio/ringtone_default.mp3', Buffer.alloc(300, 0x00));

  // 添加锁屏
  zip.file('lockscreen/default.lock', Buffer.alloc(100, 0x00));

  // 添加 MAML 模块
  zip.file('lockscreen/lockscreen.maml', `<?xml version="1.0" encoding="UTF-8"?>
<Lockscreen>
  <DateTime>
    <Time format="HH:mm" size="120" color="#ffffff"/>
    <Date format="yyyy-MM-dd" size="24" color="#aaaaaa"/>
  </DateTime>
</Lockscreen>`);

  return zip;
}

describe('MTZParser', () => {
  let parser: MTZParser;

  beforeAll(() => {
    parser = new MTZParser();
  });

  /**
   * 测试1：解析基本的 MTZ 包结构
   */
  it('应该正确解析基本的 MTZ 包结构', async () => {
    const zip = await createMinimalMTZ();
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    const result = await parser.parse(buffer);

    // 验证基本结构
    expect(result).toBeDefined();
    expect(result.project).toBeDefined();
    expect(result.project.id).toBeTruthy(); // 应该有 UUID
    expect(result.warnings).toBeInstanceOf(Array);
  });

  /**
   * 测试2：正确解析 description.xml 中的主题信息
   */
  it('应该正确解析 description.xml 中的主题信息', async () => {
    const zip = await createMinimalMTZ();
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    const result = await parser.parse(buffer);
    const desc = result.project.description;

    expect(desc.name).toBe('测试主题');
    expect(desc.author).toBe('测试作者');
    expect(desc.version).toBe('1.0.0');
    expect(desc.description).toBe('这是一个用于单元测试的主题');
    expect(desc.uiVersion).toBe('V12');
    expect(desc.designWidth).toBe(1080);
    expect(desc.designHeight).toBe(2400);
    expect(desc.supportsDarkMode).toBe(true);
    expect(desc.minMIUIVersion).toBe('12.0.0');
    expect(desc.category).toBe('personalization');
    expect(desc.tags).toContain('测试');
    expect(desc.tags).toContain('单元测试');
  });

  /**
   * 测试3：正确解析各类资源文件
   */
  it('应该正确解析各类资源文件', async () => {
    const zip = await createMinimalMTZ();
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    const result = await parser.parse(buffer);
    const { resources } = result.project;

    // 验证图标
    expect(resources.icons.length).toBeGreaterThanOrEqual(2);
    expect(resources.icons.some((i) => i.componentName === 'com.android.settings')).toBe(true);
    expect(resources.icons.some((i) => i.componentName === 'com.android.phone')).toBe(true); // 尺寸后缀应被去除

    // 验证壁纸
    expect(resources.wallpapers.length).toBeGreaterThanOrEqual(1);
    expect(resources.wallpapers.some((w) => w.type === 'homescreen')).toBe(true);

    // 验证字体
    expect(resources.fonts.length).toBeGreaterThanOrEqual(1);
    expect(resources.fonts.some((f) => f.type === 'bold')).toBe(true);

    // 验证声音
    expect(resources.sounds.length).toBeGreaterThanOrEqual(1);
    expect(resources.sounds.some((s) => s.type === 'ringtone')).toBe(true);

    // 验证锁屏
    expect(resources.lockscreens.length).toBeGreaterThanOrEqual(1);

    // 验证 MAML 模块
    expect(resources.mamlModules.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * 测试4：处理缺少 description.xml 的 MTZ 包
   */
  it('应该在缺少 description.xml 时使用默认值并产生警告', async () => {
    const zip = new JSZip();
    // 不添加 description.xml
    zip.file('icons/test.png', Buffer.alloc(100));

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    const result = await parser.parse(buffer);

    // 应该使用默认值
    expect(result.project.description.name).toBe('未命名主题');
    expect(result.project.description.author).toBe('未知作者');

    // 应该有警告
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes('description.xml'))).toBe(true);
  });

  /**
   * 测试5：解析选项控制解析行为
   */
  it('应该根据解析选项控制解析行为', async () => {
    const zip = await createMinimalMTZ();
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    // 启用 MAML 源代码解析
    const result = await parser.parse(buffer, {
      parseMAMLSource: true,
      parseIconPreviews: true,
    });

    // 验证 MAML 源代码被解析
    const mamlModule = result.project.resources.mamlModules.find(
      (m) => m.name === 'lockscreen'
    );
    expect(mamlModule).toBeDefined();
    expect(mamlModule!.sourceCode).toBeTruthy();
    expect(mamlModule!.sourceCode).toContain('Lockscreen');

    // 验证图标预览被解析
    const icon = result.project.resources.icons.find(
      (i) => i.componentName === 'com.android.settings'
    );
    expect(icon).toBeDefined();
    expect(icon!.previewData).toBeTruthy();
  });
});
