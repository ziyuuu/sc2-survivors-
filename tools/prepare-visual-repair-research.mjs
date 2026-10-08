// Local, disposable investigation harness. Production renderer/resources remain read-only.
// Reuses the precise earlier experiment, pinned by commit, against the current source tree.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.cwd(),out='reports/local/visual-repair-research-20261008';
const pin='df98ae7fbe0470bdfe9086de4031d796f00d2e9f';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:20e6}).trim();
await fs.mkdir(out,{recursive:true});
const provenance=[];
for(const name of ['index.html','lab.ts','source-materials.ts','shadows-ao.ts','lighting.ts','source-semantics.json']){
 const old=git('show',pin+':preview/visual-restoration-20261006/'+name);
 let code=old.replaceAll('../../src/','../../../src/').replaceAll('visual-restoration-20261006','visual-repair-research-20261008');
 if(name==='index.html')code=code.replace('前三项渲染恢复 · 对照实验','地图 单位 特效修复调研').replace('<option value="B">','<option value="NB">诊断 · 关闭 Bloom</option><option value="DR">诊断 · 直接输出路径</option><option value="ZD">诊断 · 隔离狂热者死亡模型</option><option value="FX0">诊断 · 隐藏透明层</option><option value="MN">诊断 · 平坦地表法线</option><option value="FL">诊断 · 完整网格</option><option value="B">');
 if(name==='lab.ts'){
  code=code.replace("const scenes=[","const scenes=[...[12,36,90,330].map(t=>[`death-protoss-0-${t}`,`神族普通单位实际死亡 ${t}/60秒`]),...['terran','zerg','protoss'].flatMap(r=>[0,1].flatMap(g=>[0,12,36,90].map(t=>[`fx-${r}-${g}-${t}`,`${r} 第${g+1}组实际交战 ${t}/60秒`]))),");
  code=code.replace("source.setEnabled(value!=='A')","source.setEnabled(['B','C','CAO','D','DP','E'].includes(value))");
  code=code.replace("const profile=await", "const investigation=await(await fetch('./baseline.json')).json();\n const profile=await");
  code=code.replace("const fixtureUrl=", "const deathMatch=sceneId.match(/^death-protoss-([01])-(\\d+)$/),fxMatch=sceneId.match(/^fx-(terran|zerg|protoss)-([01])-(\\d+)$/)??(deathMatch?['','protoss',deathMatch[1],deathMatch[2]]:null),fixtureId=fxMatch?`units-${fxMatch[1]}-${fxMatch[2]}`:sceneId;\n const fixtureUrl=").replace("+sceneId+'.json'", "+fixtureId+'.json'");
  code=code.replace(",baselineState=fingerprint();", ";let baselineState=fingerprint();");
  code=code.replace("const source=new SourceMaterialTrial",`const replay={ticks:0,casts:[] as {hero:string;accepted:boolean}[],method:'No simulation replay'};
 if(fxMatch){
  replay.method='Synthetic high-health targets, actual World casts and exact 60Hz World.step/render before freezing. No saved-event reinjection.';
  const allies=[...world.entities.values()].filter(u=>u.owner==='terran');
  for(const [i,u] of allies.entries()){const target=world.addUnit(i%2?'mutalisk':'roach','zerg',u.x+2.5,u.z+.3);target.hp=target.maxHp=2e6;target.moveSpeed=0;target.nextShotAt=target.specialReady=1e9;}
  await r.ensureUnitVariant('roach','roach');await r.ensureUnitVariant('mutalisk','mutalisk');
  world.hash.rebuild(world.entities.values());world.paused=false;
  if(deathMatch){replay.method='Diagnostic lethal incoming damage through World.hit, actual World.step/render before freezing; no death event injection';for(const u of allies.filter(u=>!u.heroId))world.hit(u,1e7,[],1,'zerg');}
  else for(const id of world.heroes.keys())replay.casts.push({hero:id,accepted:world.castHero(id)});
  replay.ticks=Number(fxMatch[3]);r.render(0,1);
  for(let i=0;i<replay.ticks;i++){world.step();r.render(1/60,1);if(r.assetsPending)await r.waitForPendingAssets();}
  world.paused=true;baselineState=fingerprint();
 }
 const source=new SourceMaterialTrial`);
  code=code.replace("scene:sceneId,fixture:","investigation,replay,scene:sceneId,fixture:");
  code=code.replace("source.update(world);shadow.beforeDraw();",`source.update(world);shadow.beforeDraw();
  const savedVisible:THREE.Object3D[]=[],ground=r.scene.getObjectByName('campaign-traversable-ground') as THREE.Mesh;
  const groundMaterial=ground?.material as THREE.MeshStandardMaterial,normalScale=groundMaterial?.normalScale?.clone();
  const baseBloom=(r as any).heroComposer.passes.find((p:any)=>p instanceof UnrealBloomPass);
  if(baseBloom)baseBloom.enabled=activeMode!=='NB';
  if(activeMode==='MN')groundMaterial.normalScale.set(0,0);
  if(activeMode==='FL')for(const b of r.gpu.values())b.setLod(false);
  if(activeMode==='ZD')for(const n of r.gpu.get('zealot.death')?.meshes??[]){if(n.visible){savedVisible.push(n);n.visible=false;}}
  if(activeMode==='FX0')r.scene.traverse(n=>{if(n instanceof THREE.Mesh&&n.visible&&(Array.isArray(n.material)?n.material:[n.material]).some(m=>m.transparent)){savedVisible.push(n);n.visible=false;}});
  try{`);
  code=code.replace("else baselineDraw();\n };", "else if(activeMode==='DR')r.renderer.render(r.scene,r.camera);else baselineDraw();}finally{for(const n of savedVisible)n.visible=true;if(normalScale)groundMaterial.normalScale.copy(normalScale);}\n };");
  code=code.replace("ao:{enabled:aoEnabled", "runtime:r.report(),eventSnapshot:world.visualEvents.map(e=>({kind:e.kind,time:e.time,heroId:e.heroId,entityId:e.entityId})),lights:r.scene.children.filter(n=>n instanceof THREE.Light).map(n=>({type:n.type,intensity:(n as THREE.Light).intensity})),ao:{enabled:aoEnabled");
 }
 await fs.writeFile(path.join(out,name),code+'\n');provenance.push({name,originalSha256:sha(old),derivedSha256:sha(code+'\n')});
}
const original=git('show',pin+':tools/prepare-visual-restoration.mts');
await fs.writeFile(path.join(out,'prepare.mts'),original.replaceAll("'../src/","'../../../src/").replaceAll('visual-restoration-20261006','visual-repair-research-20261008'));
const head=git('rev-parse','HEAD'),baseline=git('rev-parse','main');
const baselineData={date:'2026-10-08',head,baseline,pinnedExperiment:pin,method:'Fresh current-main source harness. Diagnostic switches do not modify production files, assets or saved simulation state. Historical screenshots are not relabeled.',provenance};
await fs.writeFile(path.join(out,'baseline.json'),JSON.stringify(baselineData,null,2));
await fs.writeFile(path.join(out,'tsconfig.json'),JSON.stringify({extends:'../../../tsconfig.json',compilerOptions:{allowImportingTsExtensions:true},include:['./*.ts','../../../src/**/*.ts'],exclude:[]}));
if(!await fs.stat(path.join(out,'fixtures.json')).catch(()=>null))process.stdout.write(execFileSync(process.execPath,['--import','tsx',path.join(out,'prepare.mts')],{cwd:root,encoding:'utf8',maxBuffer:5e6}));
console.log('Prepared '+out);
