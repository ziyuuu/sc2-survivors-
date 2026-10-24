import test from 'node:test';
import assert from 'node:assert/strict';
import {ASSETS,configurePlatformAssetUrl} from '../src/assets/manifest';
import {STARSHIP_ART_ASSETS,STARSHIP_ART_IDS} from '../src/assets/starship-art.generated';
import {starshipImage} from '../src/ui/starship/runtime-art';
import {catalogRows} from '../src/ui/starship/presentation';
import {World} from '../src/simulation/world';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {RunSession} from '../src/app/run-session';
import {renderMenu,renderReadiness} from '../src/ui/hud/m3-menu';
import {renderPause,renderVictory,renderEndless} from '../src/ui/presentation/end-screens';
import {SaveControls} from '../src/ui/hud/save-controls';

test('every equipment presentation resolves through the common pack/platform asset boundary',()=>{
 assert.equal(new Set(STARSHIP_ART_ASSETS.map(a=>a.id)).size,STARSHIP_ART_ASSETS.length);
 for(const row of catalogRows){assert.ok(STARSHIP_ART_IDS[row.art],row.art);assert.match(starshipImage(row.art),/^assets\/ui\/starship\/[a-f0-9]{64}\.(webp|png)$/);}
 for(const ids of Object.values(STARSHIP_ART_IDS))for(const id of [ids.src,ids.detail].filter(Boolean))assert.ok(ASSETS.has(id!),id);
 const key=Object.keys(STARSHIP_ART_IDS).find(k=>STARSHIP_ART_IDS[k].detail)!;
 try{configurePlatformAssetUrl(id=>'verified/'+id);assert.equal(starshipImage(key,true),'verified/'+STARSHIP_ART_IDS[key].detail);assert.equal(starshipImage(key),'verified/'+STARSHIP_ART_IDS[key].src);}finally{configurePlatformAssetUrl(null);}
});

test('the integrated account has no starter grants and exposes durable equipment archives',()=>{
 const account=newEquipmentAccount(529),world=new World({seed:529,terrain:false,equipmentAccount:account}),session=new RunSession(world,null,{repository:null,profile:world.permanentProfile,run:null,notice:'',savedAt:0});
 assert.equal(account.dust,0);assert.deepEqual(account.items,{});assert.equal(world.autoWaves,true);assert.equal(session.memoryOnly,false);
 const menu=renderMenu({equipmentUI:true,page:'title',race:'terran',difficulty:'normal',preset:0,hero:null,loadPreview:null,error:''},world.permanentProfile,session);
 assert.ok(menu.includes('旗舰配装'));assert.ok(!menu.includes('刷新或关闭后重置'));assert.ok(menu.includes('继续游戏'));assert.ok(!menu.includes('data-action="menu-load"'));
 const save=new SaveControls(session,()=>{},()=>{});assert.ok(!save.render('pause').includes('data-action="save-'));assert.ok(save.render('settings').includes('data-action="save-export"'));assert.ok(save.render('settings').includes('data-action="menu-load-local"'));
 world.start();assert.ok(!renderPause(world,'').includes('data-action="save-export"'));assert.ok(!renderEndless(world).includes('data-action="save-export"'));
 world.stage=3;world.endStage();assert.ok(world.extractEquipment());
 const ended=renderVictory(world,save.render('ended'),false,true);assert.ok(ended.includes('战利品结算'));assert.ok(!ended.includes('data-action="save-'));
});
