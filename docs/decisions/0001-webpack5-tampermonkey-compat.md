# ADR-001: webpack 5 与 Tampermonkey 沙箱兼容

- **状态**: 已实施
- **日期**: 2026-08-05

## 背景

项目从 webpack 4 升级到 webpack 5（2026-08 现代化改造）。脚本注入到 115 云盘页面后不工作，控制台报错 `Error: Automatic publicPath is not supported in this browser`。

## 问题

webpack 5 默认启用自动 publicPath 推断，运行时通过 `document.currentScript.src` 获取 bundle 路径。Tampermonkey 沙箱中 `document.currentScript` 为 `null`，导致抛出异常，整个 bundle 执行中断。

## 候选方案

1. **保持自动 publicPath**，通过 `unsafeWindow` 或其他方式获取路径
2. **显式禁用 publicPath 推断**，设为固定值
3. **使用 `output.publicPath` 指向 dev server / CDN**

## 最终选择

方案 2 + 3 结合：在 `webpack.config.js` 中显式配置：

```js
output: {
  publicPath: '',           // 禁用自动 publicPath 推断
  chunkLoading: false,      // 禁用 chunk 加载
  chunkFormat: 'array-push', // 使用兼容格式
}
```

## 原因

- Tampermonkey 沙箱中 `document.currentScript` 恒为 `null`，方案 1 不可行
- 用户脚本是单文件 bundle，无需 chunk 加载和自动路径推断
- `publicPath` 配置为 dev server URL（生产时为 CDN），保证资源路径正确

## 后续影响

- 升级后需验证 `grep "Automatic publicPath" lib/index.js` 无输出
- 新增 `bump-require-version.js` 脚本处理 TM 缓存问题（见 ADR-005）