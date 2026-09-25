import type {ThreeRaceTalentProfile} from '../../simulation/progression/three-race-talent-profile';
import {THREE_RACE_TALENTS,THREE_RACE_TALENT_COLUMNS,lowerTierTalentPoints,allocatedTalentPoints,type TalentRace} from '../../data/three-race-talents';
import './three-race-talent-panel.css';
const raceNames:Record<TalentRace,string>={terran:'人族',zerg:'虫族',protoss:'神族'};
const escape=(text:string)=>text.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
/** Pure view: all purchases, activation and persistence remain profile/World commands. */
export function renderThreeRaceTalentPanel(profile:ThreeRaceTalentProfile,race:TalentRace=profile.activeRace,recovery:{notice?:string;locked?:boolean}={}):string{
 const active=profile.activeRace===race,slot=active?profile.activePreset:0,preset=profile.getPreset(race,slot),levels=preset.levels;
 return `<div class="talent-screen three-race-talents" role="region" aria-label="三族局外天赋">
  <span class="eyebrow">PERMANENT TALENTS</span><h2>局外天赋 · ${raceNames[race]}</h2>
  <div class="three-talent-budget" aria-live="polite"><strong>已投入 ${profile.allocated} / 50 点</strong><span>可用资源 ${profile.balance}</span><span>本方案投入 ${profile.spent} 资源</span></div>
  <p>每升一级花费3资源，占用1天赋点；终极天赋同价。只计算当前方案，切换与洗点免费。</p>
  ${recovery.notice?`<p class="warning">${escape(recovery.notice)}</p>`:''}<div class="talent-actions">${recovery.locked?'<button data-action="talent-reset">明确重置损坏档案</button>':''}<button data-action="talent-export">导出档案</button><button data-action="talent-import">导入档案</button><button data-action="three-talent-respec">免费洗点</button><button data-action="talents-back">返回</button></div>
  <nav class="three-talent-races" aria-label="选择种族">${(['terran','zerg','protoss'] as const).map(item=>`<button data-action="three-talent-race" data-race="${item}" aria-pressed="${race===item}" ${race===item?'data-default-focus="true"':''}>${raceNames[item]}</button>`).join('')}</nav>
  <div class="three-talent-presets" role="group" aria-label="${raceNames[race]}天赋方案">${([0,1,2] as const).map(index=>{const saved=profile.getPreset(race,index),points=allocatedTalentPoints(saved.levels),affordable=points*3<=profile.principal;return `<button data-action="three-talent-preset" data-race="${race}" data-slot="${index}" aria-pressed="${active&&slot===index}" ${affordable?'':'disabled'}><b>${escape(saved.name)}</b><small>${points} 点 · ${points*3} 资源${affordable?'':' · 资源不足'}</small></button>`;}).join('')}</div>
  ${active?'':`<p class="warning">正在预览${raceNames[race]}方案，选择上方方案后可配点。</p>`}
  <p class="three-talent-hint">终极需要本列先投入30点；点出终极后，最多还可在其他列投入19点。</p>
  <div class="talent-lines three-talent-lines">${THREE_RACE_TALENT_COLUMNS[race].map(line=>{
   const nodes=THREE_RACE_TALENTS.filter(node=>node.race===race&&node.line===line.id),invested=nodes.reduce((sum,node)=>sum+(levels[node.id]??0),0);
   return `<section aria-label="${line.name}天赋"><h3>${line.name}<small>${invested} / 37 点</small></h3><div class="three-talent-branch">${nodes.map(node=>{
    const rank=levels[node.id]??0,lower=lowerTierTalentPoints(levels,node),missing=Math.max(0,node.requiredLowerTierPoints-lower),canBuy=active&&!recovery.locked&&profile.canBuy(node.id),complete=rank===node.maxRank;
    const reason=complete?'已点满':missing?`需要更低层再投入${missing}点`:!active?'先选择此种族方案':profile.allocated>=50?'已达到50点上限':profile.balance<3?'需要3资源':'花费3资源，投入1点';
    return `<button class="talent-node ${node.maxRank===1?'three-talent-capstone':''} ${complete?'complete':''}" data-action="three-talent-buy" data-id="${node.id}" ${canBuy?'':'disabled'} title="${escape(reason)}" aria-label="${escape(`${node.name}，${rank}/${node.maxRank}级。${node.description}。${reason}`)}"><b>${node.maxRank===1?'终极':`${node.tier} 层`} · ${node.name}</b><small>${rank} / ${node.maxRank} · 3资源／级</small><span>${node.description}</span><em>${reason}</em></button>`;
   }).join('')}</div></section>`;
  }).join('')}</div></div>`;
}
