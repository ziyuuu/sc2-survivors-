import {ENEMY_NAMES,type EnemyTier,type SpecialType} from '../../src/data/enemies';
import {HYDRALISK_MELEE} from '../../src/data/sc2-units';
import {actorAttackBranches} from './actor-branches';
import type {Case} from './catalogue';

export type EnemySkill='charge'|'cone'|'fan'|'bile'|'spikes'|'acid'|'heal';
export type EnemyFixture={level:number;stage:number;trait?:'zeal'|'carapace'|'regen';mode?:'lurker'|'lurker_burrowed';skill?:EnemySkill;interruption?:'before-commit'|'after-commit'};
export const ENEMY_LEVEL_STAGES=[1,4,7,10,12] as const;
const source=['src/data/enemies.ts','src/data/enemy-tuning.ts','src/data/stages.ts','src/simulation/world.ts','src/simulation/combat/enemy-specials.ts','src/simulation/combat/expedition-combat.ts','src/render/scene/battle-renderer.ts','src/render/effects/source-combat-effects.ts','src/render/effects/combat-sculptures.ts','src/render/effects/acid-ground-effects.ts'];
const labels:Record<string,string>={spawn:'出生',idle:'待机',move:'移动',attack:'攻击',hit:'受击',death:'死亡',skill:'特殊技能',aura:'光环生效与离开','auto-ability':'自动输血'};
const tierNames={elite:'精英敌军',boss:'首领',lord:'领主'},traitNames={zeal:'狂热',carapace:'甲壳',regen:'再生'};
const na=(reason:string)=>({kind:'not-applicable' as const,reason});
export function enemySkill(tier:EnemyTier,family:SpecialType,mode?:string):EnemySkill|null{
 if(tier==='elite')return family==='roach'||family==='lurker'&&mode==='lurker'?null:family==='zergling'?'charge':family==='hydralisk'?'fan':'bile';
 return family==='queen'?'heal':family==='lurker'?'spikes':family==='ultralisk'||family==='zergling'?'charge':family==='mutalisk'||family==='hydralisk'?'fan':family==='corruptor'?'acid':family==='roach'?'cone':'bile';
}
export const ENEMY_CASES:Case[]=[];
for(const tier of Object.keys(ENEMY_NAMES) as EnemyTier[])for(const family of Object.keys(ENEMY_NAMES[tier]) as SpecialType[])for(let level=1;level<=5;level++)for(const trait of tier==='lord'?['zeal','carapace','regen'] as const:[undefined]){
 const prefix=`enemy:${tier}:${family}${level===1?'':':level:'+level}${trait&&trait!=='zeal'?':trait:'+trait:''}`,name=`${ENEMY_NAMES[tier][family]} · ${tierNames[tier]} · ${level}级${trait?' · '+traitNames[trait]:''}`;
 const enemy:EnemyFixture={level,stage:ENEMY_LEVEL_STAGES[level-1],...(trait?{trait}:{}),...(family==='lurker'?{mode:'lurker_burrowed' as const}:{})};
 const base:Case={id:prefix,group:'敌军首领',name,runner:'enemy',actor:tier,family,race:'zerg',rank:level,source,fixture:{enemy}};
 const add=(suffix:string,action:string,extra:Partial<Case>={})=>ENEMY_CASES.push({...base,id:prefix+':'+suffix,name:name+' · '+(labels[action]??action),action,seconds:action==='death'?9:action==='move'?4:8,...extra});
 for(const action of ['spawn','idle','move','hit','death'])add(action,action,family==='lurker'&&action==='move'?{applicability:na('原生出生为埋地形态，不能移动；移动见地表形态。')}:{});
 const branches=actorAttackBranches(family,family,enemy.mode),primary=branches[0]?.plane??'ground',seen=new Set<string>();
 for(const b of branches){const first=seen.size===0,same=seen.has(b.plane);seen.add(b.plane);const suffix=first?'attack':'attack-'+b.plane+(same?':'+b.weapon:'');
  add(suffix,'attack',{name:name+' · 对'+(b.plane==='air'?'空':'地')+'攻击'+(b.weapon?' · '+b.weapon:''),target:b.plane,fixture:{enemy,weapon:b.weapon,selectedWeapon:b.selectedWeapon,targetEdgeDistance:(b.minimumRange+b.range)/2}});
 }
 if(!branches.length)add('attack','attack',{applicability:na('该形态没有原生武器。')});
 if(family==='hydralisk')for(const plane of ['ground','air'])add('attack-'+plane+':close-range','attack',{name:name+' · 近距对'+(plane==='air'?'空':'地')+'攻击',target:plane,fixture:{enemy,cadence:'hydralisk-close',targetEdgeDistance:HYDRALISK_MELEE.range*.5}});
 function skills(formPrefix='',mode=enemy.mode,override?:EnemySkill){
  const kind=override??enemySkill(tier,family,mode),e={...enemy,...(mode?{mode}:{}),...(kind?{skill:kind}:{})};
  const planes=kind==='heal'?['ground']:kind==='acid'||kind==='spikes'||kind==='charge'||kind==='cone'?['ground']:actorAttackBranches(family,family,mode).map(b=>b.plane);
  if(!kind){add(formPrefix+'skill','skill',{fixture:{enemy:e},applicability:na(family==='roach'?'精英蟑螂没有主动特殊技能；三级起甲壳光环另列。':'地表潜伏者没有合法普通武器目标，因此不会触发精英胆汁分支。')});return;}
  for(const [i,plane] of [...new Set(planes)].entries()){
   const suffix=formPrefix+'skill'+(i?'-'+plane:''),skillName=name+' · '+(formPrefix==='form:lurker:'?'地表 · ':'')+kind+(kind==='heal'?'':' · 对'+(plane==='air'?'空':'地'));
   add(suffix,'skill',{name:skillName,target:plane,seconds:16,fixture:{enemy:e}});
   // Preserve stable case IDs. Bile is already committed when its fixed point
   // appears, so an early source death is before impact, not cancellation.
   for(const interruption of ['before-commit','after-commit'] as const)add(suffix+':'+interruption,'skill',{name:skillName+' · '+(interruption==='before-commit'?(kind==='bile'?'发射后落点前死亡':'施法中死亡'):'生效后死亡'),target:plane,seconds:16,fixture:{enemy:{...e,interruption}},...(kind==='heal'?{applicability:na('该首领治疗即时结算，没有可中断的待发包或持续技能包；原生治疗与死亡另有用例。')}:{} )});
  }
 }
 skills();
 if(family==='queen'&&tier!=='elite')skills('corrosive-bile:',enemy.mode,'bile');
 if(family==='queen')add('auto-ability','auto-ability',{target:primary,seconds:16});
 if(tier==='lord'||tier==='elite'&&family==='roach')add('aura','aura',{seconds:8,...(tier==='elite'&&level<3?{applicability:na('精英蟑螂的甲壳光环在三级才启用。')}:{} )});
 if(family==='lurker'){
  const surface={...enemy,mode:'lurker' as const};
  for(const action of ['spawn','idle','move','attack','hit','death'])add('form:lurker:'+action,action,{name:name+' · 地表 · '+labels[action],fixture:{enemy:surface},...(action==='spawn'?{applicability:na('敌军潜伏者总以埋地形态生成，地表由原生自动变形进入。')}:action==='attack'?{applicability:na('地表潜伏者没有普通武器；攻击见埋地形态。')}:{})});
  skills('form:lurker:','lurker');
  for(const mode of ['lurker','lurker_burrowed'] as const)add('mode:'+mode,'mode',{name:name+' · '+(mode==='lurker'?'出土':'埋地'),seconds:4,data:{mode},fixture:{enemy}});
 }
}
