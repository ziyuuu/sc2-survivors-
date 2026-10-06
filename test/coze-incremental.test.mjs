import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {applyUpdate} from '../tools/apply-coze-update.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
test('incremental update retains old resources/environment and refuses broken app before activation',async()=>{
 await fs.mkdir('.cache',{recursive:true});
 const base=await fs.mkdtemp(path.resolve('.cache/coze-update-test-')),root=path.join(base,'existing'),app=path.join(base,'incoming'),patch=path.join(base,'patch'),assets=path.join(root,'public');
 for(const dir of [root,app,patch,assets])await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(root,'.env'),'PORT=7777');await fs.writeFile(path.join(root,'package.json'),JSON.stringify({name:'existing',scripts:{test:'keep',start:'node old.mjs'}}));
 const rows=['old','new'].map(text=>{const b=Buffer.from(text),h=sha(b);return {url:`assets/${h}.glb`,sha256:h,bytes:b.length,mime:'model/gltf-binary',b};});
 for(let i=0;i<rows.length;i++){const r=rows[i],to=path.join(i?patch:assets,r.url);await fs.mkdir(path.dirname(to),{recursive:true});await fs.writeFile(to,r.b);}
 const id='a'.repeat(64),release='b'.repeat(64),manifest='asset-manifest.'+release+'.json';const content={'public/index.html':'new app','public/web-release.json':JSON.stringify({appBuildId:id,release,manifest,runSchema:13}),['public/'+manifest]:JSON.stringify({version:1,release,assets:Object.fromEntries(rows.map((r,i)=>[i,{...r,b:undefined}]))}),'start-coze.mjs':'// fixture launcher'};
 const appFiles=[];for(const [name,text] of Object.entries(content)){const b=Buffer.from(text),to=path.join(app,name);await fs.mkdir(path.dirname(to),{recursive:true});await fs.writeFile(to,b);appFiles.push({path:name,bytes:b.length,sha256:sha(b)});}
 await fs.writeFile(path.join(app,'delivery.json'),JSON.stringify({appBuildId:id,release,appFiles}));
 const result=await applyUpdate({app,root,assets,resources:patch});assert.equal(result.retained,1);assert.equal(result.installed,1);assert.equal(await fs.readFile(path.join(root,'.env'),'utf8'),'PORT=7777');const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));assert.equal(pkg.scripts.test,'keep');assert.equal(pkg.scripts.start,'node start-coze.mjs');
 const pointer=await fs.readFile(path.join(root,'active-release.json'),'utf8');assert.equal((await applyUpdate({app,root,assets,resources:patch})).installed,0);
 await fs.writeFile(path.join(app,'public/index.html'),'corrupt');const before=await fs.readFile(path.join(root,'active-release.json'),'utf8');await assert.rejects(applyUpdate({app,root,assets,resources:patch}),/verification failed/);assert.equal(await fs.readFile(path.join(root,'active-release.json'),'utf8'),before);assert.ok(pointer.includes(id));
});
