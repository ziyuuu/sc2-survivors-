// Read-only art fixture export. This does not instantiate World or mutate game saves.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {DEVELOPMENT,PRODUCTION_LINES,developmentPrice,seatRecipe,familyLine} from '../../src/data/expedition-buildings.ts';
import {FAMILIES_BY_RACE,familyRace} from '../../src/data/races.ts';
import {SC2_UNITS} from '../../src/data/sc2-units.ts';
import {SOURCE_UNIT_DETAILS} from '../../src/data/expansion-units.ts';
import {CAMPAIGN_SCIENCE_VESSEL} from '../../src/data/campaign-science-vessel.ts';
import {ALL_HERO_IDS,HEROES,heroRevivalCost} from '../../src/data/heroes.ts';
import {ELITES} from '../../src/data/elites.ts';
import {UNIQUE_SUPPORT} from '../../src/data/unique-support.ts';
import {inspectReinforcementPool,EXPEDITION_CARD_DEFINITIONS} from '../../src/simulation/progression/expedition-drafts.ts';
import {newExpedition} from '../../src/simulation/expedition-state.ts';
import {TEAM_CARD_VALUES} from '../../src/simulation/progression/team-cards.ts';
import {supplyPrice,supplyTier} from '../../src/simulation/progression/supply-cards.ts';

const root=new URL('./',import.meta.url),project=new URL('../../',root);
const races=['terran','zerg','protoss'],qualities=['white','green','blue','purple','orange'],ranks=['','I','II','III','IV','V'];
const costs=[[50,0],[90,20],[150,50],[225,90],[325,140]],percent=n=>`${Math.round(n*1000)/10}%`;
const cards=[],add=c=>cards.push({families:[],requirements:[],...c});
const familyName=f=>SC2_UNITS[f].zh;
const buildingIcons={barracks:'building.barracks',factory:'building.factory',starport:'building.starport'};
const skillIcons={stim:'tech.stim',shield:'tech.shield',infernal:'tech.infernal',support_efficiency:'tech.heal',ling_speed:'tech.boost',bane_speed:'tech.boost',roach_speed:'tech.boost',hydra_range:'tech.attack',lurker_deploy:'tech.siege',charge:'tech.boost',glaives:'tech.attack',blink:'tech.boost',storm:'tech.bile',colossus_range:'tech.attack',cloak:'tech.shield'};
const skillCopy={stim:['打得更快，顶住这波。','解锁兴奋剂。'],shield:['盾牌举起，继续推进。','陆战队员获得战斗盾。'],infernal:['让火焰烧穿前线。','恶火获得燃烧强化。'],support_efficiency:['伤员和机械，都交给后勤。','提高科学球的医修效率。'],ling_speed:['追上猎物，撕开防线。','提高跳虫移动速度。'],bane_speed:['滚向敌阵，留下一片酸海。','提高爆虫移动速度。'],roach_speed:['厚甲也能跑得飞快。','提高蟑螂移动速度。'],hydra_range:['让脊刺先一步命中。','提高刺蛇攻击射程。'],lurker_deploy:['入地更快，伏击更狠。','缩短潜伏者部署时间。'],charge:['撞进敌阵。','狂热者获得冲锋。'],glaives:['光刃连击，迅速清场。','提高使徒攻击速度。'],blink:['换个位置，再开火。','追猎者获得闪烁。'],storm:['让灵能风暴席卷战场。','高阶圣堂武士获得灵能风暴。'],colossus_range:['在敌军射程之外焚烧。','提高巨像攻击射程。'],cloak:['消失在雷达之外。','女妖获得隐形装置。']};
for(const d of DEVELOPMENT){
 const line=PRODUCTION_LINES[d.line],base={sourceId:d.id,race:d.race,line:d.line,entry:'development',families:d.families,requirements:d.requires,afterStage:d.afterStage,effect:{kind:'development',definitionId:d.id},rarity:'blue'};
 const family=d.families[0],icon=buildingIcons[d.id]??'unit.'+family;
 if(d.kind==='facility')add({...base,id:'dev.'+d.id,group:'development',subtype:'facility',name:d.name,kicker:'扩建',icon,art:'facility',price:{minerals:d.minerals,gas:d.gas},summary:d.race==='zerg'?'更多幼虫，更多猎手。':'援军从这里出发。',stat:'生产基地 +1',detail:'增加一座生产设施，最多五座。'+(d.race==='zerg'?'孵化场可分配到基础、地面进化或飞行虫群。':'可生产：'+d.families.map(familyName).join('、')+'。')});
 else if(d.unlock==='family')add({...base,id:'dev.'+d.id,group:'development',subtype:'unlock',name:familyName(family),kicker:'兵种研究',icon:'unit.'+family,art:'unit',price:{minerals:d.minerals,gas:d.gas},summary:d.race==='terran'?'新战友，向前线报到。':d.race==='zerg'?'新的进化，新的猎手。':'新的战士，响应召唤。',stat:'解锁持续生产',detail:'解锁'+familyName(family)+'的持续生产。研究完成后仍需支付训练费用；本次研究不附赠部队。'+(['thor','ultralisk','carrier'].includes(family)?'第 10 关起可研究。':'')});
 else if(d.unlock==='skill')add({...base,id:'dev.'+d.id,group:'development',subtype:'skill',name:d.name,kicker:'作战科技',icon:skillIcons[d.id],art:'technology',price:{minerals:d.minerals,gas:d.gas},summary:skillCopy[d.id]?.[0]??'新的战术，准备就绪。',stat:skillCopy[d.id]?.[1]??d.name,detail:(skillCopy[d.id]?.[1]??d.name)+'需先研究'+familyName(family)+'。'});
 else if(d.unlock==='system')add({...base,id:'dev.'+d.id,group:'development',subtype:'system',name:line.name+'军械库',kicker:'攻防科技',icon:'tech.vehicle',art:'technology',price:{minerals:d.minerals,gas:d.gas},summary:'让每一支部队都更强。',stat:'开启武器 / 防护研究',detail:'开启'+line.name+'武器与防护科技，各有三级。作用于本产线的普通部队与精锐，英雄不受影响。'});
 else for(let level=0;level<3;level++)add({...base,id:'dev.'+d.id+'.'+(level+1),group:'development',subtype:'research',name:line.name+(d.id.endsWith('weapon')?'武器':'防护'),kicker:'军械升级',icon:d.id.endsWith('weapon')?'tech.attack':'tech.armor',art:d.id.endsWith('weapon')?'firepower':'defense',rank:level+1,price:developmentPrice(d,level),summary:d.id.endsWith('weapon')?'枪口所向，火力更盛。':'接住下一轮火力。',stat:ranks[level+1]+' 级研究',detail:'第 '+(level+1)+' 级'+(d.id.endsWith('weapon')?'武器研究：采用各兵种原生武器升级增量。':'防护研究：生命护甲 +1；神族原生护盾护甲同时 +1。')+'作用于本产线的普通部队与精锐。'+(level?'需完成第 '+(level===1?6:12)+' 关。':'')});
}

