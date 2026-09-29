import {configurePlatformAssetUrl} from './manifest';
import {ResourceCache} from './persistent-cache';
export interface HttpAssetManifest {version:1;release:string;assets:Record<string,{url:string;bytes:number;sha256:string;mime:string}>}
type Progress=(done:number,total:number,label:string)=>void;
export class HttpAssetStore {
 readonly urls:Record<string,string>={};
 private shared=new Map<string,Promise<string>>();
 private prefetching=new Map<string,Promise<void>>();
 readonly cache=new ResourceCache();
 readonly metrics={downloadBytes:0,cachedBytes:0,files:0};
 constructor(readonly manifest:HttpAssetManifest,readonly base:string,private request:typeof fetch=(input,init)=>fetch(input,init)){
  if(manifest.version!==1||!manifest.release||!manifest.assets)throw Error('Web资源清单无效');
  for(const a of Object.values(manifest.assets))if(!/^assets\/[a-f0-9]{64}\.[a-z0-9]+$/.test(a.url)||!Number.isSafeInteger(a.bytes)||a.bytes<0||!/^[a-f0-9]{64}$/.test(a.sha256))throw Error('Web资源记录无效');
 }
 private async verified(id:string){
  const asset=this.manifest.assets[id];if(!asset)throw Error('发行资源清单缺失：'+id);
  let job=this.shared.get(asset.sha256);
  if(!job){job=(async()=>{
   await this.prefetching.get(asset.sha256);
   const valid=async(bytes:ArrayBuffer)=>bytes.byteLength===asset.bytes&&[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('')===asset.sha256;
   const cached=await this.cache.get(asset.sha256);
   if(cached&&await valid(cached)){this.metrics.cachedBytes+=cached.byteLength;this.metrics.files++;return URL.createObjectURL(new Blob([cached],{type:asset.mime}));}
   if(cached)await this.cache.remove(asset.sha256);
   for(let attempt=0;attempt<2;attempt++){
    const response=await this.request(new URL(asset.url,this.base),{cache:attempt?'reload':'default',credentials:'omit'});
    if(!response.ok)throw Error(`${id} 下载失败 (${response.status})`);
    const bytes=await response.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(bytes.byteLength===asset.bytes&&hash===asset.sha256){this.metrics.downloadBytes+=bytes.byteLength;this.metrics.files++;await this.cache.put(asset.sha256,bytes,asset.mime,this.manifest.release);return URL.createObjectURL(new Blob([bytes],{type:asset.mime}));}
   }
   throw Error(id+' 文件校验失败，请重试');
  })();this.shared.set(asset.sha256,job);job.catch(()=>this.shared.delete(asset.sha256));}
  this.urls[id]=await job;
 }
 async prepare(ids:Iterable<string>,progress:Progress=()=>{}){
  const pending=[...new Set(ids)].filter(id=>!this.urls[id]);for(const id of pending)if(!this.manifest.assets[id])throw Error('发行资源缺失：'+id);
  let cursor=0,done=0;const before=this.metrics.downloadBytes;progress(0,pending.length,'检查本地资源');
  const jobs=Array.from({length:Math.min(4,pending.length)},async()=>{while(cursor<pending.length){const id=pending[cursor++];await this.verified(id);progress(++done,pending.length,this.metrics.downloadBytes>before?'下载资源':'准备画面');}});
  const results=await Promise.allSettled(jobs),failure=results.find(r=>r.status==='rejected');if(failure?.status==='rejected')throw failure.reason;
 }
 async prefetch(ids:Iterable<string>,progress:(bytes:number,total:number)=>void,cancelled:()=>boolean){
  const rows=[...new Map([...ids].map(id=>{const a=this.manifest.assets[id];if(!a)throw Error('资源清单缺失：'+id);return [a.sha256,a] as const;})).values()];
  const hashes=rows.map(a=>a.sha256).sort(),taskId=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(hashes.join(':'))))].map(v=>v.toString(16).padStart(2,'0')).join('');
  const total=rows.reduce((n,a)=>n+a.bytes,0);let cursor=0,done=0;progress(0,total);await this.cache.task(taskId,this.manifest.release,hashes,'running',0);
  const jobs=Array.from({length:Math.min(3,rows.length)},async()=>{while(!cancelled()&&cursor<rows.length){const a=rows[cursor++];let job=this.prefetching.get(a.sha256);if(!job){const live=this.shared.get(a.sha256);job=(async()=>{if(live)await live;const cached=await this.cache.get(a.sha256);const valid=async(b:ArrayBuffer)=>b.byteLength===a.bytes&&[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('')===a.sha256;if(cached&&await valid(cached))return;
    const r=await this.request(new URL(a.url,this.base),{cache:cached?'reload':'default',credentials:'omit'});if(!r.ok)throw Error('下载失败：'+r.status);const b=await r.arrayBuffer();if(!await valid(b))throw Error('资源校验失败');this.metrics.downloadBytes+=b.byteLength;if(!await this.cache.put(a.sha256,b,a.mime,this.manifest.release))throw Error(this.cache.warning!);
   })();this.prefetching.set(a.sha256,job);}try{await job;done+=a.bytes;progress(done,total);}finally{this.prefetching.delete(a.sha256);}}});
  const result=await Promise.allSettled(jobs),failure=result.find(r=>r.status==='rejected');await this.cache.task(taskId,this.manifest.release,hashes,failure?'failed':cancelled()?'stopped':'complete',done);if(failure?.status==='rejected')throw failure.reason;
 }
}
let store:HttpAssetStore|null=null;
export async function prepareHttpAssetIds(ids:Iterable<string>,progress:Progress){await store?.prepare(ids,progress);}
export function httpAssetStatus(){return store?{prepared:Object.keys(store.urls).length,total:Object.keys(store.manifest.assets).length,release:store.manifest.release,...store.metrics,warning:store.cache.warning}:null;}
export function httpStore(){return store;}
export async function loadHttpAssets(){
 const meta=document.querySelector<HTMLMetaElement>('meta[name="sc2-asset-manifest"]');if(!meta)return;
 const root=document.getElementById('interface')!,manifestURL=new URL(meta.content,location.href);
 const prepare=async()=>{
  const manifestResponse=await fetch(manifestURL,{cache:'no-cache'});if(!manifestResponse.ok)throw Error('资源清单读取失败');
  const manifest=await manifestResponse.json() as HttpAssetManifest;
  const configResponse=await fetch(new URL('runtime-config.json',location.href),{cache:'no-store'});if(!configResponse.ok)throw Error('资源地址配置读取失败');
  const config=await configResponse.json() as {assetBaseUrl?:string};const base=new URL(config.assetBaseUrl||'./',location.href);if(!['https:','http:'].includes(base.protocol))throw Error('资源地址必须是HTTP或HTTPS');if(!base.pathname.endsWith('/'))base.pathname+='/';
  if(store&&store.base!==base.href){
   // A corrected deployment address must take effect on Retry, while the page
   // continues using its original release rather than mixing update manifests.
   const pinned=store.manifest;for(const url of new Set(Object.values(store.urls)))URL.revokeObjectURL(url);store=new HttpAssetStore(pinned,base.href);
  }
  store??=new HttpAssetStore(manifest,base.href);void store.cache.persist();configurePlatformAssetUrl(id=>store!.urls[id]??null);
  const ids=['map.kairos','terrain.char',...Object.keys(store.manifest.assets).filter(id=>/^(unit|hero|building|tech|ui|skill)\./.test(id))];
  await store.prepare(ids,(done,total)=>{const p=root.querySelector('progress');if(p){p.max=Math.max(1,total);p.value=done;}const label=root.querySelector('[role="status"]');if(label)label.textContent=`准备菜单 ${done} / ${total}`;});
 };
 for(;;){root.innerHTML='<section class="pack-loading"><b>SC2 SURVIVORS</b><p role="status">正在准备菜单</p><progress></progress></section>';
  try{await prepare();return;}catch(error){const message=document.createElement('p');message.textContent=String((error as Error).message);root.querySelector('section')!.append(message);const button=document.createElement('button');button.textContent='重试';root.querySelector('section')!.append(button);await new Promise<void>(resolve=>button.addEventListener('click',()=>resolve(),{once:true}));}
 }
}
