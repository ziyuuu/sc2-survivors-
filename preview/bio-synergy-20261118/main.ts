import '../armed-support-showcase-20261111/style.css';
import '../../src/ui/presentation/world-labels.css';
import '../../src/render/scene/battle-distress.css';
import {BIO_CARDS,isBioId,type BioId} from '../../src/data/terran-bio';
import {cardReading} from './card-reading';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {AudioEffects} from '../../src/render/effects/audio';
import {audioPreloadBanks} from '../../src/app/audio-preload-plan';
import {Vector3} from 'three';
import {AIR_HEIGHT} from '../../src/data/terrain';
import {modelPresentationScale} from '../../src/data/combat-presentation';
import {bioScenario,startBioScene} from './scenarios';
const query=new URLSearchParams(location.search),param=query.get('card');
let id:BioId=isBioId(param)?param:'BIO-W01',variant=query.get('variant')==='0'?0:query.get('variant')==='2'?2:1;
const select=document.querySelector<HTMLSelectElement>('#card')!,status=document.querySelector('output')!;
const world=bioScenario(id,variant).world,view=new BattleRenderer(document.querySelector('#battle')!,world),audio=new AudioEffects();
const button=(key:string)=>document.getElementById(key) as HTMLButtonElement;
for(const [p,title] of Object.entries({W:'白卡',G:'绿卡',B:'蓝卡',P:'普通紫卡',N:'紫色节点',O:'橙色节点'})){const group=document.createElement('optgroup');group.label=title;for(const c of BIO_CARDS.filter(c=>c.id[4]===p))group.append(new Option(c.name,c.id));select.append(group);}
let busy=false,ready=false,error='',last=performance.now(),acc=0,refreshAt=0;
function report(){return {id,variant,ready,error,time:world.time,phase:world.phase,damage:world.stats.damage,healed:world.stats.healed,fields:world.expedition.bio?.fields,units:[...world.entities.values()].map(u=>({id:u.id,unit:u.unitType,elite:u.eliteId,hero:u.heroId,role:u.bio?.role,rank:u.rank,hp:u.hp,maxHp:u.maxHp,armor:u.armor,damage:u.weaponDamage,range:u.attackRange,bio:u.bio})),models:view.modelErrors};}
function refresh(){select.value=id;select.disabled=busy;for(const el of document.querySelectorAll('button'))el.disabled=!ready||busy;button('reserve').hidden=id[4]!=='N';button('pause').textContent=world.paused?'播放':'暂停';const actors=world.allies(),lead=actors.find(u=>!u.temporary&&!u.heroId);document.querySelector('#comparison')!.textContent=lead?'生命 '+Math.ceil(lead.hp)+' / '+Math.ceil(lead.maxHp)+' · 护甲 '+lead.armor.toFixed(1)+' · 随从 '+actors.filter(u=>!!u.bio?.role).length+' · 实际伤害 '+Math.round(world.stats.damage)+' · 恢复 '+Math.round(world.stats.healed):'';const reading=cardReading(world,id);if(reading)document.querySelector('#comparison')!.append(' · '+reading);status.textContent=error||(busy?'准备中':(variant===0?'基础':variant===2?'复选':'持牌')+' · '+world.time.toFixed(1)+' 秒');if(document.querySelector('details')!.open)document.querySelector('#records')!.textContent=JSON.stringify(report(),null,2);}
async function load(card:BioId=id,mode=variant){
 if(busy)return;ready=false;busy=true;error='';id=card;variant=mode;refresh();
 try{const snapshot=bioScenario(id,variant).world.captureRun();world.restoreRun(snapshot);view.resetRun();audio.resumeAt(world);world.paused=true;await view.prepareSnapshotAssets(snapshot);await view.prepareCurrentAssets();await view.warmPresentationBatches();await audio.prepareBanks(audioPreloadBanks('terran',1,world.entities.values(),true));view.initialAssetsLoaded=true;history.replaceState(null,'',location.pathname+'?card='+id+'&variant='+variant);ready=true;startBioScene(world,id);acc=0;last=performance.now();}
 catch(e){error=[String(e),...view.modelErrors].join(' · ');console.error(error);throw Error(error);}finally{busy=false;refresh();}
}
select.onchange=()=>void load(select.value as BioId,1);for(const [key,mode] of [['base',0],['held',1],['reserve',2]] as const)button(key).onclick=()=>{void audio.start();void load(id,mode);};
button('replay').onclick=()=>{void audio.start();void load();};button('pause').onclick=()=>{void audio.start();world.paused=!world.paused;refresh();};
function frame(now:number){const dt=Math.min(.1,(now-last)/1000);last=now;if(ready&&!busy){acc+=dt;while(acc>=1/60){world.step();acc-=1/60;}audio.update(world);view.render(dt,acc*60);}if(now>refreshAt){refreshAt=now+200;refresh();}requestAnimationFrame(frame);}
function overlordReport(){
 const actor=world.allies().find(u=>u.bio?.role==='overlord'),batch=view.gpu.get('overlord');
 if(!actor)return null;
 const height=(batch?.bodyHeight??0)*modelPresentationScale(actor);
 const y=AIR_HEIGHT+height*.72;
 const center=new Vector3(actor.x,y,actor.z).project(view.camera);
 return {key:actor.modelKey,center:center.toArray(),height,instances:batch?.meshes.map(m=>m.count)};
}
Object.assign(window,{bioShowcase:{load,report,overlordReport,effectReport:()=>view.nonHeroEffects.report(),advance(seconds:number){world.paused=false;world.advance(seconds);world.paused=true;view.render(1/60,1);refresh();return report();}}});requestAnimationFrame(frame);void load();
