import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const local='reports/local/armed-support-feedback-20261111',read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const cards=await read('reports/qa/armed-support-feedback-cards-20261111.json'),player=await read(local+'/player-entry.json'),release=await read(local+'/release-player.json'),visual=await read(local+'/visual-final.json'),bunker=await read(local+'/bunker-final.json');
assert.equal(cards.passed,45);for(const r of [player,release,visual,bunker]){assert.deepEqual(r.errors,[]);assert.ok(!r.failure);}assert.ok([...visual.cards,...bunker.cards].every((c:any)=>c.triggered));
const tests=await fs.readFile(local+'/npm-test-final-ports.txt','utf8');assert.match(tests,/tests 3148/);assert.match(tests,/pass 3148/);assert.match(tests,/fail 0/);
const files:string[]=[];async function walk(dir:string){for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=path.posix.join(dir,e.name);if(e.isDirectory())await walk(f);else files.push(f);}}await walk('src');const h=createHash('sha256');for(const f of files.sort())h.update(f).update(await fs.readFile(f));const sourceSha256=h.digest('hex');
const build=await read('dist/armed-support-feedback-20261111/web/web-release.json'),spec=await fs.readFile('docs/project/V1_3_TERRAN_ARMED_SUPPORT_CODE_SPEC_20261110.md'),specSha256=createHash('sha256').update(spec).digest('hex');
assert.equal(specSha256,'1eda71abf0cbc81727122b23c4a47263fd0e36be73ee55466e3d45a90011842b');assert.equal(build.appBuildId,release.appBuildId);
const result={date:'2026-11-11',candidate:'armed-'+sourceSha256.slice(0,12),sourceSha256,branch:'体积优化版',head:'679720fefa5c',appBuildId:build.appBuildId,assetRelease:build.release,runSchema:build.runSchema,rulesId:build.rulesId,specSha256,status:'待验证',checks:{cards:45,nodeBaseComparisons:9,visualCorrections:visual.cards.length,finalBunkerReplay:1,player:player.checks.length,packaged:release.checks.length,tests:3148,targeted:59,typecheck:'通过',docsData:'已更新',docsCheck:'通过'},limitations:['工程前态与桌面/触屏模拟，不是自然完整战役或物理手机验收。','第一批 PLAY-1X 仍待办；当前正式生产仍沿已付订单扣费，未代做免费经济与波次。','本轮概率与 B01/B02 平衡为授权范围内的候选参数，仍需用户体验验收。','未提交、推送、部署或公开发布。'],resolvedAttempts:['首次沙箱全量回归因本地 HTTP EACCES 失败，允许回环后完整回归通过。','与构建/全回归同时首次预载 W01 超过 120 秒；串行预载并允许 300 秒后完成 54 次实机。','O03 初版工程阵容在出勤前团灭；使用固定种子、V 阶正式阵容和触发前短暂停步后，真实受击充能与光柱完成。','45 次初轮+9 基础对照后仅调整 G02 射孔外移与重复音频回执；最终 G02 单独重新打开重放，59 定向与3148完整回归再通过。']};
await fs.writeFile('reports/qa/armed-support-feedback-20261111.json',JSON.stringify(result,null,2)+'\n');await fs.writeFile(local+'/version.json',JSON.stringify(result,null,2)+'\n');
const md=`# 武装支援实机反馈复验（2026-11-11）

候选 \`${result.candidate}\`；分支 \`${result.branch}\`，HEAD \`${result.head}\`。正式打包标识 \`${result.appBuildId}\`，规则 \`${result.rulesId}\`、存档 schema ${result.runSchema}。最新规则见[反馈修订](../../docs/project/V1_4_TERRAN_ARMED_SUPPORT_FEEDBACK_20261111.md)，R3 原文件未改，全文 hash 保持。

已将战斗卡牌改为实际事件概率触发，成功出勤后进入 CD，CD 到期不自动放。正式阵亡、新订单分别驱动救场和订单被动。节点 N06 也不再绕过基础事件门槛。简句／详情／数据参考与正式配置同源。

| 反馈 | 本轮结果 |
| --- | --- |
| 殿后爆破 | 真实后撤投影达到 1.5 码才在旧点留包；侧移排除；0.5 秒延迟真实命中 |
| 地堡输出 | 两枪各自 12 基础伤害，每 0.5 秒一组，错开 0.08 秒；双射孔外移、各有曳光／枪口闪光／一次声音 |
| 焦油 | 真实油带按时展开；湿润色块、反光、不规则边缘替换旧平面波纹 |
| 跳弹 | 实际下一跳金色曳光，到达才结算，恢复重建未抵达轨迹 |
| 死亡弹幕 | 正式攻击概率触发，36 秒 CD，固定 3 排；持续开火不延长本轮 |
| 困兽夹 | 捕获目标每秒最大生命 5% 基础伤害，首领同规则；3 秒／N04 为 4 秒，仍走护甲与承伤 |
| 方向 | 炮击推进、舰队入场与双兵营以实际来敌轴布置；左右来敌测试通过 |
| 手动技能 | B03、B06、B09 等本卡技能均沿事件概率出勤，B09 手动卡牌入口取消；原 R3 的额外库存核击消耗品操作保留 |
| 核弹遮挡 | 原版爆炸缩小烟云空间／高度、降低粒子不透明度、缩短网格闪光；结算与爆区不变 |
| 生化焦油 | 地面／附身紫绿配色，目标状态驱动附身油独立计时 |
| 光盾 | 实际盾池有效时蓝色盾壳／网格／脚环，承伤闪亮，耗尽和到期消退 |
| 行星要塞 | 本座累计实际受损 1500 蓄一发；消费时贯穿光柱与三名实际驻军同属回执 |

45 卡与九组同种子基础对照共 54 次实际打开、重新播放；[逐卡条件与结果](armed-support-feedback-cards-20261111.json)记录各卡号。G04/P03/O03 三项画面修正后复验，G02 最后射孔修改后另重放一次。实际看过核弹、油带、紫绿附身、光盾、跳弹、地堡、要塞光柱截图；其余逐卡以真实状态／回执与抽样画面核验，不冒称用户已认可美术。

正常玩家入口 ${player.checks.length} 项：三格货架 W01 首购→复购 W01→W04→G01 的进度 1→1→2→3，免费紫节点、保存／重载／继续、下一战与橙卡购买。打包版 ${release.checks.length} 项：八个新增资源键字节 hash、无 debug API 的正式购买及 IndexedDB 续局／下一战。工程检查点仅准备前态，购买、存档及继续均使用正式 UI。

验证：最终 \`npm test\` 3148/3148、定向 59/59、\`npm run typecheck\`、\`npm run docs:data\`、\`npm run docs:check\` 通过。检查点测试覆盖成功机会仅消费一次、CD、困兽夹逐秒游标、逐弹／乘员等既有事务。最终构建隔离于 \`dist/armed-support-feedback-20261111/web\`，3950 个资源键／3852 份文件，资源字节 hash 验证通过；未覆盖 Current 或共享 dist/web。

本地入口：<http://127.0.0.1:5196/preview/armed-support-showcase-20261111/>，或双击 \`preview/armed-support-showcase-20261111/启动展示.cmd\`。每项可单独重放，展示只准备前态，后续为正式 World、BattleRenderer、模型和 AudioEffects；未使用展示专用伤害或临时重置 CD。

失败记录：隔离沙箱阻止本地 HTTP 的 EACCES 后，允许回环重跑通过；第一次并发构建时 W01 预载超时，串行加载后 54 次通过；O03 初版前态团灭，调整前态后真实充能与光柱通过。详细可重建证据位于 \`reports/local/armed-support-feedback-20261111\`，复现脚本为 \`qa-armed-showcase.mjs\`、\`qa-armed-feedback.mjs\`、\`verify-armed-feedback.mts\`、\`qa-armed-player.mts\`、\`qa-armed-release.mts\`。

仍开放：用户画面／平衡验收、物理手机、第一批 PLAY-1X 共用免费生产与波次合流。未提交、推送、部署或发布；其他任务工作区改动保留。
`;
await fs.writeFile('reports/qa/armed-support-feedback-20261111.md',md);
console.log(JSON.stringify({candidate:result.candidate,build:result.appBuildId,checks:result.checks}));
