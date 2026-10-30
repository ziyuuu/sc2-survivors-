import {encodeGraph,decodeGraph,checksum,type Graph} from './graph-codec';
import {PermanentProfile} from '../simulation/progression/permanent-profile';
import {RUN_SCHEMA,RUN_RULES,type RunSnapshot} from '../simulation/persistence/run-snapshot';
import {validateRunData} from '../simulation/persistence/run-fields';
import {RunState} from '../simulation/run-state';
import {restoreStarship,validateEquipmentAccount} from '../simulation/persistence/starship-snapshot';
import type {EquipmentAccount} from '../simulation/starship/types';
import {EQUIPMENT_SLOTS} from '../simulation/starship/types';
export interface SaveBundle {profile:string;run:RunSnapshot|null;equipment?:EquipmentAccount;management?:import('../ui/starship/host').ManagementState;shopProgress?:import('../ui/presentation/shop-progress').ShopProgressSnapshot}
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
 if(bundle.equipment)validateEquipmentAccount(bundle.equipment);
 if(bundle.equipment?.run&&!bundle.equipment.run.ended&&!bundle.run?.starship)throw Error('出征账户缺少对应检查点');
 if(bundle.management){const m=bundle.management;if(!Number.isSafeInteger(m.revision)||m.revision<0||!(m.locked instanceof Set)||!(m.favorites instanceof Set)||[...m.locked,...m.favorites].some(id=>typeof id!=='string')||!m.presets||!m.presetNames)throw Error('配装预设无效');for(const race of ['terran','zerg','protoss'] as const){if(!Array.isArray(m.presets[race])||m.presets[race].length!==3||!Array.isArray(m.presetNames[race])||m.presetNames[race].length!==3||m.presetNames[race].some(n=>typeof n!=='string'||n.length>100))throw Error('配装预设无效');for(const preset of m.presets[race])if(preset!==null&&(!preset||typeof preset!=='object'||Array.isArray(preset)||Object.entries(preset).some(([slot,id])=>!(EQUIPMENT_SLOTS as readonly string[]).includes(slot)||typeof id!=='string')||new Set(Object.values(preset)).size!==Object.values(preset).length))throw Error('配装预设槽位无效');}}
 if(bundle.run!==null){
  if(!bundle.run||bundle.run.schema!==RUN_SCHEMA||bundle.run.rules!==RUN_RULES||bundle.run.config?.rulesId!==RUN_RULES)throw Error('续局版本不兼容');
  validateRunData(bundle.run.state,new RunState(),bundle.run.starship);
  if(bundle.run.starship){const runtime=restoreStarship(bundle.run.starship);if(!runtime.enabled||!bundle.equipment||runtime.account.run?.id!==bundle.run.state.runId||runtime.account.run.race!==bundle.run.config.race||runtime.account.run.ended!==['lost','finished'].includes(bundle.run.state.phase)||runtime.account!==bundle.equipment&&checksum(JSON.stringify(encodeGraph(runtime.account)))!==checksum(JSON.stringify(encodeGraph(bundle.equipment))))throw Error('账户与检查点不一致');}
  if(bundle.run.config.difficulty!==bundle.run.state.difficulty||bundle.run.config.race!==bundle.run.state.expedition.race)throw Error('续局配置与状态不一致');
 }
 return {bundle,savedAt:parsed.savedAt};
}
