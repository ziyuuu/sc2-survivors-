import type {World} from '../../simulation/world';
import {HEROES,type HeroId} from '../../data/heroes';
import {SC2_UNITS} from '../../data/sc2-units';
import {tacticalCard,UNIQUE_SUPPORT} from '../../data/unique-support';
import {familyModeState,familyAbilityState,type ModeFamily} from '../../simulation/combat/family-actions';
import {eligibleTransferParticipant} from '../../simulation/combat/talent-transfer';

export const COMMAND_ACTIONS=[
 {id:'unit-operations',name:'单位操作',code:'KeyO',key:'O',glyph:'units'},
 {id:'detection',name:'主动侦测',code:'KeyG',key:'G',glyph:'scan'},
 {id:'siege',name:'坦克',code:'KeyT',key:'T',icon:'tech.siege',family:'tank'},
 {id:'stim',name:'兴奋剂',code:'KeyE',key:'E',icon:'tech.stim'},
 {id:'dash',name:'推进',code:'Space',key:'SPACE',icon:'tech.boost'},
 {id:'airlift',name:'转移',code:'KeyF',key:'F',glyph:'transfer'},
 {id:'hellion-mode',name:'恶火',code:'KeyH',key:'H',icon:'unit.hellion',family:'hellion'},
 {id:'viking-mode',name:'维京',code:'KeyV',key:'V',icon:'unit.viking',family:'viking'},
 {id:'thor-mode',name:'雷神',code:'KeyR',key:'R',icon:'unit.thor',family:'thor'},
 {id:'lurker-mode',name:'潜伏者',code:'KeyL',key:'L',icon:'unit.lurker',family:'lurker'},
 {id:'banshee-cloak',name:'女妖隐形',code:'KeyC',key:'C',icon:'unit.banshee'},
 {id:'stalker-blink',name:'追猎者闪烁',code:'KeyB',key:'B',icon:'unit.stalker'},
 {id:'tactical',name:'战术技能',code:'KeyQ',key:'Q',glyph:'tactical'},
 {id:'strategic',name:'战略打击',code:'KeyX',key:'X',glyph:'strike'},
] as const;
export type BattleActionId=typeof COMMAND_ACTIONS[number]['id']|'hero-slot-0'|'hero-slot-1'|'hero-slot-2';
export type BattleActionPhase='ready'|'active'|'cooling'|'working'|'blocked'|'mixed'|'locked';
export interface BattleActionState {id:BattleActionId;name:string;visible:boolean;enabled:boolean;phase:BattleActionPhase;reason:string;remaining:number;count?:number;active?:boolean;}
export const heroForBattleSlot=(w:Pick<World,'heroes'>,slot:number):HeroId|undefined=>slot>=0&&slot<3?[...w.heroes.keys()][slot]:undefined;
export function actionForCode(code:string):BattleActionId|undefined{
 if(/^Digit[1-3]$/.test(code))return `hero-slot-${Number(code.slice(-1))-1}` as BattleActionId;
 return COMMAND_ACTIONS.find(action=>action.code===code)?.id;
}
export function actionForButton(w:World,action:string):BattleActionId|undefined{
 if(COMMAND_ACTIONS.some(item=>item.id===action))return action as BattleActionId;
 if(action.startsWith('hero-')){const slot=[...w.heroes.keys()].indexOf(action.slice(5) as HeroId);if(slot>=0&&slot<3)return `hero-slot-${slot}` as BattleActionId;}
 return undefined;
}
export const actionModeFamily=(id:BattleActionId):ModeFamily|undefined=>id==='siege'?'tank':id.endsWith('-mode')?id.slice(0,-5) as ModeFamily:undefined;

