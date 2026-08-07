# CI/CD 与发布流程

> 银杏是一个 Tampermonkey 用户脚本，通过 npm 发布到 jsDelivr CDN，再通过 GreasyFork 同步入口脚本。这套流程与普通 npm 库项目有显著差异。

## 架构概览

```
GitHub (master)
  │  push (Conventional Commits)
  ▼
GitHub Actions CI
  ├─ lint-and-build (PR / push)
  └─ release (push only)
       │
       ├─ @semantic-release/npm → npm registry
       │                              │
       │                              ▼
       │                         jsDelivr CDN
       │                         https://cdn.jsdelivr.net/npm/yinxing.monkey@x.x.x/lib/index.js
       │
       ├─ scripts/release.js → index.js (用户脚本入口)
       │
       ├─ @semantic-release/git → commit index.js + package.json
       │
       └─ @semantic-release/github → GitHub Release
```

## 与普通 npm 项目的关键区别

| 方面 | 普通 npm 项目 | 银杏 (用户脚本) |
|---|---|---|
| 发布产物 | `lib/` 直接被引用 | `lib/` 通过 `@require` 从 CDN 加载 |
| 入口文件 | `package.json#main` 指向 `lib/index.js` | 用户安装的是 `index.js`（元数据壳），通过 `@require` 加载 `lib/index.js` |
| 版本同步 | 用户 `npm install` 获取新版本 | 用户需在 Tampermonkey 中重新保存脚本或等待 `@require` 缓存刷新 |
| 分发渠道 | npm registry | npm + jsDelivr CDN + GreasyFork |
| 可执行代码 | 直接运行 | 需要 `@require` 元数据块 + 至少一行可执行代码（GreasyFork 要求） |

## 发布流程详解

### 1. 触发条件

- 向 `master` 分支 push（PR merge 或直接 push）
- commit message 必须符合 [Conventional Commits](https://www.conventionalcommits.org/) 格式
- 只有 `fix:` / `feat:` / `BREAKING CHANGE` 等类型才会触发版本发布

### 2. CI Job 说明

#### `lint-and-build`（所有 PR 和 push）

```yaml
- pnpm install --frozen-lockfile
- pnpm lint          # ESLint 检查
- pnpm build         # Webpack 构建 → lib/index.js
```

#### `release`（仅 master push，依赖 lint-and-build 通过）

```yaml
- pnpm install --frozen-lockfile
- pnpm build         # 构建 lib/index.js（npm 包需要）
- pnpm semantic-release
```

### 3. semantic-release 插件链

```json
[
  "@semantic-release/commit-analyzer",    // 分析 commit 决定版本号
  "@semantic-release/release-notes-generator", // 生成 changelog
  "@semantic-release/npm",                // 发布 lib/index.js 到 npm
  {
    "path": "@semantic-release/exec",
    "cmd": "node scripts/release.js"      // 生成 index.js（用户脚本入口）
  },
  [
    "@semantic-release/git",
    {
      "assets": ["index.js", "lib/index.js", "package.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]..."
    }
  ],
  "@semantic-release/github"              // 创建 GitHub Release
]
```

### 4. 产物说明

#### `lib/index.js`（Webpack bundle）

- 由 `pnpm build` 生成
- 包含所有业务逻辑（TypeScript → Webpack → minified）
- 发布到 npm，通过 jsDelivr CDN 分发
- CDN URL: `https://cdn.jsdelivr.net/npm/yinxing.monkey@<version>/lib/index.js`

#### `index.js`（用户脚本入口）

- 由 `scripts/release.js` 在 CI 中生成
- 仅包含 `// ==UserScript==` 元数据块 + `@require` 指向 CDN
- 末尾必须包含可执行代码（`void 0;`），否则 GreasyFork 同步会报错
- 提交到 Git 仓库，同时发布到 npm
- GreasyFork 通过 `https://cdn.jsdelivr.net/npm/yinxing.monkey/index.js` 同步

### 5. 关键文件

| 文件 | 作用 |
|---|---|
| `.github/workflows/ci.yml` | CI/CD 配置 |
| `scripts/release.js` | 生成用户脚本入口 `index.js` |
| `package.json#release` | semantic-release 插件配置 |
| `.npmignore` | 控制 npm 包包含的文件（`lib/`、`index.js`、`package.json`、`README.md`） |

## GreasyFork 同步配置

在 GreasyFork 脚本管理页面中：

- **同步 URL**: `https://cdn.jsdelivr.net/npm/yinxing.monkey/index.js`
- **同步频率**: 建议每 6 小时
- **代码类型**: 公开（Public）

### GreasyFork 同步要求

1. `index.js` 必须以 `// ==UserScript==` 开头，`// ==/UserScript==` 结尾
2. 元数据块后**必须包含至少一行可执行代码**（如 `void 0;`），否则 GreasyFork 报错「Code未包含可执行代码」
3. `@version` 必须与 npm 包版本一致
4. `@require` 必须指向正确的 CDN URL

## 本地测试发布流程

```bash
# 1. 模拟版本发布
VERSION=1.2.0 node scripts/release.js

# 2. 检查生成的 index.js
head -20 index.js

# 3. 验证构建
pnpm build

# 4. 检查 npm 包内容
npm pack --dry-run
```

## 常见问题

### Q: jsDelivr CDN 缓存未更新

```bash
# 强制清除 jsDelivr 缓存
curl https://purge.jsdelivr.net/npm/yinxing.monkey/index.js
curl https://purge.jsdelivr.net/npm/yinxing.monkey@latest/lib/index.js
```

### Q: GreasyFork 同步失败「Code未包含可执行代码」

检查 `index.js` 末尾是否有 `// ==/UserScript==` 之后的可执行代码行。

### Q: npm 包缺少 `lib/index.js`

检查 CI 的 `release` job 中是否在 `semantic-release` 之前执行了 `pnpm build`。同时确认 `.npmignore` 包含 `!lib/**/*`。

### Q: 用户浏览器中脚本版本未更新

Tampermonkey 会缓存 `@require` 文件。用户需：
1. Tampermonkey 管理面板 → 找到脚本 → 按 `Ctrl+S` 保存
2. 或关闭再重新打开脚本开关
3. 或在开发者工具中勾选 Disable cache 后刷新