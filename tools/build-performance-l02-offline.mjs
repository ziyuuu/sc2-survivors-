import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
const variant=process.argv[2]??'candidate-r1';
const source='dist/SC2-Survivors-Loot-Elites-R2-20261019.html',web='preview/performance-l02-20261020-'+variant,root='reports/local/performance-l02-20261020/offline-'+variant,output=root+'/performance-l02.html',sha=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(root,{recursive:true});
const binding=JSON.parse(await fs.readFile(web+'/build-inputs.json','utf8'));for(const f of binding.outputs)if(sha(await fs.readFile(f.file))!==f.sha256)throw Error('Changed Web output '+f.file);
const old=JSON.parse(await fs.readFile('reports/local/loot-feedback-20261019/r2/build-inputs.json','utf8'));
const oldManifest=old.inputs.find(r=>r.file==='src/assets/manifest.generated.json');
// The entire payload is reused verbatim; asset identity tables must match.
const manifestFile=binding.inputs.find(r=>r.file==='src/assets/runtime.generated.ts');
if(!manifestFile||!old.inputs.some(r=>r.file===manifestFile.file&&r.sha256===manifestFile.sha256))throw Error('Asset manifest identity changed');
const input=await fs.open(source,'r'),stat=await input.stat(),head=Buffer.alloc(Math.min(20*1048576,stat.size)),tail=Buffer.alloc(Math.min(64*1048576,stat.size));await input.read(head,0,head.length,0);await input.read(tail,0,tail.length,stat.size-tail.length);await input.close();
const start=head.indexOf('<script id="sc2-resource-pack"'),tailScript=tail.lastIndexOf('<script>'),end=stat.size-tail.length+tailScript;
if(start<0||tailScript<0||end<=start)throw Error('Pack boundaries missing');
let html=await fs.readFile(web+'/index.html','utf8');const js=await fs.readFile(web+'/main.js','utf8'),css=await fs.readFile(web+'/main.css','utf8');html=html.replace('<link rel="stylesheet" href="/main.css">','<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>').replace('<script src="/main.js"></script>','');const at=html.indexOf('</body>');if(at<0)throw Error('HTML boundary');
const handle=await fs.open(output,'wx'),outputHash=createHash('sha256'),payloadHash=createHash('sha256');
async function write(bytes){await handle.writeFile(bytes);outputHash.update(bytes);}
try{await write(Buffer.from(html.slice(0,at)));for await(const bytes of createReadStream(source,{start,end:end-1})){payloadHash.update(bytes);await write(bytes);}await write(Buffer.from('<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>'+html.slice(at)));}finally{await handle.close();}
const originalHash=createHash('sha256');for await(const bytes of createReadStream(source))originalHash.update(bytes);const sourceSha=originalHash.digest('hex');if(sourceSha!=='a5f2ec97b1a85c34d11ffd8f43088caeaedb5bab5d83959f3f0532bb25ea1db8')throw Error('Original resource donor changed');
const report={created:new Date().toISOString(),scope:'L02 paired diagnostic JS/CSS, frozen U04 gameplay; exact complete existing resource block, no repacking; not a production delivery.',source:{file:source,sha256:sourceSha,payloadStart:start,payloadEndExclusive:end,payloadBytes:end-start,payloadSha256:payloadHash.digest('hex')},html:{file:output,bytes:(await fs.stat(output)).size,sha256:outputHash.digest('hex')},web:binding,manifestFile};await fs.writeFile(root+'/build-inputs.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.html));

