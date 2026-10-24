import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const variant=process.argv[2]??'candidate-r1',root='preview/performance-l02-20261020-'+variant,folder='reports/local/performance-l02-20261020',archive=folder+'/'+variant+'-inputs';
const previous='reports/local/performance-u04-20261020/candidate-r2-web-inputs';
const changes=['src/assets/preparation-wait.ts','src/assets/offline-pack.ts','src/assets/http-store.ts','src/assets/persistent-cache.ts','src/app/background-preparation.ts','src/app/asset-readiness.ts','src/render/scene/battle-renderer.ts','src/ui/hud/m3-menu.ts'];
const baseline=variant.startsWith('baseline'),loaded=new Map(),overrides=[],hash=x=>createHash('sha256').update(x).digest('hex');
await fs.mkdir(root,{recursive:true});
const plugin={name:'frozen-u04',setup(b){b.onLoad({filter:/\.(ts|mts|css|json|m?js)$/},async a=>{
 const file=path.relative(process.cwd(),a.path).replaceAll('\\','/');let contents=await fs.readFile(a.path);
 if(file.startsWith('src/')&&(baseline||!changes.includes(file))){const frozen=await fs.readFile(previous+'/'+file);if(contents.toString().replaceAll('\r\n','\n')!==frozen.toString().replaceAll('\r\n','\n'))overrides.push(file);contents=frozen;}
 loaded.set(path.resolve(a.path),contents);const ext=path.extname(a.path);
 return {contents,loader:ext==='.mjs'?'js':ext==='.mts'?'ts':ext.slice(1),resolveDir:path.dirname(a.path)};
});}};
const text=`import '../../tools/performance-l02-runtime';
import '../../src/ui/presentation/building-panel.css';import '../../src/ui/presentation/game-shell.css';import '../../src/render/scene/battle-distress.css';import '../../src/ui/presentation/world-labels.css';import '../../src/ui/presentation/text-scale-reference.generated.css';
import {startGame} from '../../src/app/start-game';import {finishOpening} from '../../src/ui/presentation/opening';
startGame(529).then(app=>{window.L02.app=app;window.L02.bootFinished=performance.now();}).catch(error=>{finishOpening();document.querySelector('#interface').textContent=String(error);window.L02.error=String(error);console.error(error);});`;
await fs.writeFile(root+'/main.ts',text);
const result=await build({entryPoints:[root+'/main.ts'],bundle:true,platform:'browser',format:'iife',target:'es2022',outfile:root+'/main.js',metafile:true,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'},plugins:[plugin]});
await fs.copyFile('preview/performance-r03-20261020-candidate-r3/index.html',root+'/index.html');
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=loaded.get(path.resolve(file));if(!bytes)continue;inputs.push({file,bytes:bytes.length,sha256:hash(bytes)});const dest=path.join(archive,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}
const outputs=[];for(const file of ['index.html','main.css','main.js']){const bytes=await fs.readFile(root+'/'+file);outputs.push({file:root+'/'+file,bytes:bytes.length,sha256:hash(bytes)});}
await fs.writeFile(root+'/build-inputs.json',JSON.stringify({variant,previous,changes:baseline?[]:changes,overrides,inputs,outputs},null,2));
console.log(JSON.stringify({root,inputs:inputs.length,overrides,outputs}));
