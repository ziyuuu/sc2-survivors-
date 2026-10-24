import fs from 'node:fs';const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/ui/presentation/reference-primitives.ts',s=>s.replace("${glyph('info')}${label?`<span>${esc(label)}</span>`:''}","${label?`<span>${esc(label)}</span>`:glyph('info')}"));
edit('src/ui/presentation/reference-card.ts',s=>s.replace('<p class="im-flavour">${esc(c.flavour)}</p>','').replace('<p class="im-detail-flavour">${esc(c.flavour)}</p>','').replace(/<span class="im-art-code" aria-hidden="true">[\s\S]*?<\/span>/,''));
edit('src/ui/starship/legacy-view.ts',s=>s.replace(/const phaseNames=[^\r\n]+[\r\n]+/,''));
edit('src/ui/hud.ts',s=>s.replace('renderSettings,renderArchives,','renderSettings,').replace(/ private archivesOpen=false;[\r\n]+/,'').replace('||this.archivesOpen','').replaceAll('this.archivesOpen=false;','').replace(/   else if\(action==='pause-saves'\)[^\r\n]+[\r\n]+/,'').replace(',this.archivesOpen,',',').replace(/if\(this.archivesOpen\)\{this.update\(\);return;\}/,'').replace('&&!this.archivesOpen','').replace(/  else if\(this.archivesOpen\)[^\r\n]+[\r\n]+/,''));
edit('src/ui/presentation/settings-screen.ts',s=>s.replace(/\/\*\* Archive actions[^]*$/,''));
