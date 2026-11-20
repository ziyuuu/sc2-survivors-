import {ZERG_SIX,ZERG_SIX_CAPS,isZergSixFamily,type ZergSixFamily} from '../data/zerg-six';
import {planZergCampaign,planSixWindow,ZERG_ENDLESS,ZERG_ENEMY_BASE,ZERG_EXPERIENCE,
 type ExperienceBirth,type SixMotherBirth,type ExperienceHealth} from '../data/zerg-six-encounters';
import {ENDLESS,ENDLESS_ENTRANCES,endlessRoundFrequency,endlessSpawnStamp,endlessWavePlan,endlessWaveTemplate,type EndlessState} from '../data/endless';
import {campaign18StageConfig,type Campaign18Wave} from '../data/campaign18';
import {continuousOrdinaryGrowth,enemyGrowthSeconds,validateEndlessStamp,type EnemySpawnStamp} from '../data/enemy-tuning';
import {TUNING} from '../data/game';
import {SC2_UNITS} from '../data/sc2-units';
import {blocked,distance} from './movement/steering';
import type {Body,Entity,Point} from './types';
import type {World} from './world';

type Count={planned:number;entered:number;skipped:number};
export interface ZergEncounters {
 version:1;legacyOnly?:boolean;
 mothers:SixMotherBirth[];experience:ExperienceBirth[];
 nextMinute:number;typeCursor:number;
 counters:{mother:Count;experience:Count;children:number;cleared:number;experienceKills:number};
}
export type EnemySixGrowth={damage:number;health:number;attackSpeed:number;move:number};
const eps=1e-8;
const emptyCount=():Count=>({planned:0,entered:0,skipped:0});
const newState=():ZergEncounters=>({version:1,mothers:[],experience:[],nextMinute:0,typeCursor:0,
 counters:{mother:emptyCount(),experience:emptyCount(),children:0,cleared:0,experienceKills:0}});
const birthSteps=new WeakMap<World,{tick:number;born:number}>();
function births(w:World){
 let step=birthSteps.get(w);
 if(!step||step.tick!==w.tick){step={tick:w.tick,born:0};birthSteps.set(w,step);}
 return step;
}
export const extraBirthsAvailable=(w:World)=>Math.max(0,8-births(w).born);
export const recordExtraBirth=(w:World)=>{births(w).born++;};
const ordered=<T extends {at:number;id:string}>(a:T,b:T)=>a.at-b.at||a.id.localeCompare(b.id);
export const isExperience=(u:Body|undefined)=>u?.experience?.encounterClass==='experience';
export const regularZergEncounters=(w:World)=>w.extraZergWavesEnabled;

function append(state:ZergEncounters,mothers:SixMotherBirth[],experience:ExperienceBirth[],absolute:number){
 for(const b of mothers)b.at+=absolute;
 for(const b of experience)b.at+=absolute;
 state.counters.mother.planned+=mothers.length;state.counters.experience.planned+=experience.length;
 state.mothers.push(...mothers);state.experience.push(...experience);
 state.mothers.sort(ordered);state.experience.sort(ordered);
}

export function beginZergEncounters(w:World,waves:readonly Campaign18Wave[],stageStart:number){
 if(!regularZergEncounters(w))return;
 if(w.endless){
  if(w.expedition.zergEncounters&&!w.expedition.zergEncounters.legacyOnly&&w.endless.round>1)return;
  w.expedition.zergEncounters=newState();
  w.expedition.zergEncounters.nextMinute=Math.floor(w.endlessElapsed/60);
  return;
 }
 const state=w.expedition.zergEncounters??=newState();
 delete state.legacyOnly;
 state.counters.mother.skipped+=state.mothers.length;state.counters.experience.skipped+=state.experience.length;
 state.mothers=[];state.experience=[];
 const planned=planZergCampaign(w.stage,w.difficulty,waves,w.duration);
 append(state,planned.mothers,planned.experience,stageStart);
}

export function queueLegacyExperience(w:World,birth:ExperienceBirth){
 const s=w.expedition.zergEncounters;
 if(!s)return;
 s.counters.experience.planned++;
 const at=s.experience.findIndex(b=>ordered(birth,b)<0);
 if(at===-1)s.experience.push(birth);else s.experience.splice(at,0,birth);
}

