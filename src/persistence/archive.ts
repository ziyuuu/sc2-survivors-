import {encodeGraph,decodeGraph,checksum,type Graph} from './graph-codec';
import {PermanentProfile} from '../simulation/progression/permanent-profile';
import {RUN_SCHEMA,RUN_RULES,type RunSnapshot} from '../simulation/persistence/run-snapshot';
import {validateRunData} from '../simulation/persistence/run-fields';
import {RunState} from '../simulation/run-state';
export interface SaveBundle {profile:string;run:RunSnapshot|null;shopProgress?:import('../ui/presentation/shop-progress').ShopProgressSnapshot}
export interface SaveArchive {format:'sc2-survivors-save';version:2;savedAt:number;data:Graph;checksum:string}
export function writeArchive(bundle:SaveBundle,now=Date.now()){
 if(!PermanentProfile.parseJSON(bundle.profile))throw Error('永久档案无效');
 const payload={format:'sc2-survivors-save' as const,version:2 as const,savedAt:now,data:encodeGraph(bundle)};
 return JSON.stringify({...payload,checksum:checksum(JSON.stringify(payload))});
}
export function readArchive(raw:string):{bundle:SaveBundle;savedAt:number}{
 if(typeof raw!=='string'||raw.length>32*1024*1024)throw Error('存档文件过大或格式无效');
 const parsed=JSON.parse(raw) as SaveArchive;
 if(parsed.format!=='sc2-survivors-save'||parsed.version!==2)throw Error('存档格式版本不兼容');
 const {checksum:sum,...payload}=parsed;
 if(checksum(JSON.stringify(payload))!==sum)throw Error('存档校验失败');
 if(!Number.isFinite(parsed.savedAt))throw Error('存档时间无效');
 const bundle=decodeGraph(parsed.data) as SaveBundle;
 if(!bundle||typeof bundle.profile!=='string'||!PermanentProfile.parseJSON(bundle.profile))throw Error('永久档案无效');
 if(bundle.run!==null){
  if(!bundle.run||bundle.run.schema!==RUN_SCHEMA||bundle.run.rules!==RUN_RULES||bundle.run.config?.rulesId!==RUN_RULES)throw Error('续局版本不兼容');
  validateRunData(bundle.run.state,new RunState());
  if(bundle.run.config.difficulty!==bundle.run.state.difficulty||bundle.run.config.race!==bundle.run.state.expedition.race)throw Error('续局配置与状态不一致');
 }
 return {bundle,savedAt:parsed.savedAt};
}
