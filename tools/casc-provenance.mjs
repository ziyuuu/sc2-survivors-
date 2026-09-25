import {localSourceFile} from './local-source-cache.mjs';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const targets=JSON.parse(fs.readFileSync(new URL('./sc2-casc-targets.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
const lock=JSON.parse(fs.readFileSync(new URL('./sc2-casc-lock.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
try{targets.push(...JSON.parse(fs.readFileSync(new URL('./expansion-dependencies.json',import.meta.url),'utf8').replace(/^\uFEFF/,'')));}catch{}
try{targets.push(...JSON.parse(fs.readFileSync(new URL('./three-race-dependencies.json',import.meta.url),'utf8').replace(/^\uFEFF/,'')));}catch{}
try{targets.push(...JSON.parse(fs.readFileSync(new URL('./three-race-additional-dependencies.json',import.meta.url),'utf8').replace(/^\uFEFF/,'')));}catch{}
try{targets.push(...JSON.parse(fs.readFileSync(new URL('./three-race-animation-dependencies.json',import.meta.url),'utf8').replace(/^\uFEFF/,'')));}catch{}
try{targets.push(...JSON.parse(fs.readFileSync(new URL('./three-race-icon-dependencies.json',import.meta.url),'utf8').replace(/^\uFEFF/,'')));}catch{}
try{targets.push(...JSON.parse(fs.readFileSync(new URL('./m5-air-icon-dependencies.json',import.meta.url),'utf8').replace(/^\uFEFF/,'')));}catch{}
try{targets.push(...JSON.parse(fs.readFileSync(new URL('./m3-fort-dependencies.json',import.meta.url),'utf8').replace(/^\uFEFF/,'')));}catch{}
const mapRecords=JSON.parse(fs.readFileSync(new URL('./map-dependencies.json',import.meta.url),'utf8')).filter(r=>r.verifiedCascBuild).map(r=>({...r,file:r.installFile,version:lock.version,buildConfig:lock.buildConfig}));
/** Attribute cached bytes to CASC only when they match the pinned original content hash. */
export function cascProvenance(file,bytes){
 const target=targets.find(t=>t.installFile.toLowerCase()===file.replaceAll('\\','/').toLowerCase());if(!target){const name=file.replaceAll('\\','/').split('/').at(-1).toLowerCase();try{bytes??=fs.readFileSync(localSourceFile(file));const digest=createHash('sha256').update(bytes).digest('hex'),record=mapRecords.find(r=>r.file.replaceAll('\\','/').split('/').at(-1).toLowerCase()===name&&r.sha256===digest);if(record)return {source:`https://${lock.host}/${lock.cdnPath}/config/${record.buildConfig.slice(0,2)}/${record.buildConfig.slice(2,4)}/${record.buildConfig}`,sourcePath:record.sourcePath,sourceBuild:record.version,sourceTransport:'CASC public CDN',sourceSha256:digest};}catch{}return {};}
 try{bytes??=fs.readFileSync(localSourceFile(file));if(createHash('sha256').update(bytes).digest('hex')!==target.sha256)return {};}catch{return {};}
 return {source:`https://${lock.host}/${lock.cdnPath}/config/${lock.buildConfig.slice(0,2)}/${lock.buildConfig.slice(2,4)}/${lock.buildConfig}`,sourcePath:target.sourcePath,sourceBuild:lock.version,sourceTransport:'CASC public CDN',sourceSha256:target.sha256};
}
