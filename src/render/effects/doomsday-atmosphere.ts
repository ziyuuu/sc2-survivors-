import * as T from 'three';
import {displacementFrame} from './source/displacement';

export type AtmosphericEffect = 'mist' | 'glow' | 'vortex' | 'well' | 'scan' | 'shield' | 'lens';
/** The atlas belongs to BattleEffects and is shared with the original Terran smoke pass. */
export type SmokeAtlas = () => T.ShaderMaterial | undefined;

const fragments: Record<AtmosphericEffect,string> = {
 mist: `
  vec2 uv = spin(p, seed * 6.28 + age * .34) * .45 + .5;
  float frame = floor(mod(seed * 13. + age * 12., max(1., grid.x * grid.y)));
  vec2 cell = vec2(mod(frame, grid.x), grid.y - 1. - floor(frame / grid.x));
  vec4 smoke = texture2D(atlas, (uv + cell) / grid);
  float grain = noise(uv * 6. + vec2(seed, -age)) * .65 + noise(uv * 13. - age * .4) * .35;
  float density = hasAtlas ? smoke.a * dot(smoke.rgb, vec3(.32,.46,.22)) : grain * grain;
  float feather = 1.-smoothstep(.24,1.,r);
  ink = tint * (.56 + .64 * grain);
  alpha = feather * (.27*grain + .73*min(1.,density*2.8)) * (.74 + .26 * grain);`,
 glow: `
  float hot = exp(-r*r*21.);
  ink = mix(tint, vec3(1.,.99,.94), hot*.52);
  alpha = (hot + .30*exp(-r*r*4.)) * (1.-smoothstep(.72,1.,r));`,
 vortex: `
  float a = atan(p.y,p.x) + seed * 6.28;
  float orbit = r + .025*sin(3.*a+age*4.) + .016*sin(7.*a-age*3.);
  float edge = .40 + .13*sin(age*3.14);
  float rim = exp(-abs(orbit-edge)*28.);
  float spiral = .5+.5*cos(2.*a + r*12. + age*10.);
  float stream = pow(spiral,5.) * exp(-abs(orbit-edge-.10)*6.);
  float crescent = .35+.65*pow(.5+.5*cos(a-age*3.),2.);
  float horizon = 1.-smoothstep(edge-.065,edge+.04,orbit);
  ink = mix(vec3(.002,.001,.005),tint,clamp(rim*crescent+stream*.58,0.,1.));
  ink += vec3(.48,.37,.28)*rim*crescent;
  alpha = max(horizon*.95,(rim+stream*.65)*(1.-smoothstep(.72,1.,r)));`,
 well: `
  vec2 q=spin(p,(seed-.5)*.8+.30);
  float eye=length(q*vec2(1.,1.14));
  float angle=atan(q.y,q.x);
  float disk=length(vec2(q.x,q.y*3.1));
  float inner=1.-smoothstep(.19,.29,eye);
  float rim=exp(-32.*abs(eye-.275))*(.32+.68*pow(.5+.5*sin(angle-.6),2.));
  float lane=exp(-7.*abs(disk-.53))*(1.-smoothstep(.68,.94,disk));
  float stream=pow(.5+.5*cos(angle*2.+disk*9.+age*8.),2.);
  float front=1.-smoothstep(-.07,.07,q.y);
  float dust=lane*(.32+.68*stream)*max(front,1.-inner);
  ink=mix(vec3(.008,.005,.016),tint,clamp(rim+dust*.85,0.,1.));
  ink+=vec3(.47,.36,.42)*rim;
  alpha=max(.83*inner,max(rim,dust))*(1.-smoothstep(.74,1.,r));`,
 lens: `
  vec2 screen=gl_FragCoord.xy/viewport;
  if(gl_FragCoord.z>texture2D(sceneDepth,screen).r+.000001)discard;
  float rim=exp(-abs(r-.44)*6.)*(1.-smoothstep(.72,1.,r));
  vec2 footprint=2./max(fwidth(local),vec2(.002));
  vec2 bend=(p+vec2(-p.y,p.x)*.34)*rim*sin(age*3.14159)*params.x;
  gl_FragColor=vec4(bend*footprint*.087/viewport,0.,0.);`,
 shield: `
  vec2 panel=spin(p,.18)*(1.+r*r*.35)*3.4;
  vec2 lattice=vec2(1.,1.732);
  vec2 a=mod(panel,lattice)-lattice*.5,b=mod(panel-lattice*.5,lattice)-lattice*.5;
  vec2 hex=dot(a,a)<dot(b,b)?a:b;
  float side=max(abs(hex.x),dot(abs(hex),vec2(.5,.866)));
  float seam=smoothstep(.42,.49,side);
  float wave=exp(-10.*abs(r-age));
  float glint=.5+.5*sin(dot(floor(panel-hex+.5),vec2(5.,2.))+age*6.);
  ink=mix(tint,vec3(.55,.38,.88),.33*glint);
  ink=mix(ink,vec3(.86,1.,.98),wave*(.36+.62*seam));
  alpha=(.10+.52*seam*(.46+.54*glint)+wave*.78)*(1.-smoothstep(.38,.98,r));`,
 scan: `
  vec2 uv = spin(p, (seed-.5)*.45);
  float bar = 1.-smoothstep(.032,.13,abs(uv.y - mix(-.7,.72,age)));
  float tracks = smoothstep(.28,.43,fract(uv.x*3.8+.25));
  float path = abs(uv.y+.19*sin(floor((uv.x+1.)*3.)*1.8));
  float trace = (1.-smoothstep(.018,.075,path)) * (1.-smoothstep(.05,.39,abs(uv.x-age*1.8+.9)));
  float via=(1.-smoothstep(.045,.12,length(vec2(fract(uv.x*3.+.5)-.5,uv.y+.19*sin(floor((uv.x+1.)*3.)*1.8))))) * tracks;
  ink = mix(tint,vec3(.85,1.,.98),bar*.55+via*.30);
  alpha = (bar*(.48+.52*tracks)+trace+via*.64) * (1.-smoothstep(.4,1.,r));`
};

