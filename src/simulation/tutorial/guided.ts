import type {World} from '../world';
import type {Point,Entity,Reward} from '../types';
import type {GuidedTutorial,GuidedTail} from './guided-types';
import {guidedScript,GUIDED_FAMILY,GUIDED_LINE,GUIDED_ELITE} from '../../data/tutorial-script';
import {productionGroups,syncBuildingViews} from '../building/expedition';
import {clearLine} from '../movement/steering';
import {createEquipmentItem,grantPlannedEquipment} from '../starship/inventory';
import {registerEquipmentDrop} from '../starship/loot-presentation';
import type {EquipmentSlot} from '../starship/types';

export function guided(w:World):GuidedTutorial|undefined {const a=w.starship.account.tutorial;return a?.status==='active'&&[2,3].includes(a.version??0)&&!a.tail&&a.run===w.runId?w.expedition.tutorial?.guided:undefined;}
export function guidedTail(w:World):GuidedTail|undefined {const a=w.starship.account.tutorial;return a?.status==='active'&&[2,3].includes(a.version??0)?a.tail:undefined;}
export function guidedStep(w:World){const g=guided(w);return g?guidedScript(w.expedition.race,g.version).find(s=>s.id===g.step):undefined;}
export const guidedSignature=(w:World)=>JSON.stringify([w.starship.account.tutorial,w.expedition.tutorial]);
const committed=new WeakMap<World,string>();
export function acknowledgeGuidedSave(w:World,signature=guidedSignature(w)){committed.set(w,signature);}
export const guidedDurable=(w:World)=>committed.get(w)===guidedSignature(w);
/** Authorizes only the synchronous native command selected by the current click. */
const commandScopes=new WeakMap<World,number>();
export function withGuidedCommand<T>(w:World,fn:()=>T):T {commandScopes.set(w,(commandScopes.get(w)??0)+1);try{return fn();}finally{const n=(commandScopes.get(w)??1)-1;if(n)commandScopes.set(w,n);else commandScopes.delete(w);}}
export function guidedAllows(w:World,kind='command',id?:string){
 const g=guided(w),tail=guidedTail(w),step=guidedStep(w);if(!g&&!tail)return true;
 if(kind==='move')return g?.phase==='running'&&!!step&&['move','worker','ling','drone','resources','landing','boss','loot','rally','card'].includes(step.kind);
 if(!commandScopes.has(w))return false;
 if(kind==='equip')return step?.kind==='equip'&&id===guidedItem(w)||tail?.step==='install'&&id===tail.module;
 if(kind==='buy')return !!step&&['build','system','supply'].includes(step.kind)&&id===guidedOffer(w)?.offerId;
 if(kind==='round')return step?.kind==='supply-round'||step?.kind==='front';
 if(kind==='extract')return step?.kind==='extract';
 if(kind==='repair')return step?.kind==='repair';
 if(kind==='placement')return step?.kind==='apply';
 return false;
}
export function guidedWaiting(w:World){const g=guided(w);return !!g&&(g.phase==='waiting'||!guidedDurable(w)&&g.commands.at(-1)?.done===true);}
export function guidedPickup(w:World,kind:'resource'|'equipment'|'card'){const g=guided(w),step=guidedStep(w);if(!g)return true;if(g.phase!=='running')return false;return kind==='resource'?step?.kind==='resources':kind==='equipment'?step?.kind==='loot':commandScopes.has(w)&&step?.kind==='card';}

