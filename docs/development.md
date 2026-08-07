# 开发指南

## 环境准备

- **Node.js**: 24.x（见 `.node-version`，使用 `fnm` 管理版本）
- **包管理器**: pnpm（项目使用 `pnpm-lock.yaml`）
- **Chrome**: 用于调试（需安装 Tampermonkey 5.5+）

## 安装

```bash
git clone <repo-url>
cd yinxing.monkey
fnm use 24
pnpm install
```

> **注意**：本项目使用 pnpm。如果尚未安装，请先 `npm install -g pnpm`。
pnpm 会自动读取 `.npmrc` 中的配置。

## 环境配置

复制 `.env.example` 为 `.env`，按需修改：

```bash
cp .env.example .env
```

关键配置项见 `.env.example` 中的注释。

## 启动方式

### 开发构建 + 热更新

```bash
pnpm run dev
```

启动 webpack-dev-server，监听 `http://localhost:8080`（可在 `.env` 中修改 `DEV_SERVER_URL`）。

### 生产构建

```bash
pnpm run build
```

产物输出到 `lib/index.js`（约 160 KiB，minified）。

### 监听模式

```bash
pnpm run watch
```

### 代码检查

```bash
pnpm run lint
```

## 调试流程

### 1. 启动调试 Chrome

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=$HOME/chrome-dev-profile
```

该 profile 需提前安装 Tampermonkey 并添加银杏脚本。

### 2. 连接 MCP

`.vscode/mcp.json` 已配置好 chrome-devtools MCP，VS Code 重启后自动连接。

### 3. 刷新 @require 缓存

每次修改源码后，运行：

```bash
pnpm run flush
```

这会：
1. 将 TM 中脚本的 `@require` URL 版本号 +1（强制 TM 重新拉取）
2. 重启 TM Service Worker
3. 启动 webpack-dev-server

### 4. 验证脚本注入

在 MCP 的 `evaluate_script` 中执行：

```js
typeof GM !== 'undefined'  // true 表示 Tampermonkey 已注入
```

## 发布流程

使用 semantic-release 自动发布：

1. 提交使用 Conventional Commits 格式
2. CI 触发 `pnpm run semantic-release`
3. 自动推断版本号 → 发布到 npm → jsDelivr CDN
4. `scripts/release.js` 生成用户脚本头部（`index.js`）

## 开发流程

1. 修改 `src/` 下的 TypeScript 源码
2. 运行 `npm run lint` 检查代码
3. 运行 `npm run flush` 构建并刷新 TM 缓存
4. 在调试 Chrome 中刷新 115 页面验证效果
5. 提交代码（遵循 Conventional Commits）

## 项目脚本

| 命令 | 用途 |
|---|---|
| `npm run build` | 生产构建 |
| `npm run build-dev` | 开发构建 |
| `npm run watch` | 监听模式 |
| `npm run dev` | webpack-dev-server |
| `npm run flush` | 构建 + 刷新 TM 缓存 + dev-server |
| `npm run lint` | ESLint 检查 |