export function atmosphereMaterial(kind:AtmosphericEffect) {
 const field=kind==='lens';
 return new T.ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:!field,forceSinglePass:true,
  blending:field?T.CustomBlending:kind==='glow'||kind==='scan'?T.AdditiveBlending:T.NormalBlending,
  ...(field?{blendSrc:T.OneFactor,blendDst:T.OneFactor,toneMapped:false}:{}),
  uniforms:{atlas:{value:null},grid:{value:new T.Vector2(1,1)},hasAtlas:{value:false},
   ...(field?{sceneDepth:displacementFrame.depth,viewport:displacementFrame.size}:{})},
  vertexShader:`
   attribute vec3 dsParams;
   varying vec2 local; varying vec3 tint; varying vec3 params;
   void main(){
    local=uv*2.-1.; tint=instanceColor; params=dsParams;
    vec4 center=modelViewMatrix*instanceMatrix[3];
    center.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
    gl_Position=projectionMatrix*center;
   }`,
  fragmentShader:`
   uniform sampler2D atlas; uniform vec2 grid; uniform bool hasAtlas;
   ${field?'uniform sampler2D sceneDepth; uniform vec2 viewport;':''}
   varying vec2 local; varying vec3 tint; varying vec3 params;
   vec2 spin(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c)*p;}
   float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1)),f.x),f.y);}
   void main(){
    vec2 p=local; float r=length(p); if(r>=1.)discard;
    float age=params.y,seed=params.z,alpha=0.;vec3 ink=tint;
    ${fragments[kind]}
    ${field?'':`alpha=clamp(alpha*params.x,0.,1.);if(alpha<.003)discard;
    gl_FragColor=vec4(ink,alpha);
    #include <colorspace_fragment>`}
   }`
 });
}
