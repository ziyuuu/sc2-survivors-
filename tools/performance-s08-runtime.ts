import type {boot} from '../src/app/bootstrap';
import {installPerformanceF05} from './performance-f05-runtime';
import {ELITES,type EliteId} from '../src/data/elites';
import {deployExpeditionHero} from '../src/simulation/combat/expedition-heroes';
import type {HeroId} from '../src/data/heroes';
export function installPerformanceS08(app:Awaited<ReturnType<typeof boot>>){
 installPerformanceF05(app);const api=(window as any).__B02__,{world:w,view:v,hud}=app;
 let maintain:number[]=[];
 const step=w.step.bind(w);w.step=()=>{for(const id of maintain){const p=w.entities.get(id);if(p&&p.hp>0){p.hp=p.maxHp*.25;p.shield=(p.maxShield??0)*.25;}}step();};
 const setup=async(name:string)=>{
  maintain=[];
  await api.fixtures.setup('medical');const base=api.fixtures.identity(),sources:number[]=[...base.sources],targets:number[]=[...base.targets];
  for(const id of targets){const p=w.entities.get(id)!;w.refreshStats(p,true);p.hp=p.maxHp*.25;}
  if(name==='medical-elite')for(const [i,id] of (['medivac.2','science_vessel.1','queen.1'] as EliteId[]).entries()){const u=w.entities.get(sources[i])!;u.eliteId=id;u.modelKey=ELITES[id].model;w.refreshStats(u,true);}
  if(name==='hero-support'){
   for(const id of sources)w.entities.delete(id);sources.length=0;
   for(const id of ['swann','niadra','artanis'] as HeroId[]){const r={id,rank:3,entityId:null,skillReady:0,revivePaid:false,awaitingSpawn:true};w.heroes.set(id,r);if(!deployExpeditionHero(w,r,false))throw Error('Hero deployment refused');const u=w.heroEntity(id)!;u.moveSpeed=0;u.nextShotAt=1e9;sources.push(u.id);}
   for(let i=0;i<4;i++){const p=w.freePosition('stalker',{x:w.anchor.x+(i-1.5)*1.5,z:w.anchor.z+2},0,8);if(!p)throw Error('Missing shield patient position');const u=w.addUnit('stalker','terran',p.x,p.z);u.hp=u.maxHp*.25;u.shield=(u.maxShield??0)*.25;u.stoppedUntil=u.nextShotAt=1e9;targets.push(u.id);}
  }
  if(name==='no-sources'){for(const id of sources)w.entities.delete(id);sources.length=0;}
  for(const id of sources){const u=w.entities.get(id)!;u.moveSpeed=0;u.energy=u.maxEnergy;}
  maintain=targets.slice();w.hash.rebuild(w.entities.values());await api.prepare();v.render(0,1);return {name,sources,targets,method:'Native health/shield maxima. Diagnostic wounds reset to 25% immediately before each native tick until stop; no damage events or natural campaign claim.'};
 };
 const stop=async()=>{maintain=[];return api.fixtures.stop('all-combat');};
 const audioLifecycle=async()=>{
  await setup('medical');maintain=[];const audio=hud.audio;if(!audio)throw Error('Audio service unavailable');await audio.start();api.freeze();audio.reset();
  const identities=api.fixtures.identity(),u=w.entities.get(identities.sources[0])!,p=w.entities.get(identities.targets[0])!,rows:any[]=[];
  const capture=(name:string)=>{audio.update(w);const r=audio.report();rows.push({name,loops:r.activeHealers,played:r.played['sc2.medivac.heal']??0,decoded:r.originalDecoded,errors:r.errors.slice(),time:w.time,paused:w.paused});};
  for(const e of w.entities.values())e.healTarget=null;
  capture('empty');w.heal(u,1/60);capture('healing');
  for(const id of identities.targets){const patient=w.entities.get(id)!;patient.hp=patient.maxHp;}w.heal(u,1/60);capture('just-ended');w.time+=.16;capture('tail-ended');
  p.hp=p.maxHp/2;u.energy=u.maxEnergy;w.heal(u,1/60);capture('resumed');w.paused=true;capture('paused');w.paused=false;w.heal(u,1/60);capture('unpaused');u.hp=0;capture('source-dead');audio.reset();capture('reset');
  if(rows.map(r=>r.loops).join(',')!=='0,1,1,0,1,0,1,0,0')throw Error('Unexpected native audio lifecycle: '+JSON.stringify(rows));
  if(rows.some(r=>r.decoded===0||r.errors.length))throw Error('Native audio preload failed');
  return {rows,method:'Actual decoded AudioBuffer/AudioContext nodes through the production audio service. Headless checks prove node lifecycle, not human listening.'};
 };
 (window as any).__S08__={setup,stop,audioLifecycle};
}
