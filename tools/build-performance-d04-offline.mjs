import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const variant=process.argv[2],source='dist/SC2-Survivors-Loot-Elites-R2-20261019.html',web='preview/performance-d04-20261021-'+variant,root='reports/local/performance-d04-20261021/offline-'+variant,output=root+'/performance-d04.html',sha=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(root,{recursive:false});
const binding=JSON.parse(await fs.readFile(web+'/build-inputs.json'));for(const f of binding.outputs)assert.equal(sha(await fs.readFile(f.file)),f.sha256,f.file);
const old=JSON.parse(await fs.readFile('reports/local/loot-feedback-20261019/r2/build-inputs.json'));
const manifest=binding.inputs.find(r=>r.file==='src/assets/runtime.generated.ts');assert.ok(old.inputs.some(r=>r.file===manifest.file&&r.sha256===manifest.sha256));
const input=await fs.open(source,'r'),stat=await input.stat(),head=Buffer.alloc(Math.min(20*1048576,stat.size)),tail=Buffer.alloc(Math.min(64*1048576,stat.size));await input.read(head,0,head.length,0);await input.read(tail,0,tail.length,stat.size-tail.length);await input.close();
const start=head.indexOf('<script id="sc2-resource-pack"'),tailScript=tail.lastIndexOf('<script>'),end=stat.size-tail.length+tailScript;assert.ok(start>=0&&tailScript>=0&&end>start);
let html=await fs.readFile(web+'/index.html','utf8');const js=await fs.readFile(web+'/main.js','utf8'),css=await fs.readFile(web+'/main.css','utf8');
assert.ok(html.includes('<link rel="stylesheet" href="./main.css">'));assert.ok(html.includes('<script src="./main.js"></script>'));
html=html.replace('<link rel="stylesheet" href="./main.css">','<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>').replace('<script src="./main.js"></script>','');const at=html.indexOf('</body>');assert.ok(at>0);
const handle=await fs.open(output,'wx'),outputHash=createHash('sha256'),payloadHash=createHash('sha256');async function write(bytes){await handle.writeFile(bytes);outputHash.update(bytes);}
try{await write(Buffer.from(html.slice(0,at)));for await(const bytes of createReadStream(source,{start,end:end-1})){payloadHash.update(bytes);await write(bytes);}await write(Buffer.from('<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>'+html.slice(at)));}finally{await handle.close();}
const originalHash=createHash('sha256');for await(const bytes of createReadStream(source))originalHash.update(bytes);const sourceSha=originalHash.digest('hex');assert.equal(sourceSha,'a5f2ec97b1a85c34d11ffd8f43088caeaedb5bab5d83959f3f0532bb25ea1db8');
const report={scope:'D04 diagnostic offline document with unchanged complete embedded asset payload; identical paired Web JavaScript and CSS, no production delivery.',source:{file:source,sha256:sourceSha,payloadStart:start,payloadEndExclusive:end,payloadBytes:end-start,payloadSha256:payloadHash.digest('hex')},html:{file:output,bytes:(await fs.stat(output)).size,sha256:outputHash.digest('hex')},web:binding,manifest};await fs.writeFile(root+'/build-inputs.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.html));
