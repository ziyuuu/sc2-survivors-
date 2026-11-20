import {doomsdayCombat} from './doomsday-combat';
import {DOOMSDAY_RULES,type DoomsdayId} from '../../data/terran-doomsday';
import {productionQuote,availableFamily} from '../expedition-production';
import {productionGroups} from '../building/expedition';
import {canProduce} from '../building/rules';
import {familyLine} from '../../data/expedition-buildings';
import {deliveryJobs,deliveryJob,deliveryChanged,facilityTraining} from '../production-queries';
import {armedOrderSeconds} from './armed-procs';
import {availableNewBodies,formalDoomsdayMember,mechanicalMember,sameMechanicalMember,reconcileMechanicalSeats} from './doomsday-roster';
import {newDoomsdayState,type DoomsdayBlueprint} from './doomsday-state';
import type {World} from '../world';
import type {Entity} from '../types';
import type {UnitType} from '../../data/sc2-units';
import type {DeliveryLedger} from '../expedition-state';

export const DOOMSDAY_BLUEPRINTS={'M-G06':'hellion','M-B07':'viking','M-P06':'banshee','M-O02':'thor','M-O03':'tank'} as const;
export const DOOMSDAY_MODULES=['M-G07','M-B09','M-P04'] as const;
const ref=(u:Entity)=>({entityId:u.id,bornAt:u.bornAt});
const isOrange=(id:DoomsdayId)=>id==='M-O02'||id==='M-O03';
const isModule=(id:DoomsdayId)=>(DOOMSDAY_MODULES as readonly string[]).includes(id);
function candidates(w:World,id:DoomsdayId,family?:string){
 const s=w.expedition.doomsday;
 return w.allies().filter(u=>formalDoomsdayMember(u)&&mechanicalMember(w,u)&&(!family||u.unitType===family)&&(!isOrange(id)||!u.eliteId)&&(!(id==='M-G07'||id==='M-B09')||!u.flying)&&(id!=='M-B09'&&id!=='M-P04'||u.weaponDamage>0)&&(w.expedition.build?.main!=='doomsday'||s?.seats.some(seat=>sameMechanicalMember(seat,u)))).sort((a,b)=>b.rank-a.rank||a.bornAt-b.bornAt||a.id-b.id);
}
export function doomsdayHasHost(w:World,id:DoomsdayId,u:Entity){const host=w.expedition.doomsday?.blueprints?.[id]?.host;return !!host&&sameMechanicalMember(host,u)&&u.hp>0;}
export function doomsdayModuleAvailable(w:World,id:DoomsdayId){return candidates(w,id).length>0;}
function mount(w:World,id:DoomsdayId,b:DoomsdayBlueprint,u:Entity){b.host=ref(u);if(!isModule(id))doomsdayCombat(u).special=id;b.initialized=true;b.order=undefined;w.refreshStats(u);}
/** First purchase can immediately refit a legal live chassis; no identity replacement. */
export function acquireDoomsdayBlueprint(w:World,id:DoomsdayId){
 if(!(id in DOOMSDAY_BLUEPRINTS)&&!isModule(id))return;
 const s=w.expedition.doomsday??=newDoomsdayState(),map=s.blueprints??={};if(map[id])return;
 const family=(DOOMSDAY_BLUEPRINTS as Partial<Record<DoomsdayId,UnitType>>)[id],body=candidates(w,id,family)[0];
 if(!family&&!body)throw Error('Validated mechanical module host missing');
 const blueprint=map[id]={family:family??body.unitType as UnitType,host:null,initialized:false,losses:0};if(body)mount(w,id,blueprint,body);
}
/** Only a new body order can claim a waiting blueprint; the caller freezes its factor. */
export function doomsdayBodyOrderFactor(w:World,f:UnitType){
 const pending=Object.entries(w.expedition.doomsday?.blueprints??{}).find(([id,b])=>b!.family===f&&!b!.host&&!b!.order&&isOrange(id as DoomsdayId));
 return pending?DOOMSDAY_RULES.orangeTime:undefined;
}
export function bindDoomsdayBodyOrder(w:World,j:DeliveryLedger){
 for(const [id,b] of Object.entries(w.expedition.doomsday?.blueprints??{})){
  if(!b||b.host||b.order||b.family!==j.family||isModule(id as DoomsdayId))continue;
  const index=j.passengers.findIndex(p=>p.status==='waiting'&&p.purpose==='body');if(index<0)continue;
  b.order={kind:'incoming',jobId:j.id,passengerIndex:index};
 }
}
export function completeDoomsdayRefit(w:World,j:DeliveryLedger){
 if(!j.refit)return false;const b=w.expedition.doomsday?.blueprints?.[j.refit.cardId],u=w.entities.get(j.refit.target.entityId);
 const valid=!!b&&b.order?.kind==='onsite'&&b.order.jobId===j.id&&!!u&&sameMechanicalMember(j.refit.target,u)&&candidates(w,j.refit.cardId,j.family).includes(u);
 if(valid)mount(w,j.refit.cardId,b!,u!);else if(b?.order?.jobId===j.id)b.order=undefined;
 j.state='settled';j.remaining=0;deliveryChanged(w,j);return true;
}
/** Reconcile identities, never substitute a survivor without an explicit onsite work order. */
export function reconcileDoomsdayRefits(w:World,allowStart=true){
 const map=w.expedition.doomsday?.blueprints;if(!map||w.specialStages.active)return;
 // A real pod can release its member after this tick's combat seat pass.
 // Register that identity before deciding whether its paid delivery can carry a blueprint.
 reconcileMechanicalSeats(w);
 for(const [rawId,b] of Object.entries(map)){
  if(!b)continue;const id=rawId as DoomsdayId,host=b.host&&w.entities.get(b.host.entityId);
  if(b.host&&(!host||host.hp<=0||!sameMechanicalMember(b.host,host)||!formalDoomsdayMember(host)||isOrange(id)&&!!host.eliteId||host.unitType!==b.family)){b.host=null;b.losses++;b.order=undefined;}
  if(b.host)continue;
  if(b.order){
   const j=deliveryJob(w,b.order.jobId);
   if(b.order.kind==='incoming'){
    const p=j?.passengers[b.order.passengerIndex],u=p?.entityId==null?undefined:w.entities.get(p.entityId);
    if(p?.status==='released'&&u&&candidates(w,id,b.family).includes(u)){mount(w,id,b,u);continue;}
    if(!j||!p||p.status!=='waiting')b.order=undefined;else continue;
   }else {
    const u=w.entities.get(b.order.target.entityId);
    if(!j||j.state==='settled'||!u||u.hp<=0||!sameMechanicalMember(b.order.target,u)||!candidates(w,id,b.family).includes(u)){if(j){j.state='settled';j.remaining=0;deliveryChanged(w,j);}b.order=undefined;}else continue;
   }
  }
  const bodies=candidates(w,id,b.family);
  if(!b.initialized||isModule(id)){if(bodies[0]){mount(w,id,b,bodies[0]);continue;}}
  // Paid old bodies stay on their original clock and can inherit a non-orange blueprint.
  if(!isOrange(id))for(const j of deliveryJobs(w)){if(j.family!==b.family||j.refit)continue;const index=j.passengers.findIndex(p=>p.purpose==='body'&&p.status==='waiting');if(index>=0){b.order={kind:'incoming',jobId:j.id,passengerIndex:index};break;}}
  if(b.order||availableNewBodies(w,b.family)>0||!allowStart||w.phase!=='battle'||w.requiresPlayerDecision||!bodies[0]||!availableFamily(w,b.family))continue;
  const building=w.expedition.building;if(!building)continue;
  const group=productionGroups(w.expedition).find(g=>canProduce(building,g,b.family,w.stage)&&g.ids.some(f=>!facilityTraining(w,f)));
  const facility=group?.ids.find(f=>!facilityTraining(w,f));if(!group||facility===undefined)continue;
  const quote=productionQuote(w,b.family),factor=isOrange(id)?DOOMSDAY_RULES.orangeTime:w.expedition.build?.main==='doomsday'?DOOMSDAY_RULES.bodyTime:1;
  const target=ref(bodies[0]),j:DeliveryLedger={id:w.nextJob++,refit:{cardId:id,target},family:b.family,line:familyLine(b.family),facilityIds:[facility],remaining:armedOrderSeconds(w,quote.seconds,quote.baseSeconds)*factor,state:'training',podId:null,passengers:[]};
  b.order={kind:'onsite',jobId:j.id,target};w.expedition.ledger.push(j);
 }
}
export function doomsdayDetection(w:World,target:{x:number;z:number;unitRadius:number},owner:string){
 if(owner!=='terran')return false;const host=w.expedition.doomsday?.blueprints?.['M-G07']?.host,u=host&&w.entities.get(host.entityId);
 return !!u&&u.hp>0&&sameMechanicalMember(host!,u)&&!u.flying&&Math.hypot(u.x-target.x,u.z-target.z)<=4+target.unitRadius;
}
