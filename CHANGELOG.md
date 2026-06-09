# Changelog

## [0.2.0] - 2026-06-09

### 新增

- 设置/偏好页面：语言切换、主题切换、自动保存、默认导出路径
- 深色/浅色主题切换（全局 ConfigProvider 动态算法）
- 多语言国际化 i18n（中英文，100+ 翻译 key）
- 撤销/重做 UI（工具栏按钮，联动 history-store）
- 快捷键帮助面板（Ctrl+K 全局打开）
- 应用自动更新（electron-updater，启动检查+定时检查）
- Linux arm64 构建支持（AppImage + deb）

### 优化

- 代码分割：antd/react 拆分为独立 chunk，减少主包体积
- CI 简化：只编译 Linux arm64，加快构建速度

### 修复

- Linux arm64 启动崩溃（sandbox 兼容性修复）
- Windows 启动失败（titleBarStyle 平台条件修复）
- ADBManager 延迟初始化避免启动崩溃
- 移除未使用的原生依赖（fabric/sharp/lottie-react）

## [0.1.0] - 2026-06-06

### 新增

- 完整的 MIUI 主题编辑器（图标/壁纸/配色/字体/音效/MAML/.9图）
- AI 功能集成（OpenAI/Claude/Ollama/Qwen）
- NL2Theme 一键主题生成
- 10 个内置主题模板
- ADB 设备推送
- 预览引擎（锁屏/桌面/状态栏/通知/动画）
- 128 个自动化测试
