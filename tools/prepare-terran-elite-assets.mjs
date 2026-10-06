import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ddsToPng} from './dds-png.mjs';
/** Only verified original medical pixels. Adds three dependencies; never rewrites original resources. */
export async function prepareTerranEliteAssets(){const receipts=JSON.parse(await fs.readFile('tools/p4-medical-dependencies.json','utf8')),manifest=[];await fs.mkdir('public/assets/p4-medical',{recursive:true});
 for(const [key,name]of [['beam','beamgrad2'],['flare','flare2_green'],['heal','med2']]){const source='assets/private/dds/'+name+'.dds',bytes=await fs.readFile(source),r=receipts.find(r=>r.installFile===source);if(!r||r.sha256!==createHash('sha256').update(bytes).digest('hex'))throw Error('Original medical asset mismatch');const packedFile='public/assets/p4-medical/'+name+'.png';await fs.writeFile(packedFile,ddsToPng(bytes));manifest.push({id:'p4.texture.'+key,kind:'texture',required:true,packedFile,sourcePath:r.sourcePath,upstreamSourcePath:r.sourcePath,sourceFile:source,sourceSha256:r.sha256});}
 return manifest;
}
