import {encodeGraph,decodeGraph,checksum,type Graph} from './graph-codec';
import {PermanentProfile} from '../simulation/progression/permanent-profile';
import {RUN_SCHEMA,RUN_RULES,type RunSnapshot} from '../simulation/persistence/run-snapshot';
import {validateRunData} from '../simulation/persistence/run-fields';
import {RunState} from '../simulation/run-state';
export interface SaveBundle {profile:string;run:RunSnapshot|null}
export interface SaveArchive {format:'sc2-survivors-save';version:2;savedAt:number;data:Graph;checksum:string}
/** Pure-data normalization; no historical gameplay branch is kept alive. */
function normalizeEarlierRun(value:unknown):RunSnapshot|unknown {
 if(!value||typeof value!=='object')return value;
 const run=value as Record<string,any>;
 if(run.schema===4||run.schema===5){run.schema=RUN_SCHEMA;return run as unknown as RunSnapshot;}
 if(run.schema!==2&&run.schema!==3)return value;
 if(run.schema===3){
  if(run.state?.endless)throw Error('旧 Acropolis 无尽档不能自动转为平地；请保留原档导出');
  run.state.battlefield={mode:'campaign',mapId:'campaign-kairos-v1',mapHash:run.config?.mapHash};
  run.state.endlessEntry=null;run.state.endlessTransitionReceipt=null;run.state.endlessRoundReceipts=[];run.schema=RUN_SCHEMA;
  return run as unknown as RunSnapshot;
 }
 const frozen=run.config?.frozenTalents;
 if(run.rules!==RUN_RULES||run.config?.rulesId!==RUN_RULES||frozen?.ruleset!==RUN_RULES||frozen.allocated!==0||Object.keys(frozen.levels??{}).length||Object.keys(run.state?.expedition?.frozenTalentLevels??{}).length||Object.keys(run.state?.runTalentLevels??{}).length)throw Error('M1存档天赋不符合零投入迁移条件');
 run.schema=3;frozen.investment=0;run.state.runConfig=structuredClone(run.config);delete run.state.runTalentLevels;delete run.state.expedition.frozenTalentLevels;
 run.state.expedition.draftClaims=[];run.state.expedition.bonusRefreshRemaining=0;
 run.state.expedition.eliteContractWindow=0;run.state.expedition.eliteContracts=[];
 run.state.expedition.talentLootReceipts=[];run.state.expedition.pendingTalentLoot=null;run.state.expedition.talentLootRngState=(run.seed^0x9e3779b9)>>>0;
 run.state.expedition.eliteRescueRights=[];run.state.expedition.eliteRescueCompleted=[];
 run.state.talentSupportImpacts=[];
 delete run.state.airliftAt;run.state.talentTransferPlan=null;
 run.state.expedition.temporaryOrdinaryCursor=0;run.state.expedition.temporaryEliteCursor=0;
 run.state.expedition.tacticalPlans={};for(const job of run.state.expedition.ledger??[])for(const passenger of job.passengers??[])passenger.purpose='body';
 return normalizeEarlierRun(run);
}
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
 bundle.run=normalizeEarlierRun(bundle.run) as RunSnapshot|null;
 if(bundle.run!==null){
  if(!bundle.run||bundle.run.schema!==RUN_SCHEMA||bundle.run.rules!==RUN_RULES||bundle.run.config?.rulesId!==RUN_RULES)throw Error('续局版本不兼容');
  validateRunData(bundle.run.state,new RunState());
  if(bundle.run.config.difficulty!==bundle.run.state.difficulty||bundle.run.config.race!==bundle.run.state.expedition.race)throw Error('续局配置与状态不一致');
 }
 return {bundle,savedAt:parsed.savedAt};
}
