import {sha256} from './sha256';

export interface MiniAsset {path:string;bytes:number;sha256:string;kind:string}
export interface MiniAssetManifest {schema:1;rulesId:'mvp-1.0';mapId:'kairos';assetCount:number;totalBytes:number;assets:Record<string,MiniAsset>}
export interface MiniFileSystem {
 accessSync(path:string):void;
 mkdirSync(path:string,recursive?:boolean):void;
 readdirSync(path:string):string[];
 statSync(path:string):{size:number};
 readFileSync(path:string):ArrayBuffer;
 readFileSync(path:string,encoding:'utf8'):string;
 writeFileSync(path:string,data:string,encoding:'utf8'):void;
 copyFileSync(source:string,target:string):void;
 renameSync(source:string,target:string):void;
 unlinkSync(path:string):void;
}
export interface MiniDownloadResult {statusCode:number;tempFilePath:string}
export interface MiniDownloadTask {onProgressUpdate?(callback:(event:{progress:number;totalBytesWritten:number;totalBytesExpectedToWrite:number})=>void):void}
export interface MiniPlatform {
 env:{USER_DATA_PATH:string};
 getFileSystemManager():MiniFileSystem;
 downloadFile(options:{url:string;success:(result:MiniDownloadResult)=>void;fail:(error:unknown)=>void}):MiniDownloadTask;
}
const pathSafe=(path:string)=>/^assets\/[A-Za-z0-9._/-]+$/.test(path)&&!path.split('/').includes('..');
const digestSafe=(digest:string)=>/^[0-9a-f]{64}$/.test(digest);
export function validateMiniAssetManifest(value:unknown):value is MiniAssetManifest {
 if(!value||typeof value!=='object')return false;
 const m=value as MiniAssetManifest;
 if(m.schema!==1||m.rulesId!=='mvp-1.0'||m.mapId!=='kairos'||!m.assets||typeof m.assets!=='object'||Array.isArray(m.assets)||!Number.isSafeInteger(m.assetCount)||m.assetCount<1||!Number.isSafeInteger(m.totalBytes)||m.totalBytes<1)return false;
 const rows=Object.entries(m.assets);
 return rows.length===m.assetCount&&rows.reduce((sum,[id,row])=>{
  if(!/^[a-z0-9._-]+$/i.test(id)||!row||!pathSafe(row.path)||!Number.isSafeInteger(row.bytes)||row.bytes<0||!digestSafe(row.sha256)||typeof row.kind!=='string')return NaN;
  return sum+row.bytes;
 },0)===m.totalBytes;
}

