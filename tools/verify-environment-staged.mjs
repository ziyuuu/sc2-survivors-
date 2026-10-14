import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='reports/local/mvp5-full-map-20261014',git=(args,options={})=>execFileSync('git',args,{maxBuffer:64*1024*1024,...options}),sha=b=>createHash('sha256').update(b).digest('hex');
const intended=JSON.parse(await fs.readFile(root+'/commit-files-final.json','utf8')).rows,expected=new Set(intended.map(r=>r.file)),staged=git(['diff','--cached','--name-only','-z']).toString().split('\0').filter(Boolean);
assert.deepEqual([...staged].sort(),[...expected].sort(),'Unexpected staged files');assert.equal(git(['branch','--show-current']).toString().trim(),'main');
assert.ok(!staged.some(f=>f.startsWith('assets/private/')||f.startsWith('deploy/coze/')||/starship/i.test(f)||f.startsWith('dev/')));
const index=new Map(git(['ls-files','--stage','-z']).toString().split('\0').filter(Boolean).map(row=>{const split=row.indexOf('\t'),meta=row.slice(0,split).split(' ');assert.equal(meta[2],'0');return [row.slice(split+1),meta[1]]}));
const build=JSON.parse(await fs.readFile('dist/MVP5-Full-Map-Main-20261014-R3/build-inputs.json','utf8')),sourceFiles=build.inputs.filter(r=>r.file!=='src/assets/runtime.generated.ts');
const release=JSON.parse(await fs.readFile(build.output+'/web-release.json','utf8')),manifest=JSON.parse(await fs.readFile(build.output+'/'+release.manifest,'utf8')),assets=new Map(Object.values(manifest.assets).map(r=>['deploy/runtime/'+r.url,r]));
const files=[...sourceFiles.map(r=>r.file),...assets.keys(),...staged.filter(f=>!assets.has(f)&&!sourceFiles.some(r=>r.file===f))];for(const file of files)assert.ok(index.has(file),'Missing Git file '+file);
const bytes=git(['cat-file','--batch'],{input:files.map(f=>index.get(f)).join('\n')+'\n'});let offset=0;const verified=[];
for(const file of files){const end=bytes.indexOf(10,offset),header=bytes.subarray(offset,end).toString().split(' ');assert.equal(header[1],'blob');const size=Number(header[2]),content=bytes.subarray(end+1,end+1+size);offset=end+size+2;const asset=assets.get(file);
 if(asset){const pointer=content.toString();assert.ok(pointer.includes('oid sha256:'+asset.sha256+'\n'),'Wrong LFS hash '+file);assert.match(pointer,new RegExp('size '+asset.bytes+'\\r?\\n?$'));}
 else {const actual=await fs.readFile(file);assert.equal(content.toString().replace(/\r\n/g,'\n'),actual.toString().replace(/\r\n/g,'\n'),'Staged source differs '+file);}
 verified.push({file,gitBlob:index.get(file),bytes:size,kind:asset?'lfs-resource':'source-or-evidence'});
}
const result={at:new Date().toISOString(),passed:true,branch:'main',base:git(['rev-parse','HEAD']).toString().trim(),stagedFiles:staged.length,formalCompiledInputs:sourceFiles.length,generatedInput:'src/assets/runtime.generated.ts restored by the tracked source-assets registry',resourceFiles:assets.size,resourceRecords:Object.keys(manifest.assets).length,verified};await fs.writeFile(root+'/staged-validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,stagedFiles:staged.length,compiledInputs:sourceFiles.length,resources:assets.size}));
