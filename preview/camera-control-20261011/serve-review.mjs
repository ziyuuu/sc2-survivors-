import {labServer} from './server.mjs';
const port=Number(process.argv[2]??4353),server=labServer('reports/local/camera-control-20261011');server.listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port+'/comparison-gallery.html'));
