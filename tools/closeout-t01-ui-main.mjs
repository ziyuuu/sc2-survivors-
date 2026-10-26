import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const cache='.cache/t01-ui-main-20261025',base='reports/local/t01-20261024',reportPath='reports/qa/t01-ui-main-20261025.json';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
const sha=b=>createHash('sha256').update(b).digest('hex');
const hash=async file=>{const h=createHash('sha256');for await(const bytes of createReadStream(file))h.update(bytes);return h.digest('hex');};
const native=await read(cache+'/qa-native/report.json'),offline=await read(cache+'/qa-offline/report.json'),exported=await read('.cache/t01-set-layout-20261025/prototype-export/report.json');
for(const r of [native,offline]){assert.equal(r.pass,true);assert.equal(r.checks.length,33);assert.deepEqual(r.errors,[]);assert.deepEqual(r.consoleErrors,[]);assert.deepEqual(r.http,[]);}assert.equal(exported.complete,true);assert.deepEqual(exported.failures,[]);
const pack=await read(base+'/offline-r16/build.json'),oldPack=await read(base+'/offline-r15/build.json'),build=await read(base+'/build.json'),artifact=pack.artifacts[0];
assert.equal(await hash(artifact.file),artifact.sha256);assert.equal(offline.htmlSha256,artifact.sha256);assert.equal(artifact.payloadSha256,oldPack.artifacts[0].payloadSha256);
const baseline=await read(cache+'/baseline.json'),changed=[];for(const f of baseline)if(await hash(f.file)!==f.sha256)changed.push(f.file.replaceAll('\\','/'));
assert.deepEqual(changed.sort(),['src/ui/starship/effect-text.ts','src/ui/starship/equipment-description.ts','src/ui/starship/legacy-view.ts','test/equipment-set-description.test.ts']);
for(const f of build.inputs)assert.equal(await hash(f.file),f.sha256,f.file);
const templates=(await read('tools/t01/prototype.generated.json')).templates,oldTemplates=await read(cache+'/template-baseline.json'),reused=oldTemplates.filter(t=>!['starship','ship-operation','backpack','settlement'].includes(t.action));for(const t of reused)assert.equal(sha(JSON.stringify(templates.find(n=>n.id===t.id))),t.sha256,t.id);
const production=['src/ui/intermission-skin/presentation.ts','src/ui/native-hud/battle.css','src/ui/starship/effect-text.ts','src/ui/starship/equipment-description.ts','src/ui/starship/legacy-view.ts','src/ui/starship/native.css'];
const report={date:'2026-10-25',status:'verified-ui-update',authorization:'可以。就按这个更新。我的意思是，包括之前UI改动都更新到main并提交git。',
 changes:['装备详情、悬浮说明、效果汇总及换装预览显示具体英雄、精英和生产方向；单体专属与全队精英作用范围分开。','合并此前已确认UI：装备槽绝对定位；菜单隐藏战斗条；关间等级改为N级；五档品质底色与选中状态；套装按件数和品质分组、激活标记及独立规则/换装预览。'],
 delivery:{file:artifact.file,bytes:artifact.bytes,sha256:artifact.sha256,assets:artifact.assets,chunks:artifact.chunks},
 verification:{tests:60,uniqueConcreteIdentityTemplateCombinations:540,typecheck:true,toolTypecheck:true,isolatedMainPlusSelectedUi:{tests:60,typecheck:true,base:'5d0727a',note:'从main提取src/test及必要工具依赖，仅覆盖本次6份UI文件和针对测试；使用当前生成的runtime资源索引作为必要输入。重复运行不增加唯一测试数。'},nativeChecks:33,offlineChecks:33,races:3,viewportModes:3,http:0,pageErrors:0,consoleErrors:0,baselineFiles:baseline.length,unchangedSinceR15:baseline.length-changed.length,changedSinceR15:changed,buildInputs:build.inputs.length,embeddedResourcePayloadUnchanged:true,prototypePages:26,prototypeStates:templates.length,reusedUnrelatedTemplates:reused.length,prototypeBusinessLogic:false},
 reusedEvidence:['reports/qa/t01-equipment-ui-20261025.json','reports/qa/t01-set-layout-20261025.json'],
 git:{branch:'main',productionFiles:production,testFiles:['test/equipment-set-description.test.ts'],documentationFiles:['docs/project/T01_UI_MAIN_20261025.md',reportPath],scope:'Only approved UI source, regression tests and this focused record. Other pending render/combat changes, private assets, generated previews and historical artifact deletions are excluded.',remotePushRequested:false},
 resolvedAttempts:['隔离main类型检查初次缺少tools/backend及opening-vite-plugin依赖，补齐HEAD原文件后通过。','首轮离线加载时浏览器进程退出，未形成有效检查；同一HTML串行重试结果单独计入33项。'],
 retention:{cleanupPending:true,rule:'只保留当前综合HTML和必要输入；本批缓存、截图、隔离main测试副本及上一版HTML完成后删除。'},currentReplaced:false,publish:false,
 reproduce:['node --import tsx --test test/equipment-set-description.test.ts test/starship-ui-flow.test.ts test/fun-feedback-r4-interactions.test.ts test/g03-rank-equipment-growth.test.ts','npm run typecheck','node tools/export-t01-prototypes.mjs --refresh-equipment','node tools/qa-t01-set-controls.mjs native --identities','node tools/build-t01.mjs','node tools/build-t01-offline.mjs offline-rN','node tools/qa-t01-set-controls.mjs offline reports/local/t01-20261024/offline-rN/build.json --identities'],
 limits:['本次只处理UI，未更改套装数值、战斗、购买、存档或掉落机制。','T01动态与最终画面验收仍开放，不提前启动V04或通过最终V/MVP。']};
await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
await fs.writeFile('docs/project/T01_UI_MAIN_20261025.md','# T01 已确认 UI 更新 · 2026-10-25\n\n用户批准具体英雄／精英名称展示，并要求将此前 UI 改动一并提交 main。\n\n- 装备说明使用具体对象，例如“开局获得Ⅲ级雷诺”“雷诺最大生命 +50%”；群体加成仍明确显示全队精英或对应方向士兵。换装预览保留各效果原本的对象。\n- 收纳已批准的装备槽定位、菜单战斗条隐藏、中文等级、五档品质底色和套装效果分组。\n- 提交范围为 6 份 UI 源码、1 份针对测试及本说明／简要 QA 结论；其他待提交渲染／战斗改动及历史产物清理不纳入。\n\n60 项相关测试与类型检查通过；仅 main 基线加所选 UI 文件的隔离副本也通过同一 60 项测试和类型检查。540 种具体身份／装备模板描述核对；33 项原生与 33 项同版离线检查通过，HTTP、页面与控制台错误均为 0。既有 UI 检查按原结论复用，不重复累计。\n\n当前离线交付为 `'+artifact.file+'`，详情见 [简要 QA 结论](../../'+reportPath+')。本次不替换 Current，不发布；T01 最终画面与后续验收仍开放。\n');
const galleryPath='reports/qa/t01-gallery-20261025.json',gallery=await read(galleryPath);gallery.delivery=report.delivery;gallery.latestUiMain=reportPath;gallery.previousSetVerification=gallery.verification;gallery.verification=report.verification;gallery.catalogue.prototypeStates=templates.length;gallery.retention=report.retention;await fs.writeFile(galleryPath,JSON.stringify(gallery,null,2)+'\n');
console.log(JSON.stringify({ready:true,production,checks:[33,33],templates:templates.length,delivery:artifact.file}));
