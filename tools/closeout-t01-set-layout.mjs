import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const cache='.cache/t01-set-layout-20261025',base='reports/local/t01-20261024',reportPath='reports/qa/t01-set-layout-20261025.json';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
const sha=b=>createHash('sha256').update(b).digest('hex');
const hash=async file=>{const h=createHash('sha256');for await(const bytes of createReadStream(file))h.update(bytes);return h.digest('hex');};
const baseline=await read(cache+'/baseline.json'),oldTemplates=await read(cache+'/template-baseline.json'),templates=(await read('tools/t01/prototype.generated.json')).templates;
const native=await read(cache+'/qa-native/report.json'),offline=await read(cache+'/qa-offline/report.json'),layout=await read(cache+'/after/report.json'),exported=await read(cache+'/prototype-export/report.json');
for(const r of [native,offline,layout])assert.equal(r.pass,true);assert.equal(native.checks.length,24);assert.equal(offline.checks.length,24);assert.equal(layout.checks.length,9);assert.equal(exported.complete,true);assert.deepEqual(exported.failures,[]);
const pack=await read(base+'/offline-r15/build.json'),oldPack=await read(base+'/offline-r14/build.json'),build=await read(base+'/build.json'),artifact=pack.artifacts[0];
assert.equal(await hash(artifact.file),artifact.sha256);assert.equal(offline.htmlSha256,artifact.sha256);assert.equal(artifact.payloadSha256,oldPack.artifacts[0].payloadSha256);
const changed=[];for(const f of baseline)if(await hash(f.file)!==f.sha256)changed.push(f.file.replaceAll('\\','/'));
assert.deepEqual(changed.sort(),['src/ui/starship/equipment-description.ts','src/ui/starship/legacy-view.ts','src/ui/starship/native.css']);
for(const f of build.inputs)assert.equal(await hash(f.file),f.sha256,f.file);
for(const r of build.resources)assert.equal(await hash(r.source),r.sha256,r.source);
const reused=oldTemplates.filter(t=>!['starship','ship-operation','backpack','settlement'].includes(t.action));for(const t of reused)assert.equal(sha(JSON.stringify(templates.find(n=>n.id===t.id))),t.sha256,t.id);
const report={date:'2026-10-25',status:'completed-limited-set-description-update',authorization:'UI基本没问题了。按这一版进行更新。【局部有限更新，只更新改动部分】但是你这个套装效果描述排布是不是有问题。请参考魔兽、暗黑',
 changes:['保留已确认五档品质展示及底色，仅更新舰装套装描述区域。','套装名称与已装备件数在上；当前档位按实际2/4/6件门槛分组，合并同一门槛下多条效果。','已激活与未激活同时用颜色和文字区分；其他品质、套装规则、换装预览独立展开。','效果汇总按套装或功能装备来源分组。修复相同效果出现在2件和6件时，6件门槛未满足却显示激活的说明错误。'],
 references:[{title:'World of Warcraft class set bonuses',url:'https://worldofwarcraft.blizzard.com/en-us/news/24244458'},{title:'Diablo III Tal Rasha set item',url:'https://eu.diablo3.blizzard.com/en-us/item/tal-rashas-grasp-P2_Unique_Gloves_02'}],
 delivery:{file:artifact.file,bytes:artifact.bytes,sha256:artifact.sha256,assets:artifact.assets,chunks:artifact.chunks},
 verification:{tests:32,newSemanticTests:5,typecheck:true,nativeChecks:24,offlineChecks:24,templateLayoutChecks:9,races:3,viewportModes:3,http:offline.http.length,pageErrors:native.errors.length+offline.errors.length,consoleErrors:native.consoleErrors.length+offline.consoleErrors.length,baselineSourceAndTestFiles:baseline.length,unchanged:baseline.length-changed.length,changed,addedTests:['test/equipment-set-description.test.ts'],buildInputs:build.inputs.length,resourceFiles:build.resources.length,embeddedResourcePayloadUnchanged:true,prototypeStates:templates.length,reusedUnrelatedTemplates:reused.length,unrelatedTemplatesUnchanged:true,prototypeBusinessLogic:false},
 resolvedAttempts:['首轮原生截图未等待尺寸同步，排版取景滞后一帧；加入等待和实际视口边界断言后24项补测通过。','首次静态截图自动滚动等待稳定超时，改为明确滚动描述区域后9项通过。','native.css首次写入临时失败，重试成功。'],
 retention:{cleanupPending:true,rule:'只保留当前综合HTML与必要输入、简要结论及复现代码；删除本批截图、缓存和被替代HTML。'},currentReplaced:false,commit:false,push:false,publish:false,
 limits:['本次为用户批准的局部UI更新；未改变套装数值、品质门槛、购买、存档或战斗结算。','T01动态与最终画面仍待用户检查；不提前启动V04或通过最终V/MVP。'],
 reproduce:['node --import tsx --test test/equipment-set-description.test.ts test/fun-feedback-r4-interactions.test.ts test/g03-rank-equipment-growth.test.ts','npm run typecheck','node tools/export-t01-prototypes.mjs --refresh-equipment','node tools/qa-t01-set-controls.mjs native','node tools/build-t01.mjs','node tools/build-t01-offline.mjs offline-rN','node tools/qa-t01-set-controls.mjs offline reports/local/t01-20261024/offline-rN/build.json']};
await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
const galleryPath='reports/qa/t01-gallery-20261025.json',gallery=await read(galleryPath);gallery.delivery=report.delivery;gallery.latestSetLayout=reportPath;gallery.previousEquipmentVerification=gallery.verification;gallery.verification={...report.verification,scope:'r15局部套装描述检查；旧动态检查为历史结果，不重计。'};gallery.retention=report.retention;await fs.writeFile(galleryPath,JSON.stringify(gallery,null,2)+'\n');
const text='用户认可上一版UI并要求局部更新。仅3份舰装UI源码更新套装描述：套装名/件数、按门槛分组的效果、激活状态、独立的其他品质/规则/换装预览，效果汇总按来源分组；修正相同效果跨2/6件档位的错误激活标记。32项相关测试、类型、24项原生和24项离线操作及9项布局检查通过；HTTP/页面错误0，'+(baseline.length-changed.length)+'份其他既有源码/测试、187份无关页面模板及资源载荷保持。未改套装机制；T01仍待用户最终画面检查。';
const boardPath='docs/project/performance-board.json',board=await read(boardPath);assert.equal(board.revision,201);board.revision=202;board.updated='2026-10-25';board.next='T01';const task=board.tasks.find(t=>t.id==='T01');task.status='进行中';task.result=text;task.evidence.push('../../'+reportPath);board.updates.push({date:board.updated,tasks:['T01'],change:text,evidence:['../../'+reportPath]});await fs.writeFile(boardPath,JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-25 套装描述局部更新（看板202）\n\n'+text+'\n\n当前交付 `'+artifact.file+'`；简要结论 `'+reportPath+'`。Current未替换，未提交、推送或发布。\n');
await fs.writeFile('AGENTS.md','## T01套装效果描述局部更新完成 · 2026-10-25\n\n- '+text+'\n- 当前单文件 `'+artifact.file+'`，记录 `'+reportPath+'`。362个UI展示状态；本批截图、缓存与旧HTML按保留规则清理。\n- 看板202，下一项仍T01；Current保持，未提交/推送/发布。\n\n'+await fs.readFile('AGENTS.md','utf8'));
console.log(JSON.stringify({board:202,changed,checks:[24,24,9],reused:reused.length,delivery:artifact.file}));
