import fs from 'node:fs';import cp from 'node:child_process';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const baseline='a6f7e6f3ff229d1eb7adf294e3d06b5fdc13a377',out='reports/local/battle-ui-integration-20261008';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=cp.execFileSync('git',['ls-tree','-rz','--name-only',baseline,'src','deploy/coze/backend','deploy/coze/vendor','deploy/coze/start-coze.mjs','deploy/coze/sc2-backend.conf','backend','vendor','tools/backend','tools/start-coze.mjs','start-coze.mjs','sc2-backend.conf'],{encoding:'utf8'}).split('\0').filter(Boolean);
const allowed=new Set(['src/ui/hud.ts','src/ui/hud/minimap.ts','src/ui/hud/expedition-panel.ts','src/ui/presentation/game-shell.css','src/ui/presentation/intermission.ts','src/ui/presentation/reference-card.ts','src/app/run-session.ts','src/persistence/archive.ts']);
const rows=files.map(file=>{const old=cp.execFileSync('git',['show',baseline+':'+file],{maxBuffer:40*1024*1024}),now=fs.readFileSync(file),text=/\.(ts|css|mjs|cjs|js|conf|sql|json|html|md|svg|txt|map)$/.test(file),norm=b=>text?b.toString('utf8').replace(/\r\n/g,'\n'):b;return {file,before:sha(norm(old)),after:sha(norm(now)),same:sha(norm(old))===sha(norm(now))};});
for(const row of rows)assert.ok(row.same||allowed.has(row.file),'Unauthorized source change '+row.file);
const oldMinimap=cp.execFileSync('git',['show',baseline+':src/ui/hud/minimap.ts'],{encoding:'utf8'}).replace(/\r\n/g,'\n'),newMinimap=fs.readFileSync('src/ui/hud/minimap.ts','utf8').replace(/\r\n/g,'\n');
// The only map renderer differences are the two visible +/- labels.
const mapLabels=oldMinimap.replace("${hudGlyph('map')}",'−').replace("button.title=collapsed?'展开地图':'收起地图';","button.title=collapsed?'展开地图':'收起地图';button.textContent=collapsed?'+':'−';");
assert.equal(newMinimap,mapLabels);
const resources=JSON.parse(fs.readFileSync('dist/web/web-release.json','utf8'));
const report={at:new Date().toISOString(),baseline,appBuildId:resources.appBuildId,resourceRelease:resources.release,runSchema:resources.runSchema,sourceFiles:rows.length,unchanged:rows.filter(r=>r.same).length,changed:rows.filter(r=>!r.same),mapDrawingAndInputUnchanged:true,protected:rows,scope:'Only approved UI, optional presentation-only purchase journal in the outer save archive, and packaging. Simulation, data, renderers, controls, attack effects, terrain and backend/vendor preserved. Separate source proof; not natural/physical acceptance.'};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/preservation.json',JSON.stringify(report,null,2));console.log(JSON.stringify({files:rows.length,unchanged:report.unchanged,changed:report.changed.map(r=>r.file),map:true}));
