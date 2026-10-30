import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

// User-requested screen recording. Reuses the native World/BattleRenderer lab;
// only its diagnostic input is stationary. Production files stay untouched.
const followup=process.argv.includes('--followup');
const work=path.resolve(followup?'reports/local/tank-recording-followup-20261030':'reports/local/tank-recording-20261030'),web=path.join(work,'web'),delivery=path.resolve('dist/tank-effects-20261030');
await fs.mkdir(web,{recursive:true});await fs.mkdir(delivery,{recursive:true});
const release=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
await fs.copyFile(path.join('dist/web',release.manifest),path.join(web,'asset-manifest.json'));
const entryPath='preview/combat-effects-20261012/main.ts';
const entry=(await fs.readFile(entryPath,'utf8')).replace('s.world.input={x:Math.sin(elapsed*.4)*.5,z:Math.cos(elapsed*.4)*.5};','s.world.input={x:0,z:0};').replace('await load();}catch','await load(\'tank\');}catch')
 .replace('const allGroups=[...groups,...modeGroups,...enemyGroups,...densityGroups,...actorGroups];',"const allGroups=[...groups,...modeGroups,...enemyGroups,...densityGroups,...actorGroups].map(g=>g.id==='tank'?{...g,identities:g.identities.filter(i=>i.kind==='ordinary')}:g);")
 .replace('r.render(dt,alpha);if(elapsed>=nextSample)','r.render(dt,alpha);observe();if(elapsed>=nextSample)')
 + "\n(window as any).tankFrame=()=>{s.world.anchor.z=-2.5;(r as any).cameraTarget.set(0,r.ground({x:0,z:-2.5}),-2.5);return controls(50,1.2,'hidden');};\n";
