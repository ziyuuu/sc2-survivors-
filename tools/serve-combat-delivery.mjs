import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createGameServer} from './coze-web-server.mjs';import {labServer} from '../preview/camera-control-20261011/server.mjs';
const root='reports/local/combat-effects-20261012',delivery=JSON.parse(await fs.readFile(root+'/delivery.json','utf8'));
assert.ok(delivery.passed&&delivery.current.identical&&delivery.localMirror.identical);
const game=createGameServer({webRoot:path.resolve('deploy/coze/public'),assetRoot:path.resolve('deploy/runtime'),backendOptions:{config:{enabled:false}}}),gallery=labServer(root);
await new Promise(r=>game.listen(4390,'127.0.0.1',r));await new Promise(r=>gallery.listen(4391,'127.0.0.1',r));
console.log(JSON.stringify({pid:process.pid,appBuildId:delivery.appBuildId,backendEnabled:false,game:'http://127.0.0.1:4390',gallery:'http://127.0.0.1:4391/comparison.html'}));
