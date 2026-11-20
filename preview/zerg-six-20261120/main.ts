import '../../src/ui/presentation/building-panel.css';
import '../../src/ui/presentation/game-shell.css';
import '../../src/render/scene/battle-distress.css';
import '../../src/ui/presentation/world-labels.css';
import '../../src/ui/presentation/text-scale-reference.generated.css';
import '../../src/ui/hud/special-stages.css';
import './style.css';
import {boot} from '../../src/app/bootstrap';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {applyDisplayPreferences} from '../../src/ui/display-preferences';
import {finishOpening} from '../../src/ui/presentation/opening';
import {starshipImage} from '../../src/ui/starship/runtime-art';
import {assetUrl} from '../../src/assets/manifest';
import {isZergSixFamily,ZERG_SIX,ZERG_SIX_CAPS,ZERG_SIX_UNITS} from '../../src/data/zerg-six';
import {placeZergSixTrial,readZergTrial,scenes} from './scenarios';

const selector=document.querySelector<HTMLSelectElement>('#trial-unit')!;
const candidate=new URL(location.href).searchParams.get('unit')??'';
let unit=isZergSixFamily(candidate)?candidate:ZERG_SIX[0];
for(const id of ZERG_SIX)selector.add(new Option(ZERG_SIX_UNITS[id].zh,id,id===unit,id===unit));
const reset=document.querySelector<HTMLButtonElement>('#trial-reset')!;
selector.disabled=reset.disabled=true;
const observe=document.querySelector<HTMLDetailsElement>('#trial-observe')!;
observe.querySelector('p')!.textContent=scenes[unit].focus;
const output=observe.querySelector('output')!;
async function openTrial(){
 const seed=201120;
 applyDisplayPreferences();
 const {world,readiness,hud,view}=await boot({seed,equipmentAccount:newEquipmentAccount(seed),uiValidation:true,starship:{resolveImage:starshipImage}});
 view.restrainedFriendlyFeedback=true;
 if(!world.selectRace('zerg'))throw Error('试玩战局未能开始');
 const read=()=>readZergTrial(world);
 Object.defineProperty(window,'__SC2_ZERG_SIX_DEMO__',{value:read});
 const enter=async()=>{
  selector.disabled=reset.disabled=true;
  observe.querySelector('p')!.textContent=scenes[unit].focus;
  output.value='';
  const children=unit==='swarm_host'?['zerg_locust']:unit==='brood_lord'?['zerg_broodling']:[];
  const missing=[unit,...children].filter(id=>!assetUrl('model.'+id));
  if(missing.length)throw Error('缺少原版单位模型 '+missing.map(id=>ZERG_SIX_UNITS[id as keyof typeof ZERG_SIX_UNITS].zh).join('、'));
  if(world.phase!=='menu')world.resetRun();
  if(!world.start())throw Error('试玩战局未能开始');
  placeZergSixTrial(world,unit);
  view.resetRun();
  hud.update();
  try{await readiness.prepare('reinforcement',{campaignMap:world.campaignRecipe});}
  finally{selector.disabled=reset.disabled=false;}
 };
 selector.addEventListener('change',()=>{
  if(!isZergSixFamily(selector.value))return;
  unit=selector.value;
  const url=new URL(location.href);
  url.searchParams.set('unit',unit);
  history.replaceState(null,'',url);
  void enter().catch(showTrialError);
 });
 reset.addEventListener('click',()=>void enter().catch(showTrialError));
 await enter();
 window.setInterval(()=>{
  if(!observe.open)return;
  const s=read(),friendly=s.entities.filter(u=>u.hp>0&&u.owner==='terran'),enemies=s.entities.filter(u=>u.hp>0&&u.owner==='zerg');
  const converted=friendly.filter(u=>u.temp?.kind==='converted');
  const body=friendly.filter(u=>u.type===unit),caps=Math.max(0,...enemies.map(u=>u.corrosion));
  const detail=unit==='infestor'?'感染 '+enemies.filter(e=>e.marks>0).length+' · 受控 '+converted.length+'/'+ZERG_SIX_CAPS.convertedTotal+(converted.length?' · '+converted.map(e=>Math.max(0,e.temp!.until-s.time).toFixed(1)+'秒').join('、'):''):
   unit==='devourer'?'最高腐蚀 '+caps+' 层':
   unit==='swarm_host'?'钻地 '+body.filter(u=>u.mode==='burrowed').length+' · 蝗虫 '+friendly.filter(u=>u.temp?.kind==='locust').length:
   unit==='brood_lord'?'巢虫 '+friendly.filter(u=>u.temp?.kind==='broodling').length:
   unit==='viper'?'腐蚀云 '+s.clouds+' · 位移免疫 '+enemies.filter(u=>(u.immune??0)>s.time).length:
   '应激甲壳 '+(body.some(u=>(u.shell??0)>s.time)?'生效':body.some(u=>u.shell)?'已结束':'待触发');
  output.value=detail+' · 击杀 '+s.kills;
 },150);
}
function showTrialError(error:unknown){
 finishOpening();
 const root=document.querySelector<HTMLElement>('#interface')!;
 root.innerHTML='<section class="boot-error"><h1>试玩载入失败</h1><p></p></section>';
 root.querySelector('p')!.textContent=error instanceof Error?error.message:String(error);
 console.error(error);
}
openTrial().catch(showTrialError);