/** Presentation data only; all successful execution goes through World again. */
export function battleActionState(w:World,id:BattleActionId,allowPanelPause=false):BattleActionState{
 const state:BattleActionState={id,name:COMMAND_ACTIONS.find(a=>a.id===id)?.name??'英雄技能',visible:true,enabled:true,phase:'ready',reason:'',remaining:0};
 const family=actionModeFamily(id);
 if(family){
  const mode=familyModeState(w,family),label=family==='viking'?mode.requested==='viking_assault'?'降落中':'起飞中':'切换中';
  const nextLabel=family==='tank'?mode.next==='siege'?'架炮':'收炮':family==='hellion'?mode.next==='hellbat'?'恶蝠':'恶火':family==='viking'?mode.next==='viking_assault'?'突击':'战机':family==='thor'?mode.next==='thor_high_impact'?'高冲击弹':'爆裂弹':mode.next==='lurker_burrowed'?'埋地':'钻出';
  state.name=`${SC2_UNITS[family].zh} · ${mode.blocked?'落点受阻 · 取消降落':mode.transitioning?label+' · 返回'+nextLabel:mode.mixed?'混合模式 · '+nextLabel:nextLabel}`;
  Object.assign(state,{visible:!!mode.units.length,enabled:mode.enabled,reason:mode.reason,remaining:mode.remaining,active:mode.active,phase:mode.blocked?'blocked':mode.transitioning?'working':mode.mixed?'mixed':mode.active?'active':'ready'});
 }else if(id==='banshee-cloak'||id==='stalker-blink'){
  const ability=familyAbilityState(w,id==='banshee-cloak'?'banshee':'stalker');
  Object.assign(state,{visible:!!ability.units.length,enabled:ability.enabled,reason:ability.reason,remaining:id==='stalker-blink'&&Number.isFinite(ability.remaining)?ability.remaining:0,active:!!ability.off});
  state.name=id==='banshee-cloak'?ability.off?'女妖 · 关闭隐形':'女妖 · 开启隐形':'追猎者 · 选择闪烁落点';
  state.phase=ability.off?ability.units.some(u=>!u.cloaked)?'mixed':'active':ability.enabled?'ready':ability.reason.includes('冷却')?'cooling':'locked';
 }else if(id.startsWith('hero-slot-')){
  const hero=heroForBattleSlot(w,Number(id.slice(-1))),data=hero&&HEROES[hero],entity=hero&&w.heroEntity(hero);
  state.visible=!!hero;state.enabled=!!hero&&w.canCastHero(hero);state.name=data?`${data.name} · ${data.skill}`:'未招募英雄';state.remaining=hero?Math.max(0,(w.heroes.get(hero)?.skillReady??0)-w.time):0;
  state.reason=!hero?'未招募英雄':!entity||entity.hp<=0?'英雄未在场':state.remaining>1e-8?'英雄技能冷却中':!state.enabled?'没有合法施放目标':'';state.phase=state.remaining>1e-8?'cooling':state.enabled?'ready':'locked';
 }else if(id==='dash'||id==='detection'){
  state.remaining=Math.max(0,(id==='dash'?w.dashReady:w.expedition.detectionReady)-w.time);state.enabled=state.remaining<=1e-8;state.reason=state.enabled?'':state.name+'冷却中';state.phase=state.enabled?'ready':'cooling';
 }else if(id==='stim'){
  const bodies=[...w.familyBodies('marine'),...w.familyBodies('marauder')];state.visible=!!bodies.length;
  state.enabled=w.upgrades.has('stim')&&bodies.some(u=>u.hp>(u.eliteId==='marine.1'?0:u.unitType==='marauder'?20:10)&&u.stimUntil<=w.time);
  state.reason=!w.upgrades.has('stim')?'兴奋剂科技未解锁':!state.enabled?'生命不足或兴奋剂尚未结束':'';state.active=bodies.some(u=>u.stimUntil>w.time);state.phase=state.enabled?'ready':state.active?'active':'locked';
 }else if(id==='airlift'){
  state.visible=!!w.talent('airlift');state.name=w.expedition.race==='terran'?'空运':w.expedition.race==='zerg'?'地下转移':'战场召回';state.remaining=Math.max(0,w.airliftReady-w.time);
  state.enabled=state.visible&&state.remaining<=1e-8&&!w.talentTransferPlan&&w.allies().some(u=>eligibleTransferParticipant(w,u,w.anchor));
  state.reason=!state.visible?'尚未解锁转移':w.talentTransferPlan?'转移正在准备':state.remaining>1e-8?'转移冷却中':!state.enabled?'没有合法地面参与者':'';state.phase=w.talentTransferPlan?'working':state.remaining>1e-8?'cooling':state.enabled?'ready':'locked';
 }else if(id==='tactical'){
  const unique=w.expedition.support.unique;state.visible=!!unique.levels[tacticalCard(w.expedition.race)];state.name=UNIQUE_SUPPORT[tacticalCard(w.expedition.race)].name;state.remaining=Math.max(0,unique.ready-w.time);
  state.enabled=state.visible&&state.remaining<=0&&!unique.prism;state.reason=!state.visible?'尚未获得战术技能':unique.prism?'扫射正在进行':state.remaining>0?'战术技能冷却中':'';state.phase=unique.prism?'working':state.remaining>0?'cooling':state.enabled?'ready':'locked';
 }else if(id==='strategic'){
  const support=w.expedition.support,pending=support.impacts.find(i=>i.kind==='strategic');state.count=support.ammo;state.visible=support.ammo>0||!!pending;state.name=w.expedition.race==='terran'?'核弹':w.expedition.race==='zerg'?'生体巨爆':'净化打击';state.enabled=support.ammo>0&&!pending;state.reason=pending?'战略打击正在进行':support.ammo<=0?'没有战略打击次数':'';state.phase=pending?'working':state.enabled?'ready':'locked';
 }
 if(w.phase!=='battle'||w.requiresPlayerDecision||w.paused&&!allowPanelPause){state.enabled=false;state.reason=w.requiresPlayerDecision?'请先完成当前决策':w.paused?'战斗已暂停':'当前不在战斗中';}
 return state;
}

export function activateBattleAction(w:World,id:BattleActionId):boolean{
 const state=battleActionState(w,id);
 if(!state.enabled||typeof document!=='undefined'&&document.body.dataset.battleActionsReady==='false'){w.announce(state.reason||'战场素材准备中');return false;}
 if(typeof document!=='undefined')document.dispatchEvent(new Event('sc2-target-cancel'));
 const target=(kind:string)=>{if(typeof document==='undefined')return false;document.dispatchEvent(new CustomEvent('sc2-target-family',{detail:kind}));return true;};
 const family=actionModeFamily(id);let used=false;
 if(family)used=w.toggleFamilyMode(family);
 else if(id==='banshee-cloak')used=w.castFamilyAbility('banshee');
 else if(id==='stalker-blink')used=target('stalker');
 else if(id==='dash')used=w.dash();
 else if(id==='detection')used=w.castDetection();
 else if(id==='stim')used=w.stim();
 else if(id==='airlift')used=target('transfer');
 else if(id==='strategic')used=target('strategic');
 else if(id==='tactical')used=w.expedition.race==='protoss'?target('tactical'):w.castTactical();
 else if(id==='unit-operations'){if(typeof document!=='undefined'){document.dispatchEvent(new Event('sc2-open-unit-operations'));used=true;}}
 else if(id.startsWith('hero-slot-')){const hero=heroForBattleSlot(w,Number(id.slice(-1)));used=!!hero&&w.castHero(hero);}
 if(!used)w.announce('当前没有合法可执行对象');return used;
}
