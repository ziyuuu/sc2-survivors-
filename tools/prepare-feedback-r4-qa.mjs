import fs from 'node:fs/promises';
import {build} from '../node_modules/esbuild/lib/main.js';
const previous='D:/星际/reports/local/integration-i03-20261022',base='D:/星际/reports/local/feedback-r4-20261022';
for(const name of ['build-web.mjs','assemble-offline.mjs','verify-offline.mts','qa-production.mjs','qa-touch.mjs']){
 let s=await fs.readFile(previous+'/'+name,'utf8');s=s.replaceAll('I03','R4').replaceAll('integration-i03-20261022','feedback-r4-20261022').replaceAll('4483','4484').replaceAll('local R4 reachability and effect fixes','local fourth-feedback interaction and pacing fixes');
 if(name==='build-web.mjs'){
  s=s.replace("const dest=out+'/'+url;await fs.mkdir(path.dirname(dest),{recursive:true});await fs.link(file,dest).catch(()=>fs.copyFile(file,dest));resources.set(url,{sha256:hash,bytes:bytes.length});", "resources.set(url,{sha256:hash,bytes:bytes.length,source:file});");
  s=s.replace('url,...resources.get(url),mime:', 'url,bytes:resources.get(url).bytes,sha256:resources.get(url).sha256,mime:');
 }
 await fs.writeFile(base+'/'+name,s);
}
const helper=await build({stdin:{contents:"import * as inventory from './src/simulation/starship/inventory';import * as special from './src/simulation/special-stages/runtime';import * as encounters from './src/simulation/encounters/expanded';import * as pacing from './src/simulation/field-events/pacing';import * as horde from './src/simulation/field-events/hordes';import * as economy from './src/simulation/expedition-economy';import * as equipment from './src/ui/starship/equipment-description';window.R4QA={inventory,special,encounters,pacing,horde,economy,equipment};",resolveDir:'D:/星际',loader:'ts'},bundle:true,format:'iife',outfile:base+'/qa-helper.js',metafile:true});
await fs.writeFile(base+'/qa-helper-inputs.json',JSON.stringify(helper.metafile.inputs,null,2));
console.log('Fourth-feedback QA builders and helper prepared; runtime assets are served from verified shared files.');
