/**
 * MIUI Theme Editor - MTZ 解析引擎
 * 负责解析 .mtz 主题包文件（本质是 ZIP 格式）
 * 提取 description.xml、theme_config.json 和各类资源文件
 */

// 修复：使用默认导入方式导入 JSZip，避免 ESM/CJS 混用问题
import JSZip from 'jszip';
// 修复：使用命名导入方式导入 path 模块
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { v4 as uuidv4 } from 'uuid';
import type {
  ThemeProject,
  ThemeDescription,
  ThemeResources,
  IconResource,
  WallpaperResource,
  FontResource,
  SoundResource,
  LockscreenResource,
  StatusbarResource,
  MAMLModule,
} from '../../shared/types';

// ==================== 类型定义 ====================

/** 解析选项 */
export interface ParseOptions {
  /** 是否解析图标预览 */
  parseIconPreviews?: boolean;
  /** 是否解析壁纸预览 */
  parseWallpaperPreviews?: boolean;
  /** 是否解析 MAML 源代码 */
  parseMAMLSource?: boolean;
  /** 最大解析文件大小（字节） */
  maxFileSize?: number;
}

/** 解析结果 */
export interface ParseResult {
  /** 解析后的主题项目 */
  project: ThemeProject;
  /** 原始文件映射（路径 → Buffer） */
  rawFiles: Map<string, Buffer>;
  /** 解析过程中的警告信息 */
  warnings: string[];
}

// ==================== MTZ 解析器 ====================

export class MTZParser {
  private xmlParser: XMLParser;

