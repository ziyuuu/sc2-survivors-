import {decode85} from './base85.mjs';
import {gunzipSync} from 'three/addons/libs/fflate.module.js';
export type AssetPack={version:number;chunks:{encoding:'raw'|'gzip';bytes:number;storedBytes?:number;data:string}[];assets:Record<string,{mime:string;bytes:number;sha256:string;parts:number[]}>};
type Progress=(done:number,total:number,label:string)=>void;

/** Decode only the assets needed by the next screen or battle transition. */
export class EmbeddedAssetStore {
 readonly urls:Record<string,string>={};
 private queue:Promise<unknown>=Promise.resolve();
 private remainingUses:number[];
 private encodedChunks:(Blob|null)[];
 constructor(private pack:AssetPack){
  if(pack.version!==2)throw Error('不支持的按需资源包版本');
  // Keep not-yet-needed encoded bytes outside the JS heap. Typed arrays were
  // measured at +269 MiB retained JS heap on the reference browser.
  this.encodedChunks=pack.chunks.map(chunk=>{const blob=new Blob([chunk.data]);chunk.data='';return blob;});
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
   const blob=this.encodedChunks[index];if(!blob)throw Error('资源分片不可用: '+index);
   const part=this.pack.chunks[index];
   const stored=decode85(await blob.text(),part.storedBytes!);
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
 await embeddedStore?.prepare(ids,progress);
}
export function embeddedAssetStatus(){return embeddedStore?{prepared:embeddedStore.preparedCount,total:embeddedStore.totalCount}:null;}
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
   if(blob.size!==a.bytes)throw Error('资源大小不匹配: '+id);urls[id]=URL.createObjectURL(blob);
  }
  progress(1);return urls;
 }catch(error){for(const url of Object.values(urls))URL.revokeObjectURL(url);throw error;}
}
export async function loadEmbeddedAssets(){
 const element=document.getElementById('sc2-resource-pack');if(!element)return;
 const root=document.getElementById('interface')!;
 root.innerHTML='<section class="pack-loading"><b>SC2 SURVIVORS</b><p role="status">正在读取并解析内置资源 · 当前步骤进度未知</p><progress max="1" aria-label="资源载入进度"></progress></section>';
 // Let the loading indicator paint before parsing a large local payload.
 await new Promise<void>(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
 const pack=JSON.parse(element.textContent!) as AssetPack;element.remove();
 embeddedStore=new EmbeddedAssetStore(pack);window.__SC2_EMBEDDED__=embeddedStore.urls;window.__SC2_PACK_ACTIVE__=true;
 const menuIds=['map.kairos','terrain.char',...Object.keys(pack.assets).filter(id=>id.startsWith('unit.')||id.startsWith('hero.')||id.startsWith('building.')||id.startsWith('tech.')||id.startsWith('ui.')||id.startsWith('skill.'))];
 await embeddedStore.prepare(menuIds,(done,total,label)=>{root.querySelector('progress')!.value=total?done/total:0;root.querySelector('p')!.textContent=`正在准备菜单资源 · ${label} · ${done}/${total}`;});
}
