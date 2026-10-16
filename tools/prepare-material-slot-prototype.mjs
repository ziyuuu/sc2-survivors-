import fs from 'node:fs/promises';import path from 'node:path';
const root='reports/local/equipment-fx-performance-20261016/prototypes',name='material-slots',file='src/render/materials/unit-material-batch.ts',out=root+'/'+name+'/'+file;
let source=await fs.readFile(root+'/material-static/'+file,'utf8');
source=source.replace(' private changed=false;', ' private slotRows:(readonly number[][]|undefined)[]=[];\n private changed=false;');
source=source.replace('  for(const values of rows){','  if(this.slotRows[index]===rows)return;this.slotRows[index]=rows;\n  for(const values of rows){');
await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,source);await fs.writeFile(root+'/'+name+'/overrides.json',JSON.stringify({[file]:out},null,2));
