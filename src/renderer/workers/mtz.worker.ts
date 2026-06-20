/**
 * MIUI Theme Editor - MTZ Web Worker
 *
 * 在 Web Worker 中执行 MTZ 打包/解析等 CPU 密集型操作，
 * 避免阻塞主线程，提升应用响应性能。
 *
 * 通信方式：原生 postMessage（不依赖 Comlink，减少依赖）
 * 支持操作：
 * - packMTZ：将 ThemeProject 打包为 MTZ 文件 Buffer
 * - parseMTZ：将 MTZ 文件 Buffer 解析为 ThemeProject
 */

import JSZip from 'jszip';
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
} from '../../shared/types/index';

// ==================== Worker 消息类型 ====================

/** Worker 支持的操作类型 */
type WorkerAction = 'pack' | 'parse';

/** Worker 请求消息 */
interface WorkerRequest {
  /** 请求唯一 ID */
  id: string;
  /** 操作类型 */
  action: WorkerAction;
  /** 操作数据 */
  payload: any;
  /** 选项 */
  options?: any;
}

/** Worker 成功响应 */
interface WorkerSuccessResponse {
  id: string;
  success: true;
  data: any;
}

/** Worker 错误响应 */
interface WorkerErrorResponse {
  id: string;
  success: false;
  error: string;
}

type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

// ==================== 打包实现 ====================

/**
 * 在 Worker 中打包 MTZ 文件
 */
async function packMTZInWorker(
  project: ThemeProject,
  options: {
    compress?: boolean;
    compressionLevel?: number;
    includePreviews?: boolean;
  } = {}
): Promise<{ buffer: Uint8Array; size: number; files: string[] }> {
  const {
    compress = true,
    compressionLevel = 6,
    includePreviews = true,
  } = options;

  const zip = new JSZip();
  const files: string[] = [];

  // 1. 生成并添加 description.xml
  const descriptionXml = generateDescriptionXml(project.description);
  zip.file('description.xml', descriptionXml, {
    compression: compress ? 'DEFLATE' : 'STORE',
    compressionOptions: { level: compressionLevel },
  });
  files.push('description.xml');

  // 2. 生成并添加 theme_config.json
  const themeConfig = generateThemeConfig(project.description);
  zip.file('theme_config.json', JSON.stringify(themeConfig, null, 2), {
    compression: compress ? 'DEFLATE' : 'STORE',
    compressionOptions: { level: compressionLevel },
  });
  files.push('theme_config.json');

  // 3. 添加图标资源
  for (const icon of project.resources.icons) {
    if (icon.previewData) {
      const buffer = Buffer.from(icon.previewData, 'base64');
      zip.file(icon.filePath, buffer, {
        compression: compress ? 'DEFLATE' : 'STORE',
        compressionOptions: { level: compressionLevel },
      });
      files.push(icon.filePath);
    }
  }

  // 4. 添加壁纸资源
  for (const wallpaper of project.resources.wallpapers) {
    if (wallpaper.previewData) {
      const buffer = Buffer.from(wallpaper.previewData, 'base64');
      zip.file(wallpaper.filePath, buffer, {
        compression: compress ? 'DEFLATE' : 'STORE',
        compressionOptions: { level: compressionLevel },
      });
    }
    files.push(wallpaper.filePath);
  }

  // 5. 添加字体资源（仅记录路径）
  for (const font of project.resources.fonts) {
    files.push(font.filePath);
  }

  // 6. 添加声音资源（仅记录路径）
  for (const sound of project.resources.sounds) {
    files.push(sound.filePath);
  }

  // 7. 添加锁屏资源（仅记录路径）
  for (const lockscreen of project.resources.lockscreens) {
    files.push(lockscreen.filePath);
  }

  // 8. 添加状态栏配置
  const statusbarConfig = {
    iconStyle: project.resources.statusbar.iconStyle,
    bgColor: project.resources.statusbar.bgColor,
    textColor: project.resources.statusbar.textColor,
    showCarrier: project.resources.statusbar.showCarrier,
    networkSpeedStyle: project.resources.statusbar.networkSpeedStyle,
  };
  const configPath = 'statusbar/config.json';
  zip.file(configPath, JSON.stringify(statusbarConfig, null, 2), {
    compression: compress ? 'DEFLATE' : 'STORE',
    compressionOptions: { level: compressionLevel },
  });
  files.push(configPath);

  // 9. 添加 MAML 模块
  for (const module of project.resources.mamlModules) {
    if (module.sourceCode) {
      zip.file(module.filePath, module.sourceCode, {
        compression: compress ? 'DEFLATE' : 'STORE',
        compressionOptions: { level: compressionLevel },
      });
    }
    files.push(module.filePath);
  }

  // 10. 生成 ZIP 缓冲区
  const buffer = await zip.generateAsync({
    type: 'uint8array',
    compression: compress ? 'DEFLATE' : 'STORE',
    compressionOptions: { level: compressionLevel },
  });

  return {
    buffer,
    size: buffer.length,
    files,
  };
}