/** Receipts are already settled. This optional persisted state only holds their presentation. */
export const GUIDED_RESULT_SECONDS=.5;
export function presentGuidedResult(w:World){
 const g=guided(w),s=guidedStep(w);if(!g||!s||g.phase!=='running')return false;
 if(g.version!==3)return finishGuidedClick(w);if(g.feedback)return true;
 const p=guidedTarget(w),before=g.wallets.at(-1);g.feedback={step:s.id,at:w.time,...(p?{point:{x:p.x,z:p.z}}:{})};
 if(s.kind==='resources'&&before){g.feedback.minerals=w.wallet.minerals-before.minerals;g.feedback.gas=w.wallet.gas-before.gas;}
 w.cancelOrder();w.input={x:0,z:0};w.changed();return true;
}
/** Advancing a feedback receipt never pays, picks up, heals or equips again. */
export function finishGuidedResult(w:World){
 const g=guided(w),s=guidedStep(w);if(!g?.feedback||!s)return false;
 if(w.phase==='battle'){
  if(w.time-g.feedback.at<GUIDED_RESULT_SECONDS-1e-8)return false;
  if(['resources','loot'].includes(s.kind)){w.endStage();if(!['reward'].includes(w.phase))return false;}
 }
 return finishGuidedClick(w);
}

export function initializeGuided(w:World,version:2|3=2){
 const t=w.expedition.tutorial;if(!t)return;
 const groups=productionGroups(w.expedition),g:GuidedTutorial={version,step:version===3?'rescue-worker':'move',phase:'waiting',serial:0,commands:[],points:{move:{...t.goal}},bosses:{},resources:[],items:{},jobs:[],originalProduction:groups.map(p=>({id:p.id,enabled:p.enabled,outputs:[...p.outputs],families:{...p.enabledFamilies}})),editedProduction:[],wallets:[]};
 t.guided=g;if(version===3){g.initialWorkers=w.workers;g.normalMap=w.starship.account.tutorial?.departure?.map??(w.campaignRecipe?{version:3,theme:w.campaignRecipe.theme,seed:w.campaignRecipe.seed}:undefined);}
 for(const p of groups){if(version===3)continue;p.enabled=false;p.enabledFamilies=Object.fromEntries(p.outputs.map(f=>[f,false]));}
 if(w.expedition.building)syncBuildingViews(w.expedition,w.expedition.building);
 const delta={minerals:700-w.wallet.minerals,gas:200-w.wallet.gas};w.wallet.minerals+=delta.minerals;w.wallet.gas+=delta.gas;w.economyTotals.cards.minerals+=delta.minerals;w.economyTotals.cards.gas+=delta.gas;
 g.wallets.push({step:'accept',...w.wallet});
}