function endlessWindowWaves(w:World,state:EndlessState,from:number,to:number){
 const p=state.pacing!;
 const interval=ENDLESS.wave.interval/endlessRoundFrequency(state.round);
 const first=p.roundStart+(1-p.wavePhase)*interval;
 const start=Math.max(0,Math.floor((from-first)/interval)-1),limit=Math.ceil((to-from)/interval)+4;
 return endlessWaveTemplate(w.runConfig?.seed??1,state.round,w.difficulty,p,start,limit).map(wave=>({...wave,at:p.roundStart+wave.at}));
}

function planEndlessMinute(w:World,s:ZergEncounters){
 const current=w.endless;
 if(s.legacyOnly||!current?.pacing||s.nextMinute*60>w.endlessElapsed+eps)return;
 const minute=s.nextMinute++,from=minute*60,to=from+60,p=current.pacing;
 const currentWaves=endlessWindowWaves(w,current,from,to);
 const next=to>p.roundStart+p.duration+eps?{...current,round:current.round+1,pacing:endlessWavePlan(current.round,w.difficulty,p,0,0).next}:null;
 const waves=next?[...currentWaves,...endlessWindowWaves(w,next,from,to)]:currentWaves;
 const count=waves.reduce((total,wave)=>total+(wave.members??[]).filter(m=>m.stamp.density===1&&wave.at+m.offset>=from&&wave.at+m.offset<to).length,0);
 const d=w.difficulty,quota=ZERG_ENDLESS.countPerWindow[d],spacing=ZERG_ENDLESS.experienceBeatSeconds[d];
 const first=Math.max(0,Math.ceil((from-6)/spacing-1e-9)),last=Math.ceil((to-6)/spacing-1e-9);
 const planned=planSixWindow({key:'endless:'+minute,difficulty:d,start:from,end:to,waves,quotas:quota,
  motherTimes:(j,n)=>from+8+46*(j+.5)/n,
  beats:Array.from({length:last-first},(_,i)=>6+(first+i)*spacing),count,ratio:ZERG_ENDLESS.chaffRatio[d],
  thinRatio:({easy:.15,normal:.20,hard:.25,hell:.30})[d],typeOffset:s.typeCursor,
  stamp:at=>endlessSpawnStamp(next&&at>=next.pacing!.roundStart?next:current,at)});
 s.typeCursor=(s.typeCursor+planned.experience.length)%ZERG_EXPERIENCE.cycle.length;
 append(s,planned.mothers,planned.experience,current.startedAt);
}

export function nearRescue(w:World,p:Point,radius=0){
 const center=w.missions.active?.rescue?.center;
 return !!center&&distance(center,p)<6+radius;
}

function rescueSide(w:World,b:Body){
 const m=w.missions.active,u=b as Entity;
 return nearRescue(w,b,b.unitRadius)||!!m&&(m.bodyIds.includes(b.id)||m.enemyIds.includes(b.id)||u.mission?.taskId===m.id)
  ||w.pods.some(p=>p.hp>0&&['active','opening','falling'].includes(p.status)&&(b.id===p.id||p.guardianIds.has(b.id)||distance(p,b)<6+b.unitRadius));
}

export function experienceContactAllowed(w:World,a:Body,b:Body){
 if(isExperience(a))return !rescueSide(w,b)&&!w.economicTargets.has(b.id);
 return !isExperience(b)||!rescueSide(w,a);
}

export function experienceBirthAllowed(w:World,p:Point,radius:number){
 if(nearRescue(w,p,radius))return false;
 return !w.pods.some(b=>b.hp>0&&['falling','active','opening'].includes(b.status)&&distance(b,p)<6+radius);
}

export function clearExperienceFor(w:World,needed:number,capacity=w.missionEnemyCapacity()){
 if(!needed||!w.expedition.zergEncounters)return;
 let excess=Math.max(0,w.enemyCount()+needed-capacity);
 if(!excess)return;
 for(const e of w.entities.values()){
  if(!excess)break;
  if(e.owner==='zerg'&&e.hp>0&&isExperience(e)){
   w.commitExperienceDeath(e,false);excess--;
  }
 }
}

