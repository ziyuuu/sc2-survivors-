import type * as THREE from 'three';

export type UnitShader=Parameters<THREE.Material['onBeforeCompile']>[0];
export interface UnitPoseUniforms {atlas:THREE.DataTexture;bind:THREE.Matrix4;asset:THREE.Matrix4;pivot:THREE.Vector3;accent:THREE.Vector2}
/** One original-pose program for colour, directional shadows and contact depth. */
export function compileUnitPose(shader:UnitShader,pose:UnitPoseUniforms){
 shader.uniforms.turretPivot={value:pose.pivot};shader.uniforms.unitBoneAtlas={value:pose.atlas};shader.uniforms.unitBind={value:pose.bind};shader.uniforms.unitAsset={value:pose.asset};shader.uniforms.unitAccentRange={value:pose.accent};
 shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
  attribute vec2 unitAim; attribute float unitTurret; uniform vec3 turretPivot;
  vec3 aimTurret(vec3 p){float s=unitAim.x,c=unitAim.y;return vec3(p.x*c+p.z*s,p.y,p.z*c-p.x*s);}
  attribute vec4 unitPose; attribute vec4 unitBlend; attribute float unitUpper; attribute vec4 skinIndex; attribute vec4 skinWeight;
  uniform sampler2D unitBoneAtlas; uniform mat4 unitBind; uniform mat4 unitAsset;
  varying float unitHit; varying float specialTier; varying float localAccent; attribute float unitTier; uniform vec2 unitAccentRange;
  mat4 unitBone(float bone,float frame){int x=int(bone)*4;int y=int(frame);return mat4(texelFetch(unitBoneAtlas,ivec2(x,y),0),texelFetch(unitBoneAtlas,ivec2(x+1,y),0),texelFetch(unitBoneAtlas,ivec2(x+2,y),0),texelFetch(unitBoneAtlas,ivec2(x+3,y),0));}
  mat4 unitFrame(float frame){mat4 a=unitBone(skinIndex.x,frame)*skinWeight.x;
   if(skinWeight.y>0.0)a+=unitBone(skinIndex.y,frame)*skinWeight.y;
   if(skinWeight.z>0.0)a+=unitBone(skinIndex.z,frame)*skinWeight.z;
   if(skinWeight.w>0.0)a+=unitBone(skinIndex.w,frame)*skinWeight.w;return a;}
  mat4 unitSkin(){mat4 a=unitFrame(unitPose.x);
   if(unitPose.z>0.001)a=a*(1.0-unitPose.z)+unitFrame(unitPose.y)*unitPose.z;
   if(unitBlend.w>0.001&&unitUpper>0.001){mat4 b=unitFrame(unitBlend.x);if(unitBlend.z>0.001)b=b*(1.0-unitBlend.z)+unitFrame(unitBlend.y)*unitBlend.z;float w=unitBlend.w*unitUpper;a=a*(1.0-w)+b*w;}
   return unitAsset*a*unitBind;}`)
  .replace(/void main\(\)\s*\{/, 'void main() {\nmat4 unitTransform=unitSkin();')
  .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=mat3(unitTransform)*objectNormal;objectNormal=mix(objectNormal,aimTurret(objectNormal),unitTurret);')
  .replace('#include <begin_vertex>','vec3 transformed=(unitTransform*vec4(position,1.0)).xyz; transformed=mix(transformed,aimTurret(transformed-turretPivot)+turretPivot,unitTurret); unitHit=unitPose.w; specialTier=unitTier; localAccent=smoothstep(unitAccentRange.x,unitAccentRange.y,position.y);');
}
