import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {renderMenu} from '../src/ui/hud/m3-menu';
import {MVP_TALENTS} from '../src/data/mvp-talents';

test('I03 formal equipment entry exposes no legacy talent allocation and starts all three races with zero old talent effects',()=>{
 for(const race of ['terran','zerg','protoss'] as const){
  const w=new World({race,equipmentAccount:newEquipmentAccount(529),terrain:false,obstacles:[],waves:false}),session=new RunSession(w,null,{run:null,savedAt:0,notice:''});
  for(const page of ['title','confirm'] as const){const html=renderMenu({equipmentUI:true,page,race,difficulty:'normal',preset:0,hero:null,loadPreview:null,error:''},w.permanentProfile,session);assert.match(html,/旗舰配装/);assert.doesNotMatch(html,/data-action="(?:talents|menu-edit-talents|menu-preset-select|mvp-talent-buy)"|天赋预设/);}
  const preview=session.prepareNewRun(race,'normal',0,null);assert.ok(session.commitNewRun(preview.id,'ready','ready'));assert.deepEqual(w.runConfig!.frozenTalents.levels,{});assert.equal(w.runConfig!.frozenTalents.allocated,0);
  for(const talent of MVP_TALENTS.filter(t=>t.race===race))assert.equal(w.talent(talent.semanticId),0,talent.id);
  assert.equal(session.memoryOnly,false);assert.ok(JSON.parse(session.exportJSON()).data);
 }
});
