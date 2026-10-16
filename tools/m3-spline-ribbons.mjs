import {BufferGeometry,Float32BufferAttribute,Mesh,MeshStandardMaterial} from 'three';
import {materialEntries} from './m3-materials.mjs';

/** Preserve the authored, bone-hosted tubes in SpineCrawlerEx1. These are body
 * surfaces (RIB_ type 2 / SRIB), not a replacement cylinder or free particle trail. */
export function appendSpineSplineRibbons(group,sections,bones,specs,report){
 const get=r=>sections.getSectionByReference(r)?.content??[],str=r=>String.fromCharCode(...get(r)).replaceAll('\0','');
 const clean=v=>{if(v==null||typeof v!=='object')return v;if(v.header&&'default'in v)return {id:v.header.id,interpolation:v.header.interpolation,default:clean(v.default)};if('entries'in v&&'index'in v)return get(v).map(clean);if(Array.isArray(v))return v.map(clean);return Object.fromEntries(Object.entries(v).filter(([k])=>k!=='desc'&&!k.startsWith('__')).map(([k,x])=>[k,clean(x)]));};
 const refs=get(sections.model.material_references),materials=materialEntries(sections),stcs=get(sections.model.sequence_transformation_collections),stgs=get(sections.model.sequence_transformation_groups),sd=['sdev','sd2v','sd3v','sd4q','sdcc','sdr3','sdu8','sds6','sdu6','sds3','sdu3','sdfg','sdmb'];
 for(const [index,raw]of get(sections.model.ribbons).entries()){
  const ribbon=clean(raw),spline=ribbon.spline[0],ref=refs[ribbon.material_reference_index],spec=materials[ref?.material_index];
  if(ribbon.ribbon_type!==2||ribbon.spline.length!==1||ref?.type!==1||!spec)throw Error('Unsupported SpineCrawler source spline '+index);
  const ids=new Set();const collect=v=>{if(!v||typeof v!=='object')return;if('id'in v&&'default'in v)ids.add(v.id);else for(const x of Object.values(v))collect(x);};collect(ribbon);
  const clips=get(sections.model.sequences).map((q,i)=>({name:str(q.name),duration:(q.anim_ms_end-q.anim_ms_start)/1000,tracks:get(stgs[i]?.stc_indices).flatMap(ci=>{const c=stcs[ci],references=get(c.anim_refs);return get(c.anim_ids).flatMap((id,j)=>{if(!ids.has(id))return [];const packed=references[j],e=get(c[sd[packed>>>16]])[packed&0xffff];return e?[{id,frames:get(e.frames).map(t=>(t-q.anim_ms_start)/1000),values:get(e.keys).map(clean)}]:[];});})}));
  const divisions=ribbon.divisions,sides=ribbon.sides,position=[],uv=[],indices=[];
  // Reference topology only. Runtime places every ring from the live original
  // bones, source width/twist curves and animated SRIB tangent coefficients.
  for(let ring=0;ring<=divisions;ring++)for(let side=0;side<=sides;side++){const theta=side/sides*Math.PI*2;position.push(Math.cos(theta)*.1,Math.sin(theta)*.1,ring/divisions);uv.push(side/sides,ring/divisions);}
  for(let ring=0;ring<divisions;ring++)for(let side=0;side<sides;side++){const a=ring*(sides+1)+side,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(position,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const key=spec.name+'#'+spec.index,material=new MeshStandardMaterial({color:0xffffff,roughness:.8});material.name=key;
  const mesh=new Mesh(geometry,material);mesh.name='SourceSplineRibbon'+index;mesh.frustumCulled=false;mesh.userData={sc2Role:'body',sc2MaterialIndex:spec.index,sc2Spline:{version:1,sourceBone:bones[ribbon.bone].name,endBone:bones[spline.bone].name,ribbon,clips}};group.add(mesh);
  specs.set(key,{...spec,role:'body',availableUvs:[0]});report.push({mesh:mesh.name,type:'RIB_/SRIB',index,material:spec.name,role:'original-bone-hosted-tube',status:'converted',divisions,sides,sourceBone:ribbon.bone,endBone:spline.bone});
 }
}
