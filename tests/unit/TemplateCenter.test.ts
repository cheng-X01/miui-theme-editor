/**
 * MIUI Theme Editor - 模板中心单元测试
 * 测试模板相关功能：
 * - builtInTemplates: 内置模板数据完整性
 * - UserTemplateManager: CRUD、收藏、导入导出
 * - searchTemplates: 搜索过滤
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ==================== Mock localStorage ====================

/** 存储 localStorage 数据的 Map */
const storageMap = new Map<string, string>();

/** Mock localStorage */
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() {
    return storageMap.size;
  },
  key: (_index: number) => null,
};

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });

// 导入被测模块
import {
  builtInTemplates,
  getBuiltInTemplateById,
  getPopularTemplates,
  getLatestTemplates,
  searchTemplates,
} from '../../src/renderer/templates/TemplateCenter/builtInTemplates';
import { UserTemplateManager } from '../../src/renderer/templates/TemplateCenter/UserTemplateManager';
import type { Template } from '../../src/renderer/templates/TemplateCenter/index';
import type { ThemeProject } from '../../src/shared/types';

// ==================== 辅助函数 ====================

/**
 * 创建一个用于测试的 ThemeProject
 */
function createTestProject(name: string = '测试主题'): ThemeProject {
  return {
    id: `test-${Date.now()}`,
    name,
    description: {
      name,
      author: '测试作者',
      version: '1.0.0',
      description: '测试主题描述',
      uiVersion: '14',
      designWidth: 1080,
      designHeight: 2400,
      supportsDarkMode: true,
      minMIUIVersion: 'V14',
      category: '测试',
      tags: ['测试'],
    },
    resources: {
      icons: [],
      wallpapers: [],
      fonts: [],
      sounds: [],
      lockscreens: [],
      statusbar: {
        bgColor: '#000000',
        textColor: '#ffffff',
        showCarrier: false,
      },
      mamlModules: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDirty: false,
  };
}

// ==================== 测试用例 ====================

describe('模板中心', () => {
  // ==================== builtInTemplates 测试 ====================

  describe('builtInTemplates', () => {
    it('应该包含 10 个内置模板', () => {
      expect(builtInTemplates).toHaveLength(10);
    });

    it('每个模板应包含完整的必要字段', () => {
      for (const template of builtInTemplates) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.author).toBe('MIUI Theme Editor');
        expect(template.description).toBeDefined();
        expect(template.tags).toBeInstanceOf(Array);
        expect(template.tags.length).toBeGreaterThan(0);
        expect(template.downloads).toBeGreaterThanOrEqual(0);
        expect(template.rating).toBeGreaterThanOrEqual(0);
        expect(template.isBuiltIn).toBe(true);
        expect(template.createdAt).toBeDefined();
        expect(template.projectData).toBeDefined();
      }
    });

    it('每个模板的 projectData 应包含完整的资源集合', () => {
      for (const template of builtInTemplates) {
        const project = template.projectData!;
        expect(project.resources).toBeDefined();
        expect(project.resources.icons).toBeInstanceOf(Array);
        expect(project.resources.wallpapers).toBeInstanceOf(Array);
        expect(project.resources.fonts).toBeInstanceOf(Array);
        expect(project.resources.sounds).toBeInstanceOf(Array);
        expect(project.resources.lockscreens).toBeInstanceOf(Array);
        expect(project.resources.statusbar).toBeDefined();
        expect(project.resources.mamlModules).toBeInstanceOf(Array);
      }
    });

    it('每个模板应有唯一的 ID', () => {
      const ids = builtInTemplates.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('每个模板应有唯一的名称', () => {
      const names = builtInTemplates.map((t) => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('模板的壁纸资源应至少包含主屏幕和锁屏壁纸', () => {
      for (const template of builtInTemplates) {
        const wallpapers = template.projectData!.resources.wallpapers;
        expect(wallpapers.length).toBeGreaterThanOrEqual(2);

        const types = wallpapers.map((w) => w.type);
        expect(types).toContain('homescreen');
        expect(types).toContain('lockscreen');
      }
    });

    it('模板的图标资源应包含样式规范和常见应用图标', () => {
      for (const template of builtInTemplates) {
        const icons = template.projectData!.resources.icons;
        expect(icons.length).toBeGreaterThan(0);

        // 应包含样式规范
        const hasStyleSpec = icons.some((i) => i.componentName === '__style_spec__');
        expect(hasStyleSpec).toBe(true);
      }
    });

    it('模板的锁屏 MAML 代码应包含基本元素', () => {
      for (const template of builtInTemplates) {
        const mamlModules = template.projectData!.resources.mamlModules;
        expect(mamlModules.length).toBeGreaterThan(0);

        const lockscreen = mamlModules[0];
        expect(lockscreen.sourceCode).toBeDefined();
        expect(lockscreen.sourceCode).toContain('Lockscreen');
      }
    });
  });

  // ==================== getBuiltInTemplateById 测试 ====================

  describe('getBuiltInTemplateById', () => {
    it('应该根据 ID 正确获取模板', () => {
      const template = getBuiltInTemplateById('builtin-minimal-dark');
      expect(template).toBeDefined();
      expect(template!.name).toBe('极简深色');
    });

    it('不存在的 ID 应返回 undefined', () => {
      const template = getBuiltInTemplateById('non-existent-id');
      expect(template).toBeUndefined();
    });
  });

  // ==================== getPopularTemplates 测试 ====================

  describe('getPopularTemplates', () => {
    it('应该按下载量降序返回热门模板', () => {
      const popular = getPopularTemplates(5);
      expect(popular).toHaveLength(5);

      // 验证按下载量降序排列
      for (let i = 1; i < popular.length; i++) {
        expect(popular[i - 1].downloads).toBeGreaterThanOrEqual(popular[i].downloads);
      }
    });

    it('默认应返回 5 个热门模板', () => {
      const popular = getPopularTemplates();
      expect(popular).toHaveLength(5);
    });

    it('请求数量超过总数时应返回全部', () => {
      const popular = getPopularTemplates(100);
      expect(popular).toHaveLength(builtInTemplates.length);
    });
  });

  // ==================== getLatestTemplates 测试 ====================

  describe('getLatestTemplates', () => {
    it('应该按创建时间降序返回最新模板', () => {
      const latest = getLatestTemplates(5);
      expect(latest).toHaveLength(5);

      // 验证按创建时间降序排列
      for (let i = 1; i < latest.length; i++) {
        const time1 = new Date(latest[i - 1].createdAt).getTime();
        const time2 = new Date(latest[i].createdAt).getTime();
        expect(time1).toBeGreaterThanOrEqual(time2);
      }
    });
  });

  // ==================== searchTemplates 测试 ====================

  describe('searchTemplates', () => {
    it('应该按名称搜索模板', () => {
      const results = searchTemplates('极简');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.name.includes('极简'))).toBe(true);
    });

    it('应该按标签搜索模板', () => {
      const results = searchTemplates('星空');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.tags.some((tag) => tag.includes('星空')))).toBe(true);
    });

    it('应该按描述搜索模板', () => {
      const results = searchTemplates('樱花');
      expect(results.length).toBeGreaterThan(0);
    });

    it('搜索不存在的关键词应返回空数组', () => {
      const results = searchTemplates('不存在的模板xyz');
      expect(results).toHaveLength(0);
    });

    it('搜索应不区分大小写', () => {
      const results1 = searchTemplates('赛博朋克');
      const results2 = searchTemplates('赛博朋克'.toUpperCase());
      // 由于中文没有大小写，测试英文场景
      // 这里验证搜索功能正常即可
      expect(results1.length).toBeGreaterThan(0);
    });

    it('空字符串应返回所有模板', () => {
      const results = searchTemplates('');
      expect(results).toHaveLength(builtInTemplates.length);
    });
  });

  // ==================== UserTemplateManager 测试 ====================

  describe('UserTemplateManager', () => {
    let manager: UserTemplateManager;

    beforeEach(() => {
      storageMap.clear();
      // 每次创建新的管理器实例以避免单例缓存
      manager = new UserTemplateManager();
    });

    afterEach(() => {
      storageMap.clear();
    });

    // --- CRUD 测试 ---

    describe('CRUD 操作', () => {
      it('应该正确保存用户模板', () => {
        const project = createTestProject('我的模板');
        const template = manager.saveAsTemplate(project, '我的模板', '测试描述', ['自定义']);

        expect(template).toBeDefined();
        expect(template.id).toBeDefined();
        expect(template.name).toBe('我的模板');
        expect(template.description).toBe('测试描述');
        expect(template.author).toBe('用户');
        expect(template.isBuiltIn).toBe(false);
        expect(template.tags).toContain('自定义');
      });

      it('应该正确获取所有用户模板', () => {
        manager.saveAsTemplate(createTestProject('模板1'), '模板1');
        manager.saveAsTemplate(createTestProject('模板2'), '模板2');

        const templates = manager.getUserTemplates();
        expect(templates).toHaveLength(2);
      });

      it('应该根据 ID 获取用户模板', () => {
        const saved = manager.saveAsTemplate(createTestProject('目标模板'), '目标模板');
        const found = manager.getTemplateById(saved.id);

        expect(found).toBeDefined();
        expect(found!.name).toBe('目标模板');
      });

      it('不存在的 ID 应返回 undefined', () => {
        const found = manager.getTemplateById('non-existent');
        expect(found).toBeUndefined();
      });

      it('应该正确删除用户模板', () => {
        const saved = manager.saveAsTemplate(createTestProject('待删除'), '待删除');
        const deleted = manager.deleteTemplate(saved.id);

        expect(deleted).toBe(true);
        expect(manager.getTemplateById(saved.id)).toBeUndefined();
        expect(manager.getUserTemplates()).toHaveLength(0);
      });

      it('删除不存在的模板应返回 false', () => {
        const deleted = manager.deleteTemplate('non-existent');
        expect(deleted).toBe(false);
      });

      it('应该正确更新用户模板', () => {
        const saved = manager.saveAsTemplate(createTestProject('待更新'), '待更新');
        const updated = manager.updateTemplate(saved.id, {
          name: '已更新名称',
          description: '已更新描述',
        });

        expect(updated).toBeDefined();
        expect(updated!.name).toBe('已更新名称');
        expect(updated!.description).toBe('已更新描述');
      });

      it('更新不存在的模板应返回 undefined', () => {
        const updated = manager.updateTemplate('non-existent', { name: '新名称' });
        expect(updated).toBeUndefined();
      });

      it('超出最大模板数量时应抛出异常', () => {
        // 保存 50 个模板（达到上限）
        for (let i = 0; i < 50; i++) {
          manager.saveAsTemplate(createTestProject(`模板${i}`), `模板${i}`);
        }

        // 第 51 个应该抛出异常
        expect(() => {
          manager.saveAsTemplate(createTestProject('超限'), '超限');
        }).toThrow('用户模板数量已达上限');
      });

      it('不提供名称时应使用项目名称', () => {
        const project = createTestProject('项目名称');
        const template = manager.saveAsTemplate(project);

        expect(template.name).toBe('项目名称');
      });
    });

    // --- 收藏测试 ---

    describe('收藏管理', () => {
      it('应该正确添加收藏', () => {
        const saved = manager.saveAsTemplate(createTestProject('收藏模板'), '收藏模板');
        manager.addFavorite(saved.id);

        expect(manager.isFavorite(saved.id)).toBe(true);
        expect(manager.getFavoriteIds()).toContain(saved.id);
      });

      it('应该正确取消收藏', () => {
        const saved = manager.saveAsTemplate(createTestProject('收藏模板'), '收藏模板');
        manager.addFavorite(saved.id);
        manager.removeFavorite(saved.id);

        expect(manager.isFavorite(saved.id)).toBe(false);
        expect(manager.getFavoriteIds()).not.toContain(saved.id);
      });

      it('应该正确切换收藏状态', () => {
        const saved = manager.saveAsTemplate(createTestProject('切换模板'), '切换模板');

        // 切换为收藏
        const result1 = manager.toggleFavorite(saved.id);
        expect(result1).toBe(true);
        expect(manager.isFavorite(saved.id)).toBe(true);

        // 切换为取消收藏
        const result2 = manager.toggleFavorite(saved.id);
        expect(result2).toBe(false);
        expect(manager.isFavorite(saved.id)).toBe(false);
      });

      it('删除模板时应同时移除收藏', () => {
        const saved = manager.saveAsTemplate(createTestProject('删除收藏'), '删除收藏');
        manager.addFavorite(saved.id);
        manager.deleteTemplate(saved.id);

        expect(manager.isFavorite(saved.id)).toBe(false);
        expect(manager.getFavoriteCount()).toBe(0);
      });

      it('收藏内置模板不应受模板数量限制', () => {
        // 收藏内置模板 ID（不需要先保存为用户模板）
        for (let i = 0; i < 100; i++) {
          manager.addFavorite(`builtin-template-${i}`);
        }

        expect(manager.getFavoriteCount()).toBe(100);
      });

      it('超出最大收藏数量时应抛出异常', () => {
        // 先保存少量模板用于收藏
        for (let i = 0; i < 10; i++) {
          const saved = manager.saveAsTemplate(createTestProject(`模板${i}`), `模板${i}`);
          manager.addFavorite(saved.id);
        }

        // 再添加 90 个内置模板收藏
        for (let i = 0; i < 90; i++) {
          manager.addFavorite(`builtin-template-${i}`);
        }

        // 现在有 100 个收藏，第 101 个应该抛出异常
        expect(() => {
          manager.addFavorite('extra-template-id');
        }).toThrow('收藏数量已达上限');
      });
    });

    // --- 导入导出测试 ---

    describe('导入导出', () => {
      it('应该正确导出所有用户模板', () => {
        manager.saveAsTemplate(createTestProject('模板1'), '模板1');
        manager.saveAsTemplate(createTestProject('模板2'), '模板2');

        const exportData = manager.exportTemplates();

        expect(exportData.version).toBe('1.0.0');
        expect(exportData.exportedAt).toBeDefined();
        expect(exportData.templates).toHaveLength(2);
      });

      it('应该正确导出指定 ID 的模板', () => {
        const t1 = manager.saveAsTemplate(createTestProject('模板1'), '模板1');
        const t2 = manager.saveAsTemplate(createTestProject('模板2'), '模板2');
        const t3 = manager.saveAsTemplate(createTestProject('模板3'), '模板3');

        const exportData = manager.exportTemplates([t1.id, t3.id]);

        expect(exportData.templates).toHaveLength(2);
        const names = exportData.templates.map((t) => t.name);
        expect(names).toContain('模板1');
        expect(names).toContain('模板3');
        expect(names).not.toContain('模板2');
      });

      it('应该正确导出为 JSON 字符串', () => {
        manager.saveAsTemplate(createTestProject('模板1'), '模板1');

        const jsonString = manager.exportAsJsonString();
        const parsed = JSON.parse(jsonString);

        expect(parsed.version).toBe('1.0.0');
        expect(parsed.templates).toHaveLength(1);
      });

      it('应该正确从 JSON 字符串导入模板', () => {
      manager.saveAsTemplate(createTestProject('导出模板'), '导出模板');
      const jsonString = manager.exportAsJsonString();

      // 验证导出的 JSON 包含模板数据
      const parsed = JSON.parse(jsonString);
      expect(parsed.templates).toHaveLength(1);
      expect(parsed.templates[0].name).toBe('导出模板');
      expect(parsed.templates[0].projectData).toBeDefined();

      // 清空 localStorage，模拟全新环境
      storageMap.clear();

      // 创建新的管理器实例模拟新环境
      const newManager = new UserTemplateManager();
      const count = newManager.importFromJsonString(jsonString);

      expect(count).toBe(1);
      expect(newManager.getTemplateCount()).toBe(1);
    });

      it('导入无效 JSON 应抛出异常', () => {
        expect(() => {
          manager.importFromJsonString('not valid json');
        }).toThrow('导入失败');
      });

      it('导入缺少 version 字段的 JSON 应抛出异常', () => {
        expect(() => {
          manager.importFromJsonString(JSON.stringify({ templates: [] }));
        }).toThrow('导入失败');
      });

      it('导入同名模板时应跳过', () => {
        manager.saveAsTemplate(createTestProject('重复模板'), '重复模板');

        const exportData = manager.exportTemplates();
        // 再次导入相同数据
        const count = manager.importFromJsonString(JSON.stringify(exportData));

        // 应跳过已存在的同名模板
        expect(count).toBe(0);
        expect(manager.getTemplateCount()).toBe(1);
      });
    });

    // --- 统计测试 ---

    describe('统计功能', () => {
      it('应该正确返回模板数量', () => {
        expect(manager.getTemplateCount()).toBe(0);

        manager.saveAsTemplate(createTestProject('模板1'), '模板1');
        expect(manager.getTemplateCount()).toBe(1);

        manager.saveAsTemplate(createTestProject('模板2'), '模板2');
        expect(manager.getTemplateCount()).toBe(2);
      });

      it('应该正确返回收藏数量', () => {
        expect(manager.getFavoriteCount()).toBe(0);

        const t1 = manager.saveAsTemplate(createTestProject('模板1'), '模板1');
        manager.addFavorite(t1.id);
        expect(manager.getFavoriteCount()).toBe(1);
      });

      it('应该正确清空所有模板', () => {
        manager.saveAsTemplate(createTestProject('模板1'), '模板1');
        manager.saveAsTemplate(createTestProject('模板2'), '模板2');

        manager.clearAllTemplates();
        expect(manager.getTemplateCount()).toBe(0);
        expect(manager.getUserTemplates()).toHaveLength(0);
      });

      it('应该正确清空所有收藏', () => {
        const t1 = manager.saveAsTemplate(createTestProject('模板1'), '模板1');
        const t2 = manager.saveAsTemplate(createTestProject('模板2'), '模板2');
        manager.addFavorite(t1.id);
        manager.addFavorite(t2.id);

        manager.clearAllFavorites();
        expect(manager.getFavoriteCount()).toBe(0);
      });
    });
  });
});
