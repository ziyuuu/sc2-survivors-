import {initializeGuided,prepareGuided,updateGuided,guidedEquipment,skipGuided} from './guided';
import type {World} from '../world';
import type {Entity,Point} from '../types';
import type {TutorialRun} from './types';
import {equipmentTemplate} from '../starship/catalog';
import {canEquip,createEquipmentItem,equipmentRandom,grantPlannedEquipment} from '../starship/inventory';
import {registerEquipmentDrop} from '../starship/loot-presentation';
import {clearLine} from '../movement/steering';

export const activeTutorial=(w:World)=>w.starship.account.tutorial?.status==='active'&&w.starship.account.tutorial.run===w.runId?w.expedition.tutorial:undefined;
export function beginTutorial(w:World){
 const a=w.starship.account,pending=!!(a.tutorial?.version===3&&a.tutorial.departure?.accepted);if(a.tutorial&&['invited','active'].includes(a.tutorial.status)&&a.tutorial.run!==w.runId&&!pending)a.tutorial.status='closed';if(a.tutorial?.status!=='eligible'&&!pending||!w.runId)return;
 const origin={x:w.anchor.x,z:w.anchor.z};let goal={...origin};
 for(const [x,z] of [[3,0],[0,3],[-3,0],[0,-3],[2,2],[-2,-2]]){const p={x:origin.x+x,z:origin.z+z};if(clearLine(origin,p,.6,w.obstacles,w.terrain)){goal=p;break;}}
 a.tutorial={...a.tutorial,status:pending?'active':'invited',run:w.runId,race:w.expedition.race};
 w.expedition.tutorial={run:w.runId,origin,goal,moved:false,resources:false,rescued:false,operations:false,development:false,supply:false,attributeEquipped:false};if(pending){initializeGuided(w,3);delete a.tutorial.departure;}
}
export function chooseTutorial(w:World,accept:boolean){
 const a=w.starship.account,t=a.tutorial;if(!t||!['invited','active'].includes(t.status))return false;
 if(accept&&t.status!=='invited')return false;if(w.phase==='menu'&&t.version===3&&t.departure){t.departure.accepted=accept;t.status=accept?'active':'skipped';if(!accept)delete t.departure;a.revision++;w.changed();return true;}t.status=accept?'active':'skipped';if(t.version===2||t.version===3){if(accept)initializeGuided(w,t.version);else skipGuided(w);}a.revision++;w.input={x:0,z:0};w.changed();return true;
}
export function tutorialDroneKilled(w:World,id:number,pickups:number[]){const t=activeTutorial(w);if(!t||t.resources||!pickups.length)return;if(!t.drone||t.drone.stage!==w.stage||!t.drone.pickups.some(id=>w.pickups.some(p=>p.id===id)))t.drone={id,stage:w.stage,pickups:[...pickups],collected:[]};}
export function tutorialResourceCollected(w:World,id:number){const t=activeTutorial(w),d=t?.drone;if(!t||!d||!d.pickups.includes(id)||d.collected.includes(id))return;d.collected.push(id);t.resources=d.pickups.every(p=>d.collected.includes(p));}
export function tutorialItemCollected(w:World,id:string){const t=activeTutorial(w),a=w.starship.account,item=a.items[id];if(!t||!item)return;t.firstItem??=id;const kind=equipmentTemplate(item.template)?.kind;if(kind==='attribute'&&canEquip(a,item.race,id,item.slot).ok)t.attribute??=id;if(kind==='module'){t.module??=id;if(a.tutorial)a.tutorial.module??=id;}}
/** Observe authoritative results; it never purchases, equips, moves or settles for the player. */
export function updateTutorial(w:World){
 const a=w.starship.account,account=a.tutorial,t=w.expedition.tutorial;
 if(account?.status!=='active')return;
 if(account.version===2||account.version===3){prepareGuided(w);updateGuided(w);return;}
 if(a.run?.ended){
  const id=account.module,item=id?a.items[id]:undefined;
  if(a.settlement?.outcome!=='success'||!item||!['warehouse','equipped'].includes(a.locations[id!]?.kind)){account.status='closed';return;}
  if(a.equipped[item.race][item.slot]===id)account.status='completed';return;
 }
 if(account.run!==w.runId||!t)return;
 if(w.phase==='lost'){account.status='closed';return;}
 if(!t.moved&&(Math.hypot(w.anchor.x-t.goal.x,w.anchor.z-t.goal.z)<1||Math.hypot(w.anchor.x-t.origin.x,w.anchor.z-t.origin.z)>=3))t.moved=true;
 if(w.expedition.ledger.some(j=>j.passengers.some(p=>p.status==='released'&&p.entityId!==null&&p.entityId!==undefined)))t.rescued=true;
 if(w.stage>1)t.operations=true;
 if(t.attribute){const item=a.items[t.attribute];if(item&&a.equipped[item.race][item.slot]===item.id)t.attributeEquipped=true;else if(!item||!['backpack','equipped'].includes(a.locations[item.id]?.kind))delete t.attribute;}
}
/** Replaces this one natural campaign boss drop. No other reward channel is touched. */
export function tutorialBossEquipment(w:World,u:Entity,receipt:string):string[]|null{
 const v2=guidedEquipment(w,u,receipt);if(v2!==null)return v2;
 const t=activeTutorial(w),a=w.starship.account,run=a.run;
 if(!t||!run||u.hp>0||w.stage!==3||w.endless||w.specialStages.active||u.enemyTier!=='boss'||u.enemySpawn?.stage!==3||!u.enemyName?.endsWith('主要首领')||u.fun||u.encounter||u.mission||u.temporary||u.summonKind)return null;
 if(t.boss)return [];
 const count=equipmentRandom(a)<.25?3:2;
 const inputs=[{template:'attribute.1',slot:'offense1' as const},{template:'module.logistics.1',slot:'logistics' as const},...(count===3?[{template:'attribute.1',slot:'defense1' as const}]:[])];
 const items=inputs.map(input=>{const r=createEquipmentItem(a,{...input,race:run.race,polluted:false});if(!r.ok)throw Error(r.error);return r.value;});
 t.boss={receipt,enemy:u.id,born:u.bornAt,items};
 for(const [i,item] of items.entries()){const r=grantPlannedEquipment(a,item,run.id+':'+receipt+':tutorial:'+i,{kind:'ground',run:run.id,x:u.x,z:u.z});if(!r.ok)throw Error(r.error);registerEquipmentDrop(w,r.value);}
 return items.map(i=>i.id);
}
export type TutorialBeat='invite'|'move'|'drone'|'resources'|'rescue'|'operations'|'identify'|'equip'|'boss'|'extract'|'flagship';
export function tutorialBeat(w:World):TutorialBeat|null{
 const a=w.starship.account,account=a.tutorial,t=w.expedition.tutorial;
 if(account?.version===3&&account.departure&&!account.departure.accepted&&w.phase==='menu')return 'invite';
 if((account?.version===2||account?.version===3)&&account.status==='active')return null;
 if(account?.status==='active'&&a.run?.ended&&account.module)return 'flagship';
 if(account?.status==='invited'&&account.run===w.runId&&w.phase==='battle')return 'invite';
 if(account?.status!=='active'||account.run!==w.runId||!t||w.phase==='lost')return null;
 if(a.run?.ended)return account.module?'flagship':null;
 if(w.phase==='menu')return null;
 if(t.attribute&&!t.attributeEquipped&&w.phase==='reward')return 'equip';
 if(w.phase==='reward')return t.module&&w.stage>=3?'extract':!t.operations?'operations':null;
 if(t.boss&&t.boss.items.some(i=>a.locations[i.id]?.kind==='ground'))return 'boss';
 if(t.firstItem&&!t.attributeEquipped&&!t.boss)return 'identify';
 if(!t.moved)return 'move';if(!t.resources)return t.drone?.stage===w.stage?'resources':'drone';if(!t.rescued)return 'rescue';
 return null;
}
export function tutorialTarget(w:World,beat:TutorialBeat|null):Point|null{
 const t=w.expedition.tutorial;if(!t)return null;
 if(beat==='move')return t.goal;
 if(beat==='drone')return [...w.economicTargets.values()].filter(e=>e.kind==='drone'&&e.hp>0&&e.status==='active').sort((a,b)=>Math.hypot(a.x-w.anchor.x,a.z-w.anchor.z)-Math.hypot(b.x-w.anchor.x,b.z-w.anchor.z))[0]??null;
 if(beat==='resources')return w.pickups.find(p=>t.drone?.pickups.includes(p.id))??null;
 if(beat==='rescue')return w.pods.find(p=>['active','opening'].includes(p.status))??null;
 if(beat==='boss'){const id=t.boss?.items.find(i=>w.starship.account.locations[i.id]?.kind==='ground')?.id;const loc=id?w.starship.account.locations[id]:undefined;return loc?.kind==='ground'&&loc.x!==undefined&&loc.z!==undefined?{x:loc.x,z:loc.z}:null;}
 return null;
}

export function offerShortTutorial(w:World,departure:import('./types').TutorialDeparture){
 const a=w.starship.account;if(a.tutorial?.status!=='eligible')return false;
 a.tutorial={status:'invited',version:3,run:'departure:'+globalThis.crypto.randomUUID(),race:departure.race,departure};a.revision++;w.changed();return true;
}
