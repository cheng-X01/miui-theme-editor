/**
 * MIUI Theme Editor - 用户模板管理器
 * 管理用户自定义模板的保存、加载、删除、导出和导入
 *
 * 功能：
 * - 保存当前项目为模板
 * - 加载用户模板
 * - 删除用户模板
 * - 导出/导入模板（JSON 格式）
 * - localStorage 持久化
 * - 收藏模板管理
 */

import type { ThemeProject } from '../../../shared/types';
import type { Template } from './index';

// ==================== 常量 ====================

/** 用户模板 localStorage 键名 */
const USER_TEMPLATES_STORAGE_KEY = 'miui-theme-editor-user-templates';

/** 用户收藏 localStorage 键名 */
const USER_FAVORITES_STORAGE_KEY = 'miui-theme-editor-user-favorites';

/** 最大用户模板数量 */
const MAX_USER_TEMPLATES = 50;

/** 最大收藏数量 */
const MAX_FAVORITES = 100;

// ==================== 类型定义 ====================

/** 用户模板存储数据（序列化格式） */
interface SerializedUserTemplate {
  /** 模板 ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 标签 */
  tags: string[];
  /** 完整项目数据 */
  projectData: ThemeProject;
  /** 创建时间 */
  createdAt: string;
  /** 缩略图（Base64） */
  preview: string;
}

/** 导出文件格式 */
export interface TemplateExportData {
  /** 导出格式版本 */
  version: string;
  /** 导出时间 */
  exportedAt: string;
  /** 导出的模板列表 */
  templates: SerializedUserTemplate[];
}

// ==================== UserTemplateManager ====================

/**
 * 用户模板管理器
 * 负责用户自定义模板的 CRUD 操作和持久化存储
 */
export class UserTemplateManager {
  /** 用户模板缓存 */
  private templates: Map<string, Template> = new Map();

  /** 收藏模板 ID 集合 */
  private favorites: Set<string> = new Set();

  /** 是否已从 localStorage 加载 */
  private loaded: boolean = false;

  // ==================== 初始化 ====================

  /**
   * 确保数据已从 localStorage 加载
   */
  private ensureLoaded(): void {
    if (!this.loaded) {
      this.loadFromStorage();
      this.loaded = true;
    }
  }

  // ==================== 模板 CRUD ====================

  /**
   * 保存当前项目为用户模板
   * @param project 主题项目
   * @param name 模板名称（可选，默认使用项目名称）
   * @param description 模板描述（可选）
   * @param tags 标签（可选）
   * @param preview 缩略图 Base64（可选）
   * @returns 保存后的模板
   */
  saveAsTemplate(
    project: ThemeProject,
    name?: string,
    description?: string,
    tags?: string[],
    preview?: string
  ): Template {
    this.ensureLoaded();

    // 检查模板数量限制
    if (this.templates.size >= MAX_USER_TEMPLATES) {
      throw new Error(`用户模板数量已达上限（${MAX_USER_TEMPLATES}个），请删除一些模板后再试`);
    }

    const templateId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const template: Template = {
      id: templateId,
      name: name || project.name || '未命名模板',
      author: '用户',
      description: description || project.description?.description || '用户自定义模板',
      preview: preview || '',
      tags: tags || ['自定义'],
      downloads: 0,
      rating: 0,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      projectData: { ...project },
    };

    this.templates.set(templateId, template);
    this.saveToStorage();

    return template;
  }

  /**
   * 获取所有用户模板
   * @returns 用户模板列表
   */
  getUserTemplates(): Template[] {
    this.ensureLoaded();
    return Array.from(this.templates.values());
  }

  /**
   * 根据 ID 获取用户模板
   * @param id 模板 ID
   * @returns 模板数据或 undefined
   */
  getTemplateById(id: string): Template | undefined {
    this.ensureLoaded();
    return this.templates.get(id);
  }

  /**
   * 删除用户模板
   * @param id 模板 ID
   * @returns 是否删除成功
   */
  deleteTemplate(id: string): boolean {
    this.ensureLoaded();

    const deleted = this.templates.delete(id);
    if (deleted) {
      // 同时从收藏中移除
      this.favorites.delete(id);
      this.saveToStorage();
      this.saveFavoritesToStorage();
    }

    return deleted;
  }

