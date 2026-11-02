import {waitForAsset} from './preparation-wait';

/** Pack storage is owned by the controlling SW, independently of verified
 * resource bytes. Acknowledgement prevents claiming an old worker was cleared. */
async function message(data:{type:string;url?:string},timeoutMs:number){
 const worker=typeof navigator==='undefined'?null:navigator.serviceWorker?.controller;
 if(!worker)return null;
 const channel=new MessageChannel();
 try{return await waitForAsset(new Promise<boolean>((resolve,reject)=>{
  channel.port1.onmessage=event=>resolve(event.data?.ok===true);channel.port1.onmessageerror=()=>reject(Error('资源包缓存响应无效'));
  worker.postMessage(data,[channel.port2]);
 }),'资源包缓存',timeoutMs);}
 finally{channel.port1.close();channel.port2.close();}
}
export async function invalidatePackedResource(url:URL,timeoutMs=2500){
 try{await message({type:'sc2-pack-invalidate',url:url.href},timeoutMs);}catch{/* Reload still retries through the current worker/network. */}
}
export async function clearPackedResourceCache(timeoutMs=5000){
 const cleared=await message({type:'sc2-pack-cache-clear'},timeoutMs);
 if(cleared===false)throw Error('资源包缓存未能清理');
 if(cleared===null&&typeof caches!=='undefined')await waitForAsset(caches.delete('sc2-immutable-packs-v1'),'资源包缓存',timeoutMs);
}
