/** Sequential GPU checks. Every suite keeps its actual build and failure evidence. */
import {spawn} from 'node:child_process';
const [build,prefix,...suites]=process.argv.slice(2);
if(!/^[a-z0-9-]+$/.test(build)||!/^[a-z0-9-]+$/.test(prefix)||!suites.length)throw Error('build prefix suites required');
for(const suite of suites){
 const script=['core','color','heroes','cost'].includes(suite)?'qa.mjs':'qa-matrix.mjs';
 const child=spawn(process.execPath,['preview/material-batch2-20261010/'+script,'--build',build,'--suite',suite,'--label',prefix+'-'+suite],{stdio:'inherit'});
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
 if(code!==0){process.exitCode=code??1;break;}
}
