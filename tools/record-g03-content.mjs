import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root='D:/星际', rel='reports/local/g03-content-20261022', base=root+'/'+rel;
const read=async f=>JSON.parse((await fs.readFile(root+'/'+f,'utf8')).replace(/^\uFEFF/,''));
const write=(f,v)=>fs.writeFile(root+'/'+f,JSON.stringify(v,null,2)+'\n');
const verification=await read(rel+'/verification.json'), cleanup=await read(rel+'/cleanup.json'), archive=await read(rel+'/offline-r1-archive.json');
assert.ok(verification.pass&&cleanup.pass&&archive.pass&&!archive.expandedPresent);
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,123);
const before=await read(rel+'/before/docs/project/performance-board.json');
const browser={};
for(const n of ['qa-production-r1','qa-production-r2','qa-content-r1','qa-content-r2']){
  const r=await read(rel+'/'+n+'/result.json');
  if(n!=='qa-content-r1'){assert.ok(r.pass);assert.equal(r.errors.length,0);}
  if(n.startsWith('qa-production'))assert.deepEqual(r.httpRequests,[]);
  browser[n]={file:rel+'/'+n+'/result.json',pass:r.pass,records:r.records.length,errors:r.errors.length,...(r.httpRequests?{offlineHttpRequests:r.httpRequests.length}:{})};
}
const indexed=await read(rel+'/screen-review/index.json');assert.equal(indexed.length,55);
const images=indexed.map(x=>path.relative(root,x.file).replaceAll('\\','/'));
const finalImages=images.filter(f=>f.includes('/qa-content-r2/')||f.includes('/qa-production-r2/'));
assert.equal(finalImages.length,33);
const visual={pass:true,reviewed:55,contactSheets:15,finalImages,archivedImages:images.filter(f=>!finalImages.includes(f)),notes:[
  'All 55 originals reviewed through 15 contact sheets, plus full-size easy bait 390 and final normal rule 844.',
  'Final gallery has 16 final formal r2 images and 17 content r2 QA images. Content QA used lab r1 with the same runtime; final r2 changed only one difficulty-menu sentence.',
  'hard-horde-recovered is the intentionally paused graphics-recovery screen; subsequent hard-horde-complete shows resumed combat.',
  'Independent lab toolbar overlaps the header on narrow screens; retained as a lab limitation, not a formal HUD or full mobile-layout acceptance.',
  'Historical map fixture failure and previous menu copy remain in original directories. No human/physical-device or natural campaign claim.'
]};await write(rel+'/visual-review.json',visual);
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
await fs.writeFile(base+'/screen-review/index.html','<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>G03 分档与入口最终检查图</title><style>body{margin:24px;background:#161b23;color:#e6eaf2;font:16px/1.6 system-ui}a{color:#8dc8ff}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}figure{margin:0}img{width:100%;max-height:640px;object-fit:contain;background:#080c11}figcaption{overflow-wrap:anywhere}</style><h1>G03 内容分档与入口</h1><p>55张原图已查看，以下33张为本批最终检查图。正式界面使用r2；内容专项使用运行规则相同的试玩r1，最终r2只修正一处难度说明。恢复图为主动暂停状态；独立试玩窄屏工具栏遮挡保留为已知限制。</p><main>'+finalImages.map(f=>'<figure><a href="../../../../'+encodeURI(f)+'"><img loading="lazy" src="../../../../'+encodeURI(f)+'"></a><figcaption>'+esc(f.split('/').slice(-3).join('/'))+'</figcaption></figure>').join('')+'</main></html>');
await fs.mkdir(root+'/preview/g03-content-20261022',{recursive:true});
await fs.writeFile(root+'/preview/g03-content-20261022/index.html',`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>G03 趣味内容分档</title><style>body{max-width:850px;margin:48px auto;padding:0 24px;background:#131a23;color:#e9eef4;font:17px/1.8 system-ui}a{color:#8dc8ff}li{margin:14px 0}small{color:#b4bfcc}</style><h1>G03 趣味内容分档</h1><p>简单：2任务、2遭遇、资源与弹幕关；普通：5任务、5遭遇并加入横穿；困难／地狱：全部7任务、10遭遇、4特殊关与4类独立虫群。五种随机拾取物与七组趣味商品全难度开放，仍保留原资格。</p><ul><li><a href="http://127.0.0.1:4488/game/">正式游戏 · 本机网页</a></li><li><a href="http://127.0.0.1:4488/">全内容独立试玩 · 困难规则</a></li><li><a href="../../${rel}/offline-game-r2.html">正式游戏 · 离线HTML</a> <small>可直接打开，不依赖本机预览服务。</small></li><li><a href="../../docs/project/G03_CONTENT_INTEGRATION_20261022.md">完整分档、入口规则与验证记录</a></li><li><a href="../../${rel}/screen-review/index.html">33张最终检查图</a></li><li><a href="../../reports/qa/g03-content-20261022.json">验证证据</a> · <a href="../../docs/project/PERFORMANCE_BOARD.html">最新看板</a></li></ul><p>2264回归通过；本次完成G03前两项。整局收支、简单弹幕操作负担和最终难度平衡继续开放。原鼠标／触屏操作保持；Current未替换，尚未发布。</p></html>`);

