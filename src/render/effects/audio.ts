/** Local synthesis, explicitly not original Blizzard audio. No external requests. */
import {assetUrl} from '../../assets/manifest';
import type {World} from '../../simulation/world';
export class AudioEffects {
 context:AudioContext|null=null;buffers=new Map<string,AudioBuffer>();lastShot=0;lastRescue=0;lastFailure=0;
 async start(){try{this.context??=new AudioContext();await this.context.resume();for(const id of ['shot','blast','alert']){const url=assetUrl('audio.'+id);if(url){const bytes=await (await fetch(url)).arrayBuffer();this.buffers.set(id,await this.context.decodeAudioData(bytes));}}}catch{/* Audio is optional on autoplay-restricted devices. */}}
 play(id:string,volume:number){const b=this.buffers.get(id);if(!b||!this.context)return;const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=b;gain.gain.value=volume;source.connect(gain).connect(this.context.destination);source.start();}
 update(w:World){if(w.stats.shots>this.lastShot){this.lastShot=w.stats.shots;this.play(w.effects.some(e=>e.kind==='explosion')?'blast':'shot',.08);}if(w.stats.rescued!==this.lastRescue||w.stats.failed!==this.lastFailure){this.play('alert',.15);this.lastRescue=w.stats.rescued;this.lastFailure=w.stats.failed;}}
}
