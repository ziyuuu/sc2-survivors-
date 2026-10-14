import fs from 'node:fs/promises';
import {createReadStream,constants} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root='reports/local/mvp5-delivery-20261014',baseline=root+'/baseline',read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
export async function hash(file){const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex')}
await fs.mkdir(baseline,{recursive:true});
await fs.access(baseline+'/baseline.json').then(()=>{throw Error('Baseline already exists')},e=>{if(e.code!=='ENOENT')throw e});
const web='dist/MVP5-Lifecycle-Web-20261014-R2',build=await read(web+'/build-inputs.json'),release=await read(web+'/web-release.json'),priorApp=await read('deploy/coze/delivery.json');
for(const r of build.inputs)assert.equal(await hash(r.file),r.sha256,r.file);
for(const r of build.builtFiles)assert.equal(await hash(web+'/'+r.file),r.sha256,r.file);
for(const r of priorApp.appFiles)assert.equal(await hash('deploy/coze/'+r.path),r.sha256,r.path);
const names=(await fs.readFile(root+'/working-files.z')).toString().split('\0').filter(Boolean),workingFiles=[];
for(const file of names){const stat=await fs.stat(file).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));workingFiles.push({file,bytes:stat?.size??null,sha256:stat?await hash(file):null});}
const retained=[];for(const name of await fs.readdir('dist'))if(/\.(html|zip)$/.test(name)){const file='dist/'+name;retained.push({file,bytes:(await fs.stat(file)).size,sha256:await hash(file)});}
for(const name of ['delivery.json','package.json','package-lock.json','resource-groups.json'])await fs.copyFile('deploy/coze/'+name,baseline+'/'+name,constants.COPYFILE_EXCL);
const old=await read('deploy/coze/public/web-release.json');await fs.copyFile('deploy/coze/public/'+old.manifest,baseline+'/prior-manifest.json',constants.COPYFILE_EXCL);
await fs.copyFile(web+'/build-inputs.json',baseline+'/formal-build.json',constants.COPYFILE_EXCL);
await fs.writeFile(baseline+'/baseline.json',JSON.stringify({at:new Date().toISOString(),commit:(await fs.readFile(root+'/commit.txt','utf8')).trim(),web,release,priorApp,workingFiles,retained,scope:'Step 5 local final delivery and viewing entry; unchanged step 3/4 formal runtime; no live deployment.'},null,2),{flag:'wx'});
console.log(JSON.stringify({passed:true,inputs:build.inputs.length,priorApplicationFiles:priorApp.appFiles.length,workingFiles:workingFiles.length,retained:retained.length}));
