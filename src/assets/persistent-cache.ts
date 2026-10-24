import {waitForAsset} from './preparation-wait';
/** Resource bytes only. Never opens the profile/run databases. */
const CACHE='sc2-resource-bytes-v1',DB='sc2-resource-downloads-v1';
export class ResourceCache {
 warning:string|null=null;
 private db:Promise<IDBDatabase|null>|null=null;
 private indexRetryAt=0;private storageRetryAt=0;
 constructor(private waitMs=5000,private retryMs=30000){}
 private warn(){this.warning='资源未能完整缓存，下次进入可能需要重新下载';}
 private index(){
  if(this.db)return this.db;
  if(performance.now()<this.indexRetryAt)return Promise.resolve(null);
  const pending=new Promise<IDBDatabase|null>(resolve=>{
   if(typeof indexedDB==='undefined'){resolve(null);return;}
   let settled=false;
   const finish=(db:IDBDatabase|null)=>{if(settled){db?.close();return;}settled=true;clearTimeout(timer);if(!db){this.warn();this.indexRetryAt=performance.now()+this.retryMs;}resolve(db);};
   const timer=setTimeout(()=>finish(null),this.waitMs);
   try{
    const r=indexedDB.open(DB,2);
    r.onupgradeneeded=()=>{if(settled){r.transaction?.abort();return;}if(!r.result.objectStoreNames.contains('files'))r.result.createObjectStore('files',{keyPath:'hash'});if(!r.result.objectStoreNames.contains('tasks'))r.result.createObjectStore('tasks',{keyPath:'id'});};
    r.onsuccess=()=>{const db=r.result;db.onversionchange=()=>{db.close();if(this.db===pending)this.db=null;};finish(db);};
    r.onerror=r.onblocked=()=>finish(null);
   }catch{finish(null);}
  });
  this.db=pending;void pending.then(db=>{if(!db&&this.db===pending)this.db=null;});return pending;
 }
 private key(hash:string){return new URL('/__sc2_resource_cache__/'+hash,globalThis.location?.origin??'https://sc2.invalid').href;}
 private async bounded<T>(work:Promise<T>){return waitForAsset(work,'资源缓存',this.waitMs);}
 private async transaction(stores:string|string[],write:(tx:IDBTransaction)=>void){
  const db=await this.index();if(!db)return;
  let tx:IDBTransaction|undefined;
  try{await this.bounded(new Promise<void>((resolve,reject)=>{tx=db.transaction(stores,'readwrite');write(tx);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx?.error??Error('资源缓存索引写入失败'));}));}
  catch(error){try{tx?.abort();}catch{/* Already settled. */}throw error;}
 }
 async get(hash:string):Promise<ArrayBuffer|null>{try{if(typeof caches==='undefined'||performance.now()<this.storageRetryAt)return null;return await this.bounded((async()=>{const r=await(await caches.open(CACHE)).match(this.key(hash));return r?await r.arrayBuffer():null;})());}catch{this.warn();this.storageRetryAt=performance.now()+this.retryMs;return null;}}
 async remove(hash:string){try{if(typeof caches!=='undefined'&&performance.now()>=this.storageRetryAt)await this.bounded((async()=>{await(await caches.open(CACHE)).delete(this.key(hash));})());}catch{this.warn();this.storageRetryAt=performance.now()+this.retryMs;}}
 async put(hash:string,bytes:ArrayBuffer,mime:string,release:string){
  try{if(typeof caches==='undefined')throw Error('unavailable');if(performance.now()<this.storageRetryAt)return false;
   await this.bounded((async()=>{await(await caches.open(CACHE)).put(this.key(hash),new Response(bytes,{headers:{'Content-Type':mime}}));})());
   // The index is advisory: verified disk bytes remain reusable if it is blocked.
   try{await this.transaction('files',tx=>{tx.objectStore('files').put({hash,bytes:bytes.byteLength,release,verifiedAt:Date.now()});});}catch{this.warn();}
   return true;
  }catch{this.warn();this.storageRetryAt=performance.now()+this.retryMs;return false;}
 }
 async task(id:string,release:string,hashes:string[],status:'running'|'complete'|'stopped'|'failed',completedBytes:number){
  try{await this.transaction('tasks',tx=>{tx.objectStore('tasks').put({id,release,hashes,status,completedBytes,updatedAt:Date.now()});});}catch{this.warn();}
 }
 async clear(){if(typeof caches!=='undefined')await this.bounded(caches.delete(CACHE));this.storageRetryAt=this.indexRetryAt=0;await this.transaction(['files','tasks'],tx=>{tx.objectStore('files').clear();tx.objectStore('tasks').clear();});this.warning=null;}
 async persist(){try{return await this.bounded(Promise.resolve(navigator.storage?.persist?.()??false));}catch{return false;}}
}
