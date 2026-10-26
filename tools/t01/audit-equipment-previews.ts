import fs from 'node:fs/promises';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {DYNAMIC_CASES} from './catalogue';
import rawCases from './equipment.generated.json';
import {prepareEquipmentPreview,beforeEquipmentPreview} from './equipment-preview-runtime';
import {equipmentRecipe,type EquipmentPreviewData} from './equipment-preview-spec';
import {equipmentFixtureAccount,equipmentFixtureEffects,equipmentFixtureSnapshot} from './equipment-fixture';
import {displayModelKey,displayAssetModelKey} from '../../src/render/materials/elite-visual';
import {ASSETS} from '../../src/assets/manifest';
import {equipmentPresentationReceipts} from '../../src/simulation/starship/presentation';

// Selection is by semantic parameters, race, bound identity and lifecycle,
// never by a displayed name. Exact duplicate template/configurations retain
// their mapping but do not need a second identical fixed-step simulation.
const all=DYNAMIC_CASES.filter(c=>c.runner==='equipment'&&(c.data as EquipmentPreviewData).focusEffect),chosen=new Map<string,typeof all[number]>(),mapping:Record<string,string>={};
for(const c of all){const d=c.data as EquipmentPreviewData;const signature=process.env.T01_REPRESENTATIVE?d.focusEffect+':'+d.previewPhase+(d.focusEffect==='hero_orange'?':'+d.binding.hero+':'+d.template:''):JSON.stringify([d.race,d.binding,d.focusEffect,d.previewPhase,d.effects.map(e=>[e.key,e.values])]);if(!chosen.has(signature))chosen.set(signature,c);mapping[c.id]=chosen.get(signature)!.id;}
const classification=new Map<string,{dynamic:boolean;configurations:number}>();let configurations=0;
if(!process.env.T01_EFFECTS)for(const c of rawCases){const d=c.data,actual=equipmentFixtureEffects(equipmentFixtureAccount(d as never),d.race as never),expected=d.effects;
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('配置生效值不同：'+c.id);
 configurations++;for(const e of expected){const r=classification.get(e.key)??{dynamic:!!equipmentRecipe(e.key),configurations:0};r.configurations++;classification.set(e.key,r);}
}
const rows:Record<string,unknown>[]=[],filter=process.env.T01_EFFECTS?.split(','),shards=Number(process.env.T01_SHARDS??1),shard=Number(process.env.T01_SHARD??0);let candidate=0;
for(const c of chosen.values()){
 if(candidate++%shards!==shard)continue;
 const d=c.data as EquipmentPreviewData,key=d.focusEffect;if(filter&&!filter.includes(key))continue;
 const failures:string[]=[],check=(yes:unknown,message:string)=>{if(!yes)failures.push(message);};
 try{
  const w=new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)}),f=prepareEquipmentPreview(w,c),initial=f.initial,initialMembers=new Set(w.starship.members.keys()),initialIds=new Set(w.entities.keys());
  let maximumProjections=0,maximumTemporary=0,maximumMines=0,maximumForts=0,maximumBurns=0,maximumBarrier=0,maximumTalentImpacts=0,maximumStrikes=0,maximumWeakness=0,maximumPrecisionCooldown=0,actorShots=0;
  const receipts=new Set<string>(),details=new Set<string>(),events=new Set<string>(),origins=new Set<string>(),newMembers=new Set<number>(),temporaries=new Set<number>(),models=new Set<string>(),numbers=new Map<string,number>(),positions:{at:number;x:number;z:number}[]=[],bodyHp=new Map<number,number>();
  const collect=()=>{
   for(const r of equipmentPresentationReceipts(w)){receipts.add(r.kind);if(r.detail)details.add(r.detail);}
   for(const e of w.visualEvents)events.add(e.kind);
   for(const [id,m]of w.starship.members){if(m.origin)origins.add(m.origin);if(!initialMembers.has(id))newMembers.add(id);}
   for(const a of w.allies()){const model=displayModelKey(a);if(!models.has(model)){models.add(model);check(ASSETS.has('model.'+displayAssetModelKey(model)),'缺少实际模型：'+model);}if(a.temporary){temporaries.add(a.id);}bodyHp.set(a.id,Math.min(bodyHp.get(a.id)??Infinity,a.hp));}
   const actor=w.entities.get(f.actorId);if(actor){actorShots=Math.max(actorShots,actor.shotSequence??0);if(positions.length===0||Math.abs(actor.x-positions.at(-1)!.x)+Math.abs(actor.z-positions.at(-1)!.z)>.01)positions.push({at:w.time,x:actor.x,z:actor.z});}
   for(const [name,v]of w.starship.numbers)numbers.set(name,Math.max(numbers.get(name)??-Infinity,v));
   maximumProjections=Math.max(maximumProjections,w.starship.projections.size);maximumTemporary=Math.max(maximumTemporary,w.allies().filter(a=>a.temporary).length);maximumMines=Math.max(maximumMines,w.expedition.support.mines.length);maximumForts=Math.max(maximumForts,w.starship.forts.size);maximumBurns=Math.max(maximumBurns,w.starship.burnZones.length+w.starship.combat.burns.length);maximumBarrier=Math.max(maximumBarrier,w.starship.barriers.size);maximumTalentImpacts=Math.max(maximumTalentImpacts,w.talentSupportImpacts.length);maximumStrikes=Math.max(maximumStrikes,w.starship.strikes.length);maximumWeakness=Math.max(maximumWeakness,w.starship.combat.weakness.size);maximumPrecisionCooldown=Math.max(maximumPrecisionCooldown,...[...w.starship.combat.precision.values()].map(p=>p.cooldown));
  };
  collect();for(let n=0;n<Math.round((c.seconds??12)*60);n++){beforeEquipmentPreview(w,f);w.step();collect();if(w.phase!=='battle')break;}
  const current=equipmentFixtureSnapshot(w),effect=d.effects.find(e=>e.key===key)!,num=(prefix:string)=>[...numbers].some(([k,v])=>k.startsWith(prefix)&&v>0),r=(kind:string)=>receipts.has(kind),event=(kind:string)=>events.has(kind),origin=(name:string)=>origins.has(name),cycled=(name=key)=>[...w.starship.cycles].some(([k,v])=>k.endsWith(':'+name)&&Number.isFinite(v)&&v>.75),body=(id:number)=>w.entities.get(id),changedRank=initial.bodies.some(a=>current.bodies.find(b=>b.id===a.id)?.rank!==a.rank),newBody=current.bodies.filter(a=>!initialIds.has(a.id));
  check(f.fired,'未进入触发阶段');check(w.phase==='battle','检测场景提前离开战斗');
  if(['split','bounce','cleave','pierce','double_attack'].includes(key))check(r('derived-hit')&&details.has(key==='double_attack'?'double':key),'缺少对应派生命中');
  else if(['moving_extra','hold_volley'].includes(key))check(r('derived-hit'),'缺少额外攻击命中');
  else if(key==='overload'||key==='overload_chain')check(r('derived-hit')&&num('overload-ready')&&(key==='overload'||event('death')),'过载或击杀链未触发');
  else if(key==='phantom'||key==='recall_phantom'||key==='phase')check(maximumProjections>0&&r('projection-birth'),'没有真实幻象实体');
  else if(key==='auto_recall')check(r('recall-from')&&r('recall-to')&&positions.some(p=>Math.hypot(p.x,p.z)<10),'没有实际召回位移');
  else if(key==='capture')check(r('capture')&&origin('capture')&&newMembers.size>0,'未捕获实际敌军');
  else if(['true_burn','burn_area','burn_trail','incendiary'].includes(key))check(maximumBurns>0,'没有真实燃烧区域或持续伤害');
  else if(key==='burn_execute')check(event('death')&&!body(f.targetId)?.hp,'灼烧累计未处决目标');
  else if(key==='execute'||key==='execute_chain')check(num('execute-ready')&&event('death'),'处决未触发');
  else if(key==='crit_pursuit')check(num('pursuit:'),'未触发暴击追击');
  else if(key==='precision_crit')check(maximumPrecisionCooldown>.75,'未消耗蓄积暴击');
  else if(key==='weakness')check(maximumWeakness>0,'未建立弱点解析状态');
  else if(key==='cluster')check(event('weapon-area'),'未触发原生范围攻击');
  else if(key==='bombardment')check(maximumStrikes>0&&event('support-impact'),'轰击未落地');
  else if(key==='periodic_trap')check(maximumMines>0&&cycled(),'未生成原生陷阱');
  else if(key==='reinforcement'||key==='reinforcement_elite'||key==='egg_reinforcement')check(newMembers.size>0&&maximumTemporary>0&&r('reinforcement')&&(key!=='reinforcement_elite'||newBody.some(b=>b.eliteId)||f.observed.some(o=>(o.members as any[]).some(m=>m.origin==='reinforcement'))),'增援实体未生成');
  else if(key==='direction_reinforcement'||key==='fleet_reinforcement')check(origin(key)&&newMembers.size>0&&cycled(),'方向或舰队增援未生成');
  else if(key==='drop_pod'||key==='drop_elite')check(maximumStrikes>0&&origin('drop_pod')&&newMembers.size>0,'空投实体未生成');
  else if(key==='sustain_heal')check(r('heal')&&current.bodies.find(b=>b.id===f.patientId)!.hp>initial.bodies.find(b=>b.id===f.patientId)!.hp,'持续战斗治疗未生效');
  else if(key==='joint_support')check(maximumTalentImpacts>0&&cycled(),'联合支援未提交原生命中');
  else if(key==='volley')check(cycled()&&actorShots>0,'齐射周期未消耗');
  else if(key==='elite_training')check(r('growth')&&changedRank&&cycled(),'精英训练未升级');
  else if(key==='opening_count')check(origin('opening')||initial.bodies.filter(b=>b.hp>0&&!b.heroId&&!b.eliteId).length>=effect.values[0],'开局数量不足');
  else if(key==='opening_elite')check(initial.bodies.some(b=>b.eliteId),'开局精英不存在');
  else if(key==='opening_hero')check(!!w.heroEntity(d.binding.hero!),'正式英雄不存在');
  else if(d.recipe==='opening')check(origin(key==='ultralisk_elite'?'opening_ultralisk':key),'开局原生来源实体不存在');
  else if(key==='moving_fire')check(positions.length>2&&actorShots>0,'移动中没有开火');
  else if(key==='light_assault')check(num('assault-until:'),'持续移动后的突击未触发');
  else if(key==='share_damage')check(initial.bodies.some(a=>a.id!==f.actorId&&(bodyHp.get(a.id)??a.hp)<a.hp),'没有向同类型友军分摊伤害');
  else if(key==='iron_counter'||key==='wall_counter')check(num(key+':')&&event('support-pulse'),'反击未触发');
  else if(key==='adrenaline')check(num('dynamic-speed:'),'受伤后未切换攻击速率');
  else if(key==='konstant')check(r('boost-start')&&num('konstant-ready')&&(d.previewPhase!=='expiry'||r('boost-end')),'康斯坦丁强化阶段不完整');
  else if(key==='rescue')check(r('recall-to')&&event('death')&&(body(f.actorId)?.hp??0)>0,'死亡后没有真实救援');
  else if(key==='insurance')check(num('insurance:')&&(body(f.actorId)?.hp??0)>0,'保险没有保留真实单位');
  else if(key==='last_stand')check(num('rage-until:')&&(body(f.actorId)?.hp??0)>0,'濒死保护未生效');
  else if(key==='worker_rescue'||key==='rescue_double')check(w.workers-initial.workers>=2,'工人救援增员未生效');
  else if(key==='rescue_rank')check(newBody.some(b=>b.rank>1)&&r('growth'),'救援士兵没有升级');
  else if(key==='rescue_elite')check(newMembers.size>0&&origin('rescue_elite'),'救援精英不存在');
  else if(key==='kill_training'||key==='hero_growth'||key==='drone_hunter'||key==='drone_mentor')check(r('growth')&&changedRank,'真实成长未生效');
  else if(key==='pack_kill')check(newMembers.size>0&&origin('opening_pack'),'击杀没有实际补充虫群');
  else if(key==='devour')check(num('devour-growth'),'吞噬资源没有产生增益');
  else if(key==='bounty'||key==='bounty_hero')check(!!w.starship.bounty?.issued&&(key==='bounty'||w.starship.bounty.phase==='hero'),'拾取未得到赏金单位或英雄');
  else if(key==='hero_orange')check(event('skill-launch'),'绑定英雄没有实际施法');
  else if(key==='manual_reset')check(r('cooldown-reset')&&w.dashReady<w.time,'手动能力没有刷新');
  else if(key==='out_of_combat_shield'||key==='shield_rebuild')check(d.race==='protoss'?current.bodies.find(b=>b.id===f.actorId)!.hp>initial.bodies.find(b=>b.id===f.actorId)!.hp:maximumBarrier>0&&(key!=='shield_rebuild'||event('shield-break')),'护盾或种族替代治疗未生效');
  else if(['swarm','plague','behemoth'].includes(key))check(origin(key)&&maximumTemporary>0,'高级临时军团不存在');
  else if(key==='yamato_support')check(event('skill-launch')&&event('skill-impact'),'大和支援没有原生施法与命中');
  else if(key==='dominance')check(num('dominance-phase')&&num('dominance-fire'),'移动相位和后续开火阶段不完整');
  else if(d.recipe==='fort')check(maximumForts>0&&r('fort-deploy'),'原生建筑不存在');
  else if(key==='training_evolution'||key==='paid_elite')check(r('evolve')&&current.bodies.some(b=>b.eliteId),'没有实际转化精英');
  else if(key==='ravager_evolution')check(initial.bodies.some(b=>b.unitType==='ravager')&&event('bile-impact'),'进化破坏者未喷吐');
  else if(key==='rewind')check(w.starship.life.rewindUsed&&r('rewind')&&current.bodies.filter(b=>initialIds.has(b.id)&&b.hp>0).length===initial.bodies.filter(b=>b.hp>0).length,'全队回溯身份不一致');
  else check(false,'未定义结果断言：'+key);
  if(d.previewPhase!=='cycle'&&key!=='konstant'){check(f.ended,'未执行生命周期边界');check(temporaries.size>0,'生命周期没有临时实体');check([...temporaries].every(id=>(body(id)?.hp??0)<=0),'结束后残留活临时实体');if(['phantom','recall_phantom','phase'].includes(key))check(w.starship.projections.size===0,'结束后残留幻象登记');}
  rows.push({id:c.id,key,race:d.race,phase:d.previewPhase,template:d.template,binding:d.binding,triggered:f.fired,verified:failures.length===0,failures:[...new Set(failures)],evidence:{receipts:[...receipts],details:[...details],events:[...events],origins:[...origins],newMembers:newMembers.size,models:[...models],maximumProjections,maximumTemporary,maximumMines,maximumForts,maximumBurns,maximumTalentImpacts,maximumPrecisionCooldown,aliveTemporaryAtEnd:[...temporaries].filter(id=>(body(id)?.hp??0)>0).length}});
 }catch(error){rows.push({id:c.id,key,race:d.race,binding:d.binding,triggered:false,verified:false,failures:[String(error)]});}
 if(rows.length%25===0)console.log(JSON.stringify({done:rows.length,selected:chosen.size,failed:rows.filter(r=>!r.verified).length}));
}
const report={configurations,classification:Object.fromEntries(classification),previewCases:all.length,representativeCases:chosen.size,mapping,triggered:rows.filter(r=>r.triggered).length,verified:rows.filter(r=>r.verified).length,failed:rows.filter(r=>!r.verified),rows};
await fs.mkdir('.cache/t01-feedback-repairs',{recursive:true});await fs.writeFile('.cache/t01-feedback-repairs/equipment-audit'+(shards>1?'-'+shard:'')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify({configurations,total:rows.length,triggered:report.triggered,verified:report.verified,failed:report.failed.map(r=>({id:r.id,failures:r.failures}))}));if(report.failed.length)process.exitCode=1;
