import {SOUND_DATA,SoundVariation,soundValue,type SoundSample} from './audio-source-data';
export type SoundCue={bank:string;priority:number;volume?:number;group?:'dialogue'};
export type SoundVoice={bank:string;priority:number;group?:'dialogue';source:AudioBufferSourceNode;gain:GainNode;ended:boolean;baseRate:number;stop:(fade?:boolean)=>void};
/** SoundData variations, dB/semitone ranges, duplicate limits and channel fades. */
export class NativeSoundPlayer {
 readonly voices=new Set<SoundVoice>();readonly played=new Map<string,number>();readonly rejected=new Map<string,number>();
 private variation=new SoundVariation();private epoch=0;private pendingLoops=new Set<string>();private readyLoopSamples=new Map<string,SoundSample>();
 ensureAsset?: (id:string)=>Promise<void>;onPreparedError:(id:string,error:unknown)=>void=()=>{};
 previewAssets(bank:string,dialogue=false){const b=SOUND_DATA.banks[bank];return b?this.variation.preview(bank,b,dialogue).map(s=>s.asset):[];}

 constructor(private context:()=>AudioContext|null,private output:()=>AudioNode,private buffers:Map<string,AudioBuffer>){}
 play(cue:SoundCue,loop=false,selected?:SoundSample):SoundVoice|undefined{
  if(loop&&this.pendingLoops.has(cue.bank))return;
  const c=this.context(),b=SOUND_DATA.banks[cue.bank];if(!c||c.state!=='running'||!b?.samples.length)return;
  const peers=[...this.voices].filter(v=>v.bank===cue.bank&&!v.ended),limit=Math.max(1,Math.min(soundValue(b,'DupeDestroyCount',16),soundValue(b,'DupeMuteCount',10)));
  const reject=()=>{this.rejected.set(cue.bank,(this.rejected.get(cue.bank)??0)+1);return undefined;};
  if(cue.group&&[...this.voices].some(v=>!v.ended&&v.group===cue.group))return reject();
  if(peers.length>=limit){if(b.fields.DupeMaximumMethod?.value==='Replace')peers[0].stop();else return reject();}
  // Browser host budget. Critical skill/death cues evict a lower priority voice.
  if(this.voices.size>=48){const victim=[...this.voices].filter(v=>v.priority<cue.priority).sort((a,b)=>a.priority-b.priority)[0];if(!victim)return reject();victim.stop();}
  const sample=selected??(loop?this.readyLoopSamples.get(cue.bank):undefined)??this.variation.sample(cue.bank,b,cue.group==='dialogue'),buffer=this.buffers.get(sample.asset);if(!buffer){if(!this.ensureAsset)return reject();const epoch=this.epoch;if(loop)this.pendingLoops.add(cue.bank);void this.ensureAsset(sample.asset).then(()=>{if(epoch===this.epoch){this.pendingLoops.delete(cue.bank);if(loop)this.readyLoopSamples.set(cue.bank,sample);else this.play(cue,loop,sample);}},error=>{if(epoch===this.epoch){this.pendingLoops.delete(cue.bank);this.onPreparedError(sample.asset,error);}});return;}
  if(this.ensureAsset)for(const id of this.previewAssets(cue.bank,cue.group==='dialogue'))void this.ensureAsset(id).catch(error=>this.onPreparedError(id,error));
  this.readyLoopSamples.delete(cue.bank);
  const source=c.createBufferSource(),gain=c.createGain(),at=c.currentTime;
  source.buffer=buffer;source.loop=loop&&(Number(sample.LoopCount)===-1||soundValue(b,'LoopCount')===-1);source.playbackRate.value=2**((this.variation.range(b.fields.Pitch?.value)+this.variation.range(sample.Pitch))/12);
  const volume=(cue.volume??.22)*10**((this.variation.range(b.fields.Volume?.value)+this.variation.range(sample.Volume))/20),fadeIn=Number(b.fields.OffsetFadeIn?.Time??0)/1000;
  if(fadeIn){gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+fadeIn);}else gain.gain.value=volume;
  source.connect(gain).connect(this.output());
  const voice:SoundVoice={bank:cue.bank,priority:cue.priority,group:cue.group,source,gain,ended:false,baseRate:source.playbackRate.value,stop:(fade=false)=>{
   if(voice.ended)return;voice.ended=true;this.voices.delete(voice);const seconds=fade?Number(b.fields.OffsetFadeOut?.Time??b.fields['SustainFade:1']?.Time??100)/1000:0;
   if(seconds){gain.gain.cancelScheduledValues(c.currentTime);gain.gain.setValueAtTime(gain.gain.value,c.currentTime);gain.gain.linearRampToValueAtTime(0,c.currentTime+seconds);}source.stop(c.currentTime+seconds);
  }};
  source.onended=()=>{voice.ended=true;this.voices.delete(voice);source.disconnect();gain.disconnect();};
  this.voices.add(voice);source.start();this.played.set(cue.bank,(this.played.get(cue.bank)??0)+1);return voice;
 }
 reset(){this.epoch++;this.pendingLoops.clear();this.readyLoopSamples.clear();for(const v of [...this.voices])v.stop();}
}
