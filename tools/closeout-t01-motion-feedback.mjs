import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='.cache/t01-motion-feedback',base='reports/local/t01-20261024',file='reports/qa/t01-motion-audio-20261026.json';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
async function hash(p){const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');}
const baseline=await read(root+'/baseline.json'),native=await read(root+'/native-after.json'),data=await read(root+'/data-audit.json'),web=await read(root+'/browser/web-browser.json'),offline=await read(root+'/browser/offline-browser.json'),normal=await read('.cache/t01-audio/native-browser.json');
for(const r of [web,offline,normal]){assert.ok(r.complete,r.failure);assert.deepEqual(r.errors,[]);assert.deepEqual(r.http,[]);}
assert.ok(normal.checks.includes('normal-entry-original-dialogue-output'));
assert.ok(normal.checks.includes('normal-entry-original-attack-output'));
for(const r of [web,offline]){assert.equal(r.cases.length,31);assert.equal(r.loops.length,3);assert.ok(r.signal>.00001);assert.equal(r.decoded.originalDecoded,1526);assert.ok(r.checks.includes('actual-export'));}
assert.equal(native.rows.length,121);assert.equal(native.rows.filter(r=>r.movingShots>0).length,119);assert.deepEqual(native.withoutMovingShots.map(r=>r.actor),['elite.tank.2','elite.tank.3']);
assert.ok(native.demos.find(r=>r.race==='terran').result.some(r=>r.type==='tank'&&r.movingShots>0));
assert.ok((await fs.readFile(root+'/tests.log','utf8')).includes('pass 30'));assert.equal((await fs.readFile(root+'/tool-typecheck.log','utf8')).trim(),'');assert.ok((await fs.readFile(root+'/build-web.log','utf8')).includes('Web directory:'));
const build=await read(base+'/build.json'),pack=await read(base+'/offline-r30/build.json'),artifact=pack.artifacts[0];
assert.equal(await hash(artifact.file),artifact.sha256);assert.equal(offline.htmlSha256,artifact.sha256);for(const r of build.inputs)assert.equal(await hash(r.file),r.sha256,r.file);for(const r of build.resources)assert.equal(await hash(r.source),r.sha256,r.source);
assert.equal(await hash(baseline.current.file),baseline.current.sha256);
const changed=[];for(const[p,h]of Object.entries(baseline.files))if(await hash(p)!==h)changed.push(p);
assert.ok(changed.every(p=>!p.startsWith('src/simulation/')));const production=changed.filter(p=>p.startsWith('src/'));
const summary='移动/变形原声与单位对白轮播已同步正式源码、正常构建和综合HTML。接入760份新增原版音频，覆盖15种有原生移动音的身份、10个变形方向及48种对白身份；优先中文、逐句轮播且不重叠。修复移动射击展示中坦克被禁止开火；121个远程身份/形态核验中119个实际移动开火，两种精英坦克保留用户确认的部署限制。30项相关测试、类型及最终离线31场景通过，1526音频解码和实际信号、暂停/逐帧/导出及三轮默认循环通过，HTTP/页面错误0。T01仍待用户画面与试听。';
const report={date:'2026-10-26',task:'T01',status:'implemented-engineering-verified-awaiting-user-visual-review',summary,
 authorization:{initial:baseline.authorization,clarification:'用户确认：保留部署限制，所有可移动且有武器的形态都能边走边打。加入单位对话轮播。'},
 changes:[
  {area:'变形声音',result:'坦克、维京、雷神、火车/火蝠、潜伏者双向切换接原版SoundData。分段事件按ModelData时间及实际变形进度播放；取消/死亡丢弃未来段，暂停恢复只播放未来段，读档不重播旧事件。'},
  {area:'移动声音',result:'实际速度非零才播放原版Movement音，形态切换使用对应音色；停止、死亡、暂停及场景切换结束通道。限制近处最多8个移动通道。未定义移动声音的原版身份保持静音，不借用其他单位音效。'},
  {area:'单位对白',result:'48种原版身份使用What/Yes对白，普通与精英沿用对应单位、英雄分流；优先中文原声，无英文回退。友军活体轮换发声，每组样本播完一轮再重复；全局单对白，按语句长度留间隔，暂停清理。'},
  {area:'移动射击',result:'正式装备修正对所有非建筑友军已经生效。故障来自展示夹具仅解除主角开火锁，坦克等陪同单位仍为Infinity；现解除所有参与者的展示锁，仍由真实原生战斗选目标、射击和结算。未修改装备概率、射程、目标类型、部署限制或伤害。'}],
 validation:{tests:{passed:30,failed:0,files:['test/motion-audio.test.ts','test/combat-audio.test.ts','test/hero-audio-feedback.test.ts','test/equipment-effects.test.ts']},productionTypecheck:true,toolTypecheck:true,
  movingFire:{actorsAndForms:121,movingShotsVerified:119,deploymentRestricted:['elite.tank.2','elite.tank.3'],carrierVerification:'从entities统计母舰所属真实子机射击，并要求母舰移动；不把母舰自身零弹数误判为漏攻击。',forms:['hellbat','viking_assault','thor_high_impact'],demonstrations:native.demos.map(r=>({race:r.race,shots:r.result.map(u=>({type:u.type,shots:u.shots??0,movingShots:u.movingShots}))}))},
  audio:{...data,decoded:1526,actualWaveformPeak:offline.signal,source:'锁定B97563的ActorData/SoundData/ModelData与原始文件，PCM16采样逐值核对。'},
  web:{cases:web.cases.length,errors:0,httpErrors:0},offline:{cases:offline.cases.length,caseIds:offline.cases.map(r=>r.id),checks:offline.checks,loops:offline.loops.length,errors:0,httpRequests:0},normalGame:{appBuildId:normal.release.appBuildId,checks:normal.checks,decoded:normal.audio.originalDecoded,errors:0,httpErrors:0},build:{inputs:build.inputs.length,assets:build.assetCount,resources:build.resources.length,hashesVerified:true},visualReview:'仅复看代表性的变形、移动射击画面；不代替用户全量画面与听感验收。'},
 fixtureCorrections:['全范围统计最初遗漏航母子机，因为World.allies排除summonKind；改为entities中按summonOwnerId统计真实射击。','火车喷火目标置于实际行进前方，保留原生前向武器约束。','浏览器逐帧夹具不再每帧反复暂停；另修复暂停吞掉未来变形段，并用真实暂停/恢复测试验证。','Node审计脚本不属于浏览器工具类型检查入口；浏览器入口及正式生产类型检查分别通过。'],
 catalogue:offline.counts,delivery:{file:artifact.file,bytes:artifact.bytes,sha256:artifact.sha256,assets:artifact.assets},formalBuild:await read('dist/web/web-release.json'),preservation:{baselineFiles:Object.keys(baseline.files).length,unchangedFiles:Object.keys(baseline.files).length-changed.length,changed,production,added:['src/render/effects/motion-audio.ts','test/motion-audio.test.ts','tools/t01/motion-audio-plan.mjs'],current:baseline.current,currentReplaced:false,gameplayChanged:false},
 limits:['未定义独立Movement声音的36种原始身份保持原版静音；其中包括普通坦克、陆战队员等，不声称已补出不存在的履带或脚步原声。','15种移动与48种对白身份包含特殊形态及英雄，多个精英共用对应基础身份；不是所有文件都经人类逐句试听。','保持架起/钻地及无武器形态限制；绿色和蓝色装备原有概率、转向数值不变。','T01画面与试听仍待用户，最终V/MVP、V04及既有性能/设备限制保持。'],
 reproduce:['node tools/prepare-t01-audio-plan.mjs','pwsh -NoProfile -File tools/fetch-t01-audio.ps1 -Requests .cache/t01-audio/requests.json','python tools/prepare-combat-audio.py','node --import tsx --test test/motion-audio.test.ts test/combat-audio.test.ts test/hero-audio-feedback.test.ts test/equipment-effects.test.ts','node --import tsx tools/t01/inspect-motion-fire.ts --after','npm run build:web','node tools/stage-t01-effect-assets.mjs','node tools/build-t01.mjs','node tools/build-t01-offline.mjs offline-rN','node tools/verify-t01-motion-audio.mjs --offline=<最新综合HTML>','node tools/verify-t01-audio-native.mjs'],retention:{cleanupPending:true,rule:'仅保留当前综合HTML、必要输入、简要结论与复现代码；本批截图/日志/浏览器缓存及旧HTML清理。'},boardRevision:214,commit:false,push:false,publish:false};
await fs.writeFile(file,JSON.stringify(report,null,2)+'\n');pack.offlineVerified=true;pack.verification=file;await fs.writeFile(base+'/offline-r30/build.json',JSON.stringify(pack,null,2)+'\n');
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,213);board.revision=214;board.updated=report.date;board.next='T01';const task=board.tasks.find(t=>t.id==='T01');task.status='待验证';task.updated=report.date;task.result=summary;task.evidence.push('../../'+file);board.updates.push({date:report.date,tasks:['T01'],change:summary,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-26 移动、变形声音及移动射击复核（看板214）\n\n'+summary+'\n\n用户明确保留部署限制。没有独立原生移动声的身份保持静音；完整映射与限制见 `'+file+'`。当前综合HTML `'+artifact.file+'`；Current保持，未提交/推送/发布，V04未启动。\n');
await fs.writeFile('AGENTS.md','## T01移动变形音效与移动射击复核交付 · 2026-10-26\n\n- '+summary+'\n- 用户确认保留部署限制；153份模拟源码逐SHA保持，旧756音频与路由逐SHA重建保持。无独立原生移动声的身份保持静音。当前 `'+artifact.file+'`，结论 `'+file+'`。\n- 看板214，下一项仍T01。Current与原始资源保持，未提交/推送/发布，V04未启动；本批临时产物及旧HTML按保留规则清理。\n\n'+await fs.readFile('AGENTS.md','utf8'));
console.log(JSON.stringify({report:file,board:214,delivery:artifact.file,tests:30,cases:31,addedAudio:760,movingFire:119}));
