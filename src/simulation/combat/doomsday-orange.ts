import {SC2_UNITS,SIEGE} from '../../data/sc2-units';
import {DOOMSDAY_CARD_BY_ID as C} from '../../data/terran-doomsday';
import {scheduleDoomsdaySword,tickDoomsdaySwords} from './doomsday-melee';
import {terranEliteGrowth} from '../../data/terran-elites';
import {PLAYER_COMBAT_FACTOR} from '../../data/player-unit-adaptations';
import {doomsdayCombat} from './doomsday-combat';
import {doomsdayHasHost} from './doomsday-refits';
import {launchMechanicalPacket,mechanicalRoundKey} from './doomsday-weapons';
import {queueDoomsdayArea,doomsdayStationRound} from './doomsday-nodes';
import {mechanicalRank} from './doomsday-roster';
import type {World} from '../world';
import type {Entity,Body,Point} from '../types';
import type {DoomsdayPayload} from './doomsday-state';
export const DOOMSDAY_DRIVERS=['raynor','tychus','nova','swann','tosh'] as const;
export function armoredDriver(w:World,u:Entity){return u.team==='player'&&!!u.heroId&&(DOOMSDAY_DRIVERS as readonly string[]).includes(u.heroId)&&!!w.expedition.doomsday?.ranks['M-O01'];}
export function giantKind(u:Entity){return u.doomsday?.special==='M-O02'?'thor':u.doomsday?.special==='M-O03'?'tank':null;}
/** Same naked V-level reference curves as the approved source probe, without spawning another World. */
export function giantBaseline(kind:'thor'|'tank'){
 const growth=terranEliteGrowth(kind==='thor'?'thor.3':'tank.3',5),d=kind==='thor'?SC2_UNITS.thor:{...SC2_UNITS.tank,attackDamage:SIEGE.damage,attacks:1,attackPeriod:SIEGE.period};
 const damage=d.attackDamage*PLAYER_COMBAT_FACTOR*growth.damage,period=d.attackPeriod/PLAYER_COMBAT_FACTOR/growth.attackSpeed;
 return {damage,period,dps:damage*d.attacks/period,hp:d.maxHp*PLAYER_COMBAT_FACTOR*growth.health};
}
export function applyDoomsdayOrangeStats(w:World,u:Entity){
 const kind=giantKind(u);if(!kind)return;
 const base=giantBaseline(kind),ordinary=w.growth(u),native=kind==='thor'?SC2_UNITS.thor:u.mode==='siege'?{...SC2_UNITS.tank,attackDamage:SIEGE.damage,attackPeriod:SIEGE.period}:SC2_UNITS.tank;
 const hpFactor=u.maxHp/(native.maxHp*PLAYER_COMBAT_FACTOR*ordinary.health),damageFactor=u.weaponDamage/(native.attackDamage*PLAYER_COMBAT_FACTOR*ordinary.damage),speedFactor=(native.attackPeriod/PLAYER_COMBAT_FACTOR/ordinary.attackSpeed)/u.attackPeriod,lost=u.maxHp-u.hp,polar=w.expedition.doomsday?.ranks['M-N03']?1.3:1;
 u.maxHp=base.hp*2.5*hpFactor*polar;u.hp=Math.max(0,u.maxHp-lost);
 if(kind==='thor'){u.weaponDamage=base.dps*2.2*9*.5/9*damageFactor*polar;u.attackPeriod=1/speedFactor;}
 else if(u.mode==='siege'){u.weaponDamage=base.damage*2.2*damageFactor*polar;u.attackPeriod=base.period/speedFactor;}
 doomsdayCombat(u).visualScale=kind==='thor'?C['M-O02'].params.scale:C['M-O03'].params.scale;
}
export function refreshHeroArmor(w:World,u:Entity){
 if(!armoredDriver(w,u))return;const s=doomsdayCombat(u),max=u.maxHp*.25;
 s.heroArmor={max,remaining:s.heroArmor?Math.min(max,s.heroArmor.remaining):max};s.visualScale=1.2;
 u.attributes=u.attributes.filter(a=>a!=='Biological');if(!u.attributes.includes('Mechanical'))u.attributes.push('Mechanical');
}
export function absorbHeroArmor(w:World,u:Entity,amount:number,sourceId?:number){const shield=u.doomsday?.heroArmor;if(!shield||amount<=0)return amount;const n=Math.min(amount,shield.remaining);shield.remaining-=n;if(n)w.visual(shield.remaining?'shield-hit':'shield-break',u,u,undefined,undefined,{shieldDamage:n,hitSourceId:sourceId,doomsdayEffect:'hero-armor'});return amount-n;}
export function giantFireBlocked(w:World,u:Entity){return giantKind(u)==='thor'&&w.tick<(u.doomsday?.giant?.nextReadyTick??0);}
export function fireDoomsdayOrange(w:World,u:Entity,target:Body,bonuses:DoomsdayPayload['bonuses'],shieldBonus:number,crit:number){
 const kind=giantKind(u);if(!kind||kind==='tank'&&u.mode!=='siege')return false;
 const s=doomsdayCombat(u),r=s.round!,state=s.giant??={nextReadyTick:0,lastFireTick:w.tick,rounds:0,cannons:0,pendingCannon:false},period=Math.max(1,Math.ceil(u.attackPeriod*60-1e-8));
 if(w.tick-state.lastFireTick>=180){state.rounds=state.cannons=0;state.pendingCannon=false;state.cannonPayload=undefined;state.pendingNuke=undefined;}
 state.lastFireTick=w.tick;state.nextReadyTick=w.tick+period;
 const payload:DoomsdayPayload={damage:u.weaponDamage*r.damageFactor,bonuses:bonuses.map(b=>({...b,amount:b.amount*r.damageFactor})),hits:1,shieldBonus,crit,enemyFactor:w.enemyDamageFactor(u)};r.budget=payload;r.scheduled=true;
 if(kind==='thor'){
  state.rounds++;
  if(r.melee)scheduleDoomsdaySword(w,u,payload,period,mechanicalRank(w,u,'M-B03'));
  else for(let i=0;i<4;i++)launchMechanicalPacket(w,u,target,payload,.25,'barrage',{startTick:w.tick+Math.floor(i*3*period/60),speed:28});
  if(state.rounds%3===0&&!state.pendingCannon){state.pendingCannon=true;state.cannonReadyTick=w.tick+Math.floor(12*period/60);state.cannonPayload=structuredClone(payload);}
 }else scheduleFortress(w,u,target,payload,w.tick,true);
 doomsdayStationRound(w,u,target,payload);
 const repeat=mechanicalRank(w,u,'M-B03');for(let j=1;j<=repeat;j++){
  const tick=w.tick+Math.floor(j*period/(repeat+1));
  if(kind==='tank')scheduleFortress(w,u,target,{...payload,damage:payload.damage*.2,bonuses:payload.bonuses.map(b=>({...b,amount:b.amount*.2})),shieldBonus:payload.shieldBonus*.2},tick,false);
  else if(!r.melee)for(let i=0;i<4;i++)launchMechanicalPacket(w,u,target,payload,.05,'repeat',{startTick:tick+Math.floor(i*3*period/60),speed:28});
 }
 return true;
}
function groundTarget(w:World,u:Entity,preferred?:Body){return preferred&&!preferred.flying&&preferred.hp>0?preferred:[...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])].filter(b=>b.hp>0&&!b.flying&&b.owner!==u.owner&&!b.heldBy&&w.visibleTo(b,u.owner)&&w.edgeDistance(u,b)<=u.attackRange&&w.hasAttackLine(u,b)).sort((a,b)=>w.edgeDistance(u,a)-w.edgeDistance(u,b)||a.id-b.id)[0];}
function fireGiantCannon(w:World,u:Entity,preferred:Body|undefined,payload:DoomsdayPayload,dueTick:number){
 const state=u.doomsday!.giant!,target=groundTarget(w,u,preferred);if(!target)return;
 state.pendingCannon=false;state.cannonPayload=undefined;state.cannons++;
 // A barrage is 1/18 of the entire 9-round budget; each cannon is 1/10, the nuke 1/5.
 queueDoomsdayArea(w,u,payload,'cannon',[target],SIEGE.splash.at(-1)!.radius,1.8,dueTick);
 if(state.cannons===3){state.cannons=0;state.pendingNuke={tick:dueTick+6,point:{x:target.x,z:target.z},payload:structuredClone(payload)};}
}
export function scheduleFortress(w:World,u:Entity,target:Body,payload:DoomsdayPayload,startTick:number,native:boolean){
 const f={x:Math.sin(u.attackFacing),z:Math.cos(u.attackFacing)},right={x:f.z,z:-f.x},projection=(target.x-u.x)*f.x+(target.z-u.z)*f.z,C={x:u.x+projection*f.x,z:u.z+projection*f.z};
 for(let row=0;row<3;row++){
  const points=Array.from({length:5},(_,column)=>({x:C.x+(row-1)*1.8*f.x+(column-2)*1.8*right.x,z:C.z+(row-1)*1.8*f.z+(column-2)*1.8*right.z})).filter(p=>Math.abs(p.x)<=w.mapHalf&&Math.abs(p.z)<=w.mapHalf&&(p.x-u.x)*f.x+(p.z-u.z)*f.z>0&&Math.hypot(p.x-u.x,p.z-u.z)<=u.attackRange&&Math.hypot(p.x-u.x,p.z-u.z)>=SIEGE.minRange&&(!w.terrain||w.terrain.lineOfFire(u,p,false,false)));
  queueDoomsdayArea(w,u,payload,'fortress',points,.6,1/3,startTick+row*4,{native,primaryTarget:target.id,forward:f,range:u.attackRange,minimumRange:SIEGE.minRange,round:mechanicalRoundKey(u),row,pendingLaunch:!native,launchTick:startTick,pierce:row===1&&!!u.doomsday?.round?.pierce});
 }
}
export function tickDoomsdayGiants(w:World){
 tickDoomsdaySwords(w);
 for(const u of w.allies())if(giantKind(u)==='thor'&&u.hp>0&&!u.heldBy&&!u.nativeModeUntil&&u.modeTimer<=0&&(u.stoppedUntil??0)<=w.time&&!w.missions.fleet.ceasefire){
  const state=u.doomsday?.giant;if(state&&state.pendingCannon&&w.tick>=(state.cannonReadyTick??0)&&state.cannonPayload)fireGiantCannon(w,u,undefined,state.cannonPayload,w.tick);
  if(state?.pendingNuke&&w.tick>=state.pendingNuke.tick){const n=state.pendingNuke;queueDoomsdayArea(w,u,n.payload,'nuke',[n.point],2.5,3.6,w.tick+24);state.pendingNuke=undefined;}
  if(giantFireBlocked(w,u))continue;
  const target=[...w.entities.values()].filter(b=>b.hp>0&&b.owner!==u.owner&&!b.heldBy&&w.visibleTo(b,u.owner)&&w.targetAllowed(u,b)&&w.edgeDistance(u,b)<=u.attackRange&&w.hasAttackLine(u,b)).sort((a,b)=>w.edgeDistance(u,a)-w.edgeDistance(u,b)||a.id-b.id)[0];if(target)w.fire(u,target);
 }
}
