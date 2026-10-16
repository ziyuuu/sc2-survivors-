import {MATERIAL_ROLES,type PreparedUnitMaterial} from '../../src/render/materials/unit-material-loader';
import {sampleMaterialTrack,sampleBarrierAlpha,type MaterialRef,type UnitMaterialContext,type UnitMaterialPose} from '../../src/render/materials/source-tracks';
const PARAM=(i:number)=>i<5?i*2:11+(i-5)*2,COLOR=MATERIAL_ROLES.length*2+1,TEAM=COLOR+MATERIAL_ROLES.length,ROWS=TEAM+1;
const linear=(v:number)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const DEFAULT_TEAM=[linear(0x52/255),linear(0x82/255),linear(0xb4/255)] as const;
/** Numerical oracle frozen before the 2026-10-16 optimization. */
export class LegacyMaterialRows {readonly data:Float32Array;private changed=false;private clipTracks=new Map<string,Map<number,import('../../src/render/materials/source-tracks').MaterialTrack>>();
constructor(readonly prepared:PreparedUnitMaterial,readonly capacity:number){this.data=new Float32Array(capacity*ROWS*4);for(const clip of prepared.profile.clips)this.clipTracks.set(clip.name,new Map(clip.tracks.map(t=>[t.id,t])));this.write(0,{clip:'',seconds:0});}
 write(index:number,pose:UnitMaterialPose,context?:UnitMaterialContext){
  if(index>=this.capacity)throw Error('Original material instance capacity exceeded');
  const clips=this.clipTracks.get(pose.clip),attack=pose.attackClip?this.clipTracks.get(pose.attackClip):undefined;
  const read=(ref:MaterialRef)=>{const over=attack?.get(ref.id);return sampleMaterialTrack(over??clips?.get(ref.id),over?pose.attackSeconds??0:pose.seconds,ref);};
  const row=(y:number,values:readonly number[])=>{const offset=(y*this.capacity+index)*4;values.forEach((value,k)=>{const v=Math.fround(value);if(this.data[offset+k]!==v){this.data[offset+k]=v;this.changed=true;}});};
  MATERIAL_ROLES.forEach((role,i)=>{const layer=this.prepared.source.layers[role];if(!layer)return;
   const offset=read(layer.uvOffset),tiling=read(layer.uvTiling),angle=read(layer.uvAngle),color=read(layer.color),brightness=layer.brightness?Number(read(layer.brightness)):1;
   row(PARAM(i),[Number(read(layer.multiply)??1)*brightness,Number(read(layer.add)??0),typeof angle==='number'?angle:angle?.z??0,layer.flipbook?.frame?Number(read(layer.flipbook.frame)):0]);
   row(PARAM(i)+1,[typeof offset==='object'?offset?.x??0:0,typeof offset==='object'?offset?.y??0:0,typeof tiling==='object'?tiling?.x??1:1,typeof tiling==='object'?tiling?.y??1:1]);
   if(color&&typeof color==='object'){const srgb=!['normal','alpha','alpha2','gloss','ao','environmentMask'].includes(role),c=(key:string)=>{const v=(color[key]??255)/255;return srgb?linear(v):v;};row(COLOR+i,[c('r'),c('g'),c('b'),(color.a??255)/255]);}
  });
  const {profile,source}=this.prepared,part=profile.composites.flatMap(c=>c.parts).find(p=>p.material.type===1&&p.material.index===source.index);
  const alpha=profile.source.toLowerCase().includes('immortal')?sampleBarrierAlpha(profile,source.index,context?.barrier):part?Number(read(part.alpha)):1;
  row(10,[alpha,0,0,0]);row(TEAM,[...(context?.teamColor??DEFAULT_TEAM),context?.activity??0]);
 }
}
