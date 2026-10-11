import {labServer} from './server.mjs';
const port=Number(process.argv[2]??4313);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid loopback port');
labServer('reports/local/terrain-batch4-20261011').listen(port,'127.0.0.1',()=>console.log('Terrain comparison: http://127.0.0.1:'+port+'/comparison-gallery.html'));
