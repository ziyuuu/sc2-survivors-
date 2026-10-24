import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const revision=process.argv[2]??'r1',kind=process.argv[3]??'web',folder='performance-u04-20261020';
const previous='reports/local/performance-u01-u03-20261020/candidate-r1-web-inputs';
const changes=['src/services/game-observer.ts','src/services/telemetry-client.ts'];
const root='preview/'+folder+'-candidate-'+revision,archive='reports/local/'+folder+'/candidate-'+revision+'-'+kind+'-inputs',loaded=new Map(),overrides=[];
const hash=x=>createHash('sha256').update(x).digest('hex');
await fs.mkdir(root,{recursive:true});
const plugin={name:'frozen-u01-u03',setup(b){b.onLoad({filter:/\.(ts|mts|css|json|m?js)$/},async a=>{
 const file=path.relative(process.cwd(),a.path).replaceAll('\\','/');let contents=await fs.readFile(a.path);
 if(file.startsWith('src/')&&!changes.includes(file)){const frozen=await fs.readFile(previous+'/'+file);if(contents.toString().replaceAll('\r\n','\n')!==frozen.toString().replaceAll('\r\n','\n'))overrides.push(file);contents=frozen;}
 loaded.set(path.resolve(a.path),contents);const ext=path.extname(a.path);
 // Both observers must attach to the same observation module used by World.
 const resolveDir=file.startsWith(previous+'/src/services/')?path.resolve('src/services'):path.dirname(a.path);
 return {contents,loader:ext==='.mjs'?'js':ext==='.mts'?'ts':ext.slice(1),resolveDir};
});}};
let text=`import {GameObserver} from '../../src/services/game-observer';import {TelemetryClient,TELEMETRY_KEYS} from '../../src/services/telemetry-client';
import {GameObserver as OldGameObserver} from '../../${previous}/src/services/game-observer';
import {TelemetryClient as OldTelemetryClient} from '../../${previous}/src/services/telemetry-client';
import {World} from '../../src/simulation/world';import {observeRecovery} from '../../src/simulation/observation';
import {CONSENT_VERSION,validateEvent,IDENTITIES} from '../../tools/backend/contracts.mjs';
globalThis.U04={World,observeRecovery,CONSENT_VERSION,validateEvent,IDENTITIES,TELEMETRY_KEYS,baseline:{GameObserver:OldGameObserver,TelemetryClient:OldTelemetryClient},candidate:{GameObserver,TelemetryClient}};`;
if(kind==='web')text=(await fs.readFile('preview/performance-r03-20261020-candidate-r3/main.ts','utf8')).split("import {BattleRenderer as OldBattleRenderer}")[0]+'\n'+text;
const stem=kind==='web'?'main':'modules',entry=root+'/'+stem+'.ts';await fs.writeFile(entry,text);
const result=await build({entryPoints:[entry],bundle:true,platform:kind==='node'?'node':'browser',format:'iife',target:'es2022',outfile:root+'/'+stem+'.js',metafile:true,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'},plugins:[plugin]});
if(kind==='web')await fs.copyFile('preview/performance-r03-20261020-candidate-r3/index.html',root+'/index.html');
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=loaded.get(path.resolve(file));if(!bytes)continue;inputs.push({file,bytes:bytes.length,sha256:hash(bytes)});const dest=path.join(archive,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}
const outputs=[];for(const file of kind==='web'?['index.html','main.css','main.js']:['modules.js']){const bytes=await fs.readFile(root+'/'+file);outputs.push({file:root+'/'+file,bytes:bytes.length,sha256:hash(bytes)});}
await fs.writeFile(root+'/'+kind+'-build-inputs.json',JSON.stringify({revision,kind,previous,changes,overrides,inputs,outputs},null,2));
console.log(JSON.stringify({root,kind,inputs:inputs.length,overrides,outputs}));
