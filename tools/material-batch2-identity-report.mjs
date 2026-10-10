import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {identities,groups} from '../preview/visual-plan-validation-20261009/catalog.ts';
import {ELITE_VISUAL_PROFILES} from '../src/data/elite-visual-profiles.ts';
import {UNIT_MATERIAL_CATALOG} from '../src/render/materials/unit-material-catalog.ts';
import {ELITES} from '../src/data/elites.ts';
const root='reports/local/material-batch2-20261010';
const eliteRows=JSON.parse(await fs.readFile(root+'/elite-identity-map.json','utf8'));
const settledGroups=new Set(['zergling','baneling','roach','ravager','hydralisk','lurker','mutalisk','corruptor','ultralisk','zealot','heroes-terran-1','heroes-zerg-0','heroes-zerg-1','heroes-protoss-0']);
const settledIdentities=new Set(groups.filter(g=>settledGroups.has(g.id)).flatMap(g=>g.identities.map(i=>i.id)));
const rows=identities.map(identity=>{
 const settled=settledIdentities.has(identity.id);
 const profile=UNIT_MATERIAL_CATALOG[identity.model],elite=identity.elite&&ELITE_VISUAL_PROFILES[identity.elite];assert.ok(profile,identity.id);
 return {...identity,source:profile.source,sourceSha256:profile.sourceSha256,glbSha256:profile.glbSha256,materialCount:profile.materials.length,clips:profile.clips.length,externalAnimationSources:profile.animationSources,
  changes:['Original material channels and animation clocks','Texture-preserving hit feedback',...(elite?['Original team-mask palette','Approved family-relative scale','Unified body/weapon/corpse/form resolver']:[])],
  elite:elite?eliteRows.find(r=>r.id===identity.elite):null,mechanism:identity.elite?ELITES[identity.elite].description:null,
  fixed:profile.materials.filter(m=>m.geometryVisible===false).map(m=>'Honor source hidden surface '+m.index+' '+m.name),
  sourceGaps:identity.family==='science_vessel'?['Historical Science Vessel effect-source gaps remain open; available body material is restored']:[],
  humanJudgment:['Rarity and silhouette readability at battle distance','Shimmer and fine detail during natural play','Matched original-client fidelity',...(identity.family==='science_vessel'&&elite?['The retained original special body is hologram_skin_sciencevessel.m3; its orange Fresnel/screen-space material is authored appearance, not an active skill indicator']:[])],
  evidence:{beforeNear:(settled?'before-settled-r1':'before-r9-portraits')+'/'+identity.id+'-near.png',afterNear:(settled?'after-settled-r1':'after-r9-portraits')+'/'+identity.id+'-near.png',beforeMaps:settled?'before-settled-r1':'before-maps-r1',afterMaps:settled?'after-settled-r1':'after-r7-maps',beforeMobile:settled?'before-settled-r1':'before-mobile-r1',afterMobile:settled?'after-settled-r1':'after-r7-mobile',actions:'after-r7-actions/results.json',...(settled?{frameNote:'Native 300 ticks after spawning; Birth poses can be underground or curled. Earlier spawn-frame captures remain as superseded evidence.'}:{})}};
});assert.equal(rows.length,138);
await fs.writeFile(root+'/identity-repairs.json',JSON.stringify({baseline:'b56201c',identities:rows},null,2));
const lines=['# 第二批逐身份修复表','', '覆盖 30 普通、90 精英、18 英雄。所有原身体 GLB 保留；材质与状态绑定共用正式渲染器。静态截图不关闭人工视觉判断。','', '|身份|名称|类别|实际模型|表面数|显示倍率／状态|来源缺口|','|---|---|---|---|---:|---|---|'];
for(const r of rows)lines.push(`|${r.id}|${r.name}|${r.kind}|${r.model}|${r.materialCount}|${r.elite?`地面 ${r.elite.groundScale} / 飞行 1.15；${r.elite.activity}`:'原尺寸；源材质轨道'}|${r.sourceGaps.length?'历史特效源缺口保留':'本模型材质描述已绑定；仍需人工观感验收'}|`);
lines.push('','机器可读明细：`reports/local/material-batch2-20261010/identity-repairs.json`；90 精英的真实机制、队色区域、发光表面及原有效果触发文件：`elite-identity-map.json`。','');
await fs.writeFile('docs/project/MATERIAL_BATCH2_IDENTITIES_20261010.md',lines.join('\n'));
await fs.writeFile('reports/qa/material-batch2-identities-20261010.json',JSON.stringify({baseline:'b56201c',identities:rows},null,2)+'\n');
console.log(JSON.stringify({identities:rows.length,ordinary:rows.filter(r=>r.kind==='ordinary').length,elite:rows.filter(r=>r.kind==='elite').length,hero:rows.filter(r=>r.kind==='hero').length}));
