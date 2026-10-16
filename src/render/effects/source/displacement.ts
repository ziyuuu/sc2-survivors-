import * as THREE from 'three';
import {sampleMaterialTrack,type MaterialRef,type MaterialLayer,type UnitMaterialPose} from '../../materials/source-tracks';
import {bindSceneTextures} from '../../materials/scene-textures';
import type {SourceEffectDefinition,SourceDisplacementMaterial} from './types';

/** Isolated from the beauty pass, shadows, contact and picking. */
export const DISPLACEMENT_LAYER=31;
export interface DisplacementResource {definition:SourceEffectDefinition;source:SourceDisplacementMaterial;textures:{normal?:THREE.Texture;strength?:THREE.Texture}}
export const displacementFrame={depth:{value:null as THREE.Texture|null},size:{value:new THREE.Vector2(1,1)}};
const rows=7;
export class DisplacementSurface {
 readonly material:THREE.ShaderMaterial;readonly texture:THREE.DataTexture;readonly data:Float32Array;
 constructor(readonly resource:DisplacementResource,readonly capacity=1,particles=false){
  this.data=new Float32Array(capacity*rows*4);this.texture=new THREE.DataTexture(this.data,capacity,rows,THREE.RGBAFormat,THREE.FloatType);this.texture.needsUpdate=true;
  const {source,textures}=resource;
  const layer=(name:'normal'|'strength',i:number)=>{
   const l=source.layers[name];if(!l)return `vec4 ${name}Value(){return vec4(${name==='normal'?'0.5,0.5,1.0,1.0':'1.0'});}`;
   if(![0,6].includes(l.uv))throw Error('Unsupported displacement UV '+resource.definition.id+':'+l.uv);
   const f=l.fresnel,base=`clamp(${f.min.toFixed(8)}+pow(max(0.0,1.0-abs(dot(finiteNormal(fxNormal),finiteNormal(-fxView)))),${f.exponent.toFixed(8)})*${f.maxOffset.toFixed(8)},0.0,1.0)`;
   const fresnel=f.type===2?`(1.0-${base})`:f.type===1?base:'1.0';
   const sample=l.flags&0x400?`state(${i+2})`:textures[name]?`texture2D(${name}Map,uv)`:(name==='normal'?'vec4(0.5,0.5,1.0,1.0)':'vec4(1.0)');
   // Normal PNGs are already decoded from original AG channels. Never apply
   // the scalar strength channel selector a second time to that vector.
   const channel=name==='strength'&&l.channel>=2?`v=vec4(v.${['','','a','r','g','b'][l.channel]});`:'';
   const flip=l.flipbook,book=flip&&flip.rows>0&&flip.cols>0?`float frame=mod(floor(p.w),${(flip.rows*flip.cols).toFixed(1)});uv=(uv+vec2(mod(frame,${flip.cols.toFixed(1)}),floor(frame/${flip.cols.toFixed(1)})))/vec2(${flip.cols.toFixed(1)},${flip.rows.toFixed(1)});`:'';
   return `uniform sampler2D ${name}Map;vec4 ${name}Value(){vec4 p=state(${i}),u=state(${i+1});vec2 uv=${l.uv===6?'fxParticleUV':'fxUV'}*u.zw;float s=sin(p.z),c=cos(p.z);uv=mat2(c,-s,s,c)*(uv-.5)+.5+u.xy;${book}vec4 v=${sample};${channel}${l.flags&16?'v.rgb=1.0-v.rgb;':''}v.rgb=v.rgb*p.x+p.y;${l.flags&32?'v.rgb=clamp(v.rgb,0.0,1.0);':''}v.rgb*=${fresnel};return v;}`;
  };
  this.material=new THREE.ShaderMaterial({name:'original-screen-displacement',uniforms:{fxState:{value:this.texture},sceneDepth:displacementFrame.depth,viewport:displacementFrame.size,normalMap:{value:textures.normal??null},strengthMap:{value:textures.strength??null}},
   vertexShader:`#include <common>
    #include <skinning_pars_vertex>
    flat varying int fxSlot;varying vec2 fxUV;varying vec2 fxParticleUV;varying vec3 fxNormal;varying vec3 fxView;varying float fxAlpha;
    ${particles?'attribute float sourceMaterialSlot;attribute vec4 sourceColor;attribute vec4 sourceUv;attribute float sourceSegmentedUv;':''}
    void main(){
     #include <beginnormal_vertex>
     #include <skinbase_vertex>
     #include <skinnormal_vertex>
     #include <defaultnormal_vertex>
     #include <begin_vertex>
     #include <skinning_vertex>
     #include <project_vertex>
     fxSlot=${particles?'int(sourceMaterialSlot)':'0'};fxUV=${particles?'mix(uv,uv*sourceUv.zw+sourceUv.xy,sourceSegmentedUv)':'uv'};fxParticleUV=${particles?'uv*sourceUv.zw+sourceUv.xy':'uv'};fxAlpha=${particles?'sourceColor.a':'1.0'};fxNormal=transformedNormal;fxView=mvPosition.xyz;
    }`,
   fragmentShader:`flat varying int fxSlot;varying vec2 fxUV;varying vec2 fxParticleUV;varying vec3 fxNormal;varying vec3 fxView;varying float fxAlpha;uniform sampler2D fxState;uniform sampler2D sceneDepth;uniform vec2 viewport;
    vec4 state(int row){return texelFetch(fxState,ivec2(fxSlot,row),0);}
    vec3 finiteNormal(vec3 v){return v*inversesqrt(max(dot(v,v),0.000000000001));}
    ${layer('normal',0)}${layer('strength',3)}
    void main(){vec2 screenUV=gl_FragCoord.xy/viewport;float depth=texture2D(sceneDepth,screenUV).x;if(gl_FragCoord.z>depth+0.000001)discard;
     vec3 n=finiteNormal(fxNormal);vec3 px=dFdx(fxView),py=dFdy(fxView);vec2 tx=dFdx(fxUV),ty=dFdy(fxUV);
     vec3 t=finiteNormal(px*ty.y-py*tx.y),b=finiteNormal(-px*ty.x+py*tx.x);vec3 mapNormal=normalValue().xyz*2.0-1.0;
     vec3 bent=finiteNormal(t*mapNormal.x+b*mapNormal.y+n*mapNormal.z);
     float strength=state(6).x*strengthValue().r*fxAlpha;vec2 offset=bent.xy*strength/viewport;
     gl_FragColor=vec4(offset,0.0,0.0);
    }`,side:THREE.DoubleSide,transparent:true,depthWrite:false,depthTest:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,toneMapped:false});
  this.material.forceSinglePass=true;bindSceneTextures(this.material,Object.values(textures));this.write(0,{clip:'',seconds:0});
 }
 write(index:number,pose:UnitMaterialPose){
  const {source,definition}=this.resource,tracks=definition.materialProfile.clips.find(c=>c.name===pose.clip)?.tracks;
  const read=(ref:MaterialRef)=>sampleMaterialTrack(tracks?.find(t=>t.id===ref.id),pose.seconds,ref);
  const row=(r:number,v:number[])=>this.data.set(v,(r*this.capacity+index)*4);
  const layer=(l:MaterialLayer|null,r:number)=>{if(!l)return;const offset=read(l.uvOffset),scale=read(l.uvTiling),angle=read(l.uvAngle),color=read(l.color);
   row(r,[Number(read(l.multiply))*(l.brightness?Number(read(l.brightness)):1),Number(read(l.add)),typeof angle==='object'?angle?.z??0:angle??0,l.flipbook?Number(read(l.flipbook.frame)):0]);
   row(r+1,[typeof offset==='object'?offset?.x??0:0,typeof offset==='object'?offset?.y??0:0,typeof scale==='object'?scale?.x??1:1,typeof scale==='object'?scale?.y??1:1]);
   row(r+2,typeof color==='object'&&color?['r','g','b','a'].map(k=>(color[k]??255)/255):[1,1,1,1]);
  };layer(source.layers.normal,0);layer(source.layers.strength,3);row(6,[Number(read(source.strength)),0,0,0]);
 }
 flush(){this.texture.needsUpdate=true;}
}
