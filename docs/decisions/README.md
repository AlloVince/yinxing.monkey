# 架构决策记录 (ADR)

本项目使用轻量级 ADR 格式记录重要的技术决策。每条 ADR 独立成文件，遵循以下结构：

- **背景** (Context)
- **问题** (Problem)
- **候选方案** (Options)
- **最终选择** (Decision)
- **原因** (Rationale)
- **后续影响** (Consequences)

## 索引

| ADR | 标题 | 状态 |
|---|---|---|
| [ADR-001](./0001-webpack5-tampermonkey-compat.md) | webpack 5 与 Tampermonkey 沙箱兼容 | 已实施 |
| [ADR-002](./0002-gm-api-resolution.md) | GM API 从沙箱全局逐级查找 | 已实施 |
| [ADR-003](./0003-env-configuration.md) | 本地环境配置外部化 (.env) | 已实施 |
| [ADR-004](./0004-layout-versioning.md) | 115 页面布局版本化 (V1/V2) | 已实施 |
| [ADR-005](./0005-tm-require-cache-flush.md) | TM @require 缓存刷新方案 | 已实施 |
