import type {World} from '../world';
import type {Entity} from '../types';
import {ALL_HERO_IDS,HEROES,type HeroId} from '../../data/heroes';
import {ELITES,type EliteId} from '../../data/elites';
import {SC2_UNITS} from '../../data/sc2-units';
import {continuousSpecialProfile,campaignProgress} from '../../data/enemy-tuning';
import {sourceDetails} from '../combat/expedition-combat';
import {distance,locomote} from '../movement/steering';
/** These original variants have owner-relative targeting and no unavoidable healer/control loop. */
export const ARENA_ELITES:readonly EliteId[]=['marine.2','marauder.1','reaper.1','zergling.2','roach.2','hydralisk.1','zealot.1','stalker.1','immortal.1'];
export function initializeArena(w:World,forcedHeroes?:HeroId[]){
 const a=w.specialStages.active!,chapter=Math.min(2,Math.floor((a.stage-1)/6)),counts=chapter===0?[1,6]:chapter===1?[2,8]:[2,10],stamp={stage:a.stage,progress:campaignProgress(a.stage,0,w.config.durationSeconds),density:1 as const};
 const air=w.allies().some(u=>w.targetAllowed(u,{id:-1,x:u.x+2,z:u.z,hp:1,maxHp:1,armor:0,unitRadius:1,flying:true,attributes:[],owner:'zerg'}));
 const pool=ALL_HERO_IDS.filter(id=>air||!HEROES[id].flying),heroes=forcedHeroes??Array.from({length:counts[0]},()=>pool[Math.floor(w.random()*pool.length)]);
 const reference=SC2_UNITS.queen,boss=continuousSpecialProfile(w.difficulty,'queen','boss',stamp,{hp:reference.maxHp,damage:reference.attackDamage,period:reference.attackPeriod,armor:reference.armor});
 heroes.forEach((id,i)=>{
  const d=HEROES[id],u=w.addUnit(d.baseFamily,'zerg',(i-(heroes.length-1)/2)*8,-12),total=d.hp+d.shield,health=boss.hp*(i?1:.95),dps=boss.damage/boss.period;
  Object.assign(u,{heroId:id,arenaHero:true,modelKey:d.model,enemyTier:'boss',enemyName:d.name+' · 竞技场首领',flying:!!d.flying,race:d.race,attributes:[...d.attributes],hp:health*d.hp/total,maxHp:health*d.hp/total,shield:health*d.shield/total,maxShield:health*d.shield/total,armor:boss.armor,shieldArmor:boss.armor,moveSpeed:d.speed*.75,attackRange:d.range,attackPeriod:d.period,weaponDamage:id==='purifier_flagship'?dps:dps*d.period/d.attacks,unitRadius:d.flying?1.2:.65,specialReady:Infinity,enemySpawn:stamp,cloaked:false});
  a.enemies.push(u.id);a.heroIds.push(id);
 });
 for(let i=0;i<counts[1];i++){
  const id=ARENA_ELITES[Math.floor(w.random()*ARENA_ELITES.length)],d=ELITES[id],base=SC2_UNITS[d.family],profile=continuousSpecialProfile(w.difficulty,'hydralisk','elite',stamp,{hp:base.maxHp,damage:base.attackDamage,period:base.attackPeriod,armor:base.armor}),source=sourceDetails(d.family),ratio=source.shields/(source.shields+base.maxHp),u=w.addUnit(d.family,'zerg',(i%5-2)*5,-5-Math.floor(i/5)*5,chapter+1);
  Object.assign(u,{eliteId:id,arenaElite:true,modelKey:d.model,enemyTier:'elite',enemyName:d.name+' · 竞技场精英',enemySpawn:stamp,hp:profile.hp*(1-ratio),maxHp:profile.hp*(1-ratio),shield:profile.hp*ratio,maxShield:profile.hp*ratio,armor:profile.armor,shieldArmor:profile.armor,weaponDamage:profile.damage,attackPeriod:profile.period,moveSpeed:base.movementSpeed,attackRange:base.attackRange,specialReady:Infinity});
  a.enemies.push(u.id);
 }
}
/** Enemy hero has only its plain weapon. Carrier's necessary children use the native carrier system. */
export function tickArenaHero(w:World,u:Entity,dt:number){
 if(!u.arenaHero||!u.heroId)return false;
 u.prev={x:u.x,z:u.z};const targets=w.allies().filter(v=>w.targetAllowed(u,v)).sort((a,b)=>distance(u,a)-distance(u,b)),target=targets[0];
 if(!target){u.action='idle';return true;}u.attackTarget=target.id;u.facing=u.attackFacing=Math.atan2(target.x-u.x,target.z-u.z);
 if(w.edgeDistance(u,target)<=u.attackRange&&w.hasAttackLine(u,target)){
  u.velocity={x:0,z:0};u.action='idle';
  if(u.heroId!=='purifier_flagship'&&w.time>=u.nextShotAt){u.nextShotAt=w.time+u.attackPeriod;u.lastShotAt=w.time;u.shotSequence=(u.shotSequence??0)+1;u.shotInterval=u.attackPeriod;u.action='attack';w.stats.shots++;w.visual('attack',u,target);w.hit(target,u.weaponDamage,[],HEROES[u.heroId].attacks,'zerg',.5,0,u.id,false,false,0,true);}
 }else locomote(u,target,u.moveSpeed,{x:0,z:0},dt,w.obstacles,w.mapHalf,w.terrain,.1);
 return true;
}
