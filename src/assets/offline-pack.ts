import {gunzipSync} from 'three/addons/libs/fflate.module.js';
export type AssetPack={version:number;chunks:{encoding:'raw'|'gzip';bytes:number;data:string}[];assets:Record<string,{mime:string;bytes:number;sha256:string;parts:number[]}>};
/** Blob parts share immutable content. No models are re-exported or clips discarded. */
export async function restoreAssetPack(pack:AssetPack,progress:(fraction:number)=>void=()=>{},release=false){
 if(pack.version!==1)throw Error('不支持的资源包版本');
 const chunks:Blob[]=[],urls:Record<string,string>={};let lastYield=performance.now();
 try{
  for(let i=0;i<pack.chunks.length;i++){
   const c=pack.chunks[i],binary=atob(c.data),stored=new Uint8Array(binary.length);for(let j=0;j<binary.length;j++)stored[j]=binary.charCodeAt(j);
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
 root.innerHTML='<section class="pack-loading"><b>SC2 SURVIVORS</b><p role="status">正在准备战场</p><progress max="1" value="0" aria-label="资源载入进度"></progress></section>';
 // Let the loading indicator paint before parsing a large local payload.
 await new Promise<void>(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
 const pack=JSON.parse(element.textContent!) as AssetPack;element.remove();
 window.__SC2_EMBEDDED__=await restoreAssetPack(pack,f=>{root.querySelector('progress')!.value=f;root.querySelector('p')!.textContent=`正在准备战场 · ${Math.round(f*100)}%`;},true);
}
