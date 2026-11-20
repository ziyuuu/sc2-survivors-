import type {HeroId} from '../../src/data/heroes';
import '../../src/ui/presentation/world-labels.css';
import '../../src/render/scene/battle-distress.css';
import '../armed-support-showcase-20261111/style.css';
import {DOOMSDAY_CARDS,type DoomsdayId} from '../../src/data/terran-doomsday';
import {DOOMSDAY_BRIEF,DOOMSDAY_DETAIL} from '../../src/data/terran-doomsday-copy';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {AudioEffects} from '../../src/render/effects/audio';
import {audioPreloadBanks} from '../../src/app/audio-preload-plan';
import {observeWorld} from '../../src/simulation/observation';
import {doomsdayScenario,type ShowcaseOptions} from './scenarios';
import {COMPARISONS,comparisonId,comparisonStage,type ComparisonId} from './comparisons';
import {captureBattleView} from '../../src/render/input/battle-view';

const select=document.querySelector<HTMLSelectElement>('#card')!,state=document.querySelector<HTMLOutputElement>('#state')!,params=new URLSearchParams(location.search);
let driver:HeroId|undefined;
const groupParam=comparisonId(params.get('group'));
const stageSelect=document.querySelector<HTMLSelectElement>('#stage')!;
const readStage=(group:ComparisonId,value:number)=>Number.isInteger(value)&&value>=0&&value<COMPARISONS[group].stages.length?value:0;
let options:ShowcaseOptions={group:groupParam,stage:groupParam?readStage(groupParam,Number(params.get('stage'))):undefined,stack:params.get('stack')==='1',theme:params.get('terrain')==='ice'?'ice':undefined};
let id=(groupParam?COMPARISONS[groupParam].card:DOOMSDAY_CARDS.find(c=>c.id===params.get('card'))?.id??'M-W01') as DoomsdayId,variant:0|1|2=([0,1,2].includes(Number(params.get('variant')))&&params.has('variant')?Number(params.get('variant')):1) as 0|1|2,boss=false,fixture=doomsdayScenario(id,variant,boss,driver,options),world=fixture.world,busy=false,ready=false,failure='';
const view=new BattleRenderer(document.querySelector('#battle')!,world),audio=new AudioEffects();
let totals={damage:0,healed:0,shieldRestored:0},events:Record<string,number>={},lastSerial=0,frames:number[]=[];
observeWorld(world,(_source,kind,amount)=>{if(kind in totals)totals[kind as keyof typeof totals]+=amount;});
const compareGroup=document.createElement('optgroup');compareGroup.label='同队构筑对照';
for(const [key,group] of Object.entries(COMPARISONS))compareGroup.append(new Option(group.name,key));
select.append(compareGroup);
for(const [prefix,name] of [['W','白色'],['G','绿色'],['B','蓝色'],['P','普通紫卡'],['N','紫色节点'],['O','橙色节点']]){const group=document.createElement('optgroup');group.label=name;for(const c of DOOMSDAY_CARDS.filter(c=>c.id.startsWith('M-'+prefix)))group.append(new Option(c.id+' '+c.name,c.id));select.append(group);}select.value=id;
function collect(){for(const e of world.visualEvents)if(e.serial>lastSerial){const key=e.supportVisual??e.kind;events[key]=(events[key]??0)+1;if(e.doomsdayEffect)events[e.doomsdayEffect]=(events[e.doomsdayEffect]??0)+1;}lastSerial=world.visualEvents.at(-1)?.serial??lastSerial;}
function report(){return {card:id,variant,boss,options,ready,busy,failure,tick:world.tick,phase:world.phase,totals,events,state:world.expedition.doomsday,heroes:[...world.heroes.values()],
 members:world.allies().map(u=>({id:u.id,type:u.unitType,hero:u.heroId,elite:u.eliteId,rank:u.rank,hp:u.hp,maxHp:u.maxHp,damage:u.weaponDamage,period:u.attackPeriod,energy:u.energy,armor:u.armor,radius:u.unitRadius,movementRadius:u.movementRadius,moveSpeed:u.moveSpeed,x:u.x,z:u.z,mode:u.mode,nativeMode:u.nativeMode,doomsday:u.doomsday})),
 enemies:[...world.entities.values()].filter(u=>u.owner==='zerg').map(u=>({id:u.id,hp:u.hp,x:u.x,z:u.z,visible:world.visibleTo(u,'terran'),doomsday:u.doomsday})),flights:world.weaponFlights.map(p=>({id:p.id,kind:p.doomsdayDerived?.kind,target:p.target,pending:p.pendingLaunch})),errors:view.modelErrors,audio:{errors:audio.report().errors,nativePlayed:audio.report().nativePlayed,routes:audio.report().nativeRoutes},render:view.report(),frames};}
