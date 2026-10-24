import type {boot} from '../src/app/bootstrap';
import {installPerformanceB02} from './performance-b02-runtime';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {newEquipmentAccount,grantEquipment,itemsAt,expandWarehouse,collectEquipment,discardEquipment,WAREHOUSE_CAPACITIES} from '../src/simulation/starship/inventory';
import {registerEquipmentDrop,equipmentGroundDrops} from '../src/simulation/starship/loot-presentation';
import {collectNearbyEquipment,collectWorldEquipment} from '../src/simulation/starship/drops';
import {ATTRIBUTE_SLOTS} from '../src/simulation/starship/types';
import {setDiagnosticHealthLock} from '../src/diagnostics/combat-lock';
import {MapTerrain} from '../src/simulation/movement/map-terrain';
import {newSupportMine,advanceTrackingMine,minePlacementLegal} from '../src/simulation/combat/tracking-mines';
import {blocked,distance} from '../src/simulation/movement/steering';
import {BUILDS,createCampaignController} from './qa-campaign-controller';
import {difficultyLoadout} from './difficulty-r2-loadout';
import {HUD} from '../src/ui/hud';
import {GamepadInput} from '../src/ui/gamepad/controller';
import {Input} from '../src/ui/mobile/input';
import {GameObserver} from '../src/services/game-observer';
import {TelemetryClient} from '../src/services/telemetry-client';
import {MemoryStorage} from '../src/app/memory-storage';
import {CONSENT_VERSION} from './backend/contracts.mjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {WebGLRenderer} from 'three';
import {installB03Terrain} from './performance-b03-terrain';

// Diagnostic wrappers only. Their CPU totals are inclusive and must not be added.
const pre:any={started:performance.now(),loads:[],events:[],longTasks:[],frames:[],cpu:{},active:false,visibility:[]};
(window as any).__B03_PRE__=pre;
function span(name:string,ms:number){if(!pre.active)return;const row=pre.cpu[name]??(pre.cpu[name]={calls:0,totalMs:0,maxMs:0});row.calls++;row.totalMs+=ms;row.maxMs=Math.max(row.maxMs,ms);}
for(const [obj,key,name]of [[HUD.prototype,'update','hud.update'],[GamepadInput.prototype,'poll','input.gamepad'],[Input.prototype,'poll','input.keyboardPointer'],[GameObserver.prototype,'frame','observer.frame'],[GameObserver.prototype,'pulse','observer.pulse'],[GameObserver.prototype,'changed','observer.changed'],[TelemetryClient.prototype,'record','telemetry.record'],[TelemetryClient.prototype,'writeObservation','telemetry.serializeObservation'],[MapTerrain.prototype,'routeGoal','navigation.routeGoal'],[MapTerrain.prototype,'path','navigation.search'],[MapTerrain.prototype,'connectedLocations','navigation.connectedLocations']] as any[]){const native=obj[key];if(typeof native!=='function')continue;obj[key]=function(...args:any[]){const at=pre.active?performance.now():0;try{return native.apply(this,args);}finally{if(at)span(name,performance.now()-at);}};}
const parse=GLTFLoader.prototype.parse;GLTFLoader.prototype.parse=function(data:any,p:any,onLoad:any,onError:any){const at=performance.now();return parse.call(this,data,p,(g:any)=>{pre.loads.push({kind:'gltf-parse',at,ms:performance.now()-at,ok:true});onLoad(g);},(e:any)=>{pre.loads.push({kind:'gltf-parse',at,ms:performance.now()-at,ok:false});onError?.(e);});};
const compile=WebGLRenderer.prototype.compileAsync;WebGLRenderer.prototype.compileAsync=async function(...args:any[]){const at=performance.now();try{return await compile.apply(this,args as any);}finally{pre.loads.push({kind:'compileAsync',at,ms:performance.now()-at});}};
let last=0;function frame(at:number){if(pre.active){pre.frames.push({at,interval:last?at-last:null});last=at;}else last=0;requestAnimationFrame(frame);}requestAnimationFrame(frame);
try{new PerformanceObserver(list=>{for(const e of list.getEntries())pre.longTasks.push({at:e.startTime,ms:e.duration,name:e.name});}).observe({type:'longtask',buffered:true});}catch{}
document.addEventListener('visibilitychange',()=>pre.visibility.push({at:performance.now(),hidden:document.hidden}));
for(const type of ['click','keydown','pointerdown','input','change'])document.addEventListener(type,e=>{if(!pre.active)return;const t=e.target as HTMLElement,row:any={type,at:performance.now(),target:t?.getAttribute?.('data-act')??t?.getAttribute?.('data-action')??t?.tagName};pre.events.push(row);requestAnimationFrame(()=>requestAnimationFrame(()=>row.twoFramesMs=performance.now()-row.at));},{capture:true,passive:true});

