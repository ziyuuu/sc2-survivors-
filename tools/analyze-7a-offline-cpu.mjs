import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {SourceMap} from 'node:module';
import {StringDecoder} from 'node:string_decoder';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const [variant,run]=process.argv.slice(2),root='reports/local/7a-20261013';assert.ok(['baseline','final'].includes(variant));assert.match(run,/^[a-z0-9-]+$/);
const out=root+'/cpu-source-'+variant+'-'+run;await fs.mkdir(out);
const source=variant==='baseline'?root+'/baseline/source':'.',result=JSON.parse(await fs.readFile(root+'/'+run+'/result.json','utf8'));assert.equal(result.passed,true);assert.ok(result.profile&&result.build.html);
const compiled=await build({entryPoints:[source+'/src/main.ts'],bundle:true,format:'iife',target:'es2022',minify:true,write:false,outfile:out+'/main.js',metafile:true,sourcemap:'external',define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'}});
const originalJs=compiled.outputFiles.find(file=>file.path.endsWith('.js')).text,js=originalJs.replace(/<\/script/gi,'<\\/script'),mapping=compiled.outputFiles.find(file=>file.path.endsWith('.js.map')).text;
const suffix='<script>'+js+'</script></body></html>',handle=await fs.open(result.build.html,'r'),size=(await handle.stat()).size,tail=Buffer.alloc(Buffer.byteLength(suffix));await handle.read(tail,0,tail.length,size-tail.length);await handle.close();assert.equal(tail.toString(),suffix,'The source map must bind to the actual profiled HTML JavaScript');
const start=size-Buffer.byteLength(js+'</script></body></html>');let prefixLines=0,prefixColumn=0;const decoder=new StringDecoder('utf8');
const countPrefix=text=>{for(let at=text.indexOf('\n');at>=0;at=text.indexOf('\n',at+1))prefixLines++;const end=text.lastIndexOf('\n');prefixColumn=end>=0?text.length-end-1:prefixColumn+text.length;};
for await(const chunk of createReadStream(result.build.html,{start:0,end:start-1}))countPrefix(decoder.write(chunk));countPrefix(decoder.end());
const escapePositions=new Map();for(const [line,text]of originalJs.split('\n').entries()){const points=[...text.matchAll(/<\/script/gi)].map((match,index)=>match.index+index+1);if(points.length)escapePositions.set(line,points);}
const cpu=JSON.parse(await fs.readFile(root+'/'+run+'/pass0.cpuprofile','utf8')),map=new SourceMap(JSON.parse(mapping)),nodes=new Map(cpu.nodes.map(node=>[node.id,node.callFrame])),groups=new Map();
for(let index=0;index<cpu.samples.length;index++){
 const frame=nodes.get(cpu.samples[index]),line=frame.lineNumber-prefixLines,htmlColumn=frame.columnNumber-(line===0?prefixColumn:0),column=htmlColumn-(escapePositions.get(line)??[]).filter(at=>at<htmlColumn).length,entry=line>=0&&frame.url.startsWith('file:')?map.findEntry(line,column):{};
 const source=entry.originalSource??frame.functionName??'(unmapped)',key=source+':'+String(entry.originalLine??frame.lineNumber)+':'+String(entry.originalColumn??frame.columnNumber),row=groups.get(key)??{source,originalLine:entry.originalLine,originalColumn:entry.originalColumn,functionName:frame.functionName,ms:0};row.ms+=(cpu.timeDeltas[index]??0)/1000;groups.set(key,row);
}
const rows=[...groups.values()].sort((a,b)=>b.ms-a.ms),byFile={};for(const row of rows)byFile[row.source]=(byFile[row.source]??0)+row.ms;
const report={passed:true,variant,run,html:result.build,javaScriptSha256:createHash('sha256').update(js).digest('hex'),prefixLines,prefixColumn,byFile:Object.entries(byFile).sort((a,b)=>b[1]-a[1]),rows,method:'Exact recompiled JavaScript suffix bound to the actual named offline HTML, then original source mapping of V8 CPU-profile stack samples. These are sampled main-thread wall-time positions; driver/native blocking can appear on a JavaScript frame. They are not CPU-cycle accounting or GPU time. Rendering GPU queries and synchronous stage spans are reported separately.'};
await fs.writeFile(out+'/mapping.json',mapping);await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');console.log(JSON.stringify({passed:true,variant,run,byFile:report.byFile.slice(0,25)}));
