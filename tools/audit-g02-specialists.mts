import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {scenario,buy,lcg} from './lib/g02-fixtures.mts';
import {observeWorld} from '../src/simulation/observation';
import {castTactical} from '../src/simulation/combat/unique-support';
import {tickShopSupport} from '../src/simulation/combat/shop-support';
const rows:any[]=[];
for(const quality of [0,3,4,5] as const)for(const race of ['terran','zerg','protoss'] as const){
 const ids=['mines',...(race==='zerg'?['parasite','hatch','consume','evolve']:race==='protoss'?['reserve','counter']:[])];
 for(const kind of ids){
  const {w,gear,loadout}=scenario({race,quality,stage:15,seed:102202,members:4,rank:3}),receipt=buy(w,'support.'+race+'.'+kind);assert.ok(receipt,kind);w.phase='battle';w.random=lcg(102202);const u=w.allies()[0],bySource:Record<string,Record<string,number>>={};observeWorld(w,(s,k,n)=>{const v=bySource[s]??={};v[k]=(v[k]??0)+n;});
  const enemy=(x=0,z=2,hp=1e6)=>{const e=w.addUnit('roach','zerg',x,z);e.hp=e.maxHp=hp;e.armor=0;e.weaponDamage=0;e.moveSpeed=0;e.stoppedUntil=1e9;w.hash.rebuild(w.entities.values());return e;};
  const steps=(seconds:number)=>{const end=w.time+seconds;while(w.time<end-1e-8&&w.phase==='battle')w.step();};let details:any={};
  if(kind==='mines'){
   tickShopSupport(w);const mines=[...w.expedition.support.mines];assert.equal(mines.length,6);const victims=[];
   for(const mine of mines){w.anchor={...mine.point};for(const a of w.allies()){a.x=mine.point.x;a.z=mine.point.z+5;}victims.push(enemy(mine.point.x,mine.point.z));for(let n=0;n<180&&w.expedition.support.mines.some(m=>m.id===mine.id);n++){w.time+=1/60;tickShopSupport(w);}}
   assert.equal(w.expedition.support.mines.length,0);details={nativeMineCount:mines.length,remaining:0,damage:bySource[race+'.mines']?.damage,method:'Native random mine placements, controlled anchor and enemy contact at each placement; support clock advanced, not a natural encounter-rate estimate'};
  }else if(kind==='evolve'){
   for(const a of w.allies())a.hp=a.maxHp*.1;const before=w.allies().map(a=>({hp:a.hp,maxHp:a.maxHp,armor:a.armor}));assert.ok(castTactical(w));const after=w.allies().map(a=>({hp:a.hp,maxHp:a.maxHp,armor:a.armor}));steps(8.1);details={before,after,activeEnded:w.expedition.support.unique.activeUntil===0,cooldown:w.expedition.support.unique.ready};
  }else if(kind==='reserve'){
   const shield=u.maxShield!;u.shield=shield;u.lastDamagedAt=-100;steps(10);const stored=w.expedition.support.unique.reserves[u.id]?.amount??0;assert.ok(stored>0);const hp=u.hp,shieldBefore=u.shield;w.hit(u,100,[],1,'zerg');details={stored,maxShield:shield,hpBefore:hp,hpAfter:u.hp,shieldBefore,shieldAfter:u.shield,reserveAfter:w.expedition.support.unique.reserves[u.id]?.amount};
  }else if(kind==='counter'){
   const e=enemy(u.x,u.z+1);u.shield=1;w.hit(u,100,[],1,'zerg');details={targetDamage:e.maxHp-e.hp,bySource:bySource['protoss.counter'],nextReady:w.expedition.support.unique.counterReady[u.id]};assert.ok((bySource['protoss.counter']?.damage??0)>0);
  }else if(kind==='parasite'){
   const v=enemy(0,2),near=enemy(.8,2);u.cooldown=0;w.fire(u,v);steps(.5);const mark=structuredClone(w.expedition.support.unique.parasites[v.id]??null);assert.ok(mark);w.hit(v,1e8,[],1,'terran',0,1,u.id);const markedDamage=bySource['zerg.parasite']?.damage??0;assert.ok(markedDamage>0);const one=enemy(0,2,1);u.cooldown=0;w.fire(u,one);steps(.5);details={mark,markedDamage,oneHitKilled:one.hp<=0,oneHitMarked:!!w.expedition.support.unique.parasites[one.id],nearHp:near.hp,method:'Real primary shot marks a durable target, then controlled lethal hit; one-HP target separately checks instant-kill behavior'};
  }else{
   for(const a of w.allies())a.hp=a.maxHp*.1;const targets=[enemy(0,3),enemy(1,3)];let peak=0;const counts=[];
   for(let wave=0;wave<2;wave++){for(let i=0;i<12;i++){const e=enemy((i%4)*.2,1,1);w.hit(e,1000,[],1,'terran',0,1,u.id);}steps(3.1);const count=w.allies().filter(a=>a.temporaryKind==='fun-brood').length;counts.push(count);peak=Math.max(peak,count);}
   steps(13);details={killStimulus:24,counts,peak,temporaryRemaining:w.allies().filter(a=>a.temporaryKind==='fun-brood').length,damage:bySource['zerg.hatch']?.damage??0,healing:bySource['zerg.consume']?.healed??0,method:'Two controlled 12-kill stimuli, native production, actual movement/attacks/healing and full lifetime. Not natural kill frequency'};assert.ok(kind==='hatch'?peak===4&&details.temporaryRemaining===0:details.healing>0);
  }
  rows.push({race,quality,kind,gear,loadout,receipt,seconds:w.time,details,bySource});
 }
}
await fs.writeFile('reports/local/g02-20261022/specialists-r3.json',JSON.stringify({rows},null,2));console.log(JSON.stringify({rows:rows.length}));
