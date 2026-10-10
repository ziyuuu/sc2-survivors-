import {labServer} from './server.mjs';
const port=Number(process.argv[2]??4272);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid loopback review port');
labServer('reports/local/lighting-batch3-20261010').listen(port,'127.0.0.1',()=>console.log('Lighting comparison review: http://127.0.0.1:'+port+'/comparison-gallery.html'));
