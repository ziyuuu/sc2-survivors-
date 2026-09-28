import {configurePlatformAssetUrl} from './manifest';
export interface HttpAssetManifest {version:1;release:string;assets:Record<string,{url:string;bytes:number;sha256:string;mime:string}>}
type Progress=(done:number,total:number,label:string)=>void;
export class HttpAssetStore {
 readonly urls:Record<string,string>={};
 private shared=new Map<string,Promise<string>>();
 constructor(readonly manifest:HttpAssetManifest,readonly base:string,private request:typeof fetch=(input,init)=>fetch(input,init)){
  if(manifest.version!==1||!manifest.release||!manifest.assets)throw Error('Web资源清单无效');
  for(const a of Object.values(manifest.assets))if(!/^assets\/[a-f0-9]{64}\.[a-z0-9]+$/.test(a.url)||!Number.isSafeInteger(a.bytes)||a.bytes<0||!/^[a-f0-9]{64}$/.test(a.sha256))throw Error('Web资源记录无效');
 }
 private async verified(id:string){
  const asset=this.manifest.assets[id];if(!asset)throw Error('发行资源清单缺失：'+id);
  let job=this.shared.get(asset.sha256);
  if(!job){job=(async()=>{
   for(let attempt=0;attempt<2;attempt++){
    const response=await this.request(new URL(asset.url,this.base),{cache:attempt?'reload':'default',credentials:'omit'});
    if(!response.ok)throw Error(`${id} 下载失败 (${response.status})`);
    const bytes=await response.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(bytes.byteLength===asset.bytes&&hash===asset.sha256)return URL.createObjectURL(new Blob([bytes],{type:asset.mime}));
   }
   throw Error(id+' 文件校验失败，请重试');
  })();this.shared.set(asset.sha256,job);job.catch(()=>this.shared.delete(asset.sha256));}
  this.urls[id]=await job;
 }
 async prepare(ids:Iterable<string>,progress:Progress=()=>{}){
  const pending=[...new Set(ids)].filter(id=>!this.urls[id]);for(const id of pending)if(!this.manifest.assets[id])throw Error('发行资源缺失：'+id);
  let cursor=0,done=0;progress(0,pending.length,'下载所需资源');
  const jobs=Array.from({length:Math.min(4,pending.length)},async()=>{while(cursor<pending.length){const id=pending[cursor++];await this.verified(id);progress(++done,pending.length,'下载所需资源');}});
  const results=await Promise.allSettled(jobs),failure=results.find(r=>r.status==='rejected');if(failure?.status==='rejected')throw failure.reason;
 }
}
let store:HttpAssetStore|null=null;
export async function prepareHttpAssetIds(ids:Iterable<string>,progress:Progress){await store?.prepare(ids,progress);}
export function httpAssetStatus(){return store?{prepared:Object.keys(store.urls).length,total:Object.keys(store.manifest.assets).length,release:store.manifest.release}:null;}
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
  store??=new HttpAssetStore(manifest,base.href);configurePlatformAssetUrl(id=>store!.urls[id]??null);
  const ids=['map.kairos','terrain.char',...Object.keys(store.manifest.assets).filter(id=>/^(unit|hero|building|tech|ui|skill)\./.test(id))];
  await store.prepare(ids,(done,total)=>{const p=root.querySelector('progress');if(p){p.max=Math.max(1,total);p.value=done;}const label=root.querySelector('[role="status"]');if(label)label.textContent=`准备菜单 ${done} / ${total}`;});
 };
 for(;;){root.innerHTML='<section class="pack-loading"><b>SC2 SURVIVORS</b><p role="status">正在准备菜单</p><progress></progress></section>';
  try{await prepare();return;}catch(error){const message=document.createElement('p');message.textContent=String((error as Error).message);root.querySelector('section')!.append(message);const button=document.createElement('button');button.textContent='重试';root.querySelector('section')!.append(button);await new Promise<void>(resolve=>button.addEventListener('click',()=>resolve(),{once:true}));}
 }
}