function safePoint(w:World,distance:number,from:Point=w.anchor):Point{
 for(const radius of [distance,distance*.8,distance*.6,3])for(let i=0;i<24;i++){const angle=i*Math.PI/12,p={x:from.x+Math.cos(angle)*radius,z:from.z+Math.sin(angle)*radius};if(Math.abs(p.x)<w.mapHalf-3&&Math.abs(p.z)<w.mapHalf-3&&clearLine(from,p,1.1,w.obstacles,w.terrain)&&(!w.terrain||w.terrain.canOccupy(p,1.1)))return p;}
 return {x:from.x,z:from.z};
}
function latestJob(w:World){const g=guided(w);const s=guidedStep(w),id=s?.id.startsWith('free-landing')?g?.freeJobs?.[String(s.stage)]:g?.jobs.at(-1);return id===undefined?undefined:w.expedition.ledger.find(j=>j.id===id);}
export function guidedTarget(w:World):Point|null {
 const g=guided(w),s=guidedStep(w);if(!g||!s)return null;
 if(s.kind==='worker')return (g.worker===undefined?undefined:w.economicTargets.get(g.worker))??null;
 if(s.kind==='ling')return (g.ling===undefined?undefined:w.entities.get(g.ling))??null;
 if(s.kind==='move'||s.kind==='rally')return g.points[s.id]??null;
 if(s.kind==='drone')return (g.drone===undefined?undefined:w.economicTargets.get(g.drone))??g.points.drone??null;
 if(s.kind==='resources')return w.pickups.find(p=>g.resources.includes(p.id))??g.points.drone??null;
 if(s.kind==='landing'){const j=latestJob(w);return w.pods.find(p=>p.id===j?.podId)??g.points[s.id]??null;}
 if(s.kind==='boss')return g.bosses[String(s.stage)]?.point??null;
 if(s.kind==='loot'){const b=g.bosses[String(s.stage)],id=b?.items.find(i=>w.starship.account.locations[i.id]?.kind==='ground')?.id,loc=id?w.starship.account.locations[id]:undefined;return loc?.kind==='ground'?{x:loc.x??b.point.x,z:loc.z??b.point.z}:b?.point??null;}
 if(s.kind==='card'){const b=g.bosses[String(s.stage)];return w.rewardDrops.find(p=>p.id===b?.card)??b?.point??null;}
 return null;
}
export function guidedItem(w:World){const s=guidedStep(w),g=guided(w);return s&&g?g.items['attribute-'+s.stage]:undefined;}
export function guidedProducer(w:World){const g=guided(w);if(!g)return undefined;const groups=productionGroups(w.expedition);return groups.find(p=>p.id===g.producer)??groups.find(p=>p.outputs.includes(GUIDED_FAMILY[w.expedition.race]));}
export function guidedOffer(w:World){const step=guidedStep(w);if(!step)return undefined;const race=w.expedition.race,id=step.kind==='build'?({terran:'barracks',zerg:'hatchery',protoss:'crystal'} as const)[race]:`system.${GUIDED_LINE[race]}`;return w.rewards.find(r=>!r.sold&&'expeditionEffect'in r&&(step.kind==='supply'?(r.expeditionEffect as {kind:string;family:string;mode:string}).kind==='supply'&&(r.expeditionEffect as {family:string}).family===GUIDED_FAMILY[race]&&(r.expeditionEffect as {mode:string}).mode==='direct':(r.expeditionEffect as {kind:string;definitionId:string}).kind==='development'&&(r.expeditionEffect as {definitionId:string}).definitionId===id));}
/** Stable semantic reference, checked before recording a click; no DOM identity in saves. */
export function guidedClickRef(w:World){const g=guided(w),s=guidedStep(w),tail=guidedTail(w);if(tail)return `${tail.version}:${tail.run}:${tail.step}:${tail.module}`;if(!g||!s)return '';const target=['build','system','supply'].includes(s.kind)?guidedOffer(w)?.offerId:['detail','equip'].includes(s.kind)?guidedItem(w):['production-on','production-off','apply','output'].includes(s.kind)?guidedProducer(w)?.id:s.kind==='boss'||s.kind==='loot'||s.kind==='card'?g.bosses[String(s.stage)]?.id:s.kind==='drone'?g.drone:s.kind==='worker'?g.worker:s.kind==='ling'?g.ling:s.id;return `${g.version}:${w.runId}:${s.id}:${target}`;}
export function prepareGuided(w:World){
 const g=guided(w),s=guidedStep(w);if(!g||!s)return;
 if(s.kind==='drone'&&g.drone===undefined){g.points.drone=safePoint(w,6);const d=w.spawnEconomic('drone',g.points.drone);g.drone=d.id;}
 if(s.kind==='worker'&&g.worker===undefined){g.worker=w.nextId;w.spawnEconomic('egg',safePoint(w,4));}
 if(s.kind==='ling'&&g.ling===undefined){const p=safePoint(w,6);g.ling=w.addUnit('zergling','zerg',p.x,p.z).id;}
 if(s.kind==='boss'&&!g.bosses[String(s.stage)]){const p=safePoint(w,9),u=g.version===3?w.spawnShortTutorialElite(p):w.spawnTutorialCampaignBoss(p);if(u)g.bosses[String(s.stage)]={id:u.id,born:u.bornAt,point:{x:u.x,z:u.z},items:[]};}
 if(s.id.startsWith('free-landing')&&!g.points[s.id])g.points[s.id]={x:w.anchor.x,z:w.anchor.z};
 if(s.kind==='rally'&&!g.points[s.id])g.points[s.id]={x:w.anchor.x,z:w.anchor.z};
 if(['production-on','production-off','output','apply'].includes(s.kind)&&!g.producer){g.producer=guidedProducer(w)?.id;}
}
export function beginGuidedClick(w:World,target:string){
 const g=guided(w),tail=guidedTail(w);if(!g&&!tail||target!==guidedClickRef(w))return false;if(!guidedDurable(w)||g?.feedback||tail?.feedback)return false;
 if(g){if(g.phase!=='waiting')return false;g.phase='running';g.commands.push({id:`${g.version}:${w.runId}:${++g.serial}`,step:g.step,target,done:false});}
 else if(tail){tail.commands.push({id:`${tail.version}:${tail.run}:tail:${++tail.serial}`,step:tail.step,target,done:false});}
 w.input={x:0,z:0};if(w.phase==='battle')w.paused=false;return true;
}
export function finishGuidedClick(w:World){
 const g=guided(w),s=guidedStep(w);if(!g||!s||g.phase!=='running')return false;
 const command=g.commands.at(-1);if(!command||command.step!==s.id||command.done)return false;
 delete g.feedback;
 command.done=true;g.wallets.push({step:s.id,...w.wallet});
 const steps=guidedScript(w.expedition.race,g.version),next=steps[steps.findIndex(x=>x.id===s.id)+1];
 if(next){g.step=next.id;g.phase='waiting';w.input={x:0,z:0};w.cancelOrder();if(s.kind==='build'){const groups=productionGroups(w.expedition),p=w.expedition.race==='terran'?groups.find(p=>p.kind==='barracks'):w.expedition.race==='zerg'?groups.filter(p=>p.kind==='hatchery').at(-1):groups.find(p=>p.kind==='crystal');g.producer=p?.id;if(p){if(!g.originalProduction.some(o=>o.id===p.id))g.originalProduction.push({id:p.id,enabled:p.enabled,outputs:[...p.outputs],families:{...p.enabledFamilies}});if(g.version===2)p.enabled=false;if(g.version===2&&w.expedition.race==='protoss')p.outputs=[];if(g.version===2)p.enabledFamilies=Object.fromEntries(p.outputs.map(f=>[f,false]));syncBuildingViews(w.expedition);}}}
 w.changed();return true;
}
export function rejectGuidedClick(w:World){const g=guided(w);if(g?.phase==='running'){g.commands.pop();g.phase='waiting';w.changed();}}

