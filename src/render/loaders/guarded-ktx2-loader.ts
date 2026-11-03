import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {waitForAsset} from '../../assets/preparation-wait';

export const GPU_DECODE_TIMEOUT=30000;
/** Three's pool only resolves message events. Keep failed workers and late
 * initialization inside one disposable decoder generation. */
export class GuardedKTX2Loader extends KTX2Loader {
 readonly cancellation=new AbortController();
 disposed=false;private initialized=false;
 constructor(){
  super();const pool=this.workerPool,create=pool.setWorkerCreator.bind(pool),post=pool.postMessage.bind(pool);
  pool.setWorkerCreator=factory=>create(()=>{
   if(this.disposed)throw Error('GPU decoder retired');const worker=factory();
   const fail=()=>this.dispose();worker.addEventListener('error',fail);worker.addEventListener('messageerror',fail);return worker;
  });
  pool.postMessage=(message,transfer)=>{
   if(this.disposed)return Promise.reject(Error('GPU decoder retired'));
   return waitForAsset(post(message,transfer),'GPU贴图转码',GPU_DECODE_TIMEOUT,this.cancellation.signal).catch(error=>{this.dispose();throw error;});
  };
 }
 override init(){
  if(this.disposed)return Promise.reject(Error('GPU decoder retired'));
  this.initialized=true;const original=super.init();
  // FileLoader initialization may finish after its deadline. It can create a
  // Blob URL, but the bounded init promise prevents any later worker dispatch.
  void original.then(()=>{if(this.disposed){URL.revokeObjectURL(this.workerSourceURL);this.workerSourceURL='';this.transcoderBinary=null;this.workerPool.dispose();}},()=>{});
  return waitForAsset(original,'GPU解码器初始化',GPU_DECODE_TIMEOUT,this.cancellation.signal).catch(error=>{this.dispose();throw error;});
 }
 override dispose(){if(this.disposed)return;this.disposed=true;this.cancellation.abort();if(this.initialized)super.dispose();else this.workerPool.dispose();this.transcoderBinary=null;}
}
