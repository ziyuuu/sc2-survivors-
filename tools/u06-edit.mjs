import fs from 'node:fs';
function edit(p,fn){let s=fs.readFileSync(p,'utf8');fs.writeFileSync(p,fn(s));}
edit('src/ui/presentation/settings-screen.ts',s=>s.replace("'skins'|'downloads'","'skins'|'downloads'|'saves'").replace("busy?:boolean}={}){\n const range", "busy?:boolean}={},saves=''){\n const range").replace("busy?:boolean}={}){\r\n const range", "busy?:boolean}={},saves=''){\r\n const range").replace("const body=tab==='downloads'?", "const body=tab==='saves'?saves:tab==='downloads'?").replace("['controls','graphics','skins','downloads']", "['controls','graphics','skins','downloads','saves']").replace("downloads:'预下载'", "downloads:'预下载',saves:'存档'").replace('${body}</div>', '${body}</div><div data-player-services-host class="settings-service-host"></div><p class="settings-copyright">非官方同人 · StarCraft II 素材属于 Blizzard Entertainment</p>'));
edit('src/ui/hud/m3-menu.ts',s=>{
s=s.replace("${i+1<step?glyph('check'):i+1}",'${i+1}');
s=s.replace(/const footer=\(\)=>[^\r\n]+/,"const footer=()=>`<footer class=\"game-footer\"><div>${button('设置','settings')}</div></footer>`;");
s=s.replace('<div class="title-emblem">${glyph(\'shield\')}<span>${r.english}</span></div>','').replace("${session?.memoryOnly?'':button('读取存档','menu-load','main-action')}",'');
s=s.replace("s.error||(session?.saveFailed?session.message:session?.startupNotice??'')",'s.error').replace("s.error||(session?.saveFailed?session.message:session?.startupNotice??'')",'s.error');
s=s.replace('<span>${name} · 待命</span>','<span></span>').replace("button(glyph('save')+' 导出当前续局','save-export','small')","button('设置','settings','small')");
s=s.replace('请返回首页继续游戏，完成撤离或结算后再开始新游戏。','请先继续游戏并完成撤离或结算。').replace('想保留进度，可先导出存档。','备份存档请前往设置。');
s=s.replace('<p>从新的前线开始。</p>','');
s=s.replace(/<div class="save-note">[\s\S]*?<\/div>\$\{error\(s.error\)\}/,'${error(s.error)}');
s=s.replace("return base+modal('检查存档'", "return modal('检查存档'");
s=s.replace('<details><summary>查看原因</summary><p>${esc(state.error??\'\')}</p></details>','').replace("+(context.canExport===false?'':button('导出存档','save-export','small'))",'');
return s;
});
edit('src/ui/hud.ts',s=>{
s=s.replace("this.settingsOpen=false;this.menuPage='load-preview'", "this.settingsOpen=true;this.settingsTab='saves';this.menuPage='load-preview'");
s=s.replace("this.flowError=String((error as Error).message)","this.flowError='无法读取这份存档，请选择有效文件。'");
s=s.replace("this.menuPage='load-preview';this.flowError='';}catch", "this.menuPage='load-preview';this.settingsOpen=true;this.settingsTab='saves';this.flowError='';}catch");
s=s.replace("['controls','graphics','skins','downloads'].includes", "['controls','graphics','skins','downloads','saves'].includes");
s=s.replace("this.settingsOpen=true;if(world.phase==='battle')", "this.settingsOpen=true;if(this.saveUI?.failed)this.settingsTab='saves';if(world.phase==='battle')");
s=s.replace("else if(action==='settings-back'){this.settingsOpen=false;", "else if(action==='settings-back'){this.session?.cancelPreparedLoad();this.loadPreview=null;if(this.menuPage==='load-preview')this.menuPage='title';this.flowError='';this.settingsOpen=false;");
s=s.replace("this.menuPage='load';}else if(this.menuPage==='load'", "this.menuPage='title';this.settingsOpen=true;this.settingsTab='saves';}else if(this.menuPage==='load'");
s=s.replace("busy:this.fullscreenBusy});}", "busy:this.fullscreenBusy},(this.saveUI?.render('settings')??'')+(this.flowError?'<p class=\"menu-error\" role=\"alert\">'+esc(this.flowError)+'</p>':''));}");
s=s.replace("else if(this.talentOpen)this.put('overlay',this.talentPanel());", "else if(this.saveUI?.failed&&!this.settingsOpen&&!this.archivesOpen){this.starship?.close();overlay.hidden=false;this.put('overlay',this.saveUI.failureDialog());}\n  else if(this.talentOpen)this.put('overlay',this.talentPanel());");
s=s.replace("else if(this.settingsOpen)this.put('overlay',(w.phase==='menu'?this.menuHTML():w.phase==='reward'?renderIntermission(w,this.saveUI?.render('reward')??'',this.intermission,this.buildingDraft??undefined,this.equipmentUI):'')+this.settingsPanel());", "else if(this.settingsOpen)this.put('overlay',this.settingsPanel()+(this.menuPage==='load-preview'?this.menuHTML():''));");
s=s.replace('设置 · 操作与画面','设置');
// Escape from an import preview returns to the archive tab first.
s=s.replace("pause(){if(this.starship?.isOpen)","pause(){if(this.settingsOpen&&this.menuPage==='load-preview'){this.menuBack();return;}if(this.starship?.isOpen)");
return s;
});
edit('src/ui/presentation/end-screens.ts',s=>s.replace("${button(glyph('save')+' 战局档案','pause-saves')}",'').replace("button(glyph('gear')+' 操作与画面','settings')","button('设置','settings')").replace("${w.starship.enabled?'':button(glyph('download')+' 导出','save-export')}",'').replace('<p class="pause-hint">暂停中</p>${w.starship.enabled?saveHtml:\'\'}','').replace('<p class="victory-reward">${glyph(\'hex\')}资源已结算</p>','').replace("${w.starship.enabled?saveHtml:button(busy?'保存中…':'保存进度','save-now','text-button',busy?'disabled':'')+button('导出战局档案','save-export','text-button')}",'').replace('<div data-player-services-host></div>','').replace('<h2>下一片前线</h2>','').replace(/<div class="endless-checklist">[\s\S]*?<\/div><\/div>/,'').replace("${w.starship.enabled?'':button('导出存档','save-export','text-button')}",''));
edit('src/ui/presentation/decision-screens.ts',s=>s.replace(/export const decisionSaveActions=[^\r\n]+/,"export const decisionSaveActions=(_busy=false)=>'';"));
edit('src/ui/starship/legacy-view.ts',s=>s.replace('<small>点击查看完整效果与比较</small>','').replace("feedback('操作完成')","feedback('')").replace("feedback('预设名称已更新')","feedback('')").replace('<i aria-hidden="true">✎</i>','').replace("p?'已保存':'尚未保存'","p?'':'空'").replace('<span class="phase-badge">${phaseNames[phase]}</span>','').replace("${button('返回','back','aria-label=\"返回上一级\"')}","${stack.length?button('返回','back','aria-label=\"返回上一级\"'):''}").replace("<span>${phase==='battle'?'战斗已暂停':'关间整备'}</span>",''));
edit('src/ui/starship/native.ts',s=>s.replace(/  if\(hud.session\?\.checkpointMode&&!embedded\)[^\r\n]+/,'  root.querySelector(\'[data-equipment-save-status]\')?.remove();').replace("if(world.phase!==origin||hud.readiness?.state.kind||", "if(hud.saveUI?.failed||world.phase!==origin||hud.readiness?.state.kind||"));
edit('src/ui/presentation/intermission.ts',s=>s.replace("<span><i class=\"im-live-dot\"></i>${{terran:'军需官待命',zerg:'虫群待命',protoss:'跃迁信号就绪'}[w.expedition.race]}</span>",'').replace(/<span class="im-purchase-count">[\s\S]*?<\/span>/,'').replace('操作与画面','设置').replace('<span class="im-status">生命已满时无需修复</span>','<span></span>'));
edit('src/ui/hud/player-services.ts',s=>s.replace('<button type="button" data-player-service="feedback">反馈</button><span>·</span><button type="button" data-player-service="privacy">玩家数据与隐私</button>','<button type="button" class="game-button" data-player-service="feedback"><span>反馈</span></button><button type="button" class="game-button" data-player-service="privacy"><span>玩家数据与隐私</span></button>'));
