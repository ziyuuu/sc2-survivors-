import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [origin,inventoryFile,reportFile]=process.argv.slice(2),entries=Object.entries(JSON.parse(await fs.readFile(inventoryFile,'utf8')));
let cursor=0;const failed=[],groups=new Map();
await Promise.all(Array.from({length:4},async()=>{for(;;){const i=cursor++;if(i>=entries.length)return;const [name,e]=entries[i];try{const r=await fetch(origin+'/assets/'+name,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);assert.equal(Number(r.headers.get('content-length')),e.bytes);assert.equal(r.headers.get('etag'),'"'+e.sha256+'"');const group=/^bundle-\d/.test(name)?'legacy':name.split('-')[1];if(!groups.has(group))groups.set(group,[name,e]);}catch(error){failed.push({name,error:String(error)});}}}));
const samples=[];
for(const [group,[name,e]]of groups){const r=await fetch(origin+'/assets/'+name,{redirect:'error',signal:AbortSignal.timeout(60000)});assert.equal(r.status,200);const data=Buffer.from(await r.arrayBuffer());assert.equal(data.length,e.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),e.sha256);samples.push({group,name,bytes:e.bytes,sha256:e.sha256});}
const closed=await fetch(origin+'/api/_delivery-assets/'+entries[0][0],{method:'PUT',body:'closed-endpoint-probe',redirect:'error'});assert.equal(closed.status,403);
const result={headChecked:entries.length,failed,samples,uploadEndpointStatus:closed.status};await fs.writeFile(reportFile,JSON.stringify(result,null,2));console.log(JSON.stringify({headChecked:entries.length,failed:failed.length,fullHashSamples:samples.length,uploadEndpointStatus:closed.status}));assert.deepEqual(failed,[]);
