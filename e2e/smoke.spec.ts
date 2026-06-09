/**
 * MIUI Theme Editor - E2E 冒烟测试
 *
 * 使用 Playwright + Electron 启动器测试应用核心流程：
 * - 应用启动
 * - 欢迎页显示
 * - 新建主题流程
 * - 打开编辑器页面
 * - 设置页面打开
 */

import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import * as path from 'path';

// ==================== 全局状态 ====================

let electronApp: ElectronApplication | null = null;

// ==================== 辅助函数 ====================

/**
 * 启动 Electron 应用
 */
async function launchApp(): Promise<ElectronApplication> {
  const appPath = path.resolve(__dirname, '..');

  return electron.launch({
    args: [path.join(appPath, 'dist', 'main', 'index.js')],
    cwd: appPath,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ELECTRON_IS_DEV: '0',
    },
  });
}

/**
 * 获取第一个窗口
 */
async function getFirstWindow(app: ElectronApplication): Promise<Page> {
  const window = await app.firstWindow();
  // 等待页面加载完成
  await window.waitForLoadState('domcontentloaded');
  return window;
}

// ==================== 生命周期 ====================

test.beforeAll(async () => {
  electronApp = await launchApp();
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
    electronApp = null;
  }
});

// ==================== 测试套件 ====================

test.describe('MIUI Theme Editor Smoke Tests', () => {
  /**
   * 测试1：应用启动
   */
  test('应用应该成功启动', async () => {
    expect(electronApp).not.toBeNull();

    const window = await getFirstWindow(electronApp!);
    expect(window).toBeDefined();

    // 验证窗口标题
    const title = await window.title();
    expect(title).toContain('MIUI Theme Editor');
  });

  /**
   * 测试2：欢迎页显示
   */
  test('欢迎页应该正确显示', async () => {
    const window = await getFirstWindow(electronApp!);

    // 验证欢迎页标题
    await expect(window.locator('text=MIUI Theme Editor')).toBeVisible();

    // 验证副标题
    await expect(window.locator('text=全功能小米手机主题编辑生成器')).toBeVisible();

    // 验证三个功能卡片
    await expect(window.locator('text=打开主题')).toBeVisible();
    await expect(window.locator('text=新建主题')).toBeVisible();
    await expect(window.locator('text=AI 一键生成')).toBeVisible();

    // 验证底部版本信息
    await expect(window.locator('text=/v0\\.\\d+\\.\\d+/')).toBeVisible();
  });

  /**
   * 测试3：新建主题流程
   */
  test('应该能够通过欢迎页新建主题', async () => {
    const window = await getFirstWindow(electronApp!);

    // 点击"新建主题"卡片
    const newThemeCard = window.locator('text=新建主题').first();
    await expect(newThemeCard).toBeVisible();
    await newThemeCard.click();

    // 等待页面切换到编辑器
    await window.waitForTimeout(500);

    // 验证编辑器页面元素（左侧导航）
    await expect(window.locator('text=概览')).toBeVisible();
    await expect(window.locator('text=图标')).toBeVisible();
    await expect(window.locator('text=壁纸')).toBeVisible();
    await expect(window.locator('text=配色')).toBeVisible();
  });

  /**
   * 测试4：打开编辑器页面
   */
  test('编辑器页面应该正确渲染各模块', async () => {
    const window = await getFirstWindow(electronApp!);

    // 确保在编辑器页面（如果不是，先新建主题）
    const isEditor = await window.locator('text=概览').isVisible().catch(() => false);
    if (!isEditor) {
      const newThemeCard = window.locator('text=新建主题').first();
      await newThemeCard.click();
      await window.waitForTimeout(500);
    }

    // 验证顶部工具栏
    await expect(window.locator('text=保存')).toBeVisible();
    await expect(window.locator('text=导出MTZ')).toBeVisible();
    await expect(window.locator('text=预览')).toBeVisible();
    await expect(window.locator('text=推送手机')).toBeVisible();

    // 验证左侧导航模块
    const modules = ['概览', '图标', '壁纸', '配色', '字体', '音效', 'MAML', '预览'];
    for (const module of modules) {
      await expect(window.locator(`text=${module}`).first()).toBeVisible();
    }

    // 验证右侧属性面板
    await expect(window.locator('text=属性').first()).toBeVisible();

    // 验证底部状态栏
    await expect(window.locator('text=/文件数:/')).toBeVisible();
    await expect(window.locator('text=/资源大小:/')).toBeVisible();
  });

  /**
   * 测试5：设置页面打开
   */
  test('应该能够打开设置页面', async () => {
    const window = await getFirstWindow(electronApp!);

    // 点击右上角设置按钮（齿轮图标）
    const settingsButton = window.locator('[aria-label="设置"]').first();

    // 如果找不到 aria-label，尝试通过图标类名查找
    if (!(await settingsButton.isVisible().catch(() => false))) {
      // 通过设置按钮的 title 或类名查找
      const altSettingsButton = window.locator('button[title="设置"]').first();
      if (await altSettingsButton.isVisible().catch(() => false)) {
        await altSettingsButton.click();
      } else {
        // 尝试查找设置图标（SVG）
        const iconButton = window.locator('button').filter({ has: window.locator('svg') }).last();
        await iconButton.click();
      }
    } else {
      await settingsButton.click();
    }

    // 等待设置抽屉打开
    await window.waitForTimeout(300);

    // 验证设置页面内容
    await expect(window.locator('text=设置').nth(1)).toBeVisible();
    await expect(window.locator('text=外观')).toBeVisible();
    await expect(window.locator('text=通用')).toBeVisible();
    await expect(window.locator('text=快捷键列表')).toBeVisible();

    // 验证语言设置
    await expect(window.locator('text=语言')).toBeVisible();

    // 验证主题设置
    await expect(window.locator('text=主题')).toBeVisible();

    // 关闭设置抽屉（按 Escape 或点击遮罩）
    await window.keyboard.press('Escape');
    await window.waitForTimeout(300);
  });
});
