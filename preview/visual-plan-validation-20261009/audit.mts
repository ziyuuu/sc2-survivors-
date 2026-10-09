import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {ASSETS} from '../../src/assets/manifest';
import {identities,groups,modeGroups,themes} from './catalog';
import {scenario,prepareTargets,prepareCastTargets,activateMode} from './scenario';
import {encodeGraph,checksum} from '../../src/persistence/graph-codec';
import {World} from '../../src/simulation/world';
import {modelPresentationScale,modelPresentationAccent} from '../../src/data/combat-presentation';
const out=process.argv[2]??'D:/星际/reports/local/visual-plan-validation-20261009';
await fs.mkdir(out,{recursive:true});
const sha=(b:any)=>createHash('sha256').update(b).digest('hex');
const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8',maxBuffer:20e6}).trim();
const models:any[]=[],files:any[]=[],failures:any[]=[];
for(const a of ASSETS.values()){
 if(a.status!=='available')continue;
 const file=path.resolve('public',a.url.replace(/^\//,''));let b:Buffer;
 try{b=await fs.readFile(file);}catch(error){failures.push({kind:'missing-resource',id:a.id,error:String(error)});continue;}
 files.push({id:a.id,path:file,bytes:b.length,sha256:sha(b)});
 if(!a.id.startsWith('model.')||!a.url.endsWith('.glb'))continue;
 const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
 models.push({id:a.id,bytes:b.length,sha256:sha(b),source:j.asset?.extras,clips:(j.animations??[]).map((c:any)=>c.name),materials:(j.materials??[]).map((m:any)=>({name:m.name,role:m.extras?.sc2?.role,blend:m.extras?.sc2?.blend,diffuse:!!m.pbrMetallicRoughness?.baseColorTexture,normal:!!m.normalTexture,emissive:!!m.emissiveTexture,unlit:!!m.extensions?.KHR_materials_unlit,specular:!!m.extensions?.KHR_materials_specular,roughness:m.pbrMetallicRoughness?.roughnessFactor,metalness:m.pbrMetallicRoughness?.metallicFactor,auxLayers:m.extras?.sc2?.layers??[]})),primitives:(j.meshes??[]).flatMap((m:any)=>m.primitives).map((p:any)=>({normal:p.attributes.NORMAL!==undefined,tangent:p.attributes.TANGENT!==undefined,material:p.material}))});
}
const catalog=identities.map(i=>({...i,asset:ASSETS.get('model.'+i.model)?.url,death:ASSETS.has('model.'+i.model+'.death')?i.model+'.death':ASSETS.has('model.'+i.family+'.death')?i.family+'.death':null,sharedWith:identities.filter(j=>j.id!==i.id&&j.model===i.model).map(j=>j.id)}));
assert.equal(catalog.filter(i=>i.kind==='ordinary').length,30);assert.equal(catalog.filter(i=>i.kind==='elite').length,90);assert.equal(catalog.filter(i=>i.kind==='hero').length,18);
assert.equal(new Set(catalog.map(i=>i.id)).size,138);assert.ok(catalog.every(i=>i.asset));
const ranks:any[]=[],placements:any[]=[],replays:any[]=[],forms:any[]=[];
for(const rank of [1,2,3,4,5])for(const g of groups){
 const s=scenario(g,'industrial',rank);
 for(const x of s.subjects){const u=x.entity;ranks.push({id:x.identity.id,rank,model:u.modelKey??u.unitType,scale:modelPresentationScale(u),accent:modelPresentationAccent(u),hp:u.maxHp,shield:u.maxShield??0,radius:u.unitRadius});}
}
for(const theme of themes)for(const g of groups){
 const s=scenario(g,theme,5);
 for(const x of s.subjects)placements.push({id:x.identity.id,theme,x:x.entity.x,z:x.entity.z,flying:x.entity.flying,canOccupy:x.entity.flying||s.world.terrain!.canOccupy(x.entity,x.entity.unitRadius)});
}
for(const g of [...groups,...modeGroups]){
 const s=scenario(g),w=s.world,initial=w.captureRun(),copy=new World({race:g.race});
 copy.restoreRun(initial);const restored=checksum(JSON.stringify(encodeGraph(copy.captureRun())))===checksum(JSON.stringify(encodeGraph(initial)));
 const targets=prepareTargets(s),events=new Map<number,Set<string>>(),children=new Map<string,any>();w.paused=false;const move=w.issueMove({x:0,z:4});
 for(let i=0;i<60;i++)w.step();
 const moved=s.subjects.map(x=>({id:x.identity.id,distance:Math.hypot(x.entity.x-x.initial.x,x.entity.z-x.initial.z)}));
 w.cancelOrder();prepareCastTargets(s);const mode=activateMode(s);
 const casts=s.subjects.filter(x=>x.identity.hero).map(x=>({id:x.identity.id,accepted:w.castHero(x.identity.hero!,{ground:[{x:-100,z:-100},{x:100,z:-100},{x:100,z:100},{x:-100,z:100}],air:[{x:-100,z:-100},{x:100,z:-100},{x:100,z:100},{x:-100,z:100}],occludedGround:[],occludedAir:[]}),viewMethod:"synthetic square for Node only; browser uses actual camera/canvas"}));
 for(let i=0;i<360;i++){
  w.step();
  for(const e of w.visualEvents){const kinds=events.get(e.entityId)??new Set<string>();kinds.add(e.kind);events.set(e.entityId,kinds);}
  for(const u of w.entities.values())if(u.summonKind||u.temporaryKind)children.set(String(u.id),{id:u.id,type:u.unitType,model:u.modelKey,kind:u.summonKind??u.temporaryKind,parent:u.summonOwnerId});
 }
 const rows=s.subjects.map(x=>({id:x.identity.id,alive:x.entity.hp>0,shots:x.entity.shotSequence??0,events:[...events.get(x.entity.id)??[]],mode:x.entity.nativeMode??x.entity.mode,model:x.entity.modelKey??x.entity.unitType,position:{x:x.entity.x,z:x.entity.z}}));
 for(const x of s.subjects)w.hit(x.entity,1e8,[],1,'zerg',0,1,undefined,true);
 for(let i=0;i<360;i++)w.step();
 const death=s.subjects.map(x=>({id:x.identity.id,dead:x.entity.hp<=0,deadAt:x.entity.deadAt,remaining:w.entities.has(x.entity.id)}));
 const row={group:g.id,restored,move,moved,mode,casts,subjects:rows,children:[...children.values()],death,phase:w.phase,time:w.time,stats:w.stats};replays.push(row);if(g.modeFamily)forms.push(row);
 console.log(g.id+': '+rows.length+' identities, '+rows.filter(r=>r.shots>0).length+' fired, '+children.size+' children');
}
const head=git('rev-parse','HEAD'),identityAssets=new Set(catalog.flatMap(i=>[i.model,i.death].filter(Boolean)).map(x=>'model.'+x));
const risks=models.flatMap(m=>m.materials.filter((x:any)=>x.unlit&&!x.diffuse&&x.emissive||x.unlit&&x.specular).map((x:any)=>({model:m.id,material:x.name,emissiveOnlyUnlit:x.unlit&&!x.diffuse&&x.emissive,illegalExtensionCombination:x.unlit&&x.specular})));
const release=JSON.parse(await fs.readFile('D:/星际/deploy/coze/public/web-release.json','utf8')),manifest=JSON.parse(await fs.readFile(path.join('D:/星际/deploy/coze/public',release.manifest),'utf8'));
const mismatches=files.filter(f=>!manifest.assets[f.id]||manifest.assets[f.id].sha256!==f.sha256||manifest.assets[f.id].bytes!==f.bytes).map(f=>f.id);
const protectedPaths=git('ls-files','src','tools','public','deploy').split('\n').filter(Boolean),sourceFiles=[];
for(const file of protectedPaths){try{sourceFiles.push({file,sha256:sha(await fs.readFile(file))});}catch{}}
const result={head,method:'Current-source diagnostic all-identity/rank/map/resource inventory and native event replays; no rendered-image acceptance inferred from this Node audit. Fixture positions/targets are synthetic; no natural campaign acceptance.',counts:{identities:catalog.length,ordinary:30,elites:90,heroes:18,ranks:ranks.length,placements:placements.length,groups:groups.length,modes:modeGroups.length,resourceRecords:files.length,models:models.length},catalog,ranks,placements,replays,forms,models,risks,unassignedModelAssets:models.filter(m=>!identityAssets.has(m.id)).map(m=>m.id),release:{build:release.appBuildId,release:release.release,mismatches},files,failures};
await fs.writeFile(path.join(out,'inventory.json'),JSON.stringify(result,null,2));await fs.writeFile(path.join(out,'protected-baseline.json'),JSON.stringify({head,files:sourceFiles},null,2));
await fs.writeFile('preview/visual-plan-validation-20261009/baseline.json',JSON.stringify({head,sourceDigest:sha(JSON.stringify(sourceFiles)),counts:result.counts,release:result.release},null,2));
assert.equal(mismatches.length,0);assert.equal(failures.length,0);assert.ok(placements.every(p=>p.canOccupy));assert.ok(replays.every(r=>r.restored));assert.ok(replays.flatMap(r=>r.casts).every(c=>c.accepted));assert.ok(replays.every(r=>r.death.every((x:any)=>x.dead)));
console.log(JSON.stringify({counts:result.counts,risks:risks.length,unassigned:result.unassignedModelAssets,missing:failures.length,releaseMismatches:mismatches}));
