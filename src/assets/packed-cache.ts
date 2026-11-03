import {waitForAsset} from './preparation-wait';

export class PackedWorkerUpdateError extends Error {
 constructor(){super('资源服务更新失败，请刷新后重试。');this.name='PackedWorkerUpdateError';}
}
type WorkerReply={ok?:boolean;protocol?:number;cacheClear?:boolean;versionedIndexes?:boolean};
const controller=()=>typeof navigator==='undefined'?null:navigator.serviceWorker?.controller;
/** Pack storage is owned by the controlling SW, independently of verified
 * resource bytes. Acknowledgement prevents claiming an old worker was cleared. */
async function message(worker:ServiceWorker,data:{type:string;url?:string},timeoutMs:number){
 const channel=new MessageChannel();
 try{return await waitForAsset(new Promise<WorkerReply|null>((resolve,reject)=>{
  channel.port1.onmessage=event=>resolve(event.data&&typeof event.data==='object'?event.data:null);channel.port1.onmessageerror=()=>reject(Error('资源包缓存响应无效'));
  worker.postMessage(data,[channel.port2]);
 }),'资源包缓存',timeoutMs);}
 finally{channel.port1.close();channel.port2.close();}
}
export async function invalidatePackedResource(url:URL,timeoutMs=2500){
 const worker=controller();if(!worker)return;
 try{await message(worker,{type:'sc2-pack-invalidate',url:url.href},timeoutMs);}catch{/* Reload still retries through the current worker/network. */}
}
async function capableWorker(timeoutMs:number){
 const worker=controller();if(!worker)return null;
 try{const reply=await message(worker,{type:'sc2-pack-capabilities'},Math.min(2000,timeoutMs));return controller()===worker&&reply?.protocol===1&&reply.cacheClear===true&&reply.versionedIndexes===true?worker:null;}catch{return null;}
}
export async function clearPackedResourceCache(timeoutMs=5000){
 const ensure=(globalThis as typeof globalThis&{__SC2_ENSURE_PACK_WORKER__?:()=>Promise<unknown>}).__SC2_ENSURE_PACK_WORKER__;
 if(!controller()&&!ensure){if(typeof caches!=='undefined')await waitForAsset(caches.delete('sc2-immutable-packs-v1'),'资源包缓存',timeoutMs);return;}
 // A second pass is only for a controller switch during clear. Never unregister
 // the worker, erase unrelated origins/databases, or claim success without ack.
 for(let attempt=0;attempt<2;attempt++){
  let worker=await capableWorker(timeoutMs);
  if(!worker){
   if(!ensure)throw new PackedWorkerUpdateError();
   try{await waitForAsset(Promise.resolve().then(ensure),'资源服务更新',Math.min(25000,timeoutMs*5));}catch{throw new PackedWorkerUpdateError();}
   worker=await capableWorker(timeoutMs);if(!worker)throw new PackedWorkerUpdateError();
  }
  const reply=await message(worker,{type:'sc2-pack-cache-clear'},timeoutMs);
  if(reply?.ok!==true)throw Error('资源包缓存未能清理');
  if(controller()===worker)return;
 }
 throw new PackedWorkerUpdateError();
}
