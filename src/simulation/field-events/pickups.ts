import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import {FIELD_PICKUPS,FIELD_PICKUP_NAMES,type FieldPickupKind} from './state';
import {distance,clearLine} from '../movement/steering';
import {permanentEquipmentBody} from '../starship/eligibility';
export function fieldAttackFactor(w:World,u:Body){return u.owner==='terran'&&w.time<w.fieldEvents.attackUntil?1.15:1;}
export function fieldArmorFactor(w:World,u:Body){return u.owner==='terran'&&w.time<w.fieldEvents.armorUntil?1.15:1;}
export function fieldRooted(w:World,u:Entity){return (w.fieldEvents.roots.get(u.id)??0)>w.time&&w.fieldEvents.rootGenerations.get(u.id)===u.bornAt;}
export function restoreFieldRoots(w:World){for(const u of w.entities.values())if(fieldRooted(w,u)){const p=w.fieldEvents.rootPositions.get(u.id);if(p){u.x=p.x;u.z=p.z;u.prev={...p};u.velocity={x:0,z:0};}}}
export function spawnFieldPickup(w:World,kind:FieldPickupKind,point?:Point){
 if(!FIELD_PICKUPS.includes(kind)||w.fieldEvents.pickups.length>=3||w.phase!=='battle'||w.specialStages.active)return false;
 const p=point??w.eventPoint(6,18);
 if(w.terrain&&!w.terrain.canOccupy(p,.65)||!clearLine(w.anchor,p,.2,w.obstacles,w.terrain))return false;
 w.fieldEvents.pickups.push({id:w.nextId++,...p,kind,born:w.time});w.changed();return true;
}
export function collectFieldPickup(w:World,id:number){
 const s=w.fieldEvents,p=s.pickups.find(p=>p.id===id);
 if(!p||w.phase!=='battle'||w.paused||w.requiresPlayerDecision||distance(p,w.anchor)>2||!clearLine(p,w.anchor,0,w.obstacles,w.terrain))return false;
 s.pickups=s.pickups.filter(q=>q.id!==id);
 if(p.kind==='medical')for(const u of w.allies())if(u.hp>0&&permanentEquipmentBody(w,u)&&!u.mission&&!u.heldBy)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.15);
 if(p.kind==='firepower')s.attackUntil=w.time+30;
 if(p.kind==='armor')s.armorUntil=w.time+30;
 if(p.kind==='nuke')w.expedition.support.ammo++;
 if(p.kind==='root')for(const u of w.entities.values())if(u.owner==='zerg'&&u.hp>0&&u.encounter?.role!=='friend'&&u.fun?.faction!=='friend'&&u.fun?.faction!=='neutral'){s.roots.set(u.id,w.time+5);s.rootGenerations.set(u.id,u.bornAt);s.rootPositions.set(u.id,{x:u.x,z:u.z});}
 w.announce(FIELD_PICKUP_NAMES[p.kind]+(p.kind==='medical'?' · 恢复15%生命':p.kind==='nuke'?' · 核弹库存 +1':p.kind==='root'?' · 当前敌人定身5秒':' · +15%，持续30秒'));return true;
}
export function tickFieldPickups(w:World){
 const s=w.fieldEvents;
 for(const [id,until] of s.roots)if(until<=w.time||!w.entities.has(id)||s.rootGenerations.get(id)!==w.entities.get(id)?.bornAt){s.roots.delete(id);s.rootGenerations.delete(id);s.rootPositions.delete(id);}
 if(w.endless||w.diagnosticRun)return;
 while(w.stageElapsed>=s.nextPickup){s.nextPickup+=20;if(s.pickups.length<3&&w.random()<.2){let roll=w.random()*100;const weights=[30,25,25,2,18];const i=weights.findIndex(weight=>(roll-=weight)<0);spawnFieldPickup(w,FIELD_PICKUPS[Math.max(0,i)]);}}
 for(const p of [...s.pickups])collectFieldPickup(w,p.id);
}
export function fieldStatus(w:World){const s=w.fieldEvents;return [s.attackUntil>w.time?'火力 +15% · '+Math.ceil(s.attackUntil-w.time)+'s':'',s.armorUntil>w.time?'护甲 +15% · '+Math.ceil(s.armorUntil-w.time)+'s':''].filter(Boolean).join(' ｜ ');}
