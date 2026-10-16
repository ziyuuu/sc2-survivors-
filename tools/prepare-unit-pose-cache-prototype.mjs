import fs from 'node:fs/promises';import path from 'node:path';
const root='reports/local/equipment-fx-performance-20261016',out=root+'/prototypes/pose-cache',map={};
const read=file=>fs.readFile(root+'/source-r6/'+file,'utf8');
async function put(file,text){const dest=out+'/'+file;await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,text);map[file]=dest;}
await put('src/render/units/unit-pose-cache.ts',await fs.readFile('tools/source-pose-cache-prototype.ts','utf8'));
let batch=await read('src/render/units/animated-batch.ts');
batch="import {UnitPoseCache} from './unit-pose-cache';\n"+batch;
batch=batch.replace('const poseUniforms={atlas:',"const poseCache=new UnitPoseCache(textures.get(paletteKey(n.skeleton))!,pose,blend);\n   const poseUniforms={cache:poseCache,atlas:");
batch=batch.replace('scene.add(mesh);this.meshes.push(mesh);','mesh.userData.unitPoseCache=poseCache;scene.add(mesh);this.meshes.push(mesh);');
batch=batch.replace('for(const mesh of this.meshes){mesh.removeFromParent();','for(const mesh of this.meshes){mesh.userData.unitPoseCache?.dispose();mesh.removeFromParent();');
batch=batch.replace('sc2-original-gpu-bones-v11:','sc2-original-gpu-bones-cache-v1:');await put('src/render/units/animated-batch.ts',batch);
let shader=await read('src/render/units/unit-pose-shader.ts');
shader="import type {UnitPoseCache} from './unit-pose-cache';\n"+shader;
shader=shader.replace('atlas:THREE.DataTexture;','cache?:UnitPoseCache;atlas:THREE.DataTexture;');
shader=shader.replace(' shader.uniforms.turretPivot='," shader.uniforms.unitPoseReady=pose.cache?.ready??{value:0};shader.uniforms.unitPoseCache=pose.cache?.texture??{value:null};\n shader.uniforms.turretPivot=");
shader=shader.replace('  mat4 unitSkin(){mat4 a=unitFrame(unitPose.x);',`  uniform float unitPoseReady;uniform sampler2D unitPoseCache;
  mat4 cachedBone(float bone,int attack){int x=int(bone)*4+attack*textureSize(unitBoneAtlas,0).x;int y=gl_InstanceID;return mat4(texelFetch(unitPoseCache,ivec2(x,y),0),texelFetch(unitPoseCache,ivec2(x+1,y),0),texelFetch(unitPoseCache,ivec2(x+2,y),0),texelFetch(unitPoseCache,ivec2(x+3,y),0));}
  mat4 cachedFrame(int attack){mat4 a=cachedBone(skinIndex.x,attack)*skinWeight.x;if(skinWeight.y>0.0)a+=cachedBone(skinIndex.y,attack)*skinWeight.y;if(skinWeight.z>0.0)a+=cachedBone(skinIndex.z,attack)*skinWeight.z;if(skinWeight.w>0.0)a+=cachedBone(skinIndex.w,attack)*skinWeight.w;return a;}
  mat4 unitSkin(){if(unitPoseReady>.5){mat4 a=cachedFrame(0);if(unitBlend.w>0.001&&unitUpper>0.001){float w=unitBlend.w*unitUpper;a=a*(1.0-w)+cachedFrame(1)*w;}return unitAsset*a*unitBind;}mat4 a=unitFrame(unitPose.x);`);
await put('src/render/units/unit-pose-shader.ts',shader);
let renderer=await read('src/render/scene/battle-renderer.ts');renderer="import {prepareUnitPoseCaches} from '../units/unit-pose-cache';\n"+renderer;
renderer=renderer.replace('try{this.sceneShadows.prepare();','try{prepareUnitPoseCaches(this.scene,this.renderer);this.sceneShadows.prepare();');await put('src/render/scene/battle-renderer.ts',renderer);
await fs.writeFile(out+'/overrides.json',JSON.stringify(map,null,2));console.log(out);
