import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
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
 // Also cover every delivered lockfile, helper and document, including package
 // changes made after a web build. Never overwrite an active release by ID.
 const packageBuildId=hash(Buffer.from(JSON.stringify([...delivery.appFiles].sort((a,b)=>a.path.localeCompare(b.path)))));
 const folder=path.join(root,'releases',packageBuildId),packageEntry=checked.find(([name])=>name==='package.json');
 const pkgDefinition=packageEntry?JSON.parse(packageEntry[1].toString('utf8')):{},dependencies=Object.keys(pkgDefinition.dependencies??{});
 if(dependencies.length&&!checked.some(([name])=>name==='package-lock.json'))throw Error('Production dependencies require a verified package-lock.json; current application unchanged');
 let existing=false;try{await fs.access(folder);existing=true;}catch{}
 if(!existing){
  const staging=path.join(root,'releases','.staging-'+randomUUID());await fs.mkdir(staging,{recursive:true});
  for(const [relative,b] of checked){const dest=path.join(staging,relative);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,b);}
  await fs.copyFile(path.join(app,'delivery.json'),path.join(staging,'delivery.json'));
  if(dependencies.length){
   // Invoke the Node CLI directly on Windows; avoid an extra command shell
   // retaining the staging directory as its current working directory.
   let command='npm',args=['ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'];
   if(process.platform==='win32'){const cli=process.env.npm_execpath?.endsWith('npm-cli.js')?process.env.npm_execpath:path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');await fs.access(cli);command=process.execPath;args=[cli,...args];}
   const result=spawnSync(command,args,{cwd:staging,encoding:'utf8'});
   if(result.status!==0)throw Error('Locked production dependency installation failed; current application unchanged; staging retained for diagnosis');
  }
  for(const candidate of [staging,folder]){const relative=path.relative(path.join(root,'releases'),candidate);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Release directory escaped intended root');}
  // Copy into the still-inactive immutable directory. Windows can keep npm's
  // directory handles alive after exit; activation relies on the pointer's
  // atomic rename, never on moving an installed node_modules tree.
  await fs.cp(staging,folder,{recursive:true,force:false,errorOnExist:true});
 }
 for(const [relative,b] of checked){if(hash(await fs.readFile(path.join(folder,relative)))!==hash(b))throw Error('Installed application verification failed: '+relative);}
 const requireFromRelease=createRequire(path.join(folder,'package.json'));
 for(const dependency of dependencies){const resolved=requireFromRelease.resolve(dependency),relative=path.relative(folder,resolved);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Production dependency is not installed inside the release: '+dependency);}
 // Bootstrap the stable launcher without changing environment files or unrelated scripts.
 const launcher=checked.find(([name])=>name==='start-coze.mjs');if(!launcher)throw Error('Missing release launcher');
 await fs.writeFile(path.join(root,'start-coze.mjs.next'),launcher[1]);await fs.rename(path.join(root,'start-coze.mjs.next'),path.join(root,'start-coze.mjs'));
 const packagePath=path.join(root,'package.json'),pkg=await fs.readFile(packagePath,'utf8').then(JSON.parse).catch(()=>({private:true,type:'module'}));pkg.scripts={...pkg.scripts,start:'node start-coze.mjs'};
 await fs.writeFile(packagePath+'.next',JSON.stringify(pkg,null,2));await fs.rename(packagePath+'.next',packagePath);
 const pointer=path.join(root,'active-release.json'),prior=await fs.readFile(pointer,'utf8').then(JSON.parse).catch(()=>null);
 const active={appBuildId:delivery.appBuildId,packageBuildId,release:delivery.release,directory:'releases/'+packageBuildId,assetRoot:assets,previous:prior?.directory==='releases/'+packageBuildId?(prior.previous??null):(prior?.directory??null)};
 await fs.writeFile(pointer+'.next',JSON.stringify(active,null,2));await fs.rename(pointer+'.next',pointer);
 return {appBuildId:delivery.appBuildId,packageBuildId,retained,installed,downloadedMissing:missing,productionDependencies:dependencies.length,restartRequired:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1];if(!args.includes('--app')||!args.includes('--root'))throw Error('Use --app <extracted app> --root <existing project> [--assets dir] [--resources extracted delta] [--commit SHA]');console.log(JSON.stringify(await applyUpdate({app:arg('--app'),root:arg('--root'),assets:args.includes('--assets')?arg('--assets'):undefined,resources:args.includes('--resources')?arg('--resources'):undefined,commit:args.includes('--commit')?arg('--commit'):undefined})));}
