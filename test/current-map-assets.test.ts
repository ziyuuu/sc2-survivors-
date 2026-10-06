import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAP_THEMES,campaignMapAssets} from '../src/data/campaign-map';
import {assetUrl} from '../src/assets/manifest';
import {isRetiredAsset} from '../src/assets/retired';

test('each current map resolves every required asset without an embedded release override',()=>{
 for(const theme of Object.keys(MAP_THEMES) as (keyof typeof MAP_THEMES)[]){
  for(const id of campaignMapAssets({version:3,seed:89241,theme})){
   assert.equal(isRetiredAsset(id),false,theme+': '+id);
   assert.ok(assetUrl(id),theme+': '+id);
  }
 }
 assert.equal(isRetiredAsset('model.map.unused_future_prop'),true);
 assert.equal(isRetiredAsset('map.acropolis'),true);
});
