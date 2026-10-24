import fs from 'node:fs';import assert from 'node:assert/strict';
import {scenario,mainFamily} from './lib/g02-fixtures.mts';
const root='reports/local/hero-matrix-20261023',rows=['easy','normal','hard','hell'].flatMap(d=>fs.readFileSync(root+'/'+d+'.ndjson','utf8').trim().split('\n').map(s=>JSON.parse(s))),proof:any[]=[];
const snap=(w:any)=>JSON.parse(JSON.stringify(w.allies().map((u:any)=>({id:u.id,hero:u.heroId,hp:u.hp,shield:u.shield,damage:u.weaponDamage,rank:u.rank}))));
for(const r of rows.filter(r=>r.hero&&r.members===4&&r.mode==='boss')){
 const {w}=scenario({race:r.race,quality:r.quality,stage:r.stage,seed:r.seed,family:r.race==='protoss'&&r.stage===6?'zealot':mainFamily(r.race,r.stage),members:4,rank:r.rank});w.difficulty=r.difficulty;(w as any).sandbox=false;w.prepareStage();w.autoWaves=false;w.eventPlan=[];w.phase='battle';w.updateProduction=()=>{};w.collectRewardDrop=()=>false;w.endStage=()=>{};
 const base=rows.find(b=>!b.hero&&b.difficulty===r.difficulty&&b.stage===r.stage&&b.quality===r.quality&&b.race===r.race&&b.mode==='boss')!;
 const before=snap(w);assert.deepEqual(before,base.initial);assert.ok(w.acquireHero(r.hero));const after=snap(w);assert.deepEqual(after,r.initial);
 for(const other of rows.filter(b=>b.hero===r.hero&&b.members===4&&b.difficulty===r.difficulty&&b.stage===r.stage&&b.quality===r.quality))assert.deepEqual(other.initial,after);
 const ordinary=after.filter((u:any)=>!u.hero);proof.push({difficulty:r.difficulty,stage:r.stage,quality:r.quality,hero:r.hero,name:r.name,baseExact:true,nativeAcquisitionExact:true,changedByNativeHero:JSON.stringify(ordinary)!==JSON.stringify(before),before,after:ordinary});
}
assert.equal(proof.length,432);fs.writeFileSync(root+'/pair-setup-proof.json',JSON.stringify({pass:true,uniqueSetups:432,pairedBattleRows:1296,baseBeforeHeroExact:true,afterNativeHeroExact:true,changedSetups:proof.filter(p=>p.changedByNativeHero).length,rows:proof},null,2));console.log('Pair setup verified',proof.filter(p=>p.changedByNativeHero).length,'native aura changes');
