import fs from 'node:fs';
function edit(file,changes){let s=fs.readFileSync(file,'utf8');for(const [a,b] of changes){if(!s.includes(a))throw Error(file+': missing '+a.slice(0,80));s=s.replace(a,b);}fs.writeFileSync(file,s);}
edit('src/app/bootstrap.ts',[
 ['hud.saveUI=new SaveControls(session,()=>{if(session.resume())', 'hud.saveUI=new SaveControls(session,()=>{if(session.checkpointMode&&!session.hasLiveContinuation&&session.canResume){hud.loadPreview=session.prepareLoad();hud.onPrepareLoad();return;}if(session.resume())'],
 ["resetPresentation();if(!await session.saveBeforeAdvance()){readiness.fail(session.message);hud.update();return;}readiness.cancel();", "resetPresentation();if(!await session.saveBeforeAdvance()){readiness.cancel();world.paused=true;hud.update();return;}readiness.cancel();"],
]);
edit('src/ui/presentation/end-screens.ts',[["<p class=\"pause-hint\">暂停中</p>","<p class=\"pause-hint\">暂停中</p>${w.starship.enabled?saveHtml:''}"]]);
edit('src/ui/hud/m3-menu.ts',[
 ["</nav>${error(s.error)}</div><div class=\"cover-factions\"", "</nav>${error(s.error||session?.message&&session.saveFailed?session?.message??s.error:s.error)}</div><div class=\"cover-factions\""],
 ["从暂停的战场恢复，保留部队伤损、冷却与训练进度。准备好后继续。", "从最近保存的关间继续，保留当时的装备、部队伤损、冷却与训练进度；尚未保存的当前关需要重打。"],
 ["<dt>天赋</dt><dd>${info?.points??0} / 80</dd>", "${session?.checkpointMode?'<dt>舰装</dt><dd>'+Object.values(session.world.starship.account.equipped[saveRace]).length+' / 12</dd>':'<dt>天赋</dt><dd>'+(info?.points??0)+' / 80</dd>'}"],
 ["<dt>本局天赋</dt><dd>${candidate?.points??0} / 80</dd>", "${session?.checkpointMode?'':'<dt>本局天赋</dt><dd>'+(candidate?.points??0)+' / 80</dd>'}"],
]);
