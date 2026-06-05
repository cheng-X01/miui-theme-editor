import { type InlineConfig, type ViteDevServer } from 'vite';
import type { ElectronOptions } from '.';
export interface PidTree {
    pid: number;
    ppid: number;
    children?: PidTree[];
}
/** Resolve the default Vite's `InlineConfig` for build Electron-Main */
export declare function resolveViteConfig(options: ElectronOptions): InlineConfig;
export declare function withExternalBuiltins(config: InlineConfig): InlineConfig;
/**
 * @see https://github.com/vitejs/vite/blob/v4.0.1/packages/vite/src/node/constants.ts#L137-L147
 */
export declare function resolveHostname(hostname: string): string;
export declare function resolveServerUrl(server: ViteDevServer): string | undefined;
export declare function resolvePackageJson(root?: string): {
    type?: 'module' | 'commonjs';
    [key: string]: any;
} | null;
/**
 * Inspired `tree-kill`, implemented based on sync-api. #168
 * @see https://github.com/pkrumins/node-tree-kill/blob/v1.2.2/index.js
 */
export declare function treeKillSync(pid: number): void;