/** Files are content-addressed and promoted only after size and SHA-256 verification. */
export class WeChatAssetCache {
 private fs:MiniFileSystem;
 private root:string;
 private ready=new Map<string,string>();
 private pending=new Map<string,Promise<string>>();
 private serial:Promise<unknown>=Promise.resolve();
 private batches:Promise<unknown>=Promise.resolve();
 private active=new Set<string>();
 private lastUsed=new Map<string,number>();
 private clock=0;
 constructor(private wx:MiniPlatform,private manifest:MiniAssetManifest,private origin:string,private budgetBytes=160*1024*1024){
  if(!validateMiniAssetManifest(manifest))throw Error('小游戏资源清单无效');
  if(!/^https:\/\/[A-Za-z0-9.-]+(?::443)?(?:\/[A-Za-z0-9._/-]*)?$/.test(origin)||origin.includes('..'))throw Error('小游戏需要已登记的 HTTPS 资源域名');
  this.origin=origin.replace(/\/$/,'');
  this.fs=wx.getFileSystemManager();this.root=wx.env.USER_DATA_PATH+'/sc2-assets';
  this.fs.mkdirSync(this.root,true);
 }
 get(id:string){return this.ready.get(id)??null;}
 get total(){return this.manifest.assetCount;}
 /** Commit the active scene after a transition; its files cannot be evicted. */
 setActiveIds(ids:Iterable<string>){
  const next=new Set(ids);for(const id of next)if(!this.manifest.assets[id])throw Error('小游戏资源清单缺失：'+id);
  const bytes=[...next].reduce((n,id)=>n+this.manifest.assets[id].bytes,0);
  if(bytes>this.budgetBytes)throw Error(`当前战场资源 ${bytes} 字节超过 ${this.budgetBytes} 字节缓存预算`);
  this.active=next;
 }
 async prepare(ids:Iterable<string>,progress:(done:number,total:number,label:string)=>void=()=>{}):Promise<void>{
  const task=this.batches.then(()=>this.prepareBatch(ids,progress));
  this.batches=task.catch(()=>{});
  return task;
 }
 private async prepareBatch(ids:Iterable<string>,progress:(done:number,total:number,label:string)=>void):Promise<void>{
  const unique=[...new Set(ids)];for(const id of unique)if(!this.manifest.assets[id])throw Error('小游戏资源清单缺失：'+id);
  // Keep the old scene protected until its replacement is fully ready and committed.
  const previous=this.active;
  this.setActiveIds(new Set([...this.active,...unique]));
  try{
   let done=0;progress(0,unique.length,'检查本地资源');
   // Serial preparation limits memory peaks and the platform's download concurrency.
   for(const id of unique){await this.prepareOne(id,pct=>progress(done,unique.length,`${id} ${pct}%`));progress(++done,unique.length,id);}
  }catch(error){this.active=previous;throw error;}
 }
 async prepareOne(id:string,onProgress:(percent:number)=>void=()=>{}):Promise<string>{
  if(this.ready.has(id))return this.ready.get(id)!;
  if(!this.manifest.assets[id])throw Error('小游戏资源清单缺失：'+id);
  const existing=this.pending.get(id);if(existing)return existing;
  const task=this.serial.then(()=>this.loadOne(id,onProgress));this.serial=task.catch(()=>{});this.pending.set(id,task);
  try{return await task;}finally{this.pending.delete(id);}
 }
 private async loadOne(id:string,onProgress:(percent:number)=>void):Promise<string>{
  const row=this.manifest.assets[id],file=this.root+'/'+row.sha256;
  try{this.fs.accessSync(file);const bytes=this.fs.readFileSync(file);if(bytes.byteLength===row.bytes&&sha256(bytes)===row.sha256){this.ready.set(id,file);this.lastUsed.set(row.sha256,++this.clock);return file;}this.fs.unlinkSync(file);}catch{}
  const result=await new Promise<MiniDownloadResult>((resolve,reject)=>{
   const task=this.wx.downloadFile({url:this.origin+'/'+row.path,success:resolve,fail:reject});
   task.onProgressUpdate?.(event=>onProgress(Math.max(0,Math.min(100,event.progress))));
  });
  if(result.statusCode!==200)throw Error(`资源 ${id} 下载失败：HTTP ${result.statusCode}`);
  const bytes=this.fs.readFileSync(result.tempFilePath);
  if(bytes.byteLength!==row.bytes||sha256(bytes)!==row.sha256)throw Error('资源完整性校验失败：'+id);
  this.makeRoom(row.bytes,row.sha256);
  const temp=file+'.new';
  try{this.fs.unlinkSync(temp);}catch{}
  try{
   this.fs.copyFileSync(result.tempFilePath,temp);
   const copied=this.fs.readFileSync(temp);
   if(copied.byteLength!==row.bytes||sha256(copied)!==row.sha256)throw Error('资源缓存校验失败：'+id);
   try{this.fs.unlinkSync(file);}catch{}
   this.fs.renameSync(temp,file);
  }catch(error){try{this.fs.unlinkSync(temp);}catch{}throw error;}
  this.ready.set(id,file);this.lastUsed.set(row.sha256,++this.clock);return file;
 }
 private makeRoom(incoming:number,ownHash:string){
  const known=new Map(Object.entries(this.manifest.assets).map(([id,row])=>[row.sha256,id]));
  const installed=this.fs.readdirSync(this.root).filter(name=>/^[0-9a-f]{64}$/.test(name)).map(name=>({name,bytes:this.fs.statSync(this.root+'/'+name).size}));
  let used=installed.reduce((n,row)=>n+row.bytes,0);
  if(used+incoming<=this.budgetBytes)return;
  const removable=installed.filter(row=>row.name!==ownHash&&!this.active.has(known.get(row.name)??'')).sort((a,b)=>(this.lastUsed.get(a.name)??0)-(this.lastUsed.get(b.name)??0));
  for(const row of removable){this.fs.unlinkSync(this.root+'/'+row.name);used-=row.bytes;const id=known.get(row.name);if(id)this.ready.delete(id);if(used+incoming<=this.budgetBytes)return;}
  throw Error('当前战场资源超过小游戏本地缓存预算');
 }
}
