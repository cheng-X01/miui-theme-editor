/**
 * MIUI Theme Editor - MTZ 打包引擎
 * 负责将主题项目数据打包为 .mtz 文件（ZIP 格式）
 * 生成 description.xml、theme_config.json 并添加各类资源
 */
import type { ThemeProject } from '../../shared/types';
/** 打包选项 */
export interface PackOptions {
    /** 是否压缩资源文件 */
    compress?: boolean;
    /** 压缩级别（1-9） */
    compressionLevel?: number;
    /** 是否包含预览图 */
    includePreviews?: boolean;
    /** 输出文件名 */
    fileName?: string;
}
/** 打包结果 */
export interface PackResult {
    /** 打包后的 MTZ 文件 Buffer */
    buffer: Buffer;
    /** 文件大小（字节） */
    size: number;
    /** 包含的文件列表 */
    files: string[];
}
export declare class MTZPacker {
    /**
     * 打包主题项目为 MTZ 文件
     * @param project 主题项目数据
     * @param options 打包选项
     * @returns 打包结果
     */
    pack(project: ThemeProject, options?: PackOptions): Promise<PackResult>;
    /**
     * 生成 description.xml 内容
     * MIUI 主题的标准描述文件
     */
    private generateDescriptionXml;
    /**
     * 生成 theme_config.json 内容
     * MIUI V12+ 新配置格式
     */
    private generateThemeConfig;
    /**
     * 添加图标资源到 ZIP 包
     */
    private addIcons;
    /**
     * 添加壁纸资源到 ZIP 包
     */
    private addWallpapers;
    /**
     * 添加字体资源到 ZIP 包
     */
    private addFonts;
    /**
     * 添加声音资源到 ZIP 包
     */
    private addSounds;
    /**
     * 添加锁屏资源到 ZIP 包
     */
    private addLockscreens;
    /**
     * 添加状态栏配置到 ZIP 包
     */
    private addStatusbar;
    /**
     * 添加 MAML 模块到 ZIP 包
     */
    private addMAML;
    /**
     * XML 特殊字符转义
     */
    private escapeXml;
}
//# sourceMappingURL=mtz-packer.d.ts.map