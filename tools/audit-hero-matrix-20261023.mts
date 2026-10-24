import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {scenario,lcg,mainFamily} from './lib/g02-fixtures.mts';
import {ALL_HERO_IDS,HEROES} from '../src/data/heroes';
import {campaign18Schedule,campaign18StageConfig} from '../src/data/campaign18';
import {mixCampaignWaves} from '../src/data/mixed-waves';
import {campaignProgress} from '../src/data/enemy-tuning';
const dir='reports/local/hero-matrix-20261023';fs.mkdirSync(dir,{recursive:true});
function hashes(){const out:any={};function walk(p:string){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())walk(f);else out[f]=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');}}walk('src');walk('test');return out;}
const before=hashes();fs.writeFileSync(dir+'/source-before.json',JSON.stringify(before));
const seed=102303,rows:any[]=[],bounds:any={ground:[{x:-40,z:-40},{x:40,z:-40},{x:40,z:40},{x:-40,z:40}],air:[{x:-40,z:-40},{x:40,z:-40},{x:40,z:40},{x:-40,z:40}],occludedGround:[],occludedAir:[]};
const replay=process.argv.includes('--replay');
const pilot=process.argv.includes('--pilot'),only=process.argv.find(a=>a.startsWith('--difficulty='))?.split('=')[1];const output=dir+(replay?'/movement-replay.ndjson':pilot?'/pilot.ndjson':only?'/'+only+'.ndjson':'/rows.ndjson');
const key=(r:any)=>[r.difficulty,r.stage,r.quality,r.race,r.mode,r.hero,r.members].join('/');
const replayKeys=new Set(replay?['easy','normal','hard','hell'].flatMap(d=>fs.readFileSync(dir+'/'+d+'.ndjson','utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s))).filter(r=>r.outcome==='timeout').map(key):[]);
const prior=replay&&fs.existsSync(output)?fs.readFileSync(output,'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s)):only?[...new Map([dir+'/rows.ndjson',output].filter(p=>fs.existsSync(p)).flatMap(p=>fs.readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s))).filter(r=>r.difficulty===only).map(r=>[key(r),r])).values()]:[];
const done=new Set(prior.map(key));rows.push(...prior);fs.writeFileSync(output,prior.map(r=>JSON.stringify(r)+'\n').join(''));
for(const difficulty of ['easy','normal','hard','hell'] as const)for(const stage of [3,6,9])for(const quality of [0,3] as const)for(const race of ['terran','zerg','protoss'] as const)for(const mode of ['boss','group','mixed'])for(const hero of [null,...ALL_HERO_IDS.filter(h=>HEROES[h].race===race)])for(const members of hero?[0,4]:[4]){
 if(pilot&&!(difficulty==='easy'&&stage===3&&quality===0&&race==='terran'&&(hero===null||hero===ALL_HERO_IDS[0])))continue;
 if(only&&difficulty!==only||done.has(key({difficulty,stage,quality,race,mode,hero,members})))continue;
 if(replay&&!replayKeys.has(key({difficulty,stage,quality,race,mode,hero,members})))continue;
 const rank=stage/3,{w,gear,buildingWitness,loadout}=scenario({race,quality,stage,seed,family:race==='protoss'&&stage===6?'zealot':mainFamily(race,stage),members,rank});
 w.difficulty=difficulty;(w as any).sandbox=false;w.prepareStage();w.autoWaves=false;w.eventPlan=[];w.phase='battle';
 // Isolate the initial roster: no purchases, reinforcement production, reward collection or stage transition.
 w.updateProduction=()=>{};w.collectRewardDrop=()=>false;w.endStage=()=>{};
 if(hero)assert.ok(w.acquireHero(hero));assert.equal(w.allies().filter(u=>!!u.heroId).length,hero?1:0);
 w.random=lcg(seed);w.nextId=10000;const config=campaign18StageConfig(stage,difficulty),plan=campaign18Schedule(config,seed),events:any[]=[];
 if(mode!=='boss')for(const wave of mixCampaignWaves(plan.waves,stage,difficulty,seed))for(const m of wave.members!)events.push({at:wave.at+m.offset,type:m.type,stamp:m.stamp,resources:m.resources,lane:m.lane});
 for(const s of plan.specials)if(s.tier==='boss'?mode!=='group':mode!=='boss')events.push({...s,at:mode==='boss'?0:s.at,stamp:{stage,progress:campaignProgress(stage,s.at,config.durationSeconds),density:1},special:true});
 events.sort((a,b)=>a.at-b.at);const expected=events.length,initial=w.allies().map(u=>({id:u.id,hero:u.heroId,hp:u.hp,shield:u.shield,damage:u.weaponDamage,rank:u.rank})),enemies:any[]=[];let next=0,casts=0,boss:any=null;
 const limit=mode==='boss'?90:Math.max(config.durationSeconds,events.at(-1)?.at??0)+60;
 while(w.time<limit-1e-8&&w.phase==='battle'){
  while(next<events.length&&events[next].at<=w.time+1e-8){const e=events[next],p={x:((next%7)-3)*1.5,z:12+Math.floor(next%21/7)*1.5};let u:any;
   if(e.special)u=w.spawnSpecial(e.type,e.tier,p,e.stamp);else {u=w.addUnit(e.type,'zerg',p.x,p.z,1,'regular',stage,e.stamp);u.enemyResources=e.resources;}
   assert.ok(u,'spawn capacity');enemies.push(u);if(e.tier==='boss')boss={entity:u,startHp:u.hp,damage:u.weaponDamage,type:u.unitType,spawnAt:w.time,stamp:e.stamp};next++;
  }
  if(next===expected&&enemies.every(u=>u.hp<=0))break;
  if(w.requiresPlayerDecision)break;
  if(replay&&w.tick%15===0){const target=[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0).sort((a,b)=>Math.hypot(a.x-w.anchor.x,a.z-w.anchor.z)-Math.hypot(b.x-w.anchor.x,b.z-w.anchor.z))[0];if(target)w.issueMove({x:target.x,z:target.z});}
  w.hash.rebuild(w.entities.values());if(hero&&w.tick%6===0&&w.castHero(hero,bounds))casts++;
  w.step();
 }
 const alive=w.allies().filter(u=>u.hp>0),cleared=next===expected&&enemies.every(u=>u.hp<=0),outcome=cleared?'clear':w.phase==='lost'?'defeat':w.requiresPlayerDecision?'blocked':'timeout';
 const row={difficulty,stage,quality,race,mode,hero,name:hero?HEROES[hero].name:null,members,rank,seed,loadout,gear,buildingWitness,initial,expected,spawned:next,killed:enemies.filter(u=>u.hp<=0).length,remaining:enemies.filter(u=>u.hp>0).length,casts,seconds:w.time,limit,outcome,heroAlive:hero?alive.some(u=>u.heroId===hero):null,survivingInitial:initial.filter(u=>alive.some(a=>a.id===u.id)).length,hpFraction:alive.reduce((n,u)=>n+u.hp,0)/Math.max(1,initial.reduce((n,u)=>n+u.hp,0)),boss:boss?{type:boss.type,startHp:boss.startHp,damage:boss.damage,spawnAt:boss.spawnAt,stamp:boss.stamp,remainingHp:boss.entity.hp}:null};
 Object.assign(row,{remainingDetails:enemies.filter(u=>u.hp>0).map(u=>({type:u.unitType,tier:u.enemyTier,hp:u.hp,x:u.x,z:u.z,flying:u.flying})),finalHeroes:alive.filter(u=>u.heroId).map(u=>({hero:u.heroId,hp:u.hp,maxHp:u.maxHp,shield:u.shield,maxShield:u.maxShield,x:u.x,z:u.z})),movementReplay:replay});
 rows.push(row);fs.appendFileSync(output,JSON.stringify(row)+'\n');if(rows.length%36===0)console.log(JSON.stringify({done:rows.length,difficulty,stage,quality,race,mode}));
}
assert.deepEqual(hashes(),before);fs.writeFileSync(dir+(replay?'/movement-replay-summary.json':pilot?'/pilot-summary.json':only?'/'+only+'-summary.json':'/summary.json'),JSON.stringify({rows:rows.length,sourceFiles:Object.keys(before).length,sourceUnchanged:true,outcomes:rows.reduce((a,r)=>(a[r.outcome]=(a[r.outcome]??0)+1,a),{} as any)},null,2));console.log('DONE',rows.length);
