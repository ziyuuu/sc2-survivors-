import {loadHttpAssets,prepareHttpAssetIds,httpAssetStatus} from './http-store';
import {initialMenuAssetIds} from './menu-assets';
import {decode85} from './base85.mjs';
import {gunzipSync} from 'three/addons/libs/fflate.module.js';
export type AssetPack={version:number;container?:'chunks-v1';chunks:{encoding:'raw'|'gzip';bytes:number;storedBytes?:number;data:string}[];assets:Record<string,{mime:string;bytes:number;sha256:string;parts:number[]}>};
type Progress=(done:number,total:number,label:string)=>void;
async function verifyAssetBlob(id:string,blob:Blob,expected:string){
 if(!/^[a-f0-9]{64}$/.test(expected))throw Error('资源内容校验字段无效: '+id);
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==expected)throw Error('资源内容校验失败: '+id);
}
const yieldPreparation=()=>{
 const scheduler=(globalThis as typeof globalThis&{scheduler?:{yield?:()=>Promise<void>}}).scheduler;
 return typeof scheduler?.yield==='function'?scheduler.yield():new Promise<void>(resolve=>setTimeout(resolve,0));
};

/** A single HTML can exceed V8's individual string limit. Parse bounded original chunks separately. */
export function restoreEmbeddedContainerChunks(pack:AssetPack,parts:Iterable<{index:number;payload:string}>){
 if(pack.version!==2||pack.container!=='chunks-v1')throw Error('无效的分段资源容器');
 const seen=new Set<number>();
 for(const {index,payload}of parts){
  if(!Number.isInteger(index)||index<0||index>=pack.chunks.length||seen.has(index))throw Error('资源容器分片编号无效');
  const expected=pack.chunks[index],chunk=JSON.parse(payload) as AssetPack['chunks'][number];
  if(!chunk||typeof chunk.data!=='string'||chunk.encoding!==expected.encoding||chunk.bytes!==expected.bytes||chunk.storedBytes!==expected.storedBytes)throw Error('资源容器分片元数据不匹配');
  pack.chunks[index]=chunk;seen.add(index);
 }
 if(seen.size!==pack.chunks.length)throw Error('资源容器分片缺失');
}
/** Parse the existing scripts one at a time so the progress indicator can paint. */
export async function restoreEmbeddedContainerChunksAsync(pack:AssetPack,parts:Iterable<{index:number;payload:string}>,progress:Progress=()=>{}){
 if(pack.version!==2||pack.container!=='chunks-v1')throw Error('无效的分段资源容器');
 const seen=new Set<number>();let lastYield=performance.now();
 for(const {index,payload}of parts){
  if(!Number.isInteger(index)||index<0||index>=pack.chunks.length||seen.has(index))throw Error('资源容器分片编号无效');
  const expected=pack.chunks[index],chunk=JSON.parse(payload) as AssetPack['chunks'][number];
  if(!chunk||typeof chunk.data!=='string'||chunk.encoding!==expected.encoding||chunk.bytes!==expected.bytes||chunk.storedBytes!==expected.storedBytes)throw Error('资源容器分片元数据不匹配');
  pack.chunks[index]=chunk;seen.add(index);
  if(performance.now()-lastYield>=8){progress(seen.size,pack.chunks.length,'读取内置资源');await yieldPreparation();lastYield=performance.now();}
 }
 if(seen.size!==pack.chunks.length)throw Error('资源容器分片缺失');
 progress(seen.size,pack.chunks.length,'读取内置资源');
}

