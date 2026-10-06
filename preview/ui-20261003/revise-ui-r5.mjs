import fs from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const file=new URL('app.mjs',root);
let source=(await fs.readFile(file,'utf8')).replace(/\r\n/g,'\n');
const backup=new URL('../../reports/local/ui-redesign-20261003/revision-5/source-before/',root);
await fs.mkdir(backup,{recursive:true});
try{await fs.writeFile(new URL('app.mjs',backup),source,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
function replace(before,after){if(!source.includes(before))throw new Error('Missing replacement: '+before.slice(0,90));source=source.replace(before,after);}
function section(begin,end,next){const a=source.indexOf(begin),b=source.indexOf(end,a+begin.length);if(a<0||b<0)throw new Error('Missing section: '+begin);source=source.slice(0,a)+next+'\n'+source.slice(b);}
replace("raynor:['穿透射击',10","raynor:['穿透射击',12");
replace("tychus:['手雷',10","tychus:['手雷',14");
replace("nova:['狙击',9","nova:['狙击',18");
replace(",['loot','首领奖励']",'');
replace("'战斗 HUD'","'战场'");
replace("selectedLoot:0","selectedElite:0,eliteMember:0,consoleFolded:false,talentMenu:'races'");
replace('let talents=[],','let talents=[],talentCopy={},');
replace("new Set(['pause','settings','production','family','loot'])","new Set(['pause','settings','production','family'])");
section('function portraits(){','const shopHeader=',String.raw`function rosterIsPaged(){return frame.getBoundingClientRect().width<1000;}
function portraits(){
 const r=raceInfo[state.race],all=r.families.flatMap((family,j)=>Array.from({length:5},(_,i)=>({id:family,key:family+'-'+i,rank:j===2?'Ⅲ':'Ⅱ',hp:78+((i*7+j*11)%23),kind:j===1&&i===0?'elite':'ordinary'}))).concat(r.heroes.map((hero,i)=>({id:hero,key:'hero-'+i,rank:'Ⅱ',hp:86-i*8,kind:'hero'})));
 const shown=rosterIsPaged()?all.slice(state.rosterPage*14,state.rosterPage*14+14):all;
 return '<div class="portrait-grid" aria-label="作战部队">'+shown.map(u=>'<button class="unit-portrait '+u.kind+' '+(state.selectedUnit===u.id?'focused':'')+'" data-action="inspect-unit" data-unit="'+u.id+'" aria-label="查看'+names[u.id]+'详情">'+img((u.kind==='hero'?'hero.':'unit.')+u.id)+'<span class="portrait-rank">'+u.rank+'</span>'+(u.kind!=='ordinary'?'<span class="portrait-badge">'+(u.kind==='hero'?'★':'◆')+'</span>':'')+'<span class="portrait-hp"><i style="--fill:'+u.hp+'%"></i></span>'+(state.race==='protoss'?'<span class="portrait-shield"><i style="--fill:75%"></i></span>':'')+(u.id==='zergling'?'<span class="twin-count">2/2</span>':'')+'</button>').join('')+'</div>';
}
function commands(){
 const r=raceInfo[state.race];
 return '<div class="command-grid"><button class="command-key" data-action="skill:detection" aria-label="侦测">'+svg('eye')+'<b>侦测</b><kbd>G</kbd></button><button class="command-key" data-action="skill:siege" aria-label="'+(state.race==='terran'?'架炮':'部署')+'">'+img('tech.siege')+'<b>'+(state.race==='terran'?'架炮':'部署')+'</b><kbd>T</kbd></button><button class="command-key" data-action="skill:dash" aria-label="推进">'+img('tech.boost')+'<b>推进</b><kbd>Space</kbd></button>'+r.heroes.map((h,i)=>'<button class="command-key hero-command" data-action="skill:'+h+'" aria-label="'+names[h]+'技能">'+img('hero.'+h)+'<b>'+names[h]+'</b><kbd>'+(i+1)+'</kbd></button>').join('')+(rosterIsPaged()?'<button class="command-key roster-turn" data-action="roster-toggle" aria-label="切换部队页，当前第'+(state.rosterPage+1)+'页">'+svg('next')+'<b>'+(state.rosterPage+1)+'/2</b></button>':'<button class="command-key production-command" data-action="modal:production" aria-label="整备部队">'+img('building.barracks')+'<b>整备</b></button>')+'</div>';
}
function battlefield(){
 const r=raceInfo[state.race],bounds=frame.getBoundingClientRect(),kind=bounds.width<=600?'portrait':bounds.height<=500?'wide':'landscape';
 return '<section class="battle-page '+(state.consoleFolded?'console-folded':'')+'"><header class="battle-top"><span class="battle-location">工业遗址</span><div class="battle-resources">'+money(state.minerals,state.gas)+'<span class="population">'+svg('hex')+'<b>8</b></span></div><div class="battle-stage"><b>06<span> / 18</span></b><strong>01:24</strong></div>'+iconButton('pause','暂停','modal:pause')+'</header><div class="battle-playfield" aria-label="战场"><img class="battle-map-image" src="'+mapAsset(state.race+'-'+kind)+'" alt="工业遗址 · '+r.name+'作战部队" data-map-kind="'+kind+'" draggable="false"><div class="battle-vignette"></div><div class="battle-map-rim" aria-hidden="true"><i></i><i></i><i></i><i></i></div>'+minimap()+'<div class="joystick" role="img" aria-label="移动摇杆"><div></div></div></div><section class="battle-console"><button class="console-fold" data-action="fold-console" aria-label="'+(state.consoleFolded?'展开部队栏':'收起部队栏')+'" aria-expanded="'+(!state.consoleFolded)+'" aria-controls="console-body">'+svg(state.consoleFolded?'back':'next')+'</button><div class="console-body" id="console-body" '+(state.consoleFolded?'inert aria-hidden="true"':'')+'><section class="army-block">'+portraits()+'</section><section class="command-block">'+commands()+'</section></div></section></section>';
}`);
const copyChanges=[
 ['当前配点','战术投入'],['微操 3 · 资源 24','已投入 24 点'],
 ['产能 +1','增建基地'],['扩充当前生产能力。已付订单保持原兵种与进度。','再建一座，更多援军同时出发。正在训练的部队继续完成。'],
 ['新产线','增援集结'],['为下一阶段建立新的生产设施。','新的援军，新的打法。建起设施，让他们奔赴前线。'],
 ['共享科技','攻防研究'],['解锁该产线的共享攻防研究。','为这里训练的部队开放攻击与防御升级。'],
 ['本窗口最多执行一项发展。发展方向会被记住。','每次整备可完成一项建设。下次归来，继续你选好的方向。'],
 ["['三种型号','独立席位']","['精锐增援','重装']"],
 ['选择同家族的一款精英，编入现有队伍。','老兵来了。选择擅长压制、破甲或守住前线的精锐，与现有部队并肩作战。'],
 ["'1 席位'","'英雄增援'"],['占用一个英雄席位。本局最多三位英雄。','英雄加入战斗。本局可招募最多三位英雄。'],
 ['三件商品','军需官待命'],['折扣已锁定','前线补给'],
 ['三件商品独立购买。刷新费用由发展与商店共享并逐次上升。准备好后即可返回前线。','看中就买，备齐就走。刷新可以寻找新补给，越刷越贵；建设和商店共用这笔费用。'],
 ["?'选择型号'","?'挑选精锐'"],['席位 1 / 3','英雄 1 / 3'],
 ['英雄席位','英雄招募'],['本局最多招募三位英雄。已在队伍中的同名英雄，以对应卡牌晋升。','这场战役最多有三位英雄并肩作战。再次获得同名英雄，可让他晋升。'],
 ['存活名额','幸存战士'],['28 名额','28 名战士'],
 ['每轮 60 秒，每四轮进入发展窗口。现有部队、伤损、冷却、已付订单和空投继续保留。','一轮守住 60 秒，每四轮返回基地整备。战友、伤损、技能冷却和正在训练、空投的部队会继续跟随你。'],
 ["modalShell('持续生产','产线'","modalShell('持续生产','部队集结'"],['产线生产开关','部队训练开关'],['已付款 · 等待投放','援军待命 · 等待降落'],
 ['家族槽 5 / 5','兵种 5 / 5'],['替换家族','轮换部队'],
 ['接收已付款的新乘员时替换一个家族。返还未投放训练付款，已投放乘员不退款。继承军衔为 1 + floor((原军衔 − 1) / 2)。','让一支小队撤离，为新援军腾出位置。尚未登舰的训练费用会返还，已经出发的部队不退款。新兵继承部分军衔，具体结果见下方。'],
 ['未投放款返还','返还未出发费用'],
 ['当前技能冷却 ${skill[1]} 秒。技能通过固定指令栏或英雄快捷键施放。','冷却 ${skill[1]} 秒。按英雄头像或对应快捷键，再次施展这招。'],
 ['发展选择','基地建设'],['全队强化','火力支援'],['精英型号已选择。','精锐已集结。'],['发展方向：','整备方向：'],
 ['发展完成，进入下一项整备。','建设完成，军需官正等着你。'],['强化已选择。','火力整备完成。'],['商品重新展开。','新补给到了。'],
 ['生命修复报价已请求 · 预览反馈','医疗班已待命，查看伤员后进行修复。'],
 ['替换确认反馈 · 已选择退役','撤离命令已下达：'],
 ['校准提示预览','按下手柄按键，确认响应。'],['无尽战场装载流程预览','无尽前线，准备部署。'],
 ['保存提示预览','战局档案已打开。'],['导出提示预览','战局档案已打开。'],
];
for(const [a,b] of copyChanges.sort((a,b)=>b[0].length-a[0].length)){if(!source.includes(a))throw new Error('Missing copy: '+a);source=source.split(a).join(b);}
// Race-specific elite identities come from the existing, approved runtime catalog.
source=source.replace("'老兵来了。选择擅长压制、破甲或守住前线的精锐，与现有部队并肩作战。'","'老兵来了。挑选你的精锐，改变这一战的打法。'");
section('const lineNames=','function saves(){',String.raw`const lineNames={resources:'后勤',soldiers:'武装',army:'军团',micro:'微操'};
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
}`);
section('function loot(){','function loadPreview(){','');
section('function elitePreview(){','const renderers=',String.raw`const eliteCatalog={
 terran:[['压制劫掠者','命中减速、减攻速 30%，持续 1.5 秒；对首领效果减半。'],['破甲劫掠者','每 15 秒发射一枚三倍伤害的破甲弹。'],['堡垒劫掠者','厚重装甲，高生命，扛住前线火力。']],
 zerg:[['再生蟑螂','生命自然恢复速度翻倍。'],['破甲蟑螂','攻击地面重甲敌人时，普通攻击伤害 +20%。'],['厚甲蟑螂','生命上限 +25%，已有伤损保留。']],
 protoss:[['猎甲追猎者','攻击重甲敌人时，普通攻击伤害 +20%。'],['坚盾追猎者','原生护盾上限 +25%。'],['迅闪追猎者','闪烁冷却减少 25%；需先研究闪烁。']],
};
function elitePreview(){
 const entries=eliteCatalog[state.race],family=raceInfo[state.race].families[1];
 return modalShell('精锐招募',names[family],'<div class="elite-options" role="radiogroup" aria-label="选择精锐">'+entries.map(([name,copy],i)=>'<button class="elite-option" '+radioSelect('elite-select',i,state.selectedElite===i)+'>'+img('unit.'+family)+'<div><b>'+name+'</b><p>'+copy+'</p></div><i class="radio-mark"></i></button>').join('')+'</div><h2 class="elite-candidate-label">谁来晋升？</h2><div class="elite-candidates">'+Array.from({length:5},(_,i)=>'<button data-action="select-elite-member" data-value="'+i+'" aria-pressed="'+(state.eliteMember===i)+'">'+img('unit.'+family)+'<span>战士 '+(i+1)+'</span></button>').join('')+'</div>','elite-modal',button('取消','modal-close','secondary')+button('招募 '+svg('next'),'buy-elite','primary'));
}`);
replace('production,family,loot,','production,family,talent:talentDetails,');
section(" if(state.page==='talents'){\n  const totals=talentTotals();"," renderModal(focus);",'');
replace("state.talentRace=state.race;}\n","state.talentRace=state.race;state.talentMenu='races';state.selectedTalent=null;}\n");
// The source uses CRLF in the unedited tail on Windows.
replace("returnTitle:active?.dataset.title","returnTitle:active?.dataset.title,returnValue:active?.dataset.value");
replace("['unit','details','elite','load-preview']","['unit','details','elite','load-preview','talent']");
replace("(!layer.returnTitle||b.dataset.title===layer.returnTitle)","(!layer.returnTitle||b.dataset.title===layer.returnTitle)&&(!layer.returnValue||b.dataset.value===layer.returnValue)");
replace(",'battle','loot','battle'",",'battle'");
replace("if(action==='roster-prev'||action==='roster-next'){state.rosterPage=action==='roster-next'?1:0;render({focus:false});return;}","if(action==='roster-toggle'){state.rosterPage=1-state.rosterPage;render({focus:false});return;}\n if(action==='fold-console'){state.consoleFolded=!state.consoleFolded;const page=scene.querySelector('.battle-page'),body=scene.querySelector('.console-body');page.classList.toggle('console-folded',state.consoleFolded);body.inert=state.consoleFolded;body.setAttribute('aria-hidden',String(state.consoleFolded));b.setAttribute('aria-expanded',String(!state.consoleFolded));b.setAttribute('aria-label',state.consoleFolded?'展开部队栏':'收起部队栏');b.innerHTML=svg(state.consoleFolded?'back':'next');return;}");
replace("if(action==='talent-race'){state.talentRace=b.dataset.value;state.selectedTalent=null;render({focus:false});return;}","if(action==='talent-race'){state.talentRace=b.dataset.value;state.talentMenu='paths';state.selectedTalent=null;render();return;}");
replace("if(action==='talent-line'){state.talentLine=b.dataset.value;render({focus:false});return;}","if(action==='talent-line'){state.talentLine=b.dataset.value;state.talentMenu='tree';state.selectedTalent=null;render();return;}\n if(action==='talent-back')return talentBack();\n if(action==='talent-exit')return go(state.talentReturn);\n if(action==='talent-level'){state.talentMenu=b.dataset.value;state.selectedTalent=null;render();return;}");
replace("if(action==='select-talent'){state.selectedTalent=b.dataset.value;render({focus:false});return;}","if(action==='select-talent'){state.selectedTalent=b.dataset.value;pushModal('talent',b);return;}");
section(" if(action==='preview-talent'){"," if(action==='preview-load'",String.raw` if(action==='preview-talent'){const t=talents.find(t=>t.id===b.dataset.id);if(!t||!canLearn(t))return;state.talentLevels[t.id]=talentLevel(t.id)+1;render({focus:false});toast(talentText(t).name+'，学会了。');return;}
 if(action==='reset-talents'){talents.filter(t=>t.race===state.talentRace).forEach(t=>state.talentLevels[t.id]=0);render({focus:false});toast('天赋已重置，投入的资源已返还。');return;}`);
replace("if(action==='preview-save'){toast('战局档案已打开。');return;}","if(action==='preview-save'){pushModal('load-preview',b);return;}");
replace("if(action==='preview-export'){toast('战局档案已打开。');return;}","if(action==='preview-export'){pushModal('load-preview',b);return;}");
replace("if(action==='loot-variant'){state.selectedLoot=Number(b.dataset.value);renderModal(false);return;}","if(action==='elite-select'){state.selectedElite=Number(b.dataset.value);renderModal(false);return;}");
replace("if(action==='select-elite-member'){overlay.querySelectorAll('.elite-candidates button').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));return;}","if(action==='select-elite-member'){state.eliteMember=Number(b.dataset.value);overlay.querySelectorAll('.elite-candidates button').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));return;}");
source=source.replace(/\s*if\(action==='claim-loot'\).*?return;}\r?\n/,'\n');
replace("else if(state.page==='battle')pushModal('pause');else if(state.page!=='home')go('home');","else if(state.page==='battle')pushModal('pause');else if(state.page==='talents')talentBack();else if(state.page!=='home')go('home');");
replace("if(state.page==='battle')render({focus:false});","if(state.page==='battle'||state.page==='talents')render({focus:false});");
replace("}catch(e){console.error('Talent data unavailable',e);}","talentCopy=window.__UI_TALENT_COPY__||await(await fetch(new URL('talent-copy-r5.json',root))).json();}catch(e){console.error('Talent data unavailable',e);}");
replace("${button(svg('save')+' 保存','preview-save')}","${button(svg('save')+' 战局档案','preview-save')}${button('整备部队','modal:production')}");
await fs.writeFile(file,source);
console.log('R5 menu, copy, console and route corrections applied.');
