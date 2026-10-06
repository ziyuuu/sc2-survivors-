import {createIntermissionUI} from './card-ui-r9.mjs';
const $=s=>document.querySelector(s);
const frame=$('#game-frame'),scene=$('#scene'),overlay=$('#overlay-root');
const root=new URL('.',document.baseURI),project=new URL('../../',root);
const asset=id=>window.__UI_ICONS__?.[id]||new URL(`public/assets/icons/${id}.png`,project).href;
const art=name=>window.__UI_ART__?.[name]||new URL(`art/${name}.png`,root).href;
const coverAsset=id=>window.__UI_COVERS__?.[id]||new URL(`covers/${id}.png`,root).href;
const mapAsset=id=>window.__UI_MAPS__?.[id]||new URL(`maps/${id}.jpg`,root).href;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img=(id,alt='',cls='')=>`<img class="${cls}" src="${asset(id)}" alt="${esc(alt)}" draggable="false">`;
const glyphs={info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 6v1"/>',back:'<path d="m14 5-7 7 7 7"/>',next:'<path d="m10 5 7 7-7 7"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',pause:'<path d="M9 5v14M15 5v14"/>',play:'<path d="m8 5 11 7-11 7Z"/>',gear:'<path d="m9 4 1-2h4l1 2 3 2 2 1v4l-2 1-1 3-2 2h-4l-1-2-3-1-2-2V8l2-1Z"/><circle cx="12" cy="10" r="3"/>',check:'<path d="m5 12 4 4L19 6"/>',target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/>',save:'<path d="M5 3h12l3 3v15H4V3Z"/><path d="M8 3v6h8V3M8 21v-8h8v8"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5M20 12a8 8 0 0 0-14-5M4 12a8 8 0 0 0 14 5"/>',shield:'<path d="m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5Z"/><path d="m8 11 3 3 5-6"/>',swords:'<path d="m4 3 14 14M3 4l1 5 13 13M21 3 7 17M22 4l-1 5L8 22M5 16l4 4M15 16l4 4"/>',hex:'<path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="m7 9 5-3 5 3v6l-5 3-5-3Z"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'};
const svg=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name]||glyphs.hex}</svg>`;
const button=(label,action,cls='',attrs='')=>`<button class="game-button ${cls}" data-action="${action}" ${attrs}><span>${label}</span></button>`;
const iconButton=(icon,label,action)=>`<button class="icon-button" data-action="${action}" aria-label="${label}">${svg(icon)}</button>`;

const portrait=(name,cls='')=>`<img class="faction-portrait ${cls}" src="${art(name)}" alt="" draggable="false">`;
const tags=items=>`<div class="game-tags">${items.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`;
const infoButton=(name,copy,label='')=>`<button class="info-button ${label?'with-label':''}" data-action="show-detail" data-title="${esc(name)}" data-copy="${esc(copy)}" aria-label="查看${esc(name)}说明">${svg('info')}${label?`<span>${esc(label)}</span>`:''}</button>`;
const factionStats={terran:{traits:['远程','机械','阵地'],bodies:1,minerals:50,building:'兵营',rgb:'78,139,176'},zerg:{traits:['虫群','恢复','进化'],bodies:2,minerals:50,building:'孵化场 / 血池',rgb:'130,76,157'},protoss:{traits:['护盾','精锐','灵能'],bodies:1,minerals:0,building:'传送门',rgb:'169,139,74'}};
const heroSkills={raynor:['穿透射击',12,['远程','穿透']],tychus:['手雷',14,['火力','范围']],nova:['狙击',18,['远程','单体']],kerrigan:['灵能冲击',10,['灵能','穿透']],zagara:['爆虫弹幕',12,['虫群','范围']],dehaka:['原始吞噬',13,['近战','吞噬']],artanis:['护盾复苏',16,['近战','支援']],zeratul:['虚空斩',10,['近战','突袭']],fenix:['太阳炮',13,['机械','范围']]};

const money=(m,g)=>`<span class="money minerals">${img('ui.minerals')}<b>${m}</b></span>${g!==undefined?`<span class="money gas">${img('ui.gas')}<b>${g}</b></span>`:''}`;
const routes=[['home','主菜单'],['race','选择种族'],['difficulty','选择难度'],['confirm','确认出发'],['loading','战场装载'],['battle','战场'],['development','关间发展'],['shop','强化商店'],['heroes','英雄招募'],['talents','局外天赋'],['saves','读取存档'],['pause','暂停'],['settings','操作与画质'],['production','持续生产'],['family','换兵决策'],['victory','战役结算'],['endless','无尽整备'],['cards','关间卡片图鉴'],['rest','战地休整']];
const raceInfo={
 terran:{name:'人族',english:'Terran',accent:'#78c9ef',unit:'marine',art:'raynor',title:'钢铁，火力，坚守。',desc:'远程火力与机械阵地。用兵营、重工厂和星港，建立你的前线。',start:'1 枪兵 · 兵营 · 50 矿 / 0 气',heroes:['raynor','tychus','nova'],families:['marine','marauder','tank','medivac','reaper']},
 zerg:{name:'虫族',english:'Zerg',accent:'#b899db',unit:'zergling',art:'kerrigan',title:'进化不止，虫群不息。',desc:'数量补员、恢复与连续冲击。在菌毯上推进，让虫群接管战场。',start:'2 跳虫 · 孵化场与血池 · 50 矿 / 0 气',heroes:['kerrigan','zagara','dehaka'],families:['zergling','roach','hydralisk','queen','baneling']},
 protoss:{name:'神族',english:'Protoss',accent:'#e5cb86',unit:'zealot',art:'artanis',title:'以灵能之刃，重铸荣耀。',desc:'原生护盾与精锐部队。掌握闪烁、部署与灵能施法的时机。',start:'1 狂热者 · 传送门 · 0 矿 / 0 气',heroes:['artanis','zeratul','fenix'],families:['zealot','stalker','immortal','sentry','colossus']}
};
const coverCatalog={
 terran:[{id:'terran-raynor',hero:'raynor'},{id:'terran-nova',hero:'nova'},{id:'terran-tychus',hero:'tychus'}],
 zerg:[{id:'zerg-kerrigan',hero:'kerrigan'},{id:'zerg-zagara',hero:'zagara'},{id:'zerg-dehaka',hero:'dehaka'}],
 protoss:[{id:'protoss-artanis',hero:'artanis'},{id:'protoss-zeratul',hero:'zeratul'},{id:'protoss-fenix',hero:'fenix'}]
};
const names={marine:'陆战队员',marauder:'劫掠者',tank:'攻城坦克',medivac:'医疗运输机',reaper:'死神',zergling:'跳虫',roach:'蟑螂',hydralisk:'刺蛇',queen:'虫后',baneling:'爆虫',zealot:'狂热者',stalker:'追猎者',immortal:'不朽者',sentry:'哨兵',colossus:'巨像',raynor:'雷诺',tychus:'泰凯斯',nova:'诺娃',kerrigan:'凯瑞甘',zagara:'扎加拉',dehaka:'德哈卡',artanis:'阿塔尼斯',zeratul:'泽拉图',fenix:'菲尼克斯'};
const difficulties={easy:['简单','稳定展开，熟悉战场。','敌军基础威胁 ×0.5','每完成 3 关 +1 永久资源'],normal:['普通','阵地与机动，缺一不可。','敌军基础威胁 ×0.9','每完成 3 关 +1 永久资源'],hard:['困难','为每一次推进付出代价。','敌军更强，攻势更密集','每完成 3 关 +2 永久资源'],hell:['地狱','从包围中杀出一条生路。','第 4 关起出现扩张巢','每完成 1 关 +1 永久资源']};
const state={page:'home',race:'terran',difficulty:'normal',preset:0,layers:[],rosterStart:0,selectedUnit:'marine',selectedHero:0,selectedTalent:null,talentLevels:{},talentRace:'terran',talentLine:'resources',talentReturn:'home',minerals:1240,gas:380,devPurchased:false,shopPurchased:new Set(),selectedDevelopment:0,selectedElite:0,eliteMember:0,consoleFolded:false,talentMenu:'races',heroClaimed:false,settingTab:'control',motion:!matchMedia('(prefers-reduced-motion:reduce)').matches,coverIndexes:{terran:0,zerg:0,protoss:0},autoCover:true};
let cardFixture={},talents=[],talentCopy={},loadingTimer,demoTimer,toastTimer,transitionTimer,coverTimer,coverRequest=0;
const currentCover=(race=state.race)=>coverCatalog[race][state.coverIndexes[race]];
const paintedPortrait=(race=state.race)=>`<img class="painted-cover" src="${coverAsset(currentCover(race).id)}" data-cover-id="${currentCover(race).id}" alt="" draggable="false">`;
const paintedHero=hero=>{const c=Object.values(coverCatalog).flat().find(c=>c.hero===hero);return `<img class="painted-cover" src="${coverAsset(c.id)}" data-cover-id="${c.id}" alt="" draggable="false">`;};
function coverBackdrop(){const c=currentCover();return `<div class="cover-backdrop" aria-hidden="true"><img class="cover-layer is-active" data-cover-id="${c.id}" src="${coverAsset(c.id)}" alt="" draggable="false"><img class="cover-layer" alt="" draggable="false"><div class="cover-shade"></div><div class="cover-atmosphere"></div></div>`;}
function coverControls(){return `<div class="cover-controls" role="group" aria-label="立绘封面"><span class="cover-name">${names[currentCover().hero]}</span><button data-action="cover-prev" aria-label="上一张封面">${svg('back')}</button><div class="cover-dots">${coverCatalog[state.race].map((c,i)=>`<button data-action="cover-select" data-value="${i}" aria-label="${names[c.hero]}封面" aria-pressed="${state.coverIndexes[state.race]===i}"><i></i></button>`).join('')}</div><button data-action="cover-next" aria-label="下一张封面">${svg('next')}</button><button class="cover-auto" data-action="cover-auto" aria-label="封面自动轮换" aria-pressed="${state.autoCover}" title="${state.autoCover?'暂停轮换':'开启轮换'}">${svg(state.autoCover?'pause':'play')}</button></div>`;}
const modalRoutes=new Set(['pause','settings','production','family']);
const navSteps=step=>`<nav class="step-nav" aria-label="新游戏步骤">${['种族','难度','出发'].map((label,i)=>`<button data-action="route:${['race','difficulty','confirm'][i]}" class="${i+1===step?'active':''} ${i+1<step?'done':''}" ${i+1>step?'disabled':''}><span>${i+1<step?svg('check'):i+1}</span>${label}</button>`).join('')}</nav>`;
const title=(text,sub,back='home',right='')=>`<header class="screen-heading"><div class="heading-left">${iconButton('back','返回','route:'+back)}<div><h1>${text}</h1>${sub?`<p>${sub}</p>`:''}</div></div>${right}</header>`;
const masthead=(label='指挥中心')=>`<div class="masthead"><span class="mini-brand">SC2 <i>Ⅱ</i> SURVIVORS</span><span class="mast-status"><i></i>${label}</span></div>`;
const footer=()=>`<footer class="game-footer"><span>非官方同人 · StarCraft II 素材属于 Blizzard Entertainment</span><div>${iconButton('gear','打开设置','modal:settings')}<span>本地战局</span></div></footer>`;
const radioSelect=(action,value,checked)=>`data-action="${action}" data-value="${value}" role="radio" aria-checked="${checked}"`;
function home(){
 const r=raceInfo[state.race];
 return `${coverBackdrop()}${masthead('通讯在线')}<section class="home-page"><div class="home-copy"><div class="title-emblem">${svg('shield')}<span>${r.english}</span></div><div class="wordmark"><span class="wordmark-sc">星际</span><h1>幸存小队</h1><div class="wordmark-en">SC2 SURVIVORS</div></div><div class="title-rule"><i></i><span>战役 · 18 关</span><i></i></div><nav class="main-actions" aria-label="主菜单">${button('新游戏','route:race','primary main-action',`data-autofocus`)}${button('读取存档','route:saves','main-action')}${button('天赋','route:talents','main-action')}</nav><div class="home-profile">${img('unit.'+r.unit)}<div><b>${r.name} · ${['前线推进','机械防线','空军支援'][state.preset]}</b><span>24 / 80</span></div><button data-action="route:talents" aria-label="查看天赋方案">${svg('next')}</button></div></div><div class="cover-factions" role="group" aria-label="阵营封面">${Object.entries(raceInfo).map(([id,v])=>`<button data-action="select-cover" data-value="${id}" aria-pressed="${id===state.race}" aria-label="${v.name}封面">${img('unit.'+v.unit)}<span>${v.name}</span></button>`).join('')}</div>${coverControls()}<aside class="signal-readout"><span class="signal-bars"><i></i><i></i><i></i><i></i><i></i></span><div><small>续局</small><b>人族 · 普通</b><p>06 / 18 · 20:42</p></div>${button('载入','route:saves','text-button')}</aside></section>${footer()}`;
}
function races(){
 return `${masthead('新游戏')}${title('选择阵营','','home',navSteps(1))}<section class="race-grid" role="radiogroup" aria-label="选择种族">${Object.entries(raceInfo).map(([id,r])=>`<button class="race-card ${state.race===id?'selected':''}" style="--card-accent:${r.accent};--portrait-rgb:${factionStats[id].rgb}" ${radioSelect('select-race',id,state.race===id)}><div class="race-card-art">${paintedPortrait(id)}</div><div class="race-card-copy"><div class="race-card-title"><h2>${r.name}</h2><span>${r.english}</span><i>${svg('check')}</i></div>${tags(factionStats[id].traits)}<div class="race-start">${img('unit.'+r.unit)}<span>×${factionStats[id].bodies}</span><span class="starter-building">${factionStats[id].building}</span></div><div class="race-resource">${money(factionStats[id].minerals,0)}</div></div></button>`).join('')}</section><div class="screen-bottom"><span>${raceInfo[state.race].name} · 待命</span>${button('继续 '+svg('next'),'route:difficulty','primary')}</div>`;
}
function difficulty(){
 const r=raceInfo[state.race];
 return `${masthead('新游戏')}${title('选择难度','','race',navSteps(2))}<section class="difficulty-layout"><aside class="deployment-aside">${paintedPortrait()}<div class="difficulty-faction"><span class="line-caption">${r.english}</span><h2>${r.name}</h2>${tags(['战役 18 关','无尽'])}</div></aside><div class="difficulty-options" role="radiogroup" aria-label="选择难度">${Object.entries(difficulties).map(([id,d],i)=>`<button class="difficulty-card ${state.difficulty===id?'selected':''} ${id==='hell'?'hell':''}" ${radioSelect('select-difficulty',id,state.difficulty===id)}><span class="difficulty-insignia">${img(['unit.zergling','unit.roach','unit.ultralisk','hero.kerrigan'][i])}<b>${['I','II','III','IV'][i]}</b></span><div class="difficulty-copy"><div class="difficulty-card-heading"><h2>${d[0]}</h2>${id==='normal'?'<small>标准</small>':''}</div><span>${['威胁 ×0.5','威胁 ×0.9','强化攻势','扩张巢 · 第 4 关'][i]}</span></div><div class="difficulty-reward"><small>永久资源</small><span>${svg('hex')}<b>${['+1 / 3 关','+1 / 3 关','+2 / 3 关','+1 / 关'][i]}</b></span></div><span class="radio-mark" aria-hidden="true"></span></button>`).join('')}</div></section><div class="screen-bottom difficulty-footer">${infoButton('难度', '难度在本局内保持不变。完成关卡获得本族永久资源。','规则')}${button('继续 '+svg('next'),'route:confirm','primary')}</div>`;
}
function confirm(){
 const r=raceInfo[state.race],s=factionStats[state.race];
 return `${masthead('新游戏')}${title('作战部署','','difficulty',navSteps(3))}<section class="confirm-layout"><article class="deployment-art panel">${paintedPortrait()}<div class="deployment-art-label"><small>${r.english}</small><h2>${r.name}</h2><span>${difficulties[state.difficulty][0]} · 18 关</span></div></article><div class="deployment-config"><section class="panel config-panel"><h2>天赋预设</h2><div class="preset-tabs" role="group" aria-label="天赋预设">${['前线推进','机械防线','空军支援'].map((p,i)=>`<button data-action="select-preset" data-value="${i}" aria-pressed="${state.preset===i}">${p}</button>`).join('')}</div><div class="allocation-readout"><b>24<span>/ 80</span></b><div>战术投入<small>已投入 24 点</small></div>${button('编辑','route:talents','small')}</div></section><section class="panel config-panel"><h2>初始部队</h2><div class="starting-roster">${img('unit.'+r.unit)}<div><b>${names[r.unit]} ×${s.bodies}</b><p>${s.building}</p></div></div><div class="starting-resource">${money(s.minerals,0)}</div></section><div class="departure-notice">${svg('save')}<span>替换续局槽</span><button data-action="preview-export">导出</button>${infoButton('续局槽','开始新游戏将替换续局槽。可先导出当前存档。')}</div></div></section><div class="screen-bottom"><span>部署就绪</span>${button('出发 '+svg('arrow'),'route:loading','primary launch',`data-autofocus`)}</div>`;
}
function loading(){
 return `${masthead('战场装载')}<section class="loading-page"><div class="loading-portrait" aria-hidden="true">${paintedPortrait()}</div><div class="loading-emblem">${svg('target')}<div class="loading-ring"></div></div><h1>部署中</h1><p>${raceInfo[state.race].name} · ${difficulties[state.difficulty][0]} · 工业遗址</p><div class="loading-progress"><div class="progress-track"><i id="loading-bar"></i></div><strong id="loading-percent">0%</strong></div><div class="load-stages"><span class="done">${svg('check')}战局</span><span id="load-stage">${svg('hex')}部队</span><span id="load-final">${svg('target')}战场</span></div><div class="loading-actions">${button('取消','route:confirm','small')}<button id="enter-battle" class="game-button primary" data-action="route:battle" disabled><span>进入战场</span></button></div></section>`;
}
function minimap(){return `<div class="mini-map" aria-label="工业遗址小地图"><img src="${mapAsset('terran-minimap')}" alt="工业遗址俯视地图" draggable="false"><span class="minimap-view" aria-hidden="true"></span><svg class="minimap-chassis" viewBox="0 0 160 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
 <defs>
  <linearGradient id="mini-steel" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#7b8589"/><stop offset=".12" stop-color="#46545b"/><stop offset=".5" stop-color="#28333b"/><stop offset=".86" stop-color="#172129"/><stop offset="1" stop-color="#4a565d"/></linearGradient>
  <linearGradient id="mini-plate" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#778086"/><stop offset=".35" stop-color="#3b484f"/><stop offset="1" stop-color="#1b252c"/></linearGradient>
  <linearGradient id="mini-recess" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#020508"/><stop offset="1" stop-color="#718087"/></linearGradient>
 </defs>
 <path class="minimap-shell" fill="url(#mini-steel)" fill-rule="evenodd" stroke="#060c11" stroke-width="2" d="M8 1H48L56 5H138L159 25V152L152 159H8L1 152V8Z M12 12V148H148V12Z"/>
 <path fill="none" stroke="#9ca5a4" stroke-opacity=".55" d="M3 150V9L9 3H47L55 7H137L156 26V151M9 156H149"/>
 <path fill="none" stroke="#111a20" stroke-width="2" d="M7 145V12L12 7H45M58 10H132M153 33V143M17 153H143"/>
 <path fill="none" stroke="url(#mini-recess)" stroke-width="3" d="M12 147V12H147V147Z"/>
 <path fill="url(#mini-plate)" stroke="#101a20" d="M8 1H48L59 11H12L7 16V7Z M129 5H138L158 25V36L149 27V15Z M2 139L10 145V151H31L38 158H8L2 152Z M151 139L158 132V151L151 158H133L140 151H150Z"/>
 <path fill="none" stroke="#b8c0bd" stroke-opacity=".55" d="M10 3H46L52 8M132 7H137L154 24M4 143L10 149H28M142 154H150L154 150"/>
 <path class="minimap-slots" fill="none" stroke="#0b141b" stroke-width="2" d="M65 8H82M89 8H107M55 153H105M5 46V57M5 64V76M5 83V95M155 54V67M155 74V87"/>
 <path class="minimap-lamps" fill="none" stroke="#93ba98" stroke-width="2" d="M17 7H22M26 7H31M35 7H40"/>
 <path class="minimap-hazard" fill="none" stroke="#bda06d" stroke-width="1.5" d="M141 14L145 18M145 14L149 18M146 19L150 23"/>
 <g fill="#111a20" stroke="#788587" stroke-width=".8"><circle cx="6" cy="29" r="1.5"/><circle cx="6" cy="123" r="1.5"/><circle cx="154" cy="111" r="1.5"/><circle cx="119" cy="154" r="1.5"/></g>
 </svg></div>`;}
function rosterLayout(){
 const size=frame.getBoundingClientRect().width>=1000?14:7,pages=Math.ceil(28/size);
 const page=Math.min(pages-1,Math.floor((state.rosterStart||0)/size));
 return {size,pages,page};
}
function portraits(){
 const r=raceInfo[state.race],all=r.families.flatMap((family,j)=>Array.from({length:5},(_,i)=>({id:family,key:family+'-'+i,rank:j===2?'Ⅲ':'Ⅱ',hp:78+((i*7+j*11)%23),kind:j===1&&i===0?'elite':'ordinary'}))).concat(r.heroes.map((hero,i)=>({id:hero,key:'hero-'+i,rank:'Ⅱ',hp:86-i*8,kind:'hero'})));
 const layout=rosterLayout(),shown=all.slice(layout.page*layout.size,(layout.page+1)*layout.size);
 return '<div class="portrait-grid" aria-label="作战部队">'+shown.map(u=>'<button class="unit-portrait '+u.kind+' '+(state.selectedUnit===u.id?'focused':'')+'" data-action="inspect-unit" data-unit="'+u.id+'" aria-label="查看'+names[u.id]+'详情">'+img((u.kind==='hero'?'hero.':'unit.')+u.id)+'<span class="portrait-rank">'+u.rank+'</span>'+(u.kind!=='ordinary'?'<span class="portrait-badge">'+(u.kind==='hero'?'★':'◆')+'</span>':'')+'<span class="portrait-hp"><i style="--fill:'+u.hp+'%"></i></span>'+(state.race==='protoss'?'<span class="portrait-shield"><i style="--fill:75%"></i></span>':'')+(u.id==='zergling'?'<span class="twin-count">2/2</span>':'')+'</button>').join('')+'</div>';
}
function commands(){
 const r=raceInfo[state.race],layout=rosterLayout();
 return '<div class="command-grid"><button class="command-key" data-action="skill:detection" aria-label="侦测">'+svg('eye')+'<b>侦测</b><kbd>G</kbd></button><button class="command-key" data-action="skill:siege" aria-label="'+(state.race==='terran'?'架炮':'部署')+'">'+img('tech.siege')+'<b>'+(state.race==='terran'?'架炮':'部署')+'</b><kbd>T</kbd></button><button class="command-key" data-action="skill:dash" aria-label="推进">'+img('tech.boost')+'<b>推进</b><kbd>Space</kbd></button>'+r.heroes.map((h,i)=>'<button class="command-key hero-command" data-action="skill:'+h+'" aria-label="'+names[h]+'技能">'+img('hero.'+h)+'<b>'+names[h]+'</b><kbd>'+(i+1)+'</kbd></button>').join('')+'<button class="command-key roster-turn" data-action="roster-toggle" aria-label="切换部队页，当前第'+(layout.page+1)+'页，共'+layout.pages+'页">'+svg('next')+'<b>'+(layout.page+1)+'/'+layout.pages+'</b></button>'+(layout.size===14?'<button class="command-key production-command" data-action="modal:production" aria-label="整备部队">'+img('building.barracks')+'<b>整备</b></button>':'')+'</div>';
}
function battlefield(){
 const r=raceInfo[state.race],bounds=frame.getBoundingClientRect(),kind=bounds.width<=600?'portrait':bounds.height<=500?'wide':'landscape';
 return '<section class="battle-page '+(state.consoleFolded?'console-folded':'')+'"><header class="battle-top"><span class="battle-location">工业遗址</span><div class="battle-resources">'+money(state.minerals,state.gas)+'<span class="population">'+svg('hex')+'<b>8</b></span></div><div class="battle-stage"><b>06<span> / 18</span></b><strong>01:24</strong></div>'+iconButton('pause','暂停','modal:pause')+'</header><div class="battle-playfield" aria-label="战场"><img class="battle-map-image" src="'+mapAsset(state.race+'-'+kind)+'" alt="工业遗址 · '+r.name+'作战部队" data-map-kind="'+kind+'" draggable="false"><div class="battle-vignette"></div><div class="battle-map-rim" aria-hidden="true"><i></i><i></i><i></i><i></i></div>'+minimap()+'<div class="joystick" role="img" aria-label="移动摇杆"><div></div></div></div><section class="battle-console"><button class="console-fold" data-action="fold-console" aria-label="'+(state.consoleFolded?'展开部队栏':'收起部队栏')+'" aria-expanded="'+(!state.consoleFolded)+'" aria-controls="console-body">'+svg(state.consoleFolded?'back':'next')+'</button><div class="console-body" id="console-body" '+(state.consoleFolded?'inert aria-hidden="true"':'')+'><section class="army-block">'+portraits()+'</section><section class="command-block">'+commands()+'</section></div></section></section>';
}
const shopHeader=(name,back='battle')=>`${masthead('第 6 关完成')}${title(name,'暂停中',back,`<div class="header-wallet">${money(state.minerals,state.gas)}</div>`)}<div class="intermission-steps"><button class="${state.page==='development'?'active':''}" data-action="route:development"><i>1</i>基地建设</button><span></span><button class="${['shop','heroes'].includes(state.page)?'active':''}" data-action="route:shop"><i>2</i>强化商店</button><span></span><button data-action="route:battle"><i>3</i>返回前线</button></div>`;
function development(){return intermissionUI.development();}
function shop(){return intermissionUI.shop();}
function heroes(){return intermissionUI.heroes();}
function cardLibrary(){return intermissionUI.library();}
function intermissionServices(){return intermissionUI.services();}
const lineNames={resources:'后勤',soldiers:'武装',army:'军团',micro:'微操'};
const lineIcons={resources:'ui.minerals',soldiers:'tech.attack',army:'hero.raynor',micro:'tech.boost'};
const lineCopy={resources:['补给不断，火力不熄。','采集 · 建设 · 招募'],soldiers:['枪更猛，命更硬。','火力 · 防护 · 军衔'],army:['并肩作战，越战越强。','老兵 · 援军 · 精锐'],micro:['一招快，步步先。','射程 · 部署 · 走位']};
const previewAllocated=['R01','R02','R03','R04','S01','S02','A01','M01'];
function talentLevel(id){return state.talentLevels[id]??(previewAllocated.includes(id.slice(-3))?3:0);}
function talentTotals(){return talents.filter(t=>t.race===state.talentRace).reduce((n,t)=>({points:n.points+talentLevel(t.id),investment:n.investment+talentLevel(t.id)*t.resourceCost}),{points:0,investment:0});}
const talentText=t=>talentCopy[t.id]||{name:t.name,flavour:'磨好利刃，奔赴前线。',summary:'强化你的部队',effects:[]};
function talentRequirements(t){
 const list=talents.filter(v=>v.race===t.race),text=t.prerequisiteText,requirements=[];
 for(const match of text.matchAll(/([RSAM]\d{2})(满|≥\d+)/g)){
  const node=list.find(v=>v.id.endsWith(match[1]));if(!node)continue;
  const level=match[2]==='满'?node.maxRank:Number(match[2].slice(1));
  requirements.push({label:talentText(node).name+(level===node.maxRank?'达到满级':'达到 '+level+' 级'),ready:talentLevel(node.id)>=level,ids:[node.id]});
 }
 if(text.includes('第五层')){
  const nodes=list.filter(v=>v.line===t.line&&v.tier===5),full=nodes.filter(v=>talentLevel(v.id)>=v.maxRank).length;
  const dynamic=text.includes('第1')||text.includes('第 1');
  const needed=dynamic?(text.includes('1／2项')||text.includes('1/2项')?Math.min(2,talentLevel(t.id)+1):Math.min(3,talentLevel(t.id)+2)):2;
  requirements.push({label:'第五阶中 '+needed+' 项天赋达到满级（'+full+'/'+needed+'）',ready:full>=needed,ids:nodes.map(v=>v.id),group:true});
 }
 return requirements;
}
function canLearn(t){const totals=talentTotals();return talentLevel(t.id)<t.maxRank&&totals.points<80&&70-totals.investment>=t.resourceCost&&talentRequirements(t).every(r=>r.ready);}
function talentSlot(t,list){const group=list.filter(n=>n.tier===t.tier),i=group.findIndex(n=>n.id===t.id);return group.length===1?2:group.length===2?i*2+1:i+1;}
function talentIcon(t,index=0){const r=raceInfo[t.race];return t.line==='resources'?(index%3===1?'ui.gas':index%3===2?'building.barracks':'ui.minerals'):t.line==='soldiers'?'unit.'+r.families[index%5]:t.line==='army'?'hero.'+r.heroes[index%3]:'tech.boost';}
function talentTree(list){
 const links=[];
 for(const t of list)for(const req of talentRequirements(t))for(const id of req.ids){const from=list.find(v=>v.id===id);if(from)links.push({from,to:t,ready:req.ready,group:req.group});}
 const lines=vertical=>links.map(link=>{
  const sx=(link.from.tier-.5)*100,sy=(talentSlot(link.from,list)-.5)*100,tx=(link.to.tier-.5)*100,ty=(talentSlot(link.to,list)-.5)*100;
  const d=vertical?'M '+sy+' '+sx+' V '+((sx+tx)/2)+' H '+ty+' V '+tx:'M '+sx+' '+sy+' H '+((sx+tx)/2)+' V '+ty+' H '+tx;
  return '<path class="'+(link.ready?'lit':'')+' '+(link.group?'group-link':'')+'" d="'+d+'"/>';
 }).join('');
 return '<div class="talent-tree-board"><svg class="tree-connectors horizontal" viewBox="0 0 700 300" preserveAspectRatio="none" aria-hidden="true">'+lines(false)+'</svg><svg class="tree-connectors vertical" viewBox="0 0 300 700" preserveAspectRatio="none" aria-hidden="true">'+lines(true)+'</svg><div class="tree-tiers" aria-hidden="true">'+['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ'].map(n=>'<span>'+n+'</span>').join('')+'</div><div class="talent-full-tree" role="group" aria-label="'+raceInfo[state.talentRace].name+lineNames[state.talentLine]+'完整天赋树">'+list.map((t,i)=>'<button class="talent-map-node '+(talentLevel(t.id)>0?'learned':'')+' '+(canLearn(t)?'available':'')+'" data-action="select-talent" data-value="'+t.id+'" style="--tier:'+t.tier+';--lane:'+talentSlot(t,list)+'" aria-label="'+esc(talentText(t).name)+'，'+talentLevel(t.id)+' / '+t.maxRank+'级">'+img(talentIcon(t,i))+'<b>'+esc(talentText(t).name)+'</b><small>'+talentLevel(t.id)+'<span> / '+t.maxRank+'</span></small></button>').join('')+'</div></div>';
}
function talentBack(){if(state.talentMenu==='tree')state.talentMenu='paths';else if(state.talentMenu==='paths')state.talentMenu='races';else return go(state.talentReturn);state.selectedTalent=null;render();}
function talentsPage(){
 const level=state.talentMenu,r=state.talentRace,rt=raceInfo[r],totals=talentTotals();
 const heading=level==='races'?'天赋':level==='paths'?rt.name+'天赋':lineNames[state.talentLine];
 const trail='<nav class="talent-breadcrumb" aria-label="天赋菜单"><button data-action="talent-level" data-value="races" '+(level==='races'?'aria-current="page"':'')+'>种族</button><span>›</span>'+(level==='races'?'<span>方向</span>':'<button data-action="talent-level" data-value="paths" '+(level==='paths'?'aria-current="page"':'')+'>'+rt.name+'</button>')+'<span>›</span><span '+(level==='tree'?'aria-current="page"':'')+'>'+(level==='tree'?lineNames[state.talentLine]:'天赋树')+'</span></nav>';
 let body='';
 if(level==='races')body='<section class="talent-race-menu" aria-label="选择天赋种族">'+Object.entries(raceInfo).map(([id,v])=>'<button class="talent-race-choice panel" data-action="talent-race" data-value="'+id+'" style="--choice-accent:'+v.accent+'"><div class="talent-choice-art">'+paintedPortrait(id)+'</div><div class="talent-choice-copy"><small>'+v.english+'</small><h2>'+v.name+'</h2><p>'+v.title+'</p><span>'+talents.filter(t=>t.race===id).reduce((n,t)=>n+talentLevel(t.id),0)+' / 80</span>'+svg('next')+'</div></button>').join('')+'</section>';
 else if(level==='paths')body='<section class="talent-path-menu" aria-label="选择天赋方向">'+Object.entries(lineNames).map(([id,n],i)=>{
  const list=talents.filter(t=>t.race===r&&t.line===id),spent=list.reduce((n,t)=>n+talentLevel(t.id),0),cap=id==='micro'?17:41;
  return '<button class="talent-path-choice panel" data-action="talent-line" data-value="'+id+'"><span class="path-number">0'+(i+1)+'</span><div class="path-icon">'+img(id==='army'?'hero.'+rt.heroes[0]:lineIcons[id])+'</div><h2>'+n+'</h2><p>'+lineCopy[id][0]+'</p><small>'+lineCopy[id][1]+'</small><div class="path-progress"><i style="--fill:'+spent/cap*100+'%"></i></div><span class="path-investment">'+spent+' / '+cap+'</span>'+svg('next')+'</button>';
 }).join('')+'</section>';
 else body=talentTree(talents.filter(t=>t.race===r&&t.line===state.talentLine));
 return '<section class="talent-screen level-'+level+'"><header class="talent-heading"><div>'+iconButton('back',level==='races'?'返回':'返回上级','talent-back')+'<h1>'+heading+'</h1></div><div class="talent-ledger"><span class="talent-point-count"><b>'+totals.points+'</b> / 80</span><span class="talent-budget">'+svg('hex')+'<b>'+Math.max(0,70-totals.investment)+'</b></span></div></header>'+trail+body+'<footer class="talent-menu-footer">'+(level!=='races'?button('洗点','reset-talents','small')+infoButton('战术天赋','三族各自积攒资源。后勤、武装、军团和微操合计最多 80 点。每学一级花费 1 点，洗点返还已投入的天赋资源。'):'<span>磨好利刃，再上战场。</span>')+button(state.talentReturn==='confirm'?'返回部署':'返回标题','talent-exit','primary')+'</footer></section>';
}
function talentDetails(){
 const t=talents.find(n=>n.id===state.selectedTalent);if(!t)return details();
 const c=talentText(t),lv=talentLevel(t.id),requirements=talentRequirements(t),totals=talentTotals();
 const reason=lv>=t.maxRank?'已学成':totals.points>=80?'天赋已达上限':70-totals.investment<t.resourceCost?'资源不足':requirements.some(r=>!r.ready)?'先学会前置天赋':'学习';
 return modalShell(c.name,lineNames[t.line]+' · 第 '+['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ'][t.tier-1]+' 阶','<div class="talent-modal-title">'+img(talentIcon(t))+'<div><span>'+lv+' / '+t.maxRank+'</span><p>'+esc(c.flavour)+'</p></div></div><div class="talent-effects">'+c.effects.map(s=>'<p>'+esc(s)+'</p>').join('')+'</div>'+(requirements.length?'<section class="talent-requirements"><h2>学习条件</h2>'+requirements.map(r=>'<div class="'+(r.ready?'ready':'')+'">'+svg(r.ready?'check':'hex')+'<span>'+esc(r.label)+'</span></div>').join('')+'</section>':'')+'<div class="talent-learn-cost"><span>天赋资源</span>'+svg('hex')+'<b>'+t.resourceCost+'</b><span>· 1 点</span></div>','talent-modal',button('返回天赋树','modal-close','secondary')+button(reason,'preview-talent','primary','data-id="'+t.id+'" '+(!canLearn(t)?'disabled':'')));
}
function saves(){
 return `${masthead('战局档案')}${title('读取存档','','home')}<section class="saves-layout"><article class="save-card panel"><div class="save-scene" style="background-image:url('${mapAsset('terran-landscape')}')"><span class="save-tag">续局</span><span class="saved-stage">06 <small>/ 18</small></span></div><div class="save-copy"><div>${img('unit.marine')}<div><h2>人族 · 普通</h2><p>工业遗址</p></div></div><dl><dt>部队</dt><dd>28</dd><dt>天赋</dt><dd>24 / 80</dd><dt>保存</dt><dd>10.03 · 20:42</dd></dl><div class="save-wallet">${money(1240,380)}</div>${button('载入 '+svg('next'),'preview-load','primary')}</div></article><aside class="save-side"><div class="panel"><h2>导入战局</h2>${button(svg('download')+' 选择文件','preview-import','small')}</div><div class="save-note">${svg('pause')}<div><b>暂停中</b></div>${infoButton('恢复战局','从暂停的战场恢复，保留部队伤损、冷却与训练进度。准备好后继续。')}</div></aside></section>`;
}
function victory(){return `${masthead('作战档案')}<section class="victory-page"><div class="victory-crest">${svg('shield')}<div class="victory-rays"></div></div><div class="victory-title"><span>战役完成</span><h1>胜利</h1><p>18 / 18 · 主巢摧毁</p></div><div class="victory-stats"><div><span>完成关卡</span><b>18<small>/18</small></b></div><div><span>击杀</span><b>2,846</b></div><div><span>成功救援</span><b>27</b></div><div><span>幸存战士</span><b>23</b></div></div><p class="victory-reward">${svg('hex')}资源已结算</p><div class="victory-actions">${button('撤离','route:home','secondary')}${button('无尽 '+svg('arrow'),'route:endless','primary')}</div><div class="victory-footer">${button('导出战局档案','preview-export','text-button')}${button('返回标题','route:home','text-button')}</div></section>`;}
function endless(){
 return `${masthead('无尽整备')}${title('无尽','','victory')}<section class="endless-layout"><div class="endless-map panel"><img class="endless-map-image" src="${mapAsset(state.race+'-landscape')}" alt="无尽作战区域"><div class="endless-map-label"><h2>无尽战场</h2><span>据点防线</span></div></div><aside class="endless-info"><h2>下一片前线</h2>${tags(['60 s / 轮','4 轮 / 发展'])}<div class="endless-checklist"><div>${svg('check')}部队</div><div>${svg('check')}伤损 / 冷却</div><div>${svg('check')}生产订单</div></div>${infoButton('无尽战场','一轮守住 60 秒，每四轮返回基地整备。战友、伤损、技能冷却和正在训练、空投的部队会继续跟随你。')}${button('整备','modal:production','secondary')}${button('出发 '+svg('arrow'),'load-endless','primary')}</aside></section>`;
}
function modalShell(name,subtitle,body,cls='',foot=''){return `<div class="modal-scrim"><section class="modal-window panel ${cls}" role="dialog" aria-modal="true" aria-label="${name}" tabindex="-1"><header class="modal-heading"><div><h1>${name}</h1>${subtitle?`<p>${subtitle}</p>`:''}</div>${iconButton('close','关闭','modal-close')}</header><div class="modal-content">${body}</div>${foot?`<footer class="modal-footer">${foot}</footer>`:''}</section></div>`;}
function pause(){return modalShell('暂停','第 6 关 · 工业遗址',`<div class="pause-summary">${img('unit.'+raceInfo[state.race].unit)}<div><b>${raceInfo[state.race].name} / ${difficulties[state.difficulty][0]}</b><span>28 名战士 · 01:24</span></div>${money(state.minerals,state.gas)}</div><nav class="pause-actions">${button(svg('play')+' 继续','modal-close','primary',`data-autofocus`)}${button(svg('save')+' 战局档案','preview-save')}${button('整备部队','modal:production')}${button(svg('gear')+' 操作与画质','modal:settings')}${button(svg('download')+' 导出','preview-export')}${button('返回标题','route:home','text-button')}</nav><p class="pause-hint">暂停中</p>`,'pause-modal');}
function settings(){const tab=state.settingTab;const range=(label,value)=>`<label class="setting-row"><span>${label}</span><div class="slider-setting"><input type="range" min="0" max="100" value="${value}" aria-label="${label}"><output>${value}%</output></div></label>`;return modalShell('操作与画质','',`<nav class="settings-tabs" role="group" aria-label="设置分类">${[['control','操作'],['graphics','画面'],['audio','声音']].map(([id,n])=>`<button data-action="setting-tab" data-value="${id}" aria-pressed="${tab===id}">${n}</button>`).join('')}</nav><div class="settings-body">${tab==='control'?`<label class="setting-row"><span>电脑移动</span><select aria-label="电脑移动"><option>鼠标点击移动</option><option>WASD / 方向键</option></select></label><label class="setting-row"><span>手机移动</span><select aria-label="手机移动"><option>左侧虚拟摇杆</option><option>点击战场移动</option></select></label><div class="keyboard-diagram"><div><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><small>移动方向</small></div><div><kbd>T</kbd><kbd>E</kbd><kbd>G</kbd><small>架炮 · 兴奋剂 · 侦测</small></div><div><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><small>英雄技能</small></div></div>${button('手柄校准','controller-preview','small')}`:tab==='graphics'?`<label class="setting-row"><span>画质</span><select aria-label="画质"><option>高画质</option><option>均衡</option><option>节能</option></select></label><label class="setting-row"><span>单位动作</span><select aria-label="单位动作"><option>完整动作</option><option>节能动作</option></select></label><label class="setting-row"><span>文字大小</span><select id="text-size" aria-label="文字大小"><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option></select></label><label class="setting-row"><span>界面动态效果</span><button class="toggle-switch" data-action="toggle-motion" aria-pressed="${state.motion}" aria-label="动态效果">${state.motion?'开启':'关闭'}<i></i></button></label>`:`${range('主音量',80)}${range('战场音效',75)}${range('界面音效',45)}`}</div>`,'settings-modal',button('返回','modal-close','primary'));}
function unitInspector(){const id=state.selectedUnit,isHero=raceInfo[state.race].heroes.includes(id);return modalShell(names[id]||'单位详情',isHero?'英雄 · 军衔 Ⅱ':'普通单位 · 军衔 Ⅱ',`<div class="unit-inspector-main">${img((isHero?'hero.':'unit.')+id,names[id])}<div><div class="vitals"><b>生命</b><span>124 / 148</span><i><b style="--fill:84%"></b></i></div>${state.race==='protoss'?'<div class="vitals shields"><b>护盾</b><span>60 / 80</span><i><b style="--fill:75%"></b></i></div>':''}<span class="status-tag">可行动</span></div></div><div class="inspect-stats"><div><span>攻击</span><b>13.8</b></div><div><span>护甲</span><b>1.5</b></div><div><span>移动</span><b>4.17</b></div><div><span>攻击间隔</span><b>0.45s</b></div></div>`,'unit-modal',button('返回部队','modal-close','primary'));}
function production(){
 const groups={terran:[['marine','marauder','reaper'],['tank'],['medivac']],zerg:[['zergling','baneling','queen'],['roach','hydralisk'],[]],protoss:[['zealot','stalker','sentry'],['immortal','colossus'],[]]}[state.race];
 const labels={terran:['兵营','重工厂','星港'],zerg:['基础虫群','地面进化','飞行虫群'],protoss:['传送门','机械台','星门']}[state.race];
 const icons=state.race==='terran'?['building.barracks','building.factory','building.starport']:{zerg:['unit.zergling','unit.hydralisk','unit.mutalisk'],protoss:['unit.zealot','unit.immortal','unit.phoenix']}[state.race];
 const rows=groups.map((units,j)=>`<section class="production-row"><div class="production-name">${img(icons[j])}<div><h2>${labels[j]}</h2><span>${j===0?'2 座':'1 座'} · ${units.length?'援军集结':'等待解锁'}</span></div><button class="toggle-switch" data-action="toggle-production" aria-label="${labels[j]}训练开关" aria-pressed="${!!units.length}" ${units.length?'':'disabled'}>${units.length?'开启':'待命'}<i></i></button></div><div class="production-units">${units.map(f=>`<button data-action="production-select" aria-pressed="true">${img('unit.'+f)}${names[f]}</button>`).join('')}</div><div class="production-order"><span>${!units.length?'飞行部队尚未解锁':j===0?'训练中 · 8 秒':j===1?'援军待命 · 等待降落':'训练中 · 12 秒'}</span>${units.length?`<div class="progress-track"><i style="--fill:${j===0?72:j===1?100:46}%"></i></div>`:''}</div></section>`).join('');
 return modalShell('持续生产','部队集结',`<div class="production-list">${rows}</div><div class="production-services">${button('查看生命修复','repair-preview','small')}${button('查看英雄复活','revive-preview','small')}</div>`,'production-modal',button('完成整备','modal-close','primary'));
}
function family(){
 return modalShell('接收增援','兵种 5 / 5',`<div class="incoming-family">${img('unit.'+({terran:'thor',zerg:'ultralisk',protoss:'void_ray'}[state.race]))}<div><h2>${{terran:'雷神',zerg:'雷兽',protoss:'虚空辉光舰'}[state.race]}</h2><p>已抵达</p></div>${infoButton('轮换部队','让一支小队撤离，为新援军腾出位置。尚未登舰的训练费用会返还，已经出发的部队不退款。新兵继承部分军衔，具体结果见下方。')}</div><div class="family-list">${raceInfo[state.race].families.map((f,i)=>`<button data-action="replace-family" data-family="${f}">${img('unit.'+f)}<div><b>${names[f]}</b><span>${i===2?'Ⅲ → Ⅱ':'Ⅱ → Ⅰ'} · 返还未出发费用</span></div>${svg('next')}</button>`).join('')}</div>`,'family-modal',button('放弃增援','modal-close','secondary'));
}

function loadPreview(){return modalShell('检查存档','',`<div class="load-preview-summary"><h2>人族 · 普通 · 06 / 18</h2><p>2026.10.03 20:42</p><div>${money(1240,380)}</div><dl><dt>本局天赋</dt><dd>24 / 80</dd><dt>作战部队</dt><dd>28 名战士</dd><dt>恢复状态</dt><dd>暂停</dd></dl></div>`,'load-modal',button('返回','modal-close','secondary')+button('载入这份存档','resume-save','primary'));}
function elitePreview(){return intermissionUI.elitePreview();}
const intermissionUI=createIntermissionUI({state,frame,img,money,svg,button,esc,modalShell,pushModal,popModal,go,render,renderModal,toast,asset,coverAsset,mapAsset,getFixture:()=>cardFixture});
const renderers={cards:cardLibrary,rest:intermissionServices,home,race:races,difficulty,confirm,loading,battle:battlefield,development,shop,heroes,talents:talentsPage,saves,victory,endless};
function details(){
 return modalShell(state.detail?.title||'详情','',`<p class="detail-copy">${esc(state.detail?.copy||'')}</p>`,'detail-modal',button('返回','modal-close','primary'));
}
const modals={card:()=>intermissionUI.details(),details,pause,settings,unit:unitInspector,production,family,talent:talentDetails,'load-preview':loadPreview,elite:elitePreview};
function rememberFocus(){const n=document.activeElement;return n?.dataset.action?{action:n.dataset.action,value:n.dataset.value,id:n.dataset.id,unit:n.dataset.unit,title:n.dataset.title}:null;}
function restoreFocus(key,host=frame){if(!key)return;[...host.querySelectorAll('button')].find(n=>n.dataset.action===key.action&&n.dataset.value===key.value&&n.dataset.id===key.id&&n.dataset.unit===key.unit&&n.dataset.title===key.title)?.focus({preventScroll:true});}
function applyFocus(callback){callback();}
function firstFocus(host,selector){return host.querySelector('[data-autofocus]')||host.querySelector(selector);}
function syncCoverTimer(){
 clearInterval(coverTimer);
 if(state.page!=='home'||!state.motion||!state.autoCover||state.layers.length||document.hidden)return;
 coverTimer=setInterval(()=>{
  if(scene.querySelector('.cover-controls:hover,.cover-controls:focus-within'))return;
  changeCover((state.coverIndexes[state.race]+1)%3,true);
 },18000);
}
function changeCover(index,automatic=false){
 const race=state.race,c=coverCatalog[race][(index+3)%3],request=++coverRequest;
 if(state.page!=='home'||state.layers.length)return;
 const previous=scene.querySelector('.cover-layer.is-active'),incoming=scene.querySelector('.cover-layer:not(.is-active)');
 const activate=()=>{
  if(request!==coverRequest||race!==state.race||state.page!=='home'||!incoming.naturalWidth)return;
  incoming.onload=null;
  state.coverIndexes[race]=(index+3)%3;
  incoming.dataset.coverId=c.id;previous.classList.remove('is-active');incoming.classList.add('is-active');
  frame.dataset.cover=c.id;scene.querySelector('.cover-name').textContent=names[c.hero];
  scene.querySelectorAll('[data-action=cover-select]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.value)===state.coverIndexes[race])));
  if(!automatic)syncCoverTimer();
 };
 incoming.onload=activate;
 incoming.onerror=()=>console.error('Cover unavailable',c.id);
 incoming.src=coverAsset(c.id);
 if(incoming.complete)activate();
}
function setMotion(){frame.classList.toggle('reduce-motion',!state.motion);$('#motion-button').setAttribute('aria-pressed',String(state.motion));$('#motion-button').textContent='动效 '+(state.motion?'开':'关');syncCoverTimer();}
function previewRouteValue(){const name=state.layers.at(-1)?.name;return ['card','unit','details','elite','load-preview','talent'].includes(name)?state.page:name||state.page;}
function render({focus=true}={}){
 const focused=rememberFocus();
 clearTimeout(toastTimer);$('#toast').classList.remove('visible');$('#toast').textContent='';
 coverRequest++;
 frame.dataset.race=state.page==='talents'?state.talentRace:state.race;frame.dataset.page=state.page;
 frame.dataset.cover=currentCover().id;
 frame.style.setProperty('--accent',raceInfo[state.page==='talents'?state.talentRace:state.race].accent);
 scene.innerHTML=(renderers[state.page]||home)();

 renderModal(focus);$('#page-select').value=previewRouteValue();setMotion();
 if(focus&&!state.layers.length)applyFocus(()=>firstFocus(scene,'.screen-heading .icon-button,.talent-heading .icon-button,.primary')?.focus({preventScroll:true}));
 if(!focus)applyFocus(()=>restoreFocus(focused));
}
function renderModal(focus=true){const focused=rememberFocus(),layer=state.layers.at(-1);overlay.innerHTML=layer?(modals[layer.name]||pause)():'';if(layer&&focus)applyFocus(()=>firstFocus(overlay,'.modal-window .icon-button,.primary')?.focus({preventScroll:true}));if(layer&&!focus)applyFocus(()=>restoreFocus(focused,overlay));syncCoverTimer();}
function go(page,{record=true}={}){
 if(page==='talents'){state.talentReturn=state.page==='confirm'?'confirm':'home';state.talentRace=state.race;state.talentMenu='races';state.selectedTalent=null;}
 if(modalRoutes.has(page)){if(state.page!=='battle'){state.page='battle';render({focus:false});}pushModal(page);return;}
 clearInterval(loadingTimer);state.layers=[];state.page=renderers[page]?page:'home';state.rosterPage=0;
 if(state.motion){frame.classList.remove('changing');void frame.offsetWidth;frame.classList.add('changing');clearTimeout(transitionTimer);transitionTimer=setTimeout(()=>frame.classList.remove('changing'),560);}
 render();if(record)history.pushState({page:state.page},'',`#${state.page}`);if(page==='loading')startLoading();
}
function pushModal(name,trigger=document.activeElement){const active=trigger;state.layers.push({name,returnAction:active?.dataset.action,returnUnit:active?.dataset.unit,returnTitle:active?.dataset.title,returnValue:active?.dataset.value});renderModal();$('#page-select').value=['card','unit','details','elite','load-preview','talent'].includes(name)?state.page:name;}
function popModal(){const layer=state.layers.pop();renderModal();$('#page-select').value=previewRouteValue();applyFocus(()=>{const host=state.layers.length?overlay:scene;const buttons=[...host.querySelectorAll('button')];const target=buttons.find(b=>b.dataset.action===layer?.returnAction&&(!layer.returnUnit||b.dataset.unit===layer.returnUnit)&&(!layer.returnTitle||b.dataset.title===layer.returnTitle)&&(!layer.returnValue||b.dataset.value===layer.returnValue));(target||firstFocus(host,'.primary,.icon-button'))?.focus({preventScroll:true});});}
function toast(message){if(state.page==='battle'&&!state.layers.length)return;const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2600);}
function startLoading(){let progress=0;loadingTimer=setInterval(()=>{progress=Math.min(100,progress+7+Math.round(Math.random()*9));const bar=$('#loading-bar');if(!bar)return clearInterval(loadingTimer);bar.style.setProperty('--fill',progress+'%');$('#loading-percent').textContent=progress+'%';if(progress===100){clearInterval(loadingTimer);$('.loading-page h1').textContent='战场就绪';$('#load-stage').classList.add('done');$('#load-final').classList.add('done');$('#enter-battle').disabled=false;}},180);}
function stopDemo(){clearTimeout(demoTimer);$('#demo-button').setAttribute('aria-pressed','false');$('#demo-button').textContent='播放流程';}
function playDemo(){
 stopDemo();$('#demo-button').setAttribute('aria-pressed','true');$('#demo-button').textContent='停止播放';
 const steps=['home','saves','home','talents',{talentMenu:'paths'},{talentMenu:'tree'},{talent:'R05'},'home','race','difficulty','confirm','loading','battle','pause','settings','battle','production','battle','family','battle','development','shop','heroes','battle','victory','endless'];let i=0;
 const next=()=>{const step=steps[i];if(typeof step==='string')go(step);else if(step.talentMenu){state.talentMenu=step.talentMenu;state.talentLine='resources';render();}else if(step.talent){state.selectedTalent=talents.find(t=>t.race===state.talentRace&&t.id.endsWith(step.talent))?.id;pushModal('talent');}i++;if(i<steps.length)demoTimer=setTimeout(next,step==='loading'?2800:4200);else demoTimer=setTimeout(stopDemo,4200);};next();
}
function handle(action,b){
 if(intermissionUI.handle(action,b))return;
 if(action==='show-detail'){state.detail={title:b.dataset.title,copy:b.dataset.copy};pushModal('details',b);return;}
 if(action==='select-cover'){state.race=b.dataset.value;state.selectedUnit=raceInfo[state.race].unit;render({focus:false});return;}
 if(action==='cover-prev'||action==='cover-next'){changeCover(state.coverIndexes[state.race]+(action==='cover-next'?1:-1));return;}
 if(action==='cover-select'){changeCover(Number(b.dataset.value));return;}
 if(action==='cover-auto'){state.autoCover=!state.autoCover;b.setAttribute('aria-pressed',String(state.autoCover));b.title=state.autoCover?'暂停轮换':'开启轮换';b.innerHTML=svg(state.autoCover?'pause':'play');syncCoverTimer();return;}
 if(action.startsWith('route:')){const next=action.slice(6);return go(state.page==='talents'&&next==='home'?state.talentReturn:next);}
 if(action.startsWith('modal:'))return pushModal(action.slice(6));
 if(action==='modal-close')return popModal();
 if(action==='select-race'){state.race=b.dataset.value;state.selectedUnit=raceInfo[state.race].unit;render({focus:false});return;}
 if(action==='select-difficulty'){state.difficulty=b.dataset.value;render({focus:false});return;}
 if(action==='select-preset'){state.preset=Number(b.dataset.value);render({focus:false});return;}
 if(action==='select-hero'){state.selectedHero=Number(b.dataset.value);render({focus:false});return;}
 if(action==='inspect-unit'){state.selectedUnit=b.dataset.unit;render({focus:false});pushModal('unit',b);return;}
 if(action==='roster-toggle'){const layout=rosterLayout();state.rosterStart=((layout.page+1)%layout.pages)*layout.size;render({focus:false});scene.querySelector('.roster-turn')?.focus({preventScroll:true});return;}
 if(action==='fold-console'){state.consoleFolded=!state.consoleFolded;const page=scene.querySelector('.battle-page'),body=scene.querySelector('.console-body');page.classList.toggle('console-folded',state.consoleFolded);body.inert=state.consoleFolded;body.setAttribute('aria-hidden',String(state.consoleFolded));b.setAttribute('aria-expanded',String(!state.consoleFolded));b.setAttribute('aria-label',state.consoleFolded?'展开部队栏':'收起部队栏');b.innerHTML=svg(state.consoleFolded?'back':'next');return;}
 if(action.startsWith('skill:')){b.classList.add('command-active');setTimeout(()=>b.classList.remove('command-active'),700);return;}

 if(action==='talent-race'){state.talentRace=b.dataset.value;state.talentMenu='paths';state.selectedTalent=null;render();return;}
 if(action==='talent-line'){state.talentLine=b.dataset.value;state.talentMenu='tree';state.selectedTalent=null;render();return;}
 if(action==='talent-back')return talentBack();
 if(action==='talent-exit')return go(state.talentReturn);
 if(action==='talent-level'){state.talentMenu=b.dataset.value;state.selectedTalent=null;render();return;}
 if(action==='select-talent'){state.selectedTalent=b.dataset.value;pushModal('talent',b);return;}
 if(action==='preview-talent'){const t=talents.find(t=>t.id===b.dataset.id);if(!t||!canLearn(t))return;state.talentLevels[t.id]=talentLevel(t.id)+1;render({focus:false});toast(talentText(t).name+'，学会了。');return;}
 if(action==='reset-talents'){talents.filter(t=>t.race===state.talentRace).forEach(t=>state.talentLevels[t.id]=0);render({focus:false});toast('天赋已重置，投入的资源已返还。');return;}
 if(action==='preview-load'||action==='preview-import'){pushModal('load-preview');return;}
 if(action==='resume-save'){go('battle');pushModal('pause');return;}
 if(action==='preview-save'){pushModal('load-preview',b);return;}
 if(action==='preview-export'){pushModal('load-preview',b);return;}
 if(action==='setting-tab'){state.settingTab=b.dataset.value;renderModal(false);return;}
 if(action==='toggle-motion'){state.motion=!state.motion;setMotion();renderModal(false);return;}
 if(action==='toggle-production'||action==='production-select'){const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);if(action==='toggle-production')b.innerHTML=(on?'开启':'暂停')+'<i></i>';return;}
 if(action==='repair-preview'){toast('医疗班已待命，查看伤员后进行修复。');return;}
 if(action==='revive-preview'){toast('当前英雄均存活，无需复活。');return;}
 if(action==='replace-family'){popModal();toast('撤离命令已下达：'+names[b.dataset.family]);return;}
 if(action==='elite-select'){state.selectedElite=Number(b.dataset.value);renderModal(false);return;}
 if(action==='select-elite-member'){state.eliteMember=Number(b.dataset.value);overlay.querySelectorAll('.elite-candidates button').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));return;}
 if(action==='controller-preview'){toast('按下手柄按键，确认响应。');return;}
 if(action==='load-endless'){go('loading');toast('无尽前线，准备部署。');return;}
}
frame.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(b&&!b.disabled){b.focus({preventScroll:true});stopDemo();handle(b.dataset.action,b);}});
frame.addEventListener('input',e=>{if(e.target.dataset.imFilter==='query'){intermissionUI.change(e);return;}if(e.target.matches('input[type=range]'))e.target.nextElementSibling.value=e.target.value+'%';});
frame.addEventListener('change',e=>{if(intermissionUI.change(e))return;if(e.target.id==='text-size')frame.style.setProperty('--text-scale',e.target.value);});
document.addEventListener('keydown',e=>{
 if(intermissionUI.keydown(e))return;
 if(e.key==='Escape'){e.preventDefault();if(state.layers.length)popModal();else if(state.page==='battle')pushModal('pause');else if(state.page==='talents')talentBack();else if(state.page!=='home')go('home');return;}
 if(e.key==='Tab'&&state.layers.length){const focusable=[...overlay.querySelectorAll('button:not(:disabled),select,input,[tabindex="0"]')].filter(el=>el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
});
$('#page-select').innerHTML=routes.map(([id,n])=>`<option value="${id}">${n}</option>`).join('');
$('#page-select').addEventListener('change',e=>{stopDemo();go(e.target.value);});
document.querySelectorAll('.view-switch [data-layout]').forEach(b=>b.addEventListener('click',()=>{const orientation=b.dataset.layout;$('.preview-shell').dataset.layout=orientation;frame.dataset.device=b.dataset.device;document.querySelectorAll('.view-switch button').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));render({focus:false});}));
$('#demo-button').addEventListener('click',()=>$('#demo-button').getAttribute('aria-pressed')==='true'?stopDemo():playDemo());
$('#motion-button').addEventListener('click',()=>{state.motion=!state.motion;setMotion();});
window.addEventListener('popstate',()=>go(location.hash.slice(1)||'home',{record:false}));
document.addEventListener('visibilitychange',syncCoverTimer);
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(['battle','talents','cards'].includes(state.page))render({focus:false});},120);});
try{cardFixture=window.__UI_CARDS__||await(await fetch(new URL('cards-r9.json',root))).json();}catch(e){console.error('Card data unavailable',e);}
try{talents=window.__UI_TALENTS__||await(await fetch(new URL('talents.json',root))).json();talentCopy=window.__UI_TALENT_COPY__||await(await fetch(new URL('talent-copy-r5.json',root))).json();}catch(e){console.error('Talent data unavailable',e);}
const params=new URLSearchParams(location.search),initialLayout=params.get('layout');
if(raceInfo[params.get('race')]){state.race=params.get('race');state.selectedUnit=raceInfo[state.race].unit;}
const requestedCover=coverCatalog[state.race].findIndex(c=>c.id===params.get('cover')||c.hero===params.get('cover'));
if(requestedCover>=0)state.coverIndexes[state.race]=requestedCover;
const requestedDevice=params.get('device'),previewDevice=['desktop','mobile'].includes(requestedDevice)?requestedDevice:initialLayout==='portrait'||initialLayout==='landscape'?'mobile':matchMedia('(pointer:coarse)').matches?'mobile':'desktop';
frame.dataset.device=previewDevice;
$('.preview-shell').dataset.layout=previewDevice==='mobile'&&initialLayout==='portrait'?'portrait':'landscape';
document.querySelectorAll('.view-switch button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.device===previewDevice&&b.dataset.layout===$('.preview-shell').dataset.layout)));
intermissionUI.configure(params);
go(location.hash.slice(1)||'home',{record:false});
window.__UI_PREVIEW__={navigate:go,getState:()=>({page:state.page,race:state.race,layer:state.layers.at(-1)?.name,rosterPage:rosterLayout().page,motion:state.motion}),routes:routes.map(([id])=>id)};
