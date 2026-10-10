/** Sequential GPU checks. Every suite keeps its actual build and failure evidence. */
import {spawn} from 'node:child_process';
const [build,prefix,...options]=process.argv.slice(2),reuseContext=options.includes('--reuse-context'),suites=options.filter(s=>s!=='--reuse-context');
if(!/^[a-z0-9-]+$/.test(build)||!/^[a-z0-9-]+$/.test(prefix)||!suites.length)throw Error('build prefix suites required');
for(const suite of suites){
 const special=['lighting','realtime'].includes(suite),script=special?'qa-lighting.mjs':['core','color','heroes','cost'].includes(suite)?'qa.mjs':'qa-matrix.mjs';
 const child=spawn(process.execPath,['preview/lighting-batch3-20261010/'+script,...(special?[build,prefix+'-'+suite,suite]:['--build',build,'--suite',suite,'--label',prefix+'-'+suite,...(suite==='portraits'?['--settle-ticks','300']:[]),...(reuseContext&&script==='qa-matrix.mjs'?['--reuse-context']:[])])],{stdio:'inherit'});
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
 if(code!==0){process.exitCode=code??1;break;}
}
