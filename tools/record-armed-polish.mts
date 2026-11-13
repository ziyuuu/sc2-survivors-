import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const local='reports/local/armed-support-polish-20261111';
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const cards=await read('reports/qa/armed-support-polish-cards-20261111.json');
const showcase=await read(local+'/showcase-54.json');
const player=await read(local+'/player-entry.json');
const release=await read(local+'/release-player.json');
const ricochet=await read(local+'/ricochet-final.json');
const cycles=await read(local+'/cycles.json');
const sources=await read(local+'/source-identities.json');
const build=await read('dist/armed-support-polish-final-20261111/web/web-release.json');
assert.equal(cards.passed,45);assert.equal(showcase.cards.length,54);
for(const report of [showcase,player,release,ricochet]){assert.deepEqual(report.errors,[]);assert.ok(!report.failure);}
assert.equal(player.checks.length,8);assert.equal(release.checks.length,12);
assert.ok(showcase.cards.every((c:any)=>c.triggered));assert.ok(ricochet.cards.every((c:any)=>c.triggered));
assert.deepEqual(cycles.rows.map((r:any)=>r.casts.length),[4,3,3,3,2,2,2,2]);
assert.equal(build.appBuildId,release.appBuildId);
const tests=await fs.readFile(local+'/npm-test-final.txt','utf8');
assert.match(tests,/tests 3155/);assert.match(tests,/pass 3155/);assert.match(tests,/fail 0/);
const targeted=await fs.readFile(local+'/targeted-final.txt','utf8');
assert.match(targeted,/tests 97/);assert.match(targeted,/pass 97/);assert.match(targeted,/fail 0/);
const specSha256=sha(await fs.readFile('docs/project/V1_3_TERRAN_ARMED_SUPPORT_CODE_SPEC_20261110.md'));
assert.equal(specSha256,'1eda71abf0cbc81727122b23c4a47263fd0e36be73ee55466e3d45a90011842b');
const files:string[]=[];
async function walk(dir:string){for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=path.posix.join(dir,e.name);if(e.isDirectory())await walk(f);else files.push(f);}}
await walk('src');const h=createHash('sha256');for(const f of files.sort())h.update(f).update(await fs.readFile(f));const sourceSha256=h.digest('hex');
const git=(...args:string[])=>execFileSync('git',['-c','filter.lfs.process=','-c','filter.lfs.smudge=','-c','filter.lfs.required=false',...args],{encoding:'utf8'}).trim();
const result={date:'2026-11-11',candidate:'armed-'+sourceSha256.slice(0,12),sourceSha256,branch:git('branch','--show-current'),head:git('rev-parse','--short=12','HEAD'),appBuildId:build.appBuildId,assetRelease:build.release,runSchema:build.runSchema,rulesId:build.rulesId,specSha256,status:'待验证',checks:{cards:45,nodeBaseComparisons:9,finalRicochetReplay:ricochet.cards.length,player:player.checks.length,packaged:release.checks.length,tests:3155,targeted:97,typecheck:'通过',docsData:'已更新',docsCheck:'通过',sourceModelsAudited:sources.models.length,shippingModelKeys:10,shippingModelPayloads:9},cycles:cycles.rows,limitations:['工程前态和桌面浏览器/触屏模拟，不是自然完整战役、物理手机或用户美术验收。','PLAY-1X 第一批共用免费生产与波次仍待办，未代做或宣称合流。','完整3155回归后仅收窄自爆环呈现并补回跳弹实际命中声音；最终97定向和G07实机另重放。','本轮CD、配套寿命及五项表现为已授权候选，等待用户体验验收。','未提交、推送、部署或公开发布。'],resolvedAttempts:['首次完整回归有4项旧预期未随用户批准的新CD/寿命/资源数/跳弹伤害更新；修正旧断言后3155项通过。','第一次P05渲染检查发现旧地堡预备映射；切换SupplyDepot后P05/O03复看及54场完整重放通过。','实际核爆分层诊断定位第一枚实体身份泄漏至旧核爆贴片；修复后54场使用未屏蔽的正式渲染器。诊断工具的隐藏图层不作为最终画面验收。','出勤探针早期把失败落点重试当作一次出勤；改为实际乘员/建筑出现的castId计数，60秒八项均通过。','一次工具中断使未结束的构建/QA停止；已重新隔离构建并完成54场实机，不采纳中断结果。']};
await fs.writeFile('reports/qa/armed-support-polish-20261111.json',JSON.stringify(result,null,2)+'\n');
await fs.writeFile(local+'/version.json',JSON.stringify(result,null,2)+'\n');
const cycleRows=cycles.rows.map((r:any)=>`| ${r.id} | ${r.cd} | ${r.casts.join('、')} | ${r.casts.length} |`).join('\n');
const md=`# 武装支援第二轮实机修订（2026-11-11）

候选 \`${result.candidate}\`，分支 \`${result.branch}\`、HEAD \`${result.head}\`；正式打包标识 \`${result.appBuildId}\`，规则 \`${result.rulesId}\`、存档 schema ${result.runSchema}。R3 全文 hash 保持。最新决定与完整 CD 表见[本轮规则](../../docs/project/V1_4_TERRAN_ARMED_SUPPORT_POLISH_20261111.md)；[上一轮报告](armed-support-feedback-20261111.md)是历史候选。

本轮保留用户确认的训练、跳弹、燃烧弹、阵亡救场、殿后爆破、死亡弹幕、火力超载和节点联动 CD。仅缩短投送、部署和其他炮击类的 29 项基础 CD，并同步配套临援/建筑在场寿命，避免短 CD 被上一批在场上限一直阻塞。事件概率保持，成功出勤后才计 CD，到期仍需真实事件与条件。

| 反馈 | 当前实现 |
| --- | --- |
| 游骑兵 | 三辆真实恶火沿地面路径追敌，接敌自爆；每辆一次爆炸与燃烧，死亡/到期同一回执，关末取消不引爆 |
| 跳弹 | 2/3/4 次不同目标弹链，优先较远目标，有替代时避开近期同一目标对；金色曳光实际飞抵才伤害，命中光点和原单位命中声跟随事件 |
| 核弹 | 中心落点误带敌人身份，导致首枚落入旧通用贴片；现只存 x/z，整轮统一原版核爆路由，主体显现且烟云受控，发数/库存/伤害/时序不变 |
| 堡垒空降 | 四座已核实原版 SupplyDepot 装甲设备；保留阻敌、护甲+3与攻速+15%光环，无武器和驻军。旧候选已落地 P05 恢复时迁移外形 |
| 要塞光柱 | 2 秒真实扫射，0.25 秒一段、共 8 段，总基础伤害预算 640；实际跟敌，充能只消费一次、三名驻军只出门一次，恢复不重放已结算段 |

P05 新增原版生存/死亡两份资源键，已按武装支援独立清单注册，沿正式分关准备与释放路径使用。来源审计 ${sources.models.length} 项模型、5 项原版特效、2 项要塞声库；武装支援实际新增清单为 10 个模型键、9 份独立字节。未修改锁定的核心资源目录。

60 秒正式 World 实测以本次实际落地或乘员出现计数；失败落点重试不算出勤。固定种子与工程前态，仅准备触发前条件，后续不改 CD 或追加单位：

| 卡号 | CD 秒 | 实际出勤时刻（秒） | 次数 |
| --- | ---: | --- | ---: |
${cycleRows}

45 卡与九组同种子、同阵容基础对照共 54 次，均实际打开、重新播放，并核对正式 World 状态与回执；[逐卡条件和结果](armed-support-polish-cards-20261111.json)列全 45 项。实际看过本轮游骑兵、跳弹、核爆、装甲设备与要塞光柱的普通镜头截图。最后跳弹命中声音补回后，另开 G07 重放；不将自动检查称为用户认可。

正常玩家入口 ${player.checks.length} 项通过：三格货架 W01→复购W01→W04→G01，进度 1→1→2→3，紫节点领取、保存重载继续、下一战与橙卡购买。工程检查点只准备关间前态，取得和存档操作走正式 UI。隔离打包版 ${release.checks.length} 项通过：10 个武装支援模型键字节 hash、无 debug API 的正式购买/IndexedDB 续局/下一战。

验证：\`npm test\` 3155/3155；最终定向 97/97；\`npm run typecheck\`、\`npm run docs:data\`、\`npm run docs:check\` 通过。完整回归后仅收窄自爆环呈现并补回跳弹命中声音，最终定向与 G07 实机覆盖该差异。检查点覆盖游骑兵去重、核击身份、跳弹待抵达链、光柱逐段游标及既有库存/已付订单/乘员事务。

最终构建隔离于 \`dist/armed-support-polish-final-20261111/web\`，${build.assetCount} 个资源键、${build.fileCount} 份文件、${build.assetBytes} 资源字节；未覆盖 Current 或共享 dist/web。可重建明细留在 \`${local}\`，诊断失败及修正见同名 JSON 的 resolvedAttempts。复现工具为 \`qa-armed-showcase.mjs\`、\`verify-armed-feedback.mts\`、\`check-armed-cycles.mts\`、\`qa-armed-player.mts\`、\`qa-armed-release.mts\`、\`record-armed-polish.mts\`。

本地总入口：<http://127.0.0.1:5196/preview/armed-support-showcase-20261111/>，或双击 \`preview/armed-support-showcase-20261111/启动展示.cmd\`。选择任意卡即可重新播放，后续运行正式 World、BattleRenderer、模型与音效。简句/详情和本轮 CD/寿命同源。

状态待验证：等待用户画面/平衡评价；物理手机、自然完整战役与 PLAY-1X 第一批免费生产/波次合流复验仍开放。保留其他任务改动；未提交、推送、部署或发布。
`;
await fs.writeFile('reports/qa/armed-support-polish-20261111.md',md);
console.log(JSON.stringify({candidate:result.candidate,build:result.appBuildId,checks:result.checks}));
