import {AnimationClip,Box3,Vector3,Quaternion,VectorKeyframeTrack,QuaternionKeyframeTrack} from 'three';
/** Bounded, local presentation of the source's rigid pieces. This is not a Havok emulator.
 * Original animation channels win. Only unanimated original rigid-body bones get trajectories.
 * No invented mesh, live collision body, gameplay randomness or damage is introduced. */
export function prepareDeathMotion(group,bones,sections,clips){
 const raw=sections.getSectionByReference(sections.model.physics_rigidbodies)?.content??[];
 const source=clips.find(c=>/^death$/i.test(c.name))??clips.find(c=>/death/i.test(c.name));
 if(!raw.length)return {clips,report:{kind:'original-skeletal-only',bodies:0,adaptedBones:[]}};
 group.updateMatrixWorld(true);const box=new Box3().setFromObject(group),size=box.getSize(new Vector3()),span=Math.max(.01,size.x,size.y,size.z),center=box.getCenter(new Vector3());
 const targets=new Set(raw.filter(b=>!(b.flags&128)&&bones[b.bone]).map(b=>bones[b.bone]));
 const tracks=[...(source?.tracks??[])],adapted=[];
 const duration=Math.max(2.4,Math.min(5,source?.duration??2.4));
 for(const [index,rigid] of raw.entries()){
  const bone=bones[rigid.bone];if(!bone||!targets.has(bone)||tracks.some(t=>t.name.startsWith(bone.name+'.')))continue;
  let parent=bone.parent,hasRigidParent=false;while(parent){if(targets.has(parent)){hasRigidParent=true;break;}parent=parent.parent;}if(hasRigidParent)continue;
  const start=bone.getWorldPosition(new Vector3()),inverse=bone.parent.matrixWorld.clone().invert(),rest=bone.quaternion.clone(),radial=new Vector3(start.x-center.x,0,start.z-center.z);
  if(radial.lengthSq()<.001)radial.set(Math.sin(index*2.4),0,Math.cos(index*2.4));radial.normalize();
  const mass=Math.max(1,rigid.mass??2400),speed=span*(.12+.14/(1+Math.log10(mass)/4)),lift=span*(.3+.08*(index%3)),gravity=span*1.8*Math.max(.3,Math.min(2,rigid.gravity_factor??1)),friction=Math.max(.1,Math.min(1,rigid.friction??.7));
  const times=[],positions=[],rotations=[],axis=new Vector3(radial.z,.25,-radial.x).normalize();let landed=false,last=0,groundAt=duration;
  for(let frame=0;frame<=Math.ceil(duration*24);frame++){
   const t=Math.min(duration,frame/24),height=start.y+lift*t-.5*gravity*t*t;
   if(!landed&&t>0&&height<=box.min.y+.03){landed=true;groundAt=t;}
   const travel=landed?groundAt+(1-Math.exp(-(t-groundAt)*(2+friction*5)))/(2+friction*5):t;
   const p=new Vector3(start.x+radial.x*speed*travel,Math.max(box.min.y+.03,height),start.z+radial.z*speed*travel).applyMatrix4(inverse);
   const angle=Math.min(t,groundAt)*(.7+(index%4)*.35),q=rest.clone().multiply(new Quaternion().setFromAxisAngle(axis,angle));
   if(t===last&&frame>0)continue;times.push(t);positions.push(...p.toArray());rotations.push(...q.toArray());last=t;
  }
  tracks.push(new VectorKeyframeTrack(bone.name+'.position',times,positions),new QuaternionKeyframeTrack(bone.name+'.quaternion',times,rotations));adapted.push({name:bone.name,bone:rigid.bone,mass,friction,gravityFactor:rigid.gravity_factor??1});
 }
 const result=adapted.length?[...clips.filter(c=>c!==source),new AnimationClip('Death',duration,tracks)]:clips;
 return {clips:result,report:{kind:'original-rigid-bones-bounded-ballistics-v1',bodies:raw.length,adaptedBones:adapted,retainedOriginalTracks:source?.tracks.length??0,limitations:['No inter-piece contacts or Havok joints; source skeletal tracks preserved.','Original particle materials are accompanied by authored local emitters; not a full SC Actor renderer.']}};
}
