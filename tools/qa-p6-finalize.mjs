import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const root='reports/local/p6-20261006',read=p=>fs.readFile(p,'utf8').then(JSON.parse),preservation=await read(root+'/preservation.json'),index=await read(root+'/evidence-index.json'),offline=await read(root+'/offline-final/offline.json'),web=await read(root+'/web-cache-final/report.json'),handoff=await read(root+'/handoff-update.json'),production=await read(root+'/perf-production-80-endless/production.json'),pressure=await read(root+'/pressure.json');
const regression=await fs.readFile('reports/local/p6-regression-release.log','utf8');assert.match(regression,/(?:# |ℹ )tests 1188/);assert.match(regression,/(?:# |ℹ )fail 0/);assert.equal(offline.checks.length,6);assert.equal(new Set(offline.checks.flatMap(c=>c.families)).size,30);assert.equal(new Set(offline.checks.flatMap(c=>c.heroes)).size,18);assert.deepEqual(offline.errors,[]);assert.ok(!offline.failure);assert.deepEqual(web.errors,[]);assert.ok(!web.failure);assert.equal(handoff.passed,true);assert.equal(handoff.activation.appBuildId,preservation.web.appBuildId);assert.equal(handoff.activation.packageBuildId,preservation.packageBuildId);assert.deepEqual(index.campaign18ZeroTalentRaces.sort(),['protoss','terran','zerg']);assert.equal(preservation.sourceChanges.length,1);
async function fingerprint(file){const h=createHash('sha256');let bytes=0;for await(const b of createReadStream(file)){bytes+=b.length;h.update(b);}return {path:file,bytes,sha256:h.digest('hex')};}
async function sourcePaths(dir){const result=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;result.push(...(e.isDirectory()?await sourcePaths(p):[p]));}return result;}
assert.deepEqual((await sourcePaths('src')).sort(),[...preservation.preserved.source,...preservation.sourceChanges].map(f=>f.path).sort());
const files=[];for(const p of ['dist/SC2-Survivors-P6-20261006.html','dist/P6-Coze-Application-20261006.zip','dist/P6-Coze-Resources-From-Live-20261006.zip'])files.push(await fingerprint(p));
assert.equal(web.checks.length,6);assert.equal(pressure.runs.length,6);
const visual=await read(root+'/visual-review.json');assert.equal(visual.appBuildId,preservation.web.appBuildId);assert.equal(visual.screens.length,6);
assert.ok(!production.failure,production.failure);assert.deepEqual(production.errors,[]);assert.equal(production.savedNaturalEndless?.exactState,true);assert.equal(production.release.appBuildId,preservation.web.appBuildId);
const matrix=await read(root+'/performance-matrix.json'),sampleNames=new Set(matrix.results.map(r=>r.output+'/results.json'));
const performance=index.performance.filter(p=>sampleNames.has(p.file.replaceAll('\\','/')));assert.equal(performance.length,8);assert.ok(performance.every(p=>!p.failure));
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
const aggregate=performance.map(p=>{const checkpoint=index.checkpoints.find(c=>c.file.replaceAll('\\','/')===p.checkpoint.replaceAll('\\','/'));assert.ok(checkpoint);return {path:p.file,race:p.runs[0].race,trials:p.runs.length,stage:p.runs[0].stage,secondsMin:Math.min(...p.runs.map(r=>r.time-checkpoint.combatSeconds)),peakBodies:Math.max(...p.runs.map(r=>r.peakBodies)),p95Median:median(p.runs.map(r=>r.frames.p95)),p99Median:median(p.runs.map(r=>r.frames.p99)),p95Worst:Math.max(...p.runs.map(r=>r.frames.p95)),p99Worst:Math.max(...p.runs.map(r=>r.frames.p99)),over20Worst:Math.max(...p.runs.map(r=>r.frames.over20Percent)),maxDebt:Math.max(...p.runs.map(r=>r.maxDebt)),discardedDebt:Math.max(...p.runs.map(r=>r.discardedDebt)),frameGate:p.runs.every(r=>r.frames.count>0&&r.frameGate),debtGate:p.runs.every(r=>r.debtGate)};});
const delivery={at:new Date().toISOString(),status:'LOCAL_ENGINEERING_VERIFIED; NATURAL_PERFORMANCE_GATE_NOT_CLOSED; NOT_DEPLOYED',runSchema:23,profileVersion:5,tests:1188,typecheck:'PASS',dataDocs:'PASS',talentGeneration:'PASS',sourceGeneration:'PASS_IDENTICAL_PINNED_XML',sources:{unchanged:preservation.preserved.source.length,textOnly:preservation.sourceChanges},priorHTML:preservation.preserved.artifacts.length,resources:{release:preservation.web.release,records:preservation.resourceRecords,files:preservation.physicalResourceFiles,bytes:preservation.resourceBytes,newBytesAgainstP5:0,liveCozeDeltaFiles:26,liveCozeDeltaBytes:2153541},appBuildId:preservation.web.appBuildId,packageBuildId:preservation.packageBuildId,files,checks:{webCache:web.checks,offlineGroups:offline.checks,productionNaturalEndless:production.savedNaturalEndless??null,handoff:handoff.checks,pressure:pressure.runs,naturalAttempts:index.naturalAttempts,naturalCheckpoints:index.checkpointCount,naturalNormal18Races:index.campaign18ZeroTalentRaces,performance:aggregate,productionPerformance:production.result??null},open:['Measured performance exceeds at least one existing frame/debt gate; full A34/A35 three-repeat0/41/80 matrix is incomplete','Human visual and physical mobile/gamepad/high-refresh/long-term acceptance','New Coze release and genuine production PostgreSQL/B4 activation','Three original Science Vessel death-source clips'],boundaries:{combatNumbersChanged:false,simulationChanged:false,approvedEffectsChanged:false,resourceBytesChanged:false,priorArtifactsChanged:false,onlineWrites:false,gitPush:false,cleanup:false}};
delivery.visualReview=visual;
delivery.open.push('P6-V01: natural endless round4 screenshot shows broad bright-effect washout; exact source and duration are not yet established');
await fs.writeFile(root+'/delivery.json',JSON.stringify(delivery,null,2));
const n=x=>Number(x).toFixed(2),rows=aggregate.map(p=>`| ${p.race} / ${p.path.split(/[\\/]/).at(-2)} | ${p.trials} / ${n(p.secondsMin)}s | ${p.peakBodies} | ${n(p.p95Worst)} / ${n(p.p99Worst)} | ${n(p.over20Worst)}% | ${n(p.maxDebt)} / ${n(p.discardedDebt)} | ${p.secondsMin>=180&&p.frameGate&&p.debtGate?'样本通过':'未通过'} |`).join('\n');
const doc=`# P6 实际验证记录 · 2026-10-06

本机工程和增量交付已验证；自然性能门槛未关闭，新版未推送或部署。不能将P6标为全部验收通过。完整机器记录：[delivery.json](../../reports/local/p6-20261006/delivery.json)；实施范围见[P6合同](NEXT_ITERATION_P6_20261006.md)。

## 工程、保存与发行

| 项目 | 实际结果 |
| --- | --- |
| 全量回归/类型 | 1188通过、0失败；文字修正后再次完整执行，TypeScript通过 |
| 数据文档 | docs:data / docs:check、165天赋生成核对通过；18英雄/90精英/团队光环按当前运行配置输出 |
| XML来源 | 补齐固定修订的缺失Mover/Validator及4份科技球XML；重新生成与原运行来源数据逐字节一致。缺缓存时生成器拒绝降为默认值 |
| Web | 6组缓存/错误根目录/缺件重试/CORS/Hard种族存读/390竖屏检查，错误0；移动截图为暂停菜单 |
| 完整离线 | 6组正式UI导入、真实战斗、导出、保存、重载和本地读取，覆盖30普通家族/18英雄/实际子机；零API/零统计身份，错误0 |
| 自然战役 | ${index.naturalAttempts}次自动控制器记录、${index.checkpointCount}份带来源存档；三族普通零天赋均有18关＋进入无尽证据，失败种子全部保留 |
| 单独压力 | 6个CPU诊断样本，35普通＋3英雄、初始100/300敌、600固定步；显式锁友军生命，仅报告CPU/有限值，不作自然FPS证据 |
| 增量更新 | 复用线上531文件，安装26文件；独立核验557目标资源与锁定生产依赖后才切入口；重复幂等、损坏拒绝、旧版本/环境保留通过 |
| 保留证明 | 225个游戏源原样；1个生成源只改P-A06文字，逆向替换即精确恢复P5源。28份旧HTML、两份提案快照、P5应用ZIP均不变 |
| 资源 | 575记录/557文件/601352859字节逐一核验，P5之后新增0字节，原资源发行不变 |

Web应用ID：\`${delivery.appBuildId}\`。完整应用包ID：\`${delivery.packageBuildId}\`。schema23 / profile v5。实际包体：

${files.map(f=>`- \`${f.path}\`：${f.bytes}字节；SHA256 \`${f.sha256}\``).join('\n')}

