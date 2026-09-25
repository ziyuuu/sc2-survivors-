import test from 'node:test';
import assert from 'node:assert/strict';
import {THREE_RACE_TALENTS,THREE_RACE_TALENT_BY_ID,THREE_RACE_TALENT_COLUMNS,aggregateTalentEffects,validateTalentAllocation,allocatedTalentPoints,talentAdjustedTransformSeconds,talentAdjustedShieldDelaySeconds,type TalentColumn,type TalentRace} from '../src/data/three-race-talents.ts';
import {ThreeRaceTalentProfile,legacyTalentInvestment,LEGACY_TALENT_PRICE_SNAPSHOT,LEGACY_TOTAL_TALENT_COST} from '../src/simulation/progression/three-race-talent-profile.ts';
import {TALENTS,TOTAL_TALENT_COST} from '../src/data/talents.ts';
import {talentPointsForStage,talentPointsForEndlessMinute} from '../src/simulation/progression/talent-profile.ts';
import {ALL_FAMILIES} from '../src/data/races.ts';
function investment(race:TalentRace,line:TalentColumn,points:number){
 const levels:Record<string,number>={};
 const nodes=THREE_RACE_TALENTS.filter(node=>node.race===race&&node.line===line&&node.tier<7);
 for(const node of nodes){const take=Math.min(points,node.maxRank);if(take){levels[node.id]=take;points-=take;}if(points===0)break;}
 assert.equal(points,0);return levels;
}
function capstone(race:TalentRace,line:TalentColumn){return {...investment(race,line,30),[`${race}_${line}_capstone`]:1};}
const close=(actual:number|undefined,expected:number)=>assert.ok(Math.abs((actual??0)-expected)<1e-10,`${actual} ~= ${expected}`);

test('117 nodes cover three aligned trees, nine columns, 108 triple-rank and nine single-rank nodes',()=>{
 assert.equal(THREE_RACE_TALENTS.length,117);assert.equal(THREE_RACE_TALENT_BY_ID.size,117);
 assert.equal(THREE_RACE_TALENTS.filter(node=>node.maxRank===3).length,108);
 assert.equal(THREE_RACE_TALENTS.filter(node=>node.maxRank===1).length,9);
 for(const race of ['terran','zerg','protoss'] as const){
  const nodes=THREE_RACE_TALENTS.filter(node=>node.race===race);assert.equal(nodes.length,39);assert.equal(nodes.reduce((sum,node)=>sum+node.maxRank,0),111);
  for(const line of THREE_RACE_TALENT_COLUMNS[race]){const branch=nodes.filter(node=>node.line===line.id);assert.equal(branch.length,13);assert.equal(branch.reduce((sum,node)=>sum+node.maxRank,0),37);assert.equal(validateTalentAllocation(race,capstone(race,line.id)),null);}
 }
 for(const node of THREE_RACE_TALENTS){assert.equal(node.allocationCost,1);assert.equal(node.resourceCost,3);for(const effect of node.effects)for(const family of effect.families)assert.ok(ALL_FAMILIES.includes(family as never),family);}
});

test('every bought rank spends three resources and one allocation point, including the capstone',()=>{
 const profile=new ThreeRaceTalentProfile(150),levels=investment('terran','bio',30);
 assert.ok(profile.savePreset('terran',0,levels));assert.equal(profile.balance,60);assert.equal(profile.allocated,30);
 assert.ok(profile.buy('terran_bio_capstone'));assert.equal(profile.balance,57);assert.equal(profile.allocated,31);
 assert.equal(profile.buy('terran_bio_capstone'),false);
});

test('main capstone plus nineteen secondary points is valid; point 51 and two capstones are rejected atomically',()=>{
 const profile=new ThreeRaceTalentProfile(258),levels={...capstone('terran','bio'),...investment('terran','mechanical',19)};
 assert.ok(profile.savePreset('terran',0,levels));assert.equal(profile.allocated,50);assert.equal(profile.balance,108);
 const before=profile.exportJSON();assert.equal(profile.buy('terran_aviation_airframe'),false);assert.equal(profile.exportJSON(),before);
 assert.equal(validateTalentAllocation('terran',{...capstone('terran','bio'),...capstone('terran','mechanical')}),'allocation-cap');
 assert.equal(profile.savePreset('terran',0,{...capstone('terran','bio'),...capstone('terran','mechanical')}),false);assert.equal(profile.exportJSON(),before);
});

