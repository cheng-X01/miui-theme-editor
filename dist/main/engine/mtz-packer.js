"use strict";
/**
 * MIUI Theme Editor - MTZ 打包引擎
 * 负责将主题项目数据打包为 .mtz 文件（ZIP 格式）
 * 生成 description.xml、theme_config.json 并添加各类资源
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTZPacker = void 0;
const JSZip = __importStar(require("jszip"));
// ==================== MTZ 打包器 ====================
class MTZPacker {
    /**
     * 打包主题项目为 MTZ 文件
     * @param project 主题项目数据
     * @param options 打包选项
     * @returns 打包结果
     */
    async pack(project, options = {}) {
        const { compress = true, compressionLevel = 6, includePreviews = true, } = options;
        const zip = new JSZip();
        const files = [];
        // 1. 生成并添加 description.xml
        const descriptionXml = this.generateDescriptionXml(project.description);
        zip.file('description.xml', descriptionXml, {
            compression: compress ? 'DEFLATE' : 'STORE',
            compressionOptions: { level: compressionLevel },
        });
        files.push('description.xml');
        // 2. 生成并添加 theme_config.json
        const themeConfig = this.generateThemeConfig(project.description);
        zip.file('theme_config.json', JSON.stringify(themeConfig, null, 2), {
            compression: compress ? 'DEFLATE' : 'STORE',
            compressionOptions: { level: compressionLevel },
        });
        files.push('theme_config.json');
        // 3. 添加图标资源
        this.addIcons(zip, project.resources.icons, compress, compressionLevel, files);
        // 4. 添加壁纸资源
        this.addWallpapers(zip, project.resources.wallpapers, compress, compressionLevel, files);
        // 5. 添加字体资源
        this.addFonts(zip, project.resources.fonts, compress, compressionLevel, files);
        // 6. 添加声音资源
        this.addSounds(zip, project.resources.sounds, compress, compressionLevel, files);
        // 7. 添加锁屏资源
        this.addLockscreens(zip, project.resources.lockscreens, compress, compressionLevel, files);
        // 8. 添加状态栏配置
        this.addStatusbar(zip, project.resources.statusbar, compress, compressionLevel, files);
        // 9. 添加 MAML 模块
        this.addMAML(zip, project.resources.mamlModules, compress, compressionLevel, files);
        // 10. 生成 ZIP 缓冲区
        const buffer = await zip.generateAsync({
            type: 'nodebuffer',
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
     * MIUI 主题的标准描述文件
     */
    generateDescriptionXml(desc) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<MIUI_Theme version="2">
  <name>${this.escapeXml(desc.name)}</name>
  <author>${this.escapeXml(desc.author)}</author>
  <version>${this.escapeXml(desc.version)}</version>
  <description>${this.escapeXml(desc.description)}</description>
  <uiVersion>${this.escapeXml(desc.uiVersion)}</uiVersion>
  <designWidth>${desc.designWidth}</designWidth>
  <designHeight>${desc.designHeight}</designHeight>
  <supportsDarkMode>${desc.supportsDarkMode}</supportsDarkMode>
  <minMIUIVersion>${this.escapeXml(desc.minMIUIVersion)}</minMIUIVersion>
  ${desc.category ? `<category>${this.escapeXml(desc.category)}</category>` : ''}
  ${desc.tags && desc.tags.length > 0 ? `<tags>${desc.tags.map((t) => this.escapeXml(t)).join(',')}</tags>` : ''}
</MIUI_Theme>`;
    }
    /**
     * 生成 theme_config.json 内容
     * MIUI V12+ 新配置格式
     */
    generateThemeConfig(desc) {
        const config = {
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
    /**
     * 添加图标资源到 ZIP 包
     */
    addIcons(zip, icons, compress, compressionLevel, files) {
        for (const icon of icons) {
            if (icon.previewData) {
                // 如果有预览数据（Base64），转换为 Buffer 添加
                const buffer = Buffer.from(icon.previewData, 'base64');
                zip.file(icon.filePath, buffer, {
                    compression: compress ? 'DEFLATE' : 'STORE',
                    compressionOptions: { level: compressionLevel },
                });
                files.push(icon.filePath);
            }
            else {
                // 没有预览数据时，添加一个占位文件记录
                // 实际使用时应该从原始文件读取
                files.push(icon.filePath);
            }
        }
    }
    /**
     * 添加壁纸资源到 ZIP 包
     */
    addWallpapers(zip, wallpapers, compress, compressionLevel, files) {
        for (const wallpaper of wallpapers) {
            if (wallpaper.previewData) {
                const buffer = Buffer.from(wallpaper.previewData, 'base64');
                zip.file(wallpaper.filePath, buffer, {
                    compression: compress ? 'DEFLATE' : 'STORE',
                    compressionOptions: { level: compressionLevel },
                });
            }
            files.push(wallpaper.filePath);
        }
    }
    /**
     * 添加字体资源到 ZIP 包
     */
    addFonts(zip, fonts, compress, compressionLevel, files) {
        for (const font of fonts) {
            // 字体文件通常较大，使用 STORE 不压缩以加快加载速度
            files.push(font.filePath);
            // 实际使用时需要从原始文件读取字体数据
        }
    }
    /**
     * 添加声音资源到 ZIP 包
     */
    addSounds(zip, sounds, compress, compressionLevel, files) {
        for (const sound of sounds) {
            files.push(sound.filePath);
            // 实际使用时需要从原始文件读取声音数据
        }
    }
    /**
     * 添加锁屏资源到 ZIP 包
     */
    addLockscreens(zip, lockscreens, compress, compressionLevel, files) {
        for (const lockscreen of lockscreens) {
            files.push(lockscreen.filePath);
            // 实际使用时需要从原始文件读取锁屏数据
        }
    }
    /**
     * 添加状态栏配置到 ZIP 包
     */
    addStatusbar(zip, statusbar, compress, compressionLevel, files) {
        // 将状态栏配置写入 JSON 文件
        const config = {
            iconStyle: statusbar.iconStyle,
            bgColor: statusbar.bgColor,
            textColor: statusbar.textColor,
            showCarrier: statusbar.showCarrier,
            networkSpeedStyle: statusbar.networkSpeedStyle,
        };
        const configPath = 'statusbar/config.json';
        zip.file(configPath, JSON.stringify(config, null, 2), {
            compression: compress ? 'DEFLATE' : 'STORE',
            compressionOptions: { level: compressionLevel },
        });
        files.push(configPath);
        if (statusbar.iconStyle) {
            files.push(statusbar.iconStyle);
        }
    }
    /**
     * 添加 MAML 模块到 ZIP 包
     */
    addMAML(zip, mamlModules, compress, compressionLevel, files) {
        for (const module of mamlModules) {
            if (module.sourceCode) {
                // 如果有源代码，直接写入
                zip.file(module.filePath, module.sourceCode, {
                    compression: compress ? 'DEFLATE' : 'STORE',
                    compressionOptions: { level: compressionLevel },
                });
            }
            files.push(module.filePath);
            // 如果有预览图
            if (module.previewPath) {
                files.push(module.previewPath);
            }
        }
    }
    /**
     * XML 特殊字符转义
     */
    escapeXml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
exports.MTZPacker = MTZPacker;
//# sourceMappingURL=mtz-packer.js.map