const built=await build({stdin:{contents:entry,resolveDir:path.resolve('preview/combat-effects-20261012'),sourcefile:'tank-recording-entry.ts',loader:'ts'},outfile:path.join(web,'app.js'),bundle:true,format:'esm',target:'es2022',minify:true,metafile:true,define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'}});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),inputs=[];
for(const file of Object.keys(built.metafile.inputs).filter(f=>!f.includes('tank-recording-entry'))){inputs.push({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')});}
await fs.writeFile(path.join(web,'build.json'),JSON.stringify({head,release:release.release,entryPath,inputs}));
await fs.writeFile(path.join(web,'index.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#171d20}canvas{display:block;width:100%;height:100%}#status{display:none}#label{position:fixed;left:28px;top:24px;color:#e6f0f3;font:600 22px "Microsoft YaHei",sans-serif;text-shadow:0 2px 4px #000;pointer-events:none}</style><canvas id="battle"></canvas><span id="status"></span><div id="label"></div><script type="module" src="/app.js"></script></html>');
const mime={'.js':'text/javascript','.json':'application/json','.html':'text/html','.png':'image/png','.glb':'model/gltf-binary'};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost'),base=u.pathname.startsWith('/assets/')?path.resolve('dist/web/assets'):web,relative=u.pathname.startsWith('/assets/')?u.pathname.slice(8):u.pathname==='/'?'index.html':u.pathname.slice(1),file=path.resolve(base,decodeURIComponent(relative));if(!file.startsWith(base+path.sep))throw Error('Invalid path');const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'});res.end(data);}catch{res.writeHead(404).end();}});
const ffmpeg=path.resolve('sites/v04-compression-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
const errors=[],clips=[];let browser;
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1}),page=await context.newPage();page.setDefaultTimeout(240000);
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.body.dataset.ready==='true');
 if((await page.evaluate(()=>combatLab.report())).errors.length)throw Error('Initial renderer error');
 const cdp=await context.newCDPSession(page);
 for(const [name,label,mode]of [['normal','普通坦克',''],['siege','攻城模式','siege']]){
  console.log('PREPARE',name);await page.evaluate(async({mode,label})=>{await combatLab.weaponCase('tank','ground','flesh',5,mode||undefined);tankFrame();document.querySelector('#label').textContent=label;await combatLab.realtime(2.5);}, {mode,label});
  const before=await page.evaluate(()=>combatLab.report());await page.screenshot({path:path.join(work,name+'-before.png')});
  const file=path.join(work,name+'.mp4'),proc=spawn(ffmpeg,['-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',file],{windowsHide:true});
  let stderr='',first,last,count=0,events=0,chain=Promise.resolve();proc.stderr.on('data',d=>stderr+=d);
  const finished=new Promise((resolve,reject)=>{proc.on('error',reject);proc.on('exit',c=>c?reject(Error(stderr)):resolve())});
  const frame=e=>{cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});events++;const jpeg=Buffer.from(e.data,'base64');last=jpeg;first??=e.metadata.timestamp;const target=Math.min(300,Math.floor((e.metadata.timestamp-first)*30)+1);chain=chain.then(async()=>{while(count<target){count++;if(!proc.stdin.write(jpeg))await new Promise(r=>proc.stdin.once('drain',r));}});};
  cdp.on('Page.screencastFrame',frame);await cdp.send('Page.startScreencast',{format:'jpeg',quality:94,maxWidth:1280,maxHeight:720,everyNthFrame:1});
  const result=await page.evaluate(()=>combatLab.realtime(10));await cdp.send('Page.stopScreencast');cdp.off('Page.screencastFrame',frame);await chain;
  while(count<300&&last){count++;if(!proc.stdin.write(last))await new Promise(r=>proc.stdin.once('drain',r));}proc.stdin.end();await finished;
  if(events<60)throw Error('Insufficient recorded frame samples');await page.screenshot({path:path.join(work,name+'-after.png')});
  const audit=await page.evaluate(()=>combatLab.audit());clips.push({name,file,seconds:10,frames:count,capturedFrames:events,before:{mode:before.subjects[0].tankMode,shots:before.subjects[0].shots},after:{mode:result.report.subjects[0].tankMode,shots:result.report.subjects[0].shots},ticks:result.ticks,backlog:result.backlog,errors:result.report.errors,models:audit.models});console.log('RECORDED',JSON.stringify(clips.at(-1)));
 }
 const output=path.join(delivery,followup?'Tank-Effects-Followup.mp4':'Tank-Effects-Current.mp4');
 execFileSync(ffmpeg,['-y','-hide_banner','-loglevel','error','-i',clips[0].file,'-i',clips[1].file,'-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0[v]','-map','[v]','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',output],{windowsHide:true});
 execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-i',output,'-f','null','-'],{windowsHide:true});
 let comparison;
 if(followup){const file=path.join(delivery,'Tank-Normal-Before-After.mp4');execFileSync(ffmpeg,['-y','-hide_banner','-loglevel','error','-i',path.join(delivery,'Tank-Effects-Current.mp4'),'-i',output,'-filter_complex','[0:v]trim=duration=10,setpts=PTS-STARTPTS,crop=480:720:400:0[left];[1:v]trim=duration=10,setpts=PTS-STARTPTS,crop=480:720:400:0[right];[left][right]hstack=inputs=2[v]','-map','[v]','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',file],{windowsHide:true});comparison={file,seconds:10,left:'previous',right:'followup',sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')};}
 const report={date:'2026-10-30',head,video:output,seconds:20,resolution:[1280,720],outputFps:30,audio:false,scope:'Native tank and siege attacks on stationary high-HP diagnostic targets, current local World and BattleRenderer; recording itself does not modify production files',clips,errors,inputCount:inputs.length,sha256:createHash('sha256').update(await fs.readFile(output)).digest('hex'),bytes:(await fs.stat(output)).size,...(comparison?{comparison}:{})};
 await fs.writeFile(path.join(delivery,followup?'followup-provenance.json':'provenance.json'),JSON.stringify({...report,inputs},null,2)+'\n');await fs.writeFile(followup?'reports/qa/tank-effect-followup-video-20261030.json':'reports/qa/tank-effect-video-20261030.json',JSON.stringify(report,null,2)+'\n');console.log('VIDEO',output);
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
