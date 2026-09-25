import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {MVP_TALENTS} from '../src/data/mvp-talents';
import {tickTalentSupport} from '../src/simulation/combat/talent-support';
import type {Race} from '../src/data/races';

function world(race:Race){const profile=new PermanentProfile(),levels=Object.fromEntries(MVP_TALENTS.filter(node=>node.race===race&&node.line==='army').map(node=>[node.id,node.maxRank]));assert.equal(profile.award(`fixture:${race}`,59,race),true);const quote=profile.previewTalentAllocation(race,0,levels);assert.ok(quote);assert.ok(profile.commitTalentAllocation(quote,quote.expectedRevision));const w=new World({race,permanentProfile:profile,seed:58,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.equal(w.start(),true);w.nextTankSupportAt=0;return w;}
test('A13 fires exactly eight reserved rounds and restores delayed impacts without duplicating them',()=>{
 const w=world('terran'),enemy=w.addUnit('roach','zerg',5,0);enemy.maxHp=10000;enemy.hp=10000;
 tickTalentSupport(w);assert.equal(w.talentSupportImpacts.length,1);assert.equal(enemy.hp,10000);
 const copy=new World({race:'terran',permanentProfile:w.permanentProfile,seed:58,waves:false,sandbox:true,terrain:false,obstacles:[]});copy.restoreRun(w.captureRun());copy.time=.35;tickTalentSupport(copy);assert.ok(copy.entities.get(enemy.id)!.hp<10000);assert.equal(copy.talentSupportImpacts.length,0);
 for(let second=1;second<=8;second++){w.time=second;tickTalentSupport(w);}assert.equal(w.nextSupportTick,8);assert.equal(w.effects.filter(effect=>effect.kind==='explosion').length,8);assert.equal(w.talentSupportImpacts.length,0);
});
test('A13 healing follows each race target system without restoring temporary troops',()=>{
 const terran=world('terran'),bio=terran.familyUnits('marine')[0],mechanical=terran.addUnit('medivac','terran',2,0);bio.maxHp=200;bio.hp=130;mechanical.maxHp=200;mechanical.hp=130;tickTalentSupport(terran);
 assert.equal(bio.maxHp-bio.hp,7);assert.equal(mechanical.maxHp-mechanical.hp,49);
 const zerg=world('zerg'),ling=zerg.familyUnits('zergling')[0],mech=zerg.addUnit('medivac','terran',2,0);ling.maxHp=100;ling.hp=70;mech.maxHp=200;mech.hp=170;tickTalentSupport(zerg);assert.equal(ling.hp,ling.maxHp);assert.equal(mech.maxHp-mech.hp,30);
 const protoss=world('protoss'),zealot=protoss.familyUnits('zealot')[0];zealot.maxShield=200;zealot.shield=130;zealot.hp=zealot.maxHp-50;tickTalentSupport(protoss);assert.equal(zealot.maxShield!-(zealot.shield??0),7);assert.equal(zealot.maxHp-zealot.hp,50);
});
