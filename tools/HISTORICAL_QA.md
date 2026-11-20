# 历史诊断脚本与当前验证入口

2026-11-16：旧 Current、V04 和 T01 交付已清理。历史检查脚本引用的生成物不再长期保存；需要复现时使用相应代码与资源重建，完成后再次清理。只保留简要结论和复现代码，见[产物保留规则](../docs/project/ARTIFACT_RETENTION.md)。

`qa-v*`、`qa-m1` 至 `qa-m7`、`qa-p3*` 至 `qa-p6*`、各次英雄／精英独立演示、旧 `play-policy.ts` 和 `budget-envelope.mts` 保留对应阶段的原始验证方法；它们不是当前版本的测试入口。部分依赖已删除的旧存档、奖励或原型生产 API，只能在 Git 对应历史提交运行。不要为运行这些脚本恢复旧生产逻辑。

2026-11-09教学微调与配音：local.4通过环境变量使用polish-20261109独立目录，收尾用`finalize-tutorial-polish.mjs`；旧工具默认仍local.3。`finalize-tutorial-feedback.mjs`内有2秒反馈旧断言，仅用于11月6日历史候选，不能为通过它恢复长等待。当前半秒短反馈、批准的离线中文配音与三族含音录屏见[实现记录](../docs/project/V1_1_TUTORIAL_IMPLEMENTATION_20261105.md)。具体变量和声音源工具见[工具入口](README.md#11-短版教学当前)。

既有设计和验证报告保留当时结论；历史 HTML 与包按现行保留规则清理，不代表当前 schema24/profile v6 的新验证结果。当前实际结果见 `docs/project/CURRENT_LOGIC_CLEANUP_20261006.md`。

2026-11-06教学节奏修订：短版build/qa/serve工具的当前路径集中在`tutorial-candidate-paths.mjs`，指向feedback-20261106候选。`finalize-short-tutorial.mjs`仍固定20261105旧目录及19次点击，只适用于local.2历史候选；当前收尾用`finalize-tutorial-feedback.mjs`。`--fast`为有限功能检查，不是正常时钟录屏证据；当前三族录屏、镜头和触屏/恢复范围见[本轮QA](../reports/qa/tutorial-feedback-1.1-20261106.json)。

2026-11-06：`inspect-player-feedback-20261105.mts`、`qa-player-feedback-20261105.mjs`属于修复前的橙色购买报错/功能装备跳过复现，不能在新源码上要求其故障断言通过。当前使用 `test/player-feedback-fixes.test.ts` 和 `qa-player-feedback-fixes-20261106.mjs`，见[修复范围](../docs/project/PLAYER_FEEDBACK_FIX_20261106.md)。

2026-11-03缓存升级修复：`test/packed-worker-update.test.ts`验证协议/实际控制权/升级失败/清理边界；`verify-cache-worker-upgrade-20261103.mjs`重放线上发现的旧Worker SHA `777a07c5…`，对本批 `86c3ca45…`候选执行本机有限升级与真实检查点恢复。小场景的模拟保存和完整游戏的真实UI检查点分别记录；不代替线上CDN或物理iPhone验收。`package-cache-worker-fix-20261103.mjs`的输入版本固定，不能跨版本直接套用。见[结果与步骤](../docs/project/COZE_CACHE_WORKER_FIX_20261103.md)。

2026-11-03公开Coze检查：`verify-coze-live-20261103.mjs`及`inspect-coze-{delivery,cache}-20261103.mjs`针对appBuildId `34408a35…`，记录正常三族流程、CDN/SW混用及配置404。是有限线上观察，不能推断物理iPhone/长局通过，也不能将某一次HTTP成功覆盖其他请求变体的失败。版本变化时保留[当时结论](../docs/project/COZE_LIVE_CHECK_20261103.md)，不要覆盖历史报告；详细参数见工具入口。

2026-11-02运行补查：`inspect-runtime-{persistence,hero-checkpoint,rescue-save,resources,simulation}-20261102.mts`及`inspect-runtime-browser-20261102.mjs`针对`8d680ac`。资源脚本用`node --import tsx --test`，其他mts用`node --import tsx`；simulation依次传terran/zerg/protoss，含保命/有限清敌，虫族第14关真实恢复失败是待修缺陷。browser生成本批隔离构建、使用临时Chrome与本机服务；`--no-build`只在已有本批构建时有效。AUDIT断言记录现有缺陷，不能当修复验收。覆盖、成功对照及限制见[运行过程补充审查](../docs/project/RUNTIME_CODE_AUDIT_20261102.md)。

2026-11-02全面审查：`inspect-full-audit-assets-20261102.mts`、`inspect-full-audit-persistence-20261102.mts`、`inspect-full-audit-runtime-20261102.mts`、`inspect-full-audit-simulation-20261102.mts`针对`8d680ac`确认8项产品缺陷，**断言当前缺陷，不是正确行为验收测试**。修复后应改成对应正常预期的回归，不能为通过旧调查而恢复错误行为。资源脚本加`--verify-snapshot`核对当前压缩载荷；runtime脚本须用`node --import tsx --test`运行，其他用`node --import tsx`。结果、版本和限制见[全面审查](../docs/project/FULL_CODE_AUDIT_20261102.md)。

2026-11-02修复后入口：`test/refraction-preparation-recovery.test.ts`、`test/packed-cache-recovery.test.ts`、`test/compressed-resource-provenance.test.mjs`，14项新回归。`verify-stability-browser-20261102.mjs`用真实Chrome、临时回环服务检查SW缓存故障降级、清理、正式压缩首战及刷新续局；不访问真实玩家档案或部署服务。来源封存与更新命令见[四项修复](../docs/project/STABILITY_FIX_20261102.md)。

2026-11-02：`inspect-stability-findings-20261102.mts`针对`fabfb4a`独立复现折射准备挂起、坏包重试、可选磁盘缓存阻断和压缩更新来源核验缺失。使用替身GPU/Cache API及隔离更新目录，断言的是修复前缺陷；修复后不能为使它通过而恢复旧行为。方法、24项相关回归和实际边界见[独立复核](../docs/project/STABILITY_RECHECK_20261102.md)。

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


2026-11-02后续：两轮审查的产品修复用新增 `test/audit-*`、`decoder-recovery`、`runtime-resource-recovery` 及 `verify-audit-browser-20261102.mjs` 验证正确行为。原 `inspect-full-audit-*`、`inspect-runtime-persistence/hero-checkpoint/rescue-save/resources/browser-*` 含修复前故障断言，保留历史用途，不能恢复缺陷来使它们通过。`inspect-runtime-simulation-20261102.mts` 的正常行为断言仍可复用，本批三族均通过，原虫族失败结果保留在历史报告。范围与命令见[修复记录](../docs/project/AUDIT_FIXES_20261102.md)。


2026-11-05教学版本2：`qa-first-run-tutorial.mjs`、`qa-tutorial-ui-restore.mjs`、`finalize-tutorial-delivery.mjs --presentation-only` 和 `finalize-tutorial-ui-restore.mjs` 属于旧自由引导／UI回退证据；不要用辅助清敌或“非UI源码未变”断言验收新固定脚本。新入口为 `probe-guided-tutorial.mts`、`qa-guided-tutorial.mjs`、`qa-guided-recovery.mjs` 和 `finalize-guided-tutorial.mjs`，详见tools/README当前段。
# 2026-11-05 教学范围变更

`qa-guided-*`、`probe-guided-*` 与 guided候选/录屏验证的是旧三关流程。用户后来明确改成出发前询问、独立两段课程和精英固定双白装；当前入口为 `qa-short-tutorial.mjs`、`probe-short-tutorial.mts` 与 `short-tutorial.test.ts`。不得为通过旧脚本恢复三关、反复启停生产或强迫满血修复。旧存档version1/2继续兼容，不自动重置成新客。
