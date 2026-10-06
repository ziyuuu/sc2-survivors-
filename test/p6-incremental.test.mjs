import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {applyUpdate} from '../tools/apply-coze-update.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function fixture(){
 await fs.mkdir('.cache',{recursive:true});
 const base=await fs.mkdtemp(path.resolve('.cache/p6-update-')),app=path.join(base,'incoming'),root=path.join(base,'existing'),assets=path.join(root,'public');
 await fs.mkdir(app,{recursive:true});await fs.mkdir(assets,{recursive:true});
 const appBuildId='1'.repeat(64),release='2'.repeat(64),manifest=`asset-manifest.${release}.json`;
 const content={'public/web-release.json':JSON.stringify({appBuildId,release,manifest,runSchema:23}),['public/'+manifest]:JSON.stringify({version:1,release,assets:{}}),'public/index.html':'fixed web bundle','start-coze.mjs':'// fixture','backend/service.mjs':'// server v1'};
 const write=async()=>{const appFiles=[];for(const [p,value] of Object.entries(content)){const b=Buffer.from(value),to=path.join(app,p);await fs.mkdir(path.dirname(to),{recursive:true});await fs.writeFile(to,b);appFiles.push({path:p,bytes:b.length,sha256:sha(b)});}await fs.writeFile(path.join(app,'delivery.json'),JSON.stringify({appBuildId,release,appFiles}));};
 await write();return {app,root,assets,content,write};
}
test('P6 server-only updates with an unchanged web ID retain the previous immutable application and permit repeat activation',async()=>{
 const f=await fixture();const first=await applyUpdate(f),old=JSON.parse(await fs.readFile(path.join(f.root,'active-release.json'),'utf8'));
 f.content['backend/service.mjs']='// server v2';await f.write();const second=await applyUpdate(f),active=JSON.parse(await fs.readFile(path.join(f.root,'active-release.json'),'utf8'));
 assert.equal(first.appBuildId,second.appBuildId);assert.notEqual(first.packageBuildId,second.packageBuildId);assert.equal(active.previous,old.directory);
 assert.equal(await fs.readFile(path.join(f.root,old.directory,'backend/service.mjs'),'utf8'),'// server v1');
 assert.equal(await fs.readFile(path.join(f.root,active.directory,'backend/service.mjs'),'utf8'),'// server v2');
 await applyUpdate(f);assert.equal(JSON.parse(await fs.readFile(path.join(f.root,'active-release.json'),'utf8')).previous,old.directory);
});
test('P6 missing locked server dependencies refuse activation and preserve the current pointer',async()=>{
 const f=await fixture();await applyUpdate(f);const pointer=path.join(f.root,'active-release.json'),before=await fs.readFile(pointer,'utf8');
 f.content['package.json']=JSON.stringify({type:'module',dependencies:{pg:'8.23.1'}});await f.write();
 await assert.rejects(applyUpdate(f),/verified package-lock/);assert.equal(await fs.readFile(pointer,'utf8'),before);
});
