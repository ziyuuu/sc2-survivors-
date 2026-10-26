import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='.cache/t01-sound-recheck',base='reports/local/t01-20261024',file='reports/qa/t01-sound-recheck-20261026.json';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
async function hash(p){const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');}
const baseline=await read(root+'/baseline.json'),data=await read(root+'/data-audit.json'),web=await read(root+'/browser/web-browser.json'),offline=await read(root+'/browser/offline-browser.json'),normal=await read('.cache/t01-audio/native-browser.json');
for(const r of [web,offline,normal]){assert.ok(r.complete,r.failure);assert.deepEqual(r.errors,[]);assert.deepEqual(r.http,[]);}
for(const r of [web,offline]){
 assert.equal(r.cases.length,21);assert.equal(r.voiceRotations.length,19);assert.equal(r.voiceRotations.filter(r=>r.id.includes('actor:hero.')).length,18);assert.ok(r.voiceRotations.every(r=>r.peak>.00001));assert.equal(r.loops.length,3);assert.equal(r.decoded.originalDecoded,1909);assert.ok(r.checks.includes('actual-export'));
}
assert.equal(normal.audio.originalDecoded,1909);assert.ok(normal.checks.includes('normal-entry-original-dialogue-output'));assert.ok(normal.checks.includes('normal-entry-original-attack-output'));
assert.deepEqual(normal.release,await read('dist/web/web-release.json'));
assert.ok((await fs.readFile(root+'/tests.log','utf8')).includes('pass 35'));assert.equal((await fs.readFile(root+'/tool-typecheck.log','utf8')).trim(),'');assert.ok((await fs.readFile(root+'/build-web.log','utf8')).includes('Web directory:'));
const build=await read(base+'/build.json'),pack=await read(base+'/offline-r32/build.json'),artifact=pack.artifacts[0];assert.equal(await hash(artifact.file),artifact.sha256);assert.equal(offline.htmlSha256,artifact.sha256);
for(const r of build.inputs)assert.equal(await hash(r.file),r.sha256,r.file);for(const r of build.resources)assert.equal(await hash(r.source),r.sha256,r.source);assert.equal(await hash(baseline.current.file),baseline.current.sha256);
const changed=[];for(const[p,h]of Object.entries(baseline.files))if(await hash(p)!==h)changed.push(p);assert.ok(changed.every(p=>!p.startsWith('src/simulation/')));
const summary='复核并纠正上一轮移动音效与英雄语音遗漏：利维坦改接HotSLeviathan原声，净化者旗舰按实际净化者航母接音，菲尼克斯改接龙骑士语音与移动启动声；补齐扎加拉及龙骑士菲尼克斯的原模型脚步事件。18英雄均有原版语音（利维坦为生物叫声），50身份支持选中/回应/闲聊轮播，短场景重置保留轮播顺序。新增406份原始音频；35项相关测试、类型、最终离线21场景及19组对白轮换通过，18英雄均测得实际声音信号，1909音频解码、循环/暂停/逐帧/导出通过，HTTP/页面错误0。普通坦克及陆战队员未找到可靠战斗移动绑定，撤回“原版没有相关声音”的过强结论。';
const report={date:'2026-10-26',task:'T01',status:'implemented-engineering-verified-awaiting-user-review',summary,authorization:baseline.authorization,
 corrections:[{prior:'只检查Actor Movement字段即把36身份归为原版静音',now:'同时核对实际模型ModelData、主体及附加M3动画、原音频目录；补上遗漏的模型事件，未定位的项目标为未找到可靠绑定。'},
 {prior:'hots_leviathan使用liberty:Leviathan',now:'swarm:HotSLeviathan，包含原版What/Yes生物叫声。'},
 {prior:'purifier_flagship使用liberty:Purifier',now:'实际模型是净化者航母，沿用Carrier语音与移动引擎，非另一个Purifier母舰。'},
 {prior:'菲尼克斯使用FenixChampion',now:'当前模型为合作任务龙骑士，使用FenixDragoon语音、Dragoon_MoveStart及Fenix_Dragoon_Footsteps；启动音只在开始移动时播放。'},
 {prior:'每次短场景重置清空对白类别序号',now:'跨重置保留轮换序号，单组样本轮换和全局对白互斥保持，增加原版Pissed闲聊，Sequential台词按原始顺序播放。'}],
 audio:data,validation:{tests:{passed:35,failed:0},productionTypecheck:true,toolTypecheck:true,web:{cases:web.cases.length,voiceRotations:web.voiceRotations.length,errors:0,httpErrors:0},offline:{cases:offline.cases.length,checks:offline.checks,voiceRotations:offline.voiceRotations,loops:offline.loops.length,errors:0,httpRequests:0},normalGame:{appBuildId:normal.release.appBuildId,checks:normal.checks,decoded:normal.audio.originalDecoded,errors:0,httpErrors:0},build:{inputs:build.inputs.length,assets:build.assetCount,resources:build.resources.length,hashesVerified:true},visualReview:'复看代表性的英雄待机画面及模型身份，听感仍由用户确认，不冒充逐句人类试听。'},
 catalogue:offline.counts,delivery:{file:artifact.file,bytes:artifact.bytes,sha256:artifact.sha256,assets:artifact.assets},formalBuild:await read('dist/web/web-release.json'),preservation:{baselineFiles:Object.keys(baseline.files).length,changed,production:changed.filter(p=>p.startsWith('src/')),current:baseline.current,currentReplaced:false,gameplayChanged:false},
 limits:['普通坦克及陆战队员：主体和附加动画没有找到Walk声音事件，Actor Movement引用没有对应银行；1362条CASC候选中可见过场步行等素材，但未定位到其战斗移动绑定。结论限于本次已核对资料，不宣称原版不存在任何相关声音。','18英雄均有对应原声，其中利维坦是生物叫声；普通与英雄舰船遵循实际舰船身份，并非虚构人物对白。','源文件中文区域及采样一致性已核对；实际音量平衡与逐句听感仍待用户确认。','T01、最终V/MVP及V04保持原验收边界。'],
 reproduce:['node tools/start-t01-sound-recheck.mjs','pwsh -NoProfile -File tools/discover-t01-movement-audio.ps1','node tools/audit-t01-walk-sources.mjs','node tools/prepare-t01-audio-plan.mjs','pwsh -NoProfile -File tools/fetch-t01-audio.ps1 -Requests .cache/t01-audio/requests.json','python tools/prepare-combat-audio.py','node --import tsx --test test/motion-audio.test.ts test/combat-audio.test.ts test/hero-audio-feedback.test.ts test/equipment-effects.test.ts','npm run build:web','node tools/stage-t01-effect-assets.mjs','node tools/build-t01.mjs','node tools/build-t01-offline.mjs offline-rN','node tools/verify-t01-motion-audio.mjs --recheck --offline=<最新综合HTML>','node tools/verify-t01-audio-native.mjs'],retention:{cleanupPending:true,rule:'保留当前综合HTML、必要输入、简要结论与复现代码；清理本批截图/日志/浏览器缓存及旧HTML。'},boardRevision:215,commit:false,push:false,publish:false};
await fs.writeFile(file,JSON.stringify(report,null,2)+'\n');pack.offlineVerified=true;pack.verification=file;await fs.writeFile(base+'/offline-r32/build.json',JSON.stringify(pack,null,2)+'\n');
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,214);board.revision=215;board.updated=report.date;board.next='T01';const task=board.tasks.find(t=>t.id==='T01');task.status='待验证';task.updated=report.date;task.result=summary;task.evidence.push('../../'+file);board.updates.push({date:report.date,tasks:['T01'],change:summary,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-26 移动原声与18英雄语音复核纠正（看板215）\n\n'+summary+'\n\n当前综合HTML `'+artifact.file+'`；记录 `'+file+'`。Current保持，未提交/推送/发布，V04未启动。\n');
await fs.writeFile('AGENTS.md','## T01移动原声与18英雄语音复核纠正 · 2026-10-26\n\n- '+summary+'\n- 153份模拟源码与既有战斗音频路由保持；当前 `'+artifact.file+'`，结论 `'+file+'`。T01画面与听感仍待用户确认。\n- 看板215，下一项仍T01。Current与原始资源保持，未提交/推送/发布，V04未启动；本批临时产物及旧HTML按保留规则清理。\n\n'+await fs.readFile('AGENTS.md','utf8'));
console.log(JSON.stringify({report:file,board:215,delivery:artifact.file,tests:35,cases:21,heroes:18}));
