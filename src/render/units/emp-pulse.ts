import * as THREE from 'three';

/** Soft volumetric lobes follow the original SC2 EMP's blue-white energy core. */
export function empPulseMaterial(core:boolean){
 return new THREE.ShaderMaterial({
  name:core?'EMP-core':'EMP-pulse',uniforms:{time:{value:0},core:{value:core?1:0}},
  vertexShader:`varying vec3 vNormal;varying vec3 vView;varying vec3 vLocal;
  void main(){vec4 p=modelViewMatrix*vec4(position,1.);vView=-p.xyz;vNormal=normalMatrix*normal;vLocal=position;gl_Position=projectionMatrix*p;}`,
  fragmentShader:`varying vec3 vNormal;varying vec3 vView;varying vec3 vLocal;uniform float time;uniform float core;
  void main(){float facing=abs(dot(normalize(vNormal),normalize(vView)));
   float soft=pow(facing,mix(3.5,1.5,core));
   float drift=.88+.12*sin(vLocal.x*17.+vLocal.y*13.+vLocal.z*9.-time*2.);
   vec3 color=mix(vec3(.04,.34,1.),vec3(.64,.91,1.),core);
   float alpha=soft*mix(.19,.78,core)*drift;
   gl_FragColor=vec4(color*mix(1.0,1.7,core),alpha);
  }`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide,toneMapped:false,
 });
}