/**
 * 生成 description.xml 内容
 */
function generateDescriptionXml(desc: ThemeDescription): string {
  const escapeXml = (str: string): string =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<MIUI_Theme version="2">
  <name>${escapeXml(desc.name)}</name>
  <author>${escapeXml(desc.author)}</author>
  <version>${escapeXml(desc.version)}</version>
  <description>${escapeXml(desc.description)}</description>
  <uiVersion>${escapeXml(desc.uiVersion)}</uiVersion>
  <designWidth>${desc.designWidth}</designWidth>
  <designHeight>${desc.designHeight}</designHeight>
  <supportsDarkMode>${desc.supportsDarkMode}</supportsDarkMode>
  <minMIUIVersion>${escapeXml(desc.minMIUIVersion)}</minMIUIVersion>
  ${desc.category ? `<category>${escapeXml(desc.category)}</category>` : ''}
  ${desc.tags && desc.tags.length > 0 ? `<tags>${desc.tags.map((t) => escapeXml(t)).join(',')}</tags>` : ''}
</MIUI_Theme>`;
}

/**
 * 生成 theme_config.json 内容
 */
function generateThemeConfig(desc: ThemeDescription): object {
  const config: any = {
    name: desc.name,
    author: desc.author,
    version: desc.version,
    description: desc.description,
    uiVersion: desc.uiVersion,
    designWidth: desc.designWidth,
    designHeight: desc.designHeight,
    supportsDarkMode: desc.supportsDarkMode,
    minMIUIVersion: desc.minMIUIVersion,
  };

  if (desc.category) {
    config.category = desc.category;
  }
  if (desc.tags && desc.tags.length > 0) {
    config.tags = desc.tags;
  }

  return config;
}

// ==================== 解析实现 ====================

/**
 * 在 Worker 中解析 MTZ 文件
 */
async function parseMTZInWorker(
  buffer: ArrayBuffer,
  options: {
    parseIconPreviews?: boolean;
    parseWallpaperPreviews?: boolean;
    parseMAMLSource?: boolean;
  } = {}
): Promise<{
  project: ThemeProject;
  rawFiles: Array<{ path: string; data: Uint8Array }>;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const rawFiles: Array<{ path: string; data: Uint8Array }> = [];

  // 1. 解压 ZIP 文件
  const zip = await JSZip.loadAsync(buffer);

  // 遍历所有文件
  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (!zipEntry.dir) {
      const data = await zipEntry.async('uint8array');
      rawFiles.push({ path: relativePath, data });
    }
  }

  // 2. 验证 MTZ 结构
  const fileNames = Object.keys(zip.files);
  if (!fileNames.some((name) => name.endsWith('description.xml'))) {
    warnings.push('MTZ 包中未找到 description.xml，将使用默认值');
  }

  // 3. 解析 description.xml
  const description = await parseDescriptionXml(zip, warnings);

  // 4. 解析 theme_config.json
  const themeConfig = await parseThemeConfig(zip, warnings);

  // 5. 解析各类资源
  const resources = await parseResources(zip, fileNames, options, warnings);

  // 6. 解析 MAML 模块
  const mamlModules = await parseMAML(zip, fileNames, options, warnings);
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
 * 解析 description.xml
 */
async function parseDescriptionXml(
  zip: JSZip,
  warnings: string[]
): Promise<ThemeDescription> {
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

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      allowBooleanAttributes: true,
      parseTagValue: false,
    });
    const parsed = parser.parse(text);
    const theme = parsed.theme || parsed.MIUI_Theme || parsed;

    return {
      name: theme.name || theme.title || defaultDescription.name,
      author: theme.author || theme.designer || defaultDescription.author,
      version: theme.version || theme.ver || defaultDescription.version,
      description: theme.description || theme.desc || defaultDescription.description,
      uiVersion: theme.uiVersion || theme.ui_version || defaultDescription.uiVersion,
      designWidth: parseInt(theme.designWidth || theme.design_width || String(defaultDescription.designWidth)),
      designHeight: parseInt(theme.designHeight || theme.design_height || String(defaultDescription.designHeight)),
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
 * 解析 theme_config.json
 */
async function parseThemeConfig(
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
async function parseResources(
  zip: JSZip,
  fileNames: string[],
  options: {
    parseIconPreviews?: boolean;
    parseWallpaperPreviews?: boolean;
  },
  warnings: string[]
): Promise<ThemeResources> {
  const icons = await parseIcons(zip, fileNames, options, warnings);
  const wallpapers = await parseWallpapers(zip, fileNames, options, warnings);
  const fonts = await parseFonts(zip, fileNames, warnings);
  const sounds = await parseSounds(zip, fileNames, warnings);
  const lockscreens = await parseLockscreens(zip, fileNames, warnings);
  const statusbar = await parseStatusbar(zip, fileNames, warnings);

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
 */
async function parseIcons(
  zip: JSZip,
  fileNames: string[],
  options: { parseIconPreviews?: boolean },
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
      const componentName = filePath
        .replace(/^icons\//, '')
        .replace(/\.(png|webp)$/, '')
        .replace(/_[0-9]+$/, '');

      const icon: IconResource = {
        componentName,
        filePath,
      };

      if (options.parseIconPreviews) {
        const data = await zip.files[filePath].async('nodebuffer');
        icon.previewData = Buffer.from(data).toString('base64');
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
 */
async function parseWallpapers(
  zip: JSZip,
  fileNames: string[],
  options: { parseWallpaperPreviews?: boolean },
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
      const name = filePath.replace(/^.*\//, '').replace(/\.(jpg|png|webp)$/, '');

      const wallpaper: WallpaperResource = {
        name,
        filePath,
        type: isLockscreen ? 'lockscreen' : 'homescreen',
      };

      if (options.parseWallpaperPreviews) {
        const data = await zip.files[filePath].async('nodebuffer');
        wallpaper.previewData = Buffer.from(data).toString('base64');
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
 */
async function parseFonts(
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
      const name = filePath.replace(/^.*\//, '').replace(/\.(ttf|otf|ttc)$/, '');

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
 */
async function parseSounds(
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
      const name = filePath.replace(/^.*\//, '').replace(/\.(mp3|ogg|wav)$/, '');

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
 */
async function parseLockscreens(
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
      const name = filePath.replace(/^.*\//, '').replace(/\.(zip|mtz|lock)$/, '');
      const isAOD = filePath.toLowerCase().includes('aod') || filePath.toLowerCase().includes('always');

      lockscreens.push({
        name,
        filePath,
        type: isAOD ? 'always-on-display' : 'lockscreen',
        supportsPassword: true,
      });
    } catch (error: any) {
      warnings.push(`解析锁屏 ${filePath} 失败: ${error.message}`);
    }
  }

  return lockscreens;
}

/**
 * 解析状态栏配置
 */
async function parseStatusbar(
  zip: JSZip,
  fileNames: string[],
  warnings: string[]
): Promise<StatusbarResource> {
  const statusbar: StatusbarResource = {
    showCarrier: true,
  };

  const statusbarIconFile = fileNames.find(
    (name) => name.startsWith('statusbar/') && name.endsWith('.png')
  );
  if (statusbarIconFile) {
    statusbar.iconStyle = statusbarIconFile;
  }

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
 */
async function parseMAML(
  zip: JSZip,
  fileNames: string[],
  options: { parseMAMLSource?: boolean },
  warnings: string[]
): Promise<MAMLModule[]> {
  const modules: MAMLModule[] = [];
  const mamlFiles = fileNames.filter(
    (name) =>
      name.endsWith('.manifest') ||
      name.endsWith('.maml') ||
      (name.endsWith('.xml') && (name.includes('lockscreen/') || name.includes('maml/')))
  );

  for (const filePath of mamlFiles) {
    try {
      const name = filePath.replace(/^.*\//, '').replace(/\.(manifest|maml|xml)$/, '');

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

// ==================== Worker 消息处理 ====================

/**
 * 处理 Worker 消息
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, action, payload, options } = event.data;

  try {
    let result: any;

    switch (action) {
      case 'pack': {
        result = await packMTZInWorker(payload, options);
        break;
      }
      case 'parse': {
        result = await parseMTZInWorker(payload, options);
        break;
      }
      default: {
        throw new Error(`不支持的操作类型: ${action}`);
      }
    }

    const response: WorkerSuccessResponse = {
      id,
      success: true,
      data: result,
    };

    self.postMessage(response);
  } catch (error: any) {
    const response: WorkerErrorResponse = {
      id,
      success: false,
      error: error.message || String(error),
    };

    self.postMessage(response);
  }
};

// ==================== 主线程 API 封装 ====================

/**
 * MTZ Worker 客户端
 *
 * 封装 Worker 的创建和通信，提供 Promise 化的 API。
 */
class MTZWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests: Map<
    string,
    { resolve: (value: any) => void; reject: (reason: any) => void }
  > = new Map();
  private requestId = 0;

  /**
   * 获取或创建 Worker 实例
   */
  private getWorker(): Worker {
    if (!this.worker) {
      // 使用 Vite 的 ?worker 导入方式
      this.worker = new Worker(new URL('./mtz.worker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { id, success } = event.data;
        const pending = this.pendingRequests.get(id);

        if (pending) {
          this.pendingRequests.delete(id);
          if (success) {
            pending.resolve((event.data as WorkerSuccessResponse).data);
          } else {
            pending.reject(new Error((event.data as WorkerErrorResponse).error));
          }
        }
      };

      this.worker.onerror = (error) => {
        console.error('[MTZWorker] Worker 错误:', error);
      };
    }

    return this.worker;
  }

  /**
   * 发送请求到 Worker
   */
  private sendRequest(action: WorkerAction, payload: any, options?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-${++this.requestId}`;
      this.pendingRequests.set(id, { resolve, reject });

      try {
        this.getWorker().postMessage({ id, action, payload, options });
      } catch (error) {
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  /**
   * 在 Worker 中打包 MTZ 文件
   */
  public async packMTZ(
    project: ThemeProject,
    options?: { compress?: boolean; compressionLevel?: number }
  ): Promise<{ buffer: Uint8Array; size: number; files: string[] }> {
    return this.sendRequest('pack', project, options);
  }

  /**
   * 在 Worker 中解析 MTZ 文件
   */
  public async parseMTZ(
    buffer: ArrayBuffer,
    options?: { parseIconPreviews?: boolean; parseWallpaperPreviews?: boolean; parseMAMLSource?: boolean }
  ): Promise<{ project: ThemeProject; rawFiles: Array<{ path: string; data: Uint8Array }>; warnings: string[] }> {
    return this.sendRequest('parse', buffer, options);
  }

  /**
   * 终止 Worker
   */
  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.pendingRequests.clear();
    }
  }
}

