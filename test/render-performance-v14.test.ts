import test from 'node:test';
import assert from 'node:assert/strict';
import {BufferAttribute,InstancedMesh,BoxGeometry,MeshBasicMaterial,OrthographicCamera,Sphere,Vector3} from 'three';
import {uploadActive,commitInstances} from '../src/render/units/instance-updates.ts';
import {MapVisibility} from '../src/render/terrain/map-visibility.ts';
test('active uploads use scalar component ranges and shrinking batches clear stale tails',()=>{
 const a=new BufferAttribute(new Float32Array(1024*4),4);uploadActive(a,5);assert.deepEqual(a.updateRanges,[{start:0,count:20}]);uploadActive(a,2);assert.deepEqual(a.updateRanges,[{start:0,count:8}]);const version=a.version;uploadActive(a,0);assert.equal(a.version,version);assert.deepEqual(a.updateRanges,[]);
});
test('an emptied batch stops submitting draws and can repopulate without a stale count',()=>{
 const m=new InstancedMesh(new BoxGeometry(),new MeshBasicMaterial(),1024);commitInstances(m,3);assert.equal(m.visible,true);assert.equal(m.count,3);assert.deepEqual(m.instanceMatrix.updateRanges,[{start:0,count:48}]);commitInstances(m,0);assert.equal(m.visible,false);commitInstances(m,1);assert.equal(m.visible,true);assert.equal(m.count,1);
});
const camera=()=>{const c=new OrthographicCamera(-5,5,5,-5,.1,100);c.position.set(0,0,10);c.lookAt(0,0,0);c.updateProjectionMatrix();return c;};
test('map culling retains large off-centre silhouettes and uses whole geometry bounds',()=>{
 const v=new MapVisibility(),c=camera();v.update(c);assert.equal(v.intersects(new Sphere(new Vector3(7,0,0),3)),true);assert.equal(v.intersects(new Sphere(new Vector3(12,0,0),.2)),false);assert.equal(v.intersects(new Sphere(new Vector3(0,0,0),.2)),true);
});
test('camera motion and projection changes refresh map visibility, with a conservative edge skirt',()=>{
 const v=new MapVisibility(),c=camera();assert.equal(v.update(c),true);c.position.x=.3;assert.equal(v.update(c),false);assert.equal(v.intersects(new Sphere(new Vector3(5.8,0,0),.1)),true);c.left=-1;c.right=1;c.updateProjectionMatrix();assert.equal(v.update(c),true);assert.equal(v.intersects(new Sphere(new Vector3(4,0,0),.1)),false);c.position.x=10;c.lookAt(10,0,0);assert.equal(v.update(c),true);assert.equal(v.intersects(new Sphere(new Vector3(10,0,0),.1)),true);
});
