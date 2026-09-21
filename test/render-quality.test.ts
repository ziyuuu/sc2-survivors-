import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveQuality,renderPixelRatio} from '../src/render/settings/quality.ts';
test('desktop defaults to native pixels while mobile can choose its quality',()=>{
 assert.equal(resolveQuality(null),'native');assert.equal(resolveQuality(null,true),'balanced');assert.equal(resolveQuality('native',true),'native');assert.equal(resolveQuality('invalid'),'native');
 assert.equal(renderPixelRatio('native',2,1920,1080),2);assert.equal(renderPixelRatio('balanced',2,1920,1080),1.5);assert.equal(renderPixelRatio('performance',2,1920,1080),1);
});
test('display scaling changes retain native sharpness within GPU dimension limits',()=>{
 assert.equal(renderPixelRatio('native',1.25,1920,1080),1.25);assert.equal(renderPixelRatio('native',3,844,390),3);
 assert.equal(renderPixelRatio('native',3,4000,2000,8000),2);assert.equal(renderPixelRatio('native',NaN,1920,1080),1);
});
