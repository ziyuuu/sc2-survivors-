import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const dir=process.argv[2],samples=JSON.parse(await fs.readFile(dir+'/samples.json','utf8'));
for(const s of samples){
 const args=['tools/run-basis-sample.mjs',dir,'-ktx2','-uastc','-uastc_level','3','-mipmap','-mip_filter','box',s.linear?'-linear':'-srgb','-file',`/work/${s.name}.png`,'-output_file',`/work/${s.name}.ktx2`];
 const log=await fs.open(dir+'/'+s.name+'-encode.txt','w');
 const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{stdio:['ignore',log.fd,log.fd]});p.on('error',reject);p.on('exit',resolve);});await log.close();
 if(code!==0)throw Error('Encoding failed: '+s.name+' '+code);console.log(s.name,(await fs.stat(dir+'/'+s.name+'.ktx2')).size);
}
