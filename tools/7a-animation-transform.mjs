/** Isolated candidate applied to the frozen baseline by the diagnostic builder. */
export function fuseAnimationSampling(source){
 const start=source.indexOf('  for(const clip of clips)for(const side of mountSides)'),end=source.indexOf('  mixer.stopAllAction();if(rest)',start);
 if(start<0||end<0)throw Error('Frozen animation source boundary changed');
 const old=source.slice(start,end),nodes=old.slice(old.indexOf('  const nodes:'),old.indexOf('  const textures='));
 return source.slice(0,start)+nodes+`  const textures=new Map<string,THREE.DataTexture>();
  const palettes=new Map<string,{skeleton:THREE.Skeleton;bones:number;data:Float32Array}>();
  for(const n of nodes){const key=paletteKey(n.skeleton);if(palettes.has(key))continue;const bones=n.skeleton.bones.length;this.boneCount=Math.max(this.boneCount,bones);palettes.set(key,{skeleton:n.skeleton,bones,data:new Float32Array(total*bones*16)});}
  for(const clip of clips){
   const p=this.clips.get(clip.name)!,mounts:{side:string|undefined;attachment:THREE.Object3D;points:THREE.Vector3[]}[]=[];
   for(const side of mountSides){const names=weaponAttachmentNames(clip.name,profile,side),attachment=names.map(name=>gltf.scene.getObjectByName(name)).find(Boolean);if(attachment)mounts.push({side,attachment,points:[]});}
   mixer.stopAllAction();const action=mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
   for(let f=0;f<p.frames;f++){
    mixer.setTime(f/(p.frames-1)*clip.duration);gltf.scene.updateMatrixWorld(true);
    for(const mount of mounts)mount.points.push(mount.attachment.getWorldPosition(new THREE.Vector3()).applyMatrix4(this.normalization));
    for(const palette of palettes.values()){palette.skeleton.update();if(!palette.skeleton.boneMatrices)throw Error('Missing bone palette');palette.data.set(palette.skeleton.boneMatrices,(p.offset+f)*palette.bones*16);}
   }
   for(const mount of mounts)this.weaponTracks.set(clip.name+(mount.side?':'+mount.side:''),mount.points);
  }
  this.weapon.copy(this.weaponAt('attack',.05));
  for(const [key,{data,bones}]of palettes){
   if(!data.every(v=>Number.isFinite(v)&&Math.abs(v)<=65504))throw Error('Original pose has invalid or unbounded bone transforms');
   const packed=Uint16Array.from(data,THREE.DataUtils.toHalfFloat);
   const tex=new THREE.DataTexture(packed,bones*4,total,THREE.RGBAFormat,THREE.HalfFloatType);tex.magFilter=tex.minFilter=THREE.NearestFilter;tex.needsUpdate=true;textures.set(key,tex);this.textureBytes+=packed.byteLength;
  }
`+source.slice(end);
}

export function preparedAnimationSampling(source,helper){
 const signature='constructor(gltf:GLTF,scene:THREE.Scene,height:number,normalization?:THREE.Matrix4,unitScale=1,profile?:string,referenceBodyHeight?:number){';
 const start=source.indexOf(signature),end=source.indexOf('  for(const n of nodes){const geometry=',start);
 if(start<0||end<0)throw Error('Frozen constructor boundary changed');
 const create=`static async create(gltf:GLTF,scene:THREE.Scene,height:number,normalization?:THREE.Matrix4,unitScale=1,profile?:string,referenceBodyHeight?:number){
  const began=performance.now(),data=await preparePoseDataAsync([gltf,height,normalization,unitScale,profile,referenceBodyHeight]);traceConstructor('animation.sample-async',profile??gltf.scene.name,began);
  return new AnimatedBatch(gltf,scene,height,normalization,unitScale,profile,referenceBodyHeight,data);
 }
 `;
 const initial=signature.slice(0,-2)+`,prepared?:PosePreparation){const __7aStart=performance.now();
  const data=prepared??preparePoseData(gltf,height,normalization,unitScale,profile,referenceBodyHeight);
  this.actions=data.actions;this.scale=data.scale;this.normalization=data.normalization;this.bodyHeight=data.bodyHeight;this.bodyRadius=data.bodyRadius;this.bodyOutline=data.bodyOutline;this.turretPivot.copy(data.turretPivot);this.clips=data.clips;this.weaponTracks=data.weaponTracks;this.weapon.copy(data.weapon);this.boneCount=data.boneCount;
  const nodes=data.nodes,turretBones=data.turretBones,paletteKey=posePaletteKey,textures=new Map<string,THREE.DataTexture>();
  for(const [key,palette]of data.palettes){const tex=new THREE.DataTexture(palette.packed,palette.bones*4,data.totalFrames,THREE.RGBAFormat,THREE.HalfFloatType);tex.magFilter=tex.minFilter=THREE.NearestFilter;tex.needsUpdate=true;textures.set(key,tex);this.textureBytes+=palette.packed.byteLength;}
`;
 return 'import {preparePoseData,preparePoseDataAsync,posePaletteKey,type PosePreparation} from '+JSON.stringify(helper)+';\n'+source.slice(0,start)+create+initial+source.slice(end).replace('mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);','traceConstructor("animation.prepare",profile??gltf.scene.name,__7aStart);');
}