function findEntry(w:World,b:ExperienceBirth|SixMotherBirth){
 const radius=SC2_UNITS[b.type].unitRadius*TUNING.unitScale;
 const open=(p:Point)=>Math.hypot(w.anchor.x-p.x,w.anchor.z-p.z)>=8
  &&experienceBirthAllowed(w,p,radius)&&!blocked(p,radius,w.obstacles)&&(!w.terrain||w.terrain.canOccupy(p,radius));
 const angle=b.bearing,hash=(Math.imul(b.ordinal+1,0x9e3779b1)^(w.runConfig?.seed??1))>>>0;
 if(w.endless){
  const start=(Math.round(angle/(Math.PI/4))+8)%8,min=18;
  for(let i=0;i<ENDLESS_ENTRANCES.length;i++){
   const base=ENDLESS_ENTRANCES[(start+i)%8],offset=((hash%17)-8)*.013,a=Math.atan2(base.x,base.z)+offset+angle-Math.round(angle/(Math.PI/4))*Math.PI/4;
   const p={x:Math.sin(a)*69,z:Math.cos(a)*69};
   if(open(p)&&w.allies().every(u=>distance(u,p)>=min))return p;
  }
  return;
 }
 const cells=w.spawnLocations;
 for(let i=0;i<28;i++){
  const spread=((hash>>4&255)/255-.5)*.32+(i===0?0:(Math.ceil(i/2)*(i%2?1:-1))*.08);
  const a=angle+spread,r=18+(i%7)*1.65,p={x:w.anchor.x+Math.sin(a)*r,z:w.anchor.z+Math.cos(a)*r};
  if(open(p)&&(!w.terrain||distance(w.anchor,w.terrain.routeGoal(w.anchor,p,radius,w.mapHalf))>1))return p;
 }
 for(let i=0;i<Math.min(48,cells.length);i++){
  const p=cells[(hash+i*151+Math.floor(w.time))%cells.length];
  const forward=(p.x-w.anchor.x)*Math.sin(angle)+(p.z-w.anchor.z)*Math.cos(angle);
  if(forward>=6&&open(p))return p;
 }
}

export function migrateLegacyExperience(w:World){
 if(!regularZergEncounters(w)||w.expedition.zergEncounters)return false;
 w.expedition.zergEncounters={...newState(),legacyOnly:true};
 for(const u of w.entities.values()){
  const stamp=u.enemySpawn;
  if(u.owner==='zerg'&&u.hp>0&&u.enemyOrigin==='regular'&&stamp&&stamp.density!==1&&!u.guardOrigin&&u.guardianPod===null
   &&!u.mission&&!u.encounter&&!u.fun&&!u.enemyTier&&!u.zergSix?.temp&&['zergling','roach','baneling'].includes(u.unitType)){
   applyExperienceBody(w,u,stamp.density,'legacy');
  }
 }
 return true;
}

export function applyExperienceBody(w:World,u:Entity,health:ExperienceHealth,origin:'legacy'|'r2'){
 const previous=u.enemySpawn?.density??1,wounds=u.hp/u.maxHp;
 u.experience={encounterClass:'experience',rewardProfile:'none',rescueNeutral:true,health,origin};
 u.maxHp=Math.max(1,u.maxHp/previous*health);u.hp=u.maxHp*wounds;
 u.weaponDamage=u.weaponDamage/previous*.2;u.armor=u.armor/previous*health;
 if(u.nativeStatScale){
  u.nativeStatScale.hp=u.maxHp/SC2_UNITS[u.unitType].maxHp;
  u.nativeStatScale.damage=u.weaponDamage/SC2_UNITS[u.unitType].attackDamage;
  u.nativeStatScale.armor=u.armor-SC2_UNITS[u.unitType].armor;
 }
 u.enemyResources={minerals:0,gas:0};u.detector=false;u.pandora=false;
}

export function applyEnemySixBody(w:World,u:Entity,stamp:EnemySpawnStamp){
 const id=u.unitType as ZergSixFamily,base=ZERG_ENEMY_BASE[id],d=SC2_UNITS[id];
 const g=continuousOrdinaryGrowth(w.difficulty,stamp.progress,enemyGrowthSeconds(stamp));
 const stageMove=w.difficulty==='easy'?campaign18StageConfig(stamp.stage,w.difficulty).speed:1+.2*stamp.progress;
 const hp=Math.max(1,Math.min(1e100,base.hp*g.health)),damage=Math.min(1e100,base.damage*g.damage),period=Math.max(TUNING.step,base.period/g.attackSpeed);
 Object.assign(u,{hp,maxHp:hp,armor:Math.max(0,base.armor+g.armor),weaponDamage:damage,attackPeriod:period,shotInterval:period,
  attackRange:base.range,moveSpeed:d.movementSpeed*stageMove*g.move,
  enemySix:{damage:g.damage,health:g.health,attackSpeed:g.attackSpeed,move:stageMove*g.move},
  pandora:false,zergSix:{ready:w.time+({aberration:3,devourer:4,infestor:4,swarm_host:3,viper:5,brood_lord:0})[id]}});
 u.nativeStatScale={hp:hp/d.maxHp,damage:base.damage?damage/d.attackDamage:1,period:period/d.attackPeriod,move:u.moveSpeed/d.movementSpeed,armor:u.armor-d.armor};
}

