import * as THREE from 'three';

const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const noise=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03)+.15*noise(p*4.07);}
`;
/** A filled oval vortex with a turbulent luminous rim; no wire rings or rotating hoop. */
export function makeArcanePortal(){
 const root=new THREE.Group();root.name='arcane-portal';
 const face=new THREE.Mesh(new THREE.PlaneGeometry(4.4,5.3),new THREE.ShaderMaterial({
  uniforms:{time:{value:0}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform float time;${noise}
  void main(){
   vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);if(r>1.)discard;
   vec2 spun=vec2(cos(a-r*5.+time*.38),sin(a-r*5.+time*.38))*r;
   float cloud=fbm(spun*5.5+vec2(time*.075,-time*.1));
   float flow=pow(.5+.5*sin(a*3.+r*16.-time*1.5+cloud*5.),5.);
   float rim=exp(-pow((r-.81)/(.022+cloud*.034),2.));
   float halo=exp(-pow((r-.81)/.13,2.));
   float inside=1.-smoothstep(.72,.84,r);
   float core=(1.-smoothstep(0.,.65,r))*.2;
   vec3 color=mix(vec3(.012,.035,.11),vec3(.045,.23,.48),cloud)*inside;
   color+=vec3(.03,.29,.76)*flow*inside*.65+vec3(.15,.64,1.)*halo*.38;
   color+=vec3(.57,.88,1.)*rim*1.9+vec3(.17,.25,.5)*core;
   float alpha=max(inside*.92,clamp(halo*.58+rim,0.,1.))*(1.-smoothstep(.93,1.,r));
   gl_FragColor=vec4(color,alpha);
  }`,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
 }));face.name='portal-vortex';face.position.y=2.5;root.add(face);
 const sigil=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform float time;${noise}
 void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x)+time*.055;
 float bands=exp(-pow((r-.71)/.009,2.))*.3+exp(-pow((r-.87)/.008,2.))*.45;
 float cell=mod(a+3.14159,6.28318/12.)/(6.28318/12.);float stroke=step(abs(cell-.5),.055)*step(.74,r)*step(r,.84);
 float slash=step(abs(cell-.5-(r-.79)*2.),.04)*step(.765,r)*step(r,.82);
 float rune=max(stroke,slash);float alpha=(bands+rune*.65)*(1.-smoothstep(.9,.97,r));
 if(alpha<.01)discard;gl_FragColor=vec4(.14,.57,.85,alpha*.7);}`,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
 sigil.name='portal-ground-sigil';sigil.rotation.x=-Math.PI/2;sigil.position.y=.035;root.add(sigil);return root;
}
const facing=new THREE.Vector3();
export function updateArcanePortal(root:THREE.Group,time:number,camera:THREE.Camera){
 camera.getWorldPosition(facing);const face=root.children[0];face.rotation.y=Math.atan2(facing.x-root.position.x,facing.z-root.position.z);
 for(const child of root.children)if(child instanceof THREE.Mesh&&(child.material as THREE.ShaderMaterial).uniforms?.time)(child.material as THREE.ShaderMaterial).uniforms.time.value=time;
}
