import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const revision=process.argv[2]??'r1',kind=process.argv[3]??'web',folder='performance-u01-u03-20261020';
const previous='reports/local/performance-r03-20261020/candidate-r3-web-inputs';
const changes=['src/app/bootstrap.ts','src/ui/hud.ts','src/ui/hud/refresh-batch.ts','src/ui/hud/packed-console.ts','src/ui/controls/battle-actions.ts','src/ui/controls/skills.ts','src/ui/gamepad/controller.ts','src/ui/mobile/input.ts','src/ui/presentation/shop-progress.ts','src/ui/intermission-skin/skin.ts'];
const root='preview/'+folder+'-candidate-'+revision,archive='reports/local/'+folder+'/candidate-'+revision+'-'+kind+'-inputs',loaded=new Map(),overrides=[];
const hash=x=>createHash('sha256').update(x).digest('hex');
const instrumented=process.argv[4]==='counts';
await fs.mkdir(root,{recursive:true});
const plugin={name:'frozen-r03',setup(b){b.onLoad({filter:/\.(ts|mts|css|json|m?js)$/},async a=>{
 const file=path.relative(process.cwd(),a.path).replaceAll('\\','/');let contents=await fs.readFile(a.path);
 if(file.startsWith('src/')&&!changes.includes(file)){const frozen=await fs.readFile(previous+'/'+file);if(contents.toString().replaceAll('\r\n','\n')!==frozen.toString().replaceAll('\r\n','\n'))overrides.push(file);contents=frozen;}
 if(instrumented&&file.endsWith('ui/controls/battle-actions.ts'))contents=Buffer.from(contents.toString().replace('const state:BattleActionState=',"if((globalThis as any).__UCounts)(globalThis as any).__UCounts.actions++;const state:BattleActionState="));
 if(instrumented&&file.endsWith('ui/controls/skills.ts'))contents=Buffer.from(contents.toString().replace('const extras=COMMAND_ACTIONS',"if((globalThis as any).__UCounts)(globalThis as any).__UCounts.pages++;const extras=COMMAND_ACTIONS"));
 loaded.set(path.resolve(a.path),contents);const ext=path.extname(a.path);return {contents,loader:ext==='.mjs'?'js':ext==='.mts'?'ts':ext.slice(1),resolveDir:path.dirname(a.path)};
});}};
const modules=[['Input','ui/mobile/input'],['GamepadInput','ui/gamepad/controller'],['SquadConsole','ui/hud/packed-console'],['ShopProgress','ui/presentation/shop-progress'],['mountIntermissionSkin','ui/intermission-skin/skin'],['skillPages','ui/controls/skills'],['HUD','ui/hud']];
let text=modules.flatMap(([name,file])=>[`import {${name}} from '../../src/${file}.ts';`,`import {${name} as Old${name}} from '../../${previous}/src/${file}.ts';`]).join('\n');
text+=`\nimport {World} from '../../src/simulation/world';import {ControlSettings} from '../../src/ui/controls/settings';import {RefreshBatch} from '../../src/ui/hud/refresh-batch';import {catalogueCards,offerView,restCards} from '../../src/ui/presentation/intermission';import {referenceCard} from '../../src/ui/presentation/reference-card';import {HudSettings} from '../../src/ui/hud/preferences';
globalThis.U01={World,ControlSettings,RefreshBatch,catalogueCards,offerView,restCards,referenceCard,HudSettings,baseline:{${modules.map(([n])=>n+':Old'+n)}},candidate:{${modules.map(([n])=>n)}}};`;
if(kind==='web')text=(await fs.readFile('preview/performance-r03-20261020-candidate-r3/main.ts','utf8'))+'\n'+text;
const stem=kind==='web'?'main':'ui',entry=root+'/'+stem+'.ts';await fs.writeFile(entry,text);
const result=await build({entryPoints:[entry],bundle:true,platform:'browser',format:'iife',target:'es2022',outfile:root+'/'+stem+'.js',metafile:true,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'},plugins:[plugin]});
if(kind==='web')await fs.copyFile('preview/performance-r03-20261020-candidate-r3/index.html',root+'/index.html');
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=loaded.get(path.resolve(file));if(!bytes)continue;inputs.push({file,bytes:bytes.length,sha256:hash(bytes)});const dest=path.join(archive,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}
const outputs=[];for(const file of kind==='web'?['index.html','main.css','main.js']:['ui.js','ui.css']){const bytes=await fs.readFile(root+'/'+file);outputs.push({file:root+'/'+file,bytes:bytes.length,sha256:hash(bytes)});}
await fs.writeFile(root+'/'+(kind==='web'?'build-inputs':'ui-build-inputs')+'.json',JSON.stringify({revision,kind,instrumented,previous,changes,overrides,inputs,outputs},null,2));
console.log(JSON.stringify({root,kind,inputs:inputs.length,overrides,outputs}));
