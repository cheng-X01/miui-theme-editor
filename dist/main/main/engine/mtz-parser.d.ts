/**
 * MIUI Theme Editor - MTZ 解析引擎
 * 负责解析 .mtz 主题包文件（本质是 ZIP 格式）
 * 提取 description.xml、theme_config.json 和各类资源文件
 */
import type { ThemeProject } from '../../shared/types';
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
export declare class MTZParser {
    private xmlParser;
    constructor();
    /**
     * 解析 MTZ 主题包
     * @param buffer MTZ 文件的 Buffer 数据
     * @param options 解析选项
     * @returns 解析结果
     */
    parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult>;
    /**
     * 验证 MTZ 包的基本结构
     */
    private validateStructure;
    /**
     * 解析 description.xml
     * MIUI 主题的核心描述文件
     */
    private parseDescriptionXml;
    /**
     * 解析 theme_config.json（MIUI V12+ 新配置格式）
     */
    private parseThemeConfig;
    /**
     * 解析各类资源文件
     */
    private parseResources;
    /**
     * 解析图标资源
     * 图标通常位于 icons/ 目录下，按组件名组织
     */
    private parseIcons;
    /**
     * 解析壁纸资源
     * 壁纸位于 wallpaper/ 目录下
     */
    private parseWallpapers;
    /**
     * 解析字体资源
     * 字体位于 fonts/ 或 font/ 目录下
     */
    private parseFonts;
    /**
     * 解析声音资源
     * 声音位于 audio/ 或 sound/ 目录下
     */
    private parseSounds;
    /**
     * 解析锁屏资源
     * 锁屏位于 lockscreen/ 目录下
     */
    private parseLockscreens;
    /**
     * 解析状态栏配置
     * 状态栏配置通常在 description.xml 或单独的配置文件中
     */
    private parseStatusbar;
    /**
     * 解析 MAML 模块
     * MAML（MIUI Animation Markup Language）是小米的动画标记语言
     */
    private parseMAML;
}
//# sourceMappingURL=mtz-parser.d.ts.map