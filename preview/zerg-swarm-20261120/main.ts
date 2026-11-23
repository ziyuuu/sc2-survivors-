import '../armed-support-showcase-20261111/style.css';
import '../../src/ui/presentation/world-labels.css';
import '../../src/render/scene/battle-distress.css';
import './battle.css';
import {TUNING} from '../../src/data/game';
import {ZERG_SWARM_CARDS,ZERG_SWARM_BY_ID,isZswId,type ZswShort} from '../../src/data/zerg-swarm';
import {swarmCardCopy} from '../../src/data/zerg-swarm-copy';
import {HEROES} from '../../src/data/heroes';
import {AudioEffects} from '../../src/render/effects/audio';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {audioPreloadBanks} from '../../src/app/audio-preload-plan';
import {cardGroups,heroOptions,optionQuery,rankName,readOption,type ShowcaseOption} from './options';
import {readScene,swarmScenario} from './scenarios';

const select=document.querySelector<HTMLSelectElement>('#card')!;
const heroes=document.querySelector<HTMLSelectElement>('#hero')!;
const cargo=document.querySelector<HTMLSelectElement>('#cargo')!;
const canvas=document.querySelector<HTMLCanvasElement>('#battle')!;
const status=document.querySelector<HTMLOutputElement>('#state')!;
const summary=document.querySelector<HTMLOutputElement>('#summary')!;
const details=document.querySelector<HTMLDetailsElement>('details')!;
const records=document.querySelector<HTMLPreElement>('#records')!;
const rankButtons=[...document.querySelectorAll<HTMLButtonElement>('[data-rank]')];
const button=(id:string)=>document.querySelector<HTMLButtonElement>('#'+id)!;
for(const [key,label] of Object.entries(cardGroups)){
 const group=document.createElement('optgroup');group.label=label;
 for(const card of ZERG_SWARM_CARDS.filter(c=>c.short[0]===key))group.append(new Option(card.name,card.id));
 select.append(group);
}
for(const id of heroOptions)heroes.add(new Option(HEROES[id].name,id));
let option=readOption(new URLSearchParams(location.search)),scene=swarmScenario(option);
const world=scene.world,view=new BattleRenderer(canvas,world),audio=new AudioEffects();
view.restrainedFriendlyFeedback=true;
let drawMilliseconds=0;
let ready=false,busy=false,error='',last=performance.now(),acc=0,refreshAt=0;
const seconds=(n:number)=>n.toFixed(1);
const percent=(n:number)=>Math.round(n*100)+'%';
const warmed=new Set<string>();
function report(){
 return {option,ready,error,drawMilliseconds,...readScene(world,scene),modelErrors:[...view.modelErrors]};
}
type SceneReading=ReturnType<typeof readScene>;
function effectReading(row:SceneReading,short:ZswShort){
 const living=row.units.filter(u=>u.hp>0),temps=living.filter(u=>u.swarm);
 const clock=(key:string)=>row.clocks[key]?seconds(row.clocks[key].due)+' 秒':null;
 const lead=row.units.find(u=>u.id===scene.leadId);
 const representative=temps[0];
 switch(short){
  case 'W01':return '下单耗时 '+seconds(row.quote)+' 秒 · 现有订单剩 '+seconds(row.remaining??0)+' 秒';
  case 'W04':return '前排 '+(lead?.hp?'存活':'阵亡')+' · 跳虫投放 '+(clock('W02')??'准备中');
  case 'W05':case 'P03':return representative?'攻速 ×'+representative.attackSpeed.toFixed(2)+' · 移速 ×'+representative.moveSpeed.toFixed(2):'等待入场';
  case 'W06':return '当前甲壳吸收余量 '+Math.ceil(living.reduce((n,u)=>n+(u.shell?.birth?.remaining??0)+(u.shell?.loss?.remaining??0),0));
  case 'W07':case 'W09':case 'B07':return '挂标 '+row.tags.length+' · 最高直接伤害倍率 ×'+Math.max(1,...temps.map(u=>u.directFactor)).toFixed(2);
  case 'W08':return '第一波临时兵 '+(representative?seconds(representative.bornAt)+' 秒入场':'待入场')+' · 前排敌人生命 '+Math.ceil(row.firstHp);
  case 'G01':return option.cargo==='delivery'?'已抵达正式新兵 '+row.delivered+' · 主脑 '+(clock('delivery')??'未启用'):'满员投放 '+(clock('overflow')??'未启用');
  case 'G04':case 'N03':return '复活队列 '+row.reviving.length+' · 原席位 '+(lead?.hp?'生命 '+percent(lead.hp/lead.maxHp):'阵亡')+(lead&&lead.attackSpeed>1?' · 攻速 ×'+lead.attackSpeed.toFixed(2):'');
  case 'W03':case 'G07':case 'B03':case 'N05':case 'P05':return '现有孢子 '+row.marks.length+' · 孢子后代 '+temps.filter(u=>u.swarm?.origin==='spore').length;
  case 'G09':return '伴生跳虫 '+temps.filter(u=>u.swarm?.origin==='companion').length;
  case 'B01':case 'N04':case 'O02':return '编制 '+row.squads.length+'/'+row.squadCap+' · '+row.squads.map(s=>s.family+' '+s.seats+'/'+s.cap).join(' · ');
  case 'B08':return '已成熟 '+temps.filter(u=>u.swarm?.mature).length+(representative?' · '+representative.type+' 生命 '+representative.maxHp+' · 武器 '+representative.damage.toFixed(1):'');
  case 'N01':case 'N08':return representative?representative.type+' · 军衔 '+representative.rank+' · 基础寿命 '+representative.swarm!.baseLife+' 秒 · 实际 '+seconds(representative.swarm!.expires-representative.bornAt)+' 秒':'等待入场';
  case 'N06':return '原始批次计数 '+row.echoCount+' · 追加兵 '+temps.filter(u=>u.swarm?.origin.startsWith('echo:')).length;
  case 'G08':case 'B09':case 'N07':return '身形 '+percent(lead?.size??1)+' · 碰撞半径 '+percent(lead?.contact??1)+(short==='N07'?' · 可穿阵 '+living.filter(u=>u.passes).length+' 只':'');
  case 'N09':return '最高减伤 '+percent(Math.max(0,...living.map(u=>u.mitigation??0)));
  case 'O01':return '英雄机体 '+living.filter(u=>u.hero===option.hero).length+' · 共享技能冷却 '+seconds(Math.max(0,(row.heroReady[0]?.ready??0)-row.time))+' 秒';
  case 'O03':return '临时兵上限 '+row.tempCap;
  default:{
   const tally=new Map<string,number>();
   for(const u of temps)tally.set(u.type,(tally.get(u.type)??0)+1);
   return [...tally].map(([type,n])=>type+' ×'+n).join(' · ')||'等待入场';
  }
 }
}
function syncControls(){
 const card=ZERG_SWARM_BY_ID[option.id];
 select.value=card.id;heroes.value=option.hero;cargo.value=option.cargo;
 heroes.hidden=card.short!=='O01';cargo.hidden=card.short!=='G01';button('cast').hidden=heroes.hidden;
 select.disabled=cargo.disabled=heroes.disabled=busy;
 for(const el of [button('replay'),button('pause'),button('retreat'),button('cast'),...rankButtons])el.disabled=!ready||busy;
 button('replay').disabled=busy;
 for(const el of rankButtons){
  const rank=Number(el.dataset.rank);
  el.hidden=rank>card.maxRank;
  el.setAttribute('aria-pressed',String(rank===option.rank));
  el.textContent=rank===1&&card.purchase==='orange'?'持牌效果':rankName(rank);
 }
 document.querySelector('#effect')!.textContent=option.rank?swarmCardCopy(card.short).effects[option.rank-1]:'基础对照';
 document.querySelector('#focus')!.textContent=[scene.focus,scene.context?'配合 '+scene.context:'',scene.nearClock?'开场倒计时已预热':''].filter(Boolean).join(' · ');
 const catalogue=document.querySelector<HTMLAnchorElement>('#catalogue')!;
 catalogue.search=['G08','B09','N07'].includes(card.short)?'?group=density':'?card='+card.id;
}
function refresh(){
 status.value=error||(busy?'载入原版资源中':world.phase==='lost'?'小队已覆灭':seconds(world.time)+' 秒');
 button('pause').textContent=world.paused?'播放':'暂停';
 if(!ready){summary.value='';return;}
 const row=readScene(world,scene),label=effectReading(row,ZERG_SWARM_BY_ID[option.id].short);
 summary.value=[label,'伤害 '+Math.round(row.damage),'击杀 '+row.kills,'临时兵 '+row.temps].join(' · ');
 if(details.open)records.textContent=JSON.stringify(report(),null,2);
}
async function load(next:ShowcaseOption=option){
 if(busy)return;
 busy=true;ready=false;error='';option=next;
 try{
  scene=swarmScenario(option);
  const snapshot=scene.world.captureRun();
  world.restoreRun(snapshot);view.resetRun();audio.resumeAt(world);
  syncControls();refresh();
  await view.prepareCurrentAssets();
  await Promise.all(scene.extraModels.map(async model=>{
   if(!await view.ensureUnitVariant(model,model))throw Error('未载入 '+model);
  }));
  await view.warmPresentationBatches();
  await audio.prepareBanks(audioPreloadBanks('zerg',1,[...world.entities.values(),...scene.extraModels.map(model=>({unitType:model}))],true));
  const warmKey=[option.id,option.rank>0,option.hero,option.cargo,view.contextEpoch].join('/');
  if(!warmed.has(warmKey)){
   world.paused=false;
   try{
    await view.warmTrialFrames(function*(){
     for(const time of [.3,1,3.35,4.25,5.15,5.8,6.05,6.65,8.35,9.15,10.1]){
      world.advance(time-world.time);yield TUNING.step;
     }
    });
    warmed.add(warmKey);
   }finally{world.restoreRun(snapshot);view.resetRun();audio.resumeAt(world);}
  }
  view.initialAssetsLoaded=true;
  history.replaceState(null,'',location.pathname+optionQuery(option.id,option.rank,option));
  world.paused=false;acc=0;last=performance.now();ready=true;
 }catch(e){error=e instanceof Error?e.message:String(e);console.error(e);}
 finally{busy=false;syncControls();refresh();}
}
function replay(next?:ShowcaseOption){void audio.start();void load(next);}
select.addEventListener('change',()=>{if(isZswId(select.value))replay({...option,id:select.value,rank:1});});
heroes.addEventListener('change',()=>{
 const hero=heroOptions.find(id=>id===heroes.value);if(hero)replay({...option,hero});
});
cargo.addEventListener('change',()=>replay({...option,cargo:cargo.value==='overflow'?'overflow':'delivery'}));
for(const el of rankButtons)el.addEventListener('click',()=>replay({...option,rank:Number(el.dataset.rank)}));
button('replay').onclick=()=>replay();
button('pause').onclick=()=>{void audio.start();world.paused=!world.paused;refresh();};
button('cast').onclick=()=>{void audio.start();world.castHero(option.hero);refresh();};
button('retreat').onclick=()=>{
 void audio.start();world.paused=false;
 world.issueMove({x:0,z:-12});refresh();
};
canvas.addEventListener('click',e=>{
 if(!ready)return;
 void audio.start();
 const point=view.pickMove(e.clientX,e.clientY);
 if(point)world.issueMove(point.point);
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
details.addEventListener('toggle',refresh);
function frame(now:number){
 const dt=Math.min(.1,(now-last)/1000);last=now;
 if(ready&&!busy){
  acc+=dt;
  while(acc>=TUNING.step){world.step();acc-=TUNING.step;}
  audio.update(world);
  view.render(dt,acc/TUNING.step);
 }
 if(now>=refreshAt){refreshAt=now+200;refresh();}
 requestAnimationFrame(frame);
}
Object.assign(window,{swarmShowcase:{report,audioReport:()=>audio.report(),
 advance(seconds:number){
  if(ready){world.paused=false;world.advance(seconds);world.paused=true;audio.update(world);const start=performance.now();view.render(TUNING.step,1);drawMilliseconds=performance.now()-start;refresh();}
  return report();
 },
}});
requestAnimationFrame(frame);
void load();
