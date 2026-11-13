import {createServer} from 'vite';
// Limit dependency discovery to this entry; hot reload must not interrupt a replay.
const server=await createServer({server:{host:'127.0.0.1',port:5196,strictPort:true,hmr:false},optimizeDeps:{entries:['preview/armed-support-showcase-20261111/index.html']}});
await server.listen();server.printUrls();