  /**
   * 更新用户模板
   * @param id 模板 ID
   * @param updates 要更新的字段
   * @returns 更新后的模板或 undefined
   */
  updateTemplate(id: string, updates: Partial<Template>): Template | undefined {
    this.ensureLoaded();

    const template = this.templates.get(id);
    if (!template) return undefined;

    const updated: Template = { ...template, ...updates };
    this.templates.set(id, updated);
    this.saveToStorage();

    return updated;
  }

  // ==================== 收藏管理 ====================

  /**
   * 获取所有收藏的模板 ID
   * @returns 收藏的模板 ID 列表
   */
  getFavoriteIds(): string[] {
    this.ensureLoaded();
    return Array.from(this.favorites);
  }

  /**
   * 检查模板是否已收藏
   * @param id 模板 ID
   * @returns 是否已收藏
   */
  isFavorite(id: string): boolean {
    this.ensureLoaded();
    return this.favorites.has(id);
  }

  /**
   * 切换模板收藏状态
   * @param id 模板 ID
   * @returns 切换后的收藏状态
   */
  toggleFavorite(id: string): boolean {
    this.ensureLoaded();

    if (this.favorites.has(id)) {
      this.favorites.delete(id);
    } else {
      if (this.favorites.size >= MAX_FAVORITES) {
        throw new Error(`收藏数量已达上限（${MAX_FAVORITES}个）`);
      }
      this.favorites.add(id);
    }

    this.saveFavoritesToStorage();
    return this.favorites.has(id);
  }

  /**
   * 添加收藏
   * @param id 模板 ID
   */
  addFavorite(id: string): void {
    this.ensureLoaded();

    if (this.favorites.size >= MAX_FAVORITES) {
      throw new Error(`收藏数量已达上限（${MAX_FAVORITES}个）`);
    }

    this.favorites.add(id);
    this.saveFavoritesToStorage();
  }

  /**
   * 取消收藏
   * @param id 模板 ID
   */
  removeFavorite(id: string): void {
    this.ensureLoaded();
    this.favorites.delete(id);
    this.saveFavoritesToStorage();
  }

  // ==================== 导出/导入 ====================

