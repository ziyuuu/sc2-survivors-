import test from 'node:test';
import assert from 'node:assert/strict';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {World} from '../src/simulation/world';
import {campaign18Schedule,campaign18StageConfig} from '../src/data/campaign18';
import {hudDecimal,hudInteger,hudInterval,romanStage} from '../src/ui/native-hud/numbers';
import {renderRunTalents} from '../src/ui/native-hud/run-talents';
import type {Race} from '../src/data/races';
import type {Difficulty} from '../src/data/stages';
import {RunSession} from '../src/app/run-session';
import {writeArchive} from '../src/persistence/archive';
function finale(race:Race,difficulty:Difficulty,sandbox=false,win=true){const w=new World({race,difficulty,sandbox,waves:false,terrain:false,obstacles:[],seed:421});assert.ok(w.start());w.stage=18;w.prepareStage();if(win){w.hive!.hp=0;const event=campaign18Schedule(campaign18StageConfig(18,difficulty),421).specials[0],boss=(w as any).spawnCampaignSpecial(event);w.hit(boss,1e9,[],1,'terran');w.expansionHives.clear();}w.stageElapsed=w.duration;return w;}
test('cosmetic choices cannot unlock rewards and travel with the existing checksummed profile',()=>{
 const p=new PermanentProfile(1000),before=p.toSnapshot();for(const race of ['terran','protoss','zerg'] as const){assert.equal(p.hudSkin(race),1);assert.equal(p.selectHudSkin(race,2),false);assert.equal(p.hasVeteranHud(race),false);}
 assert.deepEqual(p.toSnapshot(),before);assert.ok(p.recordHardCampaignClear('zerg'));assert.ok(p.selectHudSkin('zerg',2));const revision=p.revision;assert.equal(p.recordHardCampaignClear('zerg'),false);assert.ok(p.selectHudSkin('zerg',2));assert.equal(p.revision,revision);assert.deepEqual(p.toSnapshot().balances,before.balances);
 const copy=PermanentProfile.parseJSON(p.exportJSON())!;assert.equal(copy.hudSkin('zerg'),2);assert.equal(copy.hasVeteranHud('terran'),false);assert.ok(copy.selectHudSkin('zerg',1));assert.equal(copy.hudSkin('zerg'),1);assert.ok(copy.hasVeteranHud('zerg'));assert.equal(copy.toSnapshot().version,6);
});
test('native final victory unlocks only its own race without changing the original stage payout',()=>{
 for(const race of ['terran','protoss','zerg'] as const)for(const difficulty of ['hard','hell'] as const){const w=finale(race,difficulty),wallet={...w.wallet},before=w.permanentProfile.raceBalance(race);w.endStage();assert.equal(w.phase,'won');assert.ok(w.permanentProfile.hasVeteranHud(race));assert.equal(w.permanentProfile.hudSkin(race),1);assert.ok(w.wallet.minerals>wallet.minerals);assert.ok(w.permanentProfile.raceBalance(race)>before);const snapshot=w.permanentProfile.toSnapshot();w.endStage();assert.deepEqual(w.permanentProfile.toSnapshot(),snapshot);for(const other of ['terran','protoss','zerg'] as const)if(other!==race)assert.equal(w.permanentProfile.hasVeteranHud(other),false);}
});
test('normal victory, sandbox, defeat, premature finale and early stages do not unlock skins',()=>{
 for(const [difficulty,sandbox,win] of [['normal',false,true],['hard',true,true],['hard',false,false]] as const){const w=finale('terran',difficulty,sandbox,win);w.endStage();assert.equal(w.permanentProfile.hasVeteranHud('terran'),false);}
 const w=finale('terran','hard');w.stageElapsed=1;w.endStage();assert.equal(w.phase,'battle');assert.equal(w.permanentProfile.hasVeteranHud('terran'),false);
 const early=new World({difficulty:'hard',waves:false,terrain:false,obstacles:[]});early.start();early.endStage();assert.equal(early.phase,'reward');assert.equal(early.permanentProfile.hasVeteranHud('terran'),false);
});
test('run talent inspection reads the frozen allocation, not later profile edits',()=>{
 const p=new PermanentProfile(100);p.buy('T-R01');const w=new World({permanentProfile:p,waves:false,terrain:false,obstacles:[]});w.start();const before=w.captureRun(),first=renderRunTalents(w);p.respec();assert.equal(renderRunTalents(w),first);assert.match(first,/SCV救星/);assert.doesNotMatch(first,/data-action="mvp-talent-(buy|respec|preset)"/);assert.deepEqual(w.captureRun(),before);
});
test('HUD values use integer health, one decimal attributes and nonzero millisecond intervals',()=>{
 assert.equal(hudInteger(99.001),'100');assert.equal(hudDecimal(1.3333),'1.3');assert.deepEqual(hudInterval(.0064),{value:'6',unit:'毫秒'});assert.deepEqual(hudInterval(.0001),{value:'1',unit:'毫秒'});assert.equal(romanStage(18),'ⅩⅧ');
});
test('local continue retains unsaved skin selection while explicit import retains the file selection',async()=>{
 const p=new PermanentProfile();p.recordHardCampaignClear('terran');const old=p.exportJSON();
 const w=new World({permanentProfile:p,waves:false,terrain:false,obstacles:[]});
 const session=new RunSession(w,null,{run:null,savedAt:0,notice:'',archiveProfile:old});p.selectHudSkin('terran',2);await assert.rejects(session.saveNow());
 const local=session.prepareLoad();assert.ok(session.commitLoad(local.id,'ready','ready'));assert.equal(p.hudSkin('terran'),2);
 const external=session.prepareLoad(writeArchive({profile:old,run:null}));assert.ok(session.commitLoad(external.id,'ready','ready'));assert.equal(p.hudSkin('terran'),1);
});
