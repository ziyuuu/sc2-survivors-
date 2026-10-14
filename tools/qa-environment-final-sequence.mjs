import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import assert from 'node:assert/strict';

// Serial heavy browser checks; fail closed, preserve every individual log/report.
const root='reports/local/mvp5-lifecycle-20261014',formal='dist/MVP5-Lifecycle-Web-20261014-R2';
const offline=JSON.parse(await fs.readFile(root+'/formal-offline-r2/result.json','utf8'));
assert.equal(offline.passed,true);
const queue=[
 ['formal-web-r2','qa-environment-lifecycle.mts','--entry-only','--web='+formal],
 ['missing-texture-r2','qa-environment-lifecycle.mts','--missing=environment.sample.lavabase','--theme=char','--web='+formal],
 ['missing-model-r2','qa-environment-lifecycle.mts','--missing=model.map.cliffnatural0ex1_bbbc_00','--theme=mar-sara','--web='+formal],
 ['cache-r2','qa-environment-play.mts','--mode=cache','--web='+root+'/diagnostic-r2'],
];
for(const [name,tool,...args] of queue){
 console.log('Starting '+name);
 const output=createWriteStream(root+'/'+name+'.log',{flags:'wx'});
 const child=spawn(process.execPath,['--import','tsx','tools/'+tool,root+'/'+name,...args],{stdio:['ignore','pipe','pipe'],windowsHide:true});child.stdout.pipe(output,{end:false});child.stderr.pipe(output,{end:false});
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});await new Promise(r=>output.end(r));
 assert.equal(code,0,name+' failed; inspect its saved report');
 const result=JSON.parse(await fs.readFile(root+'/'+name+'/result.json','utf8'));assert.equal(result.passed,true,name);
 console.log(JSON.stringify({name,passed:result.passed,checks:result.checks.length,screens:result.screens.length}));
}
