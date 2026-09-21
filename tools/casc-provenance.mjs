import fs from 'node:fs';
import {createHash} from 'node:crypto';
const targets=JSON.parse(fs.readFileSync(new URL('./sc2-casc-targets.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
const lock=JSON.parse(fs.readFileSync(new URL('./sc2-casc-lock.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
/** Attribute cached bytes to CASC only when they match the pinned original content hash. */
export function cascProvenance(file,bytes){
 const target=targets.find(t=>t.installFile.toLowerCase()===file.replaceAll('\\','/').toLowerCase());if(!target)return {};
 try{bytes??=fs.readFileSync(file);if(createHash('sha256').update(bytes).digest('hex')!==target.sha256)return {};}catch{return {};}
 return {source:`https://${lock.host}/${lock.cdnPath}/config/${lock.buildConfig.slice(0,2)}/${lock.buildConfig.slice(2,4)}/${lock.buildConfig}`,sourcePath:target.sourcePath,sourceBuild:lock.version,sourceTransport:'CASC public CDN',sourceSha256:target.sha256};
}
