import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {runtime,startMeasuredCase,economyController,stageKey,round,distance} from './lib/g03-economy-runtime-tier-objectives-r2.mts';
const dir='reports/local/g03-tier-balance-20261023/objective-firepower',r=await runtime(),race=process.argv[2]??'terran',seed=Number(process.argv[3]??529),only=process.argv[4]??'entry';
const runtimeBinding=Object.fromEntries(['reports/local/g03-tier-balance-20261023/behemoth-runtime/src/simulation/world.ts','reports/local/g03-tier-balance-20261023/behemoth-runtime/src/simulation/special-stages/bridge.ts','reports/local/g03-tier-balance-20261023/behemoth-runtime/src/simulation/special-stages/crossing.ts','reports/local/g03-tier-balance-20261023/behemoth-runtime/src/simulation/progression/hero-availability.ts','reports/local/g03-tier-balance-20261023/behemoth-runtime/src/simulation/combat/enemy-specials.ts','tools/measure-g03-objective-tiers-r2-20261023.mts','tools/lib/g03-economy-runtime-tier-objectives-r2.mts','tools/qa-campaign-controller.ts'].map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const slots=['offense1','offense2','offense3','offense4','defense1','defense2','defense3','defense4'];
const specs=[{difficulty:'hell',tier:'entry',kind:'entry',qs:[4,4,4,3,4,4,4,3],mq:3,score:140},{difficulty:'hell',tier:'graduation-offense',kind:'offense',qs:Array(8).fill(5),mq:5,score:200}];
for(const spec of specs.filter(s=>!only||only.split(',').includes(s.tier))){
 const id=[race,spec.difficulty,spec.tier,seed].join('-'),file=dir+'/'+id+'.json';if(fs.existsSync(file))continue;let lock:number;try{lock=fs.openSync(file+'.lock','wx');}catch(e:any){if(e.code==='EEXIST')continue;throw e;}
 const a=r.newEquipmentAccount(seed);
 function add(template:string,slot:string,score:number){const hero={terran:'yamato_battlecruiser',zerg:'hots_leviathan',protoss:'purifier_flagship'}[race];const g=r.grantEquipment(a,{template,race,slot,...(template.includes('.hero.')?{binding:{hero}}:{})},id+':'+slot,{kind:'warehouse'});assert.ok(g.ok,template);const t=r.equipmentTemplate(template);if(t.kind==='attribute')g.value.allocation=2;
 const keys=slot.startsWith('offense')?['attack','trueDps','range','crit','critDamage']:['defense','health','reduction','dodge','move'];
 g.value.affixes=g.value.affixes.map((_:unknown,i:number)=>({key:keys[i],score}));assert.ok(r.validateItem(g.value),template);assert.ok(r.equip(a,race,g.value.id,slot).ok);}
 for(const [i,slot] of slots.entries()){
  const q=spec.qs[i];const template=spec.kind==='entry'?'attribute.'+q:q===2?(i<2?'set.team.2':i<4?'set.training.2':i<6?'set.call.2':'attribute.2'):q===3?(i<2?'set.blue.training.3':'set.blue.hero.3'):q===4?(i===0?'special.double.4':i===1?'attribute.4':'set.advanced.hero.4'):(i<2?'set.orange.survivor.5':'set.orange.hero.5');
  add(template,slot,spec.score);
 }
 const mq=spec.mq,mods=spec.kind==='entry'?['workers','supply','formation','suppression']:mq===5?['bounty_order','armory','weakness','yamato']:['workers','supply','moving_fire',mq===2?'wind_serpent':mq===3?'elephant':'joint'];
 for(const [i,slot] of ['gathering','logistics','control','support'].entries())add(`module.${mods[i]}.${mq}`,slot,spec.score);
 const opening=structuredClone(a),map=r.chooseCampaignMap(seed),w=new r.World({race,difficulty:spec.difficulty,seed,waves:true,terrain:r.campaignTerrain(map),endlessTerrain:new r.FlatTerrain(),equipmentAccount:a});w.configureCampaign(map);
 const p=economyController(w,r,race,{preserveSets:true});p.initialize();startMeasuredCase(w,seed);p.configure();
 const stages:any[]=[],specials:any[]=[],deathRows:any[]=[],dead=new Set<number>();let steps=0,iterations=0,nextThink=-1,last=stageKey(w),lastSpecial='',stop='step-censored',issue=null,started=Date.now(),lastPrint=started,baseCalls=0,normalCalls=0,objectiveCalls=0,maxEnemies=0;
 const commitDeath=w.commitUnitDeath.bind(w);w.commitUnitDeath=(u:any,...args:any[])=>{if(u.deadAt===null&&u.owner==='terran'&&!u.temporary&&!u.summonKind){dead.add(u.id);deathRows.push({stage:stageKey(w),special:w.specialStages.active?.kind??null,time:round(w.time),id:u.id,type:u.unitType,hero:u.heroId??null,source:'native-death-callback'});}return commitDeath(u,...args);};
 const sample=()=>({notice:w.notice,expansionHives:[...w.expansionHives.values()].map((h:any)=>({id:h.id,hp:h.hp,maxHp:h.maxHp,x:h.x,z:h.z})),tech:{...w.expedition.tech},production:structuredClone(w.expedition.production),ledger:structuredClone(w.expedition.ledger),stage:stageKey(w),phase:w.phase,time:round(w.time),allies:w.allies().filter((u:any)=>!u.temporary&&!u.summonKind).map((u:any)=>({id:u.id,type:u.unitType,hp:round(u.hp),maxHp:round(u.maxHp),shield:round(u.shield),rank:u.rank,hero:u.heroId??null,x:round(u.x),z:round(u.z)})),wallet:{...w.wallet},heroes:[...w.heroes.values()].map((h:any)=>({id:h.id,rank:h.rank})),special:w.specialStages.active?.kind??null,gear:structuredClone(w.starship.account.equipped[race])});
 stages.push(sample());
 try{while(steps<260000){if(Date.now()-started>2400000){stop='wall-censored';break;}if(++iterations>530000)throw Error('phase loop');p.decisions();
  if(w.phase==='lost'){stop='lost';break;}if(w.endless){stop='entered-endless';break;}
  if(w.phase==='won'){assert.ok(w.chooseCampaignExit('endless'));continue;}
  if(w.phase==='endless-ready'){const e=w.previewEndlessTransition();assert.ok(e);const token=`${e.requestId}:${e.expectedRevision}:${e.mapHash}`;assert.ok(w.registerEndlessReadyToken(token));assert.ok(w.commitEndlessTransition(e.requestId,e.expectedRevision,token));continue;}
  if(w.phase==='reward'){stages.push(sample());p.intermission();nextThink=-1;continue;}assert.equal(w.phase,'battle');
  if(stageKey(w)!==last){last=stageKey(w);stages.push(sample());nextThink=-1;}
  const s=w.specialStages.active;if(s&&s.id!==lastSpecial){lastSpecial=s.id;specials.push({stage:w.stage,id:s.id,kind:s.kind,participants:s.participants.length,outside:w.allies().filter((u:any)=>!w.terrain.canOccupy(u,u.unitRadius)).map((u:any)=>u.id)});}
  if(w.time>=nextThink-1e-8){
   // Combat takes priority over optional encounters and loot while a visible
   // enemy is near. Only public visibility/range and public input actions.
   const mandatory=!s&&w.difficulty==='hell'&&[...w.expansionHives.values()].some((h:any)=>h.hp>0);if(mandatory)objectiveCalls++;const urgent=!mandatory&&!s&&[...w.entities.values()].some((e:any)=>e.owner==='zerg'&&e.hp>0&&w.visibleTo(e,'terran')&&distance(e,w.anchor)<18);
   if(urgent){p.base.think();baseCalls++;}else{p.think();normalCalls++;}nextThink=w.time+.25;
  }
  w.step();steps++;maxEnemies=Math.max(maxEnemies,w.enemyCount());
  if(steps%15===0)for(const u of w.entities.values())if(u.owner==='terran'&&!u.temporary&&!u.summonKind&&u.hp<=0&&!dead.has(u.id)){dead.add(u.id);deathRows.push({stage:stageKey(w),special:w.specialStages.active?.kind??null,time:round(w.time),id:u.id,type:u.unitType,hero:u.heroId??null});}
  if(Date.now()-lastPrint>30000){lastPrint=Date.now();console.log(JSON.stringify({progress:id,stage:stageKey(w),steps,special:s?.kind??null}));}
 }}catch(e){stop='error';issue=String(e instanceof Error?e.stack:e);}
 const result={id,spec,race,seed,map,opening,stop,issue,stage:w.stage,time:round(w.time),steps,wallSeconds:(Date.now()-started)/1000,stages,specials,deathRows,final:sample(),finalAccount:w.starship.account,policy:{name:'mandatory-objective-majority-firepower-native-actions',crossing:'persistent exit command',equipment:'preserve equipped sets and unique special items; native attribute upgrades',baseCalls,normalCalls,objectiveCalls,events:[...p.base.events,...p.events]},maxEnemies,limits:'Candidate loadouts, not proven global optimum. Native loot and re-equipping allowed; no forced heroes/kills/wallet, HP lock or stages. Visible-threat combat takes priority; automated policy is not human skill certification. Entry vs farm vs minor vs graduation candidates kept separate. Paired seeds do not imply identical RNG after gear changes.'};
 fs.writeFileSync(file,JSON.stringify({...result,runtimeBinding,deathMeasurement:'Native death callback plus sampled fallback; each callback preserves original arguments/return and only appends data.'},null,2));console.log(JSON.stringify({id,stop,stage:w.stage,steps,wallSeconds:result.wallSeconds,issue}));
 fs.closeSync(lock);fs.unlinkSync(file+'.lock');if(issue)process.exitCode=1;
}
