import data from '../../data/combat-audio.json';
export type SoundSample={asset:string;Weight?:string;Volume?:string;Pitch?:string;LoopCount?:string};
export type SoundBank={id:string;fields:Record<string,Record<string,string>>;samples:SoundSample[];maxDuration?:number};
export type WeaponSound={attack:string|null;impact:string|null;surfaces:Record<string,string>;channel?:string[];powered?:string};
export type SkillSound={charge?:string;launch?:string;impact?:string;loop?:string;end?:string;revive?:string};
export const SOUND_DATA=data as unknown as {banks:Record<string,SoundBank>;weapons:Record<string,WeaponSound>;skills:Record<string,SkillSound>;deaths:Record<string,string[]>;special:Record<string,string[]>;motion:Record<string,string|null>;motionStart:Record<string,string|null>;walkEvents:Record<string,{duration:number;events:{time:number;bank:string}[]}>;dialogue:Record<string,string[]>;transforms:Record<string,string[]>;transformTiming:Record<string,number[]>;herdBindings:Record<string,{herd:string;weight:number}>;herds:Record<string,{radius:number;positionBias:number;speedLimit?:number[];levels:{weight:number;bank:string}[]}>;carrierMotion:Record<string,string>};
export const soundValue=(b:SoundBank,k:string,fallback=0)=>Number(b.fields[k]?.value??fallback);
/** Isolated presentation RNG: never consumes World.random or gameplay IDs. */
export class SoundVariation {
 private state=0x6d2b79f5;private history=new Map<string,number[]>();private sequence=new Map<string,number>();
 preview(key:string,b:SoundBank,rotate=false,count=2){const copy=new SoundVariation();copy.state=this.state;copy.history=new Map([...this.history].map(([k,v])=>[k,[...v]]));copy.sequence=new Map(this.sequence);return Array.from({length:Math.min(count,b.samples.length)},()=>copy.sample(key,b,rotate));}
 random(){let x=this.state;x^=x<<13;x^=x>>>17;x^=x<<5;this.state=x>>>0;return this.state/4294967296;}
 range(value:string|undefined,fallback=0){const [a=fallback,b=a]=(value??'').split(',').filter(Boolean).map(Number);return a+(b-a)*this.random();}
 sample(key:string,b:SoundBank,rotate=false){
  // Original sequential dialogue can contain a multi-line joke or exchange.
  // Keep that order across scene loops; other sound selection is unchanged.
  if(rotate&&b.fields.Select?.value==='Sequential'){const next=this.sequence.get(key)??0;this.sequence.set(key,(next+1)%b.samples.length);return b.samples[next%b.samples.length];}
  const history=this.history.get(key)??[],minimum=Math.min(b.samples.length-1,rotate?b.samples.length-1:soundValue(b,'VariationMinimum',b.fields.Select?.value==='Shuffle'?b.samples.length-1:0)),blocked=new Set(history.slice(-minimum));
  const candidates=b.samples.map((s,i)=>({s,i})).filter(({i})=>!minimum||!blocked.has(i));
  let weight=this.random()*candidates.reduce((n,{s})=>n+Number(s.Weight??100),0),chosen=candidates.at(-1)!;
  for(const c of candidates){weight-=Number(c.s.Weight??100);if(weight<=0){chosen=c;break;}}
  history.push(chosen.i);if(history.length>b.samples.length)history.shift();this.history.set(key,history);return chosen.s;
 }
}
