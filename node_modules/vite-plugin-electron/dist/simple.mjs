import fs from "node:fs";
import path from "node:path";
import { mergeConfig } from "vite";
import electron from "./index.mjs";
async function electronSimple(options) {
  const flatApiOptions = [options.main];
  const packageJson = resolvePackageJson() ?? {};
  const esmodule = packageJson.type === "module";
  if (options.preload) {
    const {
      input,
      vite: viteConfig = {},
      ...preloadOptions
    } = options.preload;
    const preload = {
      onstart(args) {
        args.reload();
      },
      ...preloadOptions,
      vite: mergeConfig({
        build: {
          rollupOptions: {
            // `rollupOptions.input` has higher priority than `build.lib`.
            // @see - https://github.com/vitejs/vite/blob/v5.0.9/packages/vite/src/node/build.ts#L482
            input,
            output: {
              // In most cases, use `cjs` format
              format: "cjs",
              // `require()` can usable matrix
              //  @see - https://github.com/electron/electron/blob/v30.0.0-nightly.20240104/docs/tutorial/esm.md#preload-scripts
              //  ┏———————————————————————————————————┳——————————┳———————————┓
              //  │ webPreferences: { }               │  import  │  require  │
              //  ┠———————————————————————————————————╂——————————╂———————————┨
              //  │ nodeIntegration: false(undefined) │    ✘     │     ✔     │
              //  ┠———————————————————————————————————╂——————————╂———————————┨
              //  │ nodeIntegration: true             │    ✔     │     ✔     │
              //  ┠———————————————————————————————————╂——————————╂———————————┨
              //  │ sandbox: true(undefined)          │    ✘     │     ✔     │
              //  ┠———————————————————————————————————╂——————————╂———————————┨
              //  │ sandbox: false                    │    ✔     │     ✘     │
              //  ┠———————————————————————————————————╂——————————╂———————————┨
              //  │ nodeIntegration: false            │    ✘     │     ✔     │
              //  │ sandbox: true                     │          │           │
              //  ┠———————————————————————————————————╂——————————╂———————————┨
              //  │ nodeIntegration: false            │    ✔     │     ✘     │
              //  │ sandbox: false                    │          │           │
              //  ┠———————————————————————————————————╂——————————╂———————————┨
              //  │ nodeIntegration: true             │    ✘     │     ✔     │
              //  │ sandbox: true                     │          │           │
              //  ┠———————————————————————————————————╂——————————╂———————————┨
              //  │ nodeIntegration: true             │    ✔     │     ✔     │
              //  │ sandbox: false                    │          │           │
              //  ┗———————————————————————————————————┸——————————┸———————————┛
              //  - import(✘): SyntaxError: Cannot use import statement outside a module
              //  - require(✘): ReferenceError: require is not defined in ES module scope, you can use import instead
              // Note, however, that `preload.ts` should not be split. 🚧
              inlineDynamicImports: true,
              // When Rollup builds code in `cjs` format, it will automatically split the code into multiple chunks, and use `require()` to load them, 
              // and use `require()` to load other modules when `nodeIntegration: false` in the Main process Errors will occur.
              // So we need to configure Rollup not to split the code when building to ensure that it works correctly with `nodeIntegration: false`.
              // @see - https://github.com/vitejs/vite/blob/v5.0.9/packages/vite/src/node/build.ts#L608
              entryFileNames: `[name].${esmodule ? "mjs" : "js"}`,
              chunkFileNames: `[name].${esmodule ? "mjs" : "js"}`,
              assetFileNames: "[name].[ext]"
            }
          }
        }
      }, viteConfig)
    };
    flatApiOptions.push(preload);
  }
  const plugins = electron(flatApiOptions);
  if (options.renderer) {
    try {
      const renderer = await import("vite-plugin-electron-renderer");
      plugins.push(renderer.default(options.renderer));
    } catch (error) {
      if (error.code === "ERR_MODULE_NOT_FOUND") {
        throw new Error(
          `\`renderer\` option dependency "vite-plugin-electron-renderer" not found. Did you install it? Try \`npm i -D vite-plugin-electron-renderer\`.`
        );
      }
      throw error;
    }
  }
  return plugins;
}
function resolvePackageJson(root = process.cwd()) {
  const packageJsonPath = path.join(root, "package.json");
  const packageJsonStr = fs.readFileSync(packageJsonPath, "utf8");
  try {
    return JSON.parse(packageJsonStr);
  } catch {
    return null;
  }
}
export {
  electronSimple as default
};
