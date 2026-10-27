import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {newEquipmentAccount,grantEquipment,abandonEquipmentRun} from '../src/simulation/starship/inventory';
import {validateEquipmentAccount} from '../src/simulation/persistence/starship-snapshot';
import {readArchive} from '../src/persistence/archive';
import {renderMenu} from '../src/ui/hud/m3-menu';
function fixture(){const w=new World({seed:529,race:'terran',terrain:false,waves:false,sandbox:true,equipmentAccount:newEquipmentAccount(529)}),s=new RunSession(w,null,{run:null,savedAt:0,notice:''});return {w,s};}
test('new-game deployment shows one overwrite reminder and permits departure with an old active run',()=>{
 const {w,s}=fixture();w.start();s.keepRun();
 const html=renderMenu({equipmentUI:true,page:'confirm',race:'zerg',difficulty:'normal',preset:0,hero:null,loadPreview:null,error:''},w.permanentProfile,s);
 assert.equal(html.split('开始新游戏将覆盖旧局。').length-1,1);assert.ok(!html.includes('请先结束当前出征'));assert.ok(!html.includes('完成撤离或结算后'));
 const launch=html.match(/<button[^>]*data-action="menu-start"[^>]*>/)?.[0];assert.ok(launch);assert.ok(!launch.includes('disabled'));
});
test('new-game preparation preserves old checkpoint, then replaces it without defeat settlement',()=>{
 const {w,s}=fixture(),a=w.starship.account;
 const item=grantEquipment(a,{template:'attribute.3',race:'terran',slot:'offense1'},'original',{kind:'warehouse'});assert.ok(item.ok);w.equipItem(item.value.id,'offense1');w.start();
 const old=w.runId!,bag=grantEquipment(a,{template:'attribute.3',race:'terran',slot:'defense1'},'bag',{kind:'backpack',run:old});assert.ok(bag.ok);w.endStage();s.keepRun();
 const checkpoint=structuredClone(s.savedSnapshot),account=structuredClone(a),ticket=s.prepareNewRun('zerg','normal',0,null);
 assert.deepEqual(a,account);assert.deepEqual(s.savedSnapshot,checkpoint);assert.equal(s.canResume,true);
 assert.equal(s.commitNewRun(ticket.id,'ready','wrong'),false);assert.deepEqual(a,account);
 assert.ok(s.commitNewRun(ticket.id,'ready','ready'));assert.equal(w.expedition.race,'zerg');assert.notEqual(w.runId,old);assert.equal(w.stage,1);
 assert.ok(w.starship.account.items[item.value.id]);assert.equal(w.starship.account.locations[item.value.id].kind,'equipped');assert.equal(w.starship.account.items[bag.value.id],undefined);
 assert.equal(w.starship.account.receipts['settlement:'+old],undefined);assert.equal(w.starship.account.settlement,undefined);
 assert.doesNotThrow(()=>validateEquipmentAccount(w.starship.account));assert.equal(readArchive(s.exportJSON()).bundle.run!.state.runId,w.runId);
});
test('explicit abandonment discards only unextracted loot and never rolls loss, dust or rewards',()=>{
 const {w}=fixture();w.start();const a=w.starship.account,old=w.runId!;grantEquipment(a,{template:'attribute.3',race:'terran',slot:'defense1'},'ground',{kind:'ground',run:old,x:0,z:0});
 const rng=a.rng,dust=a.dust;abandonEquipmentRun(a);assert.equal(a.rng,rng);assert.equal(a.dust,dust);assert.equal(a.run,null);assert.equal(a.settlement,undefined);assert.equal(Object.values(a.locations).some(l=>l.kind==='ground'||l.kind==='backpack'),false);
 const same=structuredClone(a);abandonEquipmentRun(a);assert.deepEqual(a,same);validateEquipmentAccount(a);
});
test('cancelled or failed replacement preserves recoverable old run and equipment; stale inventory cannot commit',()=>{
 const {w,s}=fixture();w.start();w.endStage();s.keepRun();const old=s.savedSnapshot!,account=structuredClone(w.starship.account);
 const cancelled=s.prepareNewRun('zerg','easy',0,null);s.cancelPreparedNewRun();assert.equal(s.commitNewRun(cancelled.id,'r','r'),false);assert.equal(s.canResume,true);
 const stale=s.prepareNewRun('zerg','easy',0,null);w.starship.account.revision++;assert.equal(s.commitNewRun(stale.id,'r','r'),false);w.starship.account.revision--;
 const failed=s.prepareNewRun('zerg','easy',0,null),start=w.start;w.start=()=>false;assert.equal(s.commitNewRun(failed.id,'r','r'),false);w.start=start;
 assert.deepEqual(w.starship.account,account);assert.deepEqual(s.savedSnapshot,old);assert.equal(s.canResume,true);assert.ok(s.resume());assert.equal(w.runId,old.state.runId);assert.deepEqual(w.starship.account,account);
});
