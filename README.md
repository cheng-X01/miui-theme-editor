# MIUI Theme Editor

全功能小米手机主题编辑生成器 - AI增强版

## 功能特性

- 🎨 **MTZ 主题文件解析与打包**
- 🤖 **AI 辅助设计**（OpenAI / Ollama 支持）
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

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
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