const evidence=['G03_CONTENT_INTEGRATION_20261022.md','../../reports/qa/g03-content-20261022.json'];
const g03=board.tasks.find(t=>t.id==='G03');assert.equal(g03.status,'进行中');
g03.updated='2026-10-23';
g03.steps[2]='已完成内容×难度×关段×前置／入口矩阵及机制依据：简单2任务/2遭遇/资源与弹幕，普通5任务/5遭遇并加入横穿，困难与地狱7任务/10遭遇/4特殊关/4类独立虫群。五种随机拾取物及七组商品全难度开放；鞘翅沿用飞行蟑螂来源、普通起。原关段、合法队伍、次数与安全窗口保留。';
g03.steps[3]='已完成自然主事件、候选和实际创建、诱饵／酒馆、门票生成／陈列／领取／购买／入场、传送门与冻结返回的共同难度资格。低难度禁用虫群机会一次落空不改抽／不积压，诱饵不抽虫群／不耗其额度。全内容诊断试玩明确改用困难规则，不绕过正式限制，不当作自然可达性证据。';
g03.steps[5]='普通新增横穿、竞技场困难起已定案并验证；简单弹幕的弹速、密度、通路与容错仍需单独评估。已同步难度内容与诱饵详情，T01保留完整诊断目录，U05仍承接完整必要引导；困难／地狱目录相同，数值与收益目标仍需分别检验。';
g03.result='已完成既有频次子项：虫群150/110/70/30、4/6/8/10关段和自然事件概率/权重、安全窗口/喘息/互斥、酒馆/诱饵、特殊关3次/S+3。承接G01英雄12/9/6/6门槛、G02固定支援成长/核弹基础6000/功能卡降价/超载增伤/首次3秒。2026-10-23完成用户批准的G03第1、2步：明确分档名单并接入全部入口与关联商品，普通加入横穿；简单/普通无独立虫群，困难/地狱完整。796条受控生产路径与12条件概率行、2264最终全量回归、类型/数据检查通过；最终浏览器58条记录、四难度/三尺寸、实际鼠标购买与移动、虫群20秒/150只/实际WebGL恢复、资源门票30秒冻结返回通过，55图查看33最终。15旧+1新生产及13旧+1新测试，原135渲染/镜头/输入精确。仍待完整三族/四难度/装备阶段/十八关与无尽收支成长、减少内容后的收入、诱饵价格价值、简单弹幕操作负担和最终难度平衡；本次不关闭G03整体。';
g03.evidence=[...new Set([...g03.evidence,...evidence])];
for(const task of board.tasks.filter(t=>t.id!=='G03'))assert.deepEqual(task,before.tasks.find(t=>t.id===task.id));
board.revision=124;board.next='G03';board.updated='2026-10-23';
board.scope+=' 2026-10-23修订124：G03第1、2步内容分档及入口／道具联动已实现、测试并集成本地主线，G03整体仍进行中；2264回归通过，整局经济与最终难度平衡继续开放。';
board.updates.push({date:'2026-10-23',tasks:['G03'],change:'G03内容分档与全部入口／道具联动完成并集成本地主线；2264全量回归、四档浏览器与离线、实际鼠标和图形恢复通过。62项51完成、8待办、1进行中、2暂缓；G03整局平衡未关闭。',evidence});
await write('docs/project/performance-board.json',board);
const counts=Object.fromEntries(board.statusOrder.map(s=>[s,board.tasks.filter(t=>t.status===s).length]));
assert.equal(counts['已完成'],51);assert.equal(counts['待办'],8);assert.equal(counts['进行中'],1);assert.equal(counts['暂缓'],2);

