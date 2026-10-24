import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignDefinition,campaignTerrain} from '../src/data/campaign-map';
test('map identity is cached separately from mutable terrain stage and route state',()=>{
 const recipe={version:3 as const,seed:529,theme:'char' as const},definition=campaignDefinition(recipe);
 assert.equal(campaignDefinition({...recipe}),definition);
 const a=campaignTerrain(recipe),b=campaignTerrain(recipe);a.setStage(18);a.routes.set('probe',[]);
 assert.equal(a.definition,definition);assert.equal(b.definition,definition);assert.equal(b.stage,1);assert.equal(b.routes.size,0);
 const original=definition.source.sha256;
 for(let i=1;i<=6;i++)campaignDefinition({...recipe,seed:529+i});
 const restored=campaignDefinition(recipe);assert.notEqual(restored,definition);assert.equal(restored.source.sha256,original);
 assert.throws(()=>campaignDefinition({...recipe,seed:-1}));assert.throws(()=>campaignDefinition({...recipe,extra:true} as any));
});
