import fs from 'node:fs';
const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/app/bootstrap.ts',s=>s.replace("hud.loadPreview=null;resetPresentation();readiness.cancel();", "hud.loadPreview=null;hud.settingsOpen=false;hud.menuPage='title';resetPresentation();readiness.cancel();").replace("hud.flowError=session.message||'存档提交失败'", "hud.flowError='未能载入存档，当前进度已保留。'").replace("hud.flowError=session.message||'新局提交失败'", "hud.flowError='未能开始新游戏，请重试。'"));
edit('src/ui/hud/save-controls.ts',s=>s.replace('this.session.saveFailed;',"(this.session.saveFailed||/原文件已保留|停止覆盖/.test(this.session.startupNotice));"));
edit('src/ui/hud.ts',s=>"import './presentation/minimal-ui.css';\n"+s);