test('tier thresholds count lower tiers of the same column, not other columns or same-tier points',()=>{
 const profile=new ThreeRaceTalentProfile(999);assert.equal(profile.buy('terran_bio_march'),false);
 assert.ok(profile.buy('terran_bio_fire_control'));assert.ok(profile.buy('terran_bio_fire_control'));assert.ok(profile.buy('terran_bio_fire_control'));
 assert.ok(profile.buy('terran_bio_light_protection'));assert.equal(profile.buy('terran_bio_march'),false);assert.ok(profile.buy('terran_bio_light_protection'));assert.ok(profile.buy('terran_bio_march'));
 assert.equal(validateTalentAllocation('terran',{...investment('terran','bio',29),terran_bio_capstone:1}),'tier-locked');
 assert.equal(validateTalentAllocation('terran',{...investment('terran','mechanical',30),terran_bio_capstone:1}),'tier-locked');
 assert.equal(validateTalentAllocation('terran',{terran_bio_march:3,terran_bio_medical_battery:3}),'tier-locked');
});

test('resource examples retain remainders and resources beyond the 150-resource spend cap',()=>{
 for(const [principal,points,balance] of [[50,16,2],[149,49,2],[150,50,0],[258,50,108]]){
  const profile=new ThreeRaceTalentProfile(principal),first=Math.min(36,points),levels={...investment('terran','bio',first),...investment('terran','mechanical',points-first)};
  assert.equal(profile.affordableAllocation,points);assert.ok(profile.savePreset('terran',0,levels));assert.equal(profile.allocated,points);assert.equal(profile.balance,balance);
  assert.ok(profile.respec());assert.equal(profile.balance,principal);assert.equal(profile.principal,principal);
 }
});

test('nine presets share one principal and one active investment; switching or respec gives no resource duplication',()=>{
 const profile=new ThreeRaceTalentProfile(150);
 for(const race of ['terran','zerg','protoss'] as const)for(const slot of [0,1,2] as const){const line=THREE_RACE_TALENT_COLUMNS[race][slot].id;assert.ok(profile.savePreset(race,slot,capstone(race,line)));}
 assert.equal(profile.principal,150);assert.equal(profile.spent,93);
 assert.ok(profile.activatePreset('protoss',2));assert.equal(profile.balance,57);assert.equal(profile.activeRace,'protoss');assert.equal(profile.level('terran_bio_capstone'),0);
 assert.ok(profile.respec());assert.equal(profile.balance,150);assert.equal(allocatedTalentPoints(profile.getPreset('terran',0).levels),31);
 assert.ok(profile.activatePreset('terran',0));assert.equal(profile.balance,57);assert.equal(profile.principal,150);
});

test('inactive future presets are free but cannot activate without resources',()=>{
 const profile=new ThreeRaceTalentProfile(2);assert.ok(profile.savePreset('zerg',1,capstone('zerg','carapace')));
 assert.equal(profile.activatePreset('zerg',1),false);assert.equal(profile.balance,2);assert.equal(profile.activeRace,'terran');
 assert.equal(profile.buy('terran_bio_fire_control'),false);
});

test('freezeRun is detached and immutable across purchases, respec and race switches',()=>{
 const profile=new ThreeRaceTalentProfile(150);profile.buy('terran_bio_fire_control');const frozen=profile.freezeRun();
 assert.equal(Object.isFrozen(frozen),true);assert.equal(Object.isFrozen(frozen.levels),true);
 profile.buy('terran_bio_fire_control');profile.respec();profile.activatePreset('protoss',0);
 assert.equal(frozen.race,'terran');assert.equal(frozen.levels.terran_bio_fire_control,1);assert.equal(frozen.allocated,1);
 assert.equal(profile.allocated,0);
});

