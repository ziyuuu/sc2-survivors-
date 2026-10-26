import type {Case} from './catalogue';
import {HEROES,type HeroId} from '../../src/data/heroes';
import {ELITES} from '../../src/data/elites';
import modelActions from './model-actions.generated.json';
import {heroVisualTier} from '../../src/data/hero-spectacle';
import {equipmentActionName} from './equipment-preview-spec';
import {galleryDisposition} from './gallery-scope';
import {EQUIPMENT_TEMPLATES} from '../../src/simulation/starship/catalog';
import {PRODUCTION_LINES} from '../../src/data/expedition-buildings';
import {SC2_UNITS} from '../../src/data/sc2-units';

export type GalleryAction={id:string;name:string;cases:Case[]};
export type GalleryObject={id:string;name:string;group:string;race?:string;unit:boolean;actions:GalleryAction[]};
const races:Record<string,string>={terran:'人族',zerg:'虫族',protoss:'星灵'};
const traits:Record<string,string>={zeal:'狂热',carapace:'甲壳',regen:'再生'};
const modes:Record<string,string>={tank:'坦克',siege:'架炮',hellion:'火车',hellbat:'火蝠',viking:'战机',viking_assault:'突击机甲',thor:'雷神',thor_high_impact:'高冲击',lurker:'地表',lurker_burrowed:'埋地'};
const actions:Record<string,string>={spawn:'出生动作',arrival:'增援入场',idle:'待机',move:'移动',attack:'攻击',heal:'治疗',hit:'受击',death:'死亡',skill:'技能',ability:'能力','auto-ability':'自动技能',stim:'兴奋剂',refraction:'护盾储能与折射',aura:'光环',mode:'变形'};
export function actorModel(c:Case){if(c.actor?.startsWith('hero.'))return HEROES[c.actor.slice(5) as HeroId].model;if(c.actor?.startsWith('elite.'))return ELITES[c.actor.slice(6) as keyof typeof ELITES].model;return c.family??c.actor??'';}
export function birthAvailable(c:Case){return !!(modelActions as Record<string,{birth:unknown}>)[actorModel(c)]?.birth;}
function identity(c:Case){
 if(c.runner==='actor')return 'actor:'+c.actor;
 if(c.runner==='enemy')return 'enemy:'+c.actor+':'+c.family;
 if(c.runner==='card'||c.runner==='card-effect')return 'card:'+c.race+':'+c.actor;
 if(c.runner==='equipment')return 'equipment:'+c.actor;
 if(c.runner==='development')return 'development:'+c.actor;
 return c.runner+':'+(c.actor??c.id);
}
function unitActionKey(c:Case){
 if(c.runner==='actor')return c.id.replace(`actor:${c.actor}:${c.rank}:`,'');
 return c.id.replace(new RegExp(`^enemy:${c.actor}:${c.family}(?::level:[1-5])?(?::trait:[^:]+)?:`),'');
}
function actionName(c:Case,key:string){
 let name=actions[c.action??'']??c.name;
 if(c.action==='skill'&&c.actor?.startsWith('hero.'))name=HEROES[c.actor.slice(5) as HeroId].skill;
 if(c.runner==='enemy'&&c.fixture?.enemy?.skill)name=({charge:'冲锋',fan:'扇形喷吐',bile:'腐蚀胆汁',heal:'群体治疗',spikes:'地刺',cone:'锥形喷吐',acid:'酸液喷吐'} as Record<string,string>)[c.fixture.enemy.skill]??name;
 if(c.action==='ability')name=c.family==='banshee'?'隐形与解除':c.family==='stalker'?'闪现':name;
 if(c.action==='auto-ability')name=c.family==='queen'?'输血':c.family==='sentry'?'守护力场':c.family==='high_templar'?'灵能风暴':name;
 if(c.action==='mode'){const mode=(c.data as {mode:string}).mode;name='切换'+(modes[mode]??mode);}
 if(c.action==='attack')name=(c.target==='air'?'对空':'对地')+'攻击';
 if(c.action==='attack'&&c.family==='queen'&&c.target==='ground')name=(c.fixture?.weapon==='TalonsMissile'?'远距':'近距')+name;
 if(c.runner==='enemy'&&c.action==='skill'&&c.fixture?.enemy?.skill!=='heal')name+=' · '+(c.target==='air'?'对空':'对地');
 if(key.includes('close-range'))name='近距'+name;
 if(c.fixture?.mode)name=(modes[c.fixture.mode]??c.fixture.mode)+' · '+name;
 if(c.runner==='enemy'&&key.startsWith('form:lurker:'))name='地表 · '+name;
 if(c.fixture?.enemy?.interruption)name+=' · '+(c.fixture.enemy.interruption==='before-commit'?(c.fixture.enemy.skill==='bile'?'落点前阵亡':'施法中阵亡'):'施法后阵亡');
 return name;
}
export function buildGallery(cases:Case[]):GalleryObject[]{
 const map=new Map<string,GalleryObject>();
 for(const c of cases){
  if(c.applicability||galleryDisposition(c).kind!=='dynamic')continue;
  const unit=c.runner==='actor'||c.runner==='enemy';
  // No fictitious Birth button for a model that has no Birth clip. Ordinary
  // recruitment receives a separate native carrier-delivery scene below.
  if(unit&&c.action==='spawn'&&!birthAvailable(c))continue;
  const id=identity(c);let object=map.get(id);
  if(!object){const quality=c.runner==='equipment'&&!c.id.startsWith('presentation:')?EQUIPMENT_TEMPLATES[(c.data as {template:string}).template]?.quality:undefined;object={id,name:c.name.split(' · ')[0]+(quality?' · '+['','白','绿','蓝','紫','橙'][quality]+'色':''),group:c.runner==='card'||c.runner==='card-effect'?'卡牌':c.group,race:c.race,unit,actions:[]};map.set(id,object);}
  const key=unit?unitActionKey(c):c.runner==='card'?'card':c.runner==='card-effect'?'effect':c.runner==='development'?'development':c.runner==='equipment'?c.action??c.id:c.id;
  let action=object.actions.find(a=>a.id===key);
  if(!action){action={id:key,name:unit?actionName(c,key):c.runner==='equipment'?equipmentActionName(c):c.runner==='card'?'卡面':c.runner==='card-effect'?'生效过程':c.runner==='development'?'发展':c.name.split(' · ').slice(1).join(' · ')||'播放',cases:[]};object.actions.push(action);}
  action.cases.push(c);
 }
 for(const object of map.values()){
  if(object.id.startsWith('actor:')&&!object.id.startsWith('actor:hero.')&&!object.id.startsWith('actor:elite.')){
   const base=object.actions.flatMap(a=>a.cases).find(c=>c.rank===1&&!c.fixture?.mode)!;
   object.actions.splice(1,0,{id:'arrival',name:'增援入场',cases:[{...base,id:base.id.replace(/:[^:]+$/,':arrival'),action:'arrival',seconds:10,fixture:undefined}]});
  }
  for(const action of object.actions)action.cases.sort((a,b)=>(a.rank??1)-(b.rank??1));
  object.actions.sort((a,b)=>Number(b.id==='idle')-Number(a.id==='idle'));
 }
 return [...map.values()];
}
/** Default view merges numeric ranks. Higher visual variants stay available
 * within the action, never as duplicate objects or duplicate basic actions. */
