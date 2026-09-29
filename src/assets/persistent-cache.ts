/** Resource bytes only. Never opens the profile/run databases. */
const CACHE='sc2-resource-bytes-v1',DB='sc2-resource-downloads-v1';
export class ResourceCache {
 warning:string|null=null;
 private db:Promise<IDBDatabase|null>|null=null;
 private index(){return this.db??=new Promise<IDBDatabase|null>(resolve=>{if(typeof indexedDB==='undefined'){resolve(null);return;}const r=indexedDB.open(DB,2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('files'))r.result.createObjectStore('files',{keyPath:'hash'});if(!r.result.objectStoreNames.contains('tasks'))r.result.createObjectStore('tasks',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null);});}
 private key(hash:string){return new URL('/__sc2_resource_cache__/'+hash,globalThis.location?.origin??'https://sc2.invalid').href;}
 async get(hash:string):Promise<ArrayBuffer|null>{try{if(typeof caches==='undefined')return null;const r=await(await caches.open(CACHE)).match(this.key(hash));return r?await r.arrayBuffer():null;}catch{return null;}}
 async remove(hash:string){try{if(typeof caches!=='undefined')await(await caches.open(CACHE)).delete(this.key(hash));}catch{/* Network retry remains available. */}}
 async put(hash:string,bytes:ArrayBuffer,mime:string,release:string){try{if(typeof caches==='undefined')throw Error('unavailable');await(await caches.open(CACHE)).put(this.key(hash),new Response(bytes,{headers:{'Content-Type':mime}}));const db=await this.index();if(db)await new Promise<void>(resolve=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put({hash,bytes:bytes.byteLength,release,verifiedAt:Date.now()});tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>resolve();});return true;}catch{this.warning='资源未能完整缓存，下次进入可能需要重新下载';return false;}}
 async task(id:string,release:string,hashes:string[],status:'running'|'complete'|'stopped'|'failed',completedBytes:number){const db=await this.index();if(db)await new Promise<void>(resolve=>{const tx=db.transaction('tasks','readwrite');tx.objectStore('tasks').put({id,release,hashes,status,completedBytes,updatedAt:Date.now()});tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>resolve();});}
 async clear(){if(typeof caches!=='undefined')await caches.delete(CACHE);const db=await this.index();if(db)await new Promise<void>(resolve=>{const tx=db.transaction(['files','tasks'],'readwrite');tx.objectStore('files').clear();tx.objectStore('tasks').clear();tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();});this.warning=null;}
 async persist(){try{return await navigator.storage?.persist?.()??false;}catch{return false;}}
}
