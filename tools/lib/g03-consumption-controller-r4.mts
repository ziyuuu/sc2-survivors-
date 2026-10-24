import {productionQuote} from '../../src/simulation/expedition-production';
import {BUILDS} from '../qa-campaign-controller';
import {distance} from './g03-economy-runtime-tier-objectives-r2.mts';
import assert from 'node:assert/strict';
import {economyController,round,stageKey} from './g03-economy-runtime-tier-objectives-r2.mts';
import {DEVELOPMENT,seatRecipe} from '../../src/data/expedition-buildings';

/** R3 measurement policy: one reinforcement reserve, essential development before optional buys, body diversification and paid-pod protection. Game values unchanged. */
export function consumptionController(w:any,r:any,race:string,options:{advance?:boolean}={}){
 const prior=economyController(w,r,race,{preserveSets:true}),events:any[]=[];
 const record=(kind:string,data:any)=>events.push({stage:stageKey(w),time:round(w.time),kind,data});
 const core=race==='terran'?['unlock.reaper','unlock.marauder','factory','starport','unlock.science_vessel','unlock.viking','stim','shield']:race==='zerg'?['unlock.roach','unlock.queen','hatchery','evolve-zerg.evolution','unlock.ravager','unlock.lurker','hydra_range']:['unlock.adept','unlock.stalker','unlock.sentry','robotics','unlock.immortal','unlock.colossus','colossus_range'];
 const lines=race==='terran'?['barracks','starport']:race==='zerg'?['zerg.evolution','zerg.basic']:['robotics','gateway'];
 const completed=(id:string)=>id.startsWith('evolve-')?w.expedition.building.groups.some((g:any)=>g.directions.includes(id.endsWith('.air')?'air':'ground')):(w.expedition.tech[id]??0)>=(id==='hatchery'?2:1);
 function priority(d:any){
  const ci=core.indexOf(d.id);if(ci>=0&&!completed(d.id))return 2000-ci*10;
  if(d.id.startsWith('system.')&&lines.includes(d.line))return 1600-lines.indexOf(d.line)*10;
  if(d.kind==='research'&&lines.includes(d.line))return 1500-(w.expedition.tech[d.id]??0)*80+(d.id.endsWith('.weapon')?30:0)-lines.indexOf(d.line)*10;
  // Additional producers are useful only on the selected branches and below 3.
  if(d.kind==='facility'&&(d.id==='hatchery'||lines.includes(d.line))&&(w.expedition.tech[d.id]??0)<3)return 700-(w.expedition.tech[d.id]??0)*50;
  return 0;
 }
 function legalProjects(next=false){const b=r.buildingViewState(w);return b?DEVELOPMENT.filter(d=>priority(d)>0&&r.eligible({...b,stage:b.stage+(next?1:0)},d)&&(!next?r.equipmentDevelopmentLegal(w,d):true)).sort((a,b)=>priority(b)-priority(a)||a.id.localeCompare(b.id)):[];}
 function setTarget(){const d=legalProjects(true)[0];assert.ok(w.setDevelopmentTarget(d?.id??null));record('next-development-target',d?.id??null);}
 const build=BUILDS.find(b=>b.id===({terran:'bio',zerg:'entrench',protoss:'shield'}[race]))!;
 const realUnits=()=>w.allies().filter((u:any)=>!u.temporary&&!u.summonOwnerId&&!u.summonKind);
 const supports=['medivac','science_vessel','sentry','queen'];
 function reserve(){
  const families=[...new Set(Object.values(w.expedition.production).flatMap((p:any)=>p?.outputs??[]))] as any[];
  const pool=families.filter(f=>w.capacity(f)&&!supports.includes(f));
  const starter=race==='protoss'?'zealot':race==='zerg'?'zergling':'marine';
  const prices=(pool.length?pool:[starter]).map(f=>{const q=productionQuote(w,f),width=f==='zergling'?2:1;return {minerals:q.minerals*width,gas:q.gas*width};}).sort((a,b)=>a.minerals+a.gas-b.minerals-b.gas);
  return prices[0];
 }
 function configure(){
  prior.configure();if(!['menu','reward'].includes(w.phase))return;
  const b=w.expedition.building,low=realUnits().filter((u:any)=>!supports.includes(u.unitType)).length<4;
  const transitional=race==='protoss'&&!w.isFamilyAvailable('stalker')&&w.isFamilyAvailable('adept')?['adept']:[];
  const candidates=[...new Set([...build.families,...transitional,race==='zerg'?'zergling':race==='protoss'?'zealot':'marine'])];
  const count=(f:string)=>w.familyUnits(f).length+w.expedition.ledger.filter((j:any)=>j.family===f).reduce((n:number,j:any)=>n+j.passengers.filter((p:any)=>p.status==='waiting'&&p.purpose==='body').length,0);
  for(const g of b.groups){
   const pool=candidates.filter((f:any)=>r.canProduce(b,g,f,w.phase==='reward'?w.stage+1:w.stage)&&w.isFamilyAvailable(f)&&(!low||!supports.includes(f))&&(w.expedition.familySlots.includes(f)||w.expedition.familySlots.length<w.squadCap()||w.expedition.familySlots.some((x:any)=>!build.families.includes(x))));
   const choices=pool.sort((a:any,b:any)=>count(a)-count(b)||candidates.indexOf(a)-candidates.indexOf(b)).slice(0,2);
   assert.ok(w.setBuildingGroupOutputs(g.id,choices));
   for(const f of choices)assert.ok(w.setProductionEnabled(f,w.capacity(f)));
  }
  record('production-plan',{low,groups:structuredClone(b.groups),families:[...w.expedition.familySlots]});
 }
 let protectedPod:number|null=null,lastMove=-100,lastDistance=Infinity,progressAt=0,clearUntil=0;
 function protectDelivery(){
  if(w.specialStages.active||w.stage===18&&!w.endless||((w.difficulty==='hell'||w.endless)&&[...w.expansionHives.values()].some((h:any)=>h.hp>0)))return false;
  if(w.effects.some((e:any)=>e.kind==='bile'&&e.owner==='zerg'&&distance(e.end,w.anchor)<e.radius+1.5))return false;
  const available=w.pods.filter((p:any)=>p.hp>0&&['falling','active','opening'].includes(p.status)&&p.passengers.some((v:any)=>v.status==='waiting'));
  const pod=available.find((p:any)=>p.id===protectedPod)??available.sort((a:any,b:any)=>distance(a,w.anchor)-distance(b,w.anchor)||a.id-b.id)[0];
  if(!pod){protectedPod=null;return false;}
  const d=distance(pod,w.anchor);
  if(protectedPod!==pod.id){protectedPod=pod.id;lastDistance=d;progressAt=w.time;record('protect-pod',{id:pod.id,family:pod.unitType,job:pod.jobId,distance:d});}
  if(d<lastDistance-.5){lastDistance=d;progressAt=w.time;}
  const visible=[...w.entities.values()].filter((e:any)=>e.owner==='zerg'&&e.hp>0&&w.visibleTo(e,'terran'));
  const threats=visible.filter((e:any)=>pod.guardianIds.has(e.id)||distance(e,pod)<6+e.unitRadius);
  const fighters=realUnits().filter((u:any)=>u.weaponDamage>0);
  const ready=fighters.filter((u:any)=>threats.some((e:any)=>w.canFireAt(u,e,0)));
  if(threats.length){for(let slot=0;slot<3;slot++)if(w.castHeroSlot(slot))record('pod-hero-skill',slot);if(w.stage>=10&&w.castDetection())record('pod-scan',true);}
  const hold=()=>{if(w.order)w.cancelOrder();if(race==='zerg'&&w.familyUnits('lurker').some((u:any)=>visible.some((e:any)=>!e.flying&&distance(u,e)<10)))if(w.setFamilyMode('lurker','lurker_burrowed'))record('pod-lurker-deploy',true);};
  if(w.time<clearUntil||ready.length>=Math.max(1,Math.ceil(fighters.length*.6))||d<2.5){hold();return true;}
  if(w.time-progressAt>1.5&&fighters.some((u:any)=>visible.some((e:any)=>w.canFireAt(u,e,0)))){clearUntil=w.time+1;progressAt=clearUntil;hold();record('clear-pod-lane',{id:pod.id});return true;}
  const point={x:pod.x+(w.anchor.x-pod.x)/(d||1)*2,z:pod.z+(w.anchor.z-pod.z)/(d||1)*2};
  if(w.time-lastMove>=.2&&(!w.order||distance(w.order.point,point)>.75)){w.setFamilyMode('tank','tank');w.setFamilyMode('lurker','lurker');if(w.issueMove(point))lastMove=w.time;}
  return true;
 }
 function affordable(cost:any,keep:any){return cost.minerals<=Math.max(0,w.wallet.minerals-keep.minerals)+1e-8&&cost.gas<=Math.max(0,w.wallet.gas-keep.gas)+1e-8;}
 const units=()=>w.allies().filter((u:any)=>!u.temporary&&!u.summonKind).map((u:any)=>({id:u.id,type:u.unitType,rank:u.rank,hero:u.heroId??null,elite:u.eliteId??null,hp:round(u.hp),maxHp:round(u.maxHp)}));
 function action(kind:string,details:any,fn:()=>any){const before={wallet:{...w.wallet},units:units()},ok=fn();record(kind,{...details,ok,before,after:{wallet:{...w.wallet},units:units()}});return ok;}
 function inventory(){
  const a=w.starship.account;
  for(const slot of ['offense1','offense2','offense3','offense4','defense1','defense2','defense3','defense4']){
   const old=a.items[a.equipped[race][slot]];if(old&&['set','special'].includes(r.equipmentTemplate(old.template)?.kind))continue;
   const score=(i:any)=>i?i.quality*10000+Object.values(r.itemValues(i)).reduce((n:number,v:any)=>n+Number(v),0):0;
   const next=(Object.values(a.items) as any[]).filter(i=>i.race===race&&i.slot===slot&&i.pollution!=='uncleansed'&&a.locations[i.id]?.kind==='backpack'&&['attribute','special'].includes(r.equipmentTemplate(i.template)?.kind)).sort((a,b)=>score(b)-score(a))[0];
   if(next&&score(next)>score(old))record('equip',{item:structuredClone(next),result:w.equipItem(next.id,slot)});
  }
  const pack=(Object.values(a.items) as any[]).filter(i=>a.locations[i.id]?.kind==='backpack');
  if(pack.length>48){const ids=pack.filter(i=>i.pollution!=='uncleansed'&&!a.run.locked.has(i.id)).sort((a,b)=>a.quality-b.quality).slice(0,pack.length-48).map(i=>i.id);if(ids.length)record('dismantle',{ids,result:r.dismantleEquipment(a,ids,a.revision,'intermission')});}
 }
 function score(card:any){const e=card.expeditionEffect;
  if(e.kind==='resource')return 1200;if(e.kind==='hero')return 1100;if(e.kind==='training')return 1000+e.rank;
  if(e.kind==='elite')return 950;if(e.kind==='teamCard')return 850;
  if(e.kind==='supply')return w.expedition.familySlots.includes(e.family)?800:0;
  if(e.kind==='card')return ['attack','attackSpeed','critical','cultivation'].includes(e.effect)?750:600;
  if(e.kind==='support')return 650;if(e.kind==='specialTicket')return 100;
  if(e.kind==='funShop')return core.some(id=>!completed(id))?0:500;return 200;
 }
 function development(keep:any){
  let refreshes=0,taken=0;
  while(w.rewardRound==='building'&&taken<6){
   const wanted=legalProjects(),shelf:any[]=[];
   for(const line of [...new Set(wanted.map(d=>d.line))]){
    assert.ok(w.setDevelopmentDirection(line));
    shelf.push(...w.rewards.filter((v:any)=>v.expeditionEffect.kind==='development').map((v:any)=>({id:v.id,offerId:v.offerId,line,definition:v.expeditionEffect.definitionId,minerals:v.minerals,gas:v.gas,eligible:w.canChooseReward(v)})));
   }
   record('development-shelf',{quota:r.equipmentDevelopmentLimit(w),taken,keep,wallet:{...w.wallet},offers:shelf});
   const choice=shelf.filter(v=>v.eligible&&affordable(v,keep)&&priority(DEVELOPMENT.find(d=>d.id===v.definition))>0).sort((a,b)=>priority(DEVELOPMENT.find(d=>d.id===b.definition))-priority(DEVELOPMENT.find(d=>d.id===a.definition)))[0];
   if(choice){
    assert.ok(w.setDevelopmentDirection(choice.line));const offer=w.rewards.find((v:any)=>v.expeditionEffect.definitionId===choice.definition);assert.ok(offer);
    const d=DEVELOPMENT.find(d=>d.id===choice.definition)!,target=d.kind==='evolution'?w.expedition.building.groups.filter((g:any)=>g.kind==='hatchery'&&!g.directions.includes(d.direction)).at(-1)?.ids[0]:undefined;
    assert.ok(action('development-purchase',{definition:d.id,offer:structuredClone(offer),target},()=>w.purchaseDevelopmentOffer(w.draftWindowKey,offer.offerId,w.expedition.shopRevision,target)));taken++;continue;
   }
   const cost=w.rerollCost(),affordableDesired=wanted.some(d=>affordable(d,keep));
   if(wanted.length&&affordableDesired&&refreshes<2&&Number.isFinite(cost)&&affordable({minerals:cost+150,gas:0},keep)){
    assert.ok(w.setDevelopmentDirection(wanted[0].line));assert.ok(action('development-refresh',{cost},()=>w.reroll()));refreshes++;continue;
   }
   record('development-stop',{reason:!wanted.length?'all-priority-projects-complete-or-unavailable':!affordableDesired?'reserve-or-cost':'shelf-or-refresh-budget',taken,keep});assert.ok(w.skipDevelopment());break;
  }
  assert.notEqual(w.rewardRound,'building','Development safety cap exceeded');
 }
 function shopping(keep:any){
  let pages=0,paidRefreshes=0,empty=0,refreshSpend=0;
  const refreshBudget=Math.max(0,(w.wallet.minerals-keep.minerals)*.35);
  record('contract-availability',{count:w.expedition.eliteContracts.length,findElites:w.talent('find_elites'),reason:'formal-entry-legacy-talents-zero'});
  while(w.rewardRound==='random'&&pages<12){
   let bought=0;const candidates=[...w.rewards].sort((a:any,b:any)=>score(b)-score(a));
   record('shop-shelf',{page:w.expedition.shopPage,keep,wallet:{...w.wallet},offers:candidates.map((v:any)=>({id:v.id,offerId:v.offerId,effect:v.expeditionEffect,price:r.equipmentPurchasePrice(w,v),priority:score(v),eligible:w.canChooseReward(v)}))});
   for(const card of candidates){
    const price=r.equipmentPurchasePrice(w,card),e=card.expeditionEffect;
    const reason=card.sold?'sold':!w.canChooseReward(card)?'no-longer-eligible':score(card)<=0?'outside-build':!affordable(price,keep)?'production-reserve':null;
    if(reason){record('shop-skip',{id:card.id,reason,price});continue;}
    const variant=e.kind==='elite'?w.eliteVariants(e.family)[0]?.id:undefined;
    const ok=action('shop-purchase',{id:card.id,offer:structuredClone(card),price,variant},()=>{const accepted=w.purchaseShopOffer(w.draftWindowKey,card.offerId,w.expedition.shopRevision,variant);prior.decisions();return accepted&&!!card.sold;});
    if(ok)bought++;else record('shop-refused',{id:card.id});
   }
   pages++;empty=bought?0:empty+1;const cost=w.rerollCost();
   const reason=pages>=12?'page-budget':empty>=2?'two-empty-pages':!Number.isFinite(cost)?'native-refresh-unavailable':cost>0&&paidRefreshes>=8?'paid-refresh-count':cost>0&&refreshSpend+cost>refreshBudget?'refresh-spend-budget':!affordable({minerals:cost+200,gas:0},keep)?'production-and-purchase-reserve':null;
   if(reason){record('shop-stop',{reason,pages,paidRefreshes,refreshSpend,refreshBudget,wallet:{...w.wallet},keep});break;}
   assert.ok(action('shop-refresh',{cost,page:w.expedition.shopPage},()=>w.reroll()));if(cost>0)paidRefreshes++;refreshSpend+=cost;
  }
 }
 function intermission(){
  inventory();const keep=reserve();record('intermission-start',{wallet:{...w.wallet},keep,units:units()});
  for(const id of w.heroes.keys())if(w.canReviveHero(id))action('hero-revive',{id},()=>w.reviveHero(id));
  const damaged=w.allies().filter((u:any)=>!u.temporary&&!u.summonOwnerId&&u.hp<u.maxHp*.95).map((u:any)=>u.id),quote=w.previewRepair(damaged);
  record('repair-decision',{targets:damaged,quote,keep,wallet:{...w.wallet},reason:!quote?'native-ineligible':quote.health<=0?'no-injury':!affordable(quote,keep)?'production-reserve-or-cost':'repair'});
  if(quote?.health>0&&affordable(quote,keep))assert.ok(action('repair',{quote},()=>w.purchaseRepair(quote.id)));
  if(w.rewardRound==='building')development(keep);
  const next=legalProjects(true)[0],shopKeep=next?{minerals:Math.max(keep.minerals,next.minerals),gas:Math.max(keep.gas,next.gas)}:keep;
  record('shop-development-reserve',{keep:shopKeep,next:next?.id??null});shopping(shopKeep);setTarget();configure();
  record('intermission-end',{wallet:{...w.wallet},units:units(),tech:{...w.expedition.tech},production:structuredClone(w.expedition.production)});
  if(options.advance!==false)assert.ok(w.finishIntermission());
 }
 return {...prior,events,prior,configure,protectDelivery,initialize:()=>{prior.initialize();setTarget();configure();},intermission,development,shopping,score,reserve};
}