test('legacy investment uses exact frozen historical prices and preserves receipts',()=>{
 assert.equal(LEGACY_TOTAL_TALENT_COST,258);assert.equal(TOTAL_TALENT_COST,258);assert.equal(Object.keys(LEGACY_TALENT_PRICE_SNAPSHOT).length,TALENTS.length);
 for(const node of TALENTS)assert.deepEqual(LEGACY_TALENT_PRICE_SNAPSHOT[node.id],{max:node.max,cost:node.cost});
 const all=Object.fromEntries(TALENTS.map(node=>[node.id,node.max]));assert.equal(legacyTalentInvestment(all),258);
 const profile=ThreeRaceTalentProfile.migrateLegacy({balance:42,levels:all,receipts:['old:stage:12']});
 assert.equal(profile.principal,300);assert.equal(profile.balance,300);assert.equal(profile.allocated,0);
 assert.equal(profile.award('old:stage:12',99),false);assert.ok(profile.award('old:endless:1',2));assert.equal(profile.principal,302);
 const mixed=ThreeRaceTalentProfile.migrateLegacy({balance:7,levels:{scv_savior:2,range_master:3,hero_support:1,airlift:2,apm_master:1},receipts:[]});assert.equal(mixed.principal,45);
 assert.throws(()=>legacyTalentInvestment({unknown:1}));assert.throws(()=>legacyTalentInvestment({scv_savior:3}));
});

test('resource receipts remain idempotent at full allocation and endless earnings have no new 20-minute cap',()=>{
 const profile=new ThreeRaceTalentProfile(150);profile.savePreset('terran',0,{...capstone('terran','bio'),...investment('terran','mechanical',19)});
 for(let minute=1;minute<=25;minute++)assert.ok(profile.award(`run:endless:${minute}`,talentPointsForEndlessMinute('hell')));
 assert.equal(profile.balance,50);assert.equal(profile.allocated,50);assert.equal(profile.award('run:endless:25',2),false);
 assert.deepEqual(['easy','normal','hard','hell'].map(difficulty=>Array.from({length:18},(_,i)=>talentPointsForStage(difficulty as never,i+1)).reduce((a,b)=>a+b,0)),[6,6,12,18]);
});

test('snapshot and checksum round trips preserve all nine presets and reject illegal allocations atomically',()=>{
 const profile=new ThreeRaceTalentProfile(258);profile.savePreset('terran',0,capstone('terran','bio'));profile.savePreset('protoss',2,capstone('protoss','fleet'));profile.award('campaign:6',1);
 const raw=profile.exportJSON(),restored=ThreeRaceTalentProfile.parseJSON(raw);assert.ok(restored);assert.deepEqual(restored.toSnapshot(),profile.toSnapshot());
 const snapshot=profile.toSnapshot();snapshot.presets.terran[0].levels.terran_bio_capstone=0;assert.equal(profile.level('terran_bio_capstone'),1);
 assert.equal(profile.importJSON(raw.replace('259','260')),false);assert.equal(profile.exportJSON(),raw);
 const invalid=profile.toSnapshot();invalid.presets.terran[0].levels.terran_bio_capstone=2;assert.equal(ThreeRaceTalentProfile.fromSnapshot(invalid),null);
 const cross=profile.toSnapshot();cross.presets.terran[0].levels.zerg_assault_skin=1;assert.equal(ThreeRaceTalentProfile.fromSnapshot(cross),null);
 const poor=profile.toSnapshot();poor.resourcePrincipal=1;assert.equal(ThreeRaceTalentProfile.fromSnapshot(poor),null);
});

test('aggregation adds compatible ranks once and excludes other races, heroes, workers and temporary summons',()=>{
 const levels={terran_bio_fire_control:3,terran_bio_bio_fire:2,zerg_assault_claws:3};
 close(aggregateTalentEffects(levels,{race:'terran',kind:'ordinary',familyId:'marine'}).weaponDamagePct,.12);
 close(aggregateTalentEffects(levels,{race:'terran',kind:'elite',familyId:'marine'}).weaponDamagePct,.12);
 for(const kind of ['hero','worker','summon'] as const)assert.deepEqual(aggregateTalentEffects(levels,{race:'terran',kind,familyId:'marine'}),{});
 assert.deepEqual(aggregateTalentEffects(levels,{race:'protoss',kind:'ordinary',familyId:'marine'}),{});
});

