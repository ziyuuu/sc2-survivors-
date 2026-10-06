// Static inspection presentation. Reads exported values; never issues combat commands.
function createUnitInspectorR12(env){
 const {state,frame,scene,overlay,img,svg,esc,render,renderModal,pushModal,go,coverAsset}=env;
 const data=window.__UI_INSPECTOR_R12__.entries;
 const S={key:null,tab:'stats',expanded:null};
 const ranks=['','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ'];
 const attr={Light:'轻甲',Armored:'重甲',Biological:'生物',Mechanical:'机械',Massive:'巨型',Psionic:'灵能',Heroic:'英雄'};
 const kinds={ordinary:'作战单位',elite:'精英',hero:'英雄'};
 const families={terran:['marine','marauder','tank','medivac','reaper'],zerg:['zergling','roach','hydralisk','queen','baneling'],protoss:['zealot','stalker','immortal','sentry','colossus']};
 const heroes={terran:['raynor','tychus','nova'],zerg:['kerrigan','zagara','dehaka'],protoss:['artanis','zeratul','fenix']};
 const eliteIds={marine:'marine.2',marauder:'marauder.1',tank:'tank.2',medivac:'medivac.2',reaper:'reaper.1',zergling:'zergling.1',roach:'roach.2',hydralisk:'hydralisk.1',queen:'queen.3',baneling:'baneling.2',zealot:'zealot.2',stalker:'stalker.1',immortal:'immortal.2',sentry:'sentry.2',colossus:'colossus.2'};
 const weapons={marine:'高斯步枪',marauder:'惩罚者榴弹',tank:'坦克炮',medivac:'医疗束',reaper:'双持手枪',hellion:'地狱火喷射器',thor:'雷神之锤',viking:'飞弹',banshee:'背冲火箭',science_vessel:'纳米修复',zergling:'利爪',baneling:'酸液爆破',roach:'酸液',ravager:'等离子喷射',hydralisk:'骨针',queen:'毒刺',lurker:'地刺',mutalisk:'刃虫',corruptor:'腐蚀喷吐',ultralisk:'巨刃',zealot:'灵能双刃',adept:'共鸣刃',stalker:'粒子裂解炮',sentry:'裂解光束',immortal:'相位裂解炮',colossus:'热能射线',high_templar:'灵能之力',phoenix:'离子炮',void_ray:'棱镜光束',carrier:'截击机'};
 const traits={
  marine:['兴奋剂','注入兴奋剂，以更快的射击守住火线。'],marauder:['重甲猎手','榴弹擅长击穿重甲，只能攻击地面敌人。'],tank:['攻城模式','架起炮台，轰击远处的地面敌群。收炮后恢复移动。'],medivac:['战地医疗','持续治疗受伤友军。生物单位全效，机械单位为三分之一；恢复生命时消耗能量。'],reaper:['越障突击','翻越高低地形，凭双枪追击敌人。'],zergling:['双生虫群','两只跳虫并肩作战，各自承受伤害。一只存活时，另一只可在 15 秒后再生。'],roach:['甲壳恢复','以厚重甲壳顶住前线，喷吐酸液攻击地面敌人。'],hydralisk:['骨针齐射','从地面到天空，都在骨针射程之内。'],queen:['虫群支援','以毒刺掩护虫群，消耗能量施展治疗。'],baneling:['爆裂重生','撞向敌人并引爆酸囊，进入 5 秒恢复后重新参战。'],zealot:['冲锋','接近地面敌人，以双刃切入战线。'],stalker:['闪烁','瞬移到附近位置，穿梭于敌军火力之间。'],immortal:['屏障','迎击敌军火力时张开屏障，抵挡一轮冲击。'],sentry:['守护之盾','消耗能量撑起守护场，为附近友军挡下部分火力。'],colossus:['热能切割','双束热能射线横扫地面敌军。'],carrier:['机库','截击机离舰作战。损失会削弱火力，补充需要资源与时间。'],science_vessel:['纳米修复','机械单位全效修复，生物单位为三分之一；恢复生命时消耗能量。']
 };
 const eliteCopy={
  'marine.2':['蓝色穿甲弹','对精英造成 3 倍伤害，对首领造成 5 倍伤害。'],
  'marauder.1':['重型震撼弹','爆震压低敌人的伤害、攻速和移速；首领受到的压制减半。'],
  'tank.2':['重炮阵地','架炮后，伤害和攻速提高至 2 倍、射程提高至 3 倍；移动时停止开炮。'],
  'medivac.2':['多重医疗束','同时照顾最多 5 名伤员，优先救治生命比例最低的友军。'],
  'reaper.1':['午夜连射','每轮连续射出 6 发子弹，对轻甲造成 1.8 倍伤害。'],
  'zergling.1':['裂爪狂潮','双虫交替撕咬，连续出手不断积累狂潮。'],
  'roach.2':['穿甲酸喉','持续攻击软化同一目标的重甲，第六发喷出高浓酸。'],
  'hydralisk.1':['千针齐发','每轮射出 5 根骨针，密集覆盖正前方。'],
  'queen.3':['毒巢守卫','毒刺缠住敌人，优先压制受伤友军身边的威胁。'],
  'baneling.2':['腐土蔓延','爆裂后留下腐土；休眠的 5 秒内，持续侵蚀附近地面敌人。'],
  'zealot.2':['破盾反击','护盾被击破后进入反击，近战斩击恢复部分护盾。'],
  'stalker.1':['虚空连射','锁定同一敌人连续攻击，每第四轮射出三连弹。'],
  'immortal.2':['永恒壁垒','更强大的屏障守住阵地，被击破后短时恢复护盾。'],
  'sentry.2':['静滞力场','周期性暂停范围内普通敌人；对首领则压低攻速和移速。'],
  'colossus.2':['地平线切割','以更远、更长的双束热能射线贯穿敌军纵队。']
 };
 const heroCopy={
  raynor:['穿透前方敌人，打出一条火力通道。','游骑兵火力','枪口不断射出火力；高军衔时额外弹道打击邻敌。'],
  tychus:['投出手雷，炸开范围内的敌人。','旋转机炮','持续输出密集弹幕，压住正面战线。'],
  nova:['瞄准高价值目标，打出致命一击。','隐秘行动','隐匿身形，以远程精确射击狙击敌人。'],
  kerrigan:['释放灵能冲击，贯穿前方的地面敌人。','灵能护障','每第三轮攻击横扫附近敌人；造成生命伤害可积蓄护障。'],
  zagara:['轰出爆虫弹幕，连续引爆地面敌群。','孵化狂潮','附近敌人不断倒下时，孵化临时爆虫加入冲锋。'],
  dehaka:['吞下近身目标，恢复生命并获得短时生命储备。','原始进化','收集精华，强化攻击、生命与护甲。'],
  artanis:['展开 8 秒复苏窗口，为附近友军恢复护盾。','灵能双刃','每第三轮攻击以双刃扇斩，切开前方地面敌人。'],
  zeratul:['骤然斩向目标，并波及附近两名敌人。','虚空回响','每四次主攻击，延迟回响再次斩向原目标。'],
  fenix:['发射太阳炮，焚尽爆心周围的敌人。','太阳过载','每第四轮追加太阳炮；破盾后可重构护盾并短时超载。'],
  swann:['为附近机械友军展开紧急抢修。','战地工程','跟随部队前进，持续修复受损机械。'],
  tosh:['以精神冲击打击目标区域。','幽魂火力','在前线以精确武器提供远程火力。'],
  yamato_battlecruiser:['聚集能量，向目标发射大和聚变炮。','重装舰炮','双联舰炮持续打击空中与地面敌人。'],
  stukov:['发射腐蚀弹，污染目标周围的敌群。','感染蔓延','普通攻击传播感染，宿主倒下后留下治疗生物友军的菌池。'],
  niadra:['张开 8 秒复生窗口，唤回其中倒下的虫群。','寄生疗愈','照顾受伤的生物友军；寄生宿主倒下后为附近虫群回血。'],
  hots_leviathan:['连续释放三轮生体等离子风暴。','深空触须','周期性挥动触须，同时打击多个敌人。'],
  alarak:['挥出毁灭波，贯穿并减速前方敌人。','权势','击杀与持续压制强敌积累权势，强化火力和护甲。'],
  vorazun:['让普通敌人陷入停滞；首领受到减速。','暗影突袭','脱战后隐入暗影，对被控制的目标施以重击。'],
  purifier_flagship:['集结所属截击机，引爆聚变核心。','舰队火网','十二架截击机共同作战；母舰护盾受创时触发短时超载。']
 };
 const ceil=n=>Math.max(0,Math.ceil(n-1e-7));
 const fmt=n=>new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(n);
 function roster(){return families[state.race].flatMap((f,j)=>Array.from({length:5},(_,i)=>({key:f+'-'+i,id:i===1?eliteIds[f]:f,rank:j===2?3:2,number:i+1,hp:i===3?.24:.78+((i*7+j*11)%21)/100,secondHp:i===2?0:.62}))).concat(heroes[state.race].map((id,i)=>({key:'hero-'+id,id,rank:2,number:i+1,hp:.86-i*.08})));}
 function selected(){const all=roster();return all.find(u=>u.key===S.key)??all[0];}
 function dto(u=selected()){return data[u.id+':'+u.rank];}
 function portraitButton(u,mini=false){const d=dto(u),selected=u.key===S.key;return `<button class="${mini?'ui12-roster-unit':'unit-portrait'} ${d.kind} ${selected?'focused':''}" data-action="${mini?'ui12-select':'inspect-unit'}" data-unit="${u.key}" aria-label="${mini?'切换到':'查看'}${esc(d.name)}${d.kind==='hero'?'':' '+u.number+'号'}${mini?'':'详情'}" aria-pressed="${selected}">${img(d.icon)}<span class="portrait-rank">${ranks[d.rank]}</span>${d.kind!=='ordinary'?`<span class="portrait-badge">${d.kind==='hero'?'★':'◆'}</span>`:''}<span class="portrait-hp"><i style="--fill:${u.hp*100}%"></i></span>${d.shield?'<span class="portrait-shield"><i style="--fill:67%"></i></span>':''}${d.family==='zergling'&&d.kind!=='hero'?`<span class="twin-count">${u.secondHp===0?'1/2':'2/2'}</span>`:''}</button>`;}
 function portraits(layout){return `<div class="portrait-grid" aria-label="作战部队">${roster().slice(layout.page*layout.size,(layout.page+1)*layout.size).map(u=>portraitButton(u)).join('')}</div>`;}
 function health(label,value,max,cls=''){return `<div class="ui12-vital ${cls}"><div><span>${label}</span><strong>${fmt(ceil(value))}<small> / ${fmt(ceil(max))}</small></strong></div><div class="ui12-meter" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="${ceil(max)}" aria-valuenow="${ceil(value)}"><i style="--fill:${Math.max(0,Math.min(100,value/max*100))}%"></i></div></div>`;}
 function art(d,u){const card={name:d.name,subtype:d.kind==='elite'?'eliteVariant':'unit',sourceId:d.id,family:d.kind==='hero'?undefined:d.family,heroId:d.kind==='hero'?d.id:undefined};const painted=paintedCard(card,d.family==='zergling'&&d.kind!=='hero'&&u.secondHp!==0?2:1);if(painted)return painted;const cover={raynor:'terran-raynor',tychus:'terran-tychus',nova:'terran-nova',kerrigan:'zerg-kerrigan',zagara:'zerg-zagara',dehaka:'zerg-dehaka',artanis:'protoss-artanis',zeratul:'protoss-zeratul',fenix:'protoss-fenix'}[d.id];return `<img class="ui12-hero-cover" src="${coverAsset(cover)}" alt="${esc(d.name)}立绘">`;}
 function stats(d){const medical=['medivac','science_vessel'].includes(d.family)&&d.kind!=='hero';const armed=d.damage>0||d.hangar?.count;const weapon=d.hangar?'截击机':d.kind==='hero'?'普通攻击':weapons[d.family]??'武器';
  const cells=medical?[['医疗','每秒治疗',fmt(d.heal),'生命','shield'],['能源','行动方式','空中','支援','hex']]:[[weapon,d.hangar?'单机伤害':'武器伤害',armed?fmt(d.hangar?.damage??d.damage)+(d.attacks>1?' × '+d.attacks:''):'—','','swords'],['射击频率','攻击间隔',armed?fmt(d.hangar?.period??d.period):'—',armed?'秒':'','refresh']];
  cells.push(['装甲','护甲',fmt(d.armor),'','shield'],[d.shield?'护盾装甲':'行动速度',d.shield?'护盾护甲':'移动速度',fmt(d.shield?d.shieldArmor:d.speed),'',d.shield?'hex':'arrow']);
  if(d.shield)cells.push(['行动速度','移动速度',fmt(d.speed),'','arrow']);
  cells.push(['武器覆盖',medical?'治疗目标':'攻击目标',medical?'友军':({ground:'地面',air:'空中',both:'地面 / 空中',none:'—'}[d.target]),'','target']);
  if(!medical)cells.push(['交战距离','射程',d.range<=.2?'近战':fmt(d.range),'','eye']);
  return `<div class="ui12-stats" aria-label="核心属性">${cells.map(([tip,label,value,unit,icon])=>`<div class="ui12-stat"><span class="ui12-stat-icon">${svg(icon)}</span><div><span>${label}</span><strong>${value}${unit?`<small>${unit}</small>`:''}</strong></div></div>`).join('')}</div>${d.hangar?`<div class="ui12-hangar">${img('unit.carrier')}<span>出击中</span><strong>${d.hangar.count}<small> 架</small></strong></div>`:''}${d.bonuses?.length?`<div class="ui12-bonus">${svg('target')}${d.bonuses.map(b=>`对${attr[b.attribute]??b.attribute} +${fmt(b.amount)}`).join(' · ')}</div>`:''}${d.kind==='elite'?`<button class="ui12-signature" data-action="ui12-tab" data-value="skills"><span>◆</span><div><small>精英特性</small><strong>${esc((eliteCopy[d.id]??['专属战法'])[0])}</strong></div>${svg('next')}</button>`:d.kind==='hero'?`<button class="ui12-signature hero" data-action="ui12-tab" data-value="skills">${img(d.icon)}<div><small>英雄技能</small><strong>${esc(d.skill.name)}</strong></div><span class="ui12-ready">${selected().number===2?'冷却 8 秒':'就绪'}</span>${svg('next')}</button>`:''}`;
 }
 function skills(d){const hero=heroCopy[d.id],elite=eliteCopy[d.id],base=traits[d.family]??[weapons[d.family]??'作战能力','以自身武器打击射程内的敌人。'];const rows=hero?[{name:d.skill.name,body:hero[0],tag:'主动',meta:'冷却 '+d.skill.cooldown+' 秒'},{name:hero[1],body:hero[2],tag:'被动'}]:elite?[{name:elite[0],body:elite[1],tag:'精英'},{name:base[0],body:base[1],tag:'能力'}]:[{name:base[0],body:base[1],tag:'能力'}];return `<div class="ui12-abilities">${rows.map((s,i)=>`<section class="ui12-ability ${S.expanded===i?'open':''}"><button data-action="ui12-ability" data-value="${i}" aria-expanded="${S.expanded===i}" aria-controls="ui12-ability-${i}">${img(i===0?d.icon:'unit.'+d.family)}<span><small>${s.tag}</small><strong>${esc(s.name)}</strong></span>${s.meta?`<em>${s.meta}</em>`:''}${svg(S.expanded===i?'back':'next')}</button><div id="ui12-ability-${i}" class="ui12-ability-copy" ${S.expanded===i?'':'hidden'}><p>${esc(s.body)}</p></div></section>`).join('')}</div>`;}
 function panel(){const u=selected(),d=dto(u),all=roster(),index=all.findIndex(x=>x.key===u.key),windowCount=frame.getBoundingClientRect().width<430?3:5,start=Math.max(0,Math.min(all.length-windowCount,index-Math.floor(windowCount/2))),twin=d.family==='zergling'&&d.kind!=='hero';return `<div class="modal-scrim ui12-scrim"><section class="modal-window ui12-window" role="dialog" aria-modal="true" aria-labelledby="ui12-name" tabindex="-1" data-kind="${d.kind}" data-tab="${S.tab}" data-unit-key="${u.key}"><header class="ui12-header"><div class="ui12-title"><span class="ui12-class">${kinds[d.kind]}<i> / </i>${{terran:'人族',zerg:'虫族',protoss:'神族'}[d.race]}</span><h1 id="ui12-name">${esc(d.name)}<b class="ui12-rank" aria-label="军衔 ${d.rank}">${ranks[d.rank]}</b></h1></div><button class="icon-button ui12-close" data-action="modal-close" aria-label="返回战场" data-autofocus>${svg('close')}</button></header><div class="ui12-body"><aside class="ui12-visual"><div class="ui12-art">${art(d,u)}<span class="ui12-art-fade"></span><div class="ui12-traits">${[d.flying?'空中':'地面',...d.attributes.filter(a=>a!=='Heroic').map(a=>attr[a]).filter(Boolean)].map(a=>`<span>${a}</span>`).join('')}</div><div class="ui12-rank-marks" aria-hidden="true">${Array.from({length:5},(_,i)=>`<i class="${i<d.rank?'lit':''}"></i>`).join('')}</div></div><div class="ui12-vitals">${health(twin?'跳虫 ①':'生命',d.hp*u.hp,d.hp,u.hp<.3?'critical':'')}${twin?health(u.secondHp===0?'跳虫 ② · 再生 11 秒':'跳虫 ②',d.hp*u.secondHp,d.hp,u.secondHp===0?'critical':''):''}${d.shield?health('护盾',d.shield*.67,d.shield,'shield'):''}${d.energy?health('能量',Math.min(d.energy,Math.max(d.energyStart,d.energy*.61)),d.energy,'energy'):''}</div></aside><div class="ui12-readout"><div class="ui12-tabs" role="tablist" aria-label="单位信息"><button role="tab" id="ui12-stats-tab" aria-selected="${S.tab==='stats'}" aria-controls="ui12-tabpanel" data-action="ui12-tab" data-value="stats">属性</button><button role="tab" id="ui12-skills-tab" aria-selected="${S.tab==='skills'}" aria-controls="ui12-tabpanel" data-action="ui12-tab" data-value="skills">${d.kind==='hero'?'技能':'能力'}<span>${d.kind==='ordinary'?'01':'02'}</span></button><button role="tab" id="ui12-roster-tab" aria-selected="${S.tab==='roster'}" aria-controls="ui12-tabpanel" data-action="ui12-tab" data-value="roster">部队<span>28</span></button></div><div id="ui12-tabpanel" role="tabpanel" aria-labelledby="ui12-${S.tab}-tab" tabindex="0">${S.tab==='stats'?stats(d):S.tab==='roster'?rosterGrid():skills(d)}</div></div></div><footer class="ui12-footer"><div class="ui12-roster"><button class="ui12-step" data-action="ui12-prev" aria-label="上一个单位" ${index===0?'disabled':''}>${svg('back')}</button><div class="ui12-roster-list" aria-label="切换作战单位">${all.slice(start,start+windowCount).map(v=>portraitButton(v,true)).join('')}</div><button class="ui12-step" data-action="ui12-next" aria-label="下一个单位" ${index===all.length-1?'disabled':''}>${svg('next')}</button></div><span class="ui12-index"><b>${String(index+1).padStart(2,'0')}</b> / ${all.length}</span><button class="game-button ui12-return" data-action="modal-close"><span>返回战场 <kbd>Esc</kbd></span></button></footer></section></div>`;}
 function open(key,trigger){S.key=roster().some(u=>u.key===key)?key:roster().find(u=>u.id===key)?.key??roster()[0].key;S.tab='stats';S.expanded=null;state.selectedUnit=S.key;revealSelected();render({focus:false});pushModal('unit',trigger);}
 function revealSelected(){const size=frame.getBoundingClientRect().width>=1000?14:7;state.rosterStart=Math.floor(roster().findIndex(u=>u.key===S.key)/size)*size;}
 function select(key){S.key=key;S.expanded=S.tab==='skills'?0:null;state.selectedUnit=key;if(S.tab==='roster')S.tab='stats';revealSelected();render({focus:false});overlay.querySelector(`.ui12-roster-unit[data-unit="${key}"]`)?.focus({preventScroll:true});}
 function returnToBattle(){revealSelected();render({focus:false});scene.querySelector(`.unit-portrait[data-unit="${S.key}"]`)?.focus({preventScroll:true});}
 function rosterGrid(){return `<div class="ui12-full-roster" aria-label="部队一览">${roster().map(u=>{const d=dto(u);return `<button data-action="ui12-select" data-unit="${u.key}" class="ui12-roster-choice ${d.kind}" aria-pressed="${S.key===u.key}" aria-label="切换到${esc(d.name)}${d.kind==='hero'?'':' '+u.number+'号'}">${img(d.icon)}<b>${d.kind==='hero'?'★':d.kind==='elite'?'◆':u.number}</b><small>${esc(d.name)}</small></button>`;}).join('')}</div>`;}
 function handle(action,b){if(action==='inspect-unit'){open(b.dataset.unit,b);return true;}if(action==='ui12-select'){select(b.dataset.unit);return true;}if(action==='ui12-next'||action==='ui12-prev'){const all=roster(),i=all.findIndex(x=>x.key===selected().key),v=all[i+(action==='ui12-next'?1:-1)];if(v)select(v.key);return true;}if(action==='ui12-tab'){S.tab=b.dataset.value;S.expanded=S.tab==='skills'?0:null;renderModal(false);overlay.querySelector(`[role="tab"][data-value="${S.tab}"]`)?.focus({preventScroll:true});return true;}if(action==='ui12-ability'){S.expanded=S.expanded===Number(b.dataset.value)?null:Number(b.dataset.value);renderModal(false);return true;}return false;}
 function keydown(e){if(state.layers.at(-1)?.name!=='unit')return false;if(['ArrowLeft','ArrowRight'].includes(e.key)&&e.target.closest('.ui12-tabs')){e.preventDefault();handle('ui12-tab',{dataset:{value:['stats','skills','roster'][(['stats','skills','roster'].indexOf(S.tab)+(e.key==='ArrowRight'?1:2))%3]}});return true;}if(['ArrowLeft','ArrowRight'].includes(e.key)&&e.target.closest('.ui12-roster')){e.preventDefault();handle(e.key==='ArrowLeft'?'ui12-prev':'ui12-next',e.target);return true;}return false;}
 function sync(){const isOpen=state.layers.some(l=>l.name==='unit');scene.inert=isOpen;frame.classList.toggle('ui12-inspecting',isOpen);if(!isOpen)scene.querySelectorAll('.unit-portrait').forEach(b=>{b.classList.toggle('focused',b.dataset.unit===S.key);b.setAttribute('aria-pressed',String(b.dataset.unit===S.key));});}
 return {panel,portraits,handle,keydown,open,sync,returnToBattle,rosterGrid};
}