/** Called from the same native fixed step, never from rendering or audio. */
export function updateGuided(w:World){
 const g=guided(w),s=guidedStep(w),a=w.starship.account;if(!g||!s)return;
 if(w.phase==='lost'){a.tutorial!.status='closed';return;}
 if(g.phase!=='running')return;
 if(g.feedback){if(w.phase==='battle')finishGuidedResult(w);return;}
 let done=false;const target=guidedTarget(w),j=latestJob(w);
 if(s.kind==='landing'&&j?.podId&&target&&Math.hypot(w.anchor.x-target.x,w.anchor.z-target.z)>2&&!w.order)withGuidedCommand(w,()=>w.issueMove(target));
 switch(s.kind){
 case 'worker':done=(g.worker!==undefined&&w.economicTargets.get(g.worker)?.status==='rescued')||w.workers>(g.initialWorkers??0);break;
 case 'ling':done=g.ling!==undefined&&(!w.entities.get(g.ling)||w.entities.get(g.ling)!.hp<=0);break;
 case 'repair':done=w.allies().every(u=>u.hp>=u.maxHp-1e-6);break;
 case 'move':done=!!target&&Math.hypot(w.anchor.x-target.x,w.anchor.z-target.z)<.9;break;
 case 'drone':{const d=g.drone===undefined?undefined:w.economicTargets.get(g.drone);done=!!g.resources.length&&(!d||d.hp<=0);break;}
 case 'resources':done=g.resources.length>0&&w.expedition.tutorial?.resources===true&&g.resources.every(id=>!w.pickups.some(p=>p.id===id));break;
 case 'apply':if(s.after==='dispatch')done=!!g.permit?.used;else if(s.after==='landing')done=!!j&&['risk','settled'].includes(j.state);break;
 case 'front':done=w.phase==='battle'&&w.stage>s.stage&&(g.version===3?!!j&&['risk','settled'].includes(j.state):!s.after||!!g.permit?.used);break;
 case 'landing':
  if(j?.state==='settled'&&j.passengers.some(p=>p.status==='lost')){a.tutorial!.status='closed';skipGuided(w);w.announce('增援未能接应，教学结束。');w.changed();return;}
  done=!!j&&j.passengers.every(p=>p.status==='released'&&p.entityId!==null);break;
 case 'boss':done=!!g.bosses[String(s.stage)]?.receipt;break;
 case 'loot':done=!!g.bosses[String(s.stage)]?.items.length&&g.bosses[String(s.stage)].items.every(i=>['backpack','equipped'].includes(a.locations[i.id]?.kind));break;
 case 'rally':done=w.phase==='reward';break;
 case 'equip':{const id=guidedItem(w),item=id?a.items[id]:undefined;done=!!item&&a.equipped[item.race][item.slot]===id;break;}
 case 'extract':if(a.run?.ended&&a.settlement?.outcome==='success'&&a.tutorial?.module){const c=g.commands.at(-1)!;c.done=true;a.tutorial.tail={version:g.version,run:g.commands[0]?.id.split(':').slice(1,-1).join(':')||w.runId!,step:'flagship',module:a.tutorial.module,serial:g.serial,commands:[...g.commands]};a.tutorial.tail.run=w.runId!;w.changed();return;}break;
 }
 if(done){if(g.version===3&&!['front','extract'].includes(s.kind))presentGuidedResult(w);else finishGuidedClick(w);}
}
export function activateGuidedTarget(w:World){
 const g=guided(w),s=guidedStep(w),target=guidedTarget(w);if(!g||!s||!target||!beginGuidedClick(w,guidedClickRef(w)))return false;
 let ok=true;
 withGuidedCommand(w,()=>{if(s.kind==='card'){const b=g.bosses[String(s.stage)];ok=!!b?.card&&w.collectRewardDrop(b.card);if(ok)finishGuidedClick(w);}else {const p=s.kind==='boss'?safePoint(w,2,target):target;ok=w.issueMove(p);}});
 if(!ok)rejectGuidedClick(w);w.changed();return ok;
}
export function guidedProductionQuota(w:World,producer:string){const g=guided(w);return !g?5:g.version===3&&(w.stage!==2||w.stageElapsed<10)?0:g.permit?.producer===producer&&!g.permit.used?1:0;}
export function guidedProductionCreated(w:World,producer:string,id:number){const g=guided(w);if(g?.permit?.producer===producer&&!g.permit.used){g.permit.used=true;g.jobs.push(id);if(g.version===3)g.paidAt=w.time;}}
export function permitGuidedProduction(w:World){const g=guided(w),p=guidedProducer(w);if(g&&p)g.permit={producer:p.id,used:false};}
export function guidedResourceDrop(w:World,p:Point){const g=guided(w);if(!g)return false;if(g.drone!==undefined&&(p as {id?:number}).id===g.drone&&!g.resources.length){const id=w.nextId++;w.pickups.push({id,x:p.x,z:p.z,minerals:100,gas:50});g.resources.push(id);}return true;}
/** Independent fixed roll stream; item serials still belong to the real account. */
export function guidedEquipment(w:World,u:Entity,receipt:string):string[]|null{
 const g=guided(w);if(!g)return null;const b=g.bosses[String(w.stage)];if(!b||b.id!==u.id||b.born!==u.bornAt||u.hp>0)return [];
 if(b.receipt)return [];
 const a=w.starship.account,slots:EquipmentSlot[]=g.version===3?['defense1','logistics']:w.stage===1?['defense1']:w.stage===2?['offense1']:['defense2','logistics'],rng=a.rng;
 try{a.rng=0x11a100+w.stage;for(const slot of slots){const result=createEquipmentItem(a,{template:slot==='logistics'?'module.logistics.1':'attribute.1',slot,race:w.expedition.race,polluted:false});if(!result.ok)throw Error(result.error);b.items.push(result.value);g.items[slot==='logistics'?'module':'attribute-'+w.stage]=result.value.id;}}
 finally{a.rng=rng;}
 b.receipt=receipt;b.point={x:u.x,z:u.z};
 for(const [i,item] of b.items.entries()){const result=grantPlannedEquipment(a,item,`${w.runId}:${receipt}:guided:${i}`,{kind:'ground',run:w.runId!,x:u.x,z:u.z});if(!result.ok)throw Error(result.error);registerEquipmentDrop(w,result.value);}
 return b.items.map(i=>i.id);
}
export function guidedBossCard(w:World,u:Entity,receipt:string):{reward:Reward;variant?:typeof GUIDED_ELITE[keyof typeof GUIDED_ELITE]}|null{
 const g=guided(w),b=g?.bosses[String(w.stage)];if(!g||g.version===3||!b||b.id!==u.id)return null;
 const family=GUIDED_FAMILY[w.expedition.race],elite=GUIDED_ELITE[w.expedition.race],first=w.stage===1;
 const reward:Reward={id:`guided.card.${w.stage}`,offerId:receipt,sold:false,name:first?'本族精英':'基础兵空投补给',description:'',icon:'unit.'+family,rarity:first?'purple':'green',kind:first?'elite':'buff',value:first?elite:family,minerals:0,gas:0,baseMinerals:0,baseGas:0,discount:0,expeditionEffect:first?{kind:'elite',eliteId:elite,family}:{kind:'supply',family,count:1,mode:'pod'}} as Reward;
 return {reward,...(first?{variant:elite}:{})};
}
export function noteGuidedCard(w:World,id:number){const g=guided(w),b=g?.bosses[String(w.stage)];if(b)b.card=id;}
export function canGuidedEndStage(w:World){const g=guided(w);if(g?.version===3){const s=guidedStep(w);return g.phase==='running'&&!!g.feedback&&w.time-g.feedback.at>=GUIDED_RESULT_SECONDS-1e-8&&(s?.kind==='resources'&&g.resources.length>0&&g.resources.every(id=>!w.pickups.some(p=>p.id===id))||s?.kind==='loot'&&g.bosses[String(w.stage)]?.items.length===2&&g.bosses[String(w.stage)].items.every(i=>['backpack','equipped'].includes(w.starship.account.locations[i.id]?.kind)));}return !g||guidedStep(w)?.kind==='rally'&&g.phase==='running'&&w.stageElapsed>=w.duration-1e-8;}
export function skipGuided(w:World){
 const g=w.expedition.tutorial?.guided;if(!g||g.skipRestored)return;g.skipRestored=true;
 const groups=productionGroups(w.expedition);for(const original of g.originalProduction){if(g.editedProduction.includes(original.id))continue;const p=groups.find(p=>p.id===original.id);if(p){p.enabled=original.enabled;if(original.outputs)p.outputs=[...original.outputs];p.enabledFamilies={...original.families};}}
 delete g.permit;delete g.draft;delete g.feedback;w.expedition.frozenDevelopmentTarget=null;w.resumeTutorialSchedule();
 if(w.expedition.building)syncBuildingViews(w.expedition,w.expedition.building);
}
export const guidedExpectedLine=(w:World)=>GUIDED_LINE[w.expedition.race];

export const shortLesson=(w:World)=>guided(w)?.version===3||w.campaignRecipe?.lesson===3;
export const guidedTrainingSeconds=(w:World,seconds:number)=>guided(w)?.version===3?0:seconds;
