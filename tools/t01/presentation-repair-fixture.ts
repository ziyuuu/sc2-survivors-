import type {Case} from './catalogue';
import type {World} from '../../src/simulation/world';
import type {Entity} from '../../src/simulation/types';
import type {MissionRecord,MissionBody} from '../../src/simulation/missions/state';
import {makeMissionBody} from '../../src/simulation/missions/runtime';
import {callFleet,tickFleetCall} from '../../src/simulation/missions/fleet';
import equipmentCases from './equipment.generated.json';
import {equipmentPreviewCases,type EquipmentPreviewData} from './equipment-preview-spec';

const rows=[
 ...['scv','drone','probe','hatchery','barracks','factory','starport','gateway','robotics','stargate'].map(model=>({key:'mission-'+model,name:({scv:'SCV',drone:'工蜂',probe:'探机',hatchery:'任务虫巢',factory:'维修工厂',barracks:'维修兵营',starport:'维修星港',gateway:'维修传送门',robotics:'维修机械台',stargate:'维修星门'} as Record<string,string>)[model]+' · 死亡',kind:'mission',model})),
 ...['fun-nydus','fun-infested-marine','fun-cocoon'].map(model=>({key:model,name:({ 'fun-nydus':'坑道虫','fun-infested-marine':'感染陆战队员','fun-cocoon':'孵化茧'} as Record<string,string>)[model]+' · 死亡',kind:'special',model})),
 ...['fun-brood','hero-baneling'].map(model=>({key:model,name:(model==='fun-brood'?'临时巢虫':'临时爆虫')+' · 到期退场',kind:'expiry',model})),
 {key:'fleet',name:'呼叫舰队 · 主炮与大和炮完整周期',kind:'fleet',model:''},
 {key:'fleet-expiry',name:'呼叫舰队 · 三舰到期退场',kind:'fleet',model:'expiry'},
 ...(['projection-birth','projection-end','recall-from','recall-to','rewind','capture','evolve','reinforcement','expiry','fort-deploy','heal'] as const).map((model,i)=>({key:'equipment-'+model,name:'舰装反馈 · '+['幻象生成','幻象结束','召回起点','召回落点','时间回溯','捕获','进化','增援','到期退场','建筑部署','治疗'][i],kind:'equipment',model})),
];
const baseCases:Case[]=rows.filter(r=>r.kind!=='equipment').map(r=>({id:'presentation:'+r.key,group:'专项复核',name:r.name,runner:'presentation',actor:r.kind==='equipment'?'equipment':r.kind==='fleet'?'fleet':r.key,action:'cycle',seconds:r.kind==='fleet'?(r.model==='expiry'?7:12):8,source:['src/render/scene/battle-renderer.ts','src/render/effects/combat-audio-router.ts','tools/t01/presentation-repair-fixture.ts'],data:r}));
const previewAliases:Record<string,[string,string]>={'projection-birth':['phantom','cycle'],'projection-end':['phantom','expiry'],'recall-from':['auto_recall','cycle'],'recall-to':['recall_phantom','cycle'],rewind:['rewind','cycle'],capture:['capture','cycle'],evolve:['training_evolution','cycle'],reinforcement:['reinforcement','cycle'],expiry:['reinforcement','expiry'],'fort-deploy':['fortification','cycle'],heal:['sustain_heal','cycle']};
const gear=equipmentPreviewCases(equipmentCases as Case[]);
export const PRESENTATION_CASES:Case[]=[...baseCases,...rows.filter(r=>r.kind==='equipment').map(r=>{const [key,phase]=previewAliases[r.model],c=gear.find(c=>{const d=c.data as EquipmentPreviewData;return d.focusEffect===key&&d.previewPhase===phase&&c.race==='terran';});if(!c)throw Error('Missing native equipment preview '+key);return {...c,id:'presentation:'+r.key,name:r.name,group:'专项复核',actor:'equipment',action:r.key};})];
export type PresentationFixture={kind:string;model:string;actorId:number|null;targetId:number|null;body?:MissionBody;at:number;fired:boolean};
const stop=(u:Entity)=>{u.stoppedUntil=u.nextShotAt=u.abilityReady=u.specialReady=Infinity;u.moveSpeed=0;u.action='idle';return u;};
export function preparePresentation(w:World,c:Case):PresentationFixture{
 const {kind,model}=c.data as typeof rows[number];const f:PresentationFixture={kind,model,actorId:null,targetId:null,at:w.time+1,fired:false};
 const witness=stop(w.addUnit('marine','terran',50,50));witness.hp=witness.maxHp=1e8;
 if(kind==='mission'){
  const role=model==='hatchery'?'hive':['scv','drone','probe'].includes(model)?'worker':'repair',m={id:'presentation',kind:'repair',phase:'active',stage:10,age:0,bodyIds:[],enemyIds:[],queue:[],progress:0,completed:0,total:1,nextSpawn:Infinity,receipts:[]} as MissionRecord;w.missions.active=null;
  f.body=makeMissionBody(w,m,role,{x:0,z:0},100,model,role==='hive'?'zerg':'terran',.6);
  const attacker=stop(w.addUnit('zergling',role==='hive'?'terran':'zerg',30,30));attacker.mission={taskId:m.id,sourceId:0,noLoot:true,escortOnly:role==='worker',pulse:false,nextAction:0};f.targetId=attacker.id;
 }else if(kind==='fleet'){
  w.paused=false;w.missions.fleet.unlocked=true;const priorView=w.starship.battleView,box=[{x:-40,z:-40},{x:40,z:-40},{x:40,z:40},{x:-40,z:40}];w.starship.battleView=()=>({ground:box,air:box,occludedGround:[],occludedAir:[]});try{if(!callFleet(w,{x:0,z:0}))throw Error('舰队检查无法调用原生入口');}finally{w.starship.battleView=priorView;}w.tick++;w.time=w.tick/60;tickFleetCall(w);
  const ship=[...w.entities.values()].find(u=>u.mission?.fleet)!;ship.moveSpeed=0;f.actorId=ship.id;
  const t=stop(w.addUnit('roach','zerg',0,5));t.hp=t.maxHp=1e8;f.targetId=t.id;
 }else{
  const u=stop(w.addUnit(kind==='expiry'?(model==='hero-baneling'?'baneling':'zergling'):model==='fun-cocoon'?'queen':model==='fun-nydus'?'roach':'marine','terran',0,0));f.actorId=u.id;
  if(kind==='special'){u.modelKey=model;u.visualScale=model==='fun-cocoon'?1.5:1;}
  if(kind==='expiry'){u.temporary=true;u.temporaryKind=model as 'fun-brood'|'hero-baneling';u.temporaryUntil=w.time+1;}
 }
 w.hash.rebuild(w.entities.values());return f;
}
export function beforePresentationStep(w:World,f:PresentationFixture){
 if(f.kind==='fleet'){
  for(const id of w.missions.fleet.ships.keys()){const ship=w.entities.get(id);if(ship)ship.moveSpeed=0;}
  // Separate review of the native expiry boundary, after all three arrivals.
  // This sandbox timer precondition does not change the production lifetime.
  if(f.model==='expiry'&&!f.fired&&w.time>=2){f.fired=true;for(const s of w.missions.fleet.ships.values())s.expires=w.tick+60;}
  return;
 }
 if(f.fired||w.time<f.at)return;f.fired=true;
 const u=f.actorId===null?undefined:w.entities.get(f.actorId);
 if(f.kind==='mission'&&f.body){const enemy=w.entities.get(f.targetId!)!;enemy.mission!.escortOnly=f.body.role==='worker';w.hit(f.body,1e8,[],1,enemy.owner,0,1,enemy.id);}
 if(f.kind==='special'&&u)w.hit(u,1e8,[],1,'zerg',0,1);

}
