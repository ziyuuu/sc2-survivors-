import test from 'node:test';
import assert from 'node:assert/strict';
import {shortTutorialScript} from '../src/data/tutorial-script';
import {tutorialVoiceAsset} from '../src/data/tutorial-voice';
import {ASSETS} from '../src/assets/manifest';
for(const race of ['terran','protoss'] as const)test(`${race}: every current tutorial instruction has its own formal Chinese voice resource`,()=>{
 for(const step of shortTutorialScript(race)){const id=tutorialVoiceAsset(race,step.text);assert.ok(id,step.id);const row=ASSETS.get(id);assert.equal(row?.status,'available');assert.equal(row?.kind,'tutorial-voice');assert.ok(id.startsWith('audio.tutorial.voice.'+race+'.'));}
});
test('Queen has no synthesized instruction speech and unknown captions cannot choose an unrelated recording',()=>{
 assert.equal(tutorialVoiceAsset('zerg','点击设施调整。'),undefined);assert.equal(tutorialVoiceAsset('terran','not a recorded caption'),undefined);
});
