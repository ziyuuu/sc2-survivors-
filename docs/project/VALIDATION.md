# 本轮规划实际检查

日期：2026-09-24（r4精英简化表现与增强）。范围仅文档、项目管理工具、只读代码/资源/存档审计。**没有执行本轮游戏构建或新游戏/视觉/性能验收；设计状态仍为待用户确认。**

| 实际命令/检查 | 结果与范围 |
| --- | --- |
| `node tools/check-mvp-plan.mjs --write-board` | 已生成35项任务看板；编制中首轮发现生成顺序和章节匹配问题，已修正检查器后重新核对 |
| `node tools/check-mvp-plan.mjs` | 退出0；12需求均覆盖、6待确认决策、依赖无环、链接有效；165唯一节点、三族逐线41点/59资源、微操17/64；40款既有精英＋50款新增候选构成30家族各三款的90唯一精英设计；五种候选强化模板与三型共享视觉配方完整；15英雄普攻及技能表齐全；4个80点样例（含17点完整微操＋63点主线）可逐点到达并拒绝81点 |
| `npm run docs:check` | 退出0；原有GAME_DATA_REFERENCE与当前运行数据一致，未将待确认稿导入运行数据 |
| `git -c core.fsmonitor=false -c filter.lfs.process= -c filter.lfs.required=false diff --check -- AGENTS.md docs tools/check-mvp-plan.mjs` | 退出0；仅提示已有Git设置将LF转CRLF，无空白错误；这项不表示所有工作区修改都是本轮所作 |
| `Get-Item dist\SC2-Survivors-Demo.html`及`Get-FileHash -Algorithm SHA256` | 字节440,973,335，最后写入2026-09-24 18:04:03，SHA256 6855597b49ec3dcf956dcf5f8747d978cae5fbc7a1a5eed1e6772509e8edc17d；与本轮前交付记录一致 |

本次仅更新设计与规划校验，未修改游戏实现或运行新的模拟；运行时代码仍只有40款；新增50款、五模板增强及共享三型表现均为待确认设计，尚未实施。只读World四难度往返/导出档/地图核查的实际命令和输出见[MVP10_RUNTIME第10节](../MVP10_RUNTIME.md)。745资源和GLB内容体积统计见[MVP10_COMBAT_ASSETS第6节及第8节](../MVP10_COMBAT_ASSETS.md)。难度界面bug未复现；未取得用户描述的10倍速无尽档；素材存在不能代替原角色身份与人工画面验收。

[REVIEW_SNAPSHOT.json](REVIEW_SNAPSHOT.json)记录本次完整待审文档和管理文件散列，用于后续确认范围。它不是用户批准签名，也不会使BLOCKED_APPROVAL任务自动变READY。实际用户确认后再写审批记录。

## r5补充核对（2026-09-24）

- node tools/check-mvp-plan.mjs --write-board：退出0；36任务、13需求、7待确认决策、165天赋、90精英、16英雄候选、四份80点示例结构检查通过。
- npm run docs:check：退出0；当前运行数据参考仍匹配，新增策划尚未导入运行。
- 本轮未运行新游戏、视觉、性能或存档回归；这些仍按A41/A42及既有矩阵待验。历史r4命令/数字保留为当时记录。
- git -c core.fsmonitor=false -c filter.lfs.process= -c filter.lfs.required=false diff --check -- AGENTS.md docs tools/check-mvp-plan.mjs：退出0；仅有既有LF/CRLF提示，没有空白错误。

## r6补充核对（2026-09-24）

- 本地只读核对锁定SC 5.0.16.97563的ModelData/UnitData：BattlecruiserEX2战斗主体、HotSLeviathan独立空中Heroic单位及Leviathan.m3战斗主体；本地可玩m3-pack尚无两者GLB，净化者航母GLB存在但人工外观未验。缓存数据路径证据见MVP10_COMBAT_ASSETS第9.1节。
- node tools/check-mvp-plan.mjs --write-board：退出0，37任务、13需求、7待确认决策、165天赋、90精英、18英雄候选及四份80点样例结构检查通过。
- npm run docs:check：退出0，当前运行数据参考匹配；策划目标未导入运行。git diff --check的既有LF/CRLF提示不构成空白错误。
- 本轮没有构建、试玩、模型导入、视觉或性能验收；旧r5的16英雄数字仅为被本次纠正的历史执行记录。

## M0 r6用户确认登记（2026-09-24）

- 用户明确回复“可以。现在M0可以确认了。”；PD02—PD08批准范围与文档SHA-256见[APPROVAL_M0_20260924.md](APPROVAL_M0_20260924.md)。上述r4—r6待确认描述保留为当时的历史检查记录。
- M0-03已关闭，M1-01与M4-03为READY。尚未更改游戏玩法、素材或构建；不把文档检查当作运行、视觉、存档或性能验收。

- 批准登记后实际运行：node tools/check-mvp-plan.mjs --write-board 退出0（37任务、13需求、7决策ID、165天赋、90精英、18英雄、四份80点示例）；npm run docs:check 退出0；限定范围git diff --check退出0，仅报告已有LF/CRLF提示。未运行游戏构建与玩法测试。
