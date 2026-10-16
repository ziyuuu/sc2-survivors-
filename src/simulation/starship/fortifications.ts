import {equipmentPresentation} from './presentation';
import type {World} from '../world';
import type {Body,Fortification,Point} from '../types';
import {clearLine,distance} from '../movement/steering';
import {activeEquipmentEffects,lockEquipmentSource} from './modules';

export type EquipmentFortKind='bunker'|'turret_terran'|'turret_zerg'|'turret_protoss'|'cover';
export interface EquipmentFortRecord {source:string;stage:string;facing:number;lastShot:number;damagedAt:number}
/** B97563 native structure values; the existing game bunker keeps its established rules. */
export const EQUIPMENT_FORTS={
 bunker:{hp:900,shield:0,armor:2,radius:1.6,range:10,period:.8,damage:18,armored:0,air:true,biological:false,width:3.2},
 turret_terran:{hp:150,shield:0,armor:1,radius:1,range:6,period:.8,damage:18,armored:0,air:true,biological:false,width:2},
 turret_zerg:{hp:300,shield:0,armor:2,radius:.875,range:7,period:1.85,damage:25,armored:5,air:false,biological:true,width:1.75},
 turret_protoss:{hp:150,shield:150,armor:1,radius:1,range:7,period:1.25,damage:20,armored:0,air:true,biological:false,width:2},
 // Existing original barrier art, with the source destructible-debris durability; no aura or ray occlusion.
 cover:{hp:2000,shield:0,armor:3,radius:1.4,range:0,period:0,damage:0,armored:0,air:false,biological:false,width:2.8},
} as const;
const stage=(w:World)=>w.endless?'endless:'+w.endless.round:'campaign:'+w.stage;
function sites(w:World,fortified:boolean):{kind:EquipmentFortKind;point:Point}[]|undefined {
 const turret=('turret_'+w.expedition.race) as EquipmentFortKind;
 const pattern:{kind:EquipmentFortKind;x:number;z:number}[]=fortified?[{kind:'bunker',x:0,z:-4.8},{kind:turret,x:-3.6,z:0},{kind:turret,x:3.6,z:0},{kind:'cover',x:-3.6,z:3.2},{kind:'cover',x:3.6,z:3.2}]:[{kind:'bunker',x:0,z:-4.8}];
 const occupied:Body[]=[...w.entities.values(),...w.fortifications.values(),...w.expansionHives.values(),...w.pods.filter(p=>['falling','active','opening'].includes(p.status)),...w.economicTargets.values()].filter(b=>b.hp>0&&!b.flying);if(w.hive?.hp)occupied.push(w.hive);
 const heading=Math.atan2(w.marchDirection?.x??0,w.marchDirection?.z??1);
 for(const offset of [0,5,10])for(let n=0;n<12;n++){
  const angle=heading+n*Math.PI/6,s=Math.sin(angle),c=Math.cos(angle),center={x:w.anchor.x-s*offset,z:w.anchor.z-c*offset};
  const front={x:center.x+s*7,z:center.z+c*7};if(!clearLine(center,front,1.8,w.obstacles,w.terrain))continue;
  const group=pattern.map(p=>({kind:p.kind,point:{x:center.x+p.x*c+p.z*s,z:center.z-p.x*s+p.z*c}}));
  if(group.some(({kind,point})=>{const r=EQUIPMENT_FORTS[kind].radius;return Math.abs(point.x)+r>=w.mapHalf||Math.abs(point.z)+r>=w.mapHalf||!clearLine(center,point,r,w.obstacles,w.terrain)||occupied.some(b=>distance(b,point)<b.unitRadius+r+.25);}))continue;
  return group;
 }return undefined;
}
export function deployEquipmentFortifications(w:World){if(!w.starship.enabled||w.phase!=='battle'||!w.starship.account.run)return;
 for(const e of activeEquipmentEffects(w).filter(e=>e.key==='stage_bunker')){const receipt='fort:'+stage(w)+':'+e.source;if(w.starship.account.run.receipts.has(receipt))continue;const fortified=activeEquipmentEffects(w).some(f=>f.source===e.source&&f.key==='fortification'),group=sites(w,fortified);if(!group)continue;
  for(const {kind,point} of group){const t=EQUIPMENT_FORTS[kind],id=w.nextId++,fort:Fortification={id,...point,kind,owner:'terran',team:'player',race:kind==='bunker'?'terran':w.expedition.race,hp:t.hp,maxHp:t.hp,armor:t.armor,unitRadius:t.radius,flying:false,attributes:['Armored','Structure',t.biological?'Biological':'Mechanical'],nextActionAt:w.time,shield:t.shield,maxShield:t.shield};w.fortifications.set(id,fort);equipmentPresentation(w,'fort-deploy',fort,undefined,kind);w.starship.forts.set(id,{source:e.source,stage:stage(w),facing:0,lastShot:-Infinity,damagedAt:-Infinity});}
  w.starship.account.run.receipts.add(receipt);lockEquipmentSource(w,e);w.hash.invalidatePlanes();
 }
}
export function clearEquipmentFortifications(w:World){for(const id of w.starship.forts.keys())w.fortifications.delete(id);w.starship.forts.clear();w.hash.invalidatePlanes();}
export function tickEquipmentFortifications(w:World,dt:number){deployEquipmentFortifications(w);
 for(const [id,record] of w.starship.forts){const fort=w.fortifications.get(id);if(!fort||fort.hp<=0)continue;const t=EQUIPMENT_FORTS[fort.kind as EquipmentFortKind];if(fort.kind==='turret_protoss'&&w.time-record.damagedAt>=10)fort.shield=Math.min(fort.maxShield??0,(fort.shield??0)+2*dt);if(fort.kind==='turret_zerg')fort.hp=Math.min(fort.maxHp,fort.hp+.273*dt);if(!t.damage||fort.nextActionAt>w.time+1e-8)continue;
  const target=[...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])].filter(b=>b.owner!==fort.owner&&b.hp>0&&(!b.flying||t.air)&&w.visibleTo(b,fort.owner)&&distance(fort,b)<=t.range+fort.unitRadius+b.unitRadius&&(!w.terrain||w.terrain.lineOfFire(fort,b,false,b.flying))).sort((a,b)=>distance(fort,a)-distance(fort,b)||a.id-b.id)[0];if(!target)continue;
  record.facing=Math.atan2(target.x-fort.x,target.z-fort.z);record.lastShot=w.time;fort.nextActionAt=w.time+t.period;w.hit(target,t.damage,t.armored?[{attribute:'Armored',amount:t.armored}]:[],1,fort.owner,.5,0,fort.id);equipmentPresentation(w,'fort-shot',fort,target,fort.kind);w.effect('shot',fort,target,fort.kind==='turret_protoss'?.2:.1,.16);w.stats.shots++;
 }
}
/** Structures use their own shield pool and never receive the squad's equipment defense. */
export function equipmentFortDamage(w:World,target:Body,raw:number,hits:number,minimum:number,penetration:number,armor:number,shieldBonus:number,shieldOnly:boolean){const record=w.starship.forts.get(target.id),fort=w.fortifications.get(target.id);if(!record||!fort)return undefined;record.damagedAt=w.time;let health=0;
 for(let n=0;n<hits;n++){let amount=raw;if((fort.shield??0)>0&&amount>0){const shieldHit=Math.max(minimum,amount+shieldBonus),absorbed=Math.min(fort.shield!,shieldHit);fort.shield!-=absorbed;amount=Math.max(0,shieldHit-absorbed-shieldBonus);}if(amount>0&&!shieldOnly)health+=Math.max(minimum,amount-armor*(1-penetration));}return Math.min(fort.hp,health);
}
