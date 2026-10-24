import type {boot} from '../src/app/bootstrap';
import {installPerformanceF05} from './performance-f05-runtime';
import {ELITES,type EliteId} from '../src/data/elites';
import {deployExpeditionHero} from '../src/simulation/combat/expedition-heroes';
import type {HeroId} from '../src/data/heroes';
/** Diagnostic-only scenarios use native attacks/casts and the existing scene lifecycle. */
export function installPerformanceS04(app:Awaited<ReturnType<typeof boot>>){
 installPerformanceF05(app);const api=(window as any).__B02__,{world:w,view:v}=app;
 const setup=async(name:string)=>{
  if(!['acid','hero'].includes(name))return api.fixtures.setup(name);
  await api.fixtures.setup('carrier-attributes');const targets=[...w.entities.values()].filter(u=>u.owner==='zerg');
  for(const u of [...w.entities.values()])if(u.owner==='terran')w.entities.delete(u.id);w.heroes.clear();w.visualEvents=[];w.effects=[];w.weaponFlights=[];
  const sources:number[]=[],results:boolean[]=[];
  if(name==='acid'){
   for(let i=0;i<3;i++){const id:EliteId='baneling.2',at=w.freePosition('baneling',{x:w.anchor.x+(i-1)*1.6,z:w.anchor.z+3},0,8);if(!at)throw Error('No acid source placement');
    const u=w.addUnit('baneling','terran',at.x,at.z,1);u.eliteId=id;u.modelKey=ELITES[id].model;w.refreshStats(u,true);u.hp=u.maxHp=1e8;u.moveSpeed=0;u.stoppedUntil=u.nextShotAt=1e9;sources.push(u.id);
    // Three same-source areas exercise the actual overlap rule without altering native area damage.
    for(let j=0;j<3;j++){u.recoveryUntil=undefined;w.fire(u,targets[0]);}
   }
   if(w.zergElites.areas.length!==9)throw Error('Expected nine native acid areas, got '+w.zergElites.areas.length);
  }else{
   for(const id of ['raynor','tosh'] as HeroId[]){const record={id,rank:3,entityId:null,skillReady:0,revivePaid:false,awaitingSpawn:true};w.heroes.set(id,record);if(!deployExpeditionHero(w,record,false))throw Error('Hero deployment refused');
    const u=w.heroEntity(id)!;u.hp=u.maxHp=1e8;u.moveSpeed=0;u.nextShotAt=1e9;sources.push(u.id);
   }
   w.hash.rebuild(w.entities.values());const polygon=[{x:w.anchor.x-20,z:w.anchor.z-20},{x:w.anchor.x+20,z:w.anchor.z-20},{x:w.anchor.x+20,z:w.anchor.z+20},{x:w.anchor.x-20,z:w.anchor.z+20}],view={ground:polygon,air:polygon,occludedGround:[],occludedAir:[]};
   for(const id of ['raynor','tosh'] as HeroId[])results.push(w.castHero(id,view));if(results.some(x=>!x))throw Error('Native hero cast refused');
  }
  w.hash.rebuild(w.entities.values());await api.prepare();v.render(0,1);return {name,sources,targets:targets.map(u=>u.id),results,areas:w.zergElites.areas.length,casts:w.heroCasts.length,method:'Native fire/cast from diagnostic placement; recovery is explicitly cleared before each of three immediate baneling attacks per source to form an overlap fixture, not normal cooldown behavior.'};
 };
 (window as any).__S04__={setup};
}
