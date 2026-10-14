import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root='reports/local/7a-20261013',final=root+'/final-r1',read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const baseline=await read(root+'/baseline/baseline.json'),release=await read('dist/web/web-release.json');
assert.notEqual(release.appBuildId,baseline.web.appBuildId);assert.equal(release.release,baseline.web.release);
const manifest=await read('dist/web/'+release.manifest),resources=new Set(Object.values(manifest.assets).map(row=>row.url));
const destination=final+'/timing-web';await fs.mkdir(destination);
async function copy(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){const file=directory+'/'+entry.name;if(entry.isDirectory()){await copy(file);continue;}const relative=path.relative('dist/web',file).replaceAll('\\','/');if(resources.has(relative))continue;const output=destination+'/'+relative;await fs.mkdir(path.dirname(output),{recursive:true});await fs.copyFile(file,output);}}
await copy('dist/web');
const source=(variant,mode)=>mode==='web'?['--web='+(variant==='baseline'?root+'/baseline/web':destination)]:['--html='+(variant==='baseline'?baseline.html.path:'dist/SC2-Survivors-MVP7A-Final-R1-20261013.html')];
const native=[];
for(const [index,race]of ['terran','protoss','zerg'].entries())for(const variant of index%2?['final','baseline']:['baseline','final'])native.push({name:variant+'-web-'+race+'-native',args:[...source(variant,'web'),'--race='+race,'--seconds=180']});
const cache=[];
for(const mode of ['web','offline']){
 const cases=[...(mode==='offline'?[{name:'fresh-0',cache:'fresh',dwell:0}]:[]),{name:'warm-0',cache:'warm',dwell:0},{name:'reuse-0',cache:'reuse',dwell:0},{name:'fresh-15',cache:'fresh',dwell:15000},{name:'fresh-30',cache:'fresh',dwell:30000}];
 for(const [index,test]of cases.entries())for(const variant of index%2?['baseline','final']:['final','baseline'])cache.push({name:variant+'-'+mode+'-'+test.name,args:[...source(variant,mode),'--cache='+test.cache,'--dwell='+test.dwell,'--seconds=10']});
}
const menu=['baseline','final'].map(variant=>({name:variant+'-web-menu',args:[...source(variant,'web'),'--menu-probe','--seconds=10']}));
await fs.writeFile(root+'/release-native-matrix.json',JSON.stringify(native,null,2),{flag:'wx'});
await fs.writeFile(root+'/release-cache-matrix.json',JSON.stringify(cache,null,2),{flag:'wx'});
await fs.writeFile(root+'/release-menu-matrix.json',JSON.stringify(menu,null,2),{flag:'wx'});
await fs.writeFile(final+'/measurement-design.json',JSON.stringify({at:new Date().toISOString(),baseline:baseline.web,release,native,cache,menu,coverage:'Three adjacent alternating race pairs at 180 native seconds. For each actual Web/offline version, fresh/warm/reuse at immediate start; fresh also at 15 and 30 second menu dwell. Warm/reuse children include separate fresh first passes, giving three fresh-immediate Terran repetitions per format/version. This is factor coverage, not every cache-by-dwell Cartesian combination. OS/driver caches are not reset. Heavy profiling runs are separate.'},null,2),{flag:'wx'});
console.log(JSON.stringify({native:native.length,cache:cache.length,menu:menu.length,release:release.appBuildId,destination}));
