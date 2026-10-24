import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='D:/星际',dir=root+'/reports/local/integration-i01-20261022';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(p),norm=s=>s.replaceAll('\r\n','\n');
const initial=JSON.parse(read(dir+'/merge-manifest.json'));
const current=[];for(const r of initial.files){const p=root+'/'+r.path;if(fs.existsSync(p))current.push({...r,current:sha(read(p)),preservedMain:sha(read(p))===r.main,preservedFun:sha(read(p))===r.fun});}
const exact=['src/render/scene/camera-controller.ts','test/camera-control.test.ts','src/ui/controls/settings.ts','src/ui/mobile/canvas-pinch.ts','src/ui/gamepad/controller.ts','src/ui/controls/skills.ts'];
const exactChecks=exact.map(p=>({path:p,pass:sha(read(root+'/'+p))===sha(read(dir+'/before/main/'+p))}));
function methods(side){const text=norm(fs.readFileSync(side+'/src/render/scene/battle-renderer.ts','utf8')),result=new Map();for(const block of text.split(/\n(?= [^\s}])/)){const name=block.match(/^ (?:private |public )?(?:async )?(?:get |set )?([\w]+)\(/)?.[1];if(name&&/(camera|zoom|pitch|viewport|^resize$)/i.test(name))result.set(name,block.trim());}if(result.size<10)throw Error('Camera method inventory unexpectedly small');return result;}
const before=methods(dir+'/before/main'),after=methods(root),cameraMethods=[...before].map(([name,text])=>({name,pass:after.get(name)===text}));
const builds=['web-game-r2','web-lab-r2'].map(name=>{const b=JSON.parse(read(dir+'/'+name+'-build.json'));const mismatches=b.inputs.filter(r=>sha(read(root+'/'+r.path))!==r.sha256);return {name,appBuildId:b.appBuildId,inputs:b.inputs.length,sourceDrift:mismatches.map(r=>r.path),assets:b.assetCount,resources:b.resources.length};});
const funDrift=initial.files.filter(r=>r.fun&&sha(read(initial.fun+'/'+r.path))!==r.fun).map(r=>r.path);
const fileReport=current.filter(r=>r.path.startsWith('src/')||r.path.startsWith('test/'));
const summary={at:new Date().toISOString(),cameraAndInput:{exactFiles:exactChecks,cameraMethods},builds,funSourceDrift:funDrift,files:{totalKnown:fileReport.length,existingMain:fileReport.filter(r=>r.main).length,mainExact:fileReport.filter(r=>r.main&&r.preservedMain).length,changed:fileReport.filter(r=>r.main&&!r.preservedMain).length,addedFromFun:fileReport.filter(r=>!r.main&&r.fun).length},resolutions:'conflict-resolutions.json',exclusions:[{path:'src/render/scene/camera-controller.ts',reason:'Latest user instruction: preserve current main camera, including fixed view without fleet fitting.'},{path:'test/special-stage-camera.test.ts',reason:'Tests a superseded overhead camera. Kept as historical frozen input, not installed.'}],allFiles:current.map(({path,action,main,fun,current,preservedMain,preservedFun})=>({path,action,main,fun,current,preservedMain,preservedFun}))};
summary.pass=exactChecks.every(r=>r.pass)&&cameraMethods.every(r=>r.pass)&&builds.every(r=>!r.sourceDrift.length)&&!funDrift.length;
fs.writeFileSync(dir+'/preservation-audit.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({...summary,allFiles:undefined},null,2));if(!summary.pass)process.exitCode=1;
