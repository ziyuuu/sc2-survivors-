import fs from 'node:fs/promises';
import path from 'node:path';
import {createGameServer} from './coze-web-server.mjs';

const web=process.argv.find(a=>a.startsWith('--web='))?.slice(6)??'dist/MVP1-Building-Main-20261013-R4-Frozen';
const port=Number(process.argv.find(a=>a.startsWith('--port='))?.slice(7)??0);
if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid local port');
const server=createGameServer({webRoot:path.resolve(web),assetRoot:path.resolve('deploy/runtime'),backendOptions:{config:{enabled:false}}});
await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
const release=JSON.parse(await fs.readFile(web+'/web-release.json','utf8'));
const status={at:new Date().toISOString(),pid:process.pid,url:'http://127.0.0.1:'+server.address().port,web,appBuildId:release.appBuildId,backendEnabled:false,scope:'Local building integration review with accepted scene baseline; no production service or publication.'};
await fs.writeFile('reports/local/mvp1-building-main-20261013/local-review-server.json',JSON.stringify(status,null,2));
console.log(JSON.stringify(status));
