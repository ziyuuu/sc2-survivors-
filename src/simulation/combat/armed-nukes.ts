import {armedTargetAllowed} from './armed-targets';
import {ARMED_CARD_BY_ID,ARMED_RULES} from '../../data/terran-armed-support';
import {armedRank} from '../progression/build-progress';
import {equipmentCardDamage} from '../starship/card-effects';
import {consumeEquipmentReactor} from '../starship/support';
import {resolveArmedVolleys} from './armed-support';
import type {World} from '../world';
import type {Point} from '../types';

export interface NukeInput {origin:'P01'|'O01'|'manual';scorched:boolean;dense:boolean;tick:number;center:Point;bearing:number;legalTargets:number;budget:number;radius:number}
/** Frozen R3 shot plan. No RNG, wallet, damage or renderer side effects. */
export function planNukeVolley(input:NukeInput,canLand:(p:Point)=>boolean){
 const config=ARMED_RULES.nuke,manual=input.origin==='manual',multi=!manual||input.scorched,[min,max]=input.scorched?config.scorchedCount:config.systemCount,count=multi?Math.max(min,Math.min(max,input.legalTargets)):1;
 const first=manual&&!input.scorched?config.manualDelay:input.origin==='P01'&&!input.scorched?config.first:0,baseGap=input.scorched?config.scorchedGap:config.gap,gap=input.dense&&input.origin==='P01'?Math.ceil(baseGap/1.35):baseGap,points:Point[]=[{x:input.center.x,z:input.center.z}];
 for(let index=1;index<count;index++){const angle=input.bearing+(index-1)*2*Math.PI/(count-1);for(const scale of [1,.75,.5,.25,0]){const offset=input.radius*config.ringFactor*scale,point={x:input.center.x+Math.sin(angle)*offset,z:input.center.z+Math.cos(angle)*offset};if(canLand(point)){points.push(point);break;}}}
 if(points.length!==count)throw Error('已提交核击没有合法落点');
 return {points,firstTick:input.tick+first,gapTicks:count===1?0:gap,damagePerHit:input.budget/count,blastRadius:input.radius*(multi?config.blastFactor:1),ammoDelta:manual?-1:input.scorched?1:0};
}
export function armedOpenPoint(w:World,p:Point){return Number.isFinite(p.x)&&Number.isFinite(p.z)&&(w.terrain?(w.terrain.isOpen?.(p)??w.terrain.canOccupy(p,0)):Math.abs(p.x)<=76&&Math.abs(p.z)<=76);}
export function armedNukeTargets(w:World){return [...w.entities.values()].filter(e=>armedTargetAllowed(w,e)&&w.visibleTo(e,'terran'));}
export function armedManualNuke(w:World){return w.expedition.race==='terran'&&(armedRank(w.expedition.support,'P01')>0||armedRank(w.expedition.support,'N05')>0);}
export function manualVolleyPending(w:World){return !!w.expedition.support.armed?.volleys.some(v=>v.manual&&v.nextIndex<v.shots.length);}
/** Commit a whole volley once; its persisted cursor owns every later explosion. */
export function commitArmedNuke(w:World,origin:NukeInput['origin'],center:Point){
 const s=w.expedition.support,a=s.armed;if(!a||!armedOpenPoint(w,center)||w.phase!=='battle'||w.paused||w.requiresPlayerDecision||w.specialStages.active||w.missions.fleet.ceasefire)return false;
 const manual=origin==='manual',scorched=armedRank(s,'N05')>0,dense=origin==='P01'&&armedRank(s,'N01')>0;
 if(manual&&(s.ammo<1||manualVolleyPending(w)||s.impacts.some(i=>i.kind==='strategic')))return false;
 if(!manual&&origin==='P01'&&(!armedRank(s,'P01')||w.tick<(a.readyTick.P01??0)))return false;
 const targets=armedNukeTargets(w);if(!manual&&(!targets.length||!targets.some(e=>Math.hypot(e.x-center.x,e.z-center.z)<1e-7)))return false;
 const config=ARMED_RULES.nuke,focus=ARMED_CARD_BY_ID.N05.params,hasP01=armedRank(s,'P01')>0,baseRadius=manual?config.manualRadius*(hasP01?ARMED_CARD_BY_ID.P01.params.manualFactor:1):config.systemRadius;
 const radius=baseRadius*(scorched?focus.radius:1)*(dense?ARMED_CARD_BY_ID.N01.params.radius:1),reserve5=scorched&&(a.nodeReserves.N05??0)>0,reserve1=dense&&(a.nodeReserves.N01??0)>0;
 const budget=(manual?config.manualBudget*(hasP01?ARMED_CARD_BY_ID.P01.params.manualFactor:1):config.systemBudget)*(scorched?focus.damage:1)*(dense?ARMED_CARD_BY_ID.N01.params.damage:1)*(reserve5?focus.reserveDamage:1)*(reserve1?ARMED_CARD_BY_ID.N01.params.reserveDamage:1);
 const plan=planNukeVolley({origin,scorched,dense,tick:w.tick,center,bearing:Math.atan2(center.x-w.anchor.x,center.z-w.anchor.z),legalTargets:targets.filter(e=>Math.hypot(e.x-center.x,e.z-center.z)<=radius).length,budget:equipmentCardDamage(w,budget),radius},p=>armedOpenPoint(w,p));
 const id=a.nextCast++;a.volleys.push({id,cardId:origin==='manual'?'P01':origin,stageKey:`${w.runId}:${w.endless?'endless:'+w.endless.round:w.stage}`,manual,shots:plan.points.map((point,index)=>({point,tick:plan.firstTick+index*plan.gapTicks,damage:plan.damagePerHit,radius:plan.blastRadius,kind:'nuke'})),nextIndex:0});
 s.ammo+=plan.ammoDelta;if(manual)consumeEquipmentReactor(w);else if(origin==='P01')a.readyTick.P01=w.tick+ARMED_CARD_BY_ID.P01.params.cd*60;
 if(reserve5)a.nodeReserves.N05!--;if(reserve1)a.nodeReserves.N01!--;
 if(plan.firstTick>w.tick)w.effects.push({id:w.nextId++,kind:'hero-warning',...center,end:{...center},radius,until:plan.firstTick/60,owner:'terran',source:0});
 resolveArmedVolleys(w);w.changed();return true;
}
