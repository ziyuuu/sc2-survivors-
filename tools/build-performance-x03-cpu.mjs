import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {build} from 'esbuild';
const root='reports/local/performance-x03-20261020',changes=['timeline.ts','particles.ts','ribbons.ts'],manifest=[];
for(const mode of ['old','new'])for(const instrument of [false,true]){
 const label=mode+(instrument?'-count':'-cpu'),outfile=root+'/'+label+'.js',inputs=[];
 await build({stdin:{contents:`export * from './src/render/effects/source/particles.ts';export * from './src/render/effects/source/ribbons.ts';export * from './src/render/effects/source/timeline.ts';export {default as SOURCE_EFFECTS} from './src/render/effects/source/catalog.json';`,resolveDir:process.cwd(),sourcefile:'native-request-cpu.ts'},bundle:true,format:'iife',globalName:'__X_'+label.replace('-','_').toUpperCase()+'__',target:'es2022',outfile,plugins:[{name:'fixed-numeric-inputs',setup(b){b.onLoad({filter:/\.(ts|json)$/},async a=>{
  const file=path.relative(process.cwd(),a.path).replaceAll('\\','/');if(!file.startsWith('src/'))return;const frozen=root+(mode==='old'?'/baseline-inputs/':'/candidate-r3-inputs/')+file;let contents=await fs.readFile(frozen,'utf8');inputs.push({file,sha256:createHash('sha256').update(contents).digest('hex')});
  if(instrument&&file.endsWith('/timeline.ts')){
   contents=contents.replace('export function boneMatrices(def:SourceEffectDefinition,phase:SourcePhase):Matrix4[]{','export function boneMatrices(def:SourceEffectDefinition,phase:SourcePhase):Matrix4[]{globalThis.__X_COUNTS__.'+mode+'.calls++;');
   contents=contents.replace(' const matrices:Matrix4[]=[],pending=', ' globalThis.__X_COUNTS__.'+mode+'.computed++;const matrices:Matrix4[]=[],pending=');
   contents=contents.replace('export function sourcePhase(def:SourceEffectDefinition,age:number,loop=false,seed=0,preferred?:string):SourcePhase {','export function sourcePhase(def:SourceEffectDefinition,age:number,loop=false,seed=0,preferred?:string):SourcePhase {globalThis.__X_COUNTS__.'+mode+'.phases++;');
  }
  return {contents,loader:file.endsWith('.json')?'json':'ts',resolveDir:path.dirname(a.path)};
 });}}]});manifest.push({mode,instrument,file:outfile,sha256:createHash('sha256').update(await fs.readFile(outfile)).digest('hex'),inputs});
}
await fs.writeFile(root+'/native-request-cpu-builds.json',JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest.map(({inputs,...r})=>({...r,inputCount:inputs.length}))));
