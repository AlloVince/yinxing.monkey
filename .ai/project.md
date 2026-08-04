# 银杏 (yinxing.monkey) — 项目文档

## 项目简介

**银杏** 是一个运行在 **115 网盘** 网页端的 **Greasemonkey/Tampermonkey 用户脚本**（Userscript），由 [AlloVince](https://github.com/AlloVince) 开发。

核心功能：

1. **磁力链接助手** — 在 115 页面点击任意 `magnet:` 或 `ed2k:` 链接时，自动复制链接到剪贴板，并发送到 115 离线下载。
2. **文件自动整理** — 扫描 115 云盘中的文件，解析文件名中的番号，查询元数据 API，自动按厂商创建文件夹、移动文件并重命名。
3. **UI 增强** — 修改 115 页面布局、替换视频缩略图、注入操作菜单。

---

## 技术栈

| 层面 | 技术 |
|---|---|
| **运行时** | 浏览器 (115.com)，通过 Tampermonkey/Greasemonkey GM_\* API 运行 |
| **语言** | TypeScript 5.8+ (target: es2023, module: esnext) |
| **构建工具** | Webpack 5 + ts-loader + style-loader + css-loader |
| **代码检查** | ESLint 9 (flat config) + typescript-eslint |
| **Node** | 24.x (见 `.node-version`) |
| **发布** | semantic-release + @semantic-release/npm + @semantic-release/exec |
| **许可证** | GPL-3.0 |

---

## 项目结构

```
yinxing.monkey/
├── src/
│   ├── index.ts          # 入口文件：UI 类 + 启动逻辑
│   ├── monkey_kernel.ts  # GM_* API 抽象层 + Noty/jQuery 封装
│   ├── yinxing.ts        # 元数据 API 客户端 + 文件整理引擎
│   ├── yyw_cloud.ts      # 115 云盘 API 客户端（模型 + CRUD）
│   └── types.d.ts        # CSS 模块类型声明
├── lib/
│   └── index.js          # Webpack 构建产物（提交到仓库，npm 发布用）
├── release.js            # 发布时生成用户脚本头部（index.js）
├── webpack.config.js     # Webpack 配置
├── eslint.config.mjs     # ESLint 9 flat config
├── tsconfig.json         # TypeScript 配置
├── package.json
├── .node-version         # Node 24
└── .ai/                  # AI 开发文档（本目录）
```

---

## 各文件详解

### `src/index.ts` — 入口 & UI

- **`UI` 类**（静态方法）：
  - `storeAndGetYYWID()` — 读取/保存 115 用户 ID（通过 GM storage），弹出 Noty 输入框
  - `handleCurrentPage(entryParentId)` — 实例化 `YinXing` 并执行文件整理
  - `initYinxingMennu()` — 在 115 页面注入下拉菜单（银杏/更换ID/自动整理/同步）
  - `addLinkToClipboard(btnElement)` — 复制磁力链接到剪贴板
  - `downloadByCloud(btnElement, cloud)` — 发送磁力链接到 115 离线下载
  - `parseButton(btnElement)` — 提取链接元素中的 `{href, text}`
  - `changeLayouts()` — 注入 CSS 调整 115 页面布局为全宽
  - `autoThumbnails($movieItems)` — 批量查询元数据 API 替换缩略图
- **`boot()`** — 主启动函数：注册全局点击事件、布局调整、arrive 监听动态 DOM
- **`$(document).ready()`** 启动

### `src/monkey_kernel.ts` — GM 抽象层

- 声明 `GM_*` 全局变量（`GM_openInTab`, `GM_setValue`, `GM_getValue` 等）
- 导入 `noty`（通知）、`jquery`（`noConflict(true)` 模式）、`arrive`（DOM 变化监听）、CSS 样式
- **`MonkeyKernel`** 类（全部静态方法）：
  - `openTab`, `setValue`, `getValue`, `deleteValue`, `addStyle`, `setClipboard` — GM API 的薄封装，支持 `GM_*` 和 `GM.*` 双模式回退
  - `requestJSON(request)` — 将 `GM_xmlhttpRequest` 包装为 Promise，自动处理 query/body 序列化
  - `notify(text, type, options)` — Noty 弹窗通知
  - `arrive(selector, handler)` — 使用 `arrive` 库监听动态 DOM 元素出现
- 重新导出 `$`, `jQuery`, `Noty`

### `src/yyw_cloud.ts` — 115 云盘 API

- **`FileInterface` / `FolderInterface`** — 领域模型接口
- **`YywFileInterface`** — 115 API 原始响应格式（`fid`, `cid`, `n`, `s`, `sha`, `pc`, `te`, `ico`, `u`, `m`）
- **`File`** 类 — 工厂方法 `factory()` 将原始 115 数据映射到领域对象；`humanFileSizeToByte()` 解析文件大小字符串
- **`Pagination`** 类 — 分页信息
- **`YYWCloud`** 类 — API 封装：
  - `requestAPI()` — 统一请求（POST 表单、X-Requested-With 头、错误处理）
  - `mkDir`, `remove`, `move`, `rename`, `getFileList`, `search`, `getFolderDetail`
  - `getSign()` — 获取离线下载签名
  - `download(magnet)` — 发起离线下载
- 包含已注释的待实现功能：`setThumbnail`, `uploadFromUrl`, `exportToAria2`, `getStars`, `uploadTorrent`

### `src/yinxing.ts` — 元数据 API + 文件整理

- **`Movie`** 接口 — 完整元数据（番号、标题、演员、厂商、图片等）
- **`YinXing`** 类：
  - `parseBanngo(text, ignorePrefixes)` — 从文件名中解析番号（正则 `/([a-zA-Z]{2,6})-?(\d{2,5})/i`）
  - `matchMovie(banngo)` — 查询 `http://yinxing.com/v1/movies?q=<code>`
  - `findOrCreateDir(dirName, targetFolderId)` — 在 115 中查找或创建文件夹
  - `toNames(movie)` — 生成 `{dirName: 厂商名, fileName: [番号]演员 - 标题}`
  - `handleAll(entryParentId)` — 分页遍历整个文件夹
  - `handlePage(parentId, offset)` — 递归处理：删除空文件夹（<120MB）、处理文件
  - `handleFile(file, isDir)` — 核心处理管线：提取番号 → 过滤非视频类型 → 查询元数据 → 创建文件夹 → 移动 → 重命名

### `release.js` — 发布脚本

- 构建时工具，**非运行时**代码
- 根据 `semantic-release` 传递的版本号，生成用户脚本头部（`// ==UserScript==` 块）
- 写入到仓库根目录 `index.js`（包含 `@version`、`@require jsDelivr` URL、所有 `@grant` 权限）

---

## 外部 API

### Greasemonkey API（在用户脚本头部 `@grant` 声明）

`GM_xmlhttpRequest`, `GM_addStyle`, `GM_notification`, `GM_setClipboard`, `GM_getResourceURL`, `GM_deleteValue`, `GM_listValues`, `GM_setValue`, `GM_getValue`, `GM_openInTab`, `GM_download`, `GM_registerMenuCommand`, `GM_unregisterMenuCommand`, `GM.xmlhttpRequest`, `GM.addStyle`, `GM.notification`, `GM.setClipboard`, `GM.getResourceURL`, `unsafeWindow`

### 115 云盘 API（HTTP）

- `GET/POST web.api.115.com/files` — 文件列表
- `POST web.api.115.com/files/add` — 创建文件夹
- `POST web.api.115.com/files/move` — 移动文件
- `POST web.api.115.com/files/edit` — 重命名
- `POST web.api.115.com/rb/delete` — 删除
- `GET web.api.115.com/files/search` — 搜索
- `GET web.api.115.com/category/get` — 文件夹详情
- `GET 115.com/?ct=offline&ac=space` — 获取离线下载签名
- `POST 115.com/web/lixian/?ct=lixian&ac=add_task_url` — 发起离线下载

### 元数据 API（HTTP）

- `http://yinxing.com/v1/movies?q=<番号>` — 单条查询
- `https://yinxing.av2.us/v1/search?q=<番号列表>` — 批量查询

---

## 构建与发布

### 脚本

```bash
npm run build      # 生产构建（minified, NODE_ENV=production）
npm run build-dev  # 开发构建
npm run watch      # 监听模式
npm run dev        # webpack-dev-server
npm run lint       # ESLint 代码检查
```

### 发布流程（semantic-release）

1. `semantic-release` 根据 Conventional Commits 推断版本号
2. `@semantic-release/npm` 发布 `lib/index.js` 到 npm
3. `@semantic-release/exec` 执行 `node release.js ${version}`，生成根目录 `index.js`（用户脚本头部）
4. 用户安装的 Tampermonkey 脚本通过 `@require` 从 jsDelivr CDN 加载构建产物

### 产物

- `lib/index.js` — Webpack 打包结果（约 160 KiB，minified），提交到仓库，npm 发布用
- `index.js` — 用户脚本头部（`release.js` 生成，仅在发布时存在）

---

## 关键约定

### 代码风格

- `MonkeyKernel` 和 `YYWCloud` 以静态方法为主
- `File.factory()` 等工厂方法将原始 API 响应转为领域对象
- 所有 GM API 调用使用 `(GM_foo || GM.foo)` 双模式回退，兼容新旧 Greasemonkey
- 用户界面文本全部为中文
- 使用 `console.debug` 带 `[Yinxing:xxx]` 前缀的日志输出
- 115 文件夹 ID 和 API 端点硬编码在代码中，无配置化

### 已知问题

- `noImplicitAny: false`，大量使用 `any` 类型
- 部分 JSDoc 注释与实际返回值不一致（如 `getFolderDetail` 的 JSDoc）
- 115 和元数据 API 使用 `http://` 而非 `https://`
- 部分方法名和日志名不一致（如 `handleFile` 日志中写作 `handleFie`）
- `lib/` 目录（构建产物）提交到仓库

---

## 开发注意事项

1. **Node 版本**：项目要求 Node 24.x，使用 `fnm use 24` 切换
2. **构建**：Webpack 5 通过 `ts-loader` 编译 TypeScript，`style-loader` + `css-loader` 处理 CSS
3. **代码检查**：ESLint 9 flat config，配置文件为 `eslint.config.mjs`
4. **TypeScript**：`tsconfig.json` 中 `moduleResolution: "bundler"`，`skipLibCheck: true`
5. **CSS 类型**：通过 `src/types.d.ts` 中的 `declare module '*.css'` 声明模块类型
6. **发布**：修改后确保 `npm run build` 和 `npm run lint` 通过