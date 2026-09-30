import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {BufferGeometry,BufferAttribute,EdgesGeometry,Matrix4,Vector3,Quaternion} from 'three';
const families=['marine','marauder','reaper','hellion','tank','thor','viking','banshee','medivac','science_vessel','zergling','baneling','roach','queen','ravager','hydralisk','lurker','ultralisk','mutalisk','corruptor','zealot','adept','stalker','sentry','high_templar','immortal','colossus','phoenix','void_ray','carrier'];
const source=JSON.parse(await fs.readFile('assets/private/m3-pack.json','utf8')).manifest,records=[];
await fs.mkdir('public/assets/wireframes',{recursive:true});
for(const family of families){
 const model=source.find(a=>a.id==='model.'+family);if(!model)throw Error('No original body for wireframe '+family);
 const bytes=await fs.readFile(model.packedFile),j=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12))),offset=28+bytes.readUInt32LE(12),binary=bytes.subarray(offset),lines=[];
 const array=(index)=>{const a=j.accessors[index],view=j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],size={5121:1,5123:2,5125:4,5126:4}[a.componentType],out=[];
  for(let i=0;i<a.count;i++)for(let k=0;k<n;k++){const o=(view.byteOffset??0)+(a.byteOffset??0)+i*(view.byteStride??size*n)+k*size;out.push(a.componentType===5126?binary.readFloatLE(o):a.componentType===5125?binary.readUInt32LE(o):a.componentType===5123?binary.readUInt16LE(o):binary.readUInt8(o));}return {out,n};};
 const visit=(id,parent)=>{const node=j.nodes[id],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(new Vector3(...node.translation??[0,0,0]),new Quaternion(...node.rotation??[0,0,0,1]),new Vector3(...node.scale??[1,1,1])),world=parent.clone().multiply(local);
  if(node.mesh!==undefined)for(const primitive of j.meshes[node.mesh].primitives){if(primitive.attributes.POSITION===undefined)continue;const geo=new BufferGeometry(),pos=array(primitive.attributes.POSITION);geo.setAttribute('position',new BufferAttribute(new Float32Array(pos.out),3));if(primitive.indices!==undefined)geo.setIndex(array(primitive.indices).out);const edges=new EdgesGeometry(geo,28).getAttribute('position');
   for(let i=0;i+1<edges.count;i+=2){const pair=[i,i+1].map(v=>{const p=new Vector3().fromBufferAttribute(edges,v).applyMatrix4(world);return [p.x*.8-p.z*.6,-p.y*.85+(p.x*.6+p.z*.8)*.4];});lines.push(pair);}geo.dispose();}
  for(const child of node.children??[])visit(child,world);
 };
 for(const id of j.scenes[j.scene??0].nodes)visit(id,new Matrix4());
 if(!lines.length)throw Error('Empty original geometry '+family);
 const points=lines.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),lo=[Math.min(...xs),Math.min(...ys)],hi=[Math.max(...xs),Math.max(...ys)],scale=110/Math.max(hi[0]-lo[0],hi[1]-lo[1]);
 const project=p=>[64+(p[0]-(lo[0]+hi[0])/2)*scale,64+(p[1]-(lo[1]+hi[1])/2)*scale].map(n=>n.toFixed(2)).join(' ');
 const step=Math.max(1,Math.ceil(lines.length/1500)),d=lines.filter((_,i)=>i%step===0).map(([a,b])=>'M'+project(a)+'L'+project(b)).join('');
 const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="${d}" fill="none" stroke="#99eebe" stroke-width=".7" stroke-linejoin="round"/></svg>`),packedFile=`public/assets/wireframes/${family}.svg`;await fs.writeFile(packedFile,svg);
 records.push({id:'wireframe.'+family,kind:'icon',packedFile,required:true,sourcePath:model.sourcePath,sourceBuild:model.sourceBuild,sourceModel:model.id,sourceSha256:createHash('sha256').update(bytes).digest('hex'),sha256:createHash('sha256').update(svg).digest('hex'),derivation:'original GLB geometry hard-edge orthographic projection; no generated substitute'});
}
await fs.writeFile('assets/private/combat-wireframes.json',JSON.stringify({manifest:records},null,2));
console.log(`Prepared ${records.length} original-model wireframes.`);
