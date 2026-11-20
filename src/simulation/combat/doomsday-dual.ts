import {doomsdayCombat,beginDoomsdayRound} from './doomsday-combat';
import {doomsdayHasHost} from './doomsday-refits';
import {doomsdayShotStyle} from './doomsday-presentation';
import {cloneCombatSource} from '../starship/runtime';
import {expeditionWeaponBonuses} from './expedition-combat';
import {launchMechanicalPacket,nativePayload} from './doomsday-weapons';
import type {World} from '../world';
import type {Body,Entity} from '../types';
export const dualViking=(w:World,u:Entity)=>u.unitType==='viking'&&doomsdayHasHost(w,'M-B07',u)&&!u.doomsday?.channel;
/** Weapon snapshots select a firing kit without changing the chassis, collision layer or real morph state. */
export function tickDoomsdayDual(w:World){
 for(const u of w.allies()){
  if(!dualViking(w,u)||u.heldBy||u.nativeModeUntil||u.modeTimer>0||(u.stoppedUntil??0)>w.time||(u.recoveryUntil??0)>w.time||w.missions.fleet.ceasefire)continue;
  const s=doomsdayCombat(u),channels=s.dual??={air:{nextReadyTick:w.tick,target:null},ground:{nextReadyTick:w.tick,target:null}};
  const choices=(['air','ground'] as const).map(channel=>{
   const proxy=cloneCombatSource(w,u);proxy.nativeMode=channel==='ground'?'viking_assault':undefined;proxy.activeWeapon=undefined;w.refreshStats(proxy);proxy.flying=u.flying;proxy.unitRadius=u.unitRadius;proxy.doomsday!.channel=channel;
   proxy.attackRange=channel==='air'?9:6;
   const target=channel==='ground'&&u.eliteId==='viking.1'?undefined:[...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])].filter(b=>b.hp>0&&!b.heldBy&&b.owner!==u.owner&&b.flying===(channel==='air')&&w.visibleTo(b,u.owner)&&w.edgeDistance(proxy,b)<=proxy.attackRange&&w.hasAttackLine(proxy,b)).sort((a,b)=>w.edgeDistance(proxy,a)-w.edgeDistance(proxy,b)||a.id-b.id)[0];
   return {channel,proxy,target};
  });
  const preferred=u.nativeMode==='viking_assault'?'ground':'air',main=choices.find(c=>c.channel===preferred&&c.target)??choices.find(c=>c.target);
  for(const {channel,proxy,target} of choices){
   channels[channel].target=target?.id??null;if(!target||w.tick<channels[channel].nextReadyTick)continue;
   const primary=channel===main?.channel,scale=primary?1:.55;
   channels[channel].nextReadyTick=w.tick+Math.max(1,Math.ceil(proxy.attackPeriod*60-1e-8));proxy.shotInterval=proxy.attackPeriod;proxy.weaponDamage*=scale;proxy.attackFacing=Math.atan2(target.x-u.x,target.z-u.z);
   proxy.shotSequence=u.shotSequence??0;
   if(primary){w.fire(proxy,target);u.shotSequence=proxy.shotSequence;u.eliteCombat=proxy.eliteCombat;u.lastShotAt=w.time;u.attackFacing=proxy.attackFacing;u.action='attack';
    const round=proxy.doomsday!.round;s.round=round;s.ready=proxy.doomsday!.ready;s.walked=proxy.doomsday!.walked;s.settled=proxy.doomsday!.settled;
   }else{
    proxy.shotSequence=(u.shotSequence??0)+1;u.shotSequence=proxy.shotSequence;
    // Explicitly listened-to assist channel: no repeat scheduler or armed proc.
    proxy.doomsday!.round={sequence:proxy.shotSequence,gun:false,crossfire:false,preheated:false,damageFactor:1,penetration:0,hits:channel==='air'?2:1,salvo:null,cards:{...w.expedition.doomsday!.ranks},special:'M-B07'};
    proxy.doomsday!.round.shotStyle=doomsdayShotStyle(w,proxy);
    const bonus=expeditionWeaponBonuses(w,proxy);bonus.bonuses=bonus.bonuses.map(b=>({...b,amount:b.amount*scale}));
    const payload=nativePayload(w,proxy,bonus.bonuses,bonus.shieldBonus*scale,1);proxy.doomsday!.round.budget=payload;
    launchMechanicalPacket(w,proxy,target,payload,1,'vikingAssist');w.visual('attack',proxy,target);
   }
  }
 }
}
