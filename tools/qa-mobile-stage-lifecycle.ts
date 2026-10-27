// Local-only rendering fixture: clear each of stages 1–2 through the real
// intermission transitions, then prepare/render stage 3. Not a natural playthrough.
import {World} from '../src/simulation/world';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';
import {BackgroundPreparation} from '../src/app/background-preparation';
import {loadHttpAssets} from '../src/assets/http-store';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {chooseCampaignMap,campaignTerrain} from '../src/data/campaign-map';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
const status=document.querySelector<HTMLElement>('#qa-status')!,output=document.querySelector<HTMLElement>('#qa-result')!;
const rows:unknown[]=[];let running=false;
try{
 await loadHttpAssets();const recipe=chooseCampaignMap(529),world=new World({race:'terran',seed:529,terrain:campaignTerrain(recipe),endlessTerrain:new FlatTerrain(),equipmentAccount:newEquipmentAccount(529)});
 const view=new BattleRenderer(document.querySelector<HTMLCanvasElement>('#battle')!,world);Object.defineProperty(view,'memoryConstrainedPreload',{value:true});
 const background=new BackgroundPreparation();await background.opening(20000,async()=>{});
 const gate=new AssetReadinessCoordinator(world,view,undefined,background);gate.onChange=()=>{status.textContent=`准备 ${world.stage} · ${gate.state.phase} · ${gate.state.label}`;};
 let previous=performance.now();function frame(now:number){const dt=Math.min(.033,(now-previous)/1000);previous=now;if(running&&!gate.blocking)world.advance(dt);view.render(dt);requestAnimationFrame(frame);}requestAnimationFrame(frame);
 if(!await gate.prepare('new',{race:'terran',campaignMap:recipe}))throw Error(gate.state.error??'initial preparation failed');
 if(!world.start())throw Error('could not start');view.resetRun();gate.cancel();running=true;
 for(let stage=1;stage<=3;stage++){
  if(world.stage!==stage)throw Error('unexpected stage '+world.stage);
  if(stage>1&&!await gate.prepare('reinforcement'))throw Error(gate.state.error??'stage preparation failed');gate.cancel();
  for(const job of view.battleBackgroundJobs(async()=>{await new Promise<void>(resolve=>setTimeout(resolve,0));}))if(!job.isReady?.())await job.run();
  await new Promise<void>(resolve=>setTimeout(resolve,1000));
  const report=view.report();rows.push({stage,loadedModels:report.models,variants:report.variantModels.length,animationAtlasBytes:report.animationAtlasBytes,gpuTextures:view.renderer.info.memory.textures,gpuGeometries:view.renderer.info.memory.geometries,errors:report.errors});
  output.textContent=JSON.stringify({status:'running',scope:'forced stage-clear lifecycle; mobile preload policy on desktop GPU',rows},null,2);
  if(report.errors.length)throw Error(report.errors.join(';'));
  if(stage<3){running=false;world.endStage();let n=0;while(world.phase==='reward'&&n++<8)if(!world.skipReward())throw Error('intermission was not ready');if(world.stage!==stage+1)throw Error('stage advance failed');running=true;}
 }
 running=false;status.textContent='三关资源生命周期通过';output.textContent=JSON.stringify({status:'passed',scope:'forced stage-clear lifecycle; mobile preload policy on desktop GPU',rows},null,2);
}catch(error){status.textContent='验证失败';output.textContent=JSON.stringify({status:'failed',error:String(error),rows},null,2);console.error(error);}
