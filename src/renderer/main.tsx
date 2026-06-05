/**
 * MIUI Theme Editor - 渲染进程入口
 * 使用 React 18 的 createRoot API 创建应用
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 获取根节点
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('找不到根节点 #root，请检查 index.html');
}

// 创建 React 根节点并渲染应用
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
