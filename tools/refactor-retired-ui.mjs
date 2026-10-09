import fs from 'node:fs/promises';
const changes=[];
async function edit(file,run){const before=await fs.readFile(file,'utf8'),after=run(before);if(after===before)throw Error('No change: '+file);await fs.writeFile(file,after);changes.push({file,removedBytes:Buffer.byteLength(before)-Buffer.byteLength(after)});}
function replace(text,before,after){if(!text.includes(before))throw Error('Expected source not found: '+before.slice(0,90));return text.replace(before,after);}
await edit('src/ui/hud/expedition-panel.ts',text=>{const marker='export function renderUnitOperations(w:World){',start=text.indexOf(marker);if(start<0||text.slice(start).includes('\nexport function '))throw Error('Unexpected retired renderer boundary');return text.slice(0,start).split(/\r?\n/).filter(line=>!line.startsWith('export function renderExpeditionProduction(')).join('\n');});
await edit('src/ui/hud.ts',text=>{
 text=replace(text,'unitOperationsOpen=false;private operationsWasPaused=false;','');
 text=replace(text,'if(this.unitOperationsOpen)this.executePanelAction(()=>activateBattleAction(world,battleAction));else activateBattleAction(world,battleAction);','activateBattleAction(world,battleAction);');
 text=replace(text,"if(this.unitOperationsOpen){this.closeUnitOperations();return;}",'');
 text=replace(text,'||this.unitOperationsOpen;',';');
 text=text.split(/\r?\n/).filter(line=>!['else if((action===\'unit-operations-back\'','else if(action===\'unit-mode\')','else if(action===\'family-ability\')','openUnitOperations(){','closeUnitOperations(){','private executePanelAction(','else if(this.unitOperationsOpen)'].some(s=>line.trim().startsWith(s))).join('\n');
 // The same settings close branch already returns earlier in pause().
 const duplicate="if(this.settingsOpen){this.settingsOpen=false;this.inputReset();this.update();return;}";
 const first=text.indexOf(duplicate),second=text.indexOf(duplicate,first+duplicate.length);if(second<0)throw Error('Expected duplicate settings branch');text=text.slice(0,second)+text.slice(second+duplicate.length);
 return text;
});
await edit('src/ui/gamepad/controller.ts',text=>replace(text,',[data-action="unit-operations-back"],[data-action="unit-operations-close"]',''));
// Consume the compiler's existing unused-import findings. No dependency or
// runtime rule rewrite is needed for this source-only removal.
const findings=await fs.readFile('reports/local/maintenance-audit-20261008/unused-symbols.txt','utf8');
const addedUnused={'src/ui/hud.ts':['renderUnitOperations'],'src/ui/hud/expedition-panel.ts':['FAMILY_MODES','familyModeState','canSetFamilyMode','ModeFamily','battleActionState']};
for(const file of ['src/ui/hud.ts','src/ui/hud/expedition-panel.ts','src/ui/presentation/intermission.ts']){
 const before=await fs.readFile(file,'utf8'),unused=new Set(addedUnused[file]??[]);
 for(const line of findings.split(/\r?\n/))if(line.startsWith(file+'(')){const name=/error TS\d+: '([^']+)'/.exec(line)?.[1];if(name)unused.add(name);}
 if(file==='src/ui/hud.ts')for(const name of ['tacticalCard','UNIQUE_SUPPORT','healthReadout','rankLabel','rewardOwnership','unitCallsign','statusReadout'])unused.add(name);
 const text=before.split(/\r?\n/).map(line=>{const m=/^import (type )?\{([^}]+)\}( from ['"][^'"]+['"];)$/.exec(line);if(!m)return line;const names=m[2].split(',').filter(n=>!unused.has(n.trim().replace(/^type /,'').split(/\s+as\s+/).at(-1)));return names.length?'import '+(m[1]??'')+'{'+names.join(',')+'}'+m[3]:'';}).filter((line,i,rows)=>line||i&&rows[i-1]).join('\n');
 await fs.writeFile(file,text);changes.push({file,importCleanupBytes:Buffer.byteLength(before)-Buffer.byteLength(text)});
}
await fs.writeFile('reports/local/maintenance-audit-20261008/retired-ui-removal.json',JSON.stringify(changes,null,2));console.log(JSON.stringify(changes));
