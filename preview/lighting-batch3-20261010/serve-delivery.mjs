// Serve the verified repository mirror on loopback with the backend disabled.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createGameServer} from '../../deploy/coze/coze-web-server.mjs';

const port=Number(process.argv[2]??4296);
assert.ok(Number.isInteger(port)&&port>=1024&&port<=65535,'Invalid local preview port');
const app=JSON.parse(await fs.readFile('dist/Lighting-Batch3-Final-Application-20261010/delivery.json','utf8'));
const mirror=JSON.parse(await fs.readFile('deploy/coze/delivery.json','utf8'));
assert.deepEqual(mirror,app,'Repository mirror must match the final delivery');
const server=createGameServer({webRoot:path.resolve('deploy/coze/public'),assetRoot:path.resolve('deploy/runtime'),backendOptions:{config:{enabled:false}}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
const url='http://127.0.0.1:'+port;
const health=await (await fetch(url+'/health')).json(),config=await (await fetch(url+'/api/config')).json();
assert.equal(health.appBuildId,app.appBuildId);assert.equal(config.enabled,false);assert.equal(server.backend.repository,undefined);
const report={at:new Date().toISOString(),url,pid:process.pid,health,backendEnabled:config.enabled,localOnly:true,webRoot:'deploy/coze/public',assetRoot:'deploy/runtime',packageBuildId:app.packageBuildId};
await fs.writeFile('reports/local/lighting-batch3-20261010/preview-final.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
