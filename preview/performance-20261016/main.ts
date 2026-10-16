import '../../src/ui/presentation/building-panel.css';
import '../../src/ui/presentation/game-shell.css';
import '../../src/render/scene/battle-distress.css';
import '../../src/ui/presentation/world-labels.css';
import '../../src/ui/presentation/text-scale-reference.generated.css';
import {chooseCampaignMap} from '../../src/data/campaign-map';
import {boot} from '../../src/app/bootstrap';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {difficultyLoadout} from '../../tools/difficulty-r2-loadout';
import {setDiagnosticHealthLock} from '../../src/diagnostics/combat-lock';
import {continuousEndlessGrowth,endlessFrequency} from '../../src/data/enemy-tuning';
import {setTextScale,textScale} from '../../src/ui/text-scale';
import {finishOpening} from '../../src/ui/presentation/opening';
import type {Difficulty} from '../../src/data/stages';
const params=new URLSearchParams(location.search),quality=Math.max(0,Math.min(4,Number(params.get('gear')??0))) as 0|1|2|3|4,account=newEquipmentAccount(529);
for(const race of ['terran','zerg','protoss'] as const)difficultyLoadout(race,quality,529,account);
setTextScale(textScale());
void boot({equipmentAccount:account,seed:529}).then(app=>{
 const {world:w,view,hud,driver,readiness}=app;let frozen=params.get('qa')==='1',diagnostic=false,fixture='正常流程',busy=false;
 if(params.get('qa')==='1'){
  const nativePrepare=app.session.prepareNewRun.bind(app.session);
  app.session.prepareNewRun=(...args)=>{const ticket=nativePrepare(...args);ticket.campaignMap={...chooseCampaignMap(Number(params.get('seed')??529)),theme:(params.get('map')??'mar-sara') as any};return ticket;};
 }
 const native=driver.advance.bind(driver);driver.advance=(seconds:number)=>frozen?1:native(seconds);
 const freeze=()=>{frozen=true;driver.reset();};
 const play=()=>{frozen=false;driver.reset();};
 const advance=(ticks:number)=>{freeze();for(let i=0;i<ticks;i++)w.step();view.render(1/60,1);hud.update();};
 const resetField=()=>{freeze();for(const [id,u] of w.entities)if(u.owner==='zerg')w.entities.delete(id);w.effects=[];w.weaponFlights=[];w.visualEvents=[];w.enemySpecials.restore({acidZones:[],serial:0,casts:[],missiles:[],charges:new Map()});w.pods=[];w.pickups=[];w.rewardDrops=[];w.economicTargets.clear();w.expansionHives.clear();w.hive=null;w.swarm.pending=[];(w as any).ambientBacklog=[];w.paused=false;};
 const prepare=async()=>{w.changed();await readiness.prepare('reinforcement');if(readiness.state.phase==='error')throw Error(readiness.state.error??'资源准备失败');view.render(1/60,1);hud.update();panel.querySelector('summary')!.textContent=diagnostic?'诊断 · 已跳关／友军锁血':'性能与入门难度预览 · 仅内存';};
 const jump=async(stage:number,difficulty:Difficulty=w.difficulty,dense=false)=>{
  if(w.phase!=='battle'||w.endless)throw Error('先从主菜单进入战役；无尽后请返回主菜单重新开始');diagnostic=true;fixture=`诊断夹具 · ${difficulty} 第${stage}关${dense?' · 队列压力':''} · 友军锁血`;setDiagnosticHealthLock(w,true);resetField();w.stage=stage;w.difficulty=difficulty;w.stageStartedAt=w.time;w.stageElapsed=0;w.prepareStage();
  const a=w as any,waves=a.waves;const index=dense?Math.max(0,waves.length-3):Math.min(2,waves.length-1);const at=waves[index].at+Math.max(...waves[index].members.map((m:any)=>m.offset));w.time=w.stageStartedAt+at;w.tick=Math.round(w.time*60);w.stageElapsed=at;
  if(dense){for(let n=0;n<=index;n++)w.spawnWave();}else{a.stageWave=index;w.spawnWave();}
  await prepare();return summary();
 };
 const endless=async(round=1)=>{
  if(w.phase!=='battle')throw Error('先从主菜单进入战场');diagnostic=true;fixture=`诊断夹具 · 无尽${round} · 友军锁血`;setDiagnosticHealthLock(w,true);
  if(!w.endless){resetField();w.stage=18;w.phase='won';if(!w.chooseCampaignExit('endless'))throw Error('无法准备无尽');if(w.rewardRound==='building')w.skipDevelopment();if(!w.finishIntermission())throw Error('无法完成无尽整备');await readiness.prepare('endless');if(readiness.state.phase==='error')throw Error('无尽资源准备失败');hud.onCommitFlow();if(!w.endless)throw Error('无尽转场未完成');}
  resetField();w.endless.round=round;w.time=Math.max(w.time,(round-1)*60);w.tick=Math.round(w.time*60);w.endless.startedAt=w.time-(round-1)*60;w.stageStartedAt=w.time;w.stageElapsed=0;w.prepareStage();w.spawnWave();w.time+=4;w.tick+=240;w.stageElapsed=4;(w as any).releaseAmbient();await prepare();return summary();
 };
 const focus=()=>{const enemies=[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0);if(!enemies.length)return;const e=enemies[0],length=Math.hypot(e.x-w.anchor.x,e.z-w.anchor.z)||1,point={x:e.x-(e.x-w.anchor.x)/length*10,z:e.z-(e.z-w.anchor.z)/length*10},dx=point.x-w.anchor.x,dz=point.z-w.anchor.z;w.anchor.x=point.x;w.anchor.z=point.z;for(const u of w.allies()){u.x+=dx;u.z+=dz;u.prev={x:u.x,z:u.z};}fixture+=' · 队伍移至镜头样本位';view.setCameraZoom(.9);view.render(1/60,1);};
 const summary=()=>{const units=[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0);return {fixture,diagnostic,frozen,quality,race:w.expedition.race,difficulty:w.difficulty,phase:w.phase,time:w.time,tick:w.tick,stage:w.stage,stageElapsed:w.stageElapsed,endless:w.endless?{round:w.endless.round,seconds:w.endlessElapsed,growth:continuousEndlessGrowth(w.endlessElapsed),frequency:endlessFrequency(w.endlessElapsed),elites:w.endless.elites,bosses:w.endless.bosses}:null,allies:w.allies().length,enemies:units.length,tiers:[1,.3,.5].map(d=>({density:d,count:units.filter(u=>u.enemySpawn?.density===d).length})),queue:(w as any).ambientBacklog.length,swarmPlanned:w.swarm.planned,units:units.slice(0,60).map(u=>({id:u.id,type:u.unitType,x:u.x,z:u.z,hp:u.hp,maxHp:u.maxHp,damage:u.weaponDamage,armor:u.armor,period:u.attackPeriod,move:u.moveSpeed,range:u.attackRange,stamp:u.enemySpawn,resources:u.enemyResources})),errors:view.modelErrors,render:view.report()};};
 const frames:number[]=[];let previous=performance.now();const sample=(now:number)=>{frames.push(now-previous);if(frames.length>10000)frames.shift();previous=now;requestAnimationFrame(sample);};requestAnimationFrame(sample);
 const reset=()=>{freeze();setDiagnosticHealthLock(w,false);diagnostic=false;fixture='正常流程';hud.squadConsole.close();hud.carrierInspector.close();(hud as any).archivesOpen=false;hud.settingsOpen=false;hud.talentOpen=false;hud.menuPage='title';readiness.cancel();hud.onRestart();hud.update();panel.querySelector('summary')!.textContent='性能与入门难度预览 · 仅内存';play();};
 (window as any).__DIFFICULTY_R2__={...app,account,summary,freeze,play,advance,jump,endless,focus,reset,frames,clearFrames:()=>{frames.length=0;}};
 const panel=document.createElement('details');panel.dataset.difficultyPreview='true';panel.style.cssText='position:fixed;right:12px;top:64px;z-index:4000;max-width:300px;padding:8px 10px;border:1px solid #506a78;border-radius:4px;background:#0a1625ed;color:#dbe9f2;font:12px/1.5 system-ui';
 panel.innerHTML=`<summary>性能与入门难度预览 · 仅内存</summary><p>主菜单可正常开局。当前：${['无装备','白色散件','绿色散件','蓝色散件','紫色散件'][quality]}。下方跳关用于观察混合投放，会开启友军锁血。</p><p>30%／50%弱兵只保留同比例矿气，不触发装备、卡牌、晋级及击杀成长。</p><p><a href="?gear=0">无装备</a> · <a href="?gear=2">绿装</a> · <a href="?gear=3">蓝装</a> · <a href="?gear=4">紫装</a>（重新载入）</p>`;
 const output=document.createElement('p');output.style.whiteSpace='pre-wrap';
 const action=(label:string,fn:()=>unknown)=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='margin:3px;padding:4px 7px;background:#1c3040;color:#dbe9f2;border:1px solid #527184;border-radius:3px';b.onclick=async()=>{if(busy)return;busy=true;output.textContent='正在准备…';try{await fn();output.textContent=fixture;}catch(error){output.textContent=String(error);}finally{busy=false;}};panel.append(b);};
 for(const [name,d] of [['简单','easy'],['普通','normal'],['困难','hard'],['地狱','hell']] as const)action(name+'第6关',()=>jump(6,d));
 action('地狱18关密度',()=>jump(18,'hell',true));action('无尽第1关',()=>endless(1));action('无尽第6关',()=>endless(6));action('观察波次附近',focus);action('继续战斗',play);action('冻结观察',freeze);action('恢复正常开局',reset);panel.append(output);document.body.append(panel);
}).catch(error=>{finishOpening();document.querySelector('#interface')!.textContent='难度预览未能载入：'+String(error);console.error(error);});
