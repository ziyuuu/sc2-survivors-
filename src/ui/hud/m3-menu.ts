import {COVER_HEROES,paintedArt} from '../presentation/painted-art';
import {fullscreenLabel} from '../mobile/viewport';
import {icon,assetUrl} from '../../assets/manifest';
import {RACES,RACE_NAMES,type Race} from '../../data/races';
import {HEROES,HERO_IDS_BY_RACE,type HeroId} from '../../data/heroes';
import {talentRank,TALENT_BY_ID} from '../../data/mvp-talents';
import type {Difficulty} from '../../data/stages';
import type {PermanentProfile,PresetSlot} from '../../simulation/progression/permanent-profile';
import type {LoadPreview,RunSession} from '../../app/run-session';
import type {ReadinessState} from '../../app/asset-readiness';

export type MenuPage='title'|'race'|'difficulty'|'confirm'|'load'|'load-preview';
export interface MenuSelection {page:MenuPage;race:Race;difficulty:Difficulty;preset:PresetSlot;hero:HeroId|null;loadPreview:LoadPreview|null;error:string;coverIndex?:number;coverAuto?:boolean}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const descriptions:Record<Race,{icon:string;features:string;start:string}>={
 terran:{icon:'unit.marine',features:'远程火力与机械阵地；兵营、工厂、星港独立生产。坦克手动部署，医疗与维修各有主系。',start:'1 枪兵 · 兵营'},
 zerg:{icon:'unit.zergling',features:'数量补员、恢复与反复冲击；孵化设施分配序列。玩家爆虫自爆后保留身体并停顿 5 秒。',start:'2 跳虫 · 孵化场＋血池'},
 protoss:{icon:'unit.zealot',features:'原生护盾与高价质量单位；脱战回盾，闪烁、部署与灵能施法形成节奏。',start:'1 狂热者 · 传送门'}
};
const difficultyInfo:Record<Difficulty,{label:string;threat:string;resource:string}>={
 easy:{label:'简单',threat:'敌军基础威胁 ×0.5',resource:'每完成 3 关＋1 永久资源'},
 normal:{label:'普通',threat:'敌军基础威胁 ×0.9',resource:'每完成 3 关＋1 永久资源'},
 hard:{label:'困难',threat:'更强的敌军，更密集的攻势',resource:'每完成 3 关＋2 永久资源'},
 hell:{label:'地狱',threat:'密集敌潮；第 4 关起出现扩张巢',resource:'每完成 1 关＋1 永久资源'}
};
const shell=(step:string,title:string,body:string,back=true)=>`<div class="title-screen m3-menu"><span class="eyebrow">SC2 SURVIVORS / ${step}</span><h2>${title}</h2>${body}<div class="m3-menu-footer"><button data-action="resource-downloads">资源下载</button><button data-action="fullscreen">${fullscreenLabel()}</button>${back?'<button data-action="menu-back">返回</button>':''}</div><small class="legal">非官方 · 非盈利 · 朋友试玩 / StarCraft II 素材属于 Blizzard Entertainment</small></div>`;
export function renderMenu(selection:MenuSelection,profile:PermanentProfile,session:RunSession|null){
 const s=selection;
 if(s.page==='title'){
  const heroes=COVER_HEROES[s.race],hero=heroes[s.coverIndex??0];
  return `<div class="formal-home" data-race="${s.race}"><div class="home-backdrop" aria-hidden="true"><img src="${assetUrl('ui.cover.'+hero)??''}" alt=""></div><header class="home-masthead"><span>SC2 SURVIVORS</span><span>通讯在线 / ${RACE_NAMES[s.race]}</span></header><div class="home-content"><span class="eyebrow">战役 · 18 关</span><h1><small>星际</small>幸存小队</h1><span class="home-rule"></span><nav class="m3-main-actions" aria-label="主菜单"><button class="primary" data-action="menu-new">新游戏　›</button><button data-action="menu-load">读取存档　›</button><button data-action="talents">天赋　›</button></nav><p>${RACE_NAMES[profile.activeRace]} · ${escape(profile.getPreset(profile.activeRace,profile.activePreset)?.name??'')} · ${profile.playerLevel} / 80</p>${s.error?`<p class="warning" role="alert">${escape(s.error)}</p>`:''}</div><aside class="home-resume"><small>本地续局</small><p>${escape(session?.summary||'暂无续局')}</p><button data-action="menu-load-summary">查看存档</button></aside><nav class="home-factions" aria-label="阵营封面">${RACES.map(r=>`<button data-action="cover-race" data-race="${r}" aria-pressed="${r===s.race}">${RACE_NAMES[r]}</button>`).join('')}</nav><div class="home-cover-controls"><button data-action="cover-prev" aria-label="上一张封面">‹</button><span>${HEROES[hero as HeroId].name}</span><button data-action="cover-next" aria-label="下一张封面">›</button><button data-action="cover-auto" aria-pressed="${s.coverAuto!==false}">${s.coverAuto===false?'自动轮换':'暂停轮换'}</button></div><footer class="home-footer"><span>非官方 · 非盈利 · 朋友试玩 / Blizzard Entertainment 素材</span><button data-action="resource-downloads">资源下载</button><button data-action="fullscreen">${fullscreenLabel()}</button></footer></div>`;
 }
 if(s.page==='race')return shell('NEW GAME / 1','选择种族',`<div class="m3-race-cards" role="radiogroup" aria-label="选择种族">${RACES.map(r=>`<button class="m3-race-card" role="radio" aria-checked="${s.race===r}" data-action="menu-race" data-race="${r}">${paintedArt(COVER_HEROES[r][0],RACE_NAMES[r])}<strong>${RACE_NAMES[r]}</strong><span>${descriptions[r].features}</span><small>${descriptions[r].start}</small></button>`).join('')}</div><button class="primary" data-action="menu-race-next">继续 · 选择难度</button>`);
 if(s.page==='difficulty')return shell('NEW GAME / 2','选择难度',`<div class="m3-difficulty-cards" role="radiogroup" aria-label="选择难度">${(Object.keys(difficultyInfo) as Difficulty[]).map(d=>`<button role="radio" aria-checked="${s.difficulty===d}" data-action="menu-difficulty" data-difficulty="${d}"><strong>${difficultyInfo[d].label}</strong><span>${difficultyInfo[d].threat}</span><small>${difficultyInfo[d].resource}</small></button>`).join('')}</div><button class="primary" data-action="menu-difficulty-next">继续 · 确认出发</button>`);
 if(s.page==='confirm'){
  const preset=profile.getPreset(s.race,s.preset)!,preview=profile.previewTalentAllocation(s.race,s.preset),levels=preset.levels;
  const allocated=Object.values(levels).reduce((n,v)=>n+(v??0),0),micro=Object.entries(levels).reduce((n,[id,v])=>n+(TALENT_BY_ID.get(id)?.line==='micro'?(v??0):0),0),unlocked=talentRank(levels,s.race,'hero_support')>0;
  const hero=unlocked?(s.hero&&HERO_IDS_BY_RACE[s.race].includes(s.hero as never)?s.hero:HERO_IDS_BY_RACE[s.race][0]):null;
  return shell('NEW GAME / 3','确认天赋与出发',`<div class="m3-summary"><p><b>${RACE_NAMES[s.race]}</b> · ${difficultyInfo[s.difficulty].label}</p><label>天赋预设 <select data-setting="menu-preset" aria-label="天赋预设">${([0,1,2] as PresetSlot[]).map(slot=>`<option value="${slot}" ${slot===s.preset?'selected':''}>${escape(profile.getPreset(s.race,slot)!.name)}</option>`).join('')}</select></label><p>${RACE_NAMES[s.race]}等级 ${allocated}/80 · 微操 ${micro} 点 · 本预设资源价 ${preview?.cost??'不可用'} · 本族余额 ${profile.raceBalance(s.race)}</p>${unlocked?`<label>开局英雄 <select data-setting="menu-hero" aria-label="开局英雄">${HERO_IDS_BY_RACE[s.race].map(id=>`<option value="${id}" ${hero===id?'selected':''}>${HEROES[id].name} · ${HEROES[id].skill}</option>`).join('')}</select></label>`:'<p>未解锁开局英雄天赋，本局从普通部队出发。</p>'}<button data-action="menu-edit-talents">编辑天赋</button></div>${session?.canResume?'<p class="warning">开始后将替换当前续局槽。建议先导出当前存档。</p><button data-action="save-export">先导出当前存档</button>':''}<button class="primary" data-action="menu-start" ${preview?'':'disabled'}>开始新游戏</button>${s.error?`<p role="alert" class="warning">${escape(s.error)}</p>`:''}`);
 }
 if(s.page==='load')return shell('LOAD','读档',`<div class="m3-summary">${session?.canResume?`<button class="primary" data-action="menu-load-local">本地续局 · ${escape(session.summary)}</button><p>保存时间 ${session.savedAt?new Date(session.savedAt).toLocaleString('zh-CN',{hour12:false}):'未知'}</p>`:'<p>没有可读取的本地续局。</p>'}<button data-action="menu-load-file">导入存档文件</button></div>${s.error?`<p role="alert" class="warning">${escape(s.error)}</p>`:''}`);
 return shell('LOAD / PREVIEW','检查存档',`<div class="m3-summary"><p>${escape(s.loadPreview?.summary??'未选择存档')}</p><p>来源：${s.loadPreview?.source==='local'?'本地续局':'导入文件'}。读档使用档内种族、难度和天赋。</p></div><button class="primary" data-action="menu-load-ready" ${s.loadPreview?'':'disabled'}>载入这份存档</button>${s.error?`<p role="alert" class="warning">${escape(s.error)}</p>`:''}`);
}
export function renderReadiness(state:ReadinessState){
 const finite=state.total>0,progress=finite?`<progress max="${state.total}" value="${state.done}"></progress><small>${state.done} / ${state.total}</small>`:'<progress aria-label="正在准备"></progress>';
 const ready=state.phase==='ready',error=state.phase==='error';
 const label=state.label.includes('下载资源')?'下载战场资源':state.phase==='read'?'读取战局':state.phase==='audio'?'准备战场音效':state.phase==='gpu'?'准备画面':state.phase==='validate'?'检查战局':'准备部队与战场';
 return `<div class="title-screen m3-menu m3-loading" role="status"><span class="eyebrow">SC2 SURVIVORS</span><h2>${ready?'战场就绪':error?'暂时无法出发':'正在准备战场'}</h2>${error?`<p>部分资源未能就绪，请重试。</p><details><summary>查看原因</summary><p>${escape(state.error??'未知错误')}</p></details>`:ready?(state.label.includes('缓存空间不足')?'<p>本次资源未能全部缓存，下次进入时将补下载。</p>':''):`<p>${label}</p>${progress}`}<div class="m3-menu-footer">${ready?'<button class="primary" data-action="flow-continue">进入战场</button>':error?'<button data-action="flow-retry">重试</button><button data-action="flow-cancel">返回</button><button data-action="save-export">导出存档</button>':'<button data-action="flow-cancel">返回</button>'}</div></div>`;
}
