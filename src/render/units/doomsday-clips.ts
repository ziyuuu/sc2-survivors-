import * as T from 'three';

/** Project-authored arm/torso choreography on the verified Thor skeleton.
 * Original SC2 clips are never overwritten or relabelled as sword animations. */
export function withDoomsdayClips(clips:T.AnimationClip[],root:T.Object3D,profile?:string){
 if(profile!=='thor'&&!profile?.startsWith('elite.thor.'))return clips;
 const rest=clips.find(c=>/^stand$/i.test(c.name)),arm=root.getObjectByName('Bone_Arm_Upper_R'),forearm=root.getObjectByName('Bone_Arm_Lower_R'),torso=root.getObjectByName('Bone_Torso');
 if(!rest||!arm||!forearm||!torso)return clips;
 // Original 07 is the upper muzzle of the right hand cannon (08 is the lower
 // muzzle). Bind its root-level reference BEFORE Stand moves the cannon away
 // from the bind pose. Local -Y is the barrel axis in the original Z-up rig.
 if(!root.getObjectByName('Ref_Weapon_SwordGrip')){
  root.updateMatrixWorld(true);
  const mount=root.getObjectByName('Bone_Cannon_R')??forearm,muzzle=root.getObjectByName('Ref_Weapon_07')??root.getObjectByName('Ref_Weapon 07');
  const center=muzzle?.getWorldPosition(new T.Vector3())??mount.getWorldPosition(new T.Vector3()),axis=muzzle?new T.Vector3(0,-1,0).applyQuaternion(muzzle.getWorldQuaternion(new T.Quaternion())).normalize():new T.Vector3(0,0,1);
  const grip=new T.Object3D();grip.name='Ref_Weapon_SwordGrip';grip.position.copy(mount.worldToLocal(center.clone()));
  const guide=new T.Object3D();guide.name='Ref_Weapon_SwordGuide';guide.position.copy(mount.worldToLocal(center.clone().add(axis)).sub(grip.position));mount.add(grip);grip.add(guide);
  const pommel=new T.Object3D();pommel.name='Ref_Weapon_SwordPommel';pommel.position.copy(guide.position).multiplyScalar(-.2);grip.add(pommel);
 }
 const mixer=new T.AnimationMixer(root);mixer.clipAction(rest).play();mixer.setTime(0);root.updateMatrixWorld(true);
 const times=[0,.14,.29,.4,.53,.73,.9,1],up=new T.Vector3(0,1,0),right=new T.Vector3(1,0,0);
 const make=(name:string,reverse:boolean)=>{
  const tracks=rest.tracks.map(track=>{const t=track.clone(),n=t.getValueSize(),v=Array.from(t.values).slice(0,n);t.times=new Float32Array([0,1]);t.values=new Float32Array([...v,...v]);return t;});
  const joint=(bone:T.Object3D,yaw:number[],pitch:number[])=>{
   const parent=bone.parent!.getWorldQuaternion(new T.Quaternion()),inverse=parent.clone().invert(),base=bone.quaternion.clone(),values:number[]=[];
   for(let i=0;i<times.length;i++){
    const q=new T.Quaternion().setFromAxisAngle(up,yaw[i]).multiply(new T.Quaternion().setFromAxisAngle(right,pitch[i]));
    inverse.clone().multiply(q).multiply(parent).multiply(base).normalize().toArray(values,values.length);
   }
   const binding=bone.name+'.quaternion',index=tracks.findIndex(t=>t.name===binding);if(index>=0)tracks.splice(index,1);
   tracks.push(new T.QuaternionKeyframeTrack(binding,times,values));
  };
  joint(torso,reverse?[0,.15,.25,.06,-.18,-.12,-.03,0]:[0,-.08,-.16,.06,.22,.15,.04,0],[0,-.035,-.04,.03,.06,.025,0,0]);
  joint(arm,reverse?[0,.6,.9,.1,-.2,-.12,-.03,0]:[0,-.12,-.18,.05,.7,.5,.12,0],[0,-.2,-.32,.08,.16,.10,.03,0]);
  joint(forearm,reverse?[0,1,1.5,.9,-.15,-.1,0,0]:[0,-.1,-.15,.9,1.5,1.1,.2,0],[0,-.12,-.22,.12,.18,.14,.05,0]);
  return new T.AnimationClip(name,1,tracks);
 };
 // The cannon attachment is sampled with every original/generated bone pose.
 const generated=[make('Doomsday Sword Horizontal',false),make('Doomsday Sword Return',true)];
 mixer.stopAllAction();mixer.uncacheRoot(root);return [...clips,...generated];
}
