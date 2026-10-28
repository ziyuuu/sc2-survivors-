import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [origin,inventory,output]=process.argv.slice(2),expected=JSON.parse(await fs.readFile(inventory,'utf8'));
const get=url=>fetch(origin+'/'+url,{redirect:'error',signal:AbortSignal.timeout(60000)});
const response=await get('web-release.json');assert.equal(response.status,200);const release=await response.json();assert.equal(release.appBuildId,expected.appBuildId);assert.equal(release.release,expected.resourceRelease);
const checked=[];
for(const row of expected.files){
 if(['index.html','web-release.json'].includes(row.name))continue;
 const r=await get(row.name);assert.equal(r.status,200,row.name);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.length,row.bytes,row.name);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.name);checked.push(row.name);
}
const manage=await get('manage');assert.equal(manage.status,403);
const closed=await fetch(origin+'/api/_delivery-assets/bundle-000.bin',{method:'PUT',body:'closed-endpoint-probe',redirect:'error'});assert.equal(closed.status,403);
const result={appBuildId:release.appBuildId,resourceRelease:release.release,checkedFiles:checked,unauthenticatedManageStatus:manage.status,closedUploadStatus:closed.status};await fs.writeFile(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
