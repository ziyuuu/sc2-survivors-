import {HEROES} from '../../data/heroes';
import {ALL_FAMILIES} from '../../data/races';
import type {ArmedSupportState,ArmedFormalLoss} from './armed-support-state';
const tick=(n:unknown):n is number=>Number.isSafeInteger(n)&&Number(n)>=0;
const id=(n:unknown):n is number=>tick(n)&&n>0;
const point=(p:any)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const generation=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const loss=(l:ArmedFormalLoss)=>!!l&&id(l.entityId)&&generation(l.generation)&&ALL_FAMILIES.includes(l.family)&&tick(l.rank)&&l.rank>=1&&l.rank<=5&&tick(l.tick);
export function validateArmedEffectsState(a:ArmedSupportState){
 if(a.raiderReceipts!==undefined&&(!Array.isArray(a.raiderReceipts)||a.raiderReceipts.some(r=>typeof r!=='string')||new Set(a.raiderReceipts).size!==a.raiderReceipts.length))throw Error('游骑兵爆破回执无效');
 for(const d of a.deployments??[]){const s=d.sweep;if(s&&(d.cardId!=='O03'||![s.startedTick,s.endTick,s.nextTick,s.nextIndex,s.pulses].every(tick)||s.endTick<=s.startedTick||s.nextIndex>s.pulses||s.pulses<1||s.pulses>32||!Number.isFinite(s.angle)||!Number.isFinite(s.damage)||s.damage<0))throw Error('要塞扫射回执无效');}
 for(const s of Object.values(a.unitStatus??{}))if(s.raiderExitReached!==undefined&&typeof s.raiderExitReached!=='boolean'||s.raiderTarget&&(!id(s.raiderTarget.id)||!generation(s.raiderTarget.generation)))throw Error('游骑兵追击来源无效');
 for(const v of a.volleys??[])if(v.calibrated!==undefined&&!['N06','N07'].includes(v.calibrated)||v.shots.some(s=>s.suppressTicks!==undefined&&(!tick(s.suppressTicks)||s.suppressTicks>360)))throw Error('协同炮火回执无效');
 for(const d of a.deployments??[])if(d.blockadeExit!==undefined&&!point(d.blockadeExit))throw Error('封锁出口无效');
 for(const s of Object.values(a.unitStatus??{}))if(s.suppressUntil!==undefined&&!tick(s.suppressUntil)||s.withdraw!==undefined&&(!point(s.withdraw.goal)||!tick(s.withdraw.untilTick)||!generation(s.withdraw.generation))||s.damageReduction!==undefined&&(!Number.isFinite(s.damageReduction.factor)||s.damageReduction.factor<0||s.damageReduction.factor>1||!tick(s.damageReduction.untilTick)))throw Error('交班防护状态无效');
 const n=a.nodes;
 if(n){const m=n.mark,c=n.control;if(m&&(!id(m.target)||!generation(m.generation)||!point(m.point)||!point(m.direction)||!tick(m.untilTick))||c&&(!point(c.point)||!point(c.exit)||!tick(c.untilTick)||!id(c.sourceId))||n.missilePair&&(!id(n.missilePair.transport)||n.missilePair.transport>=a.nextCast))throw Error('协同来源状态无效');
  if(n.links!==undefined&&(!Array.isArray(n.links)||n.links.some(l=>!l||!id(l.transport)||!tick(l.fire)||!tick(l.tick)||!['N06','N07','N08'].includes(l.node)))||n.handoffs!==undefined&&(!Array.isArray(n.handoffs)||n.handoffs.some(h=>!h||!id(h.castId)||h.castId>=a.nextCast||!id(h.newId)||!generation(h.generation)||!tick(h.createdTick)))||n.batches!==undefined&&(!n.batches||typeof n.batches!=='object'||Array.isArray(n.batches)||Object.entries(n.batches).some(([cast,b])=>!id(Number(cast))||Number(cast)>=a.nextCast||!b||!tick(b.count)||b.count>2||!Array.isArray(b.oldIds)||new Set(b.oldIds).size!==b.oldIds.length||b.oldIds.some(v=>!id(v)))))throw Error('协同批次回执无效');
 }
 const c=a.counter;if(!c)return;
 if(!Array.isArray(c.losses)||c.losses.length>10||c.losses.some(l=>!loss(l))||!tick(c.invulnerableUntil))throw Error('绝境反攻战损状态无效');
 const active=c.activation;if(active&&(!id(active.id)||active.id>=a.nextCast||typeof active.stageKey!=='string'||!active.stageKey||!tick(active.startedTick)||typeof active.finished!=='boolean'||typeof active.heroPending!=='boolean'||!HEROES[active.hero]||HEROES[active.hero].race!=='terran'||!Array.isArray(active.targets)||active.targets.some(t=>!id(t.id)||!generation(t.generation))||new Set(active.targets.map(t=>t.id)).size!==active.targets.length||!Array.isArray(active.losses)||active.losses.length!==10||active.losses.some(l=>!loss(l))))throw Error('绝境反攻激活回执无效');
 const h=c.temporaryHero;if(h&&(!HEROES[h.id]||HEROES[h.id].race!=='terran'||h.rank!==5||!id(h.entityId)||!Number.isFinite(h.skillReady)||h.skillReady<0||h.revivePaid!==false||h.awaitingSpawn!==false))throw Error('绝境反攻英雄状态无效');
}
