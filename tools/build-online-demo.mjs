import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const remote=execFileSync('git',['remote','get-url','origin'],{encoding:'utf8'}).trim();
const repo=/^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/.exec(remote)?.[1];
if(!repo||!/^[a-f0-9]{40}$/.test(revision))throw Error('Expected the existing GitHub distribution repository and a pinned commit');
const release=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
const manifest=JSON.parse(await fs.readFile('dist/web/'+release.manifest,'utf8'));
const base=`https://media.githubusercontent.com/media/${repo}/${revision}/deploy/runtime/`;
const marker='sc2-inline-assets-'+manifest.release+'.json';
const result=await build({entryPoints:['src/main.ts'],bundle:true,format:'iife',target:'es2022',minify:true,write:false,outfile:'online.js',define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'}});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script'),css=result.outputFiles.find(f=>f.path.endsWith('.css'))?.text??'';
// Inline the two tiny local configuration responses. All resource requests still
// use the production HTTP store, hash verification and persistent content cache.
const adapter=`(()=>{const config=JSON.parse(document.getElementById('http-inline').textContent),nativeFetch=window.fetch.bind(window),local=new Map([[new URL(${JSON.stringify(marker)},location.href).href,config.manifest],[new URL('runtime-config.json',location.href).href,{assetBaseUrl:config.base}]]);window.fetch=(input,init)=>{const url=input instanceof Request?input.url:new URL(String(input),location.href).href;return local.has(url)?Promise.resolve(new Response(JSON.stringify(local.get(url)),{status:200,headers:{'Content-Type':'application/json'}})):nativeFetch(input,init);};})();`;
const payload=JSON.stringify({manifest,base}).replaceAll('<','\\u003c');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="sc2-asset-manifest" content="${marker}"><title>星际幸存小队 · 六英雄普攻强化 · 联网版</title><style>${css}</style></head><body><div id="game-root"><canvas id="battle" aria-label="星际幸存小队战场"></canvas><main id="interface"></main></div><script id="http-inline" type="application/json">${payload}</script><script>${adapter}</script><script>${js}</script></body></html>`;
const output='dist/SC2-Survivors-Online.html';await fs.writeFile(output,html);
const report={output,bytes:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex'),revision,base,release:manifest.release,appBuildId:release.appBuildId,scope:'Full production game; first use requires internet for pinned original resources, content-hash cache unchanged; no debug API'};
await fs.writeFile('reports/local/hero-basic-online.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
