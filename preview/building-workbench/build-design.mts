import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {ASSETS} from '../../src/assets/manifest';
import {PAINTED_CARDS} from '../../src/assets/ui-art.generated';
import {PRODUCTION_LINES} from '../../src/data/expedition-buildings';
const root=path.resolve('preview/building-workbench'),out=path.resolve('dist/mvp1-intermission-design-20261013'),evidence=path.resolve('reports/local/mvp1-intermission-design-20261013');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
const required=new Set(['ui.minerals','ui.gas','tech.attack','tech.armor','tech.stim','tech.shield','tech.infernal','tech.heal','building.barracks','building.factory','building.starport','building.gateway','building.robotics','building.stargate','building.hatchery']);
for(const race of ['terran','zerg','protoss'])for(const kind of ['background','objects','line-equipment'])required.add('ui.intermission.'+kind+'-'+race);
for(const l of Object.values(PRODUCTION_LINES))for(const f of l.families){required.add('unit.'+f);const p=PAINTED_CARDS[f as keyof typeof PAINTED_CARDS];if(p)required.add('ui.paint.'+p.assetKey);}
const embedded:Record<string,string>={},provenance:object[]=[];const hash=(d:Buffer|string)=>createHash('sha256').update(d).digest('hex');
for(const id of required){const a=ASSETS.get(id);if(!a||a.status!=='available'||!a.url)continue;const file=path.resolve('public',a.url.replace(/^\//,''));const data=fs.readFileSync(file),mime=file.endsWith('.webp')?'image/webp':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.jpg')?'image/jpeg':'image/png';embedded[id]=`data:${mime};base64,${data.toString('base64')}`;provenance.push({id,file,bytes:data.length,sha256:hash(data)});}
const result=await build({entryPoints:[path.join(root,'design.ts')],bundle:true,write:false,outfile:'design.js',format:'iife',target:'es2022',minify:true,define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'}});
const js=result.outputFiles.find(f=>f.path.endsWith('.js'))!.text,css=result.outputFiles.find(f=>f.path.endsWith('.css'))!.text;
const html=fs.readFileSync(path.join(root,'design-shell.html'),'utf8').replace('__CSS__',()=>css).replace('__ASSETS__',()=>JSON.stringify(embedded).replace(/</g,'\\u003c')).replace('__JS__',()=>js.replace(/<\/script/gi,'<\\/script'));
fs.writeFileSync(path.join(out,'index.html'),html);
const report={created:new Date().toISOString(),scope:'Independent three-race entry using canonical src building rules, shared UI and the main-game scheduler in an isolated World. No player persistence or natural-combat acceptance.',output:path.join(out,'index.html'),bytes:Buffer.byteLength(html),sha256:hash(html),assets:provenance};fs.writeFileSync(path.join(evidence,'design-build.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({output:report.output,bytes:report.bytes,assets:provenance.length,sha256:report.sha256}));
