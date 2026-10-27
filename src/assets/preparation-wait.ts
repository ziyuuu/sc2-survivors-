/** Deadlines apply to asynchronous waits, not synchronous decoding or driver calls.
 * A caller that owns mutable scene work must retain its lane until that work drains. */
export const ASSET_REQUEST_TIMEOUT=60000;
export const PREPARATION_WAIT_TIMEOUT=120000;
/** Retry a complete preparation pass so verified resources from earlier passes remain reusable. */
export async function retryAssetPreparation<T>(work:()=>Promise<T>,onRetry:(attempt:number,delayMs:number)=>void=()=>{},delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms))){
 for(let attempt=0;;attempt++){
  try{return await work();}catch(error){
   if(attempt>=3)throw error;
   const delayMs=1000*2**attempt;onRetry(attempt+1,delayMs);await delay(delayMs);
  }
 }
}
export function waitForAsset<T>(work:PromiseLike<T>,label:string,timeoutMs=ASSET_REQUEST_TIMEOUT,signal?:AbortSignal):Promise<T>{
 return new Promise<T>((resolve,reject)=>{
  let settled=false;
  const finish=(ok:boolean,value:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(ok)resolve(value as T);else reject(value);};
  const abort=()=>finish(false,Error('资源准备已取消'));
  const timer=setTimeout(()=>finish(false,Error(label+'等待超时，请重试')),timeoutMs);
  Promise.resolve(work).then(value=>finish(true,value),error=>finish(false,error));
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 });
}
/** Keep the abort controller alive through body consumption, including a stalled body. */
export async function fetchAsset<T>(request:typeof fetch,input:RequestInfo|URL,init:RequestInit,consume:(response:Response)=>Promise<T>,timeoutMs=ASSET_REQUEST_TIMEOUT){
 const controller=new AbortController();
 try{return await waitForAsset(request(input,{...init,signal:controller.signal}).then(consume),'资源读取',timeoutMs);}
 finally{controller.abort();}
}
