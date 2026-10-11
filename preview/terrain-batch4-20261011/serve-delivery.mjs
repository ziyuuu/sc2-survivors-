// Local repository mirror, only after verified final delivery, backend disabled.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createGameServer} from '../../deploy/coze/coze-web-server.mjs';
const port=Number(process.argv[2]??4316);assert.ok(Number.isInteger(port)&&port>=1024&&port<=65535);
const app=JSON.parse(await fs.readFile('dist/Terrain-Batch4-Final-Application-20261011/delivery.json','utf8')),mirror=JSON.parse(await fs.readFile('deploy/coze/delivery.json','utf8'));
assert.deepEqual(mirror,app);
const server=createGameServer({webRoot:path.resolve('deploy/coze/public'),assetRoot:path.resolve('deploy/runtime'),backendOptions:{config:{enabled:false}}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
const url='http://127.0.0.1:'+port,health=await(await fetch(url+'/health')).json(),config=await(await fetch(url+'/api/config')).json();
assert.equal(health.appBuildId,app.appBuildId);assert.equal(config.enabled,false);assert.equal(server.backend.repository,undefined);
const report={at:new Date().toISOString(),url,pid:process.pid,health,backendEnabled:false,localOnly:true,webRoot:'deploy/coze/public',assetRoot:'deploy/runtime',packageBuildId:app.packageBuildId};
await fs.writeFile('reports/local/terrain-batch4-20261011/preview-final.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
