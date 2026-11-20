import {ZERG_SIX} from '../../src/data/zerg-six';
import type {ZergSixFamily} from '../../src/data/zerg-six';
import type {World} from '../../src/simulation/world';
import type {Entity} from '../../src/simulation/types';
import {SC2_UNITS,type ZergType} from '../../src/data/sc2-units';

type Opponent = [ZergType, x:number, z:number, hp:number, tier?:Entity['enemyTier']];
const roaches=(n:number,front:number,hp:number):Opponent[]=>Array.from({length:n},(_,i)=>['roach',(i%3-1)*1.05,front+Math.floor(i/3)*1.25,hp]);
export const scenes:Record<ZergSixFamily,{allies:[number,number][];enemies:Opponent[];focus:string}>={
 aberration:{allies:[[0,.7]],enemies:[...roaches(5,2.15,80),['zergling',1.5,1.8,25],['ultralisk',0,4.6,240]],
  focus:'观察横扫多个地面敌人、受击后反击和低血量甲壳。向后移动可中断前摇并跟队。'},
 devourer:{allies:[[-1,0],[1,0]],enemies:[['mutalisk',-.8,4.7,100],['mutalisk',.8,4.7,110],['corruptor',0,6.4,200],...roaches(6,4.6,96)],
  focus:'看同层酸爆、三枚齐射和腐蚀层数。空军倒下后会转火地面，撤远可以等腐蚀到期。'},
 infestor:{allies:[[-1.65,-.35],[0,0],[1.65,-.35]],enemies:[['zergling',-1.1,5.1,12],['roach',0,5.1,17],['zergling',1.1,5.1,15],
  ['hydralisk',2.5,5.8,21,'elite'],['roach',-2.65,5.8,24],['queen',0,7.1,150,'boss'],['ultralisk',3.5,7.25,210,'lord'],...roaches(3,7.3,28)],
  focus:'看感染跳伤、正常掉落与限时受控体。精英控制更短，首领和领主不会转化。'},
 swarm_host:{allies:[[-2,-1],[0,0],[2,-1]],enemies:[...roaches(8,7.5,100),['ultralisk',0,10.2,270]],
  focus:'观察钻地和实物蝗虫分批出生、射击、死亡与到期。移动时母体会出土跟队。'},
 viper:{allies:[[-1.7,.15],[1.7,.15]],enemies:[...roaches(7,5.5,70),['ultralisk',0,6.15,190,'boss'],['hydralisk',-2.6,6.3,140,'elite'],['hydralisk',1.6,6.6,235,'lord']],
  focus:'观察短拉拢、持续跳伤和喷吐。首领及领主免疫位移，敌群留在后排外。'},
 brood_lord:{allies:[[-1,0],[1,0]],enemies:[...roaches(9,7.8,95),['ultralisk',0,8.2,240,'elite'],['mutalisk',3.7,7.4,150]],
  focus:'每轮有效地面炮击至多生一只巢虫。观察追击和到期，以及飞行目标不受地面炮击。'},
};
export function placeZergSixTrial(w:World,family:ZergSixFamily){
 w.missions.enabled=w.encounters.enabled=false;
 w.entities.clear();
 w.pods=[];
 w.expedition.ledger=[];
 for(const g of w.expedition.building?.groups??[])g.enabled=false;
 const anchor={x:w.anchor.x,z:w.anchor.z},scene=scenes[family];
 for(const [x,z] of scene.allies){
  const u=w.addUnit(family,'terran',anchor.x+x,anchor.z+z);
  u.facing=u.attackFacing=0;
  if(family==='aberration')u.hp=u.maxHp*.57;
 }
 if(family==='viper')w.addUnit('queen','terran',anchor.x,anchor.z-2.8);
 for(const [type,x,z,hp,tier] of scene.enemies){
  const enemy=w.addUnit(type,'zerg',anchor.x+x,anchor.z+z);
  enemy.hp=enemy.maxHp=hp;
  enemy.facing=enemy.attackFacing=Math.PI;
  enemy.armor=type==='ultralisk'?3:type==='roach'||type==='corruptor'?2:0;
  enemy.enemyTier=tier;
  if(tier){
   enemy.enemyName=SC2_UNITS[type].zh+' · '+({elite:'精英',boss:'首领',lord:'领主'}[tier]);
   enemy.specialReady=w.time+30;
   if(type==='queen'&&(tier==='boss'||tier==='lord'))enemy.corrosiveBileReady=enemy.specialReady;
   enemy.specialDamageMultiplier=.5;
  }
 }
}
export function readZergTrial(w:World){
 return {time:w.time,tick:w.tick,damage:w.stats.damage,kills:w.stats.kills,shots:w.stats.shots,anchor:{x:w.anchor.x,z:w.anchor.z},
  drops:w.pickups.length,projectiles:w.weaponFlights.length,clouds:w.expedition.zergSixClouds?.length??0,
  entities:[...w.entities.values()].map(u=>({id:u.id,type:u.unitType,name:u.enemyName,owner:u.owner,hp:u.hp,maxHp:u.maxHp,x:u.x,z:u.z,
   mode:u.zergSix?.burrow,cd:u.zergSix?.ready,cast:u.zergSix?.cast?.kind,temp:u.zergSix?.temp,marks:u.zergSix?.infections?.length??0,corrosion:u.zergSix?.corrosion?.layers??0,
   shell:u.zergSix?.shellUntil,immune:u.zergSix?.immuneUntil,tier:u.enemyTier,round:u.shotSequence??0})),
  families:[...ZERG_SIX],
 };
}
