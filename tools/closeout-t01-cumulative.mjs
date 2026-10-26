import fs from 'node:fs';
import {createReadStream} from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root='.cache/t01-closeout',base='reports/local/t01-20261024',file='reports/qa/t01-closeout-20261027.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
async function hash(p){const h=crypto.createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');}
const audio=read(root+'/browser/offline-browser.json'),cumulative=read('.cache/t01-feedback-repairs/browser/offline-browser.json'),normal=read('.cache/t01-audio/native-browser.json'),data=read(root+'/data-audit.json'),index=read(root+'/index-verification.json');
for(const r of [audio,cumulative,normal]){assert.ok(r.complete,r.failure);assert.deepEqual(r.errors,[]);assert.deepEqual(r.http,[]);}
assert.equal(audio.cases.length,22);assert.equal(audio.confirmedMovement.length,9);assert.equal(audio.voiceRotations.length,19);assert.equal(audio.loops.length,3);assert.equal(audio.decoded.originalDecoded,1921);
assert.equal(cumulative.cases.length,30);assert.equal(cumulative.loops.length,12);assert.equal(cumulative.layouts.length,3);assert.ok(cumulative.checks.includes('actual-export'));assert.equal(normal.audio.originalDecoded,1921);
const logs=['full-tests','host-tests','backend-host-tests'].map(n=>fs.readFileSync(root+'/'+n+'.log','utf8'));
assert.ok(/tests 2704/.test(logs[0])&&/pass 2697/.test(logs[0])&&/fail 7/.test(logs[0]));assert.ok(/pass 2/.test(logs[1])&&/fail 0/.test(logs[1]));assert.ok(/pass 14/.test(logs[2])&&/fail 0/.test(logs[2]));
assert.equal(fs.readFileSync(root+'/tool-typecheck-final.log','utf8').trim(),'');assert.ok(index.pass);
const build=read(base+'/build.json'),pack=read(base+'/offline-r33/build.json'),artifact=pack.artifacts[0];assert.equal(await hash(artifact.file),artifact.sha256);assert.equal(audio.htmlSha256,artifact.sha256);assert.equal(cumulative.htmlSha256,artifact.sha256);
for(const r of build.inputs)assert.equal(await hash(r.file),r.sha256,r.file);assert.equal(await hash(data.currentPreserved.file),data.currentPreserved.sha256);
assert.deepEqual(normal.release,read('dist/web/web-release.json'));
const summary='本次接入德哈卡实际行走脚步、跳虫/虫后群体移动声和兵营增援下降推进声，新增7个原声音库、12份原始音频，449个既有音库及153份模拟源码保持。此前批准的T01动作、特效、虫后腐蚀、声音、比例、死亡颜色、生命周期与检测工具累计修复一并纳入本地main收尾。2704唯一回归经环境复测全部通过，类型、资料一致性、正常构建及入口通过；r33离线22项音频/英雄场景、9项新移动声、19组对白轮换及30项累计反馈场景通过，12组各三轮、三尺寸、1921音频解码、实际信号、控制及导出通过，HTTP/页面错误0。';
const report={date:'2026-10-27',task:'T01',status:'engineering-verified-awaiting-local-integration',summary,
 authorization:'用户通过原聊天协调请求：接入已确认适用声音，将这几轮累计修复提交并合并main；不部署发布、不启动下一阶段、不擅自公开私有原始素材。',
 scopeDocument:'docs/project/T01_CLOSEOUT_20261027.md',audio:{...data,newOriginalFiles:read(root+'/audio-preparation.json').addedOriginals.length},
 validation:{uniqueTests:{total:2704,passed:2704,unresolvedFailures:0,initial:{passed:2697,failed:7},environmentRecovery:'7项初次失败均属于localhost网络权限；2项Coze测试与14项P5后端组在宿主环境复测通过，按2704唯一用例计数，不叠加重复用例。'},productionTypecheck:true,browserToolTypecheck:true,documentationDataCheck:true,webBuild:true,
 offlineAudio:{cases:22,confirmedMovement:audio.confirmedMovement,voiceRotations:audio.voiceRotations,defaultLoops:3,decoded:1921,checks:audio.checks,errors:0,httpRequests:0},
 offlineCumulative:{cases:cumulative.cases.map(x=>({id:x.id,kind:x.kind})),threeCycleGroups:12,viewports:cumulative.layouts.map(x=>({width:x.width,height:x.height})),checks:cumulative.checks,errors:0,httpRequests:0},
 normalGame:{checks:normal.checks,decoded:normal.audio.originalDecoded,errors:0,httpErrors:0},build:{inputs:build.inputs.length,assets:build.assetCount,resourceFiles:build.resources.length,hashesVerified:true},index:{verified:true,buildInputs:index.verifiedBuildInputs,resourceFiles:index.stagedResourceFiles,resourceBytes:index.stagedResourceBytes,runtimeReferences:index.runtimeReferences,privateOriginalsStaged:0},
 visualReview:'有限复看德哈卡、兵营下降、跳虫群体声音夹具、狂热者攻击及召回幻影画面；不代替用户全目录动态验收或逐句听感。',
 recoveries:['旧模拟声音替身没有音源字段：音高更新限定到明确提供rate的群体通道，完整回归通过。','首次音频准备比较包括工具专用source注释，改为运行数据比较后原路由保持。','浏览器启动与本机网络在沙箱下受限，宿主实测通过。','索引检查误要求提交npm依赖文件，改为核验已提交锁文件、安装版本及实测文件SHA。','Git Bash post-checkout资源不足，已直接执行同一Git LFS钩子逻辑完成。','GitHub连接器末次查询连接失败，只读git ls-remote成功核实远端。'],
 formattingWarnings:'git diff --cached --check仅报告8处既有新增文件末尾空行；保持实测构建输入，不为了格式重写或冒充重新验证。'},
 catalogue:audio.counts,delivery:artifact,formalBuild:normal.release,preservation:{current:data.currentPreserved,currentReplaced:false,simulationFilesUnchangedThisTurn:153,priorBanksUnchanged:449,unrelatedBranchesPreserved:true},
 git:{base:'f8e3a32ebb8741401f1d1e4fbf100d5ffe48c92d',branch:'codex/t01-closeout-20261027',localMainIntegration:'pending',remoteMain:'5d0727a14ec18656b408be457263adb1b17b21fc',remoteCheckedVia:'git ls-remote origin refs/heads/main',pushed:false,published:false,privateOriginalsUploaded:false},
 limits:['Marine群体行军与普通坦克移动声仍未取得可靠战斗绑定；不使用剧情模型、指令回应或变形声冒充。','群体音效使用原版节点/权重/门槛/分层和速度范围，空间聚类是浏览器适配，不声称SC2引擎算法完全一致。','当前源码/离线构建回归已完成；人工逐句试听、全量视觉体验、T01最终验收与最终V/MVP仍开放；V04未启动。','没有远端推送、部署或真实生产服务验证。'],
 reproduce:['node tools/start-t01-closeout.mjs','node tools/prepare-t01-closeout-audio.mjs','python tools/prepare-combat-audio.py','node --import tsx --test --test-concurrency=4 test/*.test.mjs test/*.test.ts','npm run typecheck','node node_modules/typescript/bin/tsc -p tools/tsconfig-t01-closeout.json','npm run docs:check','npm run build:web','node tools/stage-t01-effect-assets.mjs','node tools/build-t01.mjs','node tools/build-t01-offline.mjs offline-rN','node tools/verify-t01-motion-audio.mjs --confirmed --offline=<最新综合HTML>','node tools/verify-t01-feedback-repairs.mjs --offline=<最新综合HTML>','node tools/verify-t01-audio-native.mjs','node tools/audit-t01-closeout.mjs'],retention:{cleanupPending:true,rule:'保留当前r33与必要输入、正常构建、源码及原始资源；清理本批缓存/截图/详细日志及r32。'},boardRevision:216};
write(file,report);pack.offlineVerified=true;pack.verification=file;write(base+'/offline-r33/build.json',pack);
const board=read('docs/project/performance-board.json');assert.equal(board.revision,215);board.revision=216;board.updated=report.date;board.next='T01';const task=board.tasks.find(t=>t.id==='T01');task.status='待验证';task.updated=report.date;task.result=summary+'T01画面与听感仍待用户确认；本地Git收尾见本批报告。';task.evidence.push('../../'+file);board.updates.push({date:report.date,tasks:['T01'],change:task.result,evidence:['../../'+file]});write('docs/project/performance-board.json',board);execFileSync(process.execPath,['tools/render-performance-board.mjs']);
fs.writeFileSync('AGENTS.md','## T01累计修复与新增原声收尾 · 2026-10-27\n\n- '+summary+'\n- 当前 `'+artifact.file+'`，结论 `'+file+'`，范围 `docs/project/T01_CLOSEOUT_20261027.md`。本地Git收尾状态以报告为准；远端main仍5d0727a，未推送/发布。\n- 看板216，下一项仍T01；人工画面与听感待确认，V04未启动。Current、原始资源及无关分支保持；临时产物按保留规则清理。\n\n'+fs.readFileSync('AGENTS.md','utf8'));
const doc='docs/project/T01_CLOSEOUT_20261027.md';fs.writeFileSync(doc,fs.readFileSync(doc,'utf8').replace('实施中。最终结果将补充实际运行结果、当前综合 HTML、本地 main 与远端 commit、仍开放的人工作品验收；旧报告仅作范围证据，不代替本次验证。',summary+'\n\n当前离线交付 `'+artifact.file+'`；完整实测、失败恢复、保留边界及Git状态见 `'+file+'`。本地main提交后核验；远端main已只读确认仍为 `5d0727a14ec18656b408be457263adb1b17b21fc`，未推送。T01人工画面与听感验收保持开放。'));
console.log(JSON.stringify({report:file,board:216,tests:2704,audioCases:22,movementCases:9,cumulativeCases:30}));
