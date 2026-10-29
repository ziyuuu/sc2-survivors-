import {optimizedGraphics,runtimeBudget} from '../../platform/graphics-profile';
import {audioDecodeLane} from '../../platform/preparation-budget';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';
import {SOUND_DATA} from './audio-source-data';
import {CombatAudioRouter,type AudioChannel} from './combat-audio-router';
import {NativeSoundPlayer,type SoundCue,type SoundVoice} from './native-sound-player';
/** Original local imports when present; otherwise explicitly labeled local synthesis. */
import {assetUrl,ASSETS} from '../../assets/manifest';
import type {World} from '../../simulation/world';
import {EquipmentLootAudio,type EquipmentLootCue} from './equipment-loot-audio';
export class AudioEffects {
 masterVolume=1;battleVolume=1;interfaceVolume=0;
 private masterBus:GainNode|null=null;private battleBus:GainNode|null=null;private interfaceBus:GainNode|null=null;
 constructor(){if(optimizedGraphics()){this.native.ensureAsset=id=>this.ensureDecoded(id);this.native.onPreparedError=(id,error)=>this.decodeErrors.push(id+': '+String(error));}try{const p=JSON.parse(localStorage.getItem('sc2.audio-mix')??'{}');this.setMix(p.master??1,p.battle??1,p.interface??0);}catch{}}
 setMix(master:number,battle:number,ui:number){if(![master,battle,ui].every(n=>Number.isFinite(n)&&n>=0&&n<=1))return;this.masterVolume=master;this.battleVolume=battle;this.interfaceVolume=ui;if(this.masterBus)this.masterBus.gain.value=master;if(this.battleBus)this.battleBus.gain.value=battle;if(this.interfaceBus)this.interfaceBus.gain.value=ui;try{localStorage.setItem('sc2.audio-mix',JSON.stringify({master,battle,interface:ui}));}catch{}}
 private output(channel:'battle'|'interface'='battle'){const c=this.context!;if(!this.masterBus){this.masterBus=c.createGain();this.masterBus.gain.value=this.masterVolume;this.masterBus.connect(c.destination);this.battleBus=c.createGain();this.battleBus.gain.value=this.battleVolume;this.battleBus.connect(this.masterBus);this.interfaceBus=c.createGain();this.interfaceBus.gain.value=this.interfaceVolume;this.interfaceBus.connect(this.masterBus);}return channel==='interface'?this.interfaceBus!:this.battleBus!;}
 /** Short interface feedback is independent of combat voices and World events. */
 interfaceCue(){if(this.interfaceVolume<=0||this.masterVolume<=0)return;try{this.context??=new AudioContext();void this.context.resume();const c=this.context,o=c.createOscillator(),g=c.createGain(),at=c.currentTime;o.type='sine';o.frequency.setValueAtTime(620,at);o.frequency.exponentialRampToValueAtTime(780,at+.045);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.035,at+.005);g.gain.exponentialRampToValueAtTime(.0001,at+.07);o.connect(g).connect(this.output('interface'));o.start(at);o.stop(at+.075);o.onended=()=>{o.disconnect();g.disconnect();};}catch{}}
 context:AudioContext|null=null;buffers=new Map<string,AudioBuffer>();lastSerial=0;lastRescue=0;lastFailure=0;voices=0;loading:Promise<void>|null=null;decodeErrors:string[]=[];played=new Map<string,number>();private router=new CombatAudioRouter();private native=new NativeSoundPlayer(()=>this.context,()=>this.output(),this.buffers);private channels=new Map<string,{spec:AudioChannel;voice?:SoundVoice}>();private resumeChannels=false;
 private activeSources=new Set<AudioBufferSourceNode>();
 private equipmentAudio=new EquipmentLootAudio();private equipmentVoices=new Set<OscillatorNode>();
 reset(){for(const s of this.activeSources)s.stop();this.native.reset();this.channels.clear();this.router.reset();for(const s of this.equipmentVoices)s.stop();this.equipmentVoices.clear();this.equipmentAudio.reset();this.native.played.clear();this.native.rejected.clear();this.lastSerial=0;this.lastRescue=0;this.lastFailure=0;this.played.clear();}
 private decodedJobs=new Map<string,Promise<void>>();private touched=new Map<string,number>();private peakPcmBytes=0;
 // A successful decode validates this immutable clip for the audio session.
 // Preparing a broad bank again must not refill clips intentionally evicted by
 // the PCM budget. Actual playback still calls ensureDecoded for missing data.
 private preparedSamples=new Set<string>();
 pcmBytes(){return [...new Set(this.buffers.values())].reduce((n,b)=>n+b.length*b.numberOfChannels*4,0);}
 private trimAudio(){if(!optimizedGraphics())return;const live=new Set([...this.native.voices].map(v=>v.source.buffer));for(const source of this.activeSources)live.add(source.buffer);for(const [id,b]of [...this.buffers].sort((a,b)=>(this.touched.get(a[0])??0)-(this.touched.get(b[0])??0))){if(this.pcmBytes()<=runtimeBudget().pcmBytes)break;if(!live.has(b)&&!this.decodedJobs.has(id))this.buffers.delete(id);}}
 async ensureDecoded(id:string){this.context??=new AudioContext();this.touched.set(id,performance.now());if(this.buffers.has(id)){this.preparedSamples.add(id);return;}let job=this.decodedJobs.get(id);if(!job){job=audioDecodeLane.run(async()=>{await prepareEmbeddedAssetIds(['audio.'+id]);const url=assetUrl('audio.'+id);if(!url)throw Error('音效资源未就绪');const r=await fetch(url);if(!r.ok)throw Error('音效读取失败');const buffer=await this.context!.decodeAudioData(await r.arrayBuffer());this.buffers.set(id,buffer);this.peakPcmBytes=Math.max(this.peakPcmBytes,this.pcmBytes());this.trimAudio();});this.decodedJobs.set(id,job);job.finally(()=>this.decodedJobs.delete(id)).catch(()=>{});}try{await job;this.preparedSamples.add(id);}catch(error){this.preparedSamples.delete(id);throw error;}}
 async prepareBanks(plan:{combat:string[];dialogue:string[]},progress:(done:number,total:number,label:string)=>void=()=>{},cancelled:()=>boolean=()=>false){
  if(!optimizedGraphics())return this.preload(progress);
  const ids=new Set(['alert','sc2.scv.ready',...plan.combat.flatMap(k=>this.native.previewAssets(k,false).slice(0,1)),...plan.dialogue.flatMap(k=>this.native.previewAssets(k,true))]);
  this.trimAudio();await prepareEmbeddedAssetIds([...new Set([...ids,...plan.combat.flatMap(k=>SOUND_DATA.banks[k]?.samples.map(s=>s.asset)??[])])].map(id=>'audio.'+id));
  let done=0;for(const id of ids){if(cancelled())throw Error('音效准备已取消');if(!this.preparedSamples.has(id))await this.ensureDecoded(id);progress(++done,ids.size,id);}
  this.trimAudio();
 }
 async preload(progress:(done:number,total:number,label:string)=>void=()=>{}){this.context??=new AudioContext();if(optimizedGraphics())return;this.loading??=this.load(progress).catch(error=>{this.loading=null;throw error;});await this.loading;}
 async start(){try{await this.preload();await this.context!.resume();}catch(e){this.decodeErrors.push(String(e));}}
 private async load(progress:(done:number,total:number,label:string)=>void){
  const assets=[...ASSETS.values()].filter(a=>a.kind==='audio'&&a.status==='available'&&!this.buffers.has(a.id.replace('audio.',''))),decoded=new Map<string,Promise<AudioBuffer>>();let done=0,next=0;
  const decode=(url:string)=>{let p=decoded.get(url);if(!p){p=(async()=>{const response=await fetch(url);if(!response.ok)throw Error(String(response.status));return this.context!.decodeAudioData(await response.arrayBuffer());})();decoded.set(url,p);}return p;};
  const worker=async()=>{for(;;){const a=assets[next++];if(!a)return;try{const url=assetUrl(a.id);if(!url)throw Error('missing asset');this.buffers.set(a.id.replace('audio.',''),await decode(url));}catch(e){this.decodeErrors.push(a.id+': '+String(e));if(a.required)throw Error('必需音效未就绪：'+a.id);}progress(++done,assets.length,a.id);}};
  await Promise.all(Array.from({length:4},worker));
 }

 report(){return {pcmBytes:this.pcmBytes(),peakPcmBytes:this.peakPcmBytes,pcmBudget:runtimeBudget().pcmBytes,pcmBudgetExceeded:this.pcmBytes()>runtimeBudget().pcmBytes,decode:audioDecodeLane.report(),contextState:this.context?.state??'uninitialized',originalDecoded:[...this.buffers.keys()].filter(id=>id.startsWith('sc2.')).length,decoded:[...this.buffers].map(([id,b])=>({id,duration:b.duration,channels:b.numberOfChannels,sampleRate:b.sampleRate})),errors:this.decodeErrors,played:Object.fromEntries(this.played),activeHealers:[...this.channels.keys()].filter(k=>k.startsWith('heal:')).length,activeChannels:[...this.channels].map(([key,c])=>({key,bank:c.spec.bank,playing:!!c.voice&&!c.voice.ended})),nativePlayed:Object.fromEntries(this.native.played),nativeRejected:Object.fromEntries(this.native.rejected),nativeRoutes:[...this.router.routes],activeVoices:this.native.voices.size};}
 play(id:string,volume:number){const b=this.buffers.get(id);if(!b||!this.context||this.voices>=12&&id!=='sc2.scv.ready')return;const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=b;gain.gain.value=volume;source.connect(gain).connect(this.output());this.voices++;this.activeSources.add(source);source.onended=()=>{this.activeSources.delete(source);this.voices--;source.disconnect();gain.disconnect();};source.start();this.played.set(id,(this.played.get(id)??0)+1);}
 /** Local synthesized equipment tones; volume follows the existing battle effects bus. */
 private equipmentCue(cue:EquipmentLootCue){
  const c=this.context;if(!c||c.state!=='running'||this.masterVolume<=0||this.battleVolume<=0)return;
  const full=cue.kind==='full',pickup=cue.kind==='pickup',rare=cue.quality>=4,base=full?250:pickup?840:380+cue.quality*95,tones=full?[1,.8]:pickup?[1,1.5]:rare?[1,1.25,1.5]:[1];
  if(cue.polluted)tones.push(.56);
  for(const [index,ratio] of tones.entries()){
   if(this.equipmentVoices.size>=9)break;const tainted=cue.polluted&&index===tones.length-1,o=c.createOscillator(),g=c.createGain(),at=c.currentTime+index*.045,duration=full||tainted?.12:rare?.24:.09;o.type=full||tainted?'triangle':'sine';o.frequency.setValueAtTime(base*ratio,at);o.frequency.exponentialRampToValueAtTime(base*ratio*(pickup?1.12:.96),at+duration);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(tainted?.014:rare?.035:.022,at+.006);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g).connect(this.output());this.equipmentVoices.add(o);o.onended=()=>{this.equipmentVoices.delete(o);o.disconnect();g.disconnect();};o.start(at);o.stop(at+duration+.01);
  }
  const id='local.equipment.'+cue.kind+(cue.kind==='drop'?'.'+cue.quality:'');this.played.set(id,(this.played.get(id)??0)+1);
  if(cue.polluted)this.played.set('local.equipment.pollution',(this.played.get('local.equipment.pollution')??0)+1);
 }
 resumeAt(w:World){this.reset();this.router.resumeAt(w);this.resumeChannels=true;this.lastSerial=w.visualEvents.at(-1)?.serial??0;this.lastRescue=w.stats.rescued;this.lastFailure=w.stats.failed;}
 playBank(cue:SoundCue,loop=false){return this.native.play(cue,loop);}
 update(w:World){
  const equipmentCue=this.equipmentAudio.update(w);if(equipmentCue)this.equipmentCue(equipmentCue);
  const frame=this.router.update(w),live=new Set(frame.channels.map(c=>c.key));
  if(frame.silentStop){this.native.reset();for(const s of [...this.activeSources])s.stop();this.channels.clear();this.resumeChannels=true;}
  for(const [key,channel]of this.channels)if(!live.has(key)){channel.voice?.stop(true);if(!frame.silentStop&&channel.spec.end)this.playBank({bank:channel.spec.end,priority:channel.spec.priority,volume:channel.spec.volume});this.channels.delete(key);}
  for(const cue of frame.cues.sort((a,b)=>b.priority-a.priority))this.playBank(cue);
  for(const spec of frame.channels){let current=this.channels.get(spec.key);
   if(current&&current.spec.bank!==spec.bank){current.voice?.stop(true);current.voice=undefined;}
   if(!current){current={spec};this.channels.set(spec.key,current);if(spec.start&&!this.resumeChannels)this.playBank({bank:spec.start,priority:spec.priority,volume:spec.volume});}
   current.spec=spec;if(!current.voice||current.voice.ended)current.voice=this.playBank({bank:spec.bank,priority:spec.priority,volume:spec.volume},true);
   if(current.voice&&spec.rate!==undefined)current.voice.source.playbackRate.value=current.voice.baseRate*spec.rate;
  }
  if(!frame.silentStop)this.resumeChannels=false;
  for(const e of w.visualEvents)if(e.serial>this.lastSerial){this.lastSerial=e.serial;if(!frame.silentStop&&e.kind==='scv-rescue'&&w.time-e.time<.5&&w.expedition.race==='terran')this.play('sc2.scv.ready',.22);}
  if(w.stats.rescued!==this.lastRescue||w.stats.failed!==this.lastFailure){if(!frame.silentStop)this.play('alert',.15);this.lastRescue=w.stats.rescued;this.lastFailure=w.stats.failed;}
 }
}
