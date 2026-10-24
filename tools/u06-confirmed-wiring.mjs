import fs from 'node:fs';import assert from 'node:assert/strict';
function edit(p,pairs){let s=fs.readFileSync(p,'utf8');for(const [a,b]of pairs){assert.ok(s.includes(a),p+': '+a.slice(0,80));s=s.replace(a,b);}fs.writeFileSync(p,s);}
let menu=fs.readFileSync('src/ui/hud/m3-menu.ts','utf8'),start=menu.indexOf(' const w=session?.world,p='),end=menu.indexOf('export function renderReadiness',start);assert.ok(start>0&&end>start);fs.writeFileSync('src/ui/hud/m3-menu.ts',menu.slice(0,start)+" return '';\n}\n\n"+menu.slice(end));
let decisions=fs.readFileSync('src/ui/presentation/decision-screens.ts','utf8');decisions=decisions.replace(/export const decisionSaveActions=[^\r\n]+/,"export const decisionSaveActions=(_busy=false)=>'';");fs.writeFileSync('src/ui/presentation/decision-screens.ts',decisions);
let native=fs.readFileSync('src/ui/starship/native.ts','utf8');native=native.replace(/  if\(hud.session\?\.checkpointMode&&!embedded\)[^\r\n]+/,'').replace("if(world.phase!==origin||hud.readiness?.state.kind||","if(hud.saveUI?.failed||world.phase!==origin||hud.readiness?.state.kind||");fs.writeFileSync('src/ui/starship/native.ts',native);
edit('src/ui/presentation/settings-screen.ts',[
 ["'skins'|'downloads'","'skins'|'downloads'|'saves'"],
 ["skins='',fullscreen:{message?:string;busy?:boolean}={})", "skins='',fullscreen:{message?:string;busy?:boolean}={},saves='')"],
 ["const body=tab==='downloads'?", "const body=tab==='saves'?saves:tab==='downloads'?"],
 ["['controls','graphics','skins','downloads']", "['controls','graphics','skins','downloads','saves']"],
 ["downloads:'预下载'", "downloads:'预下载',saves:'存档'"],
 ['${body}</div>', '${body}<div data-player-services-host class="settings-service-host"></div><p class="settings-copyright">非官方同人 · StarCraft II 素材属于 Blizzard Entertainment</p></div>']]);
edit('src/ui/hud.ts',[
 ["this.settingsOpen=false;this.menuPage='load-preview';this.flowError='';", "this.settingsOpen=true;this.settingsTab='saves';this.menuPage='title';this.flowError='';this.onPrepareLoad();"],
 ["this.flowError=String((error as Error).message)", "this.flowError='存档无法读取。'"],
 ["else if((action==='menu-load'||action==='menu-load-summary')){this.flowError='';this.menuPage='load';}", "else if((action==='menu-load'||action==='menu-load-summary')){this.flowError='';this.settingsOpen=true;this.settingsTab='saves';}"],
 ["else if(action==='menu-load-local'){try{this.loadPreview=this.session?.prepareLoad()??null;this.menuPage='load-preview';this.flowError='';}catch(error){this.flowError=String((error as Error).message);}}", "else if(action==='menu-load-local'&&world.phase==='menu'){try{this.loadPreview=this.session?.prepareLoad()??null;this.flowError='';this.onPrepareLoad();}catch{this.flowError='存档无法读取。';}}"],
 ["this.settingsOpen=true;if(world.phase==='battle')", "this.settingsOpen=true;if(this.saveUI?.failed)this.settingsTab='saves';if(world.phase==='battle')"],
 ["['controls','graphics','skins','downloads'].includes", "['controls','graphics','skins','downloads','saves'].includes"],
 ["else if(action==='settings-back'){this.settingsOpen=false;", "else if(action==='settings-back'){this.flowError='';this.settingsOpen=false;"],
 ["else if(action==='pause-saves'){this.archivesOpen=true;}", "else if(action==='pause-saves'){this.settingsWasPaused=world.paused;this.settingsOpen=true;this.settingsTab='saves';}"],
 ["busy:this.fullscreenBusy});}", "busy:this.fullscreenBusy},(this.saveUI?.render('settings')??'')+(this.flowError?'<p class=\"menu-error\" role=\"alert\">'+esc(this.flowError)+'</p>':''));}"],
 ["if(loading){this.loadPreview=null;this.menuPage='load';}", "if(loading){this.session?.cancelPreparedLoad();this.loadPreview=null;this.menuPage='title';}"],
 ["else if(this.talentOpen)this.put('overlay',this.talentPanel());", "else if(this.saveUI?.failed&&!this.settingsOpen){this.starship?.close();overlay.hidden=false;this.put('overlay',this.saveUI.failureDialog());}\n  else if(this.talentOpen)this.put('overlay',this.talentPanel());"],
 ["(w.phase==='menu'?this.menuHTML():w.phase==='reward'?", "(w.phase==='menu'?renderMenu({equipmentUI:this.equipmentUI,page:'title',race:this.coverRace,difficulty:this.menuDifficulty,preset:this.menuPreset,hero:this.starterHeroChoice,loadPreview:null,error:'',coverIndex:this.coverIndexes[this.coverRace],coverLockedRace:this.coverPreference.lockedRace},w.permanentProfile,this.session):w.phase==='reward'?"]]);
edit('src/app/bootstrap.ts',[
 ["hud.loadPreview=null;resetPresentation();readiness.cancel();", "hud.loadPreview=null;hud.settingsOpen=false;hud.menuPage='title';resetPresentation();readiness.cancel();"],
 ["hud.flowError=session.message||'存档提交失败'", "hud.flowError='存档无法读取。'"],
 ["hud.flowError=session.message||'新局提交失败'", "hud.flowError='未能开始新游戏，请重试。'"]]);
console.log('Scoped copy and settings wiring applied');
