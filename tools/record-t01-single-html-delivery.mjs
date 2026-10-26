import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
const base='reports/local/t01-20261024',read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,'')),sha=b=>createHash('sha256').update(b).digest('hex');
const qaPath=process.argv[2],offlinePath=process.argv[3],qa=await read(qaPath),offline=await read(offlinePath);assert.equal(qa.pass,true);assert.equal(offline.artifacts.length,1);
for(const f of offline.sourceBuild.inputs)assert.equal(sha(await fs.readFile(f.file)),f.sha256,f.file);
const artifact=offline.artifacts[0],h=createHash('sha256');for await(const b of createReadStream(artifact.file))h.update(b);assert.equal(h.digest('hex'),artifact.sha256);
const baseline=await read(base+'/baseline.json');assert.equal(sha(await fs.readFile(baseline.currentFile)),baseline.currentSha256);
const planPath=base+'/plan.json',plan=await read(planPath),board=await read('docs/project/performance-board.json');assert.equal(board.revision,194);const task=board.tasks.find(t=>t.id==='T01');
await fs.writeFile(base+'/scope-before-user-correction-20261025.json',JSON.stringify({plan,task},null,2),{flag:'wx'});
const authorization='2026-10-25 用户纠正：“你是不是有什么误会啊。我是要你把东西做到一个htlm里面我来检测啊”。停止代理全目录逐项观看；交付一个包含动态与静态/UI目录的离线HTML，由用户检查。';
const steps=[
 '在同一个离线HTML里提供动态对象、动作、卡牌、技能、玩法和静态/UI目录，使用当前生产组件、规则与资源。',
 '支持搜索、分类、载入、单次/循环播放、定格、慢放、逐帧和重置；静态/UI可直接载入对应页面与状态。',
 '提供已看、有问题、备注与记录导出，由用户自行检查和反馈；不要求代理先看完所有条目才交付。',
 '交付前只做文件打开及关键工具控制的有限可用性检查；停止追加全目录自动检查和无关游戏修复。',
 '保留此前证据和已发现问题，未检查条目不标为通过；本次工具交付不宣称游戏视觉或MVP最终验收通过。'
];
const acceptance=[
 '一个HTML包含动态与静态/UI目录，直接打开、断网可用，游戏存档隔离。',
 '搜索载入、播放/暂停/慢放/逐帧/重置/循环、动态与静态切换、备注与导出可用。',
 '文件交给用户检查，视觉判断和后续修复依据用户反馈，不以代理全量观看为交付前置。'
];
Object.assign(plan,{authorization,scope:steps,acceptance,implementation:['One combined offline HTML with shared embedded resources and both catalogues.','Bounded usability verification only; user visual inspection pending.'],status:'delivered-for-user-inspection',supersedes:base+'/scope-before-user-correction-20261025.json'});
await fs.writeFile(planPath,JSON.stringify(plan,null,2)+'\n');
const evidence=base+'/single-html-delivery-20261025.json';
const result={date:new Date().toISOString(),authorization,file:artifact.file,bytes:artifact.bytes,sha256:artifact.sha256,catalogue:{dynamic:13799,static:332},assets:artifact.assets,chunks:artifact.chunks,offlineBuild:offlinePath,usability:{report:qaPath,checks:qa.checks.length,http:qa.http.length,errors:qa.errors.length,pass:true},inputsVerified:offline.sourceBuild.inputs.length,currentUnchanged:true,scope:'Tool delivery for user inspection. No complete visual acceptance.',userInspection:'pending',agentFullCatalogueInspection:'stopped-by-user-correction',productionChangesThisDelivery:[],commit:false,push:false,publish:false};
await fs.writeFile(evidence,JSON.stringify(result,null,2),{flag:'wx'});
board.revision=195;board.updated='2026-10-25';board.next='T01';task.status='待讨论';task.updated=board.updated;task.title='综合检测单文件HTML（待用户检查）';task.problem='用户要一个可直接选择对象、动作、技能和UI页面的HTML，供自己集中检查。此前把代理全量逐项观看作为交付前置是范围误解，已按用户纠正停止。';task.steps=steps;task.acceptance=acceptance;
task.result=`按用户纠正交付一个综合离线HTML：13799动态条目与332静态/UI条目，共享1909资产/2975块。${qa.checks.length}项有限可用性检查通过，断网HTTP0、页面错误0，实际记录导出通过。停止代理全目录观看，等待用户自行检查；不宣称全量视觉或MVP验收通过。`;task.evidence.push('../../'+evidence);board.updates.push({date:board.updated,tasks:['T01'],change:task.result,evidence:['../../'+evidence]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const q=await read('reports/qa/t01-20261024.json');Object.assign(q,{progress:evidence,offlineDelivered:true,delivery:result,coverageComplete:false,boardRevision:195,status:'delivered-for-user-inspection'});await fs.writeFile('reports/qa/t01-20261024.json',JSON.stringify(q,null,2)+'\n');
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-25 单文件HTML交付，范围纠正（看板195）\n\n'+authorization+'\n\n'+task.result+'\n\n文件 `'+artifact.file+'`；验证 `'+qaPath+'`。此前已完成证据保留，不继续旧计划要求的代理全目录观看。\n');
const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md','## T01 单文件交付，用户自行检查 · 2026-10-25\n\n- '+authorization+'\n- '+task.result+'\n- 文件 `'+artifact.file+'`。仅工具合并，本批无新增游戏源码修改；Current保持，未提交/推送/发布。看板195，T01待用户检查，V04等后续不擅自启动。证据 `'+evidence+'`。\n\n'+agents);
console.log(JSON.stringify({board:195,file:artifact.file,bytes:artifact.bytes,checks:qa.checks.length}));
