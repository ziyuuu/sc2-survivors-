import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import path from 'node:path';import {SC2_AUDIO} from './sc2-audio-catalog.mjs';
let needs=false;
for(const [,source] of SC2_AUDIO){if(!source.endsWith('.wav'))continue;try{const b=await fs.readFile('public/assets/audio/sc2/'+path.basename(source));let o=12;while(o+8<=b.length){const n=b.readUInt32LE(o+4);if(b.toString('ascii',o,o+4)==='fmt '&&n>=16&&b.readUInt16LE(o+8)===17)needs=true;o+=8+n+(n%2);}}catch{}}
if(needs)execFileSync(process.env.SC2_PYTHON??'python',['-X','utf8','tools/convert-sc2-audio.py'],{stdio:'inherit',windowsHide:true});
