# MIUI Theme Editor

全功能小米手机主题编辑生成器 - AI增强版

## 功能特性

- 🎨 **MTZ 主题文件解析与打包**
- 🤖 **AI 辅助设计**（OpenAI / Claude / Ollama / Qwen 支持）
- 🖼️ **图标、壁纸、字体编辑**
- 📝 **MAML 可视化编辑器**
- 📱 **PC 预览模拟器**
- 🔌 **ADB 一键推送手机**

## 技术栈

- Electron 30
- React 18 + TypeScript
- Vite
- Ant Design
- Zustand

## 系统要求

| 平台 | 最低版本 | 架构 |
|------|---------|------|
| Windows | Windows 10 | x64, ia32 |
| macOS | macOS 11 (Big Sur) | x64, arm64 |
| Linux | Ubuntu 20.04 / Fedora 34 | x64 |

## 下载安装

### 从 GitHub Releases 下载

访问 [GitHub Releases](https://github.com/your-username/miui-theme-editor/releases) 页面下载最新版本。

### Windows

1. 下载 `MIUI Theme Editor Setup X.X.X.exe`
2. 双击运行安装程序
3. 按向导提示完成安装
4. 安装完成后桌面会生成快捷方式

> 如果 Windows Defender 提示阻止，请点击"更多信息" -> "仍要运行"。

### macOS

1. 下载 `MIUI Theme Editor-X.X.X.dmg`
2. 双击打开 DMG 文件
3. 将应用拖拽到 Applications 文件夹
4. 首次运行时，前往 **系统设置 -> 隐私与安全性** 中允许打开

> 如果提示"无法打开，因为无法验证开发者"，请在终端执行：
> ```bash
> xattr -cr /Applications/MIUI\ Theme\ Editor.app
> ```

### Linux

#### AppImage（推荐）

1. 下载 `MIUI Theme Editor-X.X.X.AppImage`
2. 赋予执行权限：
   ```bash
   chmod +x MIUI\ Theme\ Editor-*.AppImage
   ```
3. 双击运行或在终端执行：
   ```bash
   ./MIUI\ Theme\ Editor-*.AppImage
   ```

#### Debian / Ubuntu

1. 下载 `miui-theme-editor_X.X.X_amd64.deb`
2. 安装：
   ```bash
   sudo dpkg -i miui-theme-editor_*.deb
   sudo apt-get install -f  # 修复依赖
   ```
3. 在应用菜单中搜索 "MIUI Theme Editor" 启动

## 快速开始

### 开发环境

```bash
# 克隆仓库
git clone https://github.com/your-username/miui-theme-editor.git
cd miui-theme-editor

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

### 本地打包

```bash
# 打包所有平台
npm run dist

# 仅 Windows
npm run dist:win

# 仅 macOS
npm run dist:mac

# 仅 Linux
npm run dist:linux
```

### 运行测试

```bash
# 运行单元测试
npm run test

# 运行测试（带 UI）
npm run test:ui
```

## 项目结构

```
src/
├── main/           # Electron 主进程
│   ├── engine/     # MTZ 解析/打包引擎
│   └── index.ts    # 主进程入口
├── renderer/       # React 渲染进程
│   ├── pages/      # 页面组件
│   └── ai/         # AI 服务层
└── shared/         # 共享类型
```

## 许可证

MIT
