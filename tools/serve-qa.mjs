import {createServer} from 'vite';
// Stable source QA: concurrent builds/documentation must not reload a test page.
const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true,watch:null,hmr:false}});
await server.listen();server.printUrls();
