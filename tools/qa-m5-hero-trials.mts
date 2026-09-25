/** Repeatable real-step hero combat samples. Stationary harmless targets are a QA fixture, not campaign evidence. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../src/simulation/world';
import {ALL_HERO_IDS,HEROES,type HeroId} from '../src/data/heroes';
import type {Entity} from '../src/simulation/types';

const output='reports/local/qa-m5-hero-trials.json';
const selected=process.argv.includes('--heroes')?process.argv[process.argv.indexOf('--heroes')+1].split(',') as HeroId[]:[...ALL_HERO_IDS];
for(const id of selected)assert.ok(ALL_HERO_IDS.includes(id),`Unknown hero ${id}`);
const round=(n:number)=>Math.round(n*100)/100;
const support=new Set<HeroId>(['swann','niadra','artanis']);
const results:unknown[]=[],issues:string[]=[];
for(const id of selected)for(const rank of [1,3,5])for(const scenario of ['single','group','mixed'] as const){
 const count=scenario==='single'?1:5;
 const def=HEROES[id],w=new World({race:def.race,sandbox:true,waves:false,terrain:false,obstacles:[],seed:20260925});
 assert.equal(w.start(),true);w.entities.clear();w.heroes.clear();
 for(let n=0;n<rank;n++)assert.equal(w.acquireHero(id),true);
 const hero=w.heroEntity(id)!;hero.x=hero.prev.x=0;hero.z=hero.prev.z=0;
 const noTargetReady=w.heroes.get(id)!.skillReady;
 assert.equal(w.castHero(id),false,`${id}: rank ${rank} no-benefit cast`);
 assert.equal(w.heroes.get(id)!.skillReady,noTargetReady,`${id}: no-benefit cooldown`);
 const targets:Entity[]=[];
 const ground=def.target!=='air';
 for(let n=0;n<count;n++){
  const type=scenario==='mixed'&&n>=3?'viking':ground?(id==='nova'||n%2?'zergling':'thor'):'viking';
  const enemy=w.addUnit(type,'zerg',2.5+Math.floor(n/2)*.65,(n%2===0?1:-1)*Math.ceil(n/2)*.65);
  enemy.hp=enemy.maxHp=1_000_000;enemy.armor=0;enemy.weaponDamage=0;enemy.moveSpeed=0;
  targets.push(enemy);
 }
 let patient:Entity|undefined;
 if(support.has(id)){
  patient=w.addUnit(id==='swann'?'thor':id==='niadra'?'ultralisk':'zealot','terran',1.5,0);
  patient.weaponDamage=0;patient.stoppedUntil=1000;
  if(id==='artanis')patient.shield=0;else patient.hp=Math.max(1,patient.hp*.1);
 }
 w.hash.rebuild(w.entities.values());
 const initial=targets.map(target=>target.hp),checkpoints:unknown[]=[],casts:number[]=[];
 let healing=0,shieldRestored=0,controlFrames=0,lastHp=patient?.hp??0,lastShield=patient?.shield??0;
 for(let tick=1;tick<=3600;tick++){
  let appliedLoss=0;
  if(tick%60===0&&patient){
   if(id==='artanis'){const before=patient.shield??0;patient.shield=Math.max(0,before-20);appliedLoss=before-patient.shield;}
   else{const before=patient.hp;patient.hp=Math.max(1,before-20);appliedLoss=before-patient.hp;}
  }
  if(tick%30===1&&w.phase==='battle'&&w.castHero(id))casts.push(tick);
  w.step();
  if(patient){
   if(id==='artanis'){
    const delta=(patient.shield??0)-lastShield+appliedLoss;
    shieldRestored+=Math.max(0,delta);lastShield=patient.shield??0;
   }else{
    const delta=patient.hp-lastHp+appliedLoss;
    healing+=Math.max(0,delta);lastHp=patient.hp;
   }
  }
  if(id==='vorazun')controlFrames+=targets.filter(target=>(target.stoppedUntil??0)>w.time||(target.moveSlowUntil??0)>w.time).length;
  if(tick===600||tick===1800||tick===3600){
   const perTarget=targets.map((target,index)=>round(initial[index]-target.hp));
   checkpoints.push({seconds:tick/60,totalDamage:round(perTarget.reduce((a,b)=>a+b,0)),perTarget,healing:round(healing),shieldRestored:round(shieldRestored),controlTargetSeconds:round(controlFrames/60),casts:casts.length,shots:w.visualEvents.filter(event=>event.kind==='attack'&&event.heroId===id).length,skillImpacts:w.visualEvents.filter(event=>event.kind==='skill-impact'&&event.heroId===id).length});
  }
 }
 results.push({id,race:def.race,rank,targets:count,fixture:scenario,planes:targets.map(target=>target.flying?'air':'ground'),checkpoints,phase:w.phase});
 const last=checkpoints.at(-1) as {totalDamage:number;healing:number;shieldRestored:number;controlTargetSeconds:number;casts:number};
 if(last.casts<1)issues.push(`${id} rank${rank} ${scenario}: no skill cast`);
 if(!support.has(id)&&id!=='vorazun'&&last.totalDamage<=0)issues.push(`${id} rank${rank} ${scenario}: no damage`);
 if(id==='vorazun'&&last.controlTargetSeconds<=0)issues.push(`${id} rank${rank} ${scenario}: no control`);
 if(id==='swann'||id==='niadra'){if(last.healing<=0)issues.push(`${id} rank${rank} ${scenario}: no healing`);}
 if(id==='artanis'&&last.shieldRestored<=0)issues.push(`${id} rank${rank} ${scenario}: no shield restoration`);
}
fs.mkdirSync('reports/local',{recursive:true});
fs.writeFileSync(output,JSON.stringify({generatedAt:new Date().toISOString(),method:'60 Hz World.step; stationary harmless high-HP targets; 10/30/60 s; no campaign economy or visual signoff',results,issues},null,2));
console.log(JSON.stringify({trials:results.length,issues}));
if(issues.length)process.exitCode=1;
