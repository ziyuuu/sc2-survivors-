import {World} from '../src/simulation/world';
import {familyLine,PRODUCTION_LINES,developmentInDirection,type ProductionLineId} from '../src/data/expedition-buildings';
import type {Race,FamilyId} from '../src/data/races';
import type {Point} from '../src/simulation/types';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
const assert={ok(value:unknown){if(!value)throw Error('Public action refused');}};
export const BUILDS:{id:string;race:Race;families:FamilyId[];actions:string[]}[]=[
 {id:'bio',race:'terran',families:['marine','marauder','reaper','viking','medivac'],actions:['barracks_lab','factory','starport','engineering_bay','stim','shield','terran.infantry']},
 {id:'siege',race:'terran',families:['marine','marauder','tank','viking','medivac'],actions:['barracks_lab','factory','factory_lab','starport','engineering_bay','stim','terran.infantry']},
 {id:'mech',race:'terran',families:['hellion','tank','thor','viking','science_vessel'],actions:['factory','factory_lab','starport','armory','science_facility','terran.vehicle']},
 {id:'swarm',race:'zerg',families:['zergling','baneling','roach','hydralisk','queen'],actions:['roach_warren','baneling_nest','lair','hatchery','hydralisk_den','evolution_chamber','zerg.carapace']},
 {id:'entrench',race:'zerg',families:['roach','ravager','hydralisk','lurker','queen'],actions:['roach_warren','lair','hatchery','hydralisk_den','lurker_den','evolution_chamber','hydra_range']},
 {id:'heavy',race:'zerg',families:['roach','ultralisk','mutalisk','corruptor','queen'],actions:['roach_warren','lair','hatchery','spire','hatchery','hive','ultralisk_cavern']},
 {id:'shield',race:'protoss',families:['zealot','stalker','sentry','immortal','colossus'],actions:['cybernetics_core','robotics','robotics_bay','forge','protoss.ground_weapon','colossus_range','protoss.shields']},
 {id:'psionic',race:'protoss',families:['zealot','stalker','sentry','high_templar','immortal'],actions:['cybernetics_core','robotics','twilight_council','templar_archives','storm','forge','protoss.ground_weapon']},
 {id:'fleet',race:'protoss',families:['zealot','sentry','phoenix','void_ray','carrier'],actions:['cybernetics_core','stargate','fleet_beacon','forge','protoss.air_weapon','protoss.shields']},
];
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const round=(n:number)=>Math.round(n*100)/100;
/** Cloaking is the runtime's visibility rule; no fog-of-war exists. Do not inspect enemy cooldowns, AI goals, waves or future events. */
export function observe(w:World){return {allies:w.allies(),enemies:[...w.entities.values()].filter(e=>e.owner==='zerg'&&e.hp>0&&w.visibleTo(e,'terran'))};}
export function createCampaignController(w:World,build:typeof BUILDS[number],onCheckpoint?:()=>void,options:{advanceIntermission?:boolean}={}){
 const s=w.expedition,events:unknown[]=[];
 let action=0,completed=0,lastMove=-100;
 const processedWindows=new Set<string>();
 const record=(kind:string,data:unknown)=>events.push({time:round(w.time),stage:w.stage,kind,data});
 const save=()=>onCheckpoint?.();
 const count=(f:FamilyId)=>w.familyUnits(f).length+s.ledger.filter(j=>j.family===f).reduce((n,j)=>n+j.passengers.filter(p=>p.status==='waiting').length,0);
 function configure(){
  if(build.race==='zerg'&&s.tech.lair)s.facilities.slice(1).forEach((f,i)=>w.assignHatcherySequence(f.id,build.id==='heavy'&&i===1?'zerg.air':'zerg.evolution'));
  // Retain starter production until the intended replacement can actually be trained.
  const starter:FamilyId=build.race==='terran'?'marine':build.race==='zerg'?'zergling':'zealot';
  const pool=[...new Set([...build.families,...(w.allies().length<4||!build.families.some(f=>!['queen','medivac','science_vessel','sentry'].includes(f)&&w.isFamilyAvailable(f))?[starter]:[])])];
  for(const key of Object.keys(s.production)){const line=key as ProductionLineId,choices=pool.filter(f=>familyLine(f)===line&&w.isFamilyAvailable(f)).sort((a,b)=>(w.allies().length<4?Number(b===starter)-Number(a===starter):0)||count(a)-count(b)||pool.indexOf(a)-pool.indexOf(b));w.setProductionOutputs(line,choices.slice(0,w.allies().length<4&&choices[0]===starter?1:2));}
  for(const p of Object.values(s.production))if(p)for(const f of p.outputs)w.setProductionEnabled(f,count(f)<(['medivac','science_vessel','queen','sentry'].includes(f)?2:5));
 }
 function hold(){if(w.order)w.cancelOrder();}
 function move(p:Point){if(w.time-lastMove<.8||w.order&&distance(w.order.point,p)<1)return;w.setFamilyMode('tank','tank');w.setFamilyMode('lurker','lurker');if(w.issueMove({x:p.x,z:p.z})){lastMove=w.time;record('move',{x:round(p.x),z:round(p.z)});}}
 function decisions(){
  if(s.pendingReceipt){const receipt=s.pendingReceipt,old=s.familySlots.find(f=>!build.families.includes(f));const preview=old?w.previewFamilyReplacement(receipt.id,old):null;if(old&&preview)w.commitFamilyReplacement(receipt.id,old,preview.revision);else w.rejectIncomingBatch(receipt.id,w.revision);record('family-receipt',receipt.id);}
  if(w.eliteChoice){const id=w.eliteChoice,target=w.eliteCandidates(id).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id)[0];if(target)record('elite-replace',w.replaceWithElite(id,target.id));}
  if(w.eliteRescueChoice){const right=w.eliteRescueChoice;if(!w.claimEliteRescueRight(right.receipt,right.eliteId))w.declineEliteRescueRight(right.receipt);record('elite-rescue',right.receipt);}
  if(s.bossLootQueue.length){w.openBossLoot();const q=s.bossLootQueue[0],e=q.reward.expeditionEffect,variant=e.kind==='elite'?w.eliteVariants(e.family)[0]?.id:undefined;const target=variant?w.eliteCandidates(variant).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]?.id:undefined;if(!w.claimBossLoot(q.receipt,variant,target))throw Error('Boss loot claim unresolved');record('boss-loot',q.receipt);}
 }
 function intermission(){
  const window=w.draftWindowKey;if(processedWindows.has(window))return;
  completed=Math.max(completed,w.stage);
  for(const id of w.heroes.keys())if(w.canReviveHero(id))record('revive',{id,ok:w.reviveHero(id)});
  const reserve=w.allies().length<4?{minerals:150,gas:50}:{minerals:75,gas:25};
  const damaged=w.allies().filter(u=>u.hp<u.maxHp*.65).map(u=>u.id),quote=w.previewRepair(damaged);if(quote&&quote.minerals<=w.wallet.minerals-reserve.minerals&&quote.gas<=w.wallet.gas-reserve.gas)record('repair',{quote,ok:w.purchaseRepair(quote.id)});
  const desired=build.actions[action];if(w.rewardRound==='building'){
   const direction=(Object.keys(PRODUCTION_LINES) as ProductionLineId[]).find(l=>PRODUCTION_LINES[l].race===build.race&&developmentInDirection(desired??'',l));if(direction)w.setDevelopmentDirection(direction);
   const offer=(w.rewards as ExpeditionReward[]).find(r=>r.expeditionEffect.kind==='development'&&r.expeditionEffect.definitionId===desired);
   if(offer&&offer.minerals<=w.wallet.minerals-reserve.minerals&&offer.gas<=w.wallet.gas-reserve.gas&&w.purchaseDevelopmentOffer(w.draftWindowKey,offer.offerId)){record('development',desired);action++;}if(w.rewardRound==='building')w.skipDevelopment();
  }
  const score=(r:ExpeditionReward)=>r.expeditionEffect.kind==='hero'?100:r.expeditionEffect.kind==='elite'?90:r.expeditionEffect.kind==='resource'?120:r.expeditionEffect.kind==='card'&&r.expeditionEffect.effect==='cultivation'?80:50;
  for(const card of [...w.rewards as ExpeditionReward[]].sort((a,b)=>score(b)-score(a))){if(!w.canChooseReward(card)||card.expeditionEffect.kind!=='resource'&&(card.minerals>w.wallet.minerals-reserve.minerals||card.gas>w.wallet.gas-reserve.gas))continue;const variant=card.expeditionEffect.kind==='elite'?w.eliteVariants(card.expeditionEffect.family)[0]?.id:undefined;if(w.purchaseShopOffer(w.draftWindowKey,card.offerId,s.shopRevision,variant))record('shop',card.id);decisions();}
  w.setDevelopmentTarget(build.actions[action]??null);configure();processedWindows.add(window);if(options.advanceIntermission!==false){assert.ok(w.finishIntermission());save();}
 }
 function think(){
  configure();const {allies,enemies}=observe(w),fighters=allies.filter(u=>!['medivac','science_vessel'].includes(u.unitType));
  const nearest=enemies.sort((a,b)=>Math.min(...fighters.map(u=>distance(u,a)))-Math.min(...fighters.map(u=>distance(u,b)))||a.id-b.id)[0];
  // G is scheduled from the public stage warning, never from a hidden enemy's presence.
  if(w.stage>=10&&w.time>=s.detectionReady&&w.castDetection())record('scan',true);
  if(nearest&&distance(nearest,w.anchor)<15){for(let slot=0;slot<3;slot++)if(w.castHeroSlot(slot))record('hero-skill',slot);}
  const danger=w.effects.find(e=>e.kind==='bile'&&e.owner==='zerg'&&distance(e.end,w.anchor)<e.radius+1.5);
  if(danger){const d=distance(w.anchor,danger.end)||1;move({x:w.anchor.x+(w.anchor.x-danger.end.x)/d*5,z:w.anchor.z+(w.anchor.z-danger.end.z)/d*5});return;}
  const ranged=fighters.filter(u=>u.attackRange>=3);
  if(w.stage>=3&&fighters.length>=3&&nearest&&ranged.length>=Math.max(1,fighters.length/2)&&ranged.every(u=>u.weaponCooldown>.25)&&ranged.some(u=>distance(u,nearest)<2.8+nearest.unitRadius)){const d=distance(w.anchor,nearest)||1;const p={x:w.anchor.x+(w.anchor.x-nearest.x)/d*3,z:w.anchor.z+(w.anchor.z-nearest.z)/d*3};if(!w.terrain||w.terrain.canOccupy(p,.9)){move(p);return;}}
  if(nearest&&fighters.some(u=>w.canFireAt(u,nearest,0))){
   hold();if(w.familyUnits('tank').some(u=>distance(u,nearest)>3&&distance(u,nearest)<12))w.setFamilyMode('tank','siege');if(w.familyUnits('lurker').some(u=>distance(u,nearest)<10))w.setFamilyMode('lurker','lurker_burrowed');return;
  }
  const loot=[...w.pickups,...w.rewardDrops].sort((a,b)=>distance(a,w.anchor)-distance(b,w.anchor))[0];
  const pod=w.pods.filter(p=>['active','opening','falling'].includes(p.status)).sort((a,b)=>distance(a,w.anchor)-distance(b,w.anchor))[0];
  const economic=[...w.economicTargets.values()].filter(e=>e.status==='active').sort((a,b)=>distance(a,w.anchor)-distance(b,w.anchor))[0];
  const target=nearest&&distance(nearest,w.anchor)<12?nearest:loot&&distance(loot,w.anchor)<8?loot:pod??economic??loot??(w.hive&&w.hive.hp>0?w.hive:null);
  if(target){const fighter=fighters.sort((a,b)=>distance(a,target)-distance(b,target))[0]??w.anchor;const range=target===nearest?Math.max(.3,Math.min(...fighters.map(u=>u.attackRange))-.4):0,d=distance(fighter,target)||1;move({x:target.x+(fighter.x-target.x)/d*range,z:target.z+(fighter.z-target.z)/d*range});}else hold();
 }
 return {events, configure, think, decisions, intermission, get completed(){return completed;}, initialize(){w.setDevelopmentTarget(build.actions[0]);configure();}, tick(){decisions();if(w.phase==='reward')intermission();else if(w.phase==='battle')think();}};
}
