import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildSync} from 'esbuild';
import * as T from 'three';
const compiled=buildSync({stdin:{contents:"export * from './src/lib/property-camera';export * from './src/lib/property-building';export * from './src/lib/property-scene';",resolveDir:new URL('..',import.meta.url).pathname},bundle:true,platform:'node',format:'cjs',write:false,external:['three']}).outputFiles[0].text;
const module={exports:{}};new Function('module','exports','require',compiled)(module,module.exports,createRequire(import.meta.url));
const {PropertyCameraView,INTERIOR_PITCH,MIN_PITCH,MAX_PITCH,framePropertyCamera,createBuilding,buildPropertyScene,BUILDING_TYPES}=module.exports;

test('cutaway raises a shallow exterior once and closing restores its exact pose',()=>{
 const view=new PropertyCameraView();view.preset('left');const exterior={yaw:view.yaw,pitch:view.pitch,name:view.name};
 view.setCutaway(true);assert.equal(view.yaw,exterior.yaw);assert.equal(view.pitch,INTERIOR_PITCH);
 view.adjust(.83,.78);view.setCutaway(true);view.setCutaway(true);
 assert.equal(view.yaw,.83);assert.equal(view.pitch,.78,'ordinary cutaway updates retain manual tilt');
 view.setCutaway(false);assert.deepEqual({yaw:view.yaw,pitch:view.pitch,name:view.name},exterior);
 view.setCutaway(true);assert.equal(view.pitch,INTERIOR_PITCH,'a new entry supplies a useful interior view again');
});
test('entering cutaway never lowers an already overhead view',()=>{
 const view=new PropertyCameraView();view.preset('aerial');view.setCutaway(true);assert.equal(view.pitch,MAX_PITCH);
 view.setCutaway(false);assert.equal(view.name,'aerial');assert.equal(view.pitch,MAX_PITCH);
});
test('reset and directional presets use a useful elevation for the current mode',()=>{
 const view=new PropertyCameraView();view.setCutaway(true);
 for(const name of ['front','rear','left','right','perspective']){view.adjust(1,.2);view.preset(name);assert.equal(view.pitch,INTERIOR_PITCH);}
 view.setCutaway(false);view.preset('perspective');assert.equal(view.pitch,.5);
 view.preset('front');assert.equal(view.pitch,.15);
});
test('manual tilt remains bounded and rotation is unrestricted',()=>{
 const view=new PropertyCameraView();view.adjust(12*Math.PI,100);assert.equal(view.yaw,12*Math.PI);assert.equal(view.pitch,MAX_PITCH);
 view.adjust(-12*Math.PI,-100);assert.equal(view.yaw,-12*Math.PI);assert.equal(view.pitch,MIN_PITCH);
});
for(const {id} of BUILDING_TYPES)test(id+': every selected-floor mesh fits desktop/mobile orbit and tilt',()=>{
 const building=createBuilding(id),model=buildPropertyScene(T,building),camera=new T.OrthographicCamera(-30,30,25,-25,.1,500),vertex=new T.Vector3();
 for(let floor=0;floor<building.floors.length;floor++){
  model.apply(floor,true,building.floors[floor].rooms[0].id,'modern-white');model.group.updateMatrixWorld(true);
  for(const [width,height] of [[699,380],[1279,470],[344,330]])for(const pitch of [MIN_PITCH,.5,INTERIOR_PITCH,1.42,MAX_PITCH])for(let step=0;step<8;step++){
   const yaw=step*Math.PI/4;framePropertyCamera(camera,width,height,building,floor,true,yaw,pitch);
   model.floors[floor].traverse(object=>{
    if(!object.isMesh)return;let parent=object;while(parent){if(!parent.visible)return;parent=parent.parent;}
    const points=object.geometry.getAttribute('position');
    for(let i=0;i<points.count;i++){
     vertex.fromBufferAttribute(points,i).applyMatrix4(object.matrixWorld).project(camera);
     assert.ok(Number.isFinite(vertex.x)&&Number.isFinite(vertex.y)&&Math.abs(vertex.x)<.99&&Math.abs(vertex.y)<.99,`${object.name} clipped at ${width}x${height}, floor ${floor}, yaw ${yaw}, pitch ${pitch}`);
    }
   });
  }
 }
 model.dispose();
});
test('upper floor framing follows elevation without shrinking the selected floor',()=>{
 const building=createBuilding('fourplex'),camera=new T.OrthographicCamera(-30,30,25,-25,.1,500);
 const ground=framePropertyCamera(camera,344,330,building,0,true,.52,INTERIOR_PITCH),groundY=camera.position.y;
 const upper=framePropertyCamera(camera,344,330,building,1,true,.52,INTERIOR_PITCH);
 assert.equal(upper.viewHeight,ground.viewHeight);assert.equal(upper.targetY-ground.targetY,9.75);assert.ok(Math.abs(camera.position.y-groundY-9.75)<1e-9);
});
