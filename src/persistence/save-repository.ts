import {readArchive} from './archive';
import {inspectDevArchive,isVerifiedDevEnvelope,type DevImportReport} from './dev-profile-import';
export interface LegacySaveCandidate {raw:string;report:DevImportReport|null;error?:string}
export interface IncompatibleSaveCandidate {raw:string;error:string}
export interface SaveBackend {read():Promise<(string|null)[]>;commit(raw:string):Promise<void>}
/** One IDB transaction rotates two current-version backups. Old raw slots are archived separately. */
export class IndexedSaveBackend implements SaveBackend {
 private db:Promise<IDBDatabase>;
 constructor(factory:IDBFactory){this.db=new Promise((resolve,reject)=>{const request=factory.open('sc2-survivors-saves',1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};request.onerror=()=>reject(request.error??Error('无法打开本地存档'));request.onblocked=()=>reject(Error('存档被其他窗口占用，请关闭其他游戏窗口'));});}
 async read(){const db=await this.db;return new Promise<(string|null)[]>((resolve,reject)=>{const tx=db.transaction('snapshots','readonly'),store=tx.objectStore('snapshots'),keys=['current','backup1','backup2'],values:(string|null)[]=[null,null,null];keys.forEach((key,i)=>{const req=store.get(key);req.onsuccess=()=>values[i]=typeof req.result==='string'?req.result:null;});tx.oncomplete=()=>resolve(values);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
 async commit(raw:string){readArchive(raw);const db=await this.db;return new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots');
  const names=['current','backup1','backup2'] as const,values:(string|null)[]=[null,null,null];
  let readCount=0;
  names.forEach((name,i)=>{const request=store.get(name);request.onsuccess=()=>{
   values[i]=typeof request.result==='string'?request.result:null;
   if(++readCount!==3)return;
   values.forEach((value,index)=>{if(value&&isVerifiedDevEnvelope(value))store.put(value,'legacy-'+names[index]);});
   let primary:string|null=null,backup:string|null=null;
   try{if(values[0]){readArchive(values[0]);primary=values[0];}}catch{}
   try{if(values[1]){readArchive(values[1]);backup=values[1];}}catch{}
   if(backup)store.put(backup,'backup2');
   if(primary)store.put(primary,'backup1');
   store.put(raw,'current');
  };});
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error??Error('保存失败'));tx.onabort=()=>reject(tx.error??Error('保存中断'));
 });}
}
export class SaveRepository {
 constructor(private backend:SaveBackend){}
 async load(){
  const slots=await this.backend.read();let error='',legacy:LegacySaveCandidate|null=null,incompatible:IncompatibleSaveCandidate|null=null,current:{bundle:ReturnType<typeof readArchive>['bundle'];savedAt:number;raw:string;index:number}|null=null;
  for(let i=0;i<slots.length;i++){
   const raw=slots[i];if(raw===null)continue;
   try{const candidate=readArchive(raw);if(!current)current={...candidate,raw,index:i};continue;}
   catch(e){error=String((e as Error).message);if(error.includes('旧 Acropolis 无尽档'))incompatible??={raw,error};}
   try{const report=inspectDevArchive(raw);legacy??={raw,report};}catch(e){if(isVerifiedDevEnvelope(raw))legacy??={raw,report:null,error:String((e as Error).message)};}
  }
  if(current)return {bundle:current.bundle,savedAt:current.savedAt,raw:current.raw,legacy,incompatible,notice:current.index?'主存档不可用；已找到上一份有效备份。':''};
  return {bundle:null,savedAt:legacy?.report?.run?.savedAt??0,raw:null,legacy,incompatible,notice:legacy?legacy.report?'检测到旧开发存档；战局不能续玩，可导出原档并单独导入永久资源。':'检测到旧开发存档；资源核算被拒绝，可导出原档。'+legacy.error:incompatible?'旧 Acropolis 无尽开发档不能映射到新平地；可导出原档。':error?'没有可读取的存档：'+error:''};
 }
 commit(raw:string){readArchive(raw);return this.backend.commit(raw);}
}