type Birth=SixMotherBirth|ExperienceBirth;
export function admitZergEncounters(w:World,role:'mother'|'experience',budget:number){
 const s=w.expedition.zergEncounters;
 if(!s||!regularZergEncounters(w))return 0;
 if(role==='mother')planEndlessMinute(w,s);
 budget=Math.min(budget,extraBirthsAvailable(w));
 const queue=role==='mother'?s.mothers:s.experience,cap=role==='mother'?ZERG_SIX_CAPS.newTotal[w.difficulty]:ZERG_EXPERIENCE[w.difficulty].alive;
 const ttl=role==='mother'?15:ZERG_EXPERIENCE.maxPendingSeconds,stats=s.counters[role];
 if(!queue.length||queue[0].at>w.time+eps)return 0;
 while(queue.length&&queue[0].at+ttl<w.time-eps){queue.shift();stats.skipped++;}
 if(w.fieldEvents.horde||w.specialStages.active||!queue.length||queue[0].at>w.time+eps)return 0;
 let alive=0,total=0;
 const families:Partial<Record<ZergSixFamily,number>>={};
 for(const u of w.entities.values())if(u.owner==='zerg'&&u.hp>0){
  total++;
  if(role==='experience'?isExperience(u):!!u.enemySix&&!u.zergSix?.temp){
   alive++;
   if(isZergSixFamily(u.unitType))families[u.unitType]=(families[u.unitType]??0)+1;
  }
 }
 let entered=0,examined=0;
 for(let i=0;i<queue.length&&entered<budget&&examined<12&&total<Math.min(w.missionEnemyCapacity(),270)&&alive<cap;){
  const b:Birth=queue[i];
  if(b.at>w.time+eps)break;
  examined++;
  if(b.role==='mother'&&(families[b.type]??0)>=ZERG_SIX_CAPS.newByFamily[w.difficulty][ZERG_SIX.indexOf(b.type)]){i++;continue;}
  const point=findEntry(w,b);if(!point){i++;continue;}
  const u=w.addUnit(b.type,'zerg',point.x,point.z,1,'regular',b.stamp.stage,b.stamp);
  if(b.role==='mother'){applyEnemySixBody(w,u,b.stamp);u.enemyResources={...b.resources};families[b.type]=(families[b.type]??0)+1;}
  else applyExperienceBody(w,u,b.health,b.origin);
  queue.splice(i,1);stats.entered++;recordExtraBirth(w);entered++;alive++;total++;
 }
 return entered;
}

export function validateZergEncounters(s:ZergEncounters){
 const count=(v:number)=>Number.isSafeInteger(v)&&v>=0;
 if(!s||s.version!==1||s.legacyOnly!==undefined&&typeof s.legacyOnly!=='boolean'||!count(s.nextMinute)||!count(s.typeCursor)||!s.counters||!['mother','experience'].every(k=>{
  const c=s.counters[k as 'mother'|'experience'];return c&&[c.planned,c.entered,c.skipped].every(count)&&c.planned>=c.entered+c.skipped;
 })||![s.counters.children,s.counters.cleared,s.counters.experienceKills].every(count))throw Error('虫族投放状态无效');
 for(const role of ['mother','experience'] as const){
  const queue=role==='mother'?s.mothers:s.experience;
  if(!Array.isArray(queue)||new Set(queue.map(b=>b.id)).size!==queue.length||queue.some((b,i)=>!b||b.role!==role||typeof b.id!=='string'||!count(b.ordinal)
    ||![b.at,b.bearing,b.resources?.minerals,b.resources?.gas].every(Number.isFinite)||!b.stamp||(i>0&&ordered(queue[i-1],b)>0)
    ||(b.role==='mother'?!isZergSixFamily(b.type):!['zergling','roach','baneling'].includes(b.type)||![.05,.1,.2,.3,.5].includes(b.health))))throw Error('虫族投放队列无效');
  queue.forEach(b=>validateEndlessStamp(b.stamp));
 }
}
