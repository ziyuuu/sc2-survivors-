import {labServer} from './server.mjs';
const port=Number(process.argv[2]??4268);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid loopback review port');
labServer('reports/local/material-batch2-20261010').listen(port,'127.0.0.1',()=>console.log('Material comparison review: http://127.0.0.1:'+port+'/comparison-gallery.html'));
