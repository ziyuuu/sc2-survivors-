# 历史诊断脚本

`qa-v*`、`qa-m1` 至 `qa-m7`、`qa-p3*` 至 `qa-p6*`、各次英雄／精英独立演示、旧 `play-policy.ts` 和 `budget-envelope.mts` 保留对应阶段的原始验证方法；它们不是当前版本的测试入口。部分依赖已删除的旧存档、奖励或原型生产 API，只能在 Git 对应历史提交运行。不要为运行这些脚本恢复旧生产逻辑。

当前入口是 `npm test`、`npm run typecheck`、`npm run docs:check`、`node tools/generate-m2-talents.mjs --check`、`npm run test:browser` 和 `npm run test:offline:save`。浏览器脚本使用正式构建及真实 UI，输出到 `reports/local/current-logic-20261006/`，需要先构建 `dist/web` 和新的当前离线 HTML。

既有设计、验证报告、历史 HTML 与包保留原始内容，不代表当前 schema24/profile v6 的新验证结果。当前实际结果见 `docs/project/CURRENT_LOGIC_CLEANUP_20261006.md`。