const planPath=root+'/docs/project/G03_DIFFICULTY_CONTENT_PLAN_20261022.md';let plan=await fs.readFile(planPath,'utf8');
plan=plan.replace('状态：用户方向已纳入G03，具体任务／特殊敌人名单和普通难度特殊关组合待G03设计与验证；本次只更新计划，没有改变游戏规则。','最新状态（2026-10-23）：用户授权代理定案并完成第1、2步，分档名单和全入口／道具联动已实现、测试并集成本地主线，详见[G03实现与验证记录](G03_CONTENT_INTEGRATION_20261022.md)。G03整局经济、简单弹幕操作负担与最终平衡继续开放。以下正文保留2026-10-22初始计划，其“待定／未实现”描述属于当时状态。');
plan+='\n## 第1、2步已落实 · 2026-10-23／看板124\n\n简单2任务、2遭遇、资源与弹幕；普通增加至5任务、5遭遇并开放横穿；困难／地狱开放完整7任务、10遭遇、4特殊关与4类独立虫群。五种随机拾取物与七组商品仍全难度开放，鞘翅随飞行蟑螂从普通获得。详细条目、依据、失败成本和原前置见[最终记录](G03_CONTENT_INTEGRATION_20261022.md)。\n\n自然主事件、候选／实际创建、诱饵、酒馆、门票和传送门均已联动；简单／普通被禁用的自然虫群份额落空，不改抽、不积压，诱饵不抽虫群及消耗其额度。796条受控路径＋12条件概率行、2264最终回归和最终58浏览器记录通过。第3、5、6项与本批直接相关的概率处理及文案已做；整局收益、商品价格价值、简单弹幕容错及三族／四难度成长仍未完成，不能据此关闭G03。\n';
await fs.writeFile(planPath,plan);

