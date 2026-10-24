import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const revision=process.argv[2]??'r1',kind=process.argv[3]??'web',folder='performance-r03-20261020';
const previous='reports/local/performance-r02-20261020/candidate-r3-web-inputs';
const changes=['src/render/scene/battle-renderer.ts','src/ui/mobile/input.ts','src/ui/gamepad/controller.ts'];
const root='preview/'+folder+'-candidate-'+revision,archive='reports/local/'+folder+'/candidate-'+revision+'-'+kind+'-inputs';
const loaded=new Map(),overrides=[],hash=x=>createHash('sha256').update(x).digest('hex');
await fs.mkdir(root,{recursive:true});
const plugin={name:'frozen-r02',setup(b){b.onLoad({filter:/\.(ts|mts|css|json|m?js)$/},async a=>{
 const file=path.relative(process.cwd(),a.path).replaceAll('\\','/');let contents=await fs.readFile(a.path);
 if(file.startsWith('src/')&&!changes.includes(file)){const frozen=await fs.readFile(previous+'/'+file);if(contents.toString().replaceAll('\r\n','\n')!==frozen.toString().replaceAll('\r\n','\n'))overrides.push(file);contents=frozen;}
 loaded.set(path.resolve(a.path),contents);const ext=path.extname(a.path);return {contents,loader:ext==='.mjs'?'js':ext==='.mts'?'ts':ext.slice(1),resolveDir:path.dirname(a.path)};
});}};
const classes=[['BattleRenderer','render/scene/battle-renderer'],['Input','ui/mobile/input'],['GamepadInput','ui/gamepad/controller']];
let text;if(kind==='web'){
 text=(await fs.readFile('preview/performance-r02-20261020-candidate-r3/main.ts','utf8')).split('\nimport {EquipmentDrops as R02Baseline}')[0].replaceAll('installPerformanceR02','installPerformanceR03').replace('performance-r02-runtime','performance-r03-runtime');
 text+='\n'+classes.map(([name,file])=>`import {${name} as Old${name}} from '../../${previous}/src/${file}.ts';`).join('\n')+'\nglobalThis.R03Baseline={'+classes.map(([name])=>name+':Old'+name).join(',')+'};\n';
}else{
 text=classes.slice(1).flatMap(([name,file])=>[`import {${name}} from '../../src/${file}.ts';`,`import {${name} as Old${name}} from '../../${previous}/src/${file}.ts';`]).join('\n')+
 "\nimport {World} from '../../src/simulation/world.ts';import {ControlSettings} from '../../src/ui/controls/settings.ts';globalThis.R03Inputs={World,ControlSettings,baseline:{Input:OldInput,GamepadInput:OldGamepadInput},candidate:{Input,GamepadInput}};";
}
const stem=kind==='web'?'main':'input',entry=root+'/'+stem+'.ts';await fs.writeFile(entry,text);
const result=await build({entryPoints:[entry],bundle:true,platform:'browser',format:'iife',target:'es2022',outfile:root+'/'+stem+'.js',metafile:true,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'},plugins:[plugin]});
if(kind==='web')for(const file of ['index.html','main.css'])await fs.copyFile('preview/performance-r02-20261020-candidate-r3/'+file,root+'/'+file);
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=loaded.get(path.resolve(file));if(!bytes)continue;inputs.push({file,bytes:bytes.length,sha256:hash(bytes)});const dest=path.join(archive,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}
const outputs=[];for(const file of kind==='web'?['index.html','main.css','main.js']:['input.js']){const bytes=await fs.readFile(root+'/'+file);outputs.push({file:root+'/'+file,bytes:bytes.length,sha256:hash(bytes)});}
await fs.writeFile(root+'/'+(kind==='web'?'build-inputs':'input-build-inputs')+'.json',JSON.stringify({revision,kind,previous,changes,overrides,inputs,outputs},null,2));
console.log(JSON.stringify({root,kind,inputs:inputs.length,overrides,outputs}));
