# M1 旧代码退役核验

日期：2026-09-25（北京时间）。用户明确批准具名旧分支清理；本记录区分运行入口和留存的历史源码。

| 清理对象 | 已落实 | 当前实际路径 |
| --- | --- | --- |
| 旧英雄招募、部署、施法回退 | 从 World 移除 | expedition-heroes 负责三族英雄与冷却 |
| 手柄旧技能表 | 六扇区统一为推进、单位操作、侦测、英雄槽1／2／3 | controls/skills 当前注册表 |
| HUD 的旧12关、多购商店、旧生产／进化面板 | 运行分支删除；两个无调用面板移至 test/historical-v26 | 18关、付费发展一选一、免费强化一选一 |
| World.build、queue、startBatch 及旧批次／训练辅助 | 已删除，src 无调用者 | expedition-production 逐乘员付款、训练、空投与安全接收 |
| World.refreshStats、fire、hit 的旧属性／武器／护盾回退 | 已删除；保留当前普通武器默认攻击分支 | refreshExpeditionStats、refreshExpeditionHero、fireWeaponPattern、expeditionDamage |
| World 的旧战局条件 | 单位更新、索敌、治疗、胆汁、波次等非空 expedition 分派已收敛 | 无尽模式所需独立调度仍保留，M3再改无尽场景 |

World.addBuilding、reinforce、productionCost、availableCapacity、固定步和现行战斗公式仍由三族规则使用，未删除。自动审批曾拦截一个同时改动 addBuilding 中 instant_tech 的补丁；该补丁未执行，后续仅删除具名旧训练方法并完整验证。旧 progression/rewards.ts 只由历史用途测试引用，src 运行入口没有导入；它不随游戏打包，也不提供第二套运行规则。M1 新局冻结零天赋，M2 按已批准的原版四线方案接入。

复核：src 无 build／queue／startBatch 调用，也无旧奖励或旧面板导入；npm run typecheck、npm test（379/379）、npm run test:save（20/20）、开发版五条浏览器存读场景和 file:// 离线存读均通过。正式包及指纹见 [M1 验证记录](M1_VALIDATION.md)。