export function installPerformanceB03(app:Awaited<ReturnType<typeof boot>>){
 installPerformanceB02(app);const a=(window as any).__B02__,w=app.world,v=app.view,hud=app.hud;let fixture='native',measurementStart=0,controller:any=null,nextThink=0;
 const realStep=w.step.bind(w);w.step=()=>{if(controller){controller.decisions();if(w.phase==='battle'&&w.time>=nextThink){controller.think();nextThink=w.time+.25;}}return realStep();};
 const originalPrepare=app.session.prepareNewRun.bind(app.session);let theme:any='char';app.session.prepareNewRun=(...args)=>{const plan=originalPrepare(...args);plan.campaignMap={...chooseCampaignMap(529),theme};return plan;};
 const extra=()=>{const account=w.starship.account;return {fixture,at:performance.now(),time:w.time,tick:w.tick,phase:w.phase,paused:w.paused,stage:w.stage,theme:w.campaignRecipe?.theme,endless:w.endless?.round,endlessElapsed:w.endlessElapsed,allies:w.allies().length,enemies:w.enemyCount(),entities:w.entities.size,pickups:w.pickups.length,mineral:w.pickups.filter(p=>p.minerals>0).length,gas:w.pickups.filter(p=>p.gas>0).length,backpack:itemsAt(account,'backpack').length,ground:itemsAt(account,'ground').length,warehouse:itemsAt(account,'warehouse').length,capacity:WAREHOUSE_CAPACITIES[account.warehouseLevel],ledger:w.expedition.ledger.length,history:w.expedition.draftHistory.length,completedReceipts:w.expedition.completedReceipts.length,runReceipts:account.run?.receipts.size??0,lootEvents:w.starship.loot.events.length,lootSerial:w.starship.loot.serial,wallet:{...w.wallet},heap:(performance as any).memory?.usedJSHeapSize,dom:document.querySelectorAll('*').length,gearOpen:app.starship?.isOpen,focused:document.activeElement?.getAttribute('data-action')??document.activeElement?.tagName,hidden:document.hidden,renderMemory:{...v.renderer.info.memory},programs:v.renderer.info.programs?.length,contextEpoch:v.contextEpoch,routes:(w.terrain as any)?.routes?.size,telemetry:{mode:telemetryMode,active:client?.active??false,queue:client?.queue.length??0,dropped:client?.dropped??0}};};
 const begin=(detail=true,live=false)=>{pre.cpu={};pre.frames=[];pre.events=[];pre.active=true;last=0;measurementStart=performance.now();const state=a.startMeasure(detail,live);return {state,extra:extra()};};
 const end=()=>{const endAt=performance.now(),e=extra(),base=a.stopMeasure();pre.active=false;return {...base,extra:e,ui:{frames:pre.frames,cpu:pre.cpu,events:pre.events,longTasks:pre.longTasks.filter((x:any)=>x.at>=measurementStart&&x.at<endAt),from:measurementStart,to:endAt}};};
 const checkpoint=()=>({...a.checkpoint(),extra:extra(),equipmentRenderer:(v as any).equipmentDrops.report(),gamepad:(window as any).__SC2_REPORT__().gamepad});
 const reset=async(name:string,options:any={})=>{
  a.freeze();app.starship?.close();controller=null;setDiagnosticHealthLock(w,false);w.resetRun();w.starship.account=newEquipmentAccount(529);w.selectRace(options.race??'terran');w.configureCampaign({...chooseCampaignMap(529),theme:options.theme??'char'});v.resetRun();fixture=name;
  w.difficulty=options.difficulty??'normal';if(options.gear)difficultyLoadout(w.expedition.race,options.gear,529,w.starship.account);
  if(options.native){controller=createCampaignController(w,BUILDS.find(b=>b.id==='bio')!,undefined,{advanceIntermission:false});controller.initialize();nextThink=0;}
  if(!w.start())throw Error('Fixture start refused');if(options.stage){w.stage=options.stage;w.prepareStage();}
  if(options.native){controller.configure();}
  else{const x=w as any;x.autoWaves=false;x.ambientBacklog=[];x.waves=[];x.specialPlan=[];x.eventPlan=[];x.nextWave=Infinity;x.nextExpansionAt=Infinity;w.entities.clear();w.heroes.clear();w.pods=[];w.pickups=[];w.rewardDrops=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();w.effects=[];w.visualEvents=[];w.weaponFlights=[];w.swarm.pending=[];for(const p of w.expedition.building?.groups??[])p.enabled=false;w.expedition.ledger=[];w.expedition.pendingFreeDeliveries=[];w.expedition.pendingReceipt=null;w.anchor={x:0,z:0,facing:0};for(let n=0;n<4;n++){const p=w.freePosition('marine',{x:(n-1.5)*1.5,z:-2},0,5);if(!p)throw Error('Marine placement');w.addUnit('marine','terran',p.x,p.z);}w.hash.rebuild(w.entities.values());}
  w.paused=false;v.setCameraMode('fixed');v.setCameraPitch(50);v.setCameraZoom(.9);await a.prepare();return checkpoint();
 };
 let serial=0;
 const grant=(quality:number,location:'ground'|'backpack'|'warehouse',point?:{x:number;z:number})=>{const ac=w.starship.account,slot=ATTRIBUTE_SLOTS[(serial++)%ATTRIBUTE_SLOTS.length],loc=location==='warehouse'?{kind:'warehouse' as const}:location==='ground'?{kind:'ground' as const,run:ac.run!.id,x:point?.x??w.anchor.x,z:point?.z??w.anchor.z}:{kind:'backpack' as const,run:ac.run!.id};const r=grantEquipment(ac,{template:'attribute.'+quality,race:w.expedition.race,slot},'b03:'+serial,loc);if(!r.ok)throw Error(r.error);if(location==='ground')registerEquipmentDrop(w,r.value);return r.value.id;};
 const drops=async(kind:'mineral'|'gas'|'equipment'|'mixed',count=96,full=false)=>{
  await reset('drops-'+kind);const ids=[];if(full)for(let n=0;n<64;n++)grant(1,'backpack');
  for(let n=0;n<count;n++){const angle=n*2.399963,r=4+Math.sqrt(n)*.75,raw={x:Math.sin(angle)*r,z:Math.cos(angle)*r},p=w.terrain?.canOccupy(raw,0)?raw:{x:4+n*.04,z:0};if(kind==='equipment'||kind==='mixed')ids.push(grant(n%4+1,'ground',p));if(kind!=='equipment')w.pickups.push({id:w.nextId++,...p,minerals:kind==='gas'?0:5,gas:kind==='mineral'?0:3});}
  w.changed();await a.prepare();return {ids,...checkpoint()};
 };
 const pickupProbe=(id:string)=>{const before=extra(),first=collectWorldEquipment(w,id),second=collectWorldEquipment(w,id);return {before,first,second,after:extra()};};
 const moveDrop=(id:string,point:any)=>{const loc=w.starship.account.locations[id];if(loc?.kind!=='ground')throw Error('Not ground');loc.x=point.x;loc.z=point.z;w.starship.loot.ground.delete(id);registerEquipmentDrop(w,w.starship.account.items[id]);w.changed();return checkpoint();};
 const freeBackpack=()=>{const id=itemsAt(w.starship.account,'backpack').find(i=>!w.starship.account.run?.locked.has(i.id))?.id;if(!id)throw Error('No disposable backpack item');const result=discardEquipment(w.starship.account,id);w.changed();return result;};
 const warehouse=async(count:number)=>{a.freeze();app.starship?.close();controller=null;w.resetRun();w.starship.account=newEquipmentAccount(529);w.selectRace('terran');v.resetRun();fixture='warehouse-'+count;const ac=w.starship.account;if(count>500){ac.dust=7000;while(ac.warehouseLevel<3){const r=expandWarehouse(ac,ac.warehouseLevel);if(!r.ok)throw Error(r.error);}}for(let n=0;n<count;n++)grant(n%4+1,'warehouse');hud.menuPage='title';w.changed();hud.update();return extra();};
 const setHistory=(size:number,receipts:number)=>{a.freeze();fixture=`history-${size}-${receipts}`;w.expedition.ledger=Array.from({length:size},(_,i)=>({id:100000+i,family:'marine',line:'barracks',facilityIds:[],remaining:0,state:'settled',podId:null,passengers:[{paid:{minerals:0,gas:0},status:'lost',entityId:null,purpose:'body'}]} as any));w.expedition.completedReceipts=Array.from({length:receipts},(_,i)=>'b03-history-'+i);if(w.starship.account.run)w.starship.account.run.receipts=new Set(Array.from({length:receipts},(_,i)=>'b03-history-'+i));w.changed();return extra();};
 const productionProbe=(calls=300)=>{a.freeze();const before=a.snapshot(),at=performance.now();for(let i=0;i<calls;i++)(w as any).updateProduction(0);const ms=performance.now()-at;return {calls,ms,perCallMs:ms/calls,stateExact:before===a.snapshot(),extra:extra()};};
 const naturalTo=async(target:{stage?:number;endlessSeconds?:number},maxTicks=165000)=>{
  a.freeze();if(!controller)throw Error('Native controller not initialized');let nextReport=performance.now()+5000;
  for(let n=0;n<maxTicks;n++){
   controller.decisions();
   if(w.phase==='lost')throw Error('Natural route lost at '+w.time);
   if(target.stage&&w.stage>=target.stage&&w.phase==='battle'&&!w.endless||target.endlessSeconds!==undefined&&w.endless&&w.endlessElapsed>=target.endlessSeconds)break;
   if(w.phase==='reward'){controller.intermission();if(!w.finishIntermission())throw Error('Intermission refused');}
   if(w.phase==='won'){if(!w.chooseCampaignExit('endless'))throw Error('Endless exit refused');}
   if(w.phase==='endless-ready'){const p=w.previewEndlessTransition();if(!p)throw Error('Endless plan');const token=`${p.requestId}:${p.expectedRevision}:${p.mapHash}`;if(!w.registerEndlessReadyToken(token)||!w.commitEndlessTransition(p.requestId,p.expectedRevision,token))throw Error('Endless commit');}
   const old=w.tick;w.step();if(w.tick===old&&w.phase==='battle')throw Error('Natural step stopped');
   if(n%300===299||performance.now()>nextReport){v.prepareRosterAssets();await v.waitForPendingAssets();v.render(0,1);await new Promise(r=>requestAnimationFrame(r));nextReport=performance.now()+5000;}
  }
  await a.prepare();return checkpoint();
 };
 let client:TelemetryClient|undefined,observer:GameObserver|undefined,telemetryMode='disabled-production',requests:any[]=[];
 const telemetry=async(enabled:boolean)=>{
  if(!client){const storage=new MemoryStorage();client=new TelemetryClient({storage,protocol:'http:',request:async(url:any,options:any)=>{const body=options?.body?JSON.parse(options.body):{};requests.push({path:String(url),events:body.events?.map((e:any)=>e.kind)??[]});return new Response(JSON.stringify(String(url).includes('/batch')?{accepted:body.events.map((e:any)=>e.id)}:{}),{status:200,headers:{'Content-Type':'application/json'}});}});client.config={...client.config,enabled:true,version:CONSENT_VERSION};observer=new GameObserver(w,client,()=>({build:'local',release:'local',device:'desktop',orientation:'landscape',animation:'complete',diagnostic:true}));}
  if(enabled){await client.allow();observer!.syncConsent();telemetryMode='diagnostic-enabled-local-mock';}else{await client.withdraw();observer!.syncConsent();telemetryMode='disabled-production';}return {mode:telemetryMode,active:client.active,requests};
 };
 // An enabled diagnostic observer shares the actual frame/economy code; transport is local only.
 let obsAt=performance.now();function observe(at:number){if(observer&&client?.active)observer.frame(at-obsAt,app.driver.accumulator,w.phase==='battle'&&!w.paused);obsAt=at;requestAnimationFrame(observe);}requestAnimationFrame(observe);
 const originalPads=navigator.getGamepads.bind(navigator);let neutralPad=false;Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>neutralPad?[{id:'B03 synthetic standard neutral',index:0,mapping:'standard',connected:true,timestamp:performance.now(),axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}]:originalPads()});
 const terrain=installB03Terrain(w,{reset,prepare:a.prepare});
 const currentField=()=>{const data=JSON.parse(a.snapshot());delete data.run.expedition.ledger;delete data.run.expedition.completedReceipts;if(data.account.run)delete data.account.run.receipts;return JSON.stringify(data).replaceAll(w.runId!,'<run-id>');};
 (window as any).__B03__={...a,begin,end,checkpoint,extra,reset,drops,warehouse,setHistory,productionProbe,naturalTo,grant,moveDrop,pickupProbe,freeBackpack,currentField,terrainRoutes:terrain.routes,terrainDynamic:terrain.dynamic,collect:()=>{collectNearbyEquipment(w);return extra();},setTheme:(value:string)=>theme=value,telemetry,telemetryPulse:async()=>{observer?.pulse();await client?.persist();await client?.flush();return {extra:extra(),requests};},neutralPad:(enabled:boolean)=>{neutralPad=enabled;return (window as any).__SC2_REPORT__().gamepad;},loading:()=>({loads:pre.loads,longTasks:pre.longTasks,visibility:pre.visibility,resources:performance.getEntriesByType('resource').map((r:any)=>({name:r.name,start:r.startTime,ms:r.duration,transfer:r.transferSize,encoded:r.encodedBodySize,decoded:r.decodedBodySize}))})};
 pre.ready=performance.now();
}
