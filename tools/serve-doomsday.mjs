import {createServer} from 'vite';
const port=Number(process.env.SC2_SHOWCASE_PORT??5199);
const server=await createServer({server:{host:'127.0.0.1',port,strictPort:true,hmr:false},optimizeDeps:{entries:['preview/doomsday-showcase-20261117/index.html']}});
await server.listen();console.log(`末日兵器 45 张：http://127.0.0.1:${port}/preview/doomsday-showcase-20261117/`);