// A union of legal family-focused contexts covers the full current shop catalogue.
// These are isolated DTOs, not a new game configuration or a claim that all goods
// may be offered together. Prices below are the current undiscounted card prices.
const pool=new Map();
for(const race of races)for(const family of FAMILIES_BY_RACE[race]){
 const s=newExpedition(race);s.familySlots=[family];s.tech={};s.facilities=[];
 for(const [line,l] of Object.entries(PRODUCTION_LINES))if(l.race===race){s.production[line].outputs=line===familyLine(family)?[family]:[];s.facilities.push({id:s.facilities.length+1,kind:race==='zerg'?'hatchery':line,line,techLab:false});s.tech['research.'+line+'.weapon']=3;s.tech['research.'+line+'.defense']=3;}
 const ctx={state:s,stage:17,random:()=>.5,nextOfferId:id=>id,heroes:ALL_HERO_IDS.map(id=>({id,...HEROES[id],icon:'hero.'+id,rank:0,owned:false,eligible:true})),elites:Object.values(ELITES).filter(e=>e.family===family).slice(0,1).map(e=>({...e,race,eligible:true})),
  familyInfo:f=>{const d=SC2_UNITS[f],v=SOURCE_UNIT_DETAILS[f]??{lifeRegen:CAMPAIGN_SCIENCE_VESSEL.hpRegenPerSecond,shieldRegen:0,energy:CAMPAIGN_SCIENCE_VESSEL.maxEnergy};return {name:d.zh,icon:'unit.'+f,alive:f===family?1:0,canAttack:['lurker','carrier'].includes(f)||d.targetType!=='none',canSupport:['medivac','science_vessel','queen'].includes(f)||v.lifeRegen>0||v.shieldRegen>0,usesEnergy:v.energy>0,cultivationCapacity:4,canProduce:true};},
  supplyLegal:(f,count)=>supplyTier(f)<=count-1,supportLegal:()=>true,training:rank=>({targets:[{id:1,family,rank:1,bornAt:0},{id:2,family,rank:1,bornAt:0}],minerals:seatRecipe(family).minerals*2*(rank-1),gas:seatRecipe(family).gas*2*(rank-1)})};
 for(const c of inspectReinforcementPool(ctx)){const key=race+':'+c.id;if(c.effect.kind==='training')pool.set(race+':'+c.id+'.'+family,{...c,race,trainingFamily:family});else if(!pool.has(key))pool.set(key,{...c,race});}
}
const legacySupport={
 mines:{names:['蜘蛛雷','爆裂虫卵','灵能地雷'],summary:['埋好礼物，等它们踩上来。','虫卵已醒，等待猎物。','一脚踏入，灵能炸裂。'],stat:'每关布置 6 / 9 / 12 枚',detail:'每关自动布置；伤害 120，爆炸半径 2，触发距离 1.2。最多三层。人族蜘蛛雷会钻出地面并追击合法目标。',art:'mines'},
 bombardment:{names:['炮火轰炸','酸液轰炸','轨道轰击'],summary:['把坐标给炮兵。','让酸雨落下。','从轨道上，净化这片战场。'],stat:'轰炸间隔 20 / 15 / 10 秒',detail:'轰击可见敌军；伤害 180，半径 2.5，预警 0.75 秒。最多三层。',art:'bombardment'},
 mutation:{names:['燃烧弹','腐蚀弹','灼能弹'],summary:['命中，只是开始。','血肉终将溶解。','让每一次命中留下余焰。'],stat:'主力普攻附带持续伤害',detail:'陆战队员 / 刺蛇 / 追猎者的直接普攻命中附带三秒持续伤害。效果随层数增强，最多三层。',art:'mutation'},
 strategic:{names:['核弹','生体巨爆','净化打击'],summary:['核弹准备就绪。','虫群送上最后的礼物。','目标锁定，开始净化。'],stat:'战略弹药 +1',detail:'获得一枚战略打击弹药。半径 8，延迟 3 秒，伤害 3000，可命中地面、空中和建筑，不伤友军。',art:'strategic'},
};
const uniqueCopy={'terran.ricochet':['一梭子，多个目标。','ricochet'],'terran.bunker':['落地，开火，守住阵线。','facility'],'terran.missiles':['导弹升空，目标锁定。','missiles'],'terran.overdrive':['把扳机扣到底。','overdrive'],'zerg.hatch':['每具尸骸，都能再育虫群。','hatch'],'zerg.consume':['回收血肉，反哺虫群。','recovery'],'zerg.parasite':['它们的身体，就是炸弹。','parasite'],'zerg.evolve':['伤口闭合，甲壳生长。','evolve'],'protoss.reserve':['让多余的灵能蓄势待发。','defense'],'protoss.counter':['护盾破碎，敌军付出代价。','counter'],'protoss.echo':['这一击，余响未尽。','echo'],'protoss.prism':['让棱镜划开敌阵。','prism']};
for(const c of pool.values()){
 const e=c.effect,tier=qualities.indexOf(c.rarity),generic={id:'shop.'+c.race+'.'+c.id,sourceId:c.id,race:c.race,entry:'shop',rarity:c.rarity,effect:e,families:e.family?[e.family]:[],requirements:[],price:{minerals:costs[tier][0],gas:costs[tier][1]}};
 if(e.kind==='hero'||e.kind==='elite')continue;
 if(e.kind==='teamCard'){const fire=e.group==='firepower';add({...generic,group:'team',subtype:e.group,name:fire?'全军火力':'全军防御',kicker:'全军强化',icon:fire?'tech.attack':'tech.armor',art:fire?'firepower':'defense',summary:fire?'整支小队，火力全开。':'站稳阵线，守住每一名战友。',stat:fire?'伤害 +'+percent(TEAM_CARD_VALUES.damage[tier])+' · 攻速 +'+percent(TEAM_CARD_VALUES.speed[tier]):'生命 / 护盾 +'+percent(TEAM_CARD_VALUES.health[tier]),detail:fire?'全军武器伤害 +'+percent(TEAM_CARD_VALUES.damage[tier])+'，攻击速度 +'+percent(TEAM_CARD_VALUES.speed[tier])+'。':'全军生命与原生护盾上限 +'+percent(TEAM_CARD_VALUES.health[tier])+'，护甲 +'+TEAM_CARD_VALUES.armor[tier]+'。'+ '每种品质最多三张。工人、建筑和运输载具不受影响。'});}
 else if(e.kind==='training'){const f=c.trainingFamily;add({...generic,id:generic.id+'.'+f,group:'training',subtype:'training',name:'晋升 '+ranks[e.rank]+' 级',kicker:'战地晋升',icon:'unit.'+f,art:'training',rank:e.rank,price:{minerals:e.minerals,gas:e.gas},families:[f],summary:'让老兵再向前一步。',stat:'两名普通战士 → '+ranks[e.rank],detail:'军衔最低的两名普通战士升至 '+ranks[e.rank]+' 级。费用随这两名战士的兵种和当前军衔计算；此处以两名 I 级'+familyName(f)+'展示。跳虫同一对共同晋升。'});}
 else if(e.kind==='supply')add({...generic,group:'supply',subtype:e.mode,name:familyName(e.family),kicker:e.mode==='pod'?'救援空投':'即时增援',icon:'unit.'+e.family,art:e.mode==='pod'?'supply':'unit',count:e.count,price:supplyPrice(e.family,e.count,e.mode),summary:e.mode==='pod'?(c.race==='terran'?'增援在路上，守住着陆点。':c.race==='zerg'?'新的虫群正在赶来。':'增援正在跃迁。'):'收到命令，立即加入。',stat:'×'+e.count+(e.family==='zergling'?' 对':' 名'),detail:(e.mode==='pod'?'支付后经运输抵达，空投未完成时保留本次增援。':'购买后立即加入。')+'本卡不解锁持续生产。'+(e.family==='zergling'?'每对为两个实际战斗单位。':'')});
 else if(e.kind==='card'){const f=e.family,isHeal=e.effect==='recovery',isEnergy=e.effect==='energy';add({...generic,group:'efficiency',subtype:e.effect,name:familyName(f)+' · '+(isHeal?'战地恢复':isEnergy?'能量循环':'快速集结'),kicker:isHeal?'恢复强化':isEnergy?'能量强化':'训练强化',icon:'unit.'+f,art:isHeal?'recovery':isEnergy?'energy':'production',summary:isHeal?'伤口会愈合，战斗会继续。':isEnergy?'灵能充盈，准备下一次出手。':'让援军更快赶到。',stat:(isHeal?'恢复效率 +':isEnergy?'能量恢复 +':'训练耗时 −')+percent(e.amount),detail:isHeal?'本兵种已有恢复能力的效率 +'+percent(e.amount)+'；保留原有治疗目标范围。':isEnergy?'本兵种能量恢复速度 +'+percent(e.amount)+'。':'本兵种之后开工的训练耗时减少 '+percent(e.amount)+'；已付款批次保持原有进度。'});}
 else if(e.kind==='resource'){const names={minerals:'矿物补给',gas:'瓦斯补给',salvage:'战地回收',supply:'补给运输'},p={minerals:[25,0],gas:[25,0],salvage:[50,0],supply:[75,25]}[c.id.split('.').at(-1)];add({...generic,group:'economy',subtype:c.id.split('.').at(-1),name:names[c.id.split('.').at(-1)],kicker:'前线补给',icon:e.gas&&!e.minerals?'ui.gas':'ui.minerals',art:'resources',price:{minerals:p[0],gas:p[1]},summary:c.race==='terran'?'补给到了，继续推进。':c.race==='zerg'?'新的养分，新的虫群。':'能量已送达前线。',stat:(e.minerals?'矿物 +'+e.minerals:'')+(e.minerals&&e.gas?' · ':'')+(e.gas?'瓦斯 +'+e.gas:''),detail:'支付后获得 '+e.minerals+' 矿物和 '+e.gas+' 瓦斯。'});}
 else if(e.kind==='support'){const unique=UNIQUE_SUPPORT[e.support],ri=races.indexOf(c.race);if(unique)add({...generic,group:'support',subtype:e.support,name:unique.name,kicker:c.rarity==='orange'?'主动战术':'自动战术',icon:'tech.'+(e.support.includes('reserve')||e.support.includes('counter')?'shield':e.support.includes('consume')?'heal':'attack'),art:uniqueCopy[e.support][1],summary:uniqueCopy[e.support][0],stat:unique.description.replace(/^主动 · /,''),detail:unique.description+'。最多三层；战术冷却不会因购买升级而重置。'});else {const d=legacySupport[e.support];add({...generic,group:'support',subtype:e.support,name:d.names[ri],kicker:e.support==='strategic'?'战略打击':'自动战术',icon:'tech.'+(e.support==='mines'?'siege':e.support==='mutation'?'infernal':'attack'),art:d.art,summary:d.summary[ri],stat:d.stat,detail:d.detail});}}
}
// Shop offers select a family; the real next panel selects one of its three variants.
for(const race of races)for(const family of FAMILIES_BY_RACE[race]){
 const variants=Object.values(ELITES).filter(e=>e.family===family),recipe=seatRecipe(family);
 // Elite pricing uses the unit recipe, not paired ordinary-seat pricing.
 const factor=family==='zergling'?2:1;
 for(const [rarity,mult,rank] of [['purple',5,1],['orange',15,5]]){
  const price={minerals:recipe.minerals/factor*mult,gas:recipe.gas/factor*mult};
  add({id:`elite-offer.${family}.${rarity}`,sourceId:'elite.'+variants[0].id+(rank===5?'.v':''),race,entry:'shop',group:'elite',subtype:'eliteOffer',family,families:[family],name:familyName(family)+'精锐',kicker:'精锐增援',icon:'unit.'+family,art:'elite',rarity,rank,price,variantIds:variants.map(e=>e.id),effect:{kind:'elite',family},summary:'精锐已集结，等你的命令。',stat:rank===5?'直接晋升 V 级':'招募 / 晋升精锐',detail:'选择一名'+familyName(family)+'精锐。'+(rank===5?'招募或直接提升至 V 级。':'招募 I 级精锐，或让已有精锐晋升一级。')+'每种精锐最多一名。'});
  for(const e of variants)add({id:`elite-variant.${e.id}.${rarity}`,sourceId:e.id,race,entry:'variant',group:'elite',subtype:'eliteVariant',family,families:[family],name:e.name,kicker:'精锐',icon:e.icon,art:'elite',rarity,rank,price,effect:{kind:'eliteVariant',eliteId:e.id,family},summary:{quick:'抢先开火，击穿敌阵。',heavy:'每一发，都足够沉重。',guard:'守在前线，扛住火力。',mobile:'迅速进场，果断出击。',support:'你的战友，还需要你。'}[e.template],stat:e.description,detail:e.description+' '+(rank===5?'本次招募或晋升至 V 级。':'首次为 I 级，已招募则晋升一级。')});
 }
}
const heroCopy={raynor:'跟我来，我们还有仗要打。',tychus:'大枪，硬仗，正合我意。',nova:'目标已锁定。',swann:'我来把这些铁家伙修好。',tosh:'让他们听见脑海里的回声。',yamato_battlecruiser:'战巡舰就绪。',kerrigan:'虫群，听我号令。',zagara:'更多虫群，更多猎物。',dehaka:'收集精华，继续进化。',stukov:'感染，终将蔓延。',niadra:'虫群将在尸骸中重生。',hots_leviathan:'遮蔽天空，吞没战场。',artanis:'为了艾尔。',zeratul:'我行于黑暗之中。',alarak:'见证真正的力量。',fenix:'荣耀永存。',vorazun:'黑暗，会保护我们。',purifier_flagship:'净化程序，启动。'};
for(const id of ALL_HERO_IDS){const h=HEROES[id];for(let rank=1;rank<=5;rank++)add({id:`hero.${id}.${rank}`,sourceId:'hero.'+id,race:h.race,entry:'shop',group:'hero',subtype:rank===1?'recruit':'promote',heroId:id,name:h.name,kicker:rank===1?'英雄招募':'英雄晋升',icon:'hero.'+id,art:'hero',rarity:'orange',rank,price:{minerals:750,gas:250},effect:{kind:'hero',heroId:id},summary:heroCopy[id],stat:h.skill+' · '+h.cooldown+' 秒',detail:(rank===1?'招募本族英雄，全队最多三位。':'同名英雄提升至 '+ranks[rank]+' 级；阵亡英雄不会因此复活。')+'技能：'+h.skill+'，冷却 '+h.cooldown+' 秒。'});}
for(const race of races){
 add({id:'service.repair.'+race,sourceId:'previewRepair',race,entry:'service',group:'service',subtype:'repair',name:race==='zerg'?'休养虫群':'修复部队',kicker:'战地休整',icon:'tech.heal',art:'recovery',rarity:'white',price:null,summary:race==='zerg'?'恢复血肉，准备下一次狩猎。':'补好伤口，重新列队。',stat:'恢复所选部队生命',detail:'可选择全队或一个兵种。费用按当前缺失生命计算；生命已满时无需支付。此处展示卡片式休整入口。'});
 for(const id of ALL_HERO_IDS.filter(id=>HEROES[id].race===race))for(let rank=1;rank<=5;rank++)add({id:`service.revive.${id}.${rank}`,sourceId:'heroRevivalCost',race,entry:'service',group:'service',subtype:'revive',name:HEROES[id].name,kicker:'英雄复活',icon:'hero.'+id,art:'hero',rarity:'orange',rank,heroId:id,price:heroRevivalCost(rank),summary:'战场，还在等你回来。',stat:'阵亡 → 返回队伍',detail:'复活这位 '+ranks[rank]+' 级英雄。英雄仍占原有名额。存活时无需复活。'});
}
for(const c of cards){
 for(const key of ['name','summary','stat','detail'])if(c[key])c[key]=c[key].replace(/Boss/g,'首领').replace(/同来源刷新/g,'再次命中会延长灼烧').replace(/普通\/精英主目标/g,'普通与精锐部队的攻击目标').replace(/普攻/g,'攻击').replace(/保持主系与跨系比例/g,'原有维修与治疗比例不变').replace(/合法治疗／维修射程/g,'治疗与维修射程').replace(/按原tick比例分摊/g,'每次风暴伤害均提高').replace(/一次真实自爆的直接伤害/g,'自爆伤害').replace(/生命护甲/g,'护甲').replace(/新增容量不免费回能/g,'新增能量上限不会立即补满').replace(/继承一次/g,'加成不会重复计算');
 if(c.entry==='development'&&c.subtype==='unlock'&&['thor','ultralisk','carrier'].includes(c.families[0]))c.afterStage=10;
 if(c.subtype==='research'&&c.rank>1)c.afterStage=c.rank===2?6:12;
 if(c.group==='team')c.detail+=' 每种品质最多三张；作用于战斗部队，工人、建筑与运输载具不受影响。';
}
const sourcePaths=['src/data/expedition-buildings.ts','src/data/heroes.ts','src/data/elites.ts','src/data/expansion-elites.ts','src/data/unique-support.ts','src/data/expansion-units.ts','src/data/economy.ts','src/simulation/expedition-economy.ts','src/simulation/progression/expedition-drafts.ts','src/simulation/progression/team-cards.ts','src/simulation/progression/supply-cards.ts','src/simulation/progression/training-cards.ts'];
const sources=await Promise.all(sourcePaths.map(async path=>({path,sha256:crypto.createHash('sha256').update(await fs.readFile(new URL(path,project))).digest('hex')})));
const fixture={revision:9,sourceDate:'2026-10-05',note:'Read-only union of current option definitions and legal family contexts. Multiple quality/rank/price states, not invented rewards. Preview never writes gameplay state.',sources,lines:PRODUCTION_LINES,families:Object.fromEntries(races.map(r=>[r,FAMILIES_BY_RACE[r].map(id=>({id,name:familyName(id),line:familyLine(id)}))])),heroes:Object.fromEntries(ALL_HERO_IDS.map(id=>[id,{name:HEROES[id].name,race:HEROES[id].race,skill:HEROES[id].skill,cooldown:HEROES[id].cooldown}])),cards};
const counts={cards:cards.length,developmentDefinitions:DEVELOPMENT.length,eliteVariants:Object.keys(ELITES).length,heroes:ALL_HERO_IDS.length,byGroup:{},byRace:{}};
for(const c of cards){counts.byGroup[c.group]=(counts.byGroup[c.group]??0)+1;counts.byRace[c.race]=(counts.byRace[c.race]??0)+1;}
if(new Set(cards.map(c=>c.id)).size!==cards.length)throw Error('Duplicate card fixture IDs');
for(const c of cards)if(!c.name||!c.summary||!c.detail||!c.icon||!c.art||!qualities.includes(c.rarity))throw Error('Incomplete fixture '+c.id);
fixture.counts=counts;await fs.writeFile(new URL('cards-r9.json',root),JSON.stringify(fixture,null,2));
console.log(JSON.stringify(counts,null,2));
