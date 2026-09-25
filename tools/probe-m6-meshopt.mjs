/** Read-only local prototype: measure exact Meshopt vertex streams against the
 * existing per-chunk gzip codec. It does not change any release asset. */
import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';

const ids=['ultralisk','hero.vorazun','hero.dehaka'];
const components={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
const dimensions={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const report={at:new Date().toISOString(),method:'Lossless Meshopt ATTRIBUTES prototype on mesh vertex bufferViews only; gzip before/after is an estimate, not a rebuilt HTML',models:[]};
for(const id of ids){
 const path=`public/assets/optimized/model.${id}.glb`,bytes=await fs.readFile(path);
 if(bytes.toString('ascii',0,4)!=='glTF')throw Error('Invalid GLB: '+path);
 const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
 const binOffset=28+jsonLength+8,rows=[];
 const attributeAccessors=new Set();
 for(const mesh of json.meshes??[])for(const primitive of mesh.primitives??[]){
  for(const value of Object.values(primitive.attributes??{}))attributeAccessors.add(value);
  for(const target of primitive.targets??[])for(const value of Object.values(target))attributeAccessors.add(value);
 }
 const byView=new Map();for(const index of attributeAccessors){const accessor=json.accessors[index];if(accessor?.bufferView===undefined||accessor.sparse)continue;
  const list=byView.get(accessor.bufferView)??[];list.push(accessor);byView.set(accessor.bufferView,list);
 }
 for(const [index,accessors] of byView){const view=json.bufferViews[index];if(view.buffer!==0)continue;
  const strides=new Set(accessors.map(accessor=>view.byteStride??components[accessor.componentType]*dimensions[accessor.type]));
  if(strides.size!==1)continue;const [stride]=strides;
  if(!Number.isInteger(stride)||stride%4||view.byteLength%stride)continue;
  const source=new Uint8Array(bytes.buffer,bytes.byteOffset+binOffset+(view.byteOffset??0),view.byteLength);
  const encoded=MeshoptEncoder.encodeGltfBuffer(source,source.length/stride,stride,'ATTRIBUTES');
  const decoded=new Uint8Array(source.length);MeshoptDecoder.decodeGltfBuffer(decoded,source.length/stride,stride,encoded,'ATTRIBUTES');
  if(!Buffer.from(decoded).equals(source))throw Error(`Meshopt changed bytes: ${id} view ${index}`);
  rows.push({view:index,rawBytes:source.length,meshoptBytes:encoded.length,rawGzipBytes:gzipSync(source).length,meshoptGzipBytes:gzipSync(encoded).length});
 }
 const sum=(key)=>rows.reduce((n,row)=>n+row[key],0);
 report.models.push({id,sourceBytes:bytes.length,viewCount:rows.length,rawBytes:sum('rawBytes'),meshoptBytes:sum('meshoptBytes'),rawGzipBytes:sum('rawGzipBytes'),meshoptGzipBytes:sum('meshoptGzipBytes'),estimatedGzipSavings:sum('rawGzipBytes')-sum('meshoptGzipBytes')});
}
await fs.mkdir('reports/local',{recursive:true});await fs.writeFile('reports/local/m6-meshopt-probe.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.models));