相对现有Coze旧资源发行的差量为26文件/2153541字节；与“相对P5新增0资源”使用不同基线。操作说明：[P6 Coze交接](P6_COZE_DEPLOY_20261006.md)。

## 自然性能

本机AMD Ryzen7 5800U / Radeon、Chrome、1440×900 DPR1。依次运行共享正式World/BattleRenderer的开发版，使用正式菜单导入合法存档；无送钱、锁血、手动推进或隐去首十秒。80点配置为批准的预配置档案，不声称本局赚取。只有最大编制样本测三次，其他是代表取样；完整0/41/80三族早期/中后期三次矩阵仍未完成。

门槛：P95≤16.9ms、P99≤20ms、>20ms≤1%；180秒欠账≤0.1秒且不积累。表内三测使用最差值，详细每次、首十秒、转场及最终剩余欠账均在原记录。

| 样本 | 次数 / 最短战斗秒 | 峰值友军身体 | P95/P99 ms | >20ms | 峰值/转场丢弃欠账秒 | 判定 |
| --- | --- | --- | --- | --- | --- | --- |
${rows}

独立生产Web的80点自然无尽补测：${production.result?`实际推进${n(production.result.combatSeconds)}秒，P95 ${n(production.result.frames.p95)}ms、P99 ${n(production.result.frames.p99)}ms、>20ms ${n(production.result.frames.over20Percent)}%。`:production.failure??'未完成'}该样本在恢复原命令后不代打移动或技能，只通过真实UI处理必要选择；无生产调试控制接口。${production.savedNaturalEndless?'测后保存、重载及本地读取的完整state/config精确一致。':'自然无尽保存补验尚未完成。'}它与主动代打负载不同，不能混为同一基准。

