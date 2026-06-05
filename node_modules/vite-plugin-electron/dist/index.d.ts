/// <reference types="node" />
import { type Plugin } from 'vite';
import { resolveViteConfig, withExternalBuiltins, treeKillSync } from './utils';
export { resolveViteConfig, withExternalBuiltins, treeKillSync, };
export interface ElectronOptions {
    /**
     * Shortcut of `build.lib.entry`
     */
    entry?: import('vite').LibraryOptions['entry'];
    vite?: import('vite').InlineConfig;
    /**
     * Triggered when Vite is built every time -- `vite serve` command only.
     *
     * If this `onstart` is passed, Electron App will not start automatically.
     * However, you can start Electroo App via `startup` function.
     */
    onstart?: (args: {
        /**
         * Electron App startup function.
         * It will mount the Electron App child-process to `process.electronApp`.
         * @param argv default value `['.', '--no-sandbox']`
         * @param options options for `child_process.spawn`
         * @param customElectronPkg custom electron package name (default: 'electron')
         */
        startup: (argv?: string[], options?: import('node:child_process').SpawnOptions, customElectronPkg?: string) => Promise<void>;
        /** Reload Electron-Renderer */
        reload: () => void;
    }) => void | Promise<void>;
}
export declare function build(options: ElectronOptions): Promise<import("rollup").RollupOutput | import("rollup").RollupOutput[] | import("rollup").RollupWatcher>;
export default function electron(options: ElectronOptions | ElectronOptions[]): Plugin[];
/**
 * Electron App startup function.
 * It will mount the Electron App child-process to `process.electronApp`.
 * @param argv default value `['.', '--no-sandbox']`
 * @param options options for `child_process.spawn`
 * @param customElectronPkg custom electron package name (default: 'electron')
 */
export declare function startup(argv?: string[], options?: import('node:child_process').SpawnOptions, customElectronPkg?: string): Promise<void>;
export declare namespace startup {
    var hookedProcessExit: boolean;
    var exit: () => Promise<void>;
}