function refresh(){select.disabled=busy;stageSelect.disabled=busy;for(const b of document.querySelectorAll<HTMLButtonElement>('#replay,#base,#node,#reserve,#boss'))b.disabled=busy||!ready;
 document.querySelector('#pause')!.textContent=world.paused?'播放':'暂停';state.textContent=failure|| (busy?'准备中':`${options.group?COMPARISONS[options.group].name:fixture.card.name} · ${world.time.toFixed(1)}秒`);
 document.querySelector('#comparison')!.textContent=`实际伤害 ${Math.round(totals.damage)} · 恢复 ${Math.round(totals.healed)} · ${variant===0?'基础':variant===2?(id==='M-O02'?'近战':'复选'):'持牌'}`;
 const description=document.querySelector('#description')!;description.textContent=options.group?comparisonStage(options.group,options.stage??0).label+' · '+(fixture.cards.join('、')||'原装'):DOOMSDAY_BRIEF[id]+'\n'+DOOMSDAY_DETAIL[id];if(document.querySelector('#records')!.closest('details')!.open)document.querySelector('#records')!.textContent=JSON.stringify(report(),null,2);
 document.querySelector<HTMLSelectElement>('#driver')!.value=driver??'';document.querySelector('#driver')!.toggleAttribute('hidden',id!=='M-O01');document.querySelector('#reserve')!.toggleAttribute('hidden',!id.startsWith('M-N')&&id!=='M-O02');document.querySelector('#reserve')!.textContent=id==='M-O02'?'近战对照':'复选一次';
 stageSelect.hidden=!options.group;document.querySelector<HTMLElement>('#comparison')!.style.display=options.group?'none':'';
 for(const selector of ['#base','#node','#boss'])document.querySelector<HTMLButtonElement>(selector)!.hidden=!!options.group;
 if(options.group)document.querySelector<HTMLButtonElement>('#reserve')!.hidden=true;
}
async function load(card=id,mode:0|1|2=variant,isBoss=boss,settings:ShowcaseOptions=card===id&&!options.group?options:{theme:options.theme}){if(busy)return;busy=true;ready=false;failure='';id=card;variant=mode;boss=isBoss;options={...settings,theme:settings.theme??(world.runConfig?.mapId==='campaign-five-v3'?'char':undefined)};select.value=options.group??id;if(options.group){stageSelect.replaceChildren(...COMPARISONS[options.group].stages.map((stage,index)=>new Option(stage.label,String(index))));stageSelect.value=String(options.stage??0);}totals={damage:0,healed:0,shieldRestored:0};events={};lastSerial=0;frames=[];refresh();
 try{fixture=doomsdayScenario(id,variant,boss,driver,options);world.restoreRun(fixture.snapshot);view.resetRun();audio.resumeAt(world);history.replaceState(null,'',location.pathname+(options.group?`?group=${options.group}&stage=${options.stage??0}`:`?card=${id}&variant=${variant}${options.stack?'&stack=1':''}`)+(options.theme?'&terrain='+options.theme:''));await view.prepareSnapshotAssets(fixture.snapshot);await view.prepareCurrentAssets();await view.warmPresentationBatches();await audio.prepareBanks(audioPreloadBanks('terran',1,world.entities.values(),true));view.initialAssetsLoaded=true;world.paused=true;ready=true;}
 catch(e){failure=String(e);throw e;}finally{busy=false;refresh();}}
function play(){world.paused=false;if(id==='M-O01'&&world.tick===0){const battleView=captureBattleView(document.querySelector<HTMLCanvasElement>('#battle')!,view.camera);for(const hero of world.heroes.keys())world.castHero(hero,battleView);}}
async function replay(run=true){await load(id,variant,boss,options);await audio.start();if(run)play();}
document.querySelector<HTMLSelectElement>('#driver')!.onchange=e=>{driver=(e.target as HTMLSelectElement).value as HeroId||undefined;void load();};
async function compare(group:ComparisonId,stage=0,run=true){
 await load(COMPARISONS[group].card,1,false,{group,stage:readStage(group,stage),theme:options.theme});
 if(run){void audio.start();play();}
}
select.onchange=()=>{const group=comparisonId(select.value);if(group)void compare(group);else void load(select.value as DoomsdayId,1,false);};
stageSelect.onchange=()=>{if(options.group)void compare(options.group,Number(stageSelect.value));};document.querySelector('#replay')!.addEventListener('click',()=>void replay());
document.querySelector('#base')!.addEventListener('click',()=>void load(id,0));document.querySelector('#node')!.addEventListener('click',()=>void load(id,1));document.querySelector('#reserve')!.addEventListener('click',()=>void load(id,2));document.querySelector('#boss')!.addEventListener('click',()=>void load(id,variant,!boss));document.querySelector('#pause')!.addEventListener('click',()=>{void audio.start();if(world.paused)play();else world.paused=true;});
let previous=performance.now(),accumulator=0,lastUI=0;function frame(now:number){const dt=Math.min(.1,(now-previous)/1000);previous=now;if(ready&&!busy){accumulator+=dt;while(accumulator>=1/60){world.step();accumulator-=1/60;}collect();audio.update(world);const before=performance.now();view.render(dt,accumulator*60);if(!world.paused&&frames.length<1800)frames.push(performance.now()-before);}else accumulator=0;if(now-lastUI>200){lastUI=now;refresh();}requestAnimationFrame(frame);}requestAnimationFrame(frame);
Object.assign(window,{doomsdayShowcase:{load,replay,compare,report,world,view,audio,driver:async(hero:HeroId)=>{driver=hero;await load('M-O01',1);},advance:(seconds:number)=>{play();for(let i=0;i<Math.round(seconds*60);i++){world.step();collect();}world.paused=true;audio.update(world);view.render(1/60,1);refresh();return report();}}});void load(id,variant,boss,options).then(()=>{if(options.group)play();});
