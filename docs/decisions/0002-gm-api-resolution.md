# ADR-002: GM API 从沙箱全局逐级查找

- **状态**: 已实施
- **日期**: 2026-08-05

## 背景

webpack 打包后代码运行在 IIFE 闭包中，`GM_openInTab` 等 `@grant` 全局变量在闭包作用域中不可见，导致 `ReferenceError: GM_openInTab is not defined`。

## 问题

- `unsafeWindow` 是页面真实 `window`，Tampermonkey 的 GM API 挂在**沙箱全局**（`globalThis`/`window`）上，**不在** `unsafeWindow` 上
- 需要一种方式在 webpack IIFE 闭包中可靠地访问 GM API
- 同时需要兼容 `GM_foo()`（旧版 Greasemonkey）和 `GM.foo()`（新版）两种调用方式

## 候选方案

1. **直接引用全局变量** — 在 IIFE 外声明变量再在内部使用
2. **从 `globalThis` 逐级查找** — 运行时动态查找
3. **通过 `@grant unsafeWindow` 访问** — 从 `unsafeWindow` 获取

## 最终选择

方案 2：在 `src/core/monkey_kernel.ts` 中，从沙箱全局逐级查找：

```ts
const g = (typeof globalThis !== 'undefined' ? globalThis : window) as any;
const uw = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : undefined) as any;
const gms = {
  openInTab: (g.GM_openInTab ?? g.GM?.openInTab ?? uw?.GM_openInTab ?? uw?.GM?.openInTab) as (...),
  // ... 其他 GM_* 同理
};
```

## 原因

- 方案 1 需要修改 webpack 配置或使用 `externals`，侵入性大
- 方案 3 不可行（GM API 不在 `unsafeWindow` 上）
- 方案 2 无侵入、兼容性好，`??` 运算符保证查找顺序：`GM_foo` → `GM.foo` → `unsafeWindow.GM_foo` → `unsafeWindow.GM.foo`

## 后续影响

- `unsafeWindow` 需声明为全局变量（`declare const unsafeWindow: Window`），而非 `Window` interface 属性
- 所有 GM API 调用通过 `gms` 对象间接访问，而非直接使用全局变量