import {createReadStream,existsSync,readFileSync,statSync} from 'node:fs';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {createGzip} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,extname,relative,isAbsolute} from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
export function createGameServer({webRoot,assetRoot=webRoot,assetBaseUrl=''}={}){
 const root=resolve(webRoot),resources=resolve(assetRoot),report=JSON.parse(readFileSync(resolve(root,'web-release.json'),'utf8'));
 const manifest=JSON.parse(readFileSync(resolve(root,report.manifest),'utf8'));
 if(manifest.version!==1||manifest.release!==report.release)throw Error('Release manifest does not match app');
 if(assetBaseUrl&&!/^https?:\/\//.test(assetBaseUrl))throw Error('ASSET_BASE_URL must be an HTTP(S) resource directory');
 if(!assetBaseUrl)for(const a of new Map(Object.values(manifest.assets).map(a=>[a.url,a])).values()){
  if(!/^assets\/[a-f0-9]{64}\.[a-z0-9]+$/.test(a.url))throw Error('Unsafe resource URL');
  const bytes=readFileSync(resolve(resources,a.url));if(bytes.length!==a.bytes||createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw Error('Missing or corrupt resource: '+a.url);
 }
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav'};
 return createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Timing-Allow-Origin','*');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS'});res.end();return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  if(name==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,appBuildId:report.appBuildId,assetReleaseId:report.release,runSchema:report.runSchema,release:report.release,resources:assetBaseUrl?'external':'local'}));return;}
  if(name==='/runtime-config.json'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({assetBaseUrl}));return;}
  if(name==='/')name='/index.html';const base=/^\/assets\/[a-f0-9]{64}\./.test(name)?resources:root,file=resolve(base,'.'+name),rel=relative(base,file);
  if(rel.startsWith('..')||isAbsolute(rel)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  const stat=statSync(file),etag='"'+stat.size+'-'+stat.mtimeMs+'"',immutable=/\/[a-f0-9]{64}\./.test(name)||/\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(name);
  res.setHeader('Cache-Control',immutable?'public, max-age=31536000, immutable':'no-cache');res.setHeader('ETag',etag);res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.setHeader('Vary','Accept-Encoding');
  if(req.headers['if-none-match']===etag){res.writeHead(304);res.end();return;}
  const zipped=/\bgzip\b/.test(req.headers['accept-encoding']??'')&&['.html','.js','.css','.json','.gltf','.glb'].includes(extname(file));
  if(zipped)res.setHeader('Content-Encoding','gzip');else res.setHeader('Content-Length',stat.size);
  res.writeHead(200);if(req.method==='HEAD'){res.end();return;}
  const stream=createReadStream(file);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());if(zipped)stream.pipe(createGzip({level:1})).pipe(res);else stream.pipe(res);
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const webRoot=process.env.WEB_ROOT?resolve(process.env.WEB_ROOT):existsSync(resolve(here,'public/index.html'))?resolve(here,'public'):resolve(here,'../dist/web');
 const port=Number(process.env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
 createGameServer({webRoot,assetRoot:process.env.ASSET_ROOT?resolve(process.env.ASSET_ROOT):webRoot,assetBaseUrl:process.env.ASSET_BASE_URL||''}).listen(port,'0.0.0.0',()=>console.log('SC2 Web ready on '+port));
}
