import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {reviews,docs,inheritedStatuses,extraDestinations,taskReportRefs} from './performance-a01-reviews.mjs';

const root='reports/local/performance-a01-20261020';
const boardFile='docs/project/performance-board.json';
const document='docs/project/PERFORMANCE_A01_20261020.md';
const qaFile='reports/qa/performance-a01-20261020.json';
const readJSON=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const writeJSON=(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const unique=a=>[...new Set(a)];
const previous=await readJSON(`${root}/board-before.json`);
const before=await readJSON(`${root}/inputs-before.json`);
const board=await readJSON(boardFile);
assert.equal(board.tasks.find(t=>t.id==='A01').status,'进行中');
assert.equal(board.revision,87);
assert.equal(board.auditRows.length,169);
assert.equal(reviews.size,69);
const main=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(main,before.main);

// This is an audit. Bind the unchanged existing implementation and retain all
// pre-existing work, including the separate economic-egg change.
const unchanged=[],changed=[];
for(const original of before.files){
 const data=await fs.readFile(original.path);
 (sha(data)===original.sha256?unchanged:changed).push(original.path);
}
assert.deepEqual(changed,[],'Existing src/test/deploy/tools changed during audit');
const sourceComparison=await readJSON(`${root}/l03-source-comparison.json`);
assert.deepEqual(sourceComparison.changed,['src/render/units/economic-egg.ts']);
const testLog=await fs.readFile(`${root}/targeted-regression.log`,'utf8');
assert.match(testLog,/tests 66/);
assert.match(testLog,/pass 66/);
assert.match(testLog,/fail 0/);
const sourceText=await fs.readFile(docs.old,'utf8');
const originals=sourceText.split(/(?=^#### )/m);
const evidence=new Map(),sourceRecords=new Map();
async function evidenceFile(file){
 file=file.replaceAll('\\','/');
 if(!evidence.has(file)){
  const bytes=await fs.readFile(file);
  evidence.set(file,{id:`E${String(evidence.size+1).padStart(3,'0')}`,path:file,bytes:bytes.length,sha256:sha(bytes)});
 }
 return evidence.get(file).id;
}
async function sourceRecord(s){
 const key=s.file+'|'+s.needle;
 if(!sourceRecords.has(key)){
  const text=await fs.readFile(s.file,'utf8'),offset=text.indexOf(s.needle);
  assert.ok(offset>=0,`${s.file}: missing anchor ${s.needle}`);
  const lines=text.split(/\r?\n/),line=text.slice(0,offset).split('\n').length;
  const e=await evidenceFile(s.file),id=`S${String(sourceRecords.size+1).padStart(3,'0')}`;
  sourceRecords.set(key,{id,file:s.file,line,needle:s.needle,evidenceId:e,
   snippet:lines.slice(Math.max(0,line-2),Math.min(lines.length,line+2)).join('\n')});
 }
 return sourceRecords.get(key).id;
}
const auditEvidence=[path.basename(document),'../../'+qaFile];
const makeTask=(id,title,phase,scenes,auditIds,problem,steps,acceptance)=>({
 id,title,status:'待办',phase,priority:id==='A02'?'随后':'按测量',depends:['A01'],scenes,
 problem,steps,acceptance,evidence:auditEvidence,auditIds,updated:'2026-10-20',
 result:'A01确认的原审计剩余范围，已单独保留跟踪；尚未实施或开始补测。任何性能候选先验证当前调用与成本，不能由审计结论直接宣称收益。',
 owner:'Codex',historical:false,
});
const followups=[
 makeTask('A02','补测剩余客户端候选与效果容量','计算',['SC02','SC03','SC04','SC07','SC10','SC11'],
  ['SIM-008','R04','R06','R15'],
  '四项原审计的剩余机制尚缺自然频度、独立成本或容量证据；关联的旧批次完成不能关闭这些余项。',
  ['奖励池：记录真实商店/领取/批量死亡的draftContext频度与成本，保持资格、顺序和RNG',
   '镜头：固定/auto/cinematic及普通/密集、宽窄视口；先测真实布局和遍历，禁止直接复用已回退mainSet候选',
   '据点：测活跃可见/屏外mixer推进，保留增量时间、死亡/重入与上下文恢复语义',
   '英雄：分层统计getter/查找/实际submitted与dropped；合法组合与容量边界分开，不静默截断或降级'],
  ['四项各有当前频度/局部成本、输入绑定及结论',
   '有可靠收益且不改输出才保留候选；无收益/不可达则有证据保留现状',
   '如需动画/画质取舍，明确移交D02；不由本项关闭整场FPS']),
 makeTask('A03','复核部署缓存命中与跨版本留存','长局',['SC09','SC10'],
  ['LOAD-007','L06'],
  '原7A缓存键/命中异常未定位；L03的页面/UI缓存和离线验证不覆盖真实部署CacheStorage跨版本磁盘预算。',
  ['真实HttpAssetStore部署清单记录缓存键、命中、重下载、storage estimate与persisted状态',
   '验证刷新、失败重试、多release相同/新增hash、活动资源与上下文恢复',
   '据真实留存提出磁盘预算及驱逐方案，保护活动引用与离线唯一恢复源；未经决定不驱逐'],
  ['原异常能复现并定位，或明确当前不可复现及足够的边界证据',
   '页面Blob/纹理、编码片、浏览器磁盘缓存分别计量',
   '跨版本预算是否需要实施有证据和明确去向；不把一次重开当长期无泄漏']),
];
for(const t of followups)assert.ok(!board.tasks.some(x=>x.id===t.id));
board.tasks.push(...followups);
const taskMap=new Map(board.tasks.map(t=>[t.id,t]));
const statuses=new Map();
for(const [status,ids] of Object.entries(inheritedStatuses))for(const id of ids){
 assert.ok(!statuses.has(id));statuses.set(id,status);
}
const records=[];
for(const old of previous.auditRows){
 const section=originals.find(s=>s.startsWith(`#### ${old.id}｜`));
 assert.ok(section,`Missing original ${old.id}`);
 const explicit=reviews.get(old.id);
 assert.ok(explicit||!old.currentReview.startsWith('已建立任务关联'),`Unreviewed ${old.id}`);
 let conclusion=explicit?.conclusion??old.currentReview;
 // Keep the old exact review in previousReview; update only obsolete timeline
 // language in the current conclusion.
 if(old.id==='C12')conclusion=conclusion.replace('S07另列待办。','S07现已完成；此条仍保留实时扫描。');
 if(old.id==='SAVE-008')conclusion=conclusion.replace('U04未动，保存延期。','U04随后已完成观察者读取优化并保留全部新增订单语义；历史/存档策略仍D03/D05。');
 const destinations=unique([...(explicit?.tasks??old.tasks),...(extraDestinations[old.id]??[])]);
 for(const id of destinations)assert.ok(taskMap.has(id),`${old.id} unknown task ${id}`);
 const refs=unique([
  ...(explicit?.references??[]),
  ...destinations.flatMap(id=>(taskReportRefs[id]??[]).map(x=>docs[x]??x)),
  ...destinations.flatMap(id=>(previous.tasks.find(t=>t.id===id)?.evidence??[])
   .filter(ref=>!/^https?:/.test(ref)).map(ref=>path.posix.normalize('docs/project/'+ref))
   .filter(ref=>ref.endsWith('.md')||ref.startsWith('reports/qa/'))),
 ]);
 assert.ok(refs.length,`No evidence for ${old.id}`);
 const evidenceIds=await Promise.all(refs.map(evidenceFile));
 const sources=[];
 for(const s of explicit?.sources??[])sources.push(await sourceRecord(s));
 const status=explicit?.status??statuses.get(old.id)??'已解决';
 const open=destinations.filter(id=>taskMap.get(id).status!=='已完成'&&id!=='A01');
 if(['待测','待讨论','延期','部分解决'].includes(status))assert.ok(open.length,`${old.id} unresolved with no open task`);
 records.push({
  id:old.id,title:old.title,status,conclusion,destinations,openDestinations:open,
  next:explicit?.next??'',reviewMode:explicit?'current-source-and-evidence':'prior-batch-evidence-rechecked',
  previouslyPlaceholder:old.currentReview.startsWith('已建立任务关联'),
  previousReview:old.currentReview,sources,evidenceIds,
  original:{sourceCategory:old.sourceCategory,sourceExecution:old.sourceExecution,
   sourceIntegration:old.sourceIntegration,sectionSha256:sha(section)},
 });
}
assert.equal(records.length,169);
assert.equal(records.filter(r=>r.previouslyPlaceholder).length,65);
assert.equal(records.filter(r=>r.reviewMode==='prior-batch-evidence-rechecked').length,100);
for(const key of reviews.keys())assert.ok(records.some(r=>r.id===key));
for(const key of statuses.keys())assert.ok(records.some(r=>r.id===key),'Unknown inherited ID '+key);
const counts=Object.fromEntries(unique(records.map(r=>r.status)).map(s=>[s,records.filter(r=>r.status===s).length]));
for(const record of records){
 const row=board.auditRows.find(r=>r.id===record.id),old=previous.auditRows.find(r=>r.id===record.id);
 for(const k of ['id','title','sourceCategory','sourceExecution','sourceIntegration'])assert.deepEqual(row[k],old[k]);
 row.tasks=unique([...row.tasks,...record.destinations]);
 row.previousReview=old.currentReview;
 row.currentReview=`【${record.status}】${record.conclusion} 当前去向：${record.destinations.join('、')}。`;
 row.reviewedAt='2026-10-20';row.reviewStatus=record.status;
 row.reviewEvidence=record.evidenceIds.map(id=>[...evidence.values()].find(e=>e.id===id).path);
 row.followUpTasks=record.openDestinations;
}
for(const t of board.tasks){
 t.auditIds=unique([...t.auditIds,...records.filter(r=>r.destinations.includes(t.id)).map(r=>r.id)]);
}
const a01=taskMap.get('A01');
a01.status='已完成';a01.updated='2026-10-20';
a01.evidence=unique([...a01.evidence,...auditEvidence]);
a01.result=`169条逐条复核完成：补齐65条占位，复核104条已有结论并更新4条未结范围。分类：${Object.entries(counts).map(([s,n])=>s+n).join('、')}。66项定向回归通过，既有3984个源码/测试/部署/工具文件逐字节未改。保留原候选回退/历史失败；A02四项客户端、A03两项缓存单独待办，D01–D06和V01–V04按原边界开放。审计完成不代表全部问题已修或全内容60FPS达标。`;
const updateTask=(id,text)=>{
 const t=taskMap.get(id);t.updated='2026-10-20';t.result=text;
 t.evidence=unique([...t.evidence,...auditEvidence]);
};
updateTask('D01','A01核实无尽频率已封顶，elite/boss各仅一个pending模板且失败1秒重试；这些旧推断不作为改节奏理由。ambient/swarm及战役specialPlan集中补兵仍保留，需基于实际集中释放长帧再决定是否分帧；未批准实施。');
updateTask('D03','S05/R02已完成保留语义的索引/查询/标签优化；原历史、有效地面掉落及被毁舱待出守卫保留。TTL、收益合并或历史删除均未批准。A01只明确余项归属，不启动删除/归档。');
updateTask('D04','A01核实菜单跨族原始资源与完整本族/敌方预载仍在；旧167ID/65MB不对应当前清单。L02仅分段/等待恢复，L03仅页面缓存/按需校验，均未缩减预载范围。范围取舍及转移后的首次使用等待尚待比较和用户决定。');
updateTask('D05','A01仅只读核对旧导出/重复校验/大历史与恢复路径；当前舰装memoryOnly已绕开旧同页编码。保存、导入、迁移及大档优化继续按用户决定延期至MVP收尾；本次未运行存档实验或改实现。');
updateTask('D06','A01已核对9项后端/服务工具、微信旧kairos预检与缓存别名、构建清单同代缺口；外部隔离候选不视作当前已合入。没有新生产DB/微信真机证据；独立启动范围与实际测量仍延期。');
const v01=taskMap.get('V01');
v01.steps.push('A02/A03剩余范围明确处置后，对最终统一入口复核保留补丁和未结边界；经济卵其他工作流修改单独绑定');
updateTask('V01','逐批局部正确性与性能证据持续保留，最新L03完成1745回归覆盖与资源/浏览器恢复验证；A01本次只追加66项定向回归。最终统一构建、全内容性能和整轮汇总尚未完成，A02/A03余项先补证，不据审计关闭V01。');
const v02=taskMap.get('V02');
v02.steps.push('覆盖GATE-002/008历史后期欠账与大型编队路线；历史失败与当前复测分列');
v02.evidence=unique([...v02.evidence,...auditEvidence]);
const v03=taskMap.get('V03');
v03.steps.push('对GATE-007所述自然战斗大范围泛白触发补证，复用五图已接受内容，不重开环境内容验收');
v03.evidence=unique([...v03.evidence,...auditEvidence]);
board.next='A02';board.revision++;board.updated='2026-10-20';
board.auditNote+=' 2026-10-20 A01完成169条当前审计，保留65条补齐/104条既有证据的归属。旧审计ID与看板任务ID为两个命名空间（例如旧R01不等于任务R01）。A02/A03仅跟踪原审计剩余范围，不代表新增玩法。';
board.updates.push({date:'2026-10-20',tasks:['A01','A02','A03'],
 change:'A01完成169条审计；65条占位全部补齐，104条既有结论复核并更新4条未结范围。新增A02/A03承接原有4项客户端和2项缓存问题，未启动实现。66定向回归通过，既有代码未改；原50项现完成40，补2项跟踪后共52项、剩余12；下一项A02。',
 evidence:auditEvidence});
assert.equal(board.tasks.filter(t=>t.status==='已完成').length,40);
assert.equal(board.tasks.length,52);
const tests=['performance-contracts','difficulty-r2','fixed-stepper','campaign-definition-cache',
 'material-program-cache','shared-material-textures','resource-cache-update','http-assets','source-combat-effects']
 .map(name=>`test/${name}.test.ts`);
const verification={
 status:'pass',main,existingFilesCompared:before.files.length,unchanged:unchanged.length,changed,
 currentVsFrozenL03:sourceComparison,
 frozenSourceScope:'413/414生产文件与L03冻结输入字节或换行归一一致；economic-egg为之前已有其他工作流修改，未纳入L03性能验收。本次3984既有文件均与A01开始快照逐字节一致。',
 auditRows:169,newlyResolvedPlaceholders:65,previouslyReviewed:104,refreshedExisting:4,
 remainingPlaceholders:0,counts,sourceAnchors:sourceRecords.size,evidenceFiles:evidence.size,
 targetedRegression:{tests:66,pass:66,fail:0,files:tests,log:`${root}/targeted-regression.log`,
  scope:'Current source controls only; no new runtime/FPS, persistence, backend or physical-input acceptance.'},
 noProductionEdits:true,notRun:['new-browser-session','new-performance-benchmark','full-suite-this-audit','production-database','wechat-device','save-work'],
};
await writeJSON(`${root}/verification.json`,verification);
await writeJSON(`${root}/source-anchors.json`,[...sourceRecords.values()]);
await writeJSON(`${root}/adjudications.json`,records);
for(const p of [`${root}/board-before.json`,`${root}/inputs-before.json`,`${root}/l03-source-comparison.json`,
 `${root}/targeted-regression.log`,`${root}/verification.json`,`${root}/source-anchors.json`,`${root}/adjudications.json`,
 'tools/performance-a01-reviews.mjs','tools/finalize-performance-a01.mjs'])await evidenceFile(p);

const mdEscape=s=>String(s).replaceAll('|','／').replaceAll('\n',' ');
const relative=file=>path.posix.relative('docs/project',file);
const links=ids=>ids.map(id=>`[${id}](#${id.toLowerCase()})`).join('、');
const taskLinks=ids=>ids.map(id=>`[${id}](PERFORMANCE_TODO.md#${id.toLowerCase()})`).join('、');
const lines=[
 '# A01：旧性能审计逐条复核','',
 '2026-10-20。用户授权“开始A01的剩余审计吧”。本次已完成全部169条的当前结论和去向：补齐65条占位，复核104条已有批次结论，其中4条重写以明确剩余范围。审计完成不表示169条问题全部修复，也不关闭自然战役、实际输入或全内容60FPS验收。','',
 '[性能看板](PERFORMANCE_BOARD.html) · [完整任务表](PERFORMANCE_TODO.md) · [范围报告](../../reports/qa/performance-a01-20261020.json)','',
 '## 结论与下一项','',
 '当前看板52项，完成40项、剩余12项。原50项中A01完成后为40项；新增两项只用于跟踪原审计已存在、但未在旧完成批次中关闭的余项，不增加玩法或画质范围。','',
 '| 分类 | 条数 | 含义 |','| --- | ---: | --- |',
 ...Object.entries(counts).map(([s,n])=>`| ${s} | ${n} | ${({
  已解决:'原条目对应机制已修，有范围化证据；不等于整场性能达标',
  部分解决:'已修部分保留，剩余范围有开放任务',
  保留现状:'当前语义必要或无可靠新收益，明确不改',
  否定:'旧断言、归因或验收推论不成立，不把它当待修事实',
  不采纳:'候选回退、收益不足或缺少正确性依据，保留撤回原因',
  待测:'当前频度、成本或验收证据仍缺，进入明确任务',
  待讨论:'会改变体验/时序/预载范围，等待原定决定',
  延期:'存档、后端、微信和构建工具按既定范围后置',
  证据口径:'纠正CPU/GPU、长帧、加载与历史样本的解释，非新增性能补丁',
 })[s]} |`),
 '',
 '| 后续任务 | 原审计条目 | 剩余内容 |','| --- | --- | --- |',
 '| A02（下一项，未开始） | SIM-008、R04、R06、R15 | 奖励池派生、镜头遍历/布局、屏外据点动画、旧英雄查找及容量；先测当前真实调用与输出，再决定候选 |',
 '| A03（待办） | LOAD-007、L06 | 真实部署缓存命中异常、跨版本磁盘留存/预算；保护活动引用与离线唯一恢复源 |',
 '| D01–D04（待讨论） | 详见逐条去向 | 集中补兵时序、可见性/画质、历史/掉落、预载范围；未实施取舍 |',
 '| D05–D06（暂缓） | 详见逐条去向 | 存档至MVP收尾；后端、微信和构建链另批 |',
 '| V01–V04（待办） | 详见逐条去向 | 最终统一验证、自然战役/无尽、实际输入/用户体验和最终交付 |','',
 '## 重点更正','',
 '- 无尽普通波当前每轮60秒、4波；精英/Boss的频率因子在300秒后封顶1.2，每类别只保留一个到期模板，失败1秒后重试。旧“无限加快/无限补Boss”描述不成立；ambient/swarm及战役特殊队列集中释放是另一问题，继续D01。',
 '- R04旧mainSet候选在25实体中位回退32%，7对中6对更慢；LOAD-001旧两key循环候选在3000压力回退13.16%。最终外部组合明确排除此二者，不机械移植。',
 '- F03实际实现始终同步实例数量，仅count>0标记矩阵/颜色上传，空层稳态97280字节降到0；没有把它误记为改用commitInstances或局部范围上传。',
 '- 共享纹理、姿态合并、着色器预热、深度材质生命周期等已有修复复用原证据；已撤回加载候选仍保留失败。驱动同步阻塞、异步等待与GPU elapsed分别解释，不能相加。',
 '- 当前普通舰装为memoryOnly；旧存档的重复编码/校验确有后续研究空间，但不重新启动存档工作。后台SQL、微信旧kairos预检及辅助构建清单缺口也不作为玩家战斗FPS结论。',
 '- L03离线1874资产逐一SHA、Web/离线新局与恢复证据可复用；其页面/UI缓存验证不能代替真实部署CacheStorage长期或跨版本预算。','',
 '## 核验范围与证据归属','',
 `- main仍为${main}。本次开始快照中的${before.files.length}个src/test/deploy/tools文件逐字节未改，只新增审计工具、报告和看板记录。`,
 '- 当前414个生产输入与L03冻结输入比较：289字节一致、124仅换行差异，另1个economic-egg属于此前其他工作流修改。它未纳入L03性能证据，本次不修改也不宣称已验收其性能。',
 '- 本次66/66定向回归通过，覆盖光环动态失效、当前难度/无尽、固定步欠账、地图定义、材质程序key、共享纹理、缓存失败与更新、HTTP资源和源效果停止。没有重跑整套1745项；L03完整覆盖作为此前证据保留。',
 `- ${sourceRecords.size}个当前源码锚点保存路径、行号、片段及文件SHA；169条保留原sourceCategory/sourceExecution/sourceIntegration，逐条引用文档/QA并明确开放去向。100条沿用既有批次证据，65条补齐、4条既有未结范围更新。`,
 '- 没有新浏览器/帧率实验、生产数据库连接、微信真机或存档实验。历史失败、超时、回退、未复现和未覆盖范围不改标通过。','',
 '## 169条当前结论','',
 '这里的编号属于旧审计，与看板任务编号分属两个命名空间。例如旧R01（材质上传）去向是任务H01，不是任务R01（地表GPU）。证据表可按编号定位；所有条目的原结论见审计前快照。','',
 '| 原审计条目 | 当前分类 | 去向 |','| --- | --- | --- |',
 ...records.map(r=>`| [${r.id} ${mdEscape(r.title)}](#audit-${r.id.toLowerCase()}) | ${r.status} | ${taskLinks(r.destinations)} |`),'',
];
for(const r of records){
 lines.push(`<a id="audit-${r.id.toLowerCase()}"></a>`,`### ${r.id} · ${r.title}`,'',
  `**${r.status}**。${r.conclusion}`,'',
  `去向：${taskLinks(r.destinations)}。${r.next?'下一步：'+r.next:''}`,
  '',`证据：${links(r.evidenceIds)}${r.sources.length?'；当前源码：'+links(r.sources):''}。`,'');
}
lines.push('## 当前源码锚点','',
 '行号对应本次哈希记录的文件；未来源码变更后以QA与source-anchors.json中保存的片段和哈希为准。','');
for(const s of sourceRecords.values())lines.push(`<a id="${s.id.toLowerCase()}"></a>`,
 `- **${s.id}**：[${s.file}:${s.line}](${relative(s.file)}#L${s.line})；定位文本：\`${s.needle.replaceAll('`','')}\`。文件证据${s.evidenceId}。`);
lines.push('','## 证据索引','',
 '以下引用全部验证文件存在并记录SHA。链接到既有报告代表复用其指定范围，不表示本次重新执行其中的测试或接受其全部历史候选。','');
for(const e of evidence.values())lines.push(`<a id="${e.id.toLowerCase()}"></a>`,
 `- **${e.id}**：[${e.path}](${relative(e.path)})；${e.bytes}字节；SHA-256 \`${e.sha256}\`。`);
lines.push('','## 交付边界','',
 '本次没有游戏生产改动、构建、命名HTML/ZIP或Current替换，没有提交、推送或发布。300上限、4∶4∶1、完整效果、五图冻结、模拟经济与存档延期保持。A02/A03只建立明确跟踪，本次未开始；最终统一验证与整体MVP边界继续开放。','');
await fs.writeFile(document,lines.join('\n'));
const report={
 date:'2026-10-20',status:'complete-audit-only',scope:verification,main,
 board:{beforeRevision:86,startedRevision:87,finalRevision:88,beforeTasks:50,tasks:52,completed:40,remaining:12,next:'A02',newTasks:['A02','A03']},
 adjudications:records,sourceAnchors:[...sourceRecords.values()],evidence:[...evidence.values()],
 document:{path:document,sha256:sha(await fs.readFile(document))},
 boundaries:['No production edits, new build, commit, push, Current replacement or publication.',
  'No new FPS/CPU/GPU or natural/physical/user-acceptance claim.',
  'Original 169 source metadata preserved. Audit IDs and task IDs are separate namespaces.',
  'Unresolved issues remain routed to A02/A03, decisions and final verification.'],
};
await writeJSON(qaFile,report);
await writeJSON(boardFile,board);
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md','docs/project/README.md']){
 const text=await fs.readFile(file,'utf8'),at=text.indexOf('\n');
 const link=path.posix.relative(path.posix.dirname(file),document);
 const note=`\n\n> 2026-10-20：[A01逐条审计完成](${link})：169条全部有当前结论与去向，65条占位补齐；66定向回归通过、游戏代码未改。新增A02/A03跟踪原有余项后共52项、完成40、剩余12；下一项A02未开始。审计完成不等于全部性能问题关闭。\n`;
 await fs.writeFile(file,text.slice(0,at)+note+text.slice(at));
}
const agents=await fs.readFile('AGENTS.md','utf8');
await fs.writeFile('AGENTS.md',[
 '## A01 旧审计逐条复核完成 · 2026-10-20','',
 '- 用户授权“开始A01的剩余审计吧”。记录docs/project/PERFORMANCE_A01_20261020.md，证据reports/qa/performance-a01-20261020.json；169条全部有当前结论与去向，补65条占位、复核104条（更新4条未结范围），原source分类/执行/集成元数据保持。',
 `- 当前分类：${Object.entries(counts).map(([s,n])=>s+n).join('、')}。本次66定向回归通过；3984既有src/test/deploy/tools文件逐字节未改。当前对L03冻结生产输入289字节/124换行一致，economic-egg其他工作流变更单列，不继承L03性能验收。`,
 '- 新增A02承接SIM-008/R04/R06/R15四项客户端频度/成本/容量补证，A03承接LOAD-007/L06实际部署缓存命中与跨版本磁盘留存。只是原审计余项的固定跟踪；52项完成40、剩余12，下一项A02，A02/A03尚未开始。',
 '- 保留旧R04/LOAD-001候选回退；无尽无限加速/补Boss旧推断否定，ambient/swarm集中投放仍D01。F03实际为count>0才标上传，非改用commitInstances/局部上传。旧审计ID与看板任务ID是不同命名空间。',
 '- 审计完成不表示所有问题修复或全内容60FPS通过；D01–D04待讨论、D05/D06暂缓、V01–V04待办。存档仍至MVP收尾，后台/微信另批。没有新性能/浏览器/真机/存档实验，不替换Current、不提交/推送/发布；原失败、候选与边界保持。','',agents
].join('\n'));
console.log(JSON.stringify({status:report.status,counts,sourceAnchors:sourceRecords.size,evidence:evidence.size,board:report.board}));
