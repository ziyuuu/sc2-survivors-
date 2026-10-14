import path from 'node:path';
import {createGameServer} from './coze-web-server.mjs';

// Local review only. No online backend or account/database configuration.
const webRoot=path.resolve('dist/MVP5-Full-Map-Main-20261014-R3');
const server=createGameServer({webRoot,assetRoot:path.resolve('deploy/runtime'),backendOptions:{config:{enabled:false}}});
server.listen(4373,'127.0.0.1',()=>console.log('Five-map playable review: http://127.0.0.1:4373'));
