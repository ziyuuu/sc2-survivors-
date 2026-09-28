import {readArchive} from '../../persistence/archive';
import type {SaveBackend} from '../../persistence/save-repository';
import type {MiniFileSystem} from './asset-cache';

export interface MiniSavePlatform {env:{USER_DATA_PATH:string};getFileSystemManager():MiniFileSystem&{readFileSync(path:string,encoding:'utf8'):string;writeFileSync(path:string,data:string,encoding:'utf8'):void}}

/** Browser and mini game share the exact archive validation and World snapshot. */
export class WeChatSaveBackend implements SaveBackend {
 private fs:ReturnType<MiniSavePlatform['getFileSystemManager']>;
 private base:string;
 constructor(wx:MiniSavePlatform){this.fs=wx.getFileSystemManager();this.base=wx.env.USER_DATA_PATH+'/sc2-save';this.fs.mkdirSync(this.base,true);}
 private file(name:'current'|'backup1'|'backup2'|'pending'){return this.base+'/'+name+'.json';}
 private readOne(name:'current'|'backup1'|'backup2',validate=false){
  try{const raw=this.fs.readFileSync(this.file(name),'utf8');if(validate)readArchive(raw);return raw;}catch{return null;}
 }
 async read():Promise<(string|null)[]>{return [this.readOne('current'),this.readOne('backup1'),this.readOne('backup2')];}
 async commit(raw:string):Promise<void>{
  readArchive(raw);
  const pending=this.file('pending');
  this.fs.writeFileSync(pending,raw,'utf8');
  try{readArchive(this.fs.readFileSync(pending,'utf8'));}catch(error){try{this.fs.unlinkSync(pending);}catch{}throw error;}
  // Each slot is independently valid. A crash between renames leaves a readable backup.
  const priorCurrent=this.readOne('current',true),priorBackup=this.readOne('backup1',true);
  if(priorBackup){try{this.fs.unlinkSync(this.file('backup2'));}catch{}this.fs.writeFileSync(this.file('backup2'),priorBackup,'utf8');}
  if(priorCurrent){try{this.fs.unlinkSync(this.file('backup1'));}catch{}this.fs.writeFileSync(this.file('backup1'),priorCurrent,'utf8');}
  try{this.fs.unlinkSync(this.file('current'));}catch{}
  this.fs.renameSync(pending,this.file('current'));
 }
}
