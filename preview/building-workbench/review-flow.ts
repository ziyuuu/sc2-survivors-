// Presentation-only transitions for continuous UI review. Not a production/economy implementation.
import {DEVELOPMENT,PRODUCTION_LINES,LINE_SKILLS,type ProductionLineId} from '../../src/data/expedition-buildings';
import type {FamilyId} from '../../src/data/races';
import type {CardView} from '../../src/ui/presentation/reference-card';
import {fixture,project,pending,type FacilityView} from './fixtures';
export type ReviewState=ReturnType<typeof fixture>;
export const TREE_STEPS:Partial<Record<ProductionLineId,FamilyId[][]>>={
 barracks:[['marine'],['reaper'],['marauder']],factory:[['hellion'],['tank'],['thor']],starport:[['medivac'],['science_vessel'],['viking'],['banshee']],
 'zerg.basic':[['zergling','baneling'],['roach','queen']],'zerg.evolution':[['hydralisk'],['ravager'],['ultralisk','lurker']],'zerg.air':[['mutalisk'],['corruptor']],
 gateway:[['zealot'],['adept'],['stalker','sentry'],['high_templar']],robotics:[['immortal'],['colossus']],stargate:[['phoenix'],['void_ray'],['carrier']]
};
export function hasGround(s:ReviewState){return s.facilities.some(f=>f.directions.includes('地面'));}
export function evolveTargets(s:ReviewState,id:string){const dir=id.endsWith('zerg.air')?'天空':'地面';return s.facilities.filter(f=>!f.directions.includes(dir)&&(dir!=='天空'||hasGround(s)));}
function preview(c:CardView,label:string,copy:string){return {...c,locked:false,label,reason:'费用／条件待定 · 仅预览',stat:copy,detail:copy+'。这是界面评审中的样例操作，不定下正式费用和资格。'};}
export function reviewOffers(s:ReviewState,line:ProductionLineId,page:number):CardView[]{
 const race=s.race,base=DEVELOPMENT.find(d=>d.kind==='facility'&&d.line===line),owns=s.facilities.some(f=>f.line===line),cards:CardView[]=[];
 if(race!=='zerg'&&!owns){if(base&&base.requires.every(id=>s.facilities.some(f=>f.line===id))){return [project(base.id,race)];}return [];}
 if(race==='zerg'){
  if(line==='zerg.air'&&!hasGround(s))return [];
  if(line!=='zerg.basic'&&evolveTargets(s,'evolve-'+line).length)cards.push(preview(pending('evolve-'+line,line==='zerg.air'?'开放天空方向':'地面进化',race,line==='zerg.air'?'给目标孵化场开放天空，解锁飞龙':'给目标孵化场开放地面，解锁刺蛇'),'预览进化','选择一座孵化场，开放本方向'));
  if(s.facilities.length<5)cards.push(project('hatchery',race));
  if(line==='zerg.evolution'&&!hasGround(s))return cards;
  if(line==='zerg.air'&&!s.facilities.some(f=>f.directions.includes('天空')))return cards;
 }
 const groups=TREE_STEPS[line]!,missing=groups.findIndex(g=>g.some(f=>!s.unlocked.has(f)));
 if(missing>=0){for(const f of groups[missing].filter(f=>!s.unlocked.has(f))){let c=project('unlock.'+f,race);if(f==='high_templar')c=preview(c,'预览解锁','高阶圣堂武士，前层AND／OR条件待定');cards.push(c);}}
 if(race!=='zerg'&&base&&(s.facilities.find(f=>f.line===line)?.count??1)<5)cards.push(project(base.id,race));
 if(race==='protoss'&&line==='gateway'&&!s.facilities.some(f=>f.id==='crystal-pair'))cards.push(preview(pending('crystal','建造折跃水晶 ×2',race,'一次两座，用于狂热者／使徒'),'预览建造','一次两座，用于狂热者／使徒'));
 const skill=(LINE_SKILLS[line]??[]).find(([id,,f])=>s.unlocked.has(f)&&!s.completed.has(id));
 if(skill)cards.push(project(skill[0],race));
 const system='system.'+line;if(!s.completed.has(system))cards.push(project(system,race));
 else for(const kind of ['weapon','defense']){const id=`research.${line}.${kind}`,level=[1,2,3].find(n=>!s.completed.has(id+'.'+n));if(level&&!(level===2&&s.stage<6||level===3&&s.stage<12)){const c=project(id,race);cards.push({...c,id:id+'.'+level,name:c.name+' '+level+'级',minerals:125+75*(level-1),gas:50+50*(level-1)});}}
 const offset=cards.length>3?page%cards.length:page%2;const ordered=offset?[...cards.slice(offset),...cards.slice(0,offset)]:cards;
 return ordered.slice(0,3).map(c=>({...c,short:c.minerals!==undefined&&(c.minerals>s.wallet.minerals||(c.gas??0)>s.wallet.gas)}));
}
export function applyReviewSelection(s:ReviewState,c:CardView,target?:string){
 if(c.id.startsWith('unlock.'))s.unlocked.add(c.id.slice(7) as FamilyId);
 else if(c.id.startsWith('evolve-')){const candidates=evolveTargets(s,c.id),f=candidates.find(f=>f.id===target)??candidates[0];if(f){const sky=c.id.endsWith('zerg.air');f.directions.push(sky?'天空':'地面');f.line=sky?'zerg.air':'zerg.evolution';f.families=[...new Set([...f.families,...PRODUCTION_LINES[sky?'zerg.air':'zerg.evolution'].families])];s.unlocked.add(sky?'mutalisk':'hydralisk');}}
 else if(c.id==='crystal'){s.facilities.push({id:'crystal-pair',name:'折跃水晶 ×2',line:'gateway',directions:['两座样例 · 配置方式待定'],families:['zealot','adept'],outputs:['zealot'],enabled:true,count:2});}
 else if(c.id==='hatchery'){s.facilities.push({id:'h'+(s.facilities.length+1),name:'孵化场 '+(s.facilities.length+1),line:'zerg.basic',directions:['基础'],families:PRODUCTION_LINES['zerg.basic'].families,outputs:['zergling'],enabled:true});}
 else {const d=DEVELOPMENT.find(d=>d.id===c.id);if(d?.kind==='facility'){const found=s.facilities.find(f=>f.line===d.line);if(found)found.count=(found.count??1)+1;else {const first=PRODUCTION_LINES[d.line!].families[0];const f:FacilityView={id:d.line!,name:d.name,line:d.line!,directions:[d.name],families:PRODUCTION_LINES[d.line!].families,outputs:[],enabled:true,count:1};if(c.id==='factory'||c.id==='starport'){s.unlocked.add(first);f.outputs=[first];}s.facilities.push(f);}}else s.completed.add(c.id);}
}
