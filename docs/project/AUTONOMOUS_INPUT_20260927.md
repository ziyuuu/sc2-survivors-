# 自主输入与失败恢复检查 · 2026-09-27

本轮以 F01–F04、F05–F07 批准稿为准。测试使用本机 Chrome、Vite 开发入口和受控 World 场景；不是自然通关、实体手机、实体手柄、真人视觉或性能验收。截图仅存本地 `reports/local/`。

## 可重复入口

在资源准备完毕、没有源文件/HMR 和打包写入的稳定窗口运行：

```powershell
node tools/qa-autonomous-input.mjs
```

默认 `http://127.0.0.1:5173/`，可由 `SC2_QA_URL` 覆盖。入口顺序运行反馈矩阵、M3 菜单输入、M2 触屏/手柄成员选择、M3 失败恢复，失败即停止后续子脚本。

反馈矩阵为桌面 1440×900 键盘、窄屏 390×844 触摸模拟、桌面虚拟标准手柄。菜单卡片按已知选择器聚焦后通过实际 Enter / A 激活，不能把它报告为完整 Tab / 方向键寻路。战斗手柄使用实际轮询的右摇杆扇区和 A。输入矩阵使用注入资金、冻结时钟、注入演员、受控随机数。

## 覆盖范围

- 三入口菜单及三族 55 节点天赋查看。
- 固定英雄栏施法、G 侦测、T 架炮和触屏/虚拟手柄相应控制；头顶细条不截获输入。
- 五家族已付款增援收据：冻结、放弃不退款且保留原军、待选 DTO 往返、继承 Rank3 且不重复收费。这里的待选恢复是 DTO，不冒充 IndexedDB UI 存读。
- 生产开关保持已付款账本；一次发展后进入独立三商品商店；五次共享递增刷新；真实 IndexedDB 保存/刷新/读档保持报价和资金。
- 付费精英取消/确认，免费 Boss 实体奖励单次生成和关闭/重开/领取。
- 受控最终 Boss 死亡后的胜利→无尽准备，阻断建筑模型请求、重试、模拟 context-loss、取消保持旧战局。context-loss 是派发浏览器事件，不是物理 GPU 丢失恢复。

## 当前执行记录

`node --import tsx --test test/elite-receipt-regression.test.ts test/expedition-production.test.ts test/feedback-boss-loot.test.ts test/m3-flow.test.ts test/m3-endless.test.ts`：30/30 通过。第一次受沙箱子进程 `spawn EPERM` 限制，授权重跑成功；没有把环境失败记为游戏测试失败。

`node --check tools/qa-feedback.mjs` 通过。

新增夹具错误已纠正：在 `speed=0` 时应断言接收的 `desiredMode`，不是动画推进；选模式已经自动关闭弹窗；`captureRun` 检查点需克隆后再修改现场；独立 `scrollIntoViewIfNeeded` 会与 HUD 重建竞争，应由实际点击/触摸动作自滚动。原始诊断分别保存在 `report-autonomous-fixture-diagnostics.json`、`-2.json`、`-3.json`。

第四轮键盘及触屏整条矩阵通过；虚拟手柄在上述其余项目通过后，复现 Boss 奖励关闭后不能重新打开的问题。原因：战斗手柄只处理技能扇区，关闭后的右下 HUD 按钮不在手柄菜单遍历的 `#overlay` 内。修复仅在暂停菜单有待领奖励时增加“首领奖励 · 待领取”；手柄 Start→该入口可重开，结算仍走同一免费收据。原始失败记录 `report-autonomous-gamepad-boss-defect.json` 保留；专项修复回归另记，不能把原失败报告改写成通过。

`node tools/qa-m3-failure.mjs`：模型失败保持世界、重试不提前切图、模拟 context-loss 后取消保持准备态，3项通过，零 pageerror。实际结果 `reports/local/qa-m3-failure/report.json`。

资源停用独立复核：实际过滤入口为 `src/assets/manifest.ts`，23个明确退休 ID 在非生成运行源码没有直接引用；发布脚本若发现重新引用则报错。`node --import tsx --test test/release-hygiene.test.ts`：3/3通过，覆盖退休目录、现有英雄技能纹理依赖及显式战斗纹理依赖。此项不替代完整资源使用审计。

HUD修复 `npm run typecheck` 通过；首次模板引号错误由编译检查抓到并修复，受当时编译错误影响的专项浏览器进程已停止重开，没有记录为通过。

修复后的独立冷资源 Boss 回归于 `2026-09-27T05:19:25.181Z` 结束：`report-autonomous-gamepad-boss-fixed.json` 中 `passed=true`、`errors=[]`、exit0。Boss流程使用真正虚拟方向键逐项导航和 A，没有对这些控件程序聚焦：关闭→Start暂停→待领入口→准备增援素材→确认继续→选择型号→免费领取一次。专项也补了素材未加载时必须先准备的真实步骤；此前夹具错误记录 `report-autonomous-gamepad-neutral-fixture.json`、`-focus-fixture.json`、`-unprepared-fixture.json` 保留。矩阵本体仍保留原真实失败，不改写；两份报告合读覆盖三模式。

当前稳定窗口结束后已通知源素材子任务接入；旧 M2 触屏/手柄转移与 M3 菜单脚本延后到接入后的整合窗口运行，未将它们标为本轮通过。`qa-autonomous-input.mjs` 的修复后整串重跑同样尚未进行。

暂停一致性复核：新增入口只调用既有 `openBossLoot`，没有设置 `paused`。从暂停菜单进入后，关闭或领取仍留在暂停；从正常战斗进入后，关闭不额外暂停。既有“继续行动”依旧调用 HUD `pause()` 切换一次。补充 `test/feedback-boss-loot.test.ts` 的显式 pause false/true 回归，打开/关闭/领取均保持原值；该文件 11/11 通过。

本次实际报告 SHA256（本地文件）：

| 报告 | SHA256 |
| --- | --- |
| `qa-feedback-20260927/report-autonomous-input.json` | `DED4308A9F2A8651AE3674DB5CF72F06FEC0A12922B59DB1FF970D10604A73F0` |
| `qa-feedback-20260927/report-autonomous-gamepad-boss-fixed.json` | `E122DFF3C06F7DC78499922389A42554DACBC4AD6C8A9E5773D9ABAF180EB3D6` |
| `qa-m3-failure/report.json` | `00A6E3928E3C36972B25CE5E8E4E4F4A87927AF5709D75FCD020088FB56571D6` |

旧 `tools/qa-gamepad-shop.mjs` 仍依赖历史菜单、旧追踪移动与旧关间规则，未用作本轮通过依据。

M4/M5 真人视觉、自然完整阶段/无尽性能、实体输入设备与 M7 最终签收仍保持开放。
