import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const out='reports/local/ui-coze-main-20261007',app='dist/UI-Coze-Main-Application-20261007';
const hash=b=>createHash('sha256').update(b).digest('hex'),json=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const ui='083c5ddd2338ac3b1c38bbbd18e63d98e232ddc2',coze=git('rev-parse','origin/codex/backend-deploy-logic-20261007');
const delivery=await json(app+'/delivery.json');
const stamp=await json('reports/local/ui-fidelity-round-20261006/final-source-stamp.json');
for(const row of stamp.source){
 // The source stamp predates the separately verified lossless Blob-container fix.
 if(row.path==='src/assets/offline-pack.ts')assert.equal((await fs.readFile(row.path,'utf8')).replaceAll('\r\n','\n'),execFileSync('git',['show',ui+':'+row.path],{encoding:'utf8'}),row.path);
 else assert.equal(hash(await fs.readFile(row.path)),row.sha256,row.path);
}
assert.equal(git('diff','--name-only',ui,'--','src','preview/ui-20261003','deploy/runtime','deploy/coze/public'),'');
const prior=await json('dist/UI-Fidelity-Coze-Application-20261007/delivery.json');
const publicFiles=prior.appFiles.filter(f=>f.path.startsWith('public/'));
for(const f of publicFiles){assert.equal(hash(await fs.readFile(app+'/'+f.path)),f.sha256,f.path);assert.equal(hash(await fs.readFile('deploy/coze/'+f.path)),f.sha256,f.path);}
for(const f of delivery.appFiles){const b=await fs.readFile(app+'/'+f.path);assert.equal(b.length,f.bytes,f.path);assert.equal(hash(b),f.sha256,f.path);assert.equal(hash(await fs.readFile('deploy/coze/'+f.path)),f.sha256,f.path);assert.ok(!/^data\//.test(f.path)&&!f.path.includes('pglite-bundle'),'Private bundle in application');}
assert.equal(hash(JSON.stringify([...delivery.appFiles].sort((a,b)=>a.path.localeCompare(b.path)))),delivery.packageBuildId);
assert.equal(hash(await fs.readFile(app+'/delivery.json')),hash(await fs.readFile('deploy/coze/delivery.json')));
const vendor=git('ls-tree','-r',coze,'--','deploy/coze/vendor').split('\n');let vendorBytes=0;
for(const line of vendor){const [record,file]=line.split('\t'),oid=record.split(' ')[2],b=await fs.readFile(file);assert.equal(createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'),oid,file);assert.equal(hash(b),hash(await fs.readFile(file.replace('deploy/coze/vendor/pglite/','node_modules/@electric-sql/pglite/'))),file+' locked package');vendorBytes+=b.length;}
assert.equal(vendor.length,308);
const inherited=['start-coze.mjs','sc2-backend.conf','BACKEND_DEPLOY_LOGIC_20261007.md','backend/service.mjs','backend/admin/app.js','backend/admin/index.html'];
for(const file of inherited){const original=execFileSync('git',['show',coze+':deploy/coze/'+file]);assert.equal(hash(await fs.readFile('deploy/coze/'+file)),hash(original),file);}
for(const file of ['start-coze.mjs','backend/database.mjs','backend/service.mjs','backend/admin/app.js','backend/admin/index.html'])assert.equal((await fs.readFile('tools/'+file,'utf8')).replaceAll('\r\n','\n'),(await fs.readFile('deploy/coze/'+file,'utf8')).replaceAll('\r\n','\n'),file);
const release=await json(app+'/public/web-release.json'),manifest=await json(app+'/public/'+release.manifest),resources=[...new Map(Object.values(manifest.assets).map(r=>[r.url,r])).values()];
for(const r of resources){const b=await fs.readFile('dist/web/'+r.url);assert.equal(b.length,r.bytes,r.url);assert.equal(hash(b),r.sha256,r.url);}
assert.equal(resources.length,629);assert.equal(release.release,'2848cfe41f50528ce1cc9128edd1e5ddccdf9bd7e889aa15af72df16f3fc287a');assert.equal(release.appBuildId,prior.appBuildId);assert.equal(release.runSchema,26);
assert.equal(git('ls-files','--','deploy/coze/data','**/pglite-bundle.tgz'),'');
assert.ok(git('check-ignore','deploy/coze/data/pglite-bundle.tgz').includes('pglite-bundle.tgz'));
const report={at:new Date().toISOString(),passed:true,uiCommit:ui,cozeCommit:coze,sourceFilesStampedByteIdentical:stamp.source.length-1,offlineContainerCommittedTextIdentical:true,allGameSourceGitIdentical:true,uiArtAndRuntimeGitUnchanged:true,publicFilesByteIdentical:publicFiles.length,vendorFilesByteIdentical:vendor.length,vendorMatchesLockedDevPackage:true,vendorBytes,inheritedCozeFiles:inherited,databaseAdaptation:'Same canonical module in source and package; prefer vendored PGlite when present, fallback to locked npm for the development tree.',resources:{records:Object.keys(manifest.assets).length,files:resources.length,bytes:resources.reduce((n,r)=>n+r.bytes,0),release:release.release,added:0},appBuildId:release.appBuildId,packageBuildId:delivery.packageBuildId,appFiles:delivery.appFiles.length,privateBundleTracked:false,privateDataInApplication:false};
await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/preservation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
