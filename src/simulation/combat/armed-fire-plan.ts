import {recordArmedAttackProc,armedProcChance} from './armed-procs';
import {ARMED_CARD_BY_ID} from '../../data/terran-armed-support';
import {SIEGE} from '../../data/sc2-units';
import {SOURCE_WEAPONS} from '../../data/expansion-units';
import {rankStats} from '../../data/ranks';
import {PLAYER_COMBAT_FACTOR} from '../../data/player-unit-adaptations';
import {equipmentCardDamage} from '../starship/card-effects';
import {armedFireModifiers} from './armed-modifiers';
import {armedOpenPoint} from './armed-nukes';
import type {ArmedShot} from './armed-support-state';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';

function axis(w:World,center:Point){const x=center.x-w.anchor.x,z=center.z-w.anchor.z,length=Math.hypot(x,z);return length?{x:x/length,z:z/length}:{x:Math.sin(w.anchor.facing),z:Math.cos(w.anchor.facing)};}
/** Prefer an intact legal pattern; finite inward folds are the last boundary case. */
function fieldPoints(w:World,center:Point,offsets:readonly Point[],air=false){
 const legal=(p:Point)=>air?Math.abs(p.x)<w.mapHalf&&Math.abs(p.z)<w.mapHalf:armedOpenPoint(w,p),f=axis(w,center);
 // Fold/shift along the enemy-facing axis. Terrain must never reverse a salvo.
 for(const scale of [1,.85,.65,.4,0])for(const back of [0,.5,1,2,3,4]){const points=offsets.map(p=>({x:center.x+f.x*(p.z*scale-back)+f.z*p.x*scale,z:center.z+f.z*(p.z*scale-back)-f.x*p.x*scale}));if(points.every(legal))return points;}
 throw Error('炮击中心没有合法落点');
}
export function planArmedField(w:World,id:'B04'|'P06',center:Point,firstTick=w.tick):ArmedShot[]{
 const modifiers=armedFireModifiers(w,id);
 if(id==='B04'){const p=ARMED_CARD_BY_ID.B04.params,radius=SIEGE.splash.at(-1)!.radius*modifiers.radius,offsets=Array.from({length:25},(_,i)=>({x:(i%5-2+.5*(Math.floor(i/5)%2))*radius,z:Math.floor(i/5)*radius})),points=fieldPoints(w,center,offsets),factor=rankStats(5).damage*PLAYER_COMBAT_FACTOR*p.factor*modifiers.damage;
  return points.map((point,index)=>({point,tick:firstTick+p.first+Math.floor(index/5)*modifiers.interval(p.rowGap)+[0,1,2,1,0][index%5]*modifiers.interval(p.beatGap),damage:equipmentCardDamage(w,SIEGE.damage*factor),bonuses:SIEGE.bonus.map(b=>({...b,amount:equipmentCardDamage(w,b.amount*factor)})),splash:SIEGE.splash.map(s=>({radius:s.radius*modifiers.radius,fraction:s.fraction})),radius,kind:'siege' as const})).sort((a,b)=>a.tick-b.tick);
 }
 const p=ARMED_CARD_BY_ID.P06.params,points=fieldPoints(w,center,Array.from({length:p.rows*p.columns},(_,i)=>({x:p.width*((i%p.columns)/(p.columns-1)-.5),z:Math.floor(i/p.columns)-p.length/2})));
 return points.map((point,index)=>({point,tick:firstTick+p.first+Math.floor(index/p.columns)*modifiers.interval(p.rowGap),damage:equipmentCardDamage(w,p.damage*modifiers.damage),radius:p.radius*modifiers.radius,kind:'barrier' as const}));
}
export function planArmedBarrage(w:World,target:Body,firstTick=w.tick){
 const p=ARMED_CARD_BY_ID.B01.params,modifiers=armedFireModifiers(w,'B01'),weapon=target.flying?SOURCE_WEAPONS.JavelinMissileLaunchers:SOURCE_WEAPONS.ThorsHammer,factor=rankStats(5).damage*PLAYER_COMBAT_FACTOR*modifiers.damage*weapon.attacks/p.pointsPerThor,radius=p.radius*modifiers.radius,points=fieldPoints(w,target,Array.from({length:p.thors*p.pointsPerThor},(_,i)=>({x:(i%3-1)*radius,z:(Math.floor(i/3)-1.5)*radius})),target.flying),nativePeriod=Math.ceil(weapon.attackPeriod/rankStats(5).attackSpeed/PLAYER_COMBAT_FACTOR*60),period=Math.max(nativePeriod+1,modifiers.interval(Math.ceil(weapon.attackPeriod/rankStats(5).attackSpeed/PLAYER_COMBAT_FACTOR*p.periodFactor*60)));
 const shots:ArmedShot[]=points.map((point,index)=>({point,tick:firstTick+index*modifiers.interval(p.shotGap),damage:equipmentCardDamage(w,weapon.attackDamage*factor),bonuses:weapon.bonusDamage.map(b=>({...b,amount:equipmentCardDamage(w,b.amount*factor)})),radius,kind:target.flying?'thor-air':'thor-ground'}));return {shots,period};
}
export function recordArmedFire(w:World,u:Entity){recordArmedAttackProc(w,u);const a=w.expedition.support.armed,p=ARMED_CARD_BY_ID.B01.params;if(!a?.ranks.B01||w.tick<(a.readyTick.B01??0)||u.team!=='player'||u.temporary||u.summonKind||u.fun||u.encounter||u.mission||u.arenaHero||u.arenaElite||w.starship.projections.has(u.id)||w.starship.members.get(u.id)?.independent)return;
 if(w.random()>=armedProcChance('B01'))return;
 a.readyTick.B01=w.tick+p.cd*60;a.barrage={activeUntil:w.tick+600,nextRowTick:w.tick+p.first,remainingRows:p.rows};}
