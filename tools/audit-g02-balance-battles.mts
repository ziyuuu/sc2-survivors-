import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {scenario,buy,lcg} from './lib/g02-balance-fixtures.mts';
import {BOSSES} from '../src/data/enemies';import {campaignProgress} from '../src/data/enemy-tuning';
import {campaign18Schedule,campaign18StageConfig} from '../src/data/campaign18';
import {commitStrategic} from '../src/simulation/combat/shop-support';import {castTactical} from '../src/simulation/combat/unique-support';
import {observeWorld} from '../src/simulation/observation';
const rows:any[]=[],skips:any[]=[],base='reports/local/g02-balance-20261022';
for(const race of ['terran','zerg','protoss'] as const)for(const quality of [0,3,5] as const)for(const stage of [3,9,15]){
 const c={race,quality,stage,seed:102202},active=race==='terran'?'overdrive':race==='zerg'?'evolve':'prism',ids=['none','team.firepower.orange','team.defense.orange',...['strategic','bombardment','mutation',active].map(k=>'support.'+race+'.'+k)];
 for(const id of ids){
  const {w,gear,loadout,buildingWitness,members,rank}=scenario(c),receipt=id==='none'?null:buy(w,id);if(id!=='none'&&!receipt){skips.push({...c,id});continue;}w.phase='battle';w.random=lcg(c.seed);w.nextId=10000;
  const config=campaign18StageConfig(stage,'normal'),birth=campaign18Schedule(config,c.seed).specials.find(s=>s.tier==='boss')!,stamp={stage,progress:campaignProgress(stage,birth.at,config.durationSeconds),density:1 as const};assert.ok(birth);
  const boss=w.spawnSpecial(BOSSES[stage].type,'boss',{x:0,z:5},stamp)!;assert.ok(boss);const enemies=[boss];for(let i=0;i<8;i++)enemies.push(w.addUnit('roach','zerg',(i%4-1.5)*1.3,6+Math.floor(i/4)*1.5,1,'regular',stage,stamp));
  const enemyStart=enemies.map(e=>({id:e.id,type:e.unitType,hp:e.hp,armor:e.armor,damage:e.weaponDamage,period:e.attackPeriod,stamp:e.enemySpawn})),initial=w.allies().map(u=>({id:u.id,hp:u.hp,shield:u.shield??0})),bySource:Record<string,Record<string,number>>={};observeWorld(w,(s,k,n)=>{const v=bySource[s]??={};v[k]=(v[k]??0)+n;});w.hash.rebuild(w.entities.values());
  if(id.endsWith('.strategic'))assert.ok(commitStrategic(w,{x:0,z:5}));let casts=0;
  while(w.time<60-1e-8&&w.phase==='battle'&&enemies.some(e=>e.hp>0)&&w.allies().some(u=>u.hp>0)){if(id.endsWith('.'+active)&&w.tick%6===0&&(race!=='zerg'||w.allies().some(u=>u.hp/u.maxHp<.8))&&castTactical(w,{x:0,z:12}))casts++;w.step();}
  const survivors=w.allies().filter(u=>u.hp>0);rows.push({...c,id,receipt,gear,loadout,buildingWitness,members,rank,enemyStart,initial,seconds:w.time,cleared:enemies.every(e=>e.hp<=0),enemyRemaining:enemies.filter(e=>e.hp>0).map(e=>({type:e.unitType,hp:e.hp})),deaths:initial.filter(u=>!survivors.some(a=>a.id===u.id)).length,survivors:survivors.map(u=>({id:u.id,type:u.unitType,hp:u.hp,maxHp:u.maxHp,shield:u.shield??0})),casts,bySource,phase:w.phase});
 }
 await fs.writeFile(base+'/battles-r1.json',JSON.stringify({method:'Fixed target-ID baseline 10000 after purchase; bounded same-seed native normal-difficulty fights at stages 3/9/15, original scheduled Boss identity/progress plus eight ordinary roaches at the same progress; native player/enemy damage, healing, death, survivor-set rescue retained. Legal single-family roster, controlled funding and prior building witness, no invulnerability. Manual evolve at <80% HP, other actives at start. Not a natural campaign or final difficulty/win-rate acceptance.',rows,skips},null,2));console.log(JSON.stringify({c,rows:rows.length}));
}