test('mode, damage-free-time and HP/shield thresholds are the only conditional interpreters',()=>{
 const mech={terran_mechanical_capstone:1};close(aggregateTalentEffects(mech,{race:'terran',kind:'ordinary',familyId:'tank',mode:'siege'}).weaponDamagePct,.18);
 assert.deepEqual(aggregateTalentEffects(mech,{race:'terran',kind:'ordinary',familyId:'tank',mode:'tank'}),{});
 close(aggregateTalentEffects(mech,{race:'terran',kind:'ordinary',familyId:'hellion',mode:'hellbat'}).armorFlat,1);
 const bio={terran_bio_capstone:1};close(aggregateTalentEffects(bio,{race:'terran',kind:'ordinary',familyId:'marine',secondsSinceEnemyDamage:4}).regenMaxHpPerSecond,.004);
 assert.deepEqual(aggregateTalentEffects(bio,{race:'terran',kind:'ordinary',familyId:'marine',secondsSinceEnemyDamage:3.999}),{});
 close(aggregateTalentEffects({zerg_assault_capstone:1},{race:'zerg',kind:'ordinary',familyId:'ultralisk',hp:50,maxHp:100}).armorFlat,2);
 assert.deepEqual(aggregateTalentEffects({zerg_assault_capstone:1},{race:'zerg',kind:'ordinary',familyId:'ultralisk',hp:51,maxHp:100}),{});
 close(aggregateTalentEffects({protoss_warriors_capstone:1},{race:'protoss',kind:'ordinary',familyId:'stalker',shield:25,maxShield:100}).armorFlat,2);
 assert.equal(aggregateTalentEffects({protoss_warriors_capstone:1},{race:'protoss',kind:'ordinary',familyId:'stalker',shield:0,maxShield:0}).armorFlat,undefined);
});

test('ability scope does not buff another spell; detection is race-level and independent of army composition',()=>{
 const levels={zerg_carapace_bile_damage:3,zerg_flight_senses:3};
 close(aggregateTalentEffects(levels,{race:'zerg',kind:'ordinary',familyId:'ravager',ability:'bile'}).abilityDamagePct,.12);
 assert.equal(aggregateTalentEffects(levels,{race:'zerg',kind:'ordinary',familyId:'ravager',ability:'transfusion'}).abilityDamagePct,undefined);
 close(aggregateTalentEffects(levels,{race:'zerg',kind:'raceAbility'}).detectionRadiusPct,.06);
 assert.equal(aggregateTalentEffects(levels,{race:'zerg',kind:'ordinary',familyId:'mutalisk'}).detectionRadiusPct,undefined);
});

test('carrier output reaches owned interceptors once; shield bonuses stay on the carrier',()=>{
 const levels={protoss_fleet_interceptors:3,protoss_fleet_capstone:1,protoss_fleet_carrier_shield:3};
 close(aggregateTalentEffects(levels,{race:'protoss',kind:'summon',ownerFamilyId:'carrier',summonType:'interceptor'}).weaponDamagePct,.21);
 const mother=aggregateTalentEffects(levels,{race:'protoss',kind:'ordinary',familyId:'carrier'});assert.equal(mother.weaponDamagePct,undefined);close(mother.maxShieldPct,.12);
 const child=aggregateTalentEffects(levels,{race:'protoss',kind:'summon',ownerFamilyId:'carrier',summonType:'interceptor'});assert.equal(child.maxShieldPct,undefined);
 assert.deepEqual(aggregateTalentEffects(levels,{race:'protoss',kind:'summon',ownerFamilyId:'carrier',summonType:'other'}),{});
 assert.deepEqual(aggregateTalentEffects(levels,{race:'protoss',kind:'summon',ownerFamilyId:'phoenix',summonType:'interceptor'}),{});
});

test('deployment and shield delay floors remain explicit at modifier application',()=>{
 assert.equal(talentAdjustedTransformSeconds(1,1),.25);close(talentAdjustedTransformSeconds(2,.18),1.64);
 assert.equal(talentAdjustedShieldDelaySeconds(2,10),1);assert.equal(talentAdjustedShieldDelaySeconds(10,1),9);
});
