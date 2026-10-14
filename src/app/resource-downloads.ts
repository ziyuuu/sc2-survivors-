import {httpStore,type HttpAssetStore} from '../assets/http-store';
import {ASSETS} from '../assets/manifest';
import {racePreloadModels} from './race-preload';
import {RESCUE_PRESENTATION} from '../data/economy';
import type {Race} from '../data/races';
import {displayAssetModelKey} from '../render/materials/elite-visual';

/** Shared maps, enemies, materials, audio and effects accompany the chosen roster. */
export function raceDownloadIds(race:Race,ids:string[]){
 const rescue=RESCUE_PRESENTATION[race],models=[...racePreloadModels(race).keys()].map(displayAssetModelKey);
 models.push(rescue.workerModel,rescue.carrierModel,rescue.carrierDeathModel,...(rescue.carrierBirthModel?[rescue.carrierBirthModel]:[]));
 return ids.filter(id=>!id.startsWith('model.')||/^model\.(fort\.|hive(?:\.|$)|drone(?:\.|$)|egg(?:\.|$)|loot\.|projectile\.|support\.)/.test(id)||models.some(key=>id==='model.'+key||id.startsWith('model.'+key+'.'))||['map-data','map-model'].includes(ASSETS.get(id)?.kind??''));
}
export type DownloadScope='race'|'all';
export type DownloadPhase='idle'|'running'|'stopping'|'stopped'|'complete'|'error'|'clearing';
export type DownloadState={phase:DownloadPhase;done:number;total:number;message:string;scope:DownloadScope|null;race:Race|null;availableBytes:number|null};
type Store=Pick<HttpAssetStore,'manifest'|'prefetch'|'cache'>;

/** Owned by the HUD, never by a settings tab's DOM. Only verified disk files persist. */
export class ResourceDownloads{
 readonly state:DownloadState={phase:'idle',done:0,total:0,message:'只补齐缺失或校验失败的文件。',scope:null,race:null,availableBytes:null};
 onChange=()=>{};
 holdOptional:()=>Promise<()=>void>=async()=>()=>{};
 private stopRequested=false;
 private allowed=false;
 private totals=new Map<string,{files:number;bytes:number}>();
 constructor(private getStore:()=>Store|null=httpStore){}
 get available(){return !!this.getStore();}
 get busy(){return ['running','stopping','clearing'].includes(this.state.phase);}
 get canStart(){return this.allowed&&!this.busy&&this.available;}
 setAllowed(allowed:boolean){this.allowed=allowed;if(!allowed)this.stop();}
 size(scope:DownloadScope,race:Race){
  const store=this.getStore();if(!store)return {files:0,bytes:0};const key=[store.manifest.release,scope,race].join(':');let result=this.totals.get(key);
  if(!result){const ids=this.ids(store,scope,race),rows=new Map(ids.map(id=>[store.manifest.assets[id].sha256,store.manifest.assets[id]]));result={files:rows.size,bytes:[...rows.values()].reduce((n,a)=>n+a.bytes,0)};this.totals.set(key,result);}return result;
 }
 private ids(store:Store,scope:DownloadScope,race:Race){const ids=Object.keys(store.manifest.assets);return scope==='all'?ids:raceDownloadIds(race,ids);}
 stop(){if(this.state.phase!=='running')return;this.stopRequested=true;this.state.phase='stopping';this.state.message='完成正在下载的文件后停止';this.onChange();}
 async start(scope:DownloadScope,race:Race){
  const store=this.getStore();if(!store||!this.canStart)return;
  this.stopRequested=false;Object.assign(this.state,{phase:'running',scope,race,done:0,total:this.size(scope,race).bytes,message:'正在检查本地缓存',availableBytes:null});this.onChange();
  let release=()=>{};
  try{
   release=await this.holdOptional();
   if(!this.stopRequested){
    await store.cache.persist();
    const estimate=typeof navigator==='undefined'?null:await navigator.storage?.estimate?.().catch(()=>null);
    if(estimate?.quota!==undefined&&estimate.usage!==undefined)this.state.availableBytes=Math.max(0,estimate.quota-estimate.usage);
    await store.prefetch(this.ids(store,scope,race),(done,total)=>{this.state.done=done;this.state.total=total;if(!this.stopRequested)this.state.message='正在保存已校验的资源';this.onChange();},()=>this.stopRequested);
   }
   this.state.phase=this.stopRequested?'stopped':'complete';this.state.message=this.stopRequested?'已停止，已完成文件保留；再次下载将检查并补齐。':'预下载完成，下次进入时自动复用缓存。';
  }catch(error){this.state.phase='error';this.state.message=String((error as Error).message)+'；再次下载可重试缺失文件。';}
  finally{release();this.onChange();}
 }
 async clear(){
  const store=this.getStore();if(!store||!this.canStart)return;
  this.state.phase='clearing';this.state.message='正在清理资源缓存';this.onChange();let release=()=>{};
  try{release=await this.holdOptional();await store.cache.clear();Object.assign(this.state,{phase:'idle',done:0,total:0,scope:null,race:null,message:'资源缓存已清理；存档、天赋和设置保留。'});}
  catch{this.state.phase='error';this.state.message='浏览器未允许清理资源缓存，请稍后重试。';}
  finally{release();this.onChange();}
 }
}