  /**
   * 导出用户模板为 JSON 数据
   * @param templateIds 要导出的模板 ID 列表（可选，默认导出全部）
   * @returns 导出数据
   */
  exportTemplates(templateIds?: string[]): TemplateExportData {
    this.ensureLoaded();

    const ids = templateIds || Array.from(this.templates.keys());
    const templatesToExport = ids
      .map((id) => this.templates.get(id))
      .filter((t): t is Template => !!t);

    const exportData: TemplateExportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      templates: templatesToExport.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        tags: t.tags,
        projectData: t.projectData!,
        createdAt: t.createdAt,
        preview: t.preview,
      })),
    };

    return exportData;
  }

  /**
   * 导出为 JSON 字符串
   * @param templateIds 要导出的模板 ID 列表
   * @returns JSON 字符串
   */
  exportAsJsonString(templateIds?: string[]): string {
    const data = this.exportTemplates(templateIds);
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导出为 JSON 文件并触发下载
   * @param templateIds 要导出的模板 ID 列表
   * @param filename 文件名（可选）
   */
  exportAsFile(templateIds?: string[], filename?: string): void {
    const jsonString = this.exportAsJsonString(templateIds);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `miui-theme-templates-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 从 JSON 字符串导入模板
   * @param jsonString JSON 字符串
   * @returns 导入的模板数量
   */
  importFromJsonString(jsonString: string): number {
    try {
      const data = JSON.parse(jsonString) as TemplateExportData;

      if (!data.version || !Array.isArray(data.templates)) {
        throw new Error('无效的模板文件格式');
      }

      return this.importTemplates(data.templates);
    } catch (error: any) {
      throw new Error(`导入失败: ${error.message}`);
    }
  }

  /**
   * 从文件导入模板
   * @param file 文件对象
   * @returns 导入的模板数量
   */
  async importFromFile(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonString = e.target?.result as string;
          const count = this.importFromJsonString(jsonString);
          resolve(count);
        } catch (error: any) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  /**
   * 批量导入模板
   * @param templates 模板数据列表
   * @returns 成功导入的数量
   */
  private importTemplates(templates: SerializedUserTemplate[]): number {
    this.ensureLoaded();

    let importedCount = 0;

    for (const serialized of templates) {
      // 检查数量限制
      if (this.templates.size >= MAX_USER_TEMPLATES) {
        console.warn('[UserTemplateManager] 模板数量已达上限，停止导入');
        break;
      }

      // 检查是否已存在同名模板
      const existingId = Array.from(this.templates.values()).find(
        (t) => t.name === serialized.name && !t.isBuiltIn
      )?.id;

      // 如果已存在，跳过或覆盖
      if (existingId) {
        // 跳过已存在的模板
        continue;
      }

      // 创建新模板
      const template: Template = {
        id: `user-imported-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: serialized.name,
        author: '用户（导入）',
        description: serialized.description,
        preview: serialized.preview || '',
        tags: [...serialized.tags, '导入'],
        downloads: 0,
        rating: 0,
        isBuiltIn: false,
        createdAt: serialized.createdAt || new Date().toISOString(),
        projectData: serialized.projectData,
      };

      this.templates.set(template.id, template);
      importedCount++;
    }

    this.saveToStorage();
    return importedCount;
  }

  // ==================== 持久化 ====================

  /**
   * 从 localStorage 加载数据
   */
  private loadFromStorage(): void {
    try {
      // 加载用户模板
      const templatesRaw = localStorage.getItem(USER_TEMPLATES_STORAGE_KEY);
      if (templatesRaw) {
        const templates = JSON.parse(templatesRaw) as SerializedUserTemplate[];
        for (const t of templates) {
          this.templates.set(t.id, {
            id: t.id,
            name: t.name,
            author: '用户',
            description: t.description,
            preview: t.preview || '',
            tags: t.tags || ['自定义'],
            downloads: 0,
            rating: 0,
            isBuiltIn: false,
            createdAt: t.createdAt,
            projectData: t.projectData,
          });
        }
      }

      // 加载收藏
      const favoritesRaw = localStorage.getItem(USER_FAVORITES_STORAGE_KEY);
      if (favoritesRaw) {
        const favorites = JSON.parse(favoritesRaw) as string[];
        this.favorites = new Set(favorites);
      }
    } catch (error) {
      console.error('[UserTemplateManager] 从 localStorage 加载数据失败:', error);
      // 加载失败时清空数据，避免使用损坏的数据
      this.templates.clear();
      this.favorites.clear();
    }
  }

  /**
   * 保存用户模板到 localStorage
   */
  private saveToStorage(): void {
    try {
      const serialized: SerializedUserTemplate[] = Array.from(this.templates.values()).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        tags: t.tags,
        projectData: t.projectData!,
        createdAt: t.createdAt,
        preview: t.preview,
      }));

      localStorage.setItem(USER_TEMPLATES_STORAGE_KEY, JSON.stringify(serialized));
    } catch (error) {
      console.error('[UserTemplateManager] 保存模板到 localStorage 失败:', error);
    }
  }

  /**
   * 保存收藏到 localStorage
   */
  private saveFavoritesToStorage(): void {
    try {
      const favoritesArray = Array.from(this.favorites);
      localStorage.setItem(USER_FAVORITES_STORAGE_KEY, JSON.stringify(favoritesArray));
    } catch (error) {
      console.error('[UserTemplateManager] 保存收藏到 localStorage 失败:', error);
    }
  }

  // ==================== 统计 ====================

  /**
   * 获取用户模板数量
   * @returns 模板数量
   */
  getTemplateCount(): number {
    this.ensureLoaded();
    return this.templates.size;
  }

  /**
   * 获取收藏数量
   * @returns 收藏数量
   */
  getFavoriteCount(): number {
    this.ensureLoaded();
    return this.favorites.size;
  }

  /**
   * 清空所有用户模板
   */
  clearAllTemplates(): void {
    this.ensureLoaded();
    this.templates.clear();
    this.saveToStorage();
  }

  /**
   * 清空所有收藏
   */
  clearAllFavorites(): void {
    this.ensureLoaded();
    this.favorites.clear();
    this.saveFavoritesToStorage();
  }
}

// ==================== 单例 ====================

/** 用户模板管理器单例实例 */
let managerInstance: UserTemplateManager | null = null;

/**
 * 获取用户模板管理器单例
 * @returns UserTemplateManager 实例
 */
export function getUserTemplateManager(): UserTemplateManager {
  if (!managerInstance) {
    managerInstance = new UserTemplateManager();
  }
  return managerInstance;
}
