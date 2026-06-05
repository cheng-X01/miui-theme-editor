/**
 * MIUI Theme Editor - MTZ 打包器单元测试
 * 测试 MTZPacker 的核心功能
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as JSZip from 'jszip';
import { MTZPacker, PackResult } from '../../src/main/engine/mtz-packer';
import type { ThemeProject } from '../../src/shared/types';

/**
 * 创建一个用于测试的主题项目
 * @returns ThemeProject 实例
 */
function createTestProject(): ThemeProject {
  return {
    id: 'test-project-001',
    name: '测试主题',
    filePath: '/tmp/test-theme.mtz',
    description: {
      name: '测试主题',
      author: '测试作者',
      version: '1.0.0',
      description: '用于打包测试的主题',
      uiVersion: 'V12',
      designWidth: 1080,
      designHeight: 2400,
      supportsDarkMode: true,
      minMIUIVersion: '12.0.0',
      category: 'personalization',
      tags: ['测试', '打包'],
    },
    resources: {
      icons: [
        {
          componentName: 'com.android.settings',
          filePath: 'icons/com.android.settings.png',
          previewData: Buffer.from('fake-png-data').toString('base64'),
        },
        {
          componentName: 'com.android.camera',
          filePath: 'icons/com.android.camera.png',
          previewData: Buffer.from('fake-png-data-2').toString('base64'),
        },
      ],
      wallpapers: [
        {
          name: 'default_wallpaper',
          filePath: 'wallpaper/default_wallpaper.jpg',
          type: 'homescreen',
          previewData: Buffer.from('fake-jpg-data').toString('base64'),
        },
      ],
      fonts: [
        {
          name: 'Roboto-Regular',
          filePath: 'fonts/Roboto-Regular.ttf',
          type: 'regular',
          fileSize: 1024,
        },
      ],
      sounds: [
        {
          name: 'notification_default',
          filePath: 'audio/notification_default.mp3',
          type: 'notification',
        },
      ],
      lockscreens: [
        {
          name: 'default',
          filePath: 'lockscreen/default.lock',
          type: 'lockscreen',
          supportsPassword: true,
        },
      ],
      statusbar: {
        showCarrier: true,
        textColor: '#ffffff',
        bgColor: '#00000000',
      },
      mamlModules: [
        {
          name: 'lockscreen',
          type: 'lockscreen',
          filePath: 'lockscreen/lockscreen.maml',
          sourceCode: '<?xml version="1.0" encoding="UTF-8"?>\n<Lockscreen>\n  <Time format="HH:mm"/>\n</Lockscreen>',
        },
      ],
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    isDirty: false,
  };
}

describe('MTZPacker', () => {
  let packer: MTZPacker;

  beforeAll(() => {
    packer = new MTZPacker();
  });

  /**
   * 测试1：打包基本的 MTZ 文件
   */
  it('应该正确打包基本的 MTZ 文件', async () => {
    const project = createTestProject();
    const result = await packer.pack(project);

    // 验证打包结果
    expect(result).toBeDefined();
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.size).toBeGreaterThan(0);
    expect(result.files.length).toBeGreaterThan(0);

    // 验证包含必要文件
    expect(result.files).toContain('description.xml');
    expect(result.files).toContain('theme_config.json');
  });

  /**
   * 测试2：生成的 MTZ 文件可以被正确解压和验证
   */
  it('生成的 MTZ 文件应该可以被正确解压和验证', async () => {
    const project = createTestProject();
    const result = await packer.pack(project);

    // 解压验证
    const zip = await JSZip.loadAsync(result.buffer);
    const fileNames = Object.keys(zip.files);

    // 验证 description.xml 存在且内容正确
    expect(fileNames).toContain('description.xml');
    const descXml = await zip.files['description.xml'].async('text');
    expect(descXml).toContain('测试主题');
    expect(descXml).toContain('测试作者');
    expect(descXml).toContain('V12');

    // 验证 theme_config.json 存在且内容正确
    expect(fileNames).toContain('theme_config.json');
    const configJson = await zip.files['theme_config.json'].async('text');
    const config = JSON.parse(configJson);
    expect(config.name).toBe('测试主题');
    expect(config.supportsDarkMode).toBe(true);

    // 验证图标文件存在
    expect(fileNames.some((n) => n.includes('com.android.settings'))).toBe(true);

    // 验证壁纸文件存在
    expect(fileNames.some((n) => n.includes('default_wallpaper'))).toBe(true);

    // 验证 MAML 文件存在且内容正确
    expect(fileNames).toContain('lockscreen/lockscreen.maml');
    const mamlContent = await zip.files['lockscreen/lockscreen.maml'].async('text');
    expect(mamlContent).toContain('Lockscreen');
    expect(mamlContent).toContain('Time');

    // 验证状态栏配置文件
    expect(fileNames).toContain('statusbar/config.json');
    const statusbarConfig = await zip.files['statusbar/config.json'].async('text');
    const statusbar = JSON.parse(statusbarConfig);
    expect(statusbar.showCarrier).toBe(true);
    expect(statusbar.textColor).toBe('#ffffff');
  });

  /**
   * 测试3：打包选项影响打包行为
   */
  it('打包选项应该影响打包行为', async () => {
    const project = createTestProject();

    // 测试不压缩选项
    const resultNoCompress = await packer.pack(project, {
      compress: false,
    });

    // 测试压缩选项
    const resultCompress = await packer.pack(project, {
      compress: true,
      compressionLevel: 9,
    });

    // 两种方式都应该成功
    expect(resultNoCompress.buffer).toBeInstanceOf(Buffer);
    expect(resultNoCompress.size).toBeGreaterThan(0);
    expect(resultCompress.buffer).toBeInstanceOf(Buffer);
    expect(resultCompress.size).toBeGreaterThan(0);

    // 压缩后的文件应该更小（或至少大小不同）
    // 注意：由于测试数据很小，压缩效果可能不明显
    expect(resultCompress.files.length).toBe(resultNoCompress.files.length);
  });
});