30秒CPU诊断保留在perf-terran-profile；主线程渲染提交是主要连续成本，恢复/首次着色器使用也有成本。该诊断包含恢复段，不把全部首次链接时间算成持续战斗。首次调试样本perf-terran-late-r2期间另开过启动诊断浏览器，因此不纳入正式表。没有通过减少敌军、关闭确认效果、跳固定步或剪掉长帧来制造通过。

## 修正及失败记录

- 旧数据参考混用英雄旧适配及精英模板，已改为实际显式机体/成长和现行团队光环。
- P-A06说明相互矛盾，现统一为免费救援身体生命和原生盾上限各＋15%/30%/45%；实际计算、伤损与子机规则不变。
- 原更新器缺少生产依赖安装和独立完整包身份；新增2项回归，完整锁定安装发生在未激活版本。Windows安装目录重命名失败的两次记录保留，改为向未激活不可变目录复制并验证，最后原子切指针。
- 原Web测试读取已折叠标题的可见文字，改为实际导出档的种族/Hard/伤损/实体/账本比对；失败记录未删除。
- 初版控制器漏处理待确认供给/天赋奖励，修正后从真实存档继续；原失败记录保留。没有把失败种子改成成功或更改难度。
- 初次离线报告的method文案误称全部内容，实际仅15普通/9英雄；最终六组独立报告已实际覆盖全部30/18。旧报告保留。
- 原Vite广泛入口扫描的中止尝试留日志；新QA配置只扫描正式入口、关闭HMR并排除历史构建，游戏构建配置不变。
- 正式Web无尽补测第一次在商店进入自动购买/取消循环，60秒后被停滞检查终止；无游戏报错。修正QA按钮优先级，下一轮按钮优先于商店卡后重测；原production-attempt-1.json、截图和日志保留，不纳入最终180秒样本。

## 保留的验收边界

GitHub main实查为192ed830670a1a41884f74632904e193c91db5a8，其发行schema16；现有Coze健康检查schema14，且/api/config为404。它们不是本地新版schema23。新应用没有上传、推送或部署；后台生产数据库、部署主体/联系方式、持久删除日志与真实B4检查待部署方落实。

本机键盘、浏览器触屏和虚拟标准手柄是自动化工程路径，不是实体设备/人工作品签收。已逐张查看最终六组离线画面，结果及边界见[截图工程复核](../../reports/local/p6-20261006/visual-review.json)。完整M6/M7、稳定性能、人工视觉和三个科技球原死亡来源缺口继续开放。没有清理旧产物，未向真实玩家发送或采集测试数据。

补充画面发现P6-V01：正式Web的80点自然无尽在第4轮进入时，大量高亮效果叠加使大片战场发白，单位与地形对比下降，操作区仍可读。截图为perf-production-80-endless/battle.png，复现路径和实际菜单动作已留档。尚未确认来源与持续时间，因此不把这一帧说成持续全屏故障，也不能用小编制六组截图代替该场景的视觉验收。此项继续开放。
`;
await fs.writeFile('docs/project/NEXT_ITERATION_P6_VALIDATION_20261006.md',doc);
console.log(JSON.stringify({status:delivery.status,tests:1188,performanceGroups:aggregate.length,files}));
