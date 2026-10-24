import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {runtime,startMeasuredCase,economyController,stageKey,round,distance} from './lib/g03-economy-runtime-tier-behemoth.mts';
const dir='reports/local/g03-tier-balance-20261023/behemoth-fixed',r=await runtime(),race=process.argv[2]??'terran',seed=Number(process.argv[3]??529),only=process.argv[4];
const runtimeBinding=Object.fromEntries(['reports/local/g03-tier-balance-20261023/behemoth-runtime/src/simulation/world.ts','reports/local/g03-tier-balance-20261023/behemoth-runtime/src/simulation/special-stages/bridge.ts','reports/local/g03-tier-balance-20261023/behemoth-runtime/src/simulation/special-stages/crossing.ts','reports/local/g03-tier-balance-20261023/behemoth-runtime/src/simulation/progression/hero-availability.ts','reports/local/g03-tier-balance-20261023/behemoth-runtime/src/simulation/combat/enemy-specials.ts','tools/measure-g03-tiers-behemoth-20261023.mts','tools/lib/g03-economy-runtime-tier-behemoth.mts','tools/qa-campaign-controller.ts'].map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const slots=['offense1','offense2','offense3','offense4','defense1','defense2','defense3','defense4'];
const specs=[{difficulty:'easy',tier:'graduation-candidate',kind:'attribute',qs:[2,2,2,2,2,2,2,2],mq:2,score:200},
 {difficulty:'normal',tier:'graduation-candidate',kind:'attribute',qs:[3,3,3,3,3,3,3,3],mq:3,score:200},
 {difficulty:'easy',tier:'graduation-synergy',kind:'synergy',qs:Array(8).fill(2),mq:2,score:200},
 {difficulty:'normal',tier:'graduation-synergy',kind:'synergy',qs:Array(8).fill(3),mq:3,score:200},
 ...['hard','hell'].flatMap(difficulty=>{const q=difficulty==='hard'?3:4;return [
 {difficulty,tier:'entry',kind:'attribute',qs:[q,q,q,q-1,q,q,q,q-1],mq:q-1,score:140},
 {difficulty,tier:'farm',kind:'attribute',qs:[q+1,q,q,q,q+1,q,q,q],mq:q,score:160},
 {difficulty,tier:'minor',kind:'attribute',qs:[q+1,q+1,q+1,q,q+1,q+1,q+1,q],mq:q+1,score:180},
 {difficulty,tier:'graduation-stat',kind:'attribute',qs:Array(8).fill(q+1),mq:q+1,score:200},
 {difficulty,tier:'graduation-survivor',kind:'survivor',qs:Array(8).fill(q+1),mq:q+1,score:200}];})];
for(const spec of specs.filter(s=>s.difficulty==='hell'&&s.tier==='graduation-survivor')){
 const id=[race,spec.difficulty,spec.tier,seed].join('-'),file=dir+'/'+id+'.json';if(fs.existsSync(file))continue;let lock:number;try{lock=fs.openSync(file+'.lock','wx');}catch(e:any){if(e.code==='EEXIST')continue;throw e;}
 const a=r.newEquipmentAccount(seed);
 function add(template:string,slot:string,score:number){const g=r.grantEquipment(a,{template,race,slot},id+':'+slot,{kind:'warehouse'});assert.ok(g.ok,template);const t=r.equipmentTemplate(template);if(t.kind==='attribute')g.value.allocation=2;
 const keys=slot.startsWith('offense')?['attack','trueDps','range','crit','critDamage']:['defense','health','reduction','dodge','move'];
 g.value.affixes=g.value.affixes.map((_:unknown,i:number)=>({key:keys[i],score}));assert.ok(r.validateItem(g.value),template);assert.ok(r.equip(a,race,g.value.id,slot).ok);}
 for(const [i,slot] of slots.entries()){const q=spec.qs[i];let template=q===5?'set.orange.survivor.5':'attribute.'+q;
  if(spec.kind==='survivor'){template=i===0&&q===4?'special.double.4':i===1&&q===4?'attribute.4':q===5?'set.orange.survivor.5':'set.advanced.survivor.4';}
  if(spec.kind==='synergy')template=q===2?(i<2?'set.team.2':i<4?'set.training.2':'attribute.2'):`set.blue.${i<2?'team':i<4?'training':'survivor'}.3`;
  // No generic orange attributes exist. The stat candidate uses real orange
  // survivor items too; its distinct control/support module pair is compared.
  add(template,slot,spec.score);
 }
 const mq=spec.mq;
 const mods=mq===5?['bounty_order','armory',spec.kind==='survivor'?'dominance':'weakness',spec.kind==='survivor'?'behemoth':'yamato']:['workers','supply',spec.kind==='survivor'?'moving_fire':'formation','suppression'];
 for(const [i,slot] of ['gathering','logistics','control','support'].entries())add(`module.${mods[i]}.${mq}`,slot,spec.score);
 const opening=structuredClone(a),map=r.chooseCampaignMap(seed),w=new r.World({race,difficulty:spec.difficulty,seed,waves:true,terrain:r.campaignTerrain(map),endlessTerrain:new r.FlatTerrain(),equipmentAccount:a});w.configureCampaign(map);
 const p=economyController(w,r,race,{preserveSets:true});p.initialize();startMeasuredCase(w,seed);p.configure();
 const stages:any[]=[],specials:any[]=[],deathRows:any[]=[],dead=new Set<number>();let steps=0,iterations=0,nextThink=-1,last=stageKey(w),lastSpecial='',stop='step-censored',issue=null,started=Date.now(),lastPrint=started,baseCalls=0,normalCalls=0,maxEnemies=0;
 const commitDeath=w.commitUnitDeath.bind(w);w.commitUnitDeath=(u:any,...args:any[])=>{if(u.deadAt===null&&u.owner==='terran'&&!u.temporary&&!u.summonKind){dead.add(u.id);deathRows.push({stage:stageKey(w),special:w.specialStages.active?.kind??null,time:round(w.time),id:u.id,type:u.unitType,hero:u.heroId??null,source:'native-death-callback'});}return commitDeath(u,...args);};
 const sample=()=>({stage:stageKey(w),phase:w.phase,time:round(w.time),allies:w.allies().filter((u:any)=>!u.temporary&&!u.summonKind).map((u:any)=>({id:u.id,type:u.unitType,hp:round(u.hp),maxHp:round(u.maxHp),shield:round(u.shield),rank:u.rank,hero:u.heroId??null,x:round(u.x),z:round(u.z)})),wallet:{...w.wallet},heroes:[...w.heroes.values()].map((h:any)=>({id:h.id,rank:h.rank})),special:w.specialStages.active?.kind??null,gear:structuredClone(w.starship.account.equipped[race])});
 stages.push(sample());
 try{while(steps<260000){if(Date.now()-started>1200000){stop='wall-censored';break;}if(++iterations>530000)throw Error('phase loop');p.decisions();
  if(w.phase==='lost'){stop='lost';break;}if(w.endless){stop='entered-endless';break;}
  if(w.phase==='won'){assert.ok(w.chooseCampaignExit('endless'));continue;}
  if(w.phase==='endless-ready'){const e=w.previewEndlessTransition();assert.ok(e);const token=`${e.requestId}:${e.expectedRevision}:${e.mapHash}`;assert.ok(w.registerEndlessReadyToken(token));assert.ok(w.commitEndlessTransition(e.requestId,e.expectedRevision,token));continue;}
  if(w.phase==='reward'){stages.push(sample());p.intermission();nextThink=-1;continue;}assert.equal(w.phase,'battle');
  if(stageKey(w)!==last){last=stageKey(w);stages.push(sample());nextThink=-1;}
  const s=w.specialStages.active;if(s&&s.id!==lastSpecial){lastSpecial=s.id;specials.push({stage:w.stage,id:s.id,kind:s.kind,participants:s.participants.length,outside:w.allies().filter((u:any)=>!w.terrain.canOccupy(u,u.unitRadius)).map((u:any)=>u.id)});}
  if(w.time>=nextThink-1e-8){
   // Combat takes priority over optional encounters and loot while a visible
   // enemy is near. Only public visibility/range and public input actions.
   const urgent=!s&&[...w.entities.values()].some((e:any)=>e.owner==='zerg'&&e.hp>0&&w.visibleTo(e,'terran')&&distance(e,w.anchor)<18);
   if(urgent){p.base.think();baseCalls++;}else{p.think();normalCalls++;}nextThink=w.time+.25;
  }
  w.step();steps++;maxEnemies=Math.max(maxEnemies,w.enemyCount());
  if(steps%15===0)for(const u of w.entities.values())if(u.owner==='terran'&&!u.temporary&&!u.summonKind&&u.hp<=0&&!dead.has(u.id)){dead.add(u.id);deathRows.push({stage:stageKey(w),special:w.specialStages.active?.kind??null,time:round(w.time),id:u.id,type:u.unitType,hero:u.heroId??null});}
  if(Date.now()-lastPrint>30000){lastPrint=Date.now();console.log(JSON.stringify({progress:id,stage:stageKey(w),steps,special:s?.kind??null}));}
 }}catch(e){stop='error';issue=String(e instanceof Error?e.stack:e);}
 const result={id,spec,race,seed,map,opening,stop,issue,stage:w.stage,time:round(w.time),steps,wallSeconds:(Date.now()-started)/1000,stages,specials,deathRows,final:sample(),finalAccount:w.starship.account,policy:{name:'combat-priority-native-actions',crossing:'persistent exit command',equipment:'preserve equipped set pieces; native upgrades for other equipment',baseCalls,normalCalls,events:[...p.base.events,...p.events]},maxEnemies,limits:'Candidate loadouts, not proven global optimum. Native loot and re-equipping allowed; no forced heroes/kills/wallet, HP lock or stages. Visible-threat combat takes priority; automated policy is not human skill certification. Entry vs farm vs minor vs graduation candidates kept separate. Paired seeds do not imply identical RNG after gear changes.'};
 fs.writeFileSync(file,JSON.stringify({...result,runtimeBinding,deathMeasurement:'Native death callback plus sampled fallback; each callback preserves original arguments/return and only appends data.'},null,2));console.log(JSON.stringify({id,stop,stage:w.stage,steps,wallSeconds:result.wallSeconds,issue}));
 fs.closeSync(lock);fs.unlinkSync(file+'.lock');if(issue)process.exitCode=1;
}
