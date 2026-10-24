import {equipmentPresentation} from './presentation';
import type {World} from '../world';
import type {Body,Entity} from '../types';
import {tacticalCard} from '../../data/unique-support';
import {activeEquipmentEffects,equipmentValue} from './modules';
import {permanentEquipmentBody} from './eligibility';

/** Called only after a real manual action commits. A refresh grants no energy, charges or uses. */
export function equipmentManualSucceeded(w:World,used:string){
 equipmentCommand(w,false);const cooldown=equipmentValue(w,'manual_reset');if(!cooldown||w.time<(w.starship.numbers.get('manual-reset-ready')??0))return;
 const candidates:{id:string;ready:number;reset:()=>void}[]=[];
 for(const [id,record] of w.heroes){const u=w.heroEntity(id);if(u&&u.hp>0)candidates.push({id:'hero:'+id,ready:record.skillReady,reset:()=>{record.skillReady=w.time;}});}
 candidates.push({id:'dash',ready:w.dashReady,reset:()=>{w.dashReady=w.time;}},{id:'detection',ready:w.expedition.detectionReady,reset:()=>{w.expedition.detectionReady=w.time;}});
 if(w.talent('airlift'))candidates.push({id:'transfer',ready:w.airliftReady,reset:()=>{w.airliftReady=w.time;}});
 const support=w.expedition.support.unique;if(support.levels[tacticalCard(w.expedition.race)])candidates.push({id:'tactical',ready:support.ready,reset:()=>{support.ready=w.time;}});
 const stalkers=w.allies().filter(u=>u.unitType==='stalker'&&!u.temporary&&!u.summonKind);if(stalkers.length&&w.expedition.tech.blink)candidates.push({id:'blink',ready:Math.max(...stalkers.map(u=>u.abilityReady??0)),reset:()=>{for(const u of stalkers)u.abilityReady=w.time;}});
 const target=candidates.filter(c=>c.id!==used&&c.ready>w.time+1e-8).sort((a,b)=>b.ready-a.ready||a.id.localeCompare(b.id))[0];if(!target)return;
 target.reset();for(const ally of w.allies())if(ally.hp>0)equipmentPresentation(w,'cooldown-reset',ally,undefined,target.id);w.starship.numbers.set('manual-reset-ready',w.time+cooldown);w.changed();
}
export function equipmentCommand(w:World,movement:boolean){
 if(!w.starship.enabled||w.specialStages.active?.kind==='dodge')return;w.starship.numbers.set('last-command',w.time);
 const effect=activeEquipmentEffects(w).find(e=>e.key==='dominance');if(!movement||!effect||w.time<(w.starship.numbers.get('dominance-ready')??0))return;
 w.starship.numbers.set('dominance-ready',w.time+effect.values[3]);w.starship.numbers.set('dominance-phase',w.time+effect.values[0]);w.starship.numbers.set('dominance-pending',1);
}
export function equipmentCommandArrived(w:World){if(!w.starship.numbers.get('dominance-pending'))return;w.starship.numbers.delete('dominance-pending');const e=activeEquipmentEffects(w).find(e=>e.key==='dominance');if(!e)return;w.starship.numbers.set('dominance-fire',w.time+e.values[1]);w.starship.numbers.set('dominance-fire-active',1);for(const u of w.allies())w.refreshStats(u);}
export function equipmentDirectDodge(w:World,u:Entity){return permanentEquipmentBody(w,u)&&(w.starship.numbers.get('dominance-phase')??0)>w.time;}
export function equipmentIgnoreContact(w:World,a:Body,b:Body){if(!w.starship.enabled||(w.starship.numbers.get('dominance-phase')??0)<=w.time||a.attributes.includes('Structure')||b.attributes.includes('Structure'))return false;const first=w.entities.get(a.id),second=w.entities.get(b.id);return !!first&&permanentEquipmentBody(w,first)||!!second&&permanentEquipmentBody(w,second);}
export function equipmentControlBoost(w:World,u:Entity){const source=u.summonKind==='interceptor'?w.entities.get(u.summonOwnerId!):u;if(!source||!permanentEquipmentBody(w,source)||(w.starship.numbers.get('konstant-until')??0)<=w.time)return undefined;return activeEquipmentEffects(w).find(e=>e.key==='konstant');}
export function equipmentPermanentDeath(w:World,u:Entity){if(!permanentEquipmentBody(w,u))return;const effect=activeEquipmentEffects(w).find(e=>e.key==='konstant');if(!effect||w.time<(w.starship.numbers.get('konstant-ready')??0)||w.random()>=effect.values[0])return;
 w.starship.numbers.set('konstant-ready',w.time+effect.values[2]);w.starship.numbers.set('konstant-until',w.time+effect.values[1]);w.starship.numbers.set('konstant-active',1);for(const ally of w.allies())if(ally.hp>0){w.refreshStats(ally);if(equipmentControlBoost(w,ally))equipmentPresentation(w,'boost-start',ally,undefined,effect.source);}
}
export function tickEquipmentControls(w:World){
 const vector=Math.hypot(w.input.x,w.input.z)>.01?Math.atan2(w.input.x,w.input.z):99,previous=w.starship.numbers.get('control-vector')??99;
 if(vector!==previous){equipmentCommand(w,vector!==99);if(vector===99)equipmentCommandArrived(w);w.starship.numbers.set('control-vector',vector);}
 for(const [until,active] of [['dominance-fire','dominance-fire-active'],['konstant-until','konstant-active']]){const on=(w.starship.numbers.get(until)??0)>w.time,was=!!w.starship.numbers.get(active);if(on!==was){w.starship.numbers.set(active,+on);for(const u of w.allies()){w.refreshStats(u);if(until==='konstant-until'&&!on&&u.hp>0&&permanentEquipmentBody(w,u))equipmentPresentation(w,'boost-end',u);}}}
}