  constructor() {
    // 初始化 XML 解析器
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      allowBooleanAttributes: true,
      parseTagValue: false,
    });
  }

  /**
   * 解析 MTZ 主题包
   * @param buffer MTZ 文件的 Buffer 数据
   * @param options 解析选项
   * @returns 解析结果
   */
  async parse(buffer: Buffer, options: ParseOptions = {}): Promise<ParseResult> {
    const warnings: string[] = [];
    const rawFiles = new Map<string, Buffer>();

    // 1. 解压 ZIP 文件
    const zip = await JSZip.loadAsync(buffer);

    // 遍历所有文件，存入 rawFiles（带大小限制防止 ZIP 炸弹）
    const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB 总解压大小限制
    const MAX_FILE_SIZE = options.maxFileSize || 50 * 1024 * 1024; // 单文件 50MB 限制
    let totalSize = 0;

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir) {
        // 检查路径遍历
        if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
          warnings.push(`跳过可疑路径: ${relativePath}`);
          continue;
        }

        // 检查单个文件大小
        const uncompressedSize = (zipEntry as any)._data?.uncompressedSize || 0;
        if (uncompressedSize > MAX_FILE_SIZE) {
          warnings.push(`文件过大，跳过: ${relativePath} (${(uncompressedSize / 1024 / 1024).toFixed(1)}MB)`);
          continue;
        }

        const data = await zipEntry.async('nodebuffer');
        totalSize += data.length;

        // 检查总大小
        if (totalSize > MAX_TOTAL_SIZE) {
          warnings.push(`总解压大小超过限制 (${(totalSize / 1024 / 1024).toFixed(1)}MB)，停止解析`);
          break;
        }

        rawFiles.set(relativePath, data);
      }
    }

    // 2. 验证 MTZ 结构
    this.validateStructure(zip, warnings);

    // 3. 解析 description.xml
    const description = await this.parseDescriptionXml(zip, warnings);

    // 4. 解析 theme_config.json（如果存在）
    const themeConfig = await this.parseThemeConfig(zip, warnings);

    // 5. 解析各类资源
    const resources = await this.parseResources(zip, options, warnings);

    // 6. 解析 MAML 模块
    const mamlModules = await this.parseMAML(zip, options, warnings);
    resources.mamlModules = mamlModules;

    // 7. 构建主题项目
    const project: ThemeProject = {
      id: uuidv4(),
      name: description.name,
      description: { ...description, ...themeConfig },
      resources,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDirty: false,
    };

    return { project, rawFiles, warnings };
  }

  /**
   * 验证 MTZ 包的基本结构
   */
  private validateStructure(zip: JSZip, warnings: string[]): void {
    const fileNames = Object.keys(zip.files);

    // 检查是否包含 description.xml
    if (!fileNames.some((name) => name.endsWith('description.xml'))) {
      warnings.push('MTZ 包中未找到 description.xml，将使用默认值');
    }

    // 检查是否包含基本目录结构
    const expectedDirs = ['icons', 'wallpaper', 'lockscreen'];
    for (const dir of expectedDirs) {
      if (!fileNames.some((name) => name.startsWith(dir))) {
        warnings.push(`MTZ 包中未找到 ${dir} 目录`);
      }
    }
  }

  /**
   * 解析 description.xml
   * MIUI 主题的核心描述文件
   */
  private async parseDescriptionXml(
    zip: JSZip,
    warnings: string[]
  ): Promise<ThemeDescription> {
    // 默认描述值
    const defaultDescription: ThemeDescription = {
      name: '未命名主题',
      author: '未知作者',
      version: '1.0.0',
      description: '',
      uiVersion: 'V12',
      designWidth: 1080,
      designHeight: 2400,
      supportsDarkMode: false,
      minMIUIVersion: '12.0.0',
    };

    // 查找 description.xml
    const descFile = Object.keys(zip.files).find((name) =>
      name.endsWith('description.xml')
    );

    if (!descFile) {
      return defaultDescription;
    }

    try {
      const xmlContent = zip.files[descFile];
      const text = xmlContent ? await xmlContent.async('text') : '';
      
      if (!text) return defaultDescription;

      const parsed = this.xmlParser.parse(text);
      const theme = parsed.theme || parsed.MIUI_Theme || parsed;

      return {
        name: theme.name || theme.title || defaultDescription.name,
        author: theme.author || theme.designer || defaultDescription.author,
        version: theme.version || theme.ver || defaultDescription.version,
        description: theme.description || theme.desc || defaultDescription.description,
        uiVersion: theme.uiVersion || theme.ui_version || defaultDescription.uiVersion,
        designWidth: parseInt(theme.designWidth || theme.design_width || String(defaultDescription.designWidth)) || defaultDescription.designWidth,
        designHeight: parseInt(theme.designHeight || theme.design_height || String(defaultDescription.designHeight)) || defaultDescription.designHeight,
        supportsDarkMode: theme.supportsDarkMode === 'true' || theme.darkMode === 'true',
        minMIUIVersion: theme.minMIUIVersion || theme.min_version || defaultDescription.minMIUIVersion,
        category: theme.category,
        tags: theme.tags ? (Array.isArray(theme.tags) ? theme.tags : [theme.tags]) : [],
      };
    } catch (error: any) {
      warnings.push(`解析 description.xml 失败: ${error.message}`);
      return defaultDescription;
    }
  }

  /**
   * 解析 theme_config.json（MIUI V12+ 新配置格式）
   */
  private async parseThemeConfig(
    zip: JSZip,
    warnings: string[]
  ): Promise<Partial<ThemeDescription>> {
    const configFile = 'theme_config.json';
    const entry = zip.files[configFile];

    if (!entry) {
      return {};
    }

    try {
      const content = await entry.async('text');
      return JSON.parse(content);
    } catch (error: any) {
      warnings.push(`解析 theme_config.json 失败: ${error.message}`);
      return {};
    }
  }

  /**
   * 解析各类资源文件
   */
  private async parseResources(
    zip: JSZip,
    options: ParseOptions,
    warnings: string[]
  ): Promise<ThemeResources> {
    const fileNames = Object.keys(zip.files);

    // 解析图标资源
    const icons = await this.parseIcons(zip, fileNames, options, warnings);

    // 解析壁纸资源
    const wallpapers = await this.parseWallpapers(zip, fileNames, options, warnings);

    // 解析字体资源
    const fonts = await this.parseFonts(zip, fileNames, warnings);

    // 解析声音资源
    const sounds = await this.parseSounds(zip, fileNames, warnings);

    // 解析锁屏资源
    const lockscreens = await this.parseLockscreens(zip, fileNames, warnings);

    // 解析状态栏配置
    const statusbar = await this.parseStatusbar(zip, fileNames, warnings);

    return {
      icons,
      wallpapers,
      fonts,
      sounds,
      lockscreens,
      statusbar,
      mamlModules: [],
    };
  }

  /**
   * 解析图标资源
   * 图标通常位于 icons/ 目录下，按组件名组织
   */
  private async parseIcons(
    zip: JSZip,
    fileNames: string[],
    options: ParseOptions,
    warnings: string[]
  ): Promise<IconResource[]> {
    const icons: IconResource[] = [];
    const iconFiles = fileNames.filter(
      (name) =>
        name.startsWith('icons/') &&
        (name.endsWith('.png') || name.endsWith('.webp'))
    );

    for (const filePath of iconFiles) {
      try {
        // 从路径提取组件名：icons/com.android.settings.png → com.android.settings
        const componentName = path
          .basename(filePath, path.extname(filePath))
          .replace(/_[0-9]+$/, ''); // 去除尺寸后缀

        const icon: IconResource = {
          componentName,
          filePath,
        };

        // 如果需要预览，读取文件数据
        if (options.parseIconPreviews) {
          const data = await zip.files[filePath].async('nodebuffer');
          icon.previewData = data.toString('base64');
        }

        icons.push(icon);
      } catch (error: any) {
        warnings.push(`解析图标 ${filePath} 失败: ${error.message}`);
      }
    }

    return icons;
  }

  /**
   * 解析壁纸资源
   * 壁纸位于 wallpaper/ 目录下
   */
  private async parseWallpapers(
    zip: JSZip,
    fileNames: string[],
    options: ParseOptions,
    warnings: string[]
  ): Promise<WallpaperResource[]> {
    const wallpapers: WallpaperResource[] = [];
    const wallpaperFiles = fileNames.filter(
      (name) =>
        (name.startsWith('wallpaper/') || name.startsWith('preview/')) &&
        (name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.webp'))
    );

    for (const filePath of wallpaperFiles) {
      try {
        const isLockscreen = filePath.toLowerCase().includes('lock');
        const name = path.basename(filePath, path.extname(filePath));

        const wallpaper: WallpaperResource = {
          name,
          filePath,
          type: isLockscreen ? 'lockscreen' : 'homescreen',
        };

        if (options.parseWallpaperPreviews) {
          const data = await zip.files[filePath].async('nodebuffer');
          wallpaper.previewData = data.toString('base64');
        }

        wallpapers.push(wallpaper);
      } catch (error: any) {
        warnings.push(`解析壁纸 ${filePath} 失败: ${error.message}`);
      }
    }

    return wallpapers;
  }

  /**
   * 解析字体资源
   * 字体位于 fonts/ 或 font/ 目录下
   */
  private async parseFonts(
    zip: JSZip,
    fileNames: string[],
    warnings: string[]
  ): Promise<FontResource[]> {
    const fonts: FontResource[] = [];
    const fontFiles = fileNames.filter(
      (name) =>
        (name.startsWith('fonts/') || name.startsWith('font/')) &&
        (name.endsWith('.ttf') || name.endsWith('.otf') || name.endsWith('.ttc'))
    );

    for (const filePath of fontFiles) {
      try {
        const name = path.basename(filePath, path.extname(filePath));

        // 根据文件名推断字体类型
        let type: FontResource['type'] = 'regular';
        const lowerName = name.toLowerCase();
        if (lowerName.includes('bold') && lowerName.includes('italic')) {
          type = 'bold-italic';
        } else if (lowerName.includes('bold')) {
          type = 'bold';
        } else if (lowerName.includes('italic')) {
          type = 'italic';
        } else if (lowerName.includes('light')) {
          type = 'light';
        } else if (lowerName.includes('thin')) {
          type = 'thin';
        }

        const entry = zip.files[filePath];
        const data = await entry.async('nodebuffer');

        fonts.push({
          name,
          filePath,
          type,
          fileSize: data.length,
        });
      } catch (error: any) {
        warnings.push(`解析字体 ${filePath} 失败: ${error.message}`);
      }
    }

    return fonts;
  }

  /**
   * 解析声音资源
   * 声音位于 audio/ 或 sound/ 目录下
   */
  private async parseSounds(
    zip: JSZip,
    fileNames: string[],
    warnings: string[]
  ): Promise<SoundResource[]> {
    const sounds: SoundResource[] = [];
    const soundFiles = fileNames.filter(
      (name) =>
        (name.startsWith('audio/') || name.startsWith('sound/')) &&
        (name.endsWith('.mp3') || name.endsWith('.ogg') || name.endsWith('.wav'))
    );

    for (const filePath of soundFiles) {
      try {
        const name = path.basename(filePath, path.extname(filePath));

        // 根据目录或文件名推断声音类型
        let type: SoundResource['type'] = 'notification';
        const lowerPath = filePath.toLowerCase();
        if (lowerPath.includes('ringtone') || lowerPath.includes('ring')) {
          type = 'ringtone';
        } else if (lowerPath.includes('alarm')) {
          type = 'alarm';
        }

        sounds.push({
          name,
          filePath,
          type,
        });
      } catch (error: any) {
        warnings.push(`解析声音 ${filePath} 失败: ${error.message}`);
      }
    }

    return sounds;
  }

  /**
   * 解析锁屏资源
   * 锁屏位于 lockscreen/ 目录下
   */
  private async parseLockscreens(
    zip: JSZip,
    fileNames: string[],
    warnings: string[]
  ): Promise<LockscreenResource[]> {
    const lockscreens: LockscreenResource[] = [];
    const lockscreenFiles = fileNames.filter(
      (name) =>
        name.startsWith('lockscreen/') &&
        (name.endsWith('.zip') || name.endsWith('.mtz') || name.endsWith('.lock'))
    );

    for (const filePath of lockscreenFiles) {
      try {
        const name = path.basename(filePath, path.extname(filePath));
        const isAOD = filePath.toLowerCase().includes('aod') || filePath.toLowerCase().includes('always');

        lockscreens.push({
          name,
          filePath,
          type: isAOD ? 'always-on-display' : 'lockscreen',
          supportsPassword: true, // 默认支持
        });
      } catch (error: any) {
        warnings.push(`解析锁屏 ${filePath} 失败: ${error.message}`);
      }
    }

    return lockscreens;
  }

  /**
   * 解析状态栏配置
   * 状态栏配置通常在 description.xml 或单独的配置文件中
   */
  private async parseStatusbar(
    zip: JSZip,
    fileNames: string[],
    warnings: string[]
  ): Promise<StatusbarResource> {
    const statusbar: StatusbarResource = {
      showCarrier: true,
    };

    // 检查状态栏图标样式文件
    const statusbarIconFile = fileNames.find(
      (name) => name.startsWith('statusbar/') && name.endsWith('.png')
    );
    if (statusbarIconFile) {
      statusbar.iconStyle = statusbarIconFile;
    }

    // 检查状态栏配置文件
    const statusbarConfigFile = fileNames.find(
      (name) => name.startsWith('statusbar/') && name.endsWith('.json')
    );
    if (statusbarConfigFile) {
      try {
        const entry = zip.files[statusbarConfigFile];
        const text = entry ? await entry.async('text') : '';
        if (text) {
          const config = JSON.parse(text);
          Object.assign(statusbar, config);
        }
      } catch {
        warnings.push(`解析状态栏配置 ${statusbarConfigFile} 失败`);
      }
    }

    return statusbar;
  }

  /**
   * 解析 MAML 模块
   * MAML（MIUI Animation Markup Language）是小米的动画标记语言
   */
  private async parseMAML(
    zip: JSZip,
    options: ParseOptions,
    warnings: string[]
  ): Promise<MAMLModule[]> {
    const modules: MAMLModule[] = [];
    const mamlFiles = Object.keys(zip.files).filter(
      (name) =>
        name.endsWith('.manifest') ||
        name.endsWith('.maml') ||
        (name.endsWith('.xml') && (name.includes('lockscreen/') || name.includes('maml/')))
    );

    for (const filePath of mamlFiles) {
      try {
        const name = path.basename(filePath, path.extname(filePath));

        // 推断模块类型
        let type: MAMLModule['type'] = 'other';
        const lowerPath = filePath.toLowerCase();
        if (lowerPath.includes('lockscreen')) {
          type = 'lockscreen';
        } else if (lowerPath.includes('homescreen') || lowerPath.includes('home')) {
          type = 'homescreen';
        } else if (lowerPath.includes('widget')) {
          type = 'widget';
        }

        const module: MAMLModule = {
          name,
          type,
          filePath,
        };

        // 如果需要解析源代码
        if (options.parseMAMLSource) {
          const content = await zip.files[filePath].async('text');
          module.sourceCode = content;
        }

        modules.push(module);
      } catch (error: any) {
        warnings.push(`解析 MAML 模块 ${filePath} 失败: ${error.message}`);
      }
    }

    return modules;
  }
}
