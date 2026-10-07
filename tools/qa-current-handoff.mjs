import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {applyUpdate} from './apply-coze-update.mjs';
const option=name=>{const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:null;};
const out=option('--out')??'reports/local/current-logic-20261006',app=path.resolve(option('--app')??'dist/Current-Coze-Application-20261006'),resources=path.resolve('dist/web'),root=await fs.mkdtemp(path.resolve('.cache/current-update-')),assets=path.join(root,'public');
const release=JSON.parse(await fs.readFile(path.join(app,'public/web-release.json'),'utf8'));
const target=JSON.parse(await fs.readFile(path.join(app,'public',release.manifest),'utf8'));
const baseline=JSON.parse(await fs.readFile(option('--baseline')??path.join(app,'public',release.manifest),'utf8'));
const oldFiles=[...new Map(Object.values(baseline.assets).map(a=>[a.url,a])).values()];
const targetFiles=[...new Map(Object.values(target.assets).map(a=>[a.url,a])).values()],oldUrls=new Set(oldFiles.map(a=>a.url));
const reused=targetFiles.filter(a=>oldUrls.has(a.url)).length,added=targetFiles.length-reused;
for(const row of oldFiles){const target=path.join(assets,row.url);await fs.mkdir(path.dirname(target),{recursive:true});await fs.link(path.resolve('dist/web',row.url),target);}
const priorDirectory='releases/'+'d'.repeat(64);await fs.mkdir(path.join(root,priorDirectory),{recursive:true});await fs.writeFile(path.join(root,priorDirectory,'retained.txt'),'old-application');
await fs.writeFile(path.join(root,'active-release.json'),JSON.stringify({appBuildId:'d'.repeat(64),directory:priorDirectory,assetRoot:assets}));
await fs.writeFile(path.join(root,'.env'),'PORT=7777\nEXISTING_CONFIG=retain\n');await fs.writeFile(path.join(root,'package.json'),JSON.stringify({name:'existing-coze-project',scripts:{start:'node old.mjs',test:'keep-existing'}}));
const report={at:new Date().toISOString(),method:'Isolated local update from the supplied baseline resource hashes; old files are read-only hardlinks. Real locked npm installation, actual packaged server and all resource verification. No online write.',root,oldResourceFiles:oldFiles.length,expectedReused:reused,expectedAdded:added,checks:[]};
try{
 const result=await applyUpdate({app,root,assets,resources});assert.equal(result.retained,reused);assert.equal(result.installed,added);assert.equal(result.downloadedMissing,0);assert.equal(result.productionDependencies,1);report.activation=result;
 const pointer=path.join(root,'active-release.json'),before=await fs.readFile(pointer,'utf8'),active=JSON.parse(before);assert.equal(active.previous,priorDirectory);assert.equal(await fs.readFile(path.join(root,priorDirectory,'retained.txt'),'utf8'),'old-application');
 assert.equal(await fs.readFile(path.join(root,'.env'),'utf8'),'PORT=7777\nEXISTING_CONFIG=retain\n');assert.equal(JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).scripts.test,'keep-existing');
 report.checks.push(`${reused} verified old files retained, ${added} added, zero full-resource redownload, old app/environment retained`);
 const installed=path.join(root,active.directory),{createGameServer}=await import(pathToFileURL(path.join(installed,'coze-web-server.mjs')).href),server=createGameServer({webRoot:path.join(installed,'public'),assetRoot:assets,backendOptions:{config:{enabled:false}}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{const health=await(await fetch(base+'/health')).json();assert.equal(health.appBuildId,release.appBuildId);assert.equal(health.assetReleaseId,release.release);assert.equal(health.runSchema,release.runSchema);assert.equal((await fetch(base)).status,200);assert.equal((await(await fetch(base+'/api/config')).json()).enabled,false);assert.equal((await fetch(base+'/api/sc2-ops-7f3k9m2q/metrics')).status,503);report.health=health;report.checks.push(`Installed package starts with all ${targetFiles.length} resources verified, backend disabled, protected API fail-closed`);}finally{await new Promise(r=>server.close(r));}
 const repeat=await applyUpdate({app,root,assets,resources});assert.equal(repeat.installed,0);assert.equal(repeat.retained,targetFiles.length);assert.equal(await fs.readFile(pointer,'utf8'),before);report.checks.push('Same package repeat is idempotent and preserves rollback pointer');
 const tampered=path.join(root,'tampered-app');await fs.cp(app,tampered,{recursive:true});await fs.appendFile(path.join(tampered,'README.md'),'\ntampered');await assert.rejects(applyUpdate({app:tampered,root,assets,resources}),/Application verification failed/);assert.equal(await fs.readFile(pointer,'utf8'),before);report.checks.push('Corrupt application rejected without changing active pointer');
 report.passed=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
await fs.writeFile(out+'/handoff-update.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,activation:report.activation,checks:report.checks,failure:report.failure}));
