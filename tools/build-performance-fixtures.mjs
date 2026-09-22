/** Same embedded pixels and bundling for before/after desktop performance fixtures.
 * DEV exposes the isolated load driver; these ignored files are never friend builds. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
const revision=process.argv[2];if(!revision)throw Error('Pass the existing baseline git revision');
const sha=execFileSync('git',['rev-parse','--verify',revision+'^{commit}'],{encoding:'utf8'}).trim();
const base=path.resolve('.cache/performance-'+sha);await fs.mkdir(base,{recursive:true});
const archive=path.join(base,'source.tar');execFileSync('git',['archive','--format=tar','--output',archive,sha,'src']);execFileSync('tar',['-xf',archive,'-C',base]);
await fs.copyFile('src/assets/runtime.generated.ts',path.join(base,'src/assets/runtime.generated.ts'));
// Isolate battle code: both snapshots decode the exact same current asset pack.
for(const name of ['offline-pack.ts','base85.mjs'])await fs.copyFile('src/assets/'+name,path.join(base,'src/assets',name));
const html=await fs.readFile('dist/SC2-Survivors-Demo.html','utf8'),marker='</script><script>',at=html.lastIndexOf(marker);if(at<0)throw Error('Standalone scripts not found');const prefix=html.slice(0,at+marker.length);
const out=process.env.SC2_FIXTURE_OUT??'reports/local/qa-v14-file-fixtures';await fs.mkdir(out,{recursive:true});
const meta={at:new Date().toISOString(),debugOnly:true,sharedCurrentAssetDecoder:true,baselineRevision:sha,currentRevision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:[]};
for(const [name,entry] of [['baseline',path.join(base,'src/main.ts')],['optimized',path.resolve('src/main.ts')]]){
 const r=await build({entryPoints:[entry],bundle:true,format:'iife',target:'es2022',minify:true,write:false,outfile:'fixture.js',define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'}});
 const js=r.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script'),file=path.resolve(out,name+'.html');await fs.writeFile(file,prefix+js+'</script></body></html>');meta.files.push({name,file});console.log(file);
}
await fs.writeFile(out+'/PREPARED.json',JSON.stringify(meta,null,2));
