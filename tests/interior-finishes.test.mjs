import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {buildSync} from 'esbuild';
import * as T from 'three';
const compiled=buildSync({stdin:{contents:"export * from './src/lib/interior-finishes';export * from './src/lib/property-building';export * from './src/lib/property-scene';",resolveDir:new URL('..',import.meta.url).pathname},bundle:true,platform:'node',format:'cjs',write:false,external:['three']}).outputFiles[0].text;
const module={exports:{}};new Function('module','exports','require',compiled)(module,module.exports,createRequire(import.meta.url));
const {INTERIOR_FINISHES,isInteriorFinish,isWetRoom,furnishedFinishSVG,createBuilding,planSVG,buildPropertyScene,FINISHES,BUILDING_TYPES}=module.exports;
const names=Object.keys(INTERIOR_FINISHES),read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const digest=data=>createHash('sha256').update(data).digest('hex');

test('eight new palettes retain the three original finish identifiers and reject unknown event values',()=>{
 assert.equal(names.length,11);assert.deepEqual(names.slice(0,3),['warm-oak','light-stone','minimal']);
 for(const id of names)assert.equal(isInteriorFinish(id),true);
 for(const value of ['__proto__','constructor','modern-white',null,{},'<script>'])assert.equal(isInteriorFinish(value),false);
 assert.equal(new Set(Object.values(INTERIOR_FINISHES).map(p=>JSON.stringify(p))).size,11);
 for(const id of ['home-0-0-kitchen','home-0-0-bathroom','commercial-0-wc-a'])assert.equal(isWetRoom(id),true);
 assert.equal(isWetRoom('home-0-0-bedroom'),false);
 assert.notEqual(INTERIOR_FINISHES['classic-white'].pattern,INTERIOR_FINISHES['cream-classic'].pattern);
 assert.notEqual(INTERIOR_FINISHES['walnut-modern'].pattern,INTERIOR_FINISHES['chocolate-luxe'].pattern);
});
test('new furnished variants preserve exact geometry, toilet orientation, and unique SVG references',()=>{
 const source=read('src/data/design-study/furnished-warm-oak.svg'),geometry=source.match(/data-geometry="[^"]+"/)[0],ids=new Set();
 const originalPaths=[...source.matchAll(/\sd="([^"]+)"/g)].map(m=>m[1]);
 for(const id of names.slice(3)){
  const svg=furnishedFinishSVG(source,id),palette=INTERIOR_FINISHES[id];
  assert.ok(svg.includes(geometry));assert.match(svg,/data-furniture-id="toilet" transform="translate\(13 10\) rotate\(180\)"/);
  assert.ok(svg.includes('--furniture-fill:'+palette.cabinet));assert.ok(svg.includes('color:'+palette.metal));assert.ok(svg.includes(palette.floor));
  const paths=[...svg.matchAll(/\sd="([^"]+)"/g)].map(m=>m[1]);for(const d of originalPaths)assert.ok(paths.includes(d));
  const localIds=new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));
  for(const value of localIds){assert.ok(!ids.has(value));ids.add(value);}
  for(const [,reference] of svg.matchAll(/url\(#([^)]*)\)/g))assert.ok(localIds.has(reference),reference);
 }
});
for(const {id} of BUILDING_TYPES)test(id+': all eleven finishes change real 2D/3D surfaces while preserving geometry and exterior palette',()=>{
 const building=createBuilding(id),original=JSON.stringify(building),model=buildPropertyScene(T,building);
 const colors=new Set(),textures=new Set(),ownedMaterials=new Set(),ownedTextures=new Set();
 for(const finish of names){
  const palette=INTERIOR_FINISHES[finish];
  for(let floor=0;floor<building.floors.length;floor++){
   model.apply(floor,true,'','modern-white',finish);
   const activeFloor=building.floors[floor],svg=planSVG(building,activeFloor,'','modern-white',finish);
   assert.ok(svg.includes(palette.floor));assert.ok(svg.includes(palette.cabinet));
   assert.equal(model.roofs.visible,false);assert.equal(model.floors.filter(f=>f.visible).length,1);
   const room=model.roomMeshes.find(m=>m.userData.roomId===activeFloor.rooms[0].id),texture=room.material.map;
   colors.add(model.group.getObjectByName(activeFloor.furniture.find(f=>!['plant','bath','toilet','sofa','armchair','bed'].includes(f.kind)).id+'-top').material.color.getHexString());
   textures.add(digest(texture.image.data));
   model.roomMeshes.filter(m=>m.userData.roomId.startsWith(activeFloor.id+'-')).forEach(m=>{ownedMaterials.add(m.material);ownedTextures.add(m.material.map);});
   assert.equal(model.group.getObjectByName(activeFloor.walls[0].id+'-segment-0').material.color.getHexString(),palette.wall.slice(1).toLowerCase());
  }
  model.apply(0,false,'','classic',finish);
  const exteriorWall=model.group.getObjectByName(building.floors[0].walls[0].id+'-segment-0');assert.equal(exteriorWall.material.color.getHexString(),FINISHES.classic.wall.slice(1));
  assert.equal(JSON.stringify(building),original);
 }
 assert.equal(textures.size,11,'Every floor treatment must differ in its actual texture bytes');assert.equal(colors.size,9,'Original three keep ivory; eight additions have distinct furniture colors');
 let materialsDisposed=0,texturesDisposed=0;
 for(const m of ownedMaterials)m.addEventListener('dispose',()=>materialsDisposed++);
 for(const t of ownedTextures)t.addEventListener('dispose',()=>texturesDisposed++);
 model.dispose();assert.equal(materialsDisposed,ownedMaterials.size);assert.equal(texturesDisposed,ownedTextures.size);
});
test('built page offers eleven named finish buttons and matching native-select options with no duplicate SVG IDs',()=>{
 const html=read('dist/index.html');
 for(const id of names){assert.ok(html.includes('data-plan-material="'+id+'"'));assert.ok(html.includes('value="'+id+'"'));assert.ok(html.includes('data-plan-variant="furnished-'+id+'"'));}
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
 assert.match(html,/Explore finishes/);assert.doesNotMatch(html,/Top 8/);
});
