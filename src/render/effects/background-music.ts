import {assetUrl} from '../../assets/manifest';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';
import type {World} from '../../simulation/world';

type Track = 'menu'|'intermission';
type Route = {context:AudioContext;output:AudioNode};
type Assets = {prepare:(ids:string[])=>Promise<unknown>;url:(id:string)=>string|null};
const TRACKS:Record<Track,string> = {menu:'music.menu',intermission:'music.intermission'};
// A tiny silent PCM clip primes the same media element during a real gesture.
// Later verified Blob URLs can then play without decoding a complete song in JS.
const SILENCE = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==';

/** One streamed music voice, independent of combat preparation and simulation. */
export class BackgroundMusic {
 private scene:Track|null=null;
 private target:Track|null=null;
 private current:Track|null=null;
 private visible=true;
 private enabled=true;
 private unlocked=false;
 private disposed=false;
 private epoch=0;
 private busy=false;
 private media:HTMLAudioElement|null=null;
 private route:Route|null=null;
 private source:MediaElementAudioSourceNode|null=null;
 private fade:GainNode|null=null;
 private offsets=new Map<Track,number>();
 private prepared=new Set<Track>();
 private errors:string[]=[];
 private starts=0;
 constructor(private connect:()=>Route,
  private assets:Assets={prepare:prepareEmbeddedAssetIds,url:assetUrl},
  private createMedia:()=>HTMLAudioElement=()=>new Audio()){}

 setPhase(phase:World['phase']){
  const next=phase==='menu'?'menu':phase==='battle'?null:'intermission';
  if(next===this.scene)return;
  this.scene=next;this.sync();
 }
 setEnabled(value:boolean){if(value!==this.enabled){this.enabled=value;this.sync();}}
 setVisible(value:boolean){if(value!==this.visible){this.visible=value;this.sync();}}
 /** Call only from a trusted pointer, touch, key or slider event. */
 unlock(){
  if(this.disposed||!this.visible||!this.enabled||!this.scene)return;
  try{
   if(!this.media){
    this.route=this.connect();this.media=this.createMedia();
    this.media.preload='none';this.media.loop=true;this.media.setAttribute('playsinline','');
    this.source=this.route.context.createMediaElementSource(this.media);
    this.fade=this.route.context.createGain();this.fade.gain.value=0;
    this.source.connect(this.fade).connect(this.route.output);
    this.media.src=SILENCE;
    void this.media.play().catch(()=>{});
   }
   this.unlocked=true;
   void this.route!.context.resume().catch(()=>{});
   this.sync(true);
  }catch(error){this.recordError(error);}
 }
 private recordError(error:unknown){this.errors.push(String(error));if(this.errors.length>5)this.errors.shift();}
 private gain(value:number,seconds=0){
  if(!this.fade||!this.route)return;
  const gain=this.fade.gain,at=this.route.context.currentTime;
  if(typeof gain.cancelAndHoldAtTime==='function')gain.cancelAndHoldAtTime(at);
  else {gain.cancelScheduledValues(at);gain.setValueAtTime(gain.value,at);}
  if(seconds)gain.linearRampToValueAtTime(value,at+seconds);
  else gain.setValueAtTime(value,at);
 }
 private pause(){
  if(!this.media)return;
  if(this.current&&Number.isFinite(this.media.currentTime))this.offsets.set(this.current,this.media.currentTime);
  this.media.pause();
 }
 private sync(retry=false){
  if(this.disposed||!this.media||!this.unlocked)return;
  // Backgrounding and explicit mute stop synchronously, including pending loads.
  if(!this.visible||!this.enabled){
   ++this.epoch;this.target=null;this.busy=false;this.gain(0);this.pause();return;
  }
  const target=this.scene;
  if(target===this.target&&(!retry||this.busy||!this.media.paused))return;
  this.target=target;this.busy=true;
  const epoch=++this.epoch;
  void this.transition(target,epoch);
 }
 private async url(track:Track){
  const id=TRACKS[track];await this.assets.prepare([id]);
  const url=this.assets.url(id);if(!url)throw Error('Music asset unavailable: '+id);
  this.prepared.add(track);return url;
 }
 private async transition(target:Track|null,epoch:number){
  const active=()=>!this.disposed&&epoch===this.epoch;
  try{
   if(this.current!==target&&!this.media!.paused){
    this.gain(0,.24);await new Promise(resolve=>setTimeout(resolve,240));
    if(!active())return;
   }
   this.gain(0);this.pause();
   if(!target){this.busy=false;return;}
   const url=await this.url(target);if(!active())return;
   if(this.current!==target||this.media!.src!==url){
    this.media!.src=url;this.current=target;this.media!.load();
    const offset=this.offsets.get(target)??0;
    if(offset){
     const restore=()=>{if(active()){try{this.media!.currentTime=offset;}catch{}}};
     if(this.media!.readyState>=1)restore();
     else this.media!.addEventListener('loadedmetadata',restore,{once:true});
    }
   }
   // The browser may suspend Web Audio while the page is hidden even though
   // this element was already unlocked. Attempt normal resume on foregrounding.
   if(this.route!.context.state!=='running')void this.route!.context.resume().catch(()=>{});
   await this.media!.play();if(!active())return;
   this.starts++;this.gain(1,.4);this.busy=false;
  }catch(error){
   if(!active())return;
   this.pause();this.current=null;this.busy=false;this.recordError(error);
   // A subsequent real gesture retries; rendering never starts a retry loop.
  }
 }
 report(){return {scene:this.scene,track:this.current,unlocked:this.unlocked,visible:this.visible,enabled:this.enabled,
  loading:this.busy,playing:!!this.current&&!!this.media&&!this.media.paused,time:this.media?.currentTime??0,
  duration:Number.isFinite(this.media?.duration)?this.media!.duration:null,loop:this.media?.loop??false,
  prepared:[...this.prepared],starts:this.starts,errors:[...this.errors]};}
 dispose(){
  this.disposed=true;++this.epoch;this.pause();this.media?.removeAttribute('src');this.media?.load();
  this.source?.disconnect();this.fade?.disconnect();this.media=null;
 }
}

export function bindBackgroundMusic(music:BackgroundMusic){
 const abort=new AbortController();
 const gesture=(event:Event)=>{if(event.isTrusted)music.unlock();};
 for(const event of ['pointerdown','touchend','keydown','click','input'])document.addEventListener(event,gesture,{passive:true,signal:abort.signal});
 document.addEventListener('visibilitychange',()=>music.setVisible(!document.hidden),{signal:abort.signal});
 window.addEventListener('pagehide',()=>music.setVisible(false),{signal:abort.signal});
 window.addEventListener('pageshow',()=>music.setVisible(!document.hidden),{signal:abort.signal});
 music.setVisible(!document.hidden);
 return ()=>{abort.abort();music.dispose();};
}
