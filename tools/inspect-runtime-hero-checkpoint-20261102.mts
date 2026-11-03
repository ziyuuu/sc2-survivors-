// Controlled runtime/persistence follow-up at 8d680ac. No product mutation.
// These assertions document current defects, not desired-behavior regressions.
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';
import {readArchive} from '../src/persistence/archive';
import {newEquipmentAccount,grantEquipment,cleanseEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS} from '../src/simulation/starship/types';
import {HEROES,type HeroId} from '../src/data/heroes';
import {acquireExpeditionHero,castExpeditionHero} from '../src/simulation/combat/expedition-heroes';

class Backend implements SaveBackend {
 raw:string|null=null;
 async read(){return [this.raw,null,null];}
 async commit(raw:string,expected?:string|null){if(expected!==undefined&&expected!==this.raw)throw Error('conflict');this.raw=raw;}
}
async function fixture(hero:HeroId,kind:'none'|'normal'|'corrupted',rank=3){
 const w=new World({race:HEROES[hero].race,sandbox:true,waves:false,terrain:false,obstacles:[],seed:529,equipmentAccount:newEquipmentAccount(529)}),a=w.starship.account;
 if(kind!=='none')for(const slot of ATTRIBUTE_SLOTS.slice(0,6)){
  const r=grantEquipment(a,{template:`set.orange.${kind==='corrupted'?'corrupted_hero':'hero'}.5`,race:w.selectedRace,slot,binding:{hero},polluted:kind==='corrupted'},'runtime-hero:'+slot,{kind:'warehouse'});assert.ok(r.ok);
  if(kind==='corrupted'){a.dust=100000;assert.ok(cleanseEquipment(a,r.value.id).ok);}assert.ok(w.equipItem(r.value.id,slot).ok);
 }
 const backend=new Backend(),session=new RunSession(w,new SaveRepository(backend),{run:null,savedAt:0,notice:''});assert.ok(w.start());await session.saveNow();
 // Only the asset-ready seam is stubbed. Acquisition and ranks use product commands.
 if(kind==='none')while((w.heroes.get(hero)?.rank??0)<rank)assert.ok(acquireExpeditionHero(w,hero,()=>true));
 const u=w.heroEntity(hero)!;assert.ok(u);u.x=u.z=0;u.prev={x:0,z:0};w.heroes.get(hero)!.skillReady=0;
 return {w,u,backend,session};
}
async function checkEnd(f:Awaited<ReturnType<typeof fixture>>,expected:RegExp|null){const {w,backend,session}=f,old=backend.raw;w.endStage();assert.equal(w.phase,'reward');const at=w.time;w.advance(10);assert.equal(w.time,at);let error='';try{await session.saveNow();}catch(e){error=String((e as Error).message);}
 if(expected){assert.match(error,expected);assert.equal(backend.raw,old);assert.equal(w.interfacePaused,true);assert.equal(await session.saveBeforeAdvance(),false);assert.throws(()=>readArchive(session.exportJSON()));}
 else {assert.equal(error,'');assert.doesNotThrow(()=>readArchive(backend.raw!));}
 return {error,savePassed:!error,intermissionClockFrozen:w.time===at,...(expected?{oldSavePreserved:backend.raw===old,canAdvance:false,exportReadable:false}:{})};
}
const results:unknown[]=[];
for(const equipped of [false,true]){
 const f=await fixture('swann',equipped?'normal':'none'),{w,u}=f;
 for(let n=0;n<10;n++){const p=w.addUnit('hellion','terran',Math.sin(n)*3,Math.cos(n)*3);p.hp=p.maxHp*.5;}
 w.hash.rebuild(w.entities.values());assert.ok(castExpeditionHero(w,'swann'));const targets=w.heroCasts[0].frozenTargets!.length;assert.equal(targets,equipped?10:7);
 results.push({case:'swann-target-limit',equipped,rank:u.rank,targets,...await checkEnd(f,equipped?/英雄弹体状态无效/:null)});
}
for(const equipped of [false,true]){
 const f=await fixture('niadra',equipped?'corrupted':'none',5),{w,u}=f;
 if(!w.expedition.familySlots.includes('roach'))w.expedition.familySlots.push('roach');
 for(let n=0;n<6;n++)w.addUnit('roach','terran',Math.sin(n)*3,Math.cos(n)*3);
 w.hash.rebuild(w.entities.values());assert.ok(castExpeditionHero(w,'niadra'));const charges=w.zergHeroes.revivals[0].charges;assert.equal(charges,equipped?5:4);
 results.push({case:'niadra-revival-charges',equipped,rank:u.rank,charges,...await checkEnd(f,equipped?/复生登记无效/:null)});
}
for(const desiredRank of [5,6]){
 const f=await fixture('raynor','normal'),{w,u}=f,source=w.allies().find(a=>!a.heroId)!;
 let kills=0;while(u.rank<desiredRank){assert.ok(kills++<20);const enemy=w.addUnit('zergling','zerg',25,w.nextId%10);enemy.hp=enemy.maxHp=1;enemy.enemyTier='boss';w.hit(enemy,100,[],1,'terran',0,1,source.id);}
 assert.equal(u.rank,desiredRank);assert.equal(w.heroes.get('raynor')!.rank,desiredRank);
 const target=w.addUnit('roach','zerg',0,3);target.hp=target.maxHp=1e7;w.hash.rebuild(w.entities.values());assert.ok(castExpeditionHero(w,'raynor'));const castRank=w.heroCasts.find(c=>c.source===u.id)!.rank;
 results.push({case:'hero-growth-rank',desiredRank,rank:u.rank,castRank,actualKillReceipts:kills,...await checkEnd(f,desiredRank>5?/英雄弹体状态无效/:null)});
}
console.log(JSON.stringify({baseline:'8d680ac',scope:'Three independent hero limit contracts, each actual cast/equipment growth → intermission → RunSession save plus control',results},null,2));
