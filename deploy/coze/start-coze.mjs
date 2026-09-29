import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const home=path.dirname(fileURLToPath(import.meta.url)),pointer=path.join(home,'active-release.json');
let app=home,resourceRoot=process.env.ASSET_ROOT||path.join(home,'public');
if(fs.existsSync(pointer)){const active=JSON.parse(fs.readFileSync(pointer,'utf8'));if(!/^releases\/[a-f0-9]{64}$/.test(active.directory))throw Error('Invalid active release');app=path.join(home,active.directory);resourceRoot=process.env.ASSET_ROOT||active.assetRoot;}
const {createGameServer}=await import(pathToFileURL(path.join(app,'coze-web-server.mjs')).href);
const port=Number(process.env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
createGameServer({webRoot:fs.existsSync(pointer)?path.join(app,'public'):process.env.WEB_ROOT||path.join(app,'public'),assetRoot:resourceRoot,assetBaseUrl:process.env.ASSET_BASE_URL||''}).listen(port,'0.0.0.0',()=>console.log('SC2 ready on '+port));
