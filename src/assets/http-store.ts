import {graphicsPreferences,optimizedGraphics,runtimeBudget,type GraphicsTier} from '../platform/graphics-profile';
import {configurePlatformAssetUrl} from './manifest';
import {initialMenuAssetIds} from './menu-assets';
import {ResourceCache} from './persistent-cache';
import {fetchAsset,ASSET_REQUEST_TIMEOUT,retryAssetPreparation} from './preparation-wait';
import {openingProgress,finishOpening} from '../ui/presentation/opening';
export interface HttpAssetRecord {url:string;bytes:number;sha256:string;mime:string;width?:number;height?:number;bundle?:string;imageSources?:({hash:string;mime:string;family:string}|null)[]}
export interface HttpAssetManifest {version:1;release:string;assets:Record<string,HttpAssetRecord&{variants?:Partial<Record<GraphicsTier,HttpAssetRecord>>}>;gpuTextures?:Record<string,HttpAssetRecord>}
type Progress=(done:number,total:number,label:string)=>void;
export class HttpAssetStore {
 activeTier:GraphicsTier=optimizedGraphics()?graphicsPreferences().texture:'high';
 readonly variantUrls=new Map<string,string>();
 record(id:string,tier:GraphicsTier=this.activeTier){const row=this.manifest.assets[id];return row?.variants?.[tier]??row;}
 idForUrl(url:string){return Object.keys(this.urls).find(id=>this.urls[id]===url)??[...this.variantUrls].find(([,u])=>u===url)?.[0].split('@')[0];}
 async urlForTier(id:string,tier:GraphicsTier){await this.verified(id,tier);return this.variantUrls.get(id+'@'+tier)!;}
 commitTier(tier:GraphicsTier){this.activeTier=tier;for(const id of Object.keys(this.urls)){const url=this.variantUrls.get(id+'@'+tier);if(url)this.urls[id]=url;else delete this.urls[id];}}
 releaseOldVariants(){const live=new Set(Object.values(this.urls));for(const [key,url]of this.variantUrls){if(live.has(url))continue;URL.revokeObjectURL(url);this.variantUrls.delete(key);for(const [hash,job]of this.shared)void job.then(value=>{if(value===url&&this.shared.get(hash)===job)this.shared.delete(hash);});}}
 readonly urls:Record<string,string>={};
 private shared=new Map<string,Promise<string>>();
 private prefetching=new Map<string,Promise<boolean>>();
 readonly cache=new ResourceCache();
 gpuTexturesEnabled=false;
 private modelEvictedBytes=0;
 /** Only call after the required/optional preparation lanes have drained.
  * Parsed geometry/images are owned by renderers; encoded model copies remain
  * in the existing disk cache and are reverified on the next prepare(). */
 trimModelCache(maxBytes:number){
  const rows=new Map<string,number>(),protectedUrls=new Set<string>();
  for(const [key,url]of this.variantUrls){const [id,tier]=key.split('@'),record=this.record(id,tier as GraphicsTier);if(record?.mime==='model/gltf-binary')rows.set(url,record.bytes);else protectedUrls.add(url);}
  let bytes=[...rows.values()].reduce((n,b)=>n+b,0),released=0;
  for(const [url,size]of rows){if(bytes<=maxBytes)break;if(protectedUrls.has(url))continue;
   for(const [id,value]of Object.entries(this.urls))if(value===url)delete this.urls[id];
   for(const [key,value]of this.variantUrls)if(value===url){const [id,tier]=key.split('@'),record=this.record(id,tier as GraphicsTier);if(record)this.shared.delete(record.sha256);this.variantUrls.delete(key);}
   URL.revokeObjectURL(url);bytes-=size;released+=size;
  }
  this.modelEvictedBytes+=released;return {releasedBytes:released,residentModelBytes:bytes};
 }
 memoryReport(){const urls=new Map<string,number>();for(const [key,url]of this.variantUrls){const [id,tier]=key.split('@');urls.set(url,this.record(id,tier as GraphicsTier)?.bytes??0);}return {residentBlobBytes:[...urls.values()].reduce((n,b)=>n+b,0),residentBlobCount:urls.size,modelEvictedBytes:this.modelEvictedBytes};}
 readonly metrics={downloadBytes:0,cachedBytes:0,files:0,cacheHits:0,cacheMisses:0};
 constructor(readonly manifest:HttpAssetManifest,readonly base:string,private request:typeof fetch=(input,init)=>fetch(input,init),private requestTimeout=ASSET_REQUEST_TIMEOUT){
  if(manifest.version!==1||!manifest.release||!manifest.assets)throw Error('Web资源清单无效');
  for(const a of [...Object.values(manifest.assets).flatMap(a=>[a,...Object.values(a.variants??{})]),...Object.values(manifest.gpuTextures??{})])if(!/^assets\/[a-f0-9]{64}\.[a-z0-9]+$/.test(a.url)||!Number.isSafeInteger(a.bytes)||a.bytes<0||!/^[a-f0-9]{64}$/.test(a.sha256))throw Error('Web资源记录无效');
 }
 /** GPU sidecars are immutable derivatives, never replacements for fallback
  * source records. No Blob URL remains resident after worker transfer. */
 async gpuTextureBytes(imageHash:string){
  const row=this.manifest.gpuTextures?.[imageHash];if(!row)throw Error('GPU贴图记录缺失');
  const valid=async(b:ArrayBuffer)=>b.byteLength===row.bytes&&[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('')===row.sha256;
  const cached=await this.cache.get(row.sha256);if(cached&&await valid(cached)){this.metrics.cacheHits++;this.metrics.cachedBytes+=cached.byteLength;return cached;}
  if(cached)await this.cache.remove(row.sha256);this.metrics.cacheMisses++;
  for(let attempt=0;attempt<2;attempt++){
   const bytes=await fetchAsset(this.request,this.resourceURL(row.url),{cache:attempt?'reload':'default',credentials:'omit'},async r=>{if(!r.ok)throw Error('GPU贴图下载失败');return r.arrayBuffer();},this.requestTimeout);
   if(!await valid(bytes))continue;this.metrics.downloadBytes+=bytes.byteLength;await this.cache.put(row.sha256,bytes,row.mime,this.manifest.release);return bytes;
  }
  throw Error('GPU贴图校验失败');
 }
 private resourceURL(path:string){const url=new URL(path,this.base),index=(globalThis as typeof globalThis&{__SC2_PACK_INDEX_FILE__?:string}).__SC2_PACK_INDEX_FILE__;if(optimizedGraphics()&&index)url.searchParams.set('sc2-index',index);return url;}
 private async verified(id:string,tier:GraphicsTier=this.activeTier){
  const asset=this.record(id,tier);if(!asset)throw Error('发行资源清单缺失：'+id);
  let job=this.shared.get(asset.sha256);
  if(!job){job=(async()=>{
   // Optional disk caching may fail (for example quota); required play can still load.
   await this.prefetching.get(asset.sha256)?.catch(()=>{});
   const valid=async(bytes:ArrayBuffer)=>bytes.byteLength===asset.bytes&&[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('')===asset.sha256;
   const cached=await this.cache.get(asset.sha256);
   if(cached&&await valid(cached)){this.metrics.cacheHits++;this.metrics.cachedBytes+=cached.byteLength;this.metrics.files++;return URL.createObjectURL(new Blob([cached],{type:asset.mime}));}
   this.metrics.cacheMisses++;if(cached)await this.cache.remove(asset.sha256);
   for(let attempt=0;attempt<2;attempt++){
    const bytes=await fetchAsset(this.request,this.resourceURL(asset.url),{cache:attempt?'reload':'default',credentials:'omit'},async response=>{if(!response.ok)throw Error(`${id} 下载失败 (${response.status})`);return response.arrayBuffer();},this.requestTimeout);
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(bytes.byteLength===asset.bytes&&hash===asset.sha256){this.metrics.downloadBytes+=bytes.byteLength;this.metrics.files++;await this.cache.put(asset.sha256,bytes,asset.mime,this.manifest.release);return URL.createObjectURL(new Blob([bytes],{type:asset.mime}));}
   }
   throw Error(id+' 文件校验失败，请重试');
  })();this.shared.set(asset.sha256,job);job.catch(()=>this.shared.delete(asset.sha256));}
  const url=await job;this.variantUrls.set(id+'@'+tier,url);if(tier===this.activeTier)this.urls[id]=url;
 }
 async prepare(ids:Iterable<string>,progress:Progress=()=>{}){
  const pending=[...new Set(ids)].filter(id=>!this.urls[id]).sort((a,b)=>(this.record(a)?.bundle??'').localeCompare(this.record(b)?.bundle??''));for(const id of pending)if(!this.manifest.assets[id])throw Error('发行资源缺失：'+id);
  let cursor=0,done=0,failed=false;const before=this.metrics.downloadBytes;progress(0,pending.length,'检查本地资源');
  const jobs=Array.from({length:Math.min(runtimeBudget().network,pending.length)},async()=>{try{while(!failed&&cursor<pending.length){const id=pending[cursor++];await this.verified(id);progress(++done,pending.length,this.metrics.downloadBytes>before?'下载资源':'准备画面');}}catch(error){failed=true;throw error;}});
  const results=await Promise.allSettled(jobs),failure=results.find(r=>r.status==='rejected');if(failure?.status==='rejected')throw failure.reason;
 }
 async prefetch(ids:Iterable<string>,progress:(bytes:number,total:number)=>void,cancelled:()=>boolean){
  const rows=[...new Map([...ids].flatMap(id=>{const a=this.record(id);if(!a)throw Error('资源清单缺失：'+id);const gpu=this.gpuTexturesEnabled?(a.imageSources??[]).flatMap(i=>i&&this.manifest.gpuTextures?.[i.hash]?[this.manifest.gpuTextures[i.hash]]:[]):[];return [a,...gpu].map(row=>[row.sha256,row] as const);})).values()];
  const hashes=rows.map(a=>a.sha256).sort(),taskId=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(hashes.join(':'))))].map(v=>v.toString(16).padStart(2,'0')).join('');
  const total=rows.reduce((n,a)=>n+a.bytes,0);let cursor=0,done=0,failed=false;progress(0,total);await this.cache.task(taskId,this.manifest.release,hashes,'running',0);
  const jobs=Array.from({length:Math.min(Math.min(3,runtimeBudget().network),rows.length)},async()=>{while(!failed&&!cancelled()&&cursor<rows.length){const a=rows[cursor++];let job=this.prefetching.get(a.sha256);if(!job){const live=this.shared.get(a.sha256);job=(async()=>{if(live)await live;const cached=await this.cache.get(a.sha256);const valid=async(b:ArrayBuffer)=>b.byteLength===a.bytes&&[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('')===a.sha256;if(cached&&await valid(cached))return true;if(cancelled())return false;
    const b=await fetchAsset(this.request,this.resourceURL(a.url),{cache:cached?'reload':'default',credentials:'omit'},async r=>{if(!r.ok)throw Error('下载失败：'+r.status);return r.arrayBuffer();},this.requestTimeout);if(!await valid(b))throw Error('资源校验失败');this.metrics.downloadBytes+=b.byteLength;if(!await this.cache.put(a.sha256,b,a.mime,this.manifest.release))throw Error(this.cache.warning??'浏览器未能保存资源缓存');return true;
   })();this.prefetching.set(a.sha256,job);}try{if(!await job)return;done+=a.bytes;progress(done,total);}catch(error){failed=true;throw error;}finally{this.prefetching.delete(a.sha256);}}});
  const result=await Promise.allSettled(jobs),failure=result.find(r=>r.status==='rejected');await this.cache.task(taskId,this.manifest.release,hashes,failure?'failed':cancelled()?'stopped':'complete',done);if(failure?.status==='rejected')throw failure.reason;
 }
}
let store:HttpAssetStore|null=null;
export async function prepareHttpAssetIds(ids:Iterable<string>,progress:Progress){await store?.prepare(ids,progress);}
export function httpAssetStatus(){return store?{prepared:Object.keys(store.urls).length,total:Object.keys(store.manifest.assets).length,release:store.manifest.release,...store.metrics,memory:store.memoryReport(),warning:store.cache.warning}:null;}
export function httpStore(){return store;}
export async function loadHttpAssets(){
 const meta=document.querySelector<HTMLMetaElement>('meta[name="sc2-asset-manifest"]');if(!meta)return;
 const root=document.getElementById('interface')!,manifestURL=new URL(meta.content,location.href);
 const prepare=async()=>{
  const manifest=await fetchAsset(fetch,manifestURL,{cache:'no-cache'},async r=>{if(!r.ok)throw Error('资源清单读取失败');return r.json() as Promise<HttpAssetManifest>;});
  const config=await fetchAsset(fetch,new URL('runtime-config.json',location.href),{cache:'no-store'},async r=>{if(!r.ok)throw Error('资源地址配置读取失败');return r.json() as Promise<{assetBaseUrl?:string}>;});const base=new URL(config.assetBaseUrl||'./',location.href);if(!['https:','http:'].includes(base.protocol))throw Error('资源地址必须是HTTP或HTTPS');if(!base.pathname.endsWith('/'))base.pathname+='/';
  if(store&&store.base!==base.href){
   // A corrected deployment address must take effect on Retry, while the page
   // continues using its original release rather than mixing update manifests.
   const pinned=store.manifest;for(const url of new Set(Object.values(store.urls)))URL.revokeObjectURL(url);store=new HttpAssetStore(pinned,base.href);
  }
  store??=new HttpAssetStore(manifest,base.href);void store.cache.persist();configurePlatformAssetUrl(id=>store!.urls[id]??null);
  const ids=initialMenuAssetIds(Object.keys(store.manifest.assets));
  await store.prepare(ids,(done,total)=>{const p=root.querySelector('progress');if(p){p.max=Math.max(1,total);p.value=done;}const label=root.querySelector('[role="status"]');if(label)label.textContent=`准备菜单 ${done} / ${total}`;const ready=ids.filter(id=>store!.urls[id]).length;openingProgress(ids.length?ready/ids.length*25:25,'loading');});
 };
 for(;;){root.innerHTML='<section class="pack-loading"><b>SC2 SURVIVORS</b><p role="status">正在准备菜单</p><progress></progress></section>';
  try{await retryAssetPreparation(prepare,attempt=>openingProgress(null,'loading',`正在重新连接 · ${attempt}/3`));return;}catch(error){
   // The recovery UI already exists beneath the opening cover. Make it reachable.
   const label=root.querySelector('[role="status"]');if(label)label.textContent='菜单资源加载失败';root.querySelector('progress')?.remove();
   const button=document.createElement('button');button.textContent='重试';root.querySelector('section')!.append(button);finishOpening();
   console.warn('Menu resource preparation failed',error);
   await new Promise<void>(resolve=>button.addEventListener('click',()=>resolve(),{once:true}));
  }
 }
}