/** Decode only the assets needed by the next screen or battle transition. */
export class EmbeddedAssetStore {
 readonly urls:Record<string,string>={};
 private queue:Promise<unknown>=Promise.resolve();
 private remainingUses:number[];
 private encodedChunks:(string|null)[];
 constructor(private pack:AssetPack){
  if(pack.version!==2)throw Error('不支持的按需资源包版本');
  // Retain the already parsed encoded strings without allocating encoded Blobs.
  // Chrome's Blob storage also holds the decoded assets; the two copies together
  // exhausted that storage budget before a battle could become ready.
  this.encodedChunks=pack.chunks.map(chunk=>{const data=chunk.data;chunk.data='';return data;});
  this.remainingUses=Array(pack.chunks.length).fill(0);
  for(const [id,asset] of Object.entries(pack.assets))for(const index of new Set(asset.parts)){
   if(!pack.chunks[index])throw Error('资源分片缺失: '+id);
   this.remainingUses[index]++;
  }
 }
 get preparedCount(){return Object.keys(this.urls).length;}
 get totalCount(){return Object.keys(this.pack.assets).length;}
 prepare(ids:Iterable<string>,progress:Progress=()=>{}):Promise<void>{
  const wanted=[...new Set(ids)];
  const pending=this.queue.then(()=>this.prepareNow(wanted,progress));
  this.queue=pending.catch(()=>{});
  return pending;
 }
 private async prepareNow(ids:string[],progress:Progress){
  const needed=ids.filter(id=>!this.urls[id]);
  for(const id of needed)if(!this.pack.assets[id])throw Error('发行资源清单缺失: '+id);
  const indices=[...new Set(needed.flatMap(id=>this.pack.assets[id].parts))];
  const chunks=new Map<number,Blob>();let done=0,lastYield=performance.now();
  progress(0,indices.length+needed.length,'解包所需资源');
  for(const index of indices){
   const data=this.encodedChunks[index];if(data===null)throw Error('资源分片不可用: '+index);
   const part=this.pack.chunks[index];
   const stored=decode85(data,part.storedBytes!);
   if(part.encoding!=='gzip'&&part.encoding!=='raw')throw Error('无效的资源压缩格式');
   const bytes=part.encoding==='gzip'?gunzipSync(stored):stored;
   if(bytes.length!==part.bytes)throw Error('资源包字节校验失败');
   chunks.set(index,new Blob([bytes as Uint8Array<ArrayBuffer>]));
   progress(++done,indices.length+needed.length,'解包所需资源');
   if(performance.now()-lastYield>16){await new Promise<void>(resolve=>setTimeout(resolve,0));lastYield=performance.now();}
  }
  const created:Record<string,string>={};
  try{
   for(const id of needed){const asset=this.pack.assets[id];
    const parts=asset.parts.map(index=>{const chunk=chunks.get(index);if(!chunk)throw Error('资源分片缺失: '+id);return chunk;});
    const blob=new Blob(parts,{type:asset.mime});if(blob.size!==asset.bytes)throw Error('资源大小不匹配: '+id);
    await verifyAssetBlob(id,blob,asset.sha256);
    created[id]=URL.createObjectURL(blob);progress(++done,indices.length+needed.length,id);
    if(performance.now()-lastYield>16){await new Promise<void>(resolve=>setTimeout(resolve,0));lastYield=performance.now();}
   }
   Object.assign(this.urls,created);
   for(const id of needed)for(const index of new Set(this.pack.assets[id].parts))
    if(--this.remainingUses[index]===0)this.encodedChunks[index]=null;
  }catch(error){for(const url of Object.values(created))URL.revokeObjectURL(url);throw error;}
 }
}
let embeddedStore:EmbeddedAssetStore|null=null;
export async function prepareEmbeddedAssetIds(ids:Iterable<string>,progress:Progress=()=>{}){
 if(embeddedStore)await embeddedStore.prepare(ids,progress);else await prepareHttpAssetIds(ids,progress);
}
export function embeddedAssetStatus(){return embeddedStore?{prepared:embeddedStore.preparedCount,total:embeddedStore.totalCount}:httpAssetStatus();}
/** Blob parts share immutable content. No models are re-exported or clips discarded. */
export async function restoreAssetPack(pack:AssetPack,progress:(fraction:number)=>void=()=>{},release=false){
 if(pack.version!==1&&pack.version!==2)throw Error('不支持的资源包版本');
 const chunks:Blob[]=[],urls:Record<string,string>={};let lastYield=performance.now();
 try{
  for(let i=0;i<pack.chunks.length;i++){
   const c=pack.chunks[i];let stored:Uint8Array;
   if(pack.version===2)stored=decode85(c.data,c.storedBytes!);
   else {const binary=atob(c.data);stored=new Uint8Array(binary.length);for(let j=0;j<binary.length;j++)stored[j]=binary.charCodeAt(j);}
   if(c.encoding!=='gzip'&&c.encoding!=='raw')throw Error('无效的资源压缩格式');
   const bytes=c.encoding==='gzip'?gunzipSync(stored):stored;if(bytes.length!==c.bytes)throw Error('资源包字节校验失败');
   chunks.push(new Blob([bytes as Uint8Array<ArrayBuffer>]));if(release)c.data='';
   if(performance.now()-lastYield>16){progress((i+1)/pack.chunks.length*.9);await new Promise<void>(resolve=>setTimeout(resolve,0));lastYield=performance.now();}
  }
  for(const [id,a] of Object.entries(pack.assets)){
   const parts=a.parts.map(i=>{if(!chunks[i])throw Error('资源分片缺失: '+id);return chunks[i];}),blob=new Blob(parts,{type:a.mime});
   if(blob.size!==a.bytes)throw Error('资源大小不匹配: '+id);await verifyAssetBlob(id,blob,a.sha256);urls[id]=URL.createObjectURL(blob);
  }
  progress(1);return urls;
 }catch(error){for(const url of Object.values(urls))URL.revokeObjectURL(url);throw error;}
}
export async function loadEmbeddedAssets(){
 const element=document.getElementById('sc2-resource-pack');if(!element){await loadHttpAssets();return;}
 const root=document.getElementById('interface')!;
 root.innerHTML='<section class="pack-loading"><b>SC2 SURVIVORS</b><p role="status">正在读取并解析内置资源 · 当前步骤进度未知</p><progress max="1" aria-label="资源载入进度"></progress></section>';
 // Let the loading indicator paint before parsing a large local payload.
 await new Promise<void>(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
 const pack=JSON.parse(element.textContent!) as AssetPack;element.remove();
 if(pack.container==='chunks-v1'){
  function* parts(){
   // Drop each removed DOM node before yielding; a retained NodeList would keep
   // every original script text alive alongside the parsed strings until the end.
   const nodes:(HTMLScriptElement|null)[]=Array.from(document.querySelectorAll<HTMLScriptElement>('script[data-sc2-resource-chunk]'));
   for(let i=0;i<nodes.length;i++){const node=nodes[i]!,index=Number(node.dataset.sc2ResourceChunk),payload=node.textContent!;nodes[i]=null;node.remove();yield {index,payload};}
  }
  await restoreEmbeddedContainerChunksAsync(pack,parts(),(done,total)=>{root.querySelector('progress')!.value=total?done/total:0;root.querySelector('p')!.textContent=`正在读取内置资源 · ${done}/${total}`;});
 }
 embeddedStore=new EmbeddedAssetStore(pack);window.__SC2_EMBEDDED__=embeddedStore.urls;window.__SC2_PACK_ACTIVE__=true;
 const menuIds=initialMenuAssetIds(Object.keys(pack.assets));
 await embeddedStore.prepare(menuIds,(done,total,label)=>{root.querySelector('progress')!.value=total?done/total:0;root.querySelector('p')!.textContent=`正在准备菜单资源 · ${label} · ${done}/${total}`;});
}
