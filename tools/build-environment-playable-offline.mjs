import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAssetPack} from './offline-pack.mjs';

const web=process.argv.find(a=>a.startsWith('--web='))?.slice(6)??'dist/MVP5-Full-Map-Main-20261014-R3';
const output=process.argv.find(a=>a.startsWith('--out='))?.slice(6)??'dist/SC2-Survivors-MVP5-Lifecycle-R1-20261014.html';
const reportPath=process.argv.find(a=>a.startsWith('--report='))?.slice(9)??'reports/local/mvp5-lifecycle-20261014/offline-build-r1.json';
assert.ok(output.startsWith('dist/SC2-Survivors-MVP5-')&&!output.includes('..'));
await fs.access(output).then(()=>{throw Error('Named HTML exists');},e=>{if(e.code!=='ENOENT')throw e;});
const sha=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const release=await read(web+'/web-release.json'),binding=await read(web+'/build-inputs.json'),manifest=await read(web+'/'+release.manifest);assert.equal(release.diagnostic,false);
for(const r of binding.builtFiles)assert.equal(sha(await fs.readFile(web+'/'+r.file)),r.sha256,r.file);
const resources=[];for(const [id,r] of Object.entries(manifest.assets)){const bytes=await fs.readFile('deploy/runtime/'+r.url);assert.equal(bytes.length,r.bytes);assert.equal(sha(bytes),r.sha256,id);resources.push({id,mime:r.mime,bytes});}
console.log('Packing '+resources.length+' exact resources');
const {pack,stats}=createAssetPack(resources),metadata={version:pack.version,container:'chunks-v1',assets:pack.assets,chunks:pack.chunks.map(({data,...meta})=>({...meta,data:''}))};
let index=await fs.readFile(web+'/index.html','utf8');
const scripts=[...index.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)],styles=[...index.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)];assert.equal(scripts.length,1);assert.equal(styles.length,1);
const scriptFile=scripts[0][1].replace(/^\.\//,''),styleFile=styles[0][1].replace(/^\.\//,''),js=await fs.readFile(path.join(web,scriptFile),'utf8'),css=await fs.readFile(path.join(web,styleFile),'utf8');
index=index.replace(scripts[0][0],'').replace(styles[0][0],'<style>'+css.replaceAll('</style','<\\/style')+'</style>').replace(/<meta name="sc2-asset-manifest"[^>]*>/,'');
assert.equal((index.match(/<\/body>/g)??[]).length,1);const [prefix,suffix]=index.split('</body>');
const hash=createHash('sha256'),handle=await fs.open(output,'wx');
try{const write=async value=>{const bytes=Buffer.from(value);await handle.writeFile(bytes);hash.update(bytes);};await write(prefix+'<script id="sc2-resource-pack" type="application/json">'+JSON.stringify(metadata)+'</script>');for(const [i,chunk] of pack.chunks.entries())await write(`<script type="application/json" data-sc2-resource-chunk="${i}">${JSON.stringify(chunk)}</script>`);await write('<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script></body>'+suffix);}finally{await handle.close();}
const html={path:output,bytes:(await fs.stat(output)).size,sha256:hash.digest('hex')},report={at:new Date().toISOString(),web,appBuildId:release.appBuildId,release:release.release,html,script:{file:scriptFile,sha256:sha(js)},style:{file:styleFile,sha256:sha(css)},inputs:binding.inputs,stats,method:'Exact formal Vite JavaScript and CSS inlined, production chunk pack and decoder, no debug/native-reference transform.'};await fs.writeFile(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify({...html,appBuildId:release.appBuildId,assets:stats.assets}));
