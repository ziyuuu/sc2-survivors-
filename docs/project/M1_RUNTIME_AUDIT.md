# M1-01 旧运行路径与替换闭包

日期：2026-09-24。执行人：Codex。依据：M0 r6批准稿与当前工作区；本清单只记录实际源文件，不把旧测试断言当成新玩法要求。

## 基线

- 开始时工作区已有193项Git状态变更，包含未提交源码、素材与HTML；未执行reset、stash或清理。
- 现有dist/SC2-Survivors-Demo.html：440,973,335字节，SHA-256 6855597b49ec3dcf956dcf5f8747d978cae5fbc7a1a5eed1e6772509e8edc17d。
- npm run typecheck退出0。npm test在受限沙盒内的并发子进程spawn触发EPERM，不是玩法测试失败；单进程跑three-race-save与elite-receipt-regression为9/9通过。

## 删除或替换的运行分支

| 根入口 | 当前旧路径 | M1替换目标 |
| --- | --- | --- |
| app/bootstrap.ts, app/run-session.ts | 同时创建TalentProfile与ThreeRaceTalentProfile，按存档规则迁移/复活旧玩法 | 只创建一个PermanentProfile，旧档只作隔离检查与明确导入 |
| simulation/world.ts, run-state.ts | newRules/expedition是否为空选择12或18关、旧商店、旧训练、旧英雄与奖励 | 单一18关、三族编制和生产、付费建筑三选一与免费强化三选一 |
| simulation/persistence/run-snapshot.ts, run-fields.ts | schema1、v23/v24/v26兼容与旧字段 | schema2、固定RunConfig、非空三族状态；删除旧战局迁移 |
| persistence/archive.ts, save-repository.ts | v1外壳，双profile，读取时自动迁移旧投资 | v2外壳、单profile、原子提交及双备份；旧v1由隔离导入器只读处理 |
| ui/hud.ts, controls/skills.ts, render与单位标记 | 12/18关、旧天赋按钮、legacy CSS/标签按expedition条件切换 | 只显示当前18关界面；M1阶段天赋购买锁定为零配点等待M2 |
| simulation/progression/rewards.ts及旧生产/科技工具 | 旧多购卡与旧Job生产 | 从打包入口移除；保留仍用于新三族规则的经济与战斗公式 |

## 保留并核验的共享能力

60Hz固定步、World实例身份、索敌/伤害/地图、三族原单位和技能、Expedition逐乘员付款与安全接收、建筑和卡牌收据、暂停边界、图编码、IndexedDB同一事务与两份备份。旧价格表仅供隔离数据转换，不能再次成为运行天赋模块。历史测试和报告保留为证据，新合同测试替换相反的旧玩法断言。

## 依赖顺序

先建立唯一RunConfig/单profile/schema2，再调整World与HUD入口；候选读档验证在提交前完成；旧档导入器不能引用旧World；最后以精英救援真实冻结/保存/重复提交场景回归。M2才接入144主节点与21微操节点，M1的正式新局冻结零天赋。

## M1 完成后的运行状态

- 新局固定 mvp-1.0、18关、非空三族编制与生产、冻结零天赋；新存档采用外壳v2、战局schema v2和单一永久档案v3。实体分别保存种族与阵营。读档先隔离检查再提交恢复；旧v1战局不进入 World。
- 旧档在当前槽或备份中被发现时提供原文导出；核算器按冻结旧价计算本金，拒绝双档案矛盾，以来源校验和作一次性收据。IndexedDB 仍在同一事务提交战局和档案，并保留两份备份。
- 精英救援先登记共享模型加载任务，再通知 HUD；模型未解码时按钮仍可操作。卡牌领取先结算再通知／保存；选择中暂停、读档及重复提交回归均通过。
- 19份旧12关、多购商店、旧训练与旧天赋断言已原样移至 test/historical-v26。旧英雄／手柄／HUD入口、World 的旧训练方法与旧战斗回退已按调用闭包退役；两个孤立 HUD 面板另移入历史目录。现行订单、空投和 addBuilding 保留。
- 完整命令、浏览器／离线结果、包体指纹见 [M1 验证记录](M1_VALIDATION.md)；逐项调用证据见 [清理核验](M1_CLEANUP_PROOF.md)。
