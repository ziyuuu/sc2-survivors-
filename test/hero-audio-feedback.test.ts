import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioEffects} from '../src/render/effects/audio';
import {World} from '../src/simulation/world';
import {SOUND_DATA} from '../src/render/effects/audio-source-data';

test('hero launch feedback plays once for a fresh nearby event and never replays stale events',()=>{
 const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.time=1;
 const u=w.addUnit('marine','terran',0,0,1);u.heroId='raynor';w.anchor={x:0,z:0};
 const audio=new AudioEffects(),played:string[]=[];audio.playBank=cue=>{played.push(cue.bank);return undefined;};
 w.visual('skill-launch',u,u,17);audio.update(w);for(let i=0;i<60;i++)audio.update(w);
 assert.deepEqual(played,[SOUND_DATA.skills.raynor.launch]);
 w.time=2;u.x=100;w.visual('skill-launch',u,u,18);audio.update(w);assert.equal(played.length,1);
 u.x=0;u.heroId='yamato_battlecruiser';w.visual('skill-launch',u,u,19);audio.update(w);
 assert.deepEqual(played,[SOUND_DATA.skills.raynor.launch,SOUND_DATA.skills.yamato_battlecruiser.launch]);
});
