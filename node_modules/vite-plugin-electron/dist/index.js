"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const vite = require("vite");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const node_module = require("node:module");
function resolveViteConfig(options) {
  const packageJson = resolvePackageJson() ?? {};
  const esmodule = packageJson.type === "module";
  const defaultConfig = {
    // 🚧 Avoid recursive build caused by load config file
    configFile: false,
    publicDir: false,
    build: {
      // @ts-ignore
      lib: options.entry && {
        entry: options.entry,
        // Since Electron(28) supports ESModule
        formats: esmodule ? ["es"] : ["cjs"],
        fileName: () => "[name].js"
      },
      outDir: "dist-electron",
      // Avoid multiple entries affecting each other
      emptyOutDir: false
    },
    resolve: {
      // @ts-ignore
      browserField: false,
      conditions: ["node"],
      // #98
      // Since we're building for electron (which uses Node.js), we don't want to use the "browser" field in the packages.
      // It corrupts bundling packages like `ws` and `isomorphic-ws`, for example.
      mainFields: ["module", "jsnext:main", "jsnext"]
    },
    define: {
      // @see - https://github.com/vitejs/vite/blob/v5.0.11/packages/vite/src/node/plugins/define.ts#L20
      "process.env": "process.env"
    }
  };
  return vite.mergeConfig(defaultConfig, (options == null ? void 0 : options.vite) || {});
}
function withExternalBuiltins(config) {
  var _a;
  const builtins = node_module.builtinModules.filter((e) => !e.startsWith("_"));
  builtins.push("electron", ...builtins.map((m) => `node:${m}`));
  config.build ?? (config.build = {});
  (_a = config.build).rollupOptions ?? (_a.rollupOptions = {});
  let external = config.build.rollupOptions.external;
  if (Array.isArray(external) || typeof external === "string" || external instanceof RegExp) {
    external = builtins.concat(external);
  } else if (typeof external === "function") {
    const original = external;
    external = function(source, importer, isResolved) {
      if (builtins.includes(source)) {
        return true;
      }
      return original(source, importer, isResolved);
    };
  } else {
    external = builtins;
  }
  config.build.rollupOptions.external = external;
  return config;
}
function resolveHostname(hostname) {
  const loopbackHosts = /* @__PURE__ */ new Set([
    "localhost",
    "127.0.0.1",
    "::1",
    "0000:0000:0000:0000:0000:0000:0000:0001"
  ]);
  const wildcardHosts = /* @__PURE__ */ new Set([
    "0.0.0.0",
    "::",
    "0000:0000:0000:0000:0000:0000:0000:0000"
  ]);
  return loopbackHosts.has(hostname) || wildcardHosts.has(hostname) ? "localhost" : hostname;
}
function resolveServerUrl(server) {
  var _a;
  const addressInfo = (_a = server.httpServer) == null ? void 0 : _a.address();
  const isAddressInfo = (x) => x == null ? void 0 : x.address;
  if (isAddressInfo(addressInfo)) {
    const { address, port } = addressInfo;
    const hostname = resolveHostname(address);
    const options = server.config.server;
    const protocol = options.https ? "https" : "http";
    const devBase = server.config.base;
    const path2 = typeof options.open === "string" ? options.open : devBase;
    const url = path2.startsWith("http") ? path2 : `${protocol}://${hostname}:${port}${path2}`;
    return url;
  }
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
function treeKillSync(pid) {
  if (process.platform === "win32") {
    cp.execSync(`taskkill /pid ${pid} /T /F`);
  } else {
    killTree(pidTree({ pid, ppid: process.pid }));
  }
}
function pidTree(tree) {
  var _a;
  const command = process.platform === "darwin" ? `pgrep -P ${tree.pid}` : `ps -o pid --no-headers --ppid ${tree.ppid}`;
  try {
    const childs = (_a = cp.execSync(command, { encoding: "utf8" }).match(/\d+/g)) == null ? void 0 : _a.map((id) => +id);
    if (childs) {
      tree.children = childs.map((cid) => pidTree({ pid: cid, ppid: tree.pid }));
    }
  } catch {
  }
  return tree;
}
function killTree(tree) {
  if (tree.children) {
    for (const child of tree.children) {
      killTree(child);
    }
  }
  try {
    process.kill(tree.pid);
  } catch {
  }
}
function build(options) {
  return vite.build(withExternalBuiltins(resolveViteConfig(options)));
}
function electron(options) {
  const optionsArray = Array.isArray(options) ? options : [options];
  let userConfig;
  let configEnv;
  return [
    {
      name: "vite-plugin-electron",
      apply: "serve",
      configureServer(server) {
        var _a;
        (_a = server.httpServer) == null ? void 0 : _a.once("listening", () => {
          var _a2, _b, _c, _d, _e, _f, _g;
          Object.assign(process.env, {
            VITE_DEV_SERVER_URL: resolveServerUrl(server)
          });
          const entryCount = optionsArray.length;
          let closeBundleCount = 0;
          for (const options2 of optionsArray) {
            options2.vite ?? (options2.vite = {});
            (_a2 = options2.vite).mode ?? (_a2.mode = server.config.mode);
            (_b = options2.vite).root ?? (_b.root = server.config.root);
            (_c = options2.vite).envDir ?? (_c.envDir = server.config.envDir);
            (_d = options2.vite).envPrefix ?? (_d.envPrefix = server.config.envPrefix);
            (_e = options2.vite).build ?? (_e.build = {});
            if (!Object.keys(options2.vite.build).includes("watch")) {
              options2.vite.build.watch = {};
            }
            (_f = options2.vite.build).minify ?? (_f.minify = false);
            (_g = options2.vite).plugins ?? (_g.plugins = []);
            options2.vite.plugins.push(
              {
                name: ":startup",
                closeBundle() {
                  if (++closeBundleCount < entryCount)
                    return;
                  if (options2.onstart) {
                    options2.onstart.call(this, {
                      startup,
                      // Why not use Vite's built-in `/@vite/client` to implement Hot reload?
                      // Because Vite only inserts `/@vite/client` into the `*.html` entry file.
                      // @see - https://github.com/vitejs/vite/blob/v5.2.11/packages/vite/src/node/server/middlewares/indexHtml.ts#L399
                      reload() {
                        if (process.electronApp) {
                          (server.hot || server.ws).send({ type: "full-reload" });
                        } else {
                          startup();
                        }
                      }
                    });
                  } else {
                    startup();
                  }
                }
              }
            );
            build(options2);
          }
        });
      }
    },
    {
      name: "vite-plugin-electron",
      apply: "build",
      config(config, env) {
        userConfig = config;
        configEnv = env;
        config.base ?? (config.base = "./");
      },
      async closeBundle() {
        var _a, _b, _c, _d;
        for (const options2 of optionsArray) {
          options2.vite ?? (options2.vite = {});
          (_a = options2.vite).mode ?? (_a.mode = configEnv.mode);
          (_b = options2.vite).root ?? (_b.root = userConfig.root);
          (_c = options2.vite).envDir ?? (_c.envDir = userConfig.envDir);
          (_d = options2.vite).envPrefix ?? (_d.envPrefix = userConfig.envPrefix);
          await build(options2);
        }
      }
    }
  ];
}
async function startup(argv = [".", "--no-sandbox"], options, customElectronPkg) {
  const { spawn } = await import("node:child_process");
  const electron2 = await import(customElectronPkg ?? "electron");
  const electronPath = electron2.default ?? electron2;
  await startup.exit();
  process.electronApp = spawn(electronPath, argv, { stdio: "inherit", ...options });
  process.electronApp.once("exit", process.exit);
  if (!startup.hookedProcessExit) {
    startup.hookedProcessExit = true;
    process.once("exit", startup.exit);
  }
}
startup.hookedProcessExit = false;
startup.exit = async () => {
  if (process.electronApp) {
    process.electronApp.removeAllListeners();
    treeKillSync(process.electronApp.pid);
  }
};
exports.build = build;
exports.default = electron;
exports.resolveViteConfig = resolveViteConfig;
exports.startup = startup;
exports.treeKillSync = treeKillSync;
exports.withExternalBuiltins = withExternalBuiltins;
