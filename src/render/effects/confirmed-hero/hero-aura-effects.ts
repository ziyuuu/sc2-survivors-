import * as THREE from 'three';
import type {BattleRenderer} from '../../scene/battle-renderer';
import type {World} from '../../../simulation/world';
import {TERRAN_HERO_IDS} from '../../../data/terran-heroes';
import {isProtossHero} from '../../../data/protoss-heroes';
import {isZergHero} from '../../../data/zerg-heroes';
import type {HeroId} from '../../../data/heroes';
import {commitInstances} from '../../units/instance-updates';
const colors:Partial<Record<HeroId,number>>={artanis:0xf4d68b,zeratul:0x72dbb2,alarak:0xe75277,fenix:0x82c9f0,vorazun:0xb394e6,purifier_flagship:0xffdf90,raynor:0xffc167,tychus:0xff7a43,nova:0x987eff,swann:0x76e3a8,tosh:0xbd75ef,yamato_battlecruiser:0xffc985,kerrigan:0xc994ff,zagara:0xc3ed63,dehaka:0xf1b466,stukov:0xabc75e,niadra:0x81e6ab,hots_leviathan:0xab96ff};
const innerColors:Partial<Record<HeroId,number>>={artanis:0x9ed9fa,zeratul:0xd7fff2,alarak:0xeec4e5,fenix:0xffe5a1,vorazun:0xa5d0ee,purifier_flagship:0xa3d6fc,nova:0x6acff0,yamato_battlecruiser:0x80dce8,kerrigan:0xe9b2ff,zagara:0x89d68a,dehaka:0xffde9c,stukov:0x88c8aa,niadra:0xb4f5c3,hots_leviathan:0xafea7b};
const zergRadii:Partial<Record<HeroId,number>>={kerrigan:1.3,zagara:2.1,dehaka:1.8,stukov:1.2,niadra:2.1};
const protossRadii:Partial<Record<HeroId,number>>={artanis:1.2,zeratul:1.2,alarak:1.3,fenix:1.8,vorazun:1.2};
const object=new THREE.Object3D(),tint=new THREE.Color();
/** Existing-texture foot sigils; visual size is separate from the unchanged gameplay radius. No text labels. */
export class HeroAuraEffects {
 private mesh?:THREE.InstancedMesh;private data?:THREE.InstancedBufferAttribute;count=0;
 constructor(private view:BattleRenderer,private world:World,private ids:readonly HeroId[]=TERRAN_HERO_IDS){}
 prepare(){const source=this.view.fx.batches.get('fx.hero-skill.kenney-twirl_01');if(!source)throw Error('Missing confirmed aura texture');
  const geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);this.data=new THREE.InstancedBufferAttribute(new Float32Array(18*3),3);geometry.setAttribute('auraState',this.data);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{map:{value:(source.mesh.material as THREE.ShaderMaterial).uniforms.map.value},time:{value:0},psionic:{value:this.ids.some(isProtossHero)?1:0},organic:{value:this.ids.some(isZergHero)?1:0}},
   vertexShader:'attribute vec3 auraState;varying vec2 vUv;varying vec3 vColor;varying vec3 vState;void main(){vUv=uv;vColor=instanceColor;vState=auraState;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
   fragmentShader:`uniform sampler2D map;uniform float time;uniform float organic;uniform float psionic;varying vec2 vUv;varying vec3 vColor;varying vec3 vState;
    float stroke(float d,float w){return exp(-d*d/(w*w));}
    void main(){vec2 q=vUv*2.-1.;float r=length(q),a=atan(q.y,q.x),hero=vState.x,layer=vState.y,t=time*(.28+hero*.03)*(layer<1.?1.:-1.);float n=sin(a*7.+r*22.-t*3.)*.024+sin(a*13.-t)*.016;
     float edge=stroke(r-(.75+n),.018),inner=stroke(r-(.58+sin(a*6.+t)*.035),.012);float broken=pow(.5+.5*cos(a*(hero==3.?8.:6.)+t*2.),12.);
     float marks=stroke(r-.84,.065)*broken,swirl=texture2D(map,vUv).a*texture2D(map,vUv).r*(1.-smoothstep(.65,.97,r));
     float field=exp(-r*r*7.)*.11;float alpha=(edge*.28+inner*.14+marks*.4+swirl*.28+field)*vState.z;
     if(hero==2.||hero==4.)alpha+=stroke(r-(.43+sin(a*3.-t*2.)*.08),.035)*.1*vState.z;
     if(organic>.5){float vein=stroke(r-(.67+sin(a*5.+t)*.07+sin(a*9.-t*1.3)*.025),.014);float spores=pow(.5+.5*cos(a*11.-t),18.)*stroke(r-.82,.045);float tissue=stroke(r-(.48+sin(a*4.-t)*.06),.026);alpha=(edge*.24+inner*.09+swirl*.43+field*.65+vein*.24+spores*.25+tissue*.1)*vState.z;}
     if(psionic>.5){float sigil=stroke(r-(.64+sin(a*4.-t)*.025),.009)*(.45+.55*pow(.5+.5*cos(a*8.+t),5.));float rays=stroke(sin(a*6.+t)*r,.017)*smoothstep(.44,.65,r)*(1.-smoothstep(.7,.87,r));alpha=(edge*.18+inner*.18+swirl*.36+marks*.2+sigil*.35+rays*.09+field*.8)*vState.z;}
     alpha*=1.-smoothstep(.92,1.,r);if(alpha<.007)discard;gl_FragColor=vec4(vColor*(.9+.1*sin(time*2.+a*4.)),alpha);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
  this.mesh=new THREE.InstancedMesh(geometry,material,18);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.renderOrder=1;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.setColorAt(0,tint);this.view.scene.add(this.mesh);
 }
 reset(){this.count=0;if(this.mesh)this.mesh.count=0;}
 render(visible:(p:{x:number;z:number})=>boolean){if(!this.mesh||!this.data)return;this.count=0;const now=this.world.time;(this.mesh.material as THREE.ShaderMaterial).uniforms.time.value=now;
  for(const u of this.world.entities.values())if(u.hp>0&&u.heroId&&this.ids.includes(u.heroId)&&visible(u)){
   if(this.count+2>this.mesh.instanceMatrix.count)break;
   const index=this.ids.indexOf(u.heroId),radius=u.flying?Math.min(3,Math.max(1.7,u.unitRadius+1.1)):zergRadii[u.heroId]??protossRadii[u.heroId]??1.1,ground=(this.world.terrain?.height(u)??0)+.045;
   for(let layer=0;layer<2;layer++){const s=radius*2*(layer?.78:1);object.position.set(u.x,ground+layer*.012,u.z);object.rotation.set(0,now*(layer?-.17:.12)+index*.7,0);object.scale.set(s,1,s);object.updateMatrix();this.mesh.setMatrixAt(this.count,object.matrix);this.mesh.setColorAt(this.count,tint.set((layer?innerColors[u.heroId]:undefined)??colors[u.heroId]??0xffffff));this.data.setXYZ(this.count++,index,layer,layer?.42:.72);}
  }commitInstances(this.mesh,this.count);this.data.needsUpdate=true;
 }
 report(){return {heroes:this.count/2,layers:this.count,textLabels:0,organic:this.ids.some(isZergHero),time:this.mesh?(this.mesh.material as THREE.ShaderMaterial).uniforms.time.value:0,reference:'Warcraft III foot sigils + PoE flowing aura; locally authored with existing texture'};}
}
