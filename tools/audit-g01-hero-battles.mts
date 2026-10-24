import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {BOSSES} from '../src/data/enemies';
import {campaignProgress} from '../src/data/enemy-tuning';
import {ALL_HERO_IDS,HEROES} from '../src/data/heroes';
import type {BattleView} from '../src/simulation/combat/battle-view';
process.env.G01_FIXTURES_ONLY='1';
const {setup}=await import('./audit-g01-baseline.mts');
const bounds:BattleView={ground:[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}],air:[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}],occludedGround:[],occludedAir:[]};
const rows:any[]=[];
for(const quality of [0,3] as const)for(const race of ['terran','zerg','protoss'] as const)for(const stage of [3,12])for(const id of [null,...ALL_HERO_IDS.filter(id=>HEROES[id].race===race)]){
 const w=setup(race,quality,4);w.stage=stage;w.difficulty='easy';if(id)assert.ok(w.acquireHero(id));for(const [i,u]of w.allies().entries()){u.x=(i%2)*.8;u.z=Math.floor(i/2)*.8;u.prev={x:u.x,z:u.z};}
 const boss=w.spawnSpecial(BOSSES[stage].type,'boss',{x:0,z:5},{stage,progress:campaignProgress(stage,stage===3?30:w.duration*.625,w.duration),density:1})!;assert.ok(boss);const bossStart={type:boss.unitType,hp:boss.hp,armor:boss.armor,damage:boss.weaponDamage};
 const enemies=[boss];for(let i=0;i<8;i++){const e=w.addUnit('roach','zerg',(i%4-1.5)*1.3,6+Math.floor(i/4)*1.5);enemies.push(e);}
 const initial=w.allies().map(u=>({id:u.id,hero:u.heroId??null,hp:u.hp,shield:u.shield??0}));w.hash.rebuild(w.entities.values());let casts=0;
 while(w.time<60&&w.phase==='battle'&&enemies.some(e=>e.hp>0)&&w.allies().some(u=>u.hp>0)){if(id&&w.tick%6===0&&w.castHero(id,bounds))casts++;w.step();}
 const alive=w.allies().filter(u=>u.hp>0),dead=initial.filter(u=>!alive.some(a=>a.id===u.id));rows.push({quality,race,stage,id,seconds:w.time,bossStart,bossAlive:boss.hp>0,enemySurvivors:enemies.filter(e=>e.hp>0).length,cleared:enemies.every(e=>e.hp<=0),deaths:dead.length,heroDied:dead.some(u=>!!u.hero),remaining:alive.map(u=>({id:u.heroId??u.unitType,hp:u.hp,maxHp:u.maxHp,shield:u.shield??0})),damage:w.stats.damage,casts,phase:w.phase});
 console.log(JSON.stringify({quality,race,stage,id,time:+w.time.toFixed(2),cleared:enemies.every(e=>e.hp<=0),deaths:dead.length}));
 await fs.writeFile('reports/local/g01-20261022/baseline-hero-battles-r2.json',JSON.stringify({method:'Controlled production World.step fight: same four rank-I common units, same native easy stage 3 zergling or stage 12 ravager Boss at the authored spawn progress plus eight ordinary roaches; each of 18 rank-I heroes added separately. No invulnerability, automatic legal hero casts, 60-second limit. Start positions and gear standardized; not natural campaign or final balance.',rows},null,2));
}