export function visibleVariants(action:GalleryAction,object:GalleryObject){
 if(!object.unit)return action.cases;
 const seen=new Set<string>();return action.cases.filter(c=>{const heroTier=c.actor?.startsWith('hero.')&&['attack','skill','death'].includes(c.action??'')?heroVisualTier(c.rank):0;const acidZone=c.runner==='enemy'&&c.actor==='elite'&&c.fixture?.enemy?.skill==='bile'&&c.rank!>=3;const key=(c.fixture?.enemy?.trait??'')+':'+heroTier+':'+acidZone;if(seen.has(key))return false;seen.add(key);return true;});
}
export function variantName(c:Case){const parts=[];if(c.rank)parts.push(c.rank+'级');if(c.fixture?.enemy?.trait)parts.push(traits[c.fixture.enemy.trait]);if(!c.rank&&c.race)parts.push(races[c.race]);const data=c.data as {pieces?:number;binding?:{family?:string;hero?:string};expected?:string}|undefined;if(data?.pieces)parts.push(data.pieces+'件');if(data?.binding&&Object.keys(data.binding).length)parts.push(Object.entries(data.binding).map(([kind,id])=>kind==='hero'?HEROES[id as keyof typeof HEROES]?.name:kind==='elite'?ELITES[id as keyof typeof ELITES]?.name:kind==='direction'?PRODUCTION_LINES[id as keyof typeof PRODUCTION_LINES]?.name:SC2_UNITS[id as keyof typeof SC2_UNITS]?.zh).join(' / '));if(c.runner==='development')parts.push(c.name.split(' · ').slice(1).join(' · '));return parts.join(' · ')||c.name;}
export {races};
