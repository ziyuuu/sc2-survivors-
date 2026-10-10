import fs from 'node:fs/promises';import {spawn} from 'node:child_process';
const [previous,build,prefix,...suites]=process.argv.slice(2);for(const x of [previous,build,prefix,...suites])if(!/^[a-z0-9-]+$/.test(x))throw Error('Invalid label');
const root='reports/local/lighting-batch3-20261010',born='zergling,baneling,roach,ravager,hydralisk,lurker,mutalisk,corruptor,ultralisk,zealot,heroes-terran-1,heroes-zerg-0,heroes-zerg-1,heroes-protoss-0';
// Queue GPU work after the existing full matrix, without a fourth concurrent browser.
let ready=false;while(!ready){try{const report=JSON.parse(await fs.readFile(root+'/'+previous+'/results.json','utf8'));if(report.finishedAt){if(!report.passed)throw Error('Prior matrix did not pass: '+previous);ready=true;}}catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;}if(!ready)await new Promise(r=>setTimeout(r,5000));}
for(const suite of suites){const args=suite==='lighting'?['qa-lighting.mjs',build,prefix+'-lighting','lighting']:suite==='sequence'?['qa-sequence.mjs',build,prefix+'-sequence']:suite==='settled'?['qa-matrix.mjs','--build',build,'--suite','settled','--groups',born,'--settle-ticks','300','--label',prefix+'-settled','--reuse-context']:[];if(!args.length)throw Error('Unsupported suite '+suite);
 const child=spawn(process.execPath,['preview/lighting-batch3-20261010/'+args[0],...args.slice(1)],{stdio:'inherit'});const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});if(code!==0){process.exitCode=code??1;break;}
}
