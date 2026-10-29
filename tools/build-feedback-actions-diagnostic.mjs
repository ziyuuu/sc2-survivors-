/** Local UI fixture only. This instrumented entry is never a deployment input. */
import {build} from 'vite';
import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {packedLauncher} from './packed-startup.mjs';
const out='reports/local/feedback-actions-20261029/site',packed='sites/size-optimized-site/public',raw='dist/runtime-lifecycle-20261028/final/web';
const rawInfo=JSON.parse(await fs.readFile(raw+'/web-release.json','utf8')),packedInfo=JSON.parse(await fs.readFile(packed+'/web-release.json','utf8'));
const original=JSON.parse(await fs.readFile(raw+'/'+rawInfo.manifest,'utf8')),compressed=JSON.parse(await fs.readFile(packed+'/'+packedInfo.manifest,'utf8'));
const worker=await fs.readFile(packed+'/sites-sw.js','utf8'),index=(await fs.readdir(packed)).find(f=>/^sites-pack-index\.[a-f0-9]+\.js$/.test(f)&&worker.includes(f));if(!index)throw Error('Missing packed index');
await fs.mkdir(out+'/assets',{recursive:true});
const fixture=`import {grantEquipment} from './simulation/starship/inventory';
import {ATTRIBUTE_SLOTS} from './simulation/starship/types';
startGame(529).then(app=>{globalThis.__FEEDBACK_APP__=app;globalThis.__FEEDBACK_FIXTURE__=()=>{
 const w=app.world,a=w.starship.account;app.readiness.background.tick=()=>{};app.view.render=()=>{};
 const grant=(slot,template,polluted=false)=>{const r=grantEquipment(a,{template,race:'terran',slot,polluted},'feedback:'+a.serial,a.run&&!a.run.ended?{kind:'backpack',run:a.run.id}:{kind:'warehouse'});if(!r.ok)throw Error(r.error);return r.value;};
 const old=grant('offense1','attribute.1'),set=grant('defense3','set.orange.elite.4'),module=grant('control','module.control.1');for(const i of [old,set,module]){const r=w.equipItem(i.id,i.slot);if(!r.ok)throw Error(r.error);}
 w.start();w.paused=true;const items=Array.from({length:40},(_,n)=>grant(ATTRIBUTE_SLOTS[n%8],'attribute.'+(n%4+1),n===18));
 const bagSet=grant('offense4','set.orange.elite.4');app.session.management.locked.add(items[0].id);app.session.management.favorites.add(items[1].id);a.run.locked.add(items[2].id);app.session.management.revision++;
 w.endStage();w.wallet={minerals:100000,gas:100000};w.changed();return {old:old.id,set:set.id,module:module.id,tainted:items[18].id,bagSet:bagSet.id,protected:items.slice(0,3).map(i=>i.id),count:items.length+1};
 };}).catch(`;
await build({base:'./',publicDir:false,plugins:[{name:'feedback-actions-fixture',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/main.ts'))return code.replace('startGame().catch(',fixture);}}],build:{outDir:out+'/build',emptyOutDir:true,minify:true,target:'es2022'}});
const html=await fs.readFile(out+'/build/index.html','utf8'),entry=html.match(/src="\.\/([^" ]+\.js)"/)[1],css=html.match(/href="\.\/([^" ]+\.css)"/)[1];let code=await fs.readFile(out+'/build/'+entry,'utf8');
for(const [id,row]of Object.entries(original.assets))if(row.mime==='model/gltf-binary')code=code.replaceAll(row.sha256,compressed.assets[id].sha256);
const bytes=gzipSync(code),sha=createHash('sha256').update(bytes).digest('hex'),name='feedback.'+sha.slice(0,16)+'.js.gz';await fs.writeFile(out+'/assets/'+name,bytes);await fs.copyFile(out+'/build/'+css,out+'/'+css);await fs.writeFile(out+'/assets/feedback-launcher.js',packedLauncher(name,index).replace("scope:'../'","scope:new URL('../',import.meta.url).href"));
const production=await fs.readFile(packed+'/index.html','utf8');await fs.writeFile(out+'/index.html',production.replace(/src="\.\/assets\/index-[^"]+\.js"/,'src="./assets/feedback-launcher.js"').replace(/href="\.\/assets\/index-[^"]+\.css"/,'href="./'+css+'"'));
await fs.writeFile(out+'/diagnostic-build.json',JSON.stringify({sha,packedManifest:packedInfo.manifest,seed:529,scope:'Normal menu, injected bounded equipment/intermission UI fixture; not deployment'},null,2));console.log('Feedback UI diagnostic '+sha);
