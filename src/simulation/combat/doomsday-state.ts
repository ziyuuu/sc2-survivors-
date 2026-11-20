import {DOOMSDAY_CARD_BY_ID,isDoomsdayId,type DoomsdayId} from '../../data/terran-doomsday';
import type {FamilyId} from '../../data/races';
import {FAMILIES_BY_RACE} from '../../data/races';
import type {Entity,Point} from '../types';
export interface DoomsdayPayload {damage:number;bonuses:{attribute:string;amount:number}[];hits:number;shieldBonus:number;crit:number;enemyFactor:number;}

export interface MechanicalMemberRef {entityId:number;bornAt:number}
export interface MechanicalSeat extends MechanicalMemberRef {family:FamilyId}
export interface DoomsdayPurchaseReceipt {offerId:string;cardId:DoomsdayId;rank:number;progress:number}
export interface DoomsdayBlueprint {family:FamilyId;host:MechanicalMemberRef|null;initialized:boolean;losses:number;order?:{kind:'incoming';jobId:number;passengerIndex:number}|{kind:'onsite';jobId:number;target:MechanicalMemberRef};}
export interface DoomsdayState {
 slashes?:DoomsdaySlash[];
 areas?:DoomsdayArea[];
 dots?:{source:Entity;target:MechanicalMemberRef;payload:DoomsdayPayload;nextTick:number;remaining:number}[];
 coldReadyTick?:number; pincerReadyTick?:number; resonanceReadyTick?:number;
 pincer?:Record<string,{untilTick:number;followers:number[];enhanced:boolean}>;
 splitHits?:Record<string,{target:number;point:Point;tick:number}[]>;
 furyRounds?:Record<string,{fraction:number;tick:number}>;
 ranks:Partial<Record<DoomsdayId,number>>;
 nodeReserves:Partial<Record<DoomsdayId,number>>;
 purchases:DoomsdayPurchaseReceipt[];
 seats:MechanicalSeat[];
 /** A grandfathered member retains the body upgrades already earned at lock time. */
 veterans:(MechanicalSeat&{ranks:Partial<Record<DoomsdayId,number>>})[];
 crossfire?:Record<string,{source:MechanicalMemberRef;x:number;z:number;tick:number;round:string;ready:number}>;
 hitRounds?:Record<string,number>;
 salvos?:{id:number;expires:number;enhanced:boolean;members:(MechanicalMemberRef&{serial:number;fired:boolean})[]}[];
 nextSalvo?:number;
 parkedSalvoReservations?:number;
 parkedResonanceReservations?:number;
 interceptReady?:number;
 scrap?:{id:number;source:MechanicalMemberRef;x:number;z:number}[];
 blueprints?:Partial<Record<DoomsdayId,DoomsdayBlueprint>>;
 splitSpent?:Record<string,number>;
 knockReady?:Record<string,number>;
}
export interface DoomsdayCombat {
 mechanized?:boolean;
 polarized?:boolean;
 channel?:'air'|'ground';
 heroArmor?:{max:number;remaining:number};
 giant?:{nextReadyTick:number;lastFireTick:number;rounds:number;cannons:number;pendingCannon:boolean;cannonReadyTick?:number;cannonPayload?:DoomsdayPayload;pendingNuke?:{tick:number;point:Point;payload:DoomsdayPayload}};
 dual?:{air:{nextReadyTick:number;target:number|null};ground:{nextReadyTick:number;target:number|null}};
 nanoArmorUntilTick?:number;nanoAmmo?:boolean;airPairUntilTick?:number;
 walked:number;lastWalked:number;settled:number;ready:boolean;serial:number;
 nano?:{max:number;remaining:number;regenTick:number};
 batteryStage?:string;
 visualScale?:number;
 brace?:{settled:number;readyTick:number};
 fragmentReadyTick?:number;
 tow?:{helper:MechanicalMemberRef;goal:{x:number;z:number};untilTick:number;readyTick:number};
 special?:DoomsdayId;
 capacitor?:number;
 turretReadyTick?:number;
 blueFlame?:Record<string,{bornAt:number;untilTick:number;speed:number}>;
 tankRounds?:number;
 station?:{origin:Point;rounds:number};
 round?:{sequence:number;gun:boolean;crossfire:boolean;preheated:boolean;damageFactor:number;penetration:number;hits:number;salvo:number|null;cards?:Partial<Record<DoomsdayId,number>>;special?:DoomsdayId;budget?:DoomsdayPayload;scheduled?:boolean;pierce?:boolean;melee?:boolean;shotStyle?:number;};
}
/** One fixed facing and one atomic impact per slash. Kept until recovery ends for pose reconstruction. */
export interface DoomsdaySlash {
 id:number;source:Entity;payload:DoomsdayPayload;startTick:number;hitTick:number;endTick:number;
 facing:number;variant:0|1;repeat:boolean;settled:boolean;
}
export interface DoomsdayArea {
 id:number;kind:'station'|'cold'|'resonance'|'fortress'|'cannon'|'nuke';
 source:Entity;payload:DoomsdayPayload;dueTick:number;points:Point[];radius:number;flying:boolean;
 line?:{from:Point;to:Point;width:number};enhanced?:boolean;round?:string;row?:number;native?:boolean;
 forward?:Point;range?:number;minimumRange?:number;pierce?:boolean;
 pendingLaunch?:boolean;launchTick?:number;primaryTarget?:number;
}
export const newDoomsdayState=():DoomsdayState=>({ranks:{},nodeReserves:{},purchases:[],seats:[],veterans:[]});
export const doomsdayRank=(s:DoomsdayState|undefined,id:DoomsdayId)=>s?.ranks[id]??0;
const finite=(v:unknown,min=-Infinity,max=Infinity):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const counter=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>finite(v,min,max)&&Number.isSafeInteger(v);
// The archive graph codec deliberately decodes dictionaries with a null prototype.
const record=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const memberRef=(v:MechanicalMemberRef)=>!!v&&counter(v.entityId,1)&&finite(v.bornAt,0);
const point=(v:Point)=>!!v&&finite(v.x)&&finite(v.z);
const roundKey=(s:string)=>/^\d+:[\d.]+:\d+$/.test(s);
const specialFamilies:Record<string,string>={'M-G06':'hellion','M-B07':'viking','M-P06':'banshee','M-O02':'thor','M-O03':'tank'};
export function validateDoomsdayPayload(p:DoomsdayPayload){
 if(!record(p)||!finite(p.damage,0)||!finite(p.shieldBonus,0)||!finite(p.crit,0)||!finite(p.enemyFactor,0)||!counter(p.hits,1,64)||!Array.isArray(p.bonuses)||p.bonuses.some(b=>!b||typeof b.attribute!=='string'||!b.attribute||!finite(b.amount)))throw Error('机械冻结武器预算无效');
}
function validateSource(u:Entity){
 if(!u||!counter(u.id,1)||!finite(u.bornAt,0)||u.team!=='player'||u.owner!=='terran'||!point(u)||!finite(u.maxHp,0)||!finite(u.hp)||!finite(u.attackRange,0)||!finite(u.attackFacing)||!Array.isArray(u.attributes)||!FAMILIES_BY_RACE.terran.includes(u.unitType as never))throw Error('机械攻击来源无效');
 validateDoomsdayCombat(u.doomsday);
}
export function validateDoomsdayState(s:DoomsdayState|undefined){
 if(s===undefined)return;
 const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
 if(!record(s)||!record(s.ranks)||!record(s.nodeReserves)||!Array.isArray(s.purchases)||!Array.isArray(s.seats)||!Array.isArray(s.veterans))throw Error('机械构筑状态无效');
 for(const [id,rank] of Object.entries(s.ranks))if(!isDoomsdayId(id)||!integer(rank,1,DOOMSDAY_CARD_BY_ID[id].maxRank))throw Error('机械牌档位无效');
 for(const [id,reserve] of Object.entries(s.nodeReserves))if(!isDoomsdayId(id)||DOOMSDAY_CARD_BY_ID[id].purchase!=='node'||!s.ranks[id]||!integer(reserve,0,2))throw Error('机械节点储备无效');
 const offers=new Set<string>();
 for(const receipt of s.purchases){
  if(!receipt||typeof receipt.offerId!=='string'||!receipt.offerId||offers.has(receipt.offerId)||!isDoomsdayId(receipt.cardId))throw Error('机械购买回执无效');
  const c=DOOMSDAY_CARD_BY_ID[receipt.cardId];
  if(c.purchase==='node'||!integer(receipt.rank,1,c.maxRank)||receipt.rank>doomsdayRank(s,c.id)||receipt.progress!==(c.purchase==='orange'||c.purchase==='white-rank'&&receipt.rank>1?0:1))throw Error('机械购买进度无效');
  offers.add(receipt.offerId);
 }
 const refs=new Set<string>();
 for(const member of [...s.seats,...s.veterans]){
  if(!member||!integer(member.entityId,1)||!Number.isFinite(member.bornAt)||member.bornAt<0||!FAMILIES_BY_RACE.terran.includes(member.family as never))throw Error('机械强化席无效');
  const key=member.entityId+':'+member.bornAt;if(refs.has(key))throw Error('机械强化席重复');refs.add(key);
  if('ranks' in member){const ranks=(member as DoomsdayState['veterans'][number]).ranks;if(!record(ranks))throw Error('机械过渡改装无效');for(const [id,rank] of Object.entries(ranks))if(!isDoomsdayId(id)||!integer(rank,1,DOOMSDAY_CARD_BY_ID[id].maxRank)||rank!>doomsdayRank(s,id))throw Error('机械过渡改装无效');}
 }
 if(s.nextSalvo!==undefined&&!integer(s.nextSalvo,0))throw Error('预热齐射序号无效');
 if(s.interceptReady!==undefined&&!integer(s.interceptReady,0))throw Error('拦截冷却无效');
 for(const [id,b] of Object.entries(s.blueprints??{})){
  if(!['M-G06','M-G07','M-B07','M-B09','M-P04','M-P06','M-O02','M-O03'].includes(id)||!s.ranks[id as DoomsdayId]||!b||!FAMILIES_BY_RACE.terran.includes(b.family as never)||typeof b.initialized!=='boolean'||!integer(b.losses,0))throw Error('机械图纸无效');
  if(specialFamilies[id]&&specialFamilies[id]!==b.family||b.host===undefined)throw Error('机械图纸家族无效');
  const member=(r:MechanicalMemberRef)=>integer(r?.entityId,1)&&Number.isFinite(r?.bornAt)&&r.bornAt>=0;
  if(b.host&&(!member(b.host)||!b.initialized||b.order))throw Error('机械图纸宿主无效');
  if(b.order&&(!['incoming','onsite'].includes(b.order.kind)||!integer(b.order.jobId,1)||(b.order.kind==='incoming'?!integer(b.order.passengerIndex,0):!member(b.order.target))))throw Error('机械图纸工序无效');
 }
 if(s.scrap!==undefined&&!Array.isArray(s.scrap))throw Error('备件状态无效');
 const scrapIds=new Set<number>(),scrapSources=new Set<string>();
 for(const p of s.scrap??[]){const key=p?.source?.entityId+':'+p?.source?.bornAt;if(!p||!integer(p.id,1)||scrapIds.has(p.id)||scrapSources.has(key)||!integer(p.source?.entityId,1)||!Number.isFinite(p.source?.bornAt)||![p.x,p.z].every(Number.isFinite))throw Error('备件回执无效');scrapIds.add(p.id);scrapSources.add(key);}
 for(const [key,tick] of Object.entries(s.hitRounds??{}))if(!/^\d+:[\d.]+:\d+$/.test(key)||!integer(tick,0))throw Error('机械原轮回执无效');
 for(const [id,mark] of Object.entries(s.crossfire??{}))if(!/^\d+$/.test(id)||!mark||!integer(mark.source?.entityId,1)||!Number.isFinite(mark.source.bornAt)||![mark.x,mark.z].every(Number.isFinite)||!integer(mark.tick,0)||!integer(mark.ready,0)||typeof mark.round!=='string')throw Error('交叉校射回执无效');
 if(s.salvos!==undefined&&!Array.isArray(s.salvos))throw Error('预热齐射数据无效');
 const groups=new Set<number>();
 for(const group of s.salvos??[]){
  if(!group||!integer(group.id,1)||group.id>(s.nextSalvo??0)||groups.has(group.id)||!integer(group.expires,0)||typeof group.enhanced!=='boolean'||!Array.isArray(group.members)||group.members.length<1||group.members.length>4||group.enhanced&&group.members.length!==4)throw Error('预热齐射组无效');groups.add(group.id);
  const members=new Set<number>();for(const member of group.members){if(!integer(member.entityId,1)||members.has(member.entityId)||!Number.isFinite(member.bornAt)||!integer(member.serial,1)||typeof member.fired!=='boolean')throw Error('预热齐射成员无效');members.add(member.entityId);}
 }
 if(s.parkedSalvoReservations!==undefined&&!integer(s.parkedSalvoReservations,0,2))throw Error('原场预热预约无效');
 if((s.salvos??[]).filter(g=>g.enhanced).length+(s.parkedSalvoReservations??0)>(s.nodeReserves['M-N04']??0))throw Error('预热储备预约超额');
 for(const key of ['blueprints','crossfire','hitRounds','pincer','splitHits','furyRounds','splitSpent','knockReady'] as const)if(s[key]!==undefined&&!record(s[key]))throw Error('机械战场记录无效');
 for(const key of ['coldReadyTick','pincerReadyTick','resonanceReadyTick'] as const)if(s[key]!==undefined&&!counter(s[key]))throw Error('机械节点冷却无效');
 if(s.parkedResonanceReservations!==undefined&&!counter(s.parkedResonanceReservations,0,2))throw Error('原场爆线预约无效');
 for(const [id,m] of Object.entries(s.pincer??{}))if(!/^\d+$/.test(id)||!m||!counter(m.untilTick)||typeof m.enhanced!=='boolean'||!Array.isArray(m.followers)||m.followers.length>2||m.followers.some(n=>!counter(n,1))||new Set(m.followers).size!==m.followers.length)throw Error('空地夹击标记无效');
 if(Object.values(s.pincer??{}).filter(m=>m.enhanced).length>(s.nodeReserves['M-N08']??0))throw Error('夹击储备预约超额');
 for(const [key,hits] of Object.entries(s.splitHits??{}))if(!roundKey(key)||!Array.isArray(hits)||hits.length>3||new Set(hits.map(h=>h.target)).size!==hits.length||hits.some(h=>!h||!counter(h.target,1)||!counter(h.tick)||!point(h.point)))throw Error('子弹命中标记无效');
 for(const [key,v] of Object.entries(s.furyRounds??{}))if(!roundKey(key)||!v||![.1,.2].includes(v.fraction)||!counter(v.tick))throw Error('幽能怒火回执无效');
 for(const [key,tick] of Object.entries(s.splitSpent??{}))if(!roundKey(key)||!counter(tick))throw Error('母弹分裂回执无效');
 for(const [id,tick] of Object.entries(s.knockReady??{}))if(!/^\d+$/.test(id)||!counter(tick))throw Error('击退冷却无效');
 if(s.dots!==undefined&&!Array.isArray(s.dots)||s.areas!==undefined&&!Array.isArray(s.areas)||s.slashes!==undefined&&!Array.isArray(s.slashes))throw Error('机械待结算记录无效');
 const slashes=new Set<number>();for(const e of s.slashes??[]){
  if(!e||!counter(e.id,1)||slashes.has(e.id)||!counter(e.startTick)||!counter(e.hitTick,e.startTick+1)||!counter(e.endTick,e.hitTick+1)||!finite(e.facing)||![0,1].includes(e.variant)||typeof e.repeat!=='boolean'||typeof e.settled!=='boolean')throw Error('光剑排程无效');
  validateSource(e.source);validateDoomsdayPayload(e.payload);if(e.source.doomsday?.special!=='M-O02'||!e.source.doomsday.round?.melee||e.payload.hits!==1)throw Error('光剑原轮归属无效');slashes.add(e.id);
 }
 const dots=new Set<string>();for(const d of s.dots??[]){if(!d||!memberRef(d.target)||!counter(d.nextTick)||!counter(d.remaining,1,3))throw Error('纳米弹持续伤害无效');validateSource(d.source);validateDoomsdayPayload(d.payload);const key=d.source.id+':'+d.source.bornAt+':'+d.target.entityId+':'+d.target.bornAt;if(dots.has(key))throw Error('纳米弹持续伤害重复');dots.add(key);}
 const areas=new Set<number>();for(const e of s.areas??[]){
  if(!e||!counter(e.id,1)||areas.has(e.id)||!['station','cold','resonance','fortress','cannon','nuke'].includes(e.kind)||!counter(e.dueTick)||!Array.isArray(e.points)||e.points.some(p=>!point(p))||!finite(e.radius,0)||typeof e.flying!=='boolean')throw Error('机械场地排程无效');areas.add(e.id);validateSource(e.source);validateDoomsdayPayload(e.payload);
  for(const k of ['enhanced','native','pierce','pendingLaunch'] as const)if(e[k]!==undefined&&typeof e[k]!=='boolean')throw Error('机械排程标志无效');
  if(e.round!==undefined&&!roundKey(e.round)||e.row!==undefined&&!counter(e.row,0,2)||e.range!==undefined&&!finite(e.range,0)||e.minimumRange!==undefined&&!finite(e.minimumRange,0)||e.forward!==undefined&&!point(e.forward)||e.primaryTarget!==undefined&&!counter(e.primaryTarget,1)||e.launchTick!==undefined&&!counter(e.launchTick,0,e.dueTick))throw Error('机械炮列载荷无效');
  if(e.pendingLaunch&&(e.kind!=='fortress'||e.launchTick===undefined)||e.native&&(e.kind!=='fortress'||e.primaryTarget===undefined)||e.kind==='fortress'&&(e.row===undefined||!e.forward||e.points.length>5)||e.kind==='resonance'&&(!e.line||e.points.length))throw Error('机械排程来源无效');
  if(e.line&&(!point(e.line.from)||!point(e.line.to)||![.8,1.6].includes(e.line.width)||e.kind!=='resonance'||e.line.width!==(e.enhanced?1.6:.8)))throw Error('共振爆线无效');
 }
 if((s.areas??[]).filter(e=>e.kind==='resonance'&&e.enhanced).length+(s.parkedResonanceReservations??0)>(s.nodeReserves['M-N09']??0))throw Error('爆线储备预约超额');
}
export function validateDoomsdayCombat(s:DoomsdayCombat|undefined){
 if(s===undefined)return;
 const integer=(n:number)=>Number.isSafeInteger(n)&&n>=0;
 if(!s||![s.walked,s.lastWalked].every(n=>Number.isFinite(n)&&n>=0)||s.walked>3||!integer(s.settled)||!integer(s.serial)||typeof s.ready!=='boolean')throw Error('机械成员战斗状态无效');
 const r=s.round;if(r&&(!integer(r.sequence)||typeof r.gun!=='boolean'||typeof r.crossfire!=='boolean'||typeof r.preheated!=='boolean'||!Number.isFinite(r.damageFactor)||r.damageFactor<1||r.damageFactor>2||!Number.isFinite(r.penetration)||r.penetration<0||r.penetration>1||!integer(r.hits)||r.hits<1||r.hits>64||r.salvo!==null&&(!integer(r.salvo)||r.salvo<1)))throw Error('机械原轮载荷无效');
 const n=s.nano;if(n&&(!Number.isFinite(n.max)||n.max<0||!Number.isFinite(n.remaining)||n.remaining<0||n.remaining>n.max+1e-6||!integer(n.regenTick)))throw Error('纳米护盾状态无效');
 if(r?.shotStyle!==undefined&&!counter(r.shotStyle,0,65535))throw Error('机械武器外观无效');
 if(s.batteryStage!==undefined&&typeof s.batteryStage!=='string')throw Error('备用电池回执无效');
 if(s.brace&&(!integer(s.brace.readyTick)||!integer(s.brace.settled)))throw Error('震荡支架状态无效');
 if(s.fragmentReadyTick!==undefined&&!integer(s.fragmentReadyTick))throw Error('防片冷却无效');
 if(s.tow&&(!integer(s.tow.helper?.entityId)||!Number.isFinite(s.tow.helper?.bornAt)||!integer(s.tow.untilTick)||!integer(s.tow.readyTick)||![s.tow.goal?.x,s.tow.goal?.z].every(Number.isFinite)))throw Error('拖索状态无效');
 if(s.visualScale!==undefined&&(!Number.isFinite(s.visualScale)||s.visualScale<=0))throw Error('机械外观缩放无效');
 for(const key of ['mechanized','polarized','nanoAmmo'] as const)if(s[key]!==undefined&&typeof s[key]!=='boolean')throw Error('机械成员标志无效');
 for(const key of ['nanoArmorUntilTick','airPairUntilTick','turretReadyTick','tankRounds'] as const)if(s[key]!==undefined&&!counter(s[key]))throw Error('机械成员时钟无效');
 if(s.channel!==undefined&&!['air','ground'].includes(s.channel)||s.special!==undefined&&!specialFamilies[s.special]||s.capacitor!==undefined&&!finite(s.capacitor,0,.2))throw Error('机械成员武器状态无效');
 if(s.heroArmor&&(!finite(s.heroArmor.max,0)||!finite(s.heroArmor.remaining,0,s.heroArmor.max)))throw Error('英雄装甲盾无效');
 if(s.dual)for(const key of ['air','ground'] as const){const c=s.dual[key];if(!c||!counter(c.nextReadyTick)||c.target!==null&&!counter(c.target,1))throw Error('双模武器时钟无效');}
 if(s.giant){const g=s.giant;if(!counter(g.nextReadyTick)||!counter(g.lastFireTick)||!counter(g.rounds)||!counter(g.cannons,0,2)||typeof g.pendingCannon!=='boolean'||g.cannonReadyTick!==undefined&&!counter(g.cannonReadyTick)||g.pendingCannon&&(!g.cannonPayload||g.cannonReadyTick===undefined))throw Error('巨械排程无效');if(g.cannonPayload)validateDoomsdayPayload(g.cannonPayload);if(g.pendingNuke){if(!counter(g.pendingNuke.tick)||!point(g.pendingNuke.point))throw Error('机载小核排程无效');validateDoomsdayPayload(g.pendingNuke.payload);}}
 if(s.station&&(!point(s.station.origin)||!counter(s.station.rounds,0,3)))throw Error('阵地供弹计数无效');
 if(s.blueFlame!==undefined&&!record(s.blueFlame))throw Error('蓝焰来源无效');for(const [id,b] of Object.entries(s.blueFlame??{}))if(!/^\d+$/.test(id)||!b||!finite(b.bornAt,0)||!counter(b.untilTick)||![.7,.85].includes(b.speed))throw Error('蓝焰期限无效');
 if(r){if(r.budget)validateDoomsdayPayload(r.budget);if(r.cards!==undefined&&!record(r.cards))throw Error('冻结持牌无效');for(const [id,n] of Object.entries(r.cards??{}))if(!isDoomsdayId(id)||!counter(n,1,DOOMSDAY_CARD_BY_ID[id].maxRank))throw Error('冻结持牌档位无效');if(r.special!==undefined&&!specialFamilies[r.special]||r.scheduled!==undefined&&typeof r.scheduled!=='boolean'||r.pierce!==undefined&&typeof r.pierce!=='boolean'||r.melee!==undefined&&typeof r.melee!=='boolean')throw Error('冻结原轮标志无效');}
}
