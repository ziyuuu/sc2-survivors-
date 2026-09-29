import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
const safe=p=>typeof p==='string'&&!path.isAbsolute(p)&&!p.split(/[\\/]/).includes('..')&&!p.includes(':');
export async function applyUpdate({app,root,assets,resources,commit}){
 app=path.resolve(app);root=path.resolve(root);assets=path.resolve(assets??path.join(root,'public'));resources=resources?path.resolve(resources):null;
 const delivery=JSON.parse(await fs.readFile(path.join(app,'delivery.json'),'utf8'));
 if(!/^[a-f0-9]{64}$/.test(delivery.appBuildId)||!Array.isArray(delivery.appFiles)||!delivery.appFiles.length)throw Error('Update requires a checksummed application manifest');
 const release=JSON.parse(await fs.readFile(path.join(app,'public/web-release.json'),'utf8'));
 if(release.appBuildId!==delivery.appBuildId||release.release!==delivery.release||!safe(release.manifest))throw Error('Application/release mismatch');
 const manifest=JSON.parse(await fs.readFile(path.join(app,'public',release.manifest),'utf8'));
 const rows=[...new Map(Object.values(manifest.assets).map(a=>[a.sha256,a])).values()];
 let retained=0,installed=0,missing=0;
 for(const a of rows){if(!/^assets\/[a-f0-9]{64}\.[a-z0-9]+$/.test(a.url)||!Number.isSafeInteger(a.bytes))throw Error('Invalid resource path');const valid=b=>b&&b.length===a.bytes&&hash(b)===a.sha256;const dest=path.join(assets,a.url),existing=await fs.readFile(dest).catch(()=>null);if(valid(existing)){retained++;continue;}const patch=resources?await fs.readFile(path.join(resources,a.url)).catch(()=>null):null;if(valid(patch)){await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest+'.verified-update',patch);await fs.rename(dest+'.verified-update',dest);installed++;}else missing++;}
 if(missing){if(!/^[a-f0-9]{40}$/.test(commit??''))throw Error(`${missing} resources missing; supply --commit with the target full SHA to fetch only missing files`);const result=spawnSync(process.execPath,[path.join(app,'fetch-resources.mjs'),'--commit',commit,'--group','all','--out',assets,'--resources-only'],{stdio:'inherit'});if(result.status!==0)throw Error('Resource fetch failed; current application unchanged');}
 // Independently verify completeness before ever changing the active application.
 for(const a of rows){const b=await fs.readFile(path.join(assets,a.url));if(b.length!==a.bytes||hash(b)!==a.sha256)throw Error('Resource verification failed: '+a.url);}
 const checked=[];for(const f of delivery.appFiles){if(!safe(f.path)||f.path==='delivery.json')throw Error('Unsafe application path');const b=await fs.readFile(path.join(app,f.path));if(b.length!==f.bytes||hash(b)!==f.sha256)throw Error('Application verification failed: '+f.path);checked.push([f.path,b]);}
 const folder=path.join(root,'releases',delivery.appBuildId);await fs.mkdir(folder,{recursive:true});
 for(const [relative,b] of checked){const dest=path.join(folder,relative);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,b);}
 await fs.copyFile(path.join(app,'delivery.json'),path.join(folder,'delivery.json'));
 // Bootstrap the stable launcher without changing environment files or unrelated scripts.
 const launcher=checked.find(([name])=>name==='start-coze.mjs');if(!launcher)throw Error('Missing release launcher');
 await fs.writeFile(path.join(root,'start-coze.mjs.next'),launcher[1]);await fs.rename(path.join(root,'start-coze.mjs.next'),path.join(root,'start-coze.mjs'));
 const packagePath=path.join(root,'package.json'),pkg=await fs.readFile(packagePath,'utf8').then(JSON.parse).catch(()=>({private:true,type:'module'}));pkg.scripts={...pkg.scripts,start:'node start-coze.mjs'};
 await fs.writeFile(packagePath+'.next',JSON.stringify(pkg,null,2));await fs.rename(packagePath+'.next',packagePath);
 const pointer=path.join(root,'active-release.json'),prior=await fs.readFile(pointer,'utf8').then(JSON.parse).catch(()=>null);
 const active={appBuildId:delivery.appBuildId,release:delivery.release,directory:'releases/'+delivery.appBuildId,assetRoot:assets,previous:prior?.appBuildId===delivery.appBuildId?(prior.previous??null):(prior?.directory??null)};
 await fs.writeFile(pointer+'.next',JSON.stringify(active,null,2));await fs.rename(pointer+'.next',pointer);
 return {appBuildId:delivery.appBuildId,retained,installed,downloadedMissing:missing,restartRequired:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1];if(!args.includes('--app')||!args.includes('--root'))throw Error('Use --app <extracted app> --root <existing project> [--assets dir] [--resources extracted delta] [--commit SHA]');console.log(JSON.stringify(await applyUpdate({app:arg('--app'),root:arg('--root'),assets:args.includes('--assets')?arg('--assets'):undefined,resources:args.includes('--resources')?arg('--resources'):undefined,commit:args.includes('--commit')?arg('--commit'):undefined})));}
