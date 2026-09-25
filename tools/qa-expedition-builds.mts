import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {World} from '../src/simulation/world';
import {THREE_RACE_RULES,type Race,type FamilyId} from '../src/data/races';
import type {EliteId} from '../src/data/elites';
import {DEVELOPMENT,FAMILY_REQUIREMENTS,developmentPrice,familyLine,type ProductionLineId} from '../src/data/expedition-buildings';
import {productionQuote} from '../src/simulation/expedition-production';
import {tickCarrierSubsystem} from '../src/simulation/combat/carriers';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';

/** Economic reachability, not combat automation or a claim of a playable clear.
 * Zero talents, Normal, real passive/clear/card income, real 60 Hz production and
 * public draft/output/receipt transactions. No wallet, technology, rank or roster
 * assignments. Perfect delivery rescue is an explicit scenario assumption: guards
 * are resolved through hit(), their drops are NOT collected, and no battle loss,
 * worker rescue, drone income or ambient kill income is simulated.
 */
export interface BuildPlan {id:string;name:string;race:Race;families:FamilyId[];actions:string[];}
export const BUILD_PLANS:BuildPlan[]=[
 {id:'T1',name:'生化机动',race:'terran',families:['marine','marauder','reaper','viking','medivac'],actions:['barracks_lab','factory','starport','engineering_bay','stim','terran.infantry','terran.infantry_armor','armory','terran.air_weapon','terran.air_armor']},
 {id:'T2',name:'步坦推进',race:'terran',families:['marine','marauder','tank','viking','medivac'],actions:['factory','factory_lab','barracks_lab','starport','engineering_bay','terran.infantry','armory','terran.vehicle','terran.vehicle_armor','terran.air_weapon']},
 {id:'T3',name:'机械重装',race:'terran',families:['hellion','tank','thor','viking','science_vessel'],actions:['factory','factory_lab','starport','armory','science_facility','terran.vehicle','terran.vehicle_armor','terran.air_weapon','terran.air_armor','support_efficiency']},
 {id:'Z1',name:'虫群冲击',race:'zerg',families:['zergling','baneling','roach','hydralisk','queen'],actions:['baneling_nest','roach_warren','lair','hatchery','hydralisk_den','evolution_chamber','zerg.missile','zerg.carapace','hydra_range','ling_speed']},
 {id:'Z2',name:'地面阵地',race:'zerg',families:['roach','ravager','hydralisk','lurker','queen'],actions:['roach_warren','lair','hatchery','hydralisk_den','lurker_den','evolution_chamber','zerg.missile','zerg.carapace','hydra_range','lurker_deploy']},
 {id:'Z3',name:'空地重型',race:'zerg',families:['roach','ultralisk','mutalisk','corruptor','queen'],actions:['roach_warren','lair','hatchery','spire','hatchery','hive','ultralisk_cavern','evolution_chamber','zerg.carapace','zerg.flyer_weapon']},
 {id:'P1',name:'护盾机械',race:'protoss',families:['zealot','stalker','sentry','immortal','colossus'],actions:['cybernetics_core','robotics','robotics_bay','forge','protoss.ground_weapon','protoss.shields','protoss.ground_armor','colossus_range','protoss.ground_weapon','protoss.shields']},
 {id:'P2',name:'灵能范围',race:'protoss',families:['zealot','stalker','sentry','high_templar','immortal'],actions:['cybernetics_core','twilight_council','templar_archives','robotics','storm','forge','protoss.ground_weapon','protoss.shields','protoss.ground_armor','protoss.ground_weapon']},
 {id:'P3',name:'舰队护航',race:'protoss',families:['zealot','sentry','phoenix','void_ray','carrier'],actions:['cybernetics_core','stargate','fleet_beacon','forge','protoss.shields','protoss.air_weapon','protoss.air_armor','protoss.shields','protoss.air_weapon','protoss.ground_armor']},
];
const seeds=[7,271,89241],dt=1/60;
const round=(v:number)=>Math.round(v*100)/100;
const money=(p:{minerals:number;gas:number})=>({minerals:round(p.minerals),gas:round(p.gas)});
type Payment={minerals:number;gas:number};
interface StageRecord {stage:number;walletBefore:Payment;walletAfter:Payment;action:string|null;actionCost:Payment|null;actionBlocked:string|null;card:string|null;outputs:Record<string,FamilyId[]>;stopped:FamilyId[];bodyCount:number;formedFamilies:number;unlockedFamilies:number;roster:{family:FamilyId;count:number;ranks:number[]}[];heroes:number;paidOrders:{family:FamilyId;state:string;remaining:number;waiting:number}[];income:unknown;spending:unknown;}
export function simulateBuild(plan:BuildPlan,seed:number,strategy:'development-first'|'formation-first'='formation-first'){
 const w=new World({rulesVersion:THREE_RACE_RULES,race:plan.race,seed,difficulty:'normal',waves:false,terrain:false,obstacles:[]});
 const s=w.expedition!,initialWallet={...w.wallet},records:StageRecord[]=[],arrivals:Record<string,{stage:number;second:number}>={},replacements:unknown[]=[],transitions:unknown[]=[];
 let actionIndex=0,fullyFormedAt:number|null=null,full25At:number|null=null;
 const pending=(family:FamilyId)=>s.ledger.filter(j=>j.family===family).reduce((n,j)=>n+j.passengers.filter(p=>p.status==='waiting').length,0);
 const alive=(family:FamilyId)=>w.familyUnits(family).length;
 const goalCount=(family:FamilyId)=>!plan.families.includes(family)?1:plan.families.every(f=>alive(f)>0)?w.stage>=16?5:w.stage>=13?3:2:1;
 const nextPrice=()=>{const d=DEVELOPMENT.find(d=>d.id===plan.actions[actionIndex]&&d.race===plan.race);return d?developmentPrice(d,s.tech[d.id]??0):{minerals:0,gas:0};};
 function configure(){
  if(plan.race==='zerg'){
   const required:ProductionLineId[]=['zerg.basic',...(s.tech.lair&&plan.families.some(f=>familyLine(f)==='zerg.evolution')?['zerg.evolution' as const]:[]),...(s.tech.spire&&plan.families.some(f=>familyLine(f)==='zerg.air')?['zerg.air' as const]:[])];
   for(let i=0;i<s.facilities.length;i++){const facility=s.facilities[i],line=required[Math.min(i,required.length-1)];if(facility.line!==line)w.assignHatcherySequence(facility.id,line);}
  }
  for(const key of Object.keys(s.production)){
   const line=key as ProductionLineId,old=s.production[line]!.outputs;
   const candidates=plan.families.filter(f=>familyLine(f)===line&&w.isFamilyAvailable(f)).sort((a,b)=>{
    const ac=alive(a)+pending(a),bc=alive(b)+pending(b);return Number(ac>=goalCount(a))-Number(bc>=goalCount(b))||ac-bc||plan.families.indexOf(a)-plan.families.indexOf(b);
   });
   if(!candidates.length)candidates.push(...s.familySlots.filter(f=>familyLine(f)===line&&w.isFamilyAvailable(f)));
   const outputs=candidates.slice(0,2);assert.equal(w.setProductionOutputs(line,outputs),true);
   if(JSON.stringify(old)!==JSON.stringify(outputs))transitions.push({stage:w.stage,line,from:old,to:outputs});
  }
 }
 function manageProduction(){
  const reserve=nextPrice();
  for(const p of Object.values(s.production))if(p)for(const f of p.outputs){
   const q=productionQuote(w,f),quantity=f==='zergling'?Math.min(2,goalCount(f)-alive(f)-pending(f)):1;
   const need=alive(f)+pending(f)<goalCount(f);
   // Save for the next marked development before discretionary extra bodies.
   const discretionary=alive(f)>0;
   const affordableReserve=!discretionary||w.wallet.minerals-q.minerals*quantity>=reserve.minerals&&w.wallet.gas-q.gas*quantity>=reserve.gas;
   const enabled=need&&affordableReserve;
   if(p.enabled[f]!==enabled)assert.equal(w.setProductionEnabled(f,enabled),true);
  }
 }
 function resolveDeliveryAssumption(){
  for(const u of w.entities.values())if(u.owner==='zerg'&&u.hp>0)w.hit(u,u.maxHp+1000,[],1,'terran',0,1);
  w.updatePods();
  const request=s.pendingReceipt;if(request){const old=s.familySlots.find(f=>!plan.families.includes(f));assert.ok(old,`unexpected sixth family ${request.family}`);const preview=w.previewFamilyReplacement(request.id,old);assert.ok(preview);const log={stage:w.stage,at:round(w.time),...preview};assert.equal(w.commitFamilyReplacement(request.id,old,preview.revision),true);replacements.push(log);}
  for(const f of plan.families)if(alive(f)&&!arrivals[f])arrivals[f]={stage:w.stage,second:round(w.stageElapsed)};
  if(fullyFormedAt===null&&plan.families.every(f=>alive(f)>0))fullyFormedAt=w.stage;
  if(full25At===null&&plan.families.every(f=>alive(f)===5))full25At=w.stage;
  for(const [id,u] of w.entities)if(u.hp<=0&&u.deadAt!==null&&w.time-u.deadAt>1.5)w.entities.delete(id);
 }
 assert.equal(w.setDevelopmentTarget(plan.actions[0]),true);w.start();
 for(let stage=1;stage<=17;stage++){
  assert.equal(w.stage,stage);const frames=Math.round(w.duration/dt);
  for(let frame=0;frame<frames;frame++){
   w.time+=dt;w.stageElapsed+=dt;w.tick++;w.updateEconomy(dt);manageProduction();w.updateProduction(dt);tickCarrierSubsystem(w,dt);resolveDeliveryAssumption();
  }
  const before={...w.wallet};w.endStage();assert.equal(w.phase,'reward');assert.equal(w.rewardRound,'building');const target=plan.actions[actionIndex];
  let action:string|null=null,actionCost:Payment|null=null,actionBlocked:string|null=null;
  const deferDeepening=strategy==='formation-first'&&plan.families.every(f=>FAMILY_REQUIREMENTS[f].every(id=>(s.tech[id]??0)>0))&&plan.families.some(f=>alive(f)===0);
  if(target&&deferDeepening)actionBlocked=`save-for-first-bodies:${target}`;
  else if(target){const offer=(w.rewards as ExpeditionReward[]).find(r=>r.expeditionEffect.kind==='development'&&r.expeditionEffect.definitionId===target);
   if(offer){if(w.wallet.minerals>=offer.minerals&&w.wallet.gas>=offer.gas){assert.equal(w.choose(offer.offerId),true);action=target;actionCost={minerals:offer.minerals,gas:offer.gas};actionIndex++;}else actionBlocked=`funds:${target}:${offer.minerals}/${offer.gas}`;}
   else actionBlocked=`prerequisite-or-target:${target}`;
  }
  assert.equal(w.setDevelopmentTarget(plan.actions[actionIndex]??null),true);configure();assert.equal(w.skipReward(),true);assert.equal(w.rewardRound,'random');
  const score=(r:ExpeditionReward)=>r.expeditionEffect.kind==='hero'?100:r.expeditionEffect.kind==='resource'&&actionIndex<plan.actions.length?90:r.expeditionEffect.kind==='elite'?80:r.expeditionEffect.kind==='card'?(r.expeditionEffect.effect==='cultivation'?70:r.expeditionEffect.effect==='weapon'?60:40):0;
  const cards=(w.rewards as ExpeditionReward[]).filter(r=>w.canChooseReward(r)).sort((a,b)=>score(b)-score(a));const card=cards[0];assert.ok(card);
  const variant=card.expeditionEffect.kind==='elite'?`${card.expeditionEffect.family}.1` as EliteId:undefined;
  assert.equal(w.choose(card.offerId,variant),true,`claim ${plan.id}/${seed}/stage${stage}: ${card.id} (${card.expeditionEffect.kind})`);
  const roster=s.familySlots.map(f=>({family:f,count:alive(f),ranks:w.familyUnits(f).map(u=>u.rank)}));
  records.push({stage,walletBefore:money(before),walletAfter:money(w.wallet),action,actionCost,actionBlocked,card:card.id,outputs:Object.fromEntries(Object.entries(s.production).map(([id,p])=>[id,[...p!.outputs]])),stopped:s.familySlots.filter(f=>!s.production[familyLine(f)]?.outputs.includes(f)||s.production[familyLine(f)]?.enabled[f]===false),bodyCount:roster.reduce((n,f)=>n+f.count,0),formedFamilies:plan.families.filter(f=>alive(f)>0).length,unlockedFamilies:plan.families.filter(f=>w.isFamilyAvailable(f)).length,roster,heroes:w.heroes.size,paidOrders:s.ledger.filter(j=>j.state!=='settled').map(j=>({family:j.family,state:j.state,remaining:round(j.remaining),waiting:j.passengers.filter(p=>p.status==='waiting').length})),income:{passive:money(w.economyTotals.passive),clear:money(w.economyTotals.clear),cards:money(w.economyTotals.cards)},spending:{production:money(w.economyTotals.production),development:money(w.economyTotals.purchases)}});
  assert.equal(w.skipReward(),true);assert.equal(s.draftHistory.length,stage);assert.equal(w.stage,stage+1);
 }
 const totals=w.economyTotals;
 for(const kind of ['minerals','gas'] as const){const expected=initialWallet[kind]+totals.passive[kind]+totals.clear[kind]+totals.cards[kind]+totals.drops[kind]+s.refunds[kind]-totals.production[kind]-totals.purchases[kind]-(kind==='minerals'?totals.rerolls:0);assert.ok(Math.abs(expected-w.wallet[kind])<1e-6,`wallet conservation ${plan.id}/${seed}/${kind}`);}
  assert.equal(totals.drops.minerals,0);assert.equal(totals.drops.gas,0);assert.equal(w.scvs,0);assert.equal(s.draftHistory.length,17);assert.ok(Object.keys(w.runConfig?.frozenTalents.levels??{}).length===0);assert.ok(s.familySlots.length<=5);
 return {id:plan.id,name:plan.name,race:plan.race,seed,strategy,scenario:'guaranteed-income-perfect-rescue',zeroTalents:true,windows:17,combatSeconds:round(w.time),target:plan.families,fullyFormedAt,full25At,arrivals,actionsBought:actionIndex,actionCount:plan.actions.length,finalWallet:money(w.wallet),totals,refunds:s.refunds,replacements,transitions,records};
}
export function runBuildMatrix(strategy:'development-first'|'formation-first'='formation-first'){return BUILD_PLANS.flatMap(plan=>seeds.map(seed=>simulateBuild(plan,seed,strategy)));}
function report(results:ReturnType<typeof runBuildMatrix>){
 const lines=['# 九构筑经济可达性记录','',`策略版本：${results[0]?.strategy}。`,'', '模型：普通难度、0 天赋、只计真实被动收入／固定结算／免费强化收入。真实生产付款、训练时间、空投落地与接收事务；17 个关间。假设完美救援运输且无战损，不计守军／波次掉落、虫卵工人、工蜂收入。**这不是战斗通关或真人时长验证。**','', '策略：标记并购买列出的建筑路径；每条产线最多两个产出，优先尚未成形的家族；额外身体让位于下一项建筑预算。formation-first 在全部配方前置已具备、五槽尚缺首次到场时暂停深化，先支付缺席家族的第一人；development-first 保持购买既定深化路径。免费卡优先英雄，其次缺钱时资源；无购买刷新。每个家族至少一名在场记为五槽成形，25 人另列。','', '| 构筑 | 种子 | 五槽成形关 | 25人关 | 6关：家族/身体/矿气 | 9关 | 12关 | 15关 | 17窗后矿气 | 动作数 | 换组 |','| --- | ---: | ---: | ---: | --- | --- | --- | --- | --- | ---: | ---: |'];
 for(const r of results){const m=(stage:number)=>{const s=r.records[stage-1];return `${s.formedFamilies}/5 · ${s.bodyCount}人 · ${s.walletAfter.minerals}/${s.walletAfter.gas}`;};lines.push(`| ${r.id} ${r.name} | ${r.seed} | ${r.fullyFormedAt??'未成'} | ${r.full25At??'未满'} | ${[6,9,12,15].map(m).join(' | ')} | ${r.finalWallet.minerals}/${r.finalWallet.gas} | ${r.actionsBought}/${r.actionCount} | ${r.replacements.length} |`);}
 lines.push('', '完整逐关动作、付款、生产／停产、培养、到场时间、换组退款与损失记录见同名 JSON。钱包逐局按收入＋退款－支出守恒校验；未直接赋钱、科技、兵员或等级。', '');return lines.join('\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const strategy=process.argv.includes('--development-first')?'development-first':'formation-first',results=runBuildMatrix(strategy),dir=path.resolve('reports/local'),basename=`expedition-builds-${strategy}`;fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,basename+'.json'),JSON.stringify({generatedAt:new Date().toISOString(),results},null,2));fs.writeFileSync(path.join(dir,basename+'.md'),report(results));console.log(report(results));
}
