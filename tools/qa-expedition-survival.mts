import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {World} from '../src/simulation/world';
import {type Race,type FamilyId} from '../src/data/races';
import {familyLine,type ProductionLineId} from '../src/data/expedition-buildings';
import {MapTerrain} from '../src/simulation/movement/map-terrain';
import type {MapDefinition} from '../src/data/map-definition';
import type {Point,Entity} from '../src/simulation/types';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import type {EliteId} from '../src/data/elites';
import {writeArchive} from '../src/persistence/archive';

/** A bounded headless controller, not a win-rate or human-playability evaluation.
 * Only World.step advances time. Inputs, production controls and paid/free public
 * transactions are used; no hit/addUnit, stat/wallet/tech writes, timers or waves
 * are patched. It sees live World objects (more information than the player UI),
 * has no tactical planning, does not manually siege/cast, and has imperfect routing.
 */
const plans:Record<Race,{families:FamilyId[];actions:string[]}>= {
 terran:{families:['marine','marauder','tank','viking','medivac'],actions:['barracks_lab','factory','factory_lab','starport','engineering_bay','stim']},
 zerg:{families:['zergling','roach','queen','ravager','hydralisk'],actions:['roach_warren','lair','hatchery','hydralisk_den','evolution_chamber','zerg.carapace']},
 protoss:{families:['zealot','stalker','sentry','immortal','colossus'],actions:['cybernetics_core','robotics','robotics_bay','forge','protoss.ground_weapon','protoss.shields']},
};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z),round=(n:number)=>Math.round(n*100)/100;
const snapArmy=(w:World)=>w.allies().map(u=>({id:u.id,family:u.unitType,rank:u.rank,hp:round(u.hp),maxHp:round(u.maxHp),shield:round(u.shield??0),x:round(u.x),z:round(u.z)}));
export function survive(race:Race,map:'flat'|'original',seed=89241,controller:'v1'|'v2'|'v3'|'v4'|'v5'|'v6'|'v7'='v2',maxStages=6,onCheckpoint?:(stage:number,archive:string)=>void){
 assert.ok(Number.isInteger(maxStages)&&maxStages>=1&&maxStages<=18);
 const definition:MapDefinition|undefined=map==='original'?JSON.parse(fs.readFileSync('assets/private/maps/map-runtime.json','utf8')):undefined;
 const w=new World({race,seed,difficulty:'normal',waves:true,terrain:definition?new MapTerrain(definition):false,obstacles:[]}),plan=plans[race];let s!:NonNullable<World['expedition']>;
 const stages:unknown[]=[],samples:unknown[]=[],deaths:{stage:number;time:number;family:string;rank:number;position:Point}[]=[],seenDeaths=new Set<number>(),decisions:unknown[]=[];
 let index=0,nextThink=0,nextSample=0,lastMove=-Infinity,commands=0,refusedCommands=0,peakEnemies=0,peakBodies=0,completed=0,issue:string|null=null;
 const waiting=(family:FamilyId)=>s.ledger.filter(j=>j.family===family).reduce((n,j)=>n+j.passengers.filter(p=>p.status==='waiting').length,0);
 function configure(){
  if(race==='zerg'&&s.tech.lair)for(const f of s.facilities.slice(1))w.assignHatcherySequence(f.id,'zerg.evolution');
  for(const key of Object.keys(s.production)){const line=key as ProductionLineId,candidates=plan.families.filter(f=>familyLine(f)===line&&w.isFamilyAvailable(f)).sort((a,b)=>{
    const count=(f:FamilyId)=>w.familyUnits(f).length+waiting(f);return Number(count(a)>=goal(a))-Number(count(b)>=goal(b))||count(a)-count(b)||plan.families.indexOf(a)-plan.families.indexOf(b);
   });if(controller==='v7'&&line===familyLine(plan.families[0])&&w.allies().length<3){const basic=plan.families[0];if(candidates.includes(basic)){candidates.splice(candidates.indexOf(basic),1);candidates.unshift(basic);}}assert.equal(w.setProductionOutputs(line,candidates.slice(0,2)),true);}
 }
 function goal(f:FamilyId){return f===plan.families[0]?5:['medivac','queen','sentry'].includes(f)?1:w.stage<=2?2:3;}
 function production(){for(const p of Object.values(s.production))if(p)for(const f of p.outputs){const enabled=w.familyUnits(f).length+waiting(f)<goal(f);if(p.enabled[f]!==enabled)w.setProductionEnabled(f,enabled);}}
 function hold(){w.input={x:0,z:0};if(w.order)w.cancelOrder();}
 function move(point:Point){w.input={x:0,z:0};if(w.order&&(controller==='v5'||controller==='v6'||controller==='v7'||!w.order.arrived)&&distance(w.order.point,point)<1.2)return;if((controller==='v6'||controller==='v7')&&w.time-lastMove<.8&&w.order)return;commands++;if(!w.issueMove({x:point.x,z:point.z}))refusedCommands++;else lastMove=w.time;}
 function retreat(threat:Point,meters=4){const d=distance(w.anchor,threat)||1,away={x:(w.anchor.x-threat.x)/d,z:(w.anchor.z-threat.z)/d};for(const a of [0,.6,-.6,1.2,-1.2]){const dx=away.x*Math.cos(a)-away.z*Math.sin(a),dz=away.x*Math.sin(a)+away.z*Math.cos(a),p={x:w.anchor.x+dx*meters,z:w.anchor.z+dz*meters};if(!w.terrain||w.terrain.canOccupy(p,.9)){move(p);return;}}hold();}
 function think(){
 production();const allies=w.allies(),fighters=allies.filter(u=>u.unitType!=='medivac'&&u.unitType!=='science_vessel'),enemies=[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0),near=enemies.sort((a,b)=>distance(a,w.anchor)-distance(b,w.anchor))[0];
  const ranged=fighters.filter(u=>u.attackRange>=3),melee=fighters.filter(u=>u.attackRange<3),nearFighter=near?fighters.reduce<Entity|undefined>((a,u)=>!a||distance(u,near)<distance(a,near)?u:a,undefined):undefined;
  const bile=w.effects.find(e=>e.kind==='bile'&&e.owner==='zerg'&&distance(e.end,w.anchor)<e.radius+1.8);if(bile){retreat(bile.end,5);return;}
  if(controller==='v7'){
   if(near&&fighters.some(u=>w.canFireAt(u,near,1.5))){hold();return;}
   if(near&&distance(near,w.anchor)<9){const origin=nearFighter??w.anchor,range=ranged.length?Math.max(2,Math.min(...ranged.map(u=>u.attackRange))-.8):1,d=distance(origin,near)||1;move({x:near.x+(origin.x-near.x)/d*range,z:near.z+(origin.z-near.z)/d*range});return;}
  }
  if(controller==='v3'&&near&&nearFighter&&ranged.length&&distance(near,nearFighter)<3.5){retreat(near,5);return;}
  if(near&&nearFighter&&ranged.length>=Math.max(1,melee.length)&&distance(near,nearFighter)<(controller==='v2'?5.5:controller==='v6'?2.5:3.2)+near.unitRadius&&ranged.every(u=>u.weaponCooldown>.14||u.windup>0)){if(controller==='v6'&&distance(w.anchor,nearFighter)>3){hold();return;}retreat(near,controller==='v6'?2:3.5);return;}
  if(near?.unitType==='baneling'&&distance(near,w.anchor)<4&&ranged.length){retreat(near,5);return;}
  // A nearby fight must get quiet aiming frames; only approach if every attacker is out of reach.
  if(near&&distance(near,w.anchor)<11){if(fighters.some(u=>w.canFireAt(u,near,controller==='v2'?0:1.5))||controller==='v1'&&melee.length&&distance(near,w.anchor)<4){hold();return;}
   // v4 aims from the nearest fighter: a one-body melee party can lag behind
   // the command anchor on the far side of a landing pod.
   const origin=controller==='v4'||controller==='v5'||controller==='v6'?nearFighter??w.anchor:w.anchor,range=ranged.length?Math.max(2,Math.min(...ranged.map(u=>u.attackRange))-.5):1,d=distance(origin,near)||1;move({x:near.x+(origin.x-near.x)/d*range,z:near.z+(origin.z-near.z)/d*range});return;}
  const pod=w.pods.filter(p=>['falling','active','opening'].includes(p.status)).sort((a,b)=>(a.hp/a.maxHp-b.hp/b.maxHp)||distance(a,w.anchor)-distance(b,w.anchor))[0];
  const egg=[...w.economicTargets.values()].filter(e=>e.kind==='egg'&&e.status==='active').sort((a,b)=>distance(a,w.anchor)-distance(b,w.anchor))[0];
  const pickup=[...w.pickups,...w.rewardDrops].sort((a,b)=>distance(a,w.anchor)-distance(b,w.anchor))[0];
  const drone=[...w.economicTargets.values()].filter(e=>e.kind==='drone'&&e.status==='active').sort((a,b)=>distance(a,w.anchor)-distance(b,w.anchor))[0];
  const target=controller==='v7'?(pod??pickup??(fighters.length>=2?egg??drone:undefined)):pod&&(controller==='v2'||pod.hp/pod.maxHp<.6)?pod:egg??pod??pickup??drone;
  if(target&&distance(target,w.anchor)>.6)move(target);else hold();
 }
 s=w.expedition!;assert.equal(w.setDevelopmentTarget(plan.actions[0]),true);w.start();if(race==='zerg')w.setProductionOutputs('zerg.basic',['zergling','queen']);
 try{while(completed<maxStages&&w.phase!=='lost'&&w.phase!=='won'){
   if(w.expedition!.pendingReceipt){const r=s.pendingReceipt!,old=s.familySlots.find(f=>!plan.families.includes(f));if(old){const preview=w.previewFamilyReplacement(r.id,old);if(preview)w.commitFamilyReplacement(r.id,old,preview.revision);else {issue='receipt-no-valid-landing';break;}}else w.rejectIncomingBatch(r.id,w.revision);}
   if(w.phase==='reward'){
    completed=w.stage;const before={...w.wallet},desired=plan.actions[index],offer=(w.rewards as ExpeditionReward[]).find(r=>r.expeditionEffect.kind==='development'&&r.expeditionEffect.definitionId===desired),purchased=offer&&w.choose(offer.offerId);if(purchased)index++;
    const damaged=w.allies().filter(u=>u.hp/u.maxHp<.6).map(u=>u.id),repair=w.previewRepair(damaged);let repaired=false;if(repair&&repair.minerals<=w.wallet.minerals*.5&&repair.gas<=w.wallet.gas*.5)repaired=w.purchaseRepair(repair.id);
    w.setDevelopmentTarget(plan.actions[index]??null);configure();assert.equal(w.skipReward(),true);
    const score=(r:ExpeditionReward)=>r.expeditionEffect.kind==='hero'?100:r.expeditionEffect.kind==='elite'?90:r.expeditionEffect.kind==='card'?(r.expeditionEffect.effect==='cultivation'?80:r.expeditionEffect.effect==='weapon'?70:r.expeditionEffect.effect==='vitality'?60:30):40;
    const card=(w.rewards as ExpeditionReward[]).filter(r=>w.canChooseReward(r)).sort((a,b)=>score(b)-score(a))[0];assert.ok(card);
    const variant=card.expeditionEffect.kind==='elite'?`${card.expeditionEffect.family}.1` as EliteId:undefined;
    assert.equal(w.choose(card.offerId,variant),true);
    stages.push({stage:w.stage,time:round(w.time),walletBefore:before,walletAfter:{...w.wallet},desired,purchased:purchased?desired:null,repaired,repairPrice:repaired?repair:null,card:card.id,army:snapArmy(w),scvs:w.scvs,stats:{...w.stats},economy:structuredClone(w.economyTotals),orders:s.ledger.filter(j=>j.state!=='settled')});
    if(completed>=maxStages)break;assert.equal(w.skipReward(),true);if(onCheckpoint)onCheckpoint(w.stage,writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}));nextThink=w.time;continue;
   }
   if(w.time>=nextThink){nextThink=w.time+.2;think();decisions.push({time:round(w.time),stage:w.stage,goal:w.order?{...w.order.point}:null});}
   w.step();for(const u of w.entities.values())if(u.owner==='terran'&&u.hp<=0&&!seenDeaths.has(u.id)){seenDeaths.add(u.id);deaths.push({stage:w.stage,time:round(w.time),family:u.unitType,rank:u.rank,position:{x:u.x,z:u.z}});}
   peakEnemies=Math.max(peakEnemies,w.enemyCount());peakBodies=Math.max(peakBodies,w.allies().length);
   if(w.time>=nextSample||w.phase==='lost'){nextSample=w.time+10;const enemies=[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0);samples.push({stage:w.stage,time:round(w.time),phase:w.phase,army:snapArmy(w),enemies:w.enemyCount(),enemyUnits:enemies.map(u=>({id:u.id,family:u.unitType,hp:round(u.hp),x:round(u.x),z:round(u.z),guardianPod:u.guardianPod})),wallet:{...w.wallet},scvs:w.scvs,pods:w.pods.map(p=>({id:p.id,family:p.unitType,status:p.status,hp:round(p.hp),x:round(p.x),z:round(p.z),liveGuards:[...p.guardianIds].filter(id=>(w.entities.get(id)?.hp??0)>0).length})),anchor:{...w.anchor},order:w.order?{kind:w.order.kind,point:{x:w.order.point.x,z:w.order.point.z},arrived:w.order.arrived}:null,fighterState:w.allies().map(u=>{const near=enemies.reduce<Entity|undefined>((a,e)=>!a||distance(u,e)<distance(u,a)?e:a,undefined),internal=w as unknown as {navigation:Map<number,unknown>;detours:Map<number,unknown>;moveGoal:(u:Entity)=>Point};return {id:u.id,action:u.action,velocity:u.velocity,range:u.attackRange,target:u.attackTarget,nearest:near?.id??null,targetDistance:near?round(distance(u,near)):null,canFire:near?w.canFireAt(u,near,0):null,goal:internal.moveGoal(u),navigation:internal.navigation.get(u.id),detour:internal.detours.get(u.id)};}),stats:{...w.stats}});}
   assert.ok(w.time<(maxStages===18?1900:500),'simulation exceeded expected combat duration');
  }}catch(error){issue=error instanceof Error?error.stack??error.message:String(error);}
 const liveEnemies=[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0);assert.equal(Object.keys(w.runConfig?.frozenTalents.levels??{}).length,0);
 return {race,map,mapHash:definition?.source.sha256??null,seed,controller:'rescue-stutter-'+controller,completed,stage:w.stage,seconds:round(w.time),phase:w.phase,issue,commands,refusedCommands,peakEnemies,peakBodies,wallet:{...w.wallet},stats:{...w.stats},economy:w.economyTotals,alive:snapArmy(w),deaths,stages,samples,decisions,enemyRemainder:Object.fromEntries([...new Set(liveEnemies.map(u=>u.unitType))].map(f=>[f,liveEnemies.filter(u=>u.unitType===f).length])),unresolvedOrders:s.ledger.filter(j=>j.state!=='settled'),failureContext:w.phase==='lost'?{reason:'World reported zero surviving combat actors',recentDeaths:deaths.filter(d=>d.time>w.time-20),lastSamples:samples.slice(-3)}:null};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const map=process.argv.includes('--original')?'original':'flat',controller=process.argv.includes('--v7')?'v7':process.argv.includes('--v6')?'v6':process.argv.includes('--v5')?'v5':process.argv.includes('--v4')?'v4':process.argv.includes('--v3')?'v3':process.argv.includes('--v1')?'v1':'v2',results=[];
 const maxStages=process.argv.includes('--stages')?Number(process.argv[process.argv.indexOf('--stages')+1]):6;
 assert.ok(Number.isInteger(maxStages)&&maxStages>=1&&maxStages<=18);
 const requested=process.argv.includes('--races')?process.argv[process.argv.indexOf('--races')+1].split(','):['terran','zerg','protoss'];
 if(requested.some(race=>!['terran','zerg','protoss'].includes(race)))throw Error('Invalid race');
 const checkpointStages=process.argv.includes('--checkpoints')?process.argv[process.argv.indexOf('--checkpoints')+1].split(',').map(Number):[];
 if(checkpointStages.some(stage=>!Number.isInteger(stage)||stage<2||stage>18))throw Error('Invalid checkpoint stage');
 for(const race of requested as Race[]){const checkpoint=(stage:number,archive:string)=>{if(!checkpointStages.includes(stage))return;const dir=path.resolve('reports/local/natural-checkpoints');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,`${race}-${map}-${controller}-${stage}.json`),archive);};const result=survive(race,map,89241,controller,maxStages,checkpoint);results.push(result);console.log(JSON.stringify({race,map,controller,maxStages,completed:result.completed,failedAt:result.phase==='lost'?result.stage:null,time:result.seconds,issue:result.issue,kills:result.stats.kills,rescued:result.stats.rescued,workers:result.stats.scvsRescued,army:result.alive.length,wallet:result.wallet}));}
 const dir=path.resolve('reports/local');fs.mkdirSync(dir,{recursive:true});const suffix=requested.length===3?'':'-'+requested.join('-');fs.writeFileSync(path.join(dir,'expedition-survival-'+map+'-'+controller+(maxStages===6?'':'-stages'+maxStages)+suffix+'.json'),JSON.stringify({generatedAt:new Date().toISOString(),method:'Unmodified 60Hz World combat, 0 talents, seed 89241, input-only controller; no state grants or direct combat resolution. Bot sees all objects; does not establish human viability or win rate.',maxStages,results},null,2));if(results.some(r=>r.issue))process.exitCode=1;
}
