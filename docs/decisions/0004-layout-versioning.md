# ADR-004: 115 页面布局版本化 (V1/V2)

- **状态**: 已实施
- **日期**: 2026-08-05

## 背景

银杏脚本通过注入 CSS 覆盖 115 页面的默认布局，以实现缩略图网格自定义（120px 宽、170px 高图片，标题多行显示等）。115 不同页面（如 `/storage/allfiles` 和 `/storage/starredfiles`）的 DOM 结构存在差异。

## 问题

- `/storage/allfiles` 的 `.file-grid-item` 中，图片直接挂在 `.relative[style]` 下
- `/storage/starredfiles` 的 `.file-grid-item` 中，图片外多了一层 `div.w-16.h-16.relative` 包裹层
- 一套 CSS 规则无法同时适配两种结构
- 运行时检测页面结构再注入 CSS 不可行（CSS 注入时 DOM 尚未渲染）

## 候选方案

1. **运行时检测** — 在 `boot()` 时检测 DOM 结构，选择注入 V1 或 V2
2. **同时注入两套 CSS** — 让浏览器根据选择器优先级自动匹配
3. **统一选择器** — 用更通用的选择器覆盖所有结构

## 最终选择

方案 2：同时注入两套 CSS，V2 使用更具体的选择器（`.w-16.h-16.relative`）覆盖中间包装层：

```ts
static changeLayouts(): void {
  UI.changeLayoutsV1();  // 适用于 /storage/allfiles 等标准页面
  UI.changeLayoutsV2();  // 适用于 /storage/starredfiles 等特殊页面
}
```

## 原因

- 方案 1 在 `boot()` 时 DOM 未渲染，检测结果不可靠
- 方案 2 两套规则无冲突，V2 只在有 `.w-16.h-16.relative` 的页面生效
- 方案 3 通用选择器可能导致意外的样式覆盖
- 同时注入更简单可靠，无需维护检测逻辑

## 后续影响

- 如果 115 页面结构再次变化，需要新增 `changeLayoutsV3()` 方法
- `changeLayouts()` 方法体保持为调用所有 Vn 方法，无需改动业务逻辑