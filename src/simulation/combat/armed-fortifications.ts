import {armedContact,armedControl} from './armed-nodes';
import {ARMED_CARD_BY_ID} from '../../data/terran-armed-support';
import type {ArmedDeployment} from './armed-support-state';
import type {Entity} from '../types';
import type {Body} from '../types';
import type {World} from '../world';
import {equipmentPresentation} from '../starship/presentation';
import {grantArmedShield} from './armed-fields';
import {clearLine} from '../movement/steering';
import {hitFrom} from '../observation';
import {equipmentCardDamage} from '../starship/card-effects';

export const armedFortCard=(id:string)=>['W05','W07','B05','P04','P05','O03'].includes(id);
export function landArmedFort(w:World,d:ArmedDeployment){
 if(!armedFortCard(d.cardId))return;
 d.endTick=w.tick+d.lifeTicks!;const kind=d.cardId==='O03'?'planetary':d.cardId==='P05'?'supply_depot':d.cardId==='W07'?'turret_terran':d.cardId==='P04'?'beacon':'barracks';
 w.fortifications.set(d.id,{id:d.id,...d.point,hp:d.hp,maxHp:d.maxHp,armor:d.armor,unitRadius:d.radius,flying:false,attributes:['Armored','Mechanical','Structure'],owner:'terran',race:'terran',team:'player',kind,nextActionAt:w.time,supportUntil:d.endTick/60,supportOrigin:{cardId:d.cardId,castId:d.castId,slot:d.slot,landTick:w.tick}});
 if(d.cardId==='W05'){tauntArmed(w,w.fortifications.get(d.id)!,d.tauntRadius!,ARMED_CARD_BY_ID.W05.params.tauntSeconds,true);}
 if(d.cardId==='W07')w.fortifications.get(d.id)!.nextActionAt=(d.landTick+ARMED_CARD_BY_ID.W07.params.first-ARMED_CARD_BY_ID.W07.params.land)/60;
}
export function tickArmedFortActions(w:World){
 const a=w.expedition.support.armed!;
 for(const d of a.deployments){if(d.phase!=='active'||w.tick>=d.endTick)continue;const fort=w.fortifications.get(d.id);if(!fort||fort.hp<=0)continue;
  if(d.cardId==='W07'&&w.time+1e-8>=fort.nextActionAt){const p=ARMED_CARD_BY_ID.W07.params,target=[...w.entities.values()].filter(e=>e.owner==='zerg'&&e.hp>0&&!e.flying&&w.visibleTo(e,'terran')&&Math.hypot(e.x-fort.x,e.z-fort.z)<=p.range+e.unitRadius&&clearLine(fort,e,.1,w.obstacles,w.terrain)).sort((a,b)=>Math.hypot(a.x-fort.x,a.z-fort.z)-Math.hypot(b.x-fort.x,b.z-fort.z)||a.id-b.id)[0];if(target){fort.lastShotTick=w.tick;fort.facing=Math.atan2(target.x-fort.x,target.z-fort.z);equipmentPresentation(w,'fort-shot',fort,target,fort.kind,undefined,true);fort.nextActionAt=w.time+p.gap/60;hitFrom(w,'armed.W07',target,equipmentCardDamage(w,p.damage[d.rank-1]),[],1,'terran',0);w.effect('shot',fort,target,.1,.16);w.stats.shots++;}else fort.nextActionAt=w.time+1/60;
  }else if(d.cardId==='P04'){
   const p=ARMED_CARD_BY_ID.P04.params;d.shielded??=[];for(const u of w.allies())if(!u.summonKind&&!d.shielded.includes(u.id)&&Math.hypot(u.x-fort.x,u.z-fort.z)<=d.impactRadius!+u.unitRadius){d.shielded.push(u.id);grantArmedShield(w,u,'P04',Math.min(p.max,Math.max(p.min,u.maxHp*p.shield))*(d.shieldFactor??1),w.tick+p.duration*60);}
  }
 }
}
export function tauntArmed(w:World,source:Body,radius:number,seconds:number,groundOnly=false){for(const u of w.entities.values())if(u.owner==='zerg'&&u.hp>0&&(!groundOnly||!u.flying)&&!u.enemyTier&&w.targetAllowed(u,source)&&Math.hypot(u.x-source.x,u.z-source.z)<=radius+u.unitRadius){const status=w.expedition.support.armed!.unitStatus[u.id]??={};status.taunt={sourceId:source.id,untilTick:w.tick+Math.ceil(seconds*60)};u.attackTarget=source.id;u.thinkAt=w.time;if(w.fortifications.get(source.id)?.supportOrigin?.cardId==='W05'){armedContact(w,'W05',u);armedControl(w,source,u,w.tick+Math.ceil(seconds*60));}}}
export function armedTauntTarget(w:World,u:Entity){const taunt=w.expedition.support.armed?.unitStatus[u.id]?.taunt;if(!taunt||taunt.untilTick<=w.tick)return;const target=w.body(taunt.sourceId);return target&&target.hp>0&&w.targetAllowed(u,target)?target:undefined;}
export function armedFortAura(w:World,u:Entity){return (w.expedition.support.armed?.unitStatus[u.id]?.fortAuraUntil??0)>w.tick?ARMED_CARD_BY_ID.P05.params:undefined;}
export function tickArmedFortAuras(w:World){
 const a=w.expedition.support.armed;if(!a)return;const p=ARMED_CARD_BY_ID.P05.params,forts=[...w.fortifications.values()].filter(f=>f.supportOrigin?.cardId==='P05'&&f.hp>0&&w.time<f.supportUntil!);
 if(forts.length)for(const u of w.entities.values())if(u.team==='player'&&u.hp>0&&!u.summonKind&&forts.some(f=>Math.hypot(u.x-f.x,u.z-f.z)<=p.radius+u.unitRadius)){const status=a.unitStatus[u.id]??={},first=(status.fortAuraUntil??0)<=w.tick;status.fortAuraUntil=w.tick+Math.ceil(p.linger*60);if(first)w.refreshStats(u);}
 for(const [id,status]of Object.entries(a.unitStatus)){const u=w.entities.get(Number(id));if(!u||u.hp<=0){delete a.unitStatus[Number(id)];continue;}if(status.taunt&&(status.taunt.untilTick<=w.tick||!(w.body(status.taunt.sourceId)?.hp??0))){if(u.attackTarget===status.taunt.sourceId){u.attackTarget=null;u.thinkAt=w.time;}delete status.taunt;}if(status.fortAuraUntil!==undefined&&status.fortAuraUntil<=w.tick){delete status.fortAuraUntil;w.refreshStats(u);}if(!Object.keys(status).length)delete a.unitStatus[u.id];}
}
