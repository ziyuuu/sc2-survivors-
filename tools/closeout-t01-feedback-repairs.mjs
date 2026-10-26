import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root='.cache/t01-feedback-repairs',base='reports/local/t01-20261024',file='reports/qa/t01-feedback-repairs-20261026.json';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
async function hash(p){const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');}
const qa=await read(root+'/browser/offline-browser.json'),web=await read(root+'/browser/web-browser.json'),native=await read('.cache/t01-audio/native-browser.json'),baselineBrowser=await read(root+'/early-browser/baseline-browser.json');
for(const q of [qa,web,native,baselineBrowser]){assert.ok(q.complete);assert.deepEqual(q.errors,[]);assert.deepEqual(q.http,[]);}
assert.equal(qa.cases.length,30);assert.equal(qa.loops.length,12);assert.equal(qa.decoded.originalDecoded,766);assert.ok(qa.signal>.00001);assert.equal(qa.scaleReference.instances.length,4);
assert.ok(qa.checks.includes('four-identities-identical-instance-scale-under-fixed-camera'));
const equipment=await Promise.all([0,1,2].map(n=>read(root+'/equipment-audit-'+n+'.json'))),rows=equipment.flatMap(e=>e.rows),first=equipment[0];
assert.equal(rows.length,3312);assert.equal(new Set(rows.map(r=>r.id)).size,3312);assert.ok(rows.every(r=>r.verified&&r.triggered));
for(const e of equipment){assert.equal(e.configurations,3801);assert.equal(e.previewCases,4019);assert.equal(e.representativeCases,3312);assert.deepEqual(e.classification,first.classification);assert.deepEqual(e.mapping,first.mapping);assert.deepEqual(e.failed,[]);}
assert.equal(Object.keys(first.mapping).length,3983);for(const id of Object.values(first.mapping))assert.ok(rows.some(r=>r.id===id));
const classification=Object.fromEntries(Object.entries(first.classification).map(([key,value])=>[key,{...value,verifiedScenarios:rows.filter(r=>r.key===key).length}]));
assert.equal(Object.keys(classification).length,191);for(const v of Object.values(classification))if(v.dynamic)assert.ok(v.verifiedScenarios>0);
assert.ok((await fs.readFile(root+'/tests-final.log','utf8')).includes('pass 111'));
assert.equal((await fs.readFile(root+'/tool-typecheck-final.log','utf8')).trim(),'');assert.ok(!(await fs.readFile(root+'/typecheck-final.log','utf8')).includes('error TS'));
const build=await read(base+'/build.json'),offline=await read(base+'/offline-r29/build.json'),baseline=await read(root+'/baseline.json'),artifact=offline.artifacts[0];
assert.equal(await hash(artifact.file),artifact.sha256);assert.equal(qa.htmlSha256,artifact.sha256);
for(const r of build.inputs)assert.equal(await hash(r.file),r.sha256,r.file);
for(const r of build.resources)assert.equal(await hash(r.source),r.sha256,r.source);
const changed=[];for(const[p,h]of Object.entries(baseline.files))if(await hash(p)!==h)changed.push(p);
const production=changed.filter(p=>p.startsWith('src/'));assert.equal(production.length,9);
assert.equal(await hash(baseline.current.file),baseline.current.sha256);
const before=await read(root+'/edge-before.json'),after=await read('.cache/t01-full-audit-20261026/edges.json');let mechanics=0;
function compare(a,b,p=''){if(a&&typeof a==='object'){if('mechanics'in a){assert.deepEqual(b.mechanics,a.mechanics,p);mechanics++;}for(const[k,v]of Object.entries(a))if(k!=='mechanics')compare(v,b?.[k],p+'/'+k);}}compare(before,after);assert.equal(mechanics,48);
const rawSources=[];for(const p of ['tools/t01-death-skin-dependencies.json','tools/t01-mission-death-dependencies.json','tools/t01-audio-dependencies.json']){const values=await read(p);for(const r of values)assert.equal(await hash(r.installFile),r.sha256,r.installFile);rawSources.push({manifest:p,verified:values.length});}
const summary='八项反馈修复已同步正式源码、正常构建与综合HTML。默认循环及装备真实触发/生命周期入口补齐，酒馆改为规则说明；三艘协战舰完整入场、恢复模型比例并兼容旧存档；召回/退场移除误带的追猎者本体，幻象显示真实副本，狂热者发辫按原模型修正。111项相关测试、3801配置参数核对、3312去重效果场景、48份机制对照和最终离线30场景通过；12组场景各连续三轮、766音频解码及实际信号、三尺寸、控制和导出通过，HTTP/页面错误0。T01仍待用户画面与试听。';
const fixes=[
 {id:1,result:'动态默认循环，200ms调度重建完整场景；暂停与逐帧保持暂停，切换静态后保留循环选择。触发条件自动准备，长期等待只在检测夹具中前置。'},
 {id:2,result:'酒馆三族三档移入可搜索规则说明，保留原生1.3/1.7/2.2任务抽选权重；任务本身仍有独立动态入口。'},
 {id:3,result:'191效果键逐项分类，3801配置实际参数重建核对；3947效果/生命周期用例按种族、绑定、阶段及完整生效参数去重为3312场景，全部真实触发与结果检查通过。数值/经济规则及混合套装中的非动态效果提供可搜索参数说明。'},
 {id:4,result:'协战舰visualScale从0.5恢复1；旧档仅修正显示，不重写已保存尺度。同镜头正式英雄/新协战舰/旧协战舰/装备赠舰四者实际实例尺度一致，赠舰按实际单位类型解析原版英雄模型。'},
 {id:5,result:'通用BlinkOriginModel保留原粒子但禁用固定追猎者网格；巢虫使用真实虫族单位，三族召回发生实际位置变化，到期走真实原生退场。'},
 {id:6,result:'移除检测夹具清空pending的错误，保留3舰原生分批入场、攻击及到期退场；取景包含全部友军和投影范围。'},
 {id:7,result:'幻象/相位/召回幻象专项接原生装备与真实实体，显示同模型副本、攻击、原生幻象颜色、到期和死亡，结束后实际实体与投影登记清零。'},
 {id:8,result:'修正原M3有符号重力、圆柱朝向和环向UV，按弧长截断并重采样避免末端堆叠；身体发辫由活体单独持有，武器请求排除重复发辫，保留原刀光。普通/三精英及待机/移动路径检查通过。'}
];
const finalMapping=await read(root+'/equipment-final-mapping.json');assert.equal(finalMapping.previewCases,3947);assert.ok(finalMapping.allMappedToVerifiedNativeScenario&&finalMapping.repeatedGroupsDescribed);assert.equal(qa.counts.dynamic,finalMapping.allDynamicCases);
const firstFindings=await read(root+'/equipment-first-findings.json');
const fixtureCorrections={browser:['四舰比例比较初次遗漏world.changed，暂停缓存沿用旧实体；修正缓存失效通知后四实例尺度一致。','竖屏备注按钮初次裁切，检测工具页脚增加高度后全部按钮在视口内。','重复套装组初次重复列入口；合并为3947条唯一ID，并标明同时生效组数，3312语义场景映射保持。'],initialFailures:firstFindings.failed.length,finalFailures:0,groups:[
 '陷阱目标先离开触发区再进入，避免生成与消耗发生在同一采样间隔。',
 '种族/方向增援先建立原生生产资格；手动冷却场景获取本种族的实际英雄。',
 '种子选择满足击杀补兵和多重攻击概率链，不覆盖正式随机判定。',
 '致命伤害使用不受普通武器闪避干扰的原生技能入口；伤害共享使用实际HP损失。',
 '临时军团结束场景阻止无关周期继续生成；康斯坦丁正常结束保留独立原生收尾。'
]};
const report={date:'2026-10-26',task:'T01',status:'implemented-engineering-verified-awaiting-user-visual-review',authorization:baseline.authorization,summary,fixes,
 validation:{tests:{passed:111,failed:0,files:['t01-feedback-rendering','t01-gallery-framing','source-combat-effects','source-particle-acceleration','missions','starship-projection-cleanup','hero-audio-feedback','starship-orange-heroes','equipment-effects'].map(n=>'test/'+n+'.test.ts')},productionTypecheck:true,toolTypecheck:true,equipment:{configurations:3801,effectKeys:191,dynamicKeys:Object.values(classification).filter(v=>v.dynamic).length,referenceKeys:Object.values(classification).filter(v=>!v.dynamic).length,previewCases:3947,preDeduplicationEntries:4019,uniqueParameterScenarios:3312,triggered:3312,verified:3312,failed:0,deduplication:'种族、绑定身份、焦点效果、阶段及全套生效参数完全一致才合并；可由审计工具重建全部映射。',classification,initialFixtureFailures:firstFindings.failed.length},mechanics:{snapshots:mechanics,equal:true,scope:'固定种子原生战斗状态对比，排除明确的显示字段；伤害/冷却/掉落/装备机制不改。'},build:{inputs:build.inputs.length,assets:build.assetCount,hashesVerified:true,rawSources},web:{cases:30,scope:'首次浏览器预检；最终HTML另作同版离线复核',errors:0,httpErrors:0},offline:{cases:30,caseIds:qa.cases.map(c=>c.id),checks:qa.checks,loops:qa.loops,layouts:qa.layouts.map(v=>({width:v.width,height:v.height})),errors:0,httpRequests:0},scaleReference:qa.scaleReference,audio:{decoded:766,actualWaveformPeak:qa.signal},normalGame:{appBuildId:native.release.appBuildId,checks:native.checks,errors:0,httpErrors:0},visualReview:{scope:'有限关键帧复看及旧r27与新版本相同动作/时刻比较，不是全目录人类视觉验收。',observed:['狂热者攻击原竖起黑条与修复后发辫对照','普通/精英共用发辫','完整三舰及固定镜头四种身份比例','真实幻象和召回','三尺寸检测页按钮与画面']}},
 fixtureCorrections,finalMapping,catalogue:qa.counts,delivery:{file:artifact.file,bytes:artifact.bytes,sha256:artifact.sha256,assets:artifact.assets},formalBuild:await read('dist/web/web-release.json'),preservation:{baselineFiles:Object.keys(baseline.files).length,unchangedFiles:Object.keys(baseline.files).length-changed.length,changed,production,added:['test/t01-feedback-rendering.test.ts','tools/t01/equipment-preview-spec.ts','tools/t01/equipment-effect-names.generated.json','tools/t01/probe-equipment-previews.ts','tools/t01/verify-equipment-preview-mapping.ts','tools/t01/equipment-preview-runtime.ts','tools/t01/audit-equipment-previews.ts'],current:baseline.current,currentReplaced:false,gameplayChanged:false},
 limits:['用户画面与试听验收仍开放；30场景不是全目录逐项视觉验收。','egg_conversion原生调用传入空子单位列表，当前无法产生独立转化画面；目录明确说明现状，本批不改变机制或伪造实体。','replace_hero_proxy生效时旧opening_hero_proxy被覆盖，目录说明实际英雄身份，不重复伪造旧投影。','纯数值/经济规则显示实际参数与条件，未编造独立战斗特效。','原V01/V02/V03性能、物理设备及最终个人试玩限制保持；V04未启动。'],
 reproduce:['node --import tsx --test test/t01-feedback-rendering.test.ts test/t01-gallery-framing.test.ts test/source-combat-effects.test.ts test/source-particle-acceleration.test.ts test/missions.test.ts test/starship-projection-cleanup.test.ts test/hero-audio-feedback.test.ts test/starship-orange-heroes.test.ts test/equipment-effects.test.ts','npm run typecheck','npx tsc --ignoreConfig --noEmit --strict --skipLibCheck --module ESNext --moduleResolution Bundler --target ES2022 --allowJs --types vite/client tools/t01/gallery-entry.ts','node --import tsx tools/t01/audit-equipment-previews.ts','node tools/run-t01-presentation-edge-audit.mjs','node tools/build-t01.mjs','node tools/build-t01-offline.mjs offline-rN','node tools/verify-t01-feedback-repairs.mjs --offline=<最新综合HTML>','npm run build:web','node tools/verify-t01-audio-native.mjs'],retention:{cleanupPending:true,rule:'只保留当前综合HTML、必需输入、简要结论与复现代码；删除本批截图、日志、浏览器配置及被替代HTML。'},boardRevision:213,commit:false,push:false,publish:false};
await fs.writeFile(file,JSON.stringify(report,null,2)+'\n');offline.offlineVerified=true;offline.verification=file;await fs.writeFile(base+'/offline-r29/build.json',JSON.stringify(offline,null,2)+'\n');
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,212);board.revision=213;board.updated=report.date;board.next='T01';const task=board.tasks.find(t=>t.id==='T01');task.status='待验证';task.updated=report.date;task.result=summary;task.evidence.push('../../'+file);board.updates.push({date:report.date,tasks:['T01'],change:summary,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-26 八项反馈修复交付（看板213）\n\n'+summary+'\n\n'+fixes.map(f=>'- '+f.id+'：'+f.result).join('\n')+'\n\n当前综合HTML `'+artifact.file+'`；401对象（165单位）、365个UI状态，实际目录计数见 `'+file+'`。虫卵转化原生空子单位列表限制在说明中明示。Current保持，未提交/推送/发布，V04未启动。\n');
const plan='docs/project/T01_FEEDBACK_REPAIR_PLAN_20261026.md';await fs.writeFile(plan,(await fs.readFile(plan,'utf8')).replace('状态：检查完成，方案待实施。本次只检查和形成方案；正式游戏源码、正常构建、r27综合检测HTML及Current未改。','状态：用户批准后已实施，正式源码、正常构建与r29综合HTML已同步；工程检查通过，用户画面与试听待确认。交付记录：`reports/qa/t01-feedback-repairs-20261026.json`。下方检查结论及拟实施措辞保留为实施前依据；Current保持。'));
await fs.writeFile('AGENTS.md','## T01八项反馈修复交付 · 2026-10-26\n\n- '+summary+'\n- 当前 `'+artifact.file+'`；结论 `'+file+'`。401对象（165单位）、365个UI状态；本批9份正式源码变更，无伤害/冷却/掉落/装备机制变更。虫卵转化原生空子单位列表限制已明示，未伪造特效。\n- 看板213，下一项仍T01。Current与原始资源保持，未提交/推送/发布；本批临时产物及旧HTML按保留规则清理。\n\n'+await fs.readFile('AGENTS.md','utf8'));
console.log(JSON.stringify({report:file,board:213,delivery:artifact.file,tests:111,equipment:3312,offlineCases:30,production:production.length,mechanics}));
