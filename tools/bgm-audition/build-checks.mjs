/** Bounded BGM diagnostics. Instrumented game and small offline player are never release inputs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build as viteBuild} from 'vite';
import {build as bundle} from 'esbuild';
import {createAssetPack} from '../offline-pack.mjs';
import {packedLauncher} from '../packed-startup.mjs';
import {loadMusicAssets} from '../music-assets.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const root='reports/local/bgm-integration-20261029',out=root+'/site',packed='sites/size-optimized-site/public',raw='dist/runtime-lifecycle-20261028/final/web';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const packedInfo=await read(packed+'/web-release.json'),rawInfo=await read(raw+'/web-release.json');
const manifest=await read(packed+'/'+packedInfo.manifest),original=await read(raw+'/'+rawInfo.manifest),music=await loadMusicAssets();
const worker=await fs.readFile(packed+'/sites-sw.js','utf8'),index=(await fs.readdir(packed)).find(f=>/^sites-pack-index\.[a-f0-9]+\.js$/.test(f)&&worker.includes(f));
if(!index)throw Error('Missing active packed index');
await fs.mkdir(out+'/assets',{recursive:true});
const offline=[];
for(const row of music){
 const bytes=await fs.readFile(row.packedFile),url='assets/'+row.packedSha256+'.mp3';
 await fs.writeFile(out+'/'+url,bytes);manifest.assets[row.id]={url,sha256:row.packedSha256,bytes:row.bytes,mime:'audio/mpeg'};
 offline.push({id:row.id,mime:'audio/mpeg',bytes});
}
manifest.release=hash(JSON.stringify(manifest.assets));const manifestName='asset-manifest.'+manifest.release+'.json';
await fs.writeFile(out+'/'+manifestName,JSON.stringify(manifest));
await viteBuild({base:'./',publicDir:false,plugins:[{name:'bgm-lifecycle-fixture',enforce:'pre',transform(code,id){
 if(id.replaceAll('\\','/').endsWith('/src/main.ts'))return code.replace('startGame().catch(',
  `startGame(529).then(app=>{globalThis.__BGM_APP__=app;globalThis.__BGM_INTERMISSION__=()=>{app.readiness.background.tick=()=>{};app.view.render=()=>{};app.world.start();app.world.paused=true;app.world.endStage();app.world.changed();};}).catch(`);
 }}],build:{outDir:out+'/build',emptyOutDir:true,minify:true,target:'es2022'}});
const html=await fs.readFile(out+'/build/index.html','utf8'),entry=html.match(/src="\.\/([^" ]+\.js)"/)[1],css=html.match(/href="\.\/([^" ]+\.css)"/)[1];
let code=await fs.readFile(out+'/build/'+entry,'utf8');
for(const [id,row]of Object.entries(original.assets))if(row.mime==='model/gltf-binary')code=code.replaceAll(row.sha256,manifest.assets[id].sha256);
const bytes=gzipSync(code),entryHash=hash(bytes),name='bgm.'+entryHash.slice(0,16)+'.js.gz';
await fs.writeFile(out+'/assets/'+name,bytes);await fs.copyFile(out+'/build/'+css,out+'/'+css);
await fs.writeFile(out+'/assets/bgm-launcher.js',packedLauncher(name,index).replace("scope:'../'","scope:new URL('../',import.meta.url).href"));
const production=await fs.readFile(packed+'/index.html','utf8');
await fs.writeFile(out+'/index.html',production.replace(packedInfo.manifest,manifestName)
 .replace(/src="\.\/assets\/index-[^"]+\.js"/,'src="./assets/bgm-launcher.js"').replace(/href="\.\/assets\/index-[^"]+\.css"/,'href="./'+css+'"'));
await fs.writeFile(out+'/web-release.json',JSON.stringify({...packedInfo,release:manifest.release,manifest:manifestName,diagnostic:true}));

const player=`import {AudioEffects} from './src/render/effects/audio';
import {bindBackgroundMusic} from './src/render/effects/background-music';
import {loadEmbeddedAssets,embeddedAssetStatus} from './src/assets/offline-pack';
loadEmbeddedAssets().then(()=>{const audio=new AudioEffects();audio.music.setPhase('menu');bindBackgroundMusic(audio.music);
 document.getElementById('interface').innerHTML='<h1>BGM 本机离线检测</h1><button data-phase="menu">菜单</button><button data-phase="reward">关间</button><button data-phase="battle">战斗</button><label>背景音乐<input type="range" min="0" max="100" value="15"></label>';
 for(const button of document.querySelectorAll('button'))button.onclick=()=>audio.music.setPhase(button.dataset.phase);
 document.querySelector('input').oninput=e=>audio.setMix(1,1,.25,Number(e.target.value)/100);
 globalThis.__BGM_AUDIO__=audio;globalThis.__BGM_REPORT__=()=>({audio:audio.report(),embedded:embeddedAssetStatus()});
}).catch(e=>{document.body.textContent=String(e);throw e;});`;
const bundled=await bundle({stdin:{contents:player,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,write:false,define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true','import.meta.url':'document.baseURI'}});
const {pack,stats}=createAssetPack(offline);
await fs.writeFile(root+'/offline-music.html','<!doctype html><meta charset="utf-8"><title>BGM Offline Check</title><main id="interface"></main><script id="sc2-resource-pack" type="application/json">'+JSON.stringify(pack)+'</script><script>'+bundled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
await fs.writeFile(root+'/checks-build.json',JSON.stringify({entryHash,packedBaseApp:packedInfo.appBuildId,manifest:manifestName,tracks:music.map(({id,bytes,packedSha256})=>({id,bytes,packedSha256})),offline:{assets:stats.assets,rawBytes:stats.rawBytes,encodedBytes:stats.encodedBytes},scope:'Production menu/settings + injected phase fixture; standalone offline music player using production asset loader and mixer'},null,2));
console.log(JSON.stringify({out,entryHash,offlineBytes:(await fs.stat(root+'/offline-music.html')).size}));
