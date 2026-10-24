import type {World} from '../world';
import {specialAllowed} from '../progression/fun-availability';
import type {Body,Entity} from '../types';
import {distance,clearLine} from '../movement/steering';
import {SPECIAL_STAGE_KINDS,SPECIAL_STAGE_NAMES,type SpecialStageKind,type SpecialActive} from './state';
import {specialMembers,canSelectFour,selectFour,specialRankCap} from './participants';
import {parkNormalWorld,resumeNormalWorld} from './bridge';
import {initializeResources,crossingRewards} from './rewards';
import {initializeArena} from './arena';
import {stepDodge} from './dodge';
import {initializeCrossing,tickCrossing,crossingCounts} from './crossing';
import {refreshEquipmentMember} from '../starship/members';
import {equipmentSurvivesWipe} from '../starship/lifecycle';
import {initializeCarrierSubsystem} from '../combat/carriers';
import {SpecialTerrain} from './terrain';
export function constrainSpecialAnchor(w:World){
 if(!w.specialStages.active||!(w.terrain instanceof SpecialTerrain))return;
 const e=w.terrain.extent,margin=Math.max(1.5,...w.allies().map(u=>u.unitRadius+.4));
 w.anchor.x=Math.max(-e.x+margin,Math.min(e.x-margin,w.anchor.x));w.anchor.z=Math.max(-e.z+margin,Math.min(e.z-margin,w.anchor.z));
}
export function legalSpecialKinds(w:World){return specialMembers(w).length?SPECIAL_STAGE_KINDS.filter(k=>specialAllowed(w.difficulty,k)&&(k!=='dodge'||canSelectFour(w))):[];}
export function specialStageAvailable(w:World,stage=w.stage){const used=w.specialStages.used;return stage>=4&&stage<=18&&used.size<3&&!used.has(stage)&&(!used.size||stage>=Math.max(...used)+3);}
function preferredSpecialKinds(w:World){const kinds=legalSpecialKinds(w),other=kinds.filter(k=>k!==w.specialStages.lastEnteredKind);return other.length?other:kinds;}
export function beginSpecialStage(w:World,kind:SpecialStageKind,source:'ticket'|'portal'|'fixture'='portal'){
 const s=w.specialStages;
 if(w.phase!=='battle'||w.paused||w.requiresPlayerDecision||s.active||!specialStageAvailable(w)||w.endless||!legalSpecialKinds(w).includes(kind))return false;
 if(source==='ticket'&&(!s.ticket?.claimed||s.ticket.stage!==w.stage||s.ticket.kind!==kind))return false;
 if(source==='portal'&&(!s.portal||s.portal.kind!==kind||w.time>=s.portal.until||distance(w.anchor,s.portal.point)>3||!clearLine(w.anchor,s.portal.point,.5,w.obstacles,w.terrain)))return false;
 const members=kind==='dodge'?selectFour(w):specialMembers(w);if(!members?.length)return false;
 const a:SpecialActive={id:(w.runId??'run')+':special:'+ ++s.serial,kind,stage:w.stage,phase:'loading',clock:0,participants:members.map(u=>u.id),pairs:[...new Set(members.map(u=>u.pairId).filter((v):v is string=>!!v))],caps:new Map(members.map(u=>[u.id,specialRankCap(w,u)])),ranks:new Map(members.map(u=>[u.id,u.rank])),escaped:new Set(),evacuated:new Map(),resources:new Map(),enemies:[],barrage:[],cue:null,nextPattern:180,patterns:0,hits:0,graceUntil:0,nextSwarm:180,swarmSerial:0,cards:[],rewardIds:[],heroIds:[]};
 s.active=a;s.last=null;
 try{parkNormalWorld(w,a,members);if(kind==='crossing')initializeCrossing(w);if(kind==='resources')initializeResources(w);if(kind==='arena')initializeArena(w);if(kind!=='dodge')initializeCarrierSubsystem(w);}
 catch(error){resumeNormalWorld(w,'quit');s.active=null;w.announce('特殊关准备失败，已返回原战场：'+String(error));return false;}
 s.used.add(a.stage);s.lastEnteredKind=kind;s.portal=null;if(s.ticket?.stage===a.stage)s.ticket=null;
 w.announce(SPECIAL_STAGE_NAMES[kind]+' · 准备场景');return true;
}
export function markSpecialReady(w:World){const a=w.specialStages.active;if(!a||a.phase!=='loading')return false;a.phase='active';w.announce(SPECIAL_STAGE_NAMES[a.kind]+' · 挑战开始');return true;}
export function specialBlocksSimulation(w:World){return !!w.specialStages.active&&w.specialStages.active.phase!=='active';}
export function specialMovementOnly(w:World){return w.specialStages.active?.kind==='dodge';}
export function specialBeforeStep(w:World){
 const a=w.specialStages.active;if(!a)return false;if(a.phase!=='active')return true;
 if(a.kind==='dodge'){stepDodge(w,result=>finishSpecialStage(w,result));return true;}
 a.clock++;return false;
}
export function specialAfterStep(w:World){
 const a=w.specialStages.active;if(!a||a.phase!=='active')return;
 if(a.kind==='crossing'){
  tickCrossing(w);const c=crossingCounts(w);
  if(!c.living&&!c.pending){if(!c.escaped&&!equipmentSurvivesWipe(w))finishSpecialStage(w,'failed');else if(c.escaped)finishSpecialStage(w,'success');}
  return;
 }
 if(!a.participants.some(id=>(w.entities.get(id)?.hp??0)>0)&&!equipmentSurvivesWipe(w)){finishSpecialStage(w,'failed');return;}
 if(a.kind==='resources'&&a.clock>=1800)finishSpecialStage(w,'timeout');
 if(a.kind==='arena'){if(a.enemies.every(id=>(w.entities.get(id)?.hp??0)<=0))finishSpecialStage(w,'success');else if(a.clock>=5400)finishSpecialStage(w,'timeout');}
}
export function finishSpecialStage(w:World,result:NonNullable<SpecialActive['result']>){
 const a=w.specialStages.active;if(!a||a.result)return false;a.result=result;
 if(a.kind==='dodge'){
  const seen=new Set<string>();
  for(const id of a.participants){const u=w.entities.get(id);if(!u)continue;const key=u.pairId??String(id);if(seen.has(key))continue;seen.add(key);
   const rank=Math.max(1,Math.min(a.caps.get(id)!,a.ranks.get(id)!+(result==='success'?2:-2)));
   refreshEquipmentMember(w,u,()=>{u.rank=rank;if(u.heroId){const h=w.heroes.get(u.heroId);if(h)h.rank=rank;}});
  }
  return resumeNormalWorld(w,result);
 }
 if(result==='success'&&(a.kind==='arena'||a.kind==='crossing')){
  if(a.kind==='crossing')crossingRewards(w);
  a.phase='loot';w.input={x:0,z:0};w.announce('挑战成功 · 整理战利品后返回');w.changed();return true;
 }
 return resumeNormalWorld(w,result);
}
/** Completion return only. Active or loading challenges have no player abandon action. */
export function quitSpecialStage(w:World){
 const a=w.specialStages.active;if(!a||a.phase!=='loot')return false;
 if(a.phase==='loot'){
  if(a.kind==='crossing'&&a.rewardIds.some(id=>w.starship.account.locations[id]?.kind==='ground')){w.announce('请先领取3件动力装备；背包满时可丢弃或销毁物品');return false;}
  return resumeNormalWorld(w,a.result??'success');
 }
 return false;
}
export function specialAllowsDamage(w:World,target:Body,sourceId?:number){
 const a=w.specialStages.active;if(!a)return true;
 return a.kind!=='dodge'&&a.phase==='active'&&!a.escaped.has(target.id)&&(sourceId===undefined||!a.escaped.has(sourceId));
}
export function specialCardPickup(w:World,id:number){
 const a=w.specialStages.active;if(!a)return undefined;const drop=w.rewardDrops.find(p=>p.id===id);if(!drop)return false;
 if(!a.cards.some(p=>p.id===id))a.cards.push(structuredClone(drop));w.rewardDrops=w.rewardDrops.filter(p=>p.id!==id);w.changed();return true;
}
export function offerSpecialTicket(w:World){
 const s=w.specialStages,stage=w.stage+1;if(w.phase!=='reward'||stage<4||stage>18||w.endless||s.offerChecked===stage)return;
 s.offerChecked=stage;if(s.ticket?.claimed||!specialStageAvailable(w,stage))return;const kinds=preferredSpecialKinds(w);if(kinds.length&&w.random()<.25)s.ticket={stage,kind:kinds[Math.floor(w.random()*kinds.length)],claimed:false};
}
export function claimSpecialTicket(w:World){const t=w.specialStages.ticket;if(w.phase!=='reward'||!t||t.claimed||t.stage!==w.stage+1||!specialStageAvailable(w,t.stage)||w.endless||!legalSpecialKinds(w).includes(t.kind))return false;t.claimed=true;w.announce('已领取免费门票 · 下一关先进入'+SPECIAL_STAGE_NAMES[t.kind]);w.changed();return true;}
export function enterSpecialTicket(w:World){
 const t=w.specialStages.ticket;if(!t)return false;
 if(t.stage<=w.stage&&!t.claimed||t.stage<w.stage){w.specialStages.ticket=null;return false;}
 if(!t.claimed||t.stage!==w.stage)return false;
 if(!specialStageAvailable(w)||!legalSpecialKinds(w).includes(t.kind)){w.specialStages.ticket=null;w.announce('特殊关资格不足，免费门票取消 · 继续正常关');return false;}
 return beginSpecialStage(w,t.kind,'ticket');
}
export function tickSpecialEntrance(w:World){
 const s=w.specialStages;if(s.active||w.phase!=='battle'||w.paused||w.requiresPlayerDecision||w.endless||w.stage<4||w.stage>18)return;
 if(!specialStageAvailable(w)){if(s.portal){s.portal=null;w.changed();}return;}
 if(s.portal&&(w.time>=s.portal.until||!legalSpecialKinds(w).includes(s.portal.kind))){s.portal=null;w.changed();}
 if(s.portal){beginSpecialStage(w,s.portal.kind,'portal');return;}
 if(w.diagnosticRun)return;
 if(s.used.has(w.stage)||s.portal||s.portalChecked===w.stage||w.stageElapsed<20||w.stageElapsed>w.duration*.6)return;
 const kinds=preferredSpecialKinds(w);if(!kinds.length)return;const candidates=w.spawnLocations.filter(p=>distance(p,w.anchor)>=8&&distance(p,w.anchor)<=18&&w.terrain?.canOccupy(p,1)!==false&&clearLine(w.anchor,p,.8,w.obstacles,w.terrain));if(!candidates.length)return;
 s.portalChecked=w.stage;if(w.random()>=.2)return;
 const point=candidates[Math.floor(w.random()*candidates.length)],kind=kinds[Math.floor(w.random()*kinds.length)];s.portal={kind,point:{...point},until:w.time+30};w.announce(SPECIAL_STAGE_NAMES[kind]+'传送门出现 · 靠近自动进入');
}
export function specialStatus(w:World){
 const a=w.specialStages.active;if(!a)return '';
 const title=SPECIAL_STAGE_NAMES[a.kind];if(a.phase==='loading')return title+' · 场景准备中';if(a.phase==='loot')return title+' · 挑战成功，领取战利品后返回';
 if(a.kind==='crossing'){const c=crossingCounts(w);return title+' · 已撤离 '+c.escaped+' / 待抵达 '+c.living+(c.pending?' · 等待复生':'');}
 return title+' · '+Math.max(0,Math.ceil((a.kind==='resources'?1800:a.kind==='arena'?5400:3600)-a.clock)/60).toFixed(1)+'s'+(a.kind==='dodge'?' · 剩余 '+(5-a.hits)+'/5 次机会':a.kind==='arena'?' · 敌人 '+a.enemies.filter(id=>(w.entities.get(id)?.hp??0)>0).length:'');
}
