import * as THREE from 'three';
/** Exact frame interpolation shared by colour and depth passes. No pose-rate reduction. */
export class UnitPoseCache {
 readonly ready={value:0};readonly texture:{value:THREE.Texture};
 private target:THREE.WebGLRenderTarget;private scene=new THREE.Scene();private camera=new THREE.Camera();private mesh:THREE.Mesh;private material:THREE.RawShaderMaterial;private capacity=1;
 constructor(atlas:THREE.DataTexture,pose:THREE.BufferAttribute,blend:THREE.BufferAttribute){
  const bones=atlas.image.width/4;
  this.target=new THREE.WebGLRenderTarget(bones*8,1,{type:THREE.FloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false,stencilBuffer:false});this.texture={value:this.target.texture};
  const geometry=new THREE.InstancedBufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,1,-1,1,1,-1,1],2));geometry.setIndex([0,1,2,0,2,3]);geometry.setAttribute('unitPose',pose);geometry.setAttribute('unitBlend',blend);
  this.material=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,depthTest:false,depthWrite:false,blending:THREE.NoBlending,uniforms:{atlas:{value:atlas},height:{value:1},bones:{value:bones}},vertexShader:`precision highp float;in vec2 position;in vec4 unitPose;in vec4 unitBlend;uniform float height;flat out vec4 pose;flat out vec4 blend;
   void main(){pose=unitPose;blend=unitBlend;gl_Position=vec4(position.x,(float(gl_InstanceID)+(position.y+1.0)*.5)/height*2.0-1.0,0.,1.);}`,
   fragmentShader:`precision highp float;precision highp sampler2D;uniform sampler2D atlas;uniform float bones;flat in vec4 pose;flat in vec4 blend;out vec4 result;
   void main(){int x=int(gl_FragCoord.x);bool attack=x>=int(bones)*4;int sourceX=x%(int(bones)*4);vec4 p=attack?blend:pose;vec4 a=texelFetch(atlas,ivec2(sourceX,int(p.x)),0);if(p.z>0.001)a=a*(1.0-p.z)+texelFetch(atlas,ivec2(sourceX,int(p.y)),0)*p.z;result=a;}`});
  this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.frustumCulled=false;this.scene.add(this.mesh);
 }
 render(renderer:THREE.WebGLRenderer,count:number){this.ready.value=0;if(!count||!renderer.extensions.has('EXT_color_buffer_float'))return;
  if(count>this.capacity){this.capacity=2**Math.ceil(Math.log2(count));this.target.setSize(this.target.width,this.capacity);this.material.uniforms.height.value=this.capacity;}
  (this.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount=count;
  const previous=renderer.getRenderTarget(),auto=renderer.autoClear,xr=renderer.xr.enabled;
  try{renderer.xr.enabled=false;renderer.autoClear=false;renderer.setRenderTarget(this.target);renderer.render(this.scene,this.camera);this.ready.value=1;}finally{renderer.setRenderTarget(previous);renderer.autoClear=auto;renderer.xr.enabled=xr;}
 }
 dispose(){this.target.dispose();this.mesh.geometry.dispose();this.material.dispose();}
}
export function prepareUnitPoseCaches(scene:THREE.Scene,renderer:THREE.WebGLRenderer){scene.traverse(n=>{const mesh=n as THREE.InstancedMesh;const cache=mesh.userData.unitPoseCache as UnitPoseCache|undefined;if(cache)cache.render(renderer,mesh.visible?mesh.count:0);});}
