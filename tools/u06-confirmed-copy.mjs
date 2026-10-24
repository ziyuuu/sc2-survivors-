import fs from 'node:fs';import assert from 'node:assert/strict';
const changes=[];
function edit(p,pairs){let s=fs.readFileSync(p,'utf8');for(const [a,b] of pairs){assert.ok(s.includes(a),p+': '+a.slice(0,70));s=s.replace(a,b);}fs.writeFileSync(p,s);changes.push(p);}
edit('src/ui/presentation/end-screens.ts',[
 ["button(glyph('play')+' 继续','pause'","button('继续','pause'"],
 ["${button(glyph('save')+' 战局档案','pause-saves')}",''],
 ["button(glyph('gear')+' 操作与画面','settings')","button('设置','settings')"],
 ["${w.starship.enabled?'':button(glyph('download')+' 导出','save-export')}",''],
 ["button('返回标题','restart','text-button')}</nav>","button('返回标题','restart','pause-return')}</nav>"],
 ['<p class="pause-hint">暂停中</p>${w.starship.enabled?saveHtml:\'\'}',''],
 ['<p class="victory-reward">${glyph(\'hex\')}资源已结算</p>',''],
 ["${w.starship.enabled?saveHtml:button(busy?'保存中…':'保存进度','save-now','text-button',busy?'disabled':'')+button('导出战局档案','save-export','text-button')}",''],
 ['<div data-player-services-host></div>',''],
 ['<h2>下一片前线</h2>',''],
 ['<div class="endless-checklist"><div>${glyph(\'check\')}部队</div><div>${glyph(\'check\')}伤损 / 冷却</div><div>${glyph(\'check\')}生产订单</div></div>',''],
 ["${w.starship.enabled?'':button('导出存档','save-export','text-button')}",'']]);
edit('src/ui/presentation/intermission.ts',[
 ['<span><i class="im-live-dot"></i>${{terran:\'军需官待命\',zerg:\'虫群待命\',protoss:\'跃迁信号就绪\'}[w.expedition.race]}</span>',''],
 ['<span class="im-purchase-count">${w.rewards.filter(r=>r.sold).length? w.rewards.filter(r=>r.sold).length+\' 项已备齐\':\'补给已送达\'}</span>',''],
 ['<span class="im-status">生命已满时无需修复</span>','<span></span>']]);
edit('src/ui/starship/legacy-view.ts',[
 ['<small>点击查看完整效果与比较</small>',''],["feedback('操作完成')","feedback('')"],["feedback('预设名称已更新')","feedback('')"],
 ['<span class="phase-badge">${phaseNames[phase]}</span>',''],
 ["${button('返回','back','aria-label=\"返回上一级\"')}","${stack.length?button('返回','back','aria-label=\"返回上一级\"'):''}"],
 ["<span>${phase==='battle'?'战斗已暂停':'关间整备'}</span>",'']]);
edit('src/ui/hud/m3-menu.ts',[
 ['<span>非官方同人 · StarCraft II 素材属于 Blizzard Entertainment</span>','<span></span>'],
 ['<span>本地战局</span>',''],
 ["${masthead('通讯在线',false)}",'<div class="masthead status-only"></div>'],
 ["${session?.memoryOnly?'':button('读取存档','menu-load','main-action')}",''],
 ["s.error||(session?.saveFailed?session.message:session?.startupNotice??'')",'s.error'],
 ['<span>${name} · 待命</span>','<span></span>'],
 ["${button(glyph('save')+' 导出当前续局','save-export','small')}",''],
 ["equipmentCheck?.ok?'部署就绪'","equipmentCheck?.ok?''"],["allocation?'部署就绪'","allocation?''"],
 ['<h2>暂无续局</h2><p>从新的前线开始。</p>','<h2>暂无存档</h2>'],
 ["+(context.canExport===false?'':button('导出存档','save-export','small'))",'']]);
// The old separate archive screen is unreachable; no new summary page is introduced.
let menu=fs.readFileSync('src/ui/hud/m3-menu.ts','utf8');const start=menu.indexOf(' const w=session?.world,p='),end=menu.indexOf('\n}\n\nexport function renderReadiness',start);assert.ok(start>0&&end>start);menu=menu.slice(0,start)+" return '';"+menu.slice(end);fs.writeFileSync('src/ui/hud/m3-menu.ts',menu);
let decisions=fs.readFileSync('src/ui/presentation/decision-screens.ts','utf8');decisions=decisions.replace(/export const decisionSaveActions=[^\r\n]+/,"export const decisionSaveActions=(_busy=false)=>'';");fs.writeFileSync('src/ui/presentation/decision-screens.ts',decisions);
let native=fs.readFileSync('src/ui/starship/native.ts','utf8');native=native.replace(/  if\(hud.session\?\.checkpointMode&&!embedded\)[^\r\n]+/,'').replace("if(world.phase!==origin||hud.readiness?.state.kind||","if(hud.saveUI?.failed||world.phase!==origin||hud.readiness?.state.kind||");fs.writeFileSync('src/ui/starship/native.ts',native);
console.log(JSON.stringify({edited:changes}));