/** 全局 MTZ Worker 客户端实例 */
const mtzWorkerClient = new MTZWorkerClient();

// ==================== 导出 API ====================

/**
 * 在 Web Worker 中打包 MTZ 文件
 *
 * @param project 主题项目数据
 * @param options 打包选项
 * @returns 打包结果
 */
export async function packMTZInWorker(
  project: ThemeProject,
  options?: { compress?: boolean; compressionLevel?: number }
): Promise<{ buffer: Uint8Array; size: number; files: string[] }> {
  return mtzWorkerClient.packMTZ(project, options);
}

/**
 * 在 Web Worker 中解析 MTZ 文件
 *
 * @param buffer MTZ 文件数据
 * @param options 解析选项
 * @returns 解析结果
 */
export async function parseMTZInWorker(
  buffer: ArrayBuffer,
  options?: { parseIconPreviews?: boolean; parseWallpaperPreviews?: boolean; parseMAMLSource?: boolean }
): Promise<{ project: ThemeProject; rawFiles: Array<{ path: string; data: Uint8Array }>; warnings: string[] }> {
  return mtzWorkerClient.parseMTZ(buffer, options);
}

/**
 * 终止 MTZ Worker（释放资源）
 */
export function terminateMTZWorker(): void {
  mtzWorkerClient.terminate();
}

export default mtzWorkerClient;