const docPath=root+'/docs/project/G03_CONTENT_INTEGRATION_20261022.md';let doc=await fs.readFile(docPath,'utf8');
const finalText=`- 最终全量回归2264／2264通过，含30项新增；类型和运行时数据文档检查通过。矩阵808行，其中796行执行受控生产路径、12行是条件概率计算，不能把全部808写成自然战役样本。覆盖任务84、遭遇240、虫群96、特殊关144、门票16、自然虫群抽选12、五拾取物20、七商品28、自然任务72、自然遭遇72、诱饵12。
- 最终正式r2网页／离线检查32条、16图；内容专项r2检查26条、17图。四难度候选／拒绝、四档原生鼠标购买诱饵、三尺寸说明与详情、网页／离线左右键移动及设置返回通过；实际虫群完整20秒生成150只，图形丢失／恢复保持状态（只排除恢复提示截止时刻），免费资源门票经鼠标领取、原生产入场、30秒完整运行并冻结返回。最终页面／控制台错误0，离线HTTP0。
- 内容专项使用试玩构建r1；正式r2与试玩r2仅改一处难度菜单句子，明确“五种随机拾取物＋七商品”及鞘翅普通起，所有运行时输入与资源相同。最终r2正式网页／离线重新验证该说明。诊断可控世界、程序化鼠标及保命设置不等于自然全战役、人类试玩或物理触屏；本批没有新增触屏验收。
- 55张原图经15张联系表全部查看，另查看窄屏诱饵及最终普通说明原图；[最终图库](../../${rel}/screen-review/index.html)含33张。独立试玩窄屏工具栏仍遮挡上方部分信息，正式三尺寸说明已核验，不宣称全部移动端布局通过。图形恢复图主动暂停，后续完成图显示已恢复战斗。
- 823个既有src/test中795未改，变更15旧生产＋13旧测试，新增1生产目录文件＋1测试，共825最终冻结文件；135个渲染／相机／输入文件精确保持。最终Web正式502／试玩503编译输入、1909资产／1852独立资源逐SHA核验；离线507输入、1909资产／2975生产解码块逐SHA通过。
- 正式网页JS：\`${verification.delivery[0].js}\`；试玩JS：\`${verification.delivery[1].js}\`。最终离线HTML：\`${verification.offline.htmlSha256}\`，保留于[offline-game-r2.html](../../${rel}/offline-game-r2.html)。[统一预览入口](../../preview/g03-content-20261022/index.html)列出正式网页、全内容试玩和离线包。

初轮2260回归有54失败：48项是原普通难度全内容夹具不再合法，6项是本机网络／服务权限；既有全内容机制测试改到困难，低档循环明确断言拒绝，没有新增绕过开关。首次新增30项版本中4项自然抽选断言失败，原因是测试假定第18关仍允许虫群类别；修正测试按真实合法类别选取RNG后全部通过。此前186定向及135重跑的失败、网络重跑、类型／构建先导日志均保留，最终完整2264独立通过。浏览器首轮内容检查因另一个bundle的FlatTerrain类身份导致战役地图判定失败，修正为捕获原生地形实例后重跑通过；未记为生产bug或删去失败记录。

已关闭本轮专用QA浏览器并清理${cleanup.profileFiles}个缓存文件，逻辑大小${(cleanup.profileLogicalBytes/1024**3).toFixed(3)}GiB；${cleanup.protectedFiles}个保护项SHA保持。较早r1离线包改为最终r2共享载荷＋${(archive.differenceBytes/1024**2).toFixed(2)}MiB差异，可用\`node tools/restore-g03-r1.mjs\`精确重组；展开的${(archive.originalBytes/1024**2).toFixed(2)}MiB中间包已删除，最终r2供体必须保留。原截图、测量、日志和冻结输入均保留，不把逻辑字节等同于物理释放量。

看板124：62项，51完成、8待办、1进行中、2暂缓，下一项仍G03。此次只关闭批准的第1、2步实现与联动；完整三族／四难度／装备阶段／十八关及无尽经济、诱饵实际价值与价格、简单弹幕容错和最终难度平衡继续开放。T01、U05、D05和最终V／MVP边界保持。已集成本地main工作目录，未创建合并提交、提交／推送、替换Current或发布。Current SHA保持\`${verification.current.sha256}\`。

配套证据：[机器可读报告](../../reports/qa/g03-content-20261022.json)、[输入／资源／回归绑定](../../${rel}/verification.json)、[完整矩阵](../../${rel}/admission-matrix-r4.json)、[清理记录](../../${rel}/cleanup.json)。`;
assert.ok(doc.includes('待本批浏览器、最终绑定与清理结果写入后关闭这一子项；G03整体仍进行中。'));
doc=doc.replace('待本批浏览器、最终绑定与清理结果写入后关闭这一子项；G03整体仍进行中。',finalText);await fs.writeFile(docPath,doc);
const header='## G03内容分档与入口联动完成 · 2026-10-23\n\n- 用户授权直接完成第1、2步并测试集成。简单2任务/2遭遇/资源与弹幕，普通5任务/5遭遇并加横穿，困难/地狱7任务/10遭遇/4特殊关/4类独立虫群；五种随机拾取物及七商品全难度开放，鞘翅随飞行蟑螂普通起。原关段、资格、奖励和安全窗口保持。\n- 自然抽选、候选和实际创建、诱饵/酒馆、门票生成/陈列/领取/购买/入场与传送门共同校验。低难度自然虫群份额一次落空不改抽不积压；诱饵不抽虫群、不耗额度，价格未调。全内容试玩39入口改用困难规则、明确标注，原鼠标/触屏默认保持。\n- 796受控生产路径＋12条件概率行，2264最终全量回归、类型/数据通过；最终58浏览器记录、四难度/三尺寸/实际鼠标购买移动、完整20秒150只虫群与实际WebGL恢复、资源门票30秒冻结返回通过。55图已查看，33最终；原失败保留。不是自然战役、人类/真机、最终平衡或FPS验收。\n- 15旧+1新生产、13旧+1新测试；823旧文件795不变，135渲染/镜头/输入精确。Web502/503输入、1909资产/1852资源；离线507输入、1909资产/2975块逐SHA通过。本批QA缓存清理，r1中间离线包以共享载荷＋差异精确归档，保留最终r2。\n- 看板124：62项51完成，8待办/1进行中/2暂缓，G03仍进行中。记录docs/project/G03_CONTENT_INTEGRATION_20261022.md、reports/qa/g03-content-20261022.json；preview/g03-content-20261022/（4488）。整局经济/简单弹幕容错/诱饵价值/最终平衡、T01/U05/D05及最终V/MVP开放；本地主线集成，未提交/推送、替换Current或发布。\n\n';
await fs.writeFile(root+'/AGENTS.md',header+await fs.readFile(root+'/AGENTS.md','utf8'));
const report={task:'G03 steps 1/2 difficulty content and all-entry/item integration',status:'completed-local-subscope',dateStarted:'2026-10-22',dateCompleted:'2026-10-23',authorization:'可以你直接把12带入测试，合并完成么',integration:'Current main worktree integrated without a Git merge commit, commit, push or publication',source:verification,
  tiers:{easy:{missions:['repair','hives'],encounters:['golden','giant'],special:['resources','dodge'],hordes:[]},normal:{missions:['repair','hives','escort','intel','rescue'],encounters:['golden','giant','gentle','whitePack','flyingRoaches'],special:['resources','dodge','crossing'],hordes:[]},hardAndHell:{missions:7,encounters:10,special:4,hordes:4},allTiers:{randomPickups:5,shopGroups:7},wings:'Original flying-roaches reward, normal and above; not a random pickup',lab:{entries:39,difficulty:'hard',noGateBypass:true}},
  rules:{naturalGateProbability:[.6,.7,.8],originalWeights:[45,35,20],disabledNaturalHorde:'One miss, no reroll or carryover; retain original physical category eligibility',lowBait:'No horde roll, pending marker or quota consumption; encounter/elite unchanged',pricesChanged:false,specialPerRun:3,specialGapStages:3},
  tests:{finalUnique:2264,finalPass:2264,finalFail:0,newTests:30,firstFull:{tests:2260,passed:2206,failed:54,oldNormalFixtures:48,networkOrServicePermissions:6},firstNewNaturalCases:{tests:30,failed:4,reason:'Stage18 physical pool excludes hordes; test RNG expectation corrected without production change'},fullLog:rel+'/full-regression-r2.log',typecheck:rel+'/typecheck-r2.log',data:rel+'/docs-check-r1.log',matrix:{file:rel+'/admission-matrix-r4.json',rows:808,controlledProduction:796,analytical:12,counts:verification.matrix.counts}},
  browser,finalBrowserRecords:58,visual,archive,cleanup,
  failuresRetained:['Obsolete normal full-content test fixtures after approved difficulty restriction','Local network/service permission failures and retries','Natural RNG test expectation incorrectly assumed stage18 allowed a horde category','Content browser r1 map fixture class came from a different bundle; original native terrain reused in r2','Prior targeted, build, shell and browser pilots remain in batch logs'],
  limitations:['Controlled production paths and browser automation with lab fixtures/god mode are not natural full campaign or human/physical-device tests','Content QA lab r1 runtime and assets equal final r2, with only a difficulty-menu sentence changed and independently checked in final r2 formal QA','Lab narrow-screen toolbar overlap retained; no all-mobile-layout acceptance','No new FPS, persistence, full-run economics, simple barrage playability, bait value/price or final balance acceptance'],
  board:{revision:124,next:'G03',counts,other61TasksUnchanged:true},boundaries:['G03 whole task remains in progress; T01/U05/D05/final V/MVP remain open','No Current replacement, commit, push or publication']};
await write('reports/qa/g03-content-20261022.json',report);
console.log(JSON.stringify({board:124,counts,finalBrowserRecords:58,reviewedImages:55,finalImages:33,cleanup:true}));
