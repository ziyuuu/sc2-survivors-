# 历史诊断脚本与当前验证入口

核对于 2026-10-27。常规检查仍使用 npm test、npm run typecheck、npm run docs:check；具体改动选相关检查，完整回归按影响范围执行。

`inspect-queen-unlock-20261029.mts`是`674c528`修复前调查，断言旧卡残留并输出当时报告，不在修复后覆盖该历史结果。当前解锁卡清理、首次解锁排期及重型取消边界用`test/development-unlock-feedback.test.ts`与`qa-unlock-feedback.mjs`核验，见[修复记录](../docs/project/UNLOCK_FEEDBACK_FIX_20261029.md)。

qa-v*、qa-m1 至 qa-m7、qa-p3* 至 qa-p6*、旧英雄/精英独立演示以及 play-policy、budget-envelope 等保留阶段验证方法。部分依赖已删除的 API 或本地输入，只能配套历史提交使用。不要为运行旧脚本恢复旧生产逻辑。

package.json 中 test:browser / test:offline:save 仍指向 qa-current-logic.mts。这是历史命名入口，不凭 current 字样认定它覆盖最新 D05/T01/V04；先检查实际脚本的构建路径、存档假设和断言。最新验证证据分属以下报告：

- [D05 检查点](../docs/project/D05_CHECKPOINT_20261023.md)：保存、失败保护、多页冲突与装备事务。
- [T01 累计收尾](../docs/project/T01_CLOSEOUT_20261027.md)：同版 2704 唯一回归、画面/原声和机制范围。
- [V04](../docs/project/V04_DELIVERY_20261027.md)：同版 Web/离线/应用包、资源和更新回退。
- [V05](../docs/project/V05_SERVER_STAGING_20261027.md)：真实服务器与后台；公开环境验收仍开放。

当前 Run schema26/profile v6，旧文档中的 schema24 等不能视作新结果。prepare-v04-* 等日期型脚本有固定输入/路径，不是新克隆直接执行的通用发布命令。报告中已按保留规则清理的截图、缓存和旧构建按需复现，不要求永久补回。


2026-10-29虫族／舰装定向入口：`qa-zerg-melee-equipment.mjs`使用合成账户和暂停关卡，通过真实HUD验证三端逐巢进化及三族局外装备；先建立`dist/zerg-melee-equipment-20261029`父目录，再以`SC2_WEB_OUTPUT=dist/zerg-melee-equipment-20261029/web`构建。支持`--evolution-only`、`--entry-only`，不代表自然战役、原手机或性能结果。[记录](../docs/project/ZERG_MELEE_EQUIPMENT_IMPLEMENTATION_20261029.md)。
