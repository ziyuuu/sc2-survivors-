import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioEffects} from '../src/render/effects/audio';
import type {World} from '../src/simulation/world';
import type {VisualEvent} from '../src/simulation/types';

test('hero launch feedback plays once for a fresh nearby event and never replays stale events',()=>{
 const audio=new AudioEffects(),played:string[]=[];audio.play=id=>{played.push(id);};
 const launch={serial:1,time:1,kind:'skill-launch',heroId:'raynor',unitType:'marine',x:0,z:0} as VisualEvent;
 const w={visualEvents:[launch],time:1,anchor:{x:0,z:0},stats:{rescued:0,failed:0}} as unknown as World;
 audio.update(w);for(let i=0;i<60;i++)audio.update(w);assert.deepEqual(played,['shot']);
 w.visualEvents=[{...launch,serial:2,time:0},{...launch,serial:3,x:100}];audio.update(w);assert.deepEqual(played,['shot']);
 w.visualEvents=[{...launch,serial:4,heroId:'yamato_battlecruiser',unitType:'battlecruiser'}];audio.update(w);assert.deepEqual(played,['shot','blast']);
});
