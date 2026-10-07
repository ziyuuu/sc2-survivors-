import {createGameServer} from './coze-web-server.mjs';import path from 'node:path';
const port=Number(process.argv[2]??4192);
createGameServer({webRoot:path.resolve('dist/web')}).listen(port,'127.0.0.1',()=>console.log('Current verified game: http://127.0.0.1:'+port+'/'));
