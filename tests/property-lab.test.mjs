import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {buildSync} from 'esbuild';
import * as T from 'three';
const require=createRequire(import.meta.url);
const compiled=buildSync({stdin:{contents:"export * from './src/lib/property-building';export * from './src/lib/property-scene';",resolveDir:new URL('..',import.meta.url).pathname},bundle:true,platform:'node',format:'cjs',write:false,external:['three']}).outputFiles[0].text;
const module={exports:{}};new Function('module','exports','require',compiled)(module,module.exports,require);
const {createBuilding,wallSegments,wallLength,wallPoint,buildPropertyScene,planSVG,FINISHES,area,furniturePoint,BUILDING_TYPES}=module.exports;
const source=JSON.parse(readFileSync(new URL('../src/data/design-study/geometry.json',import.meta.url)));
test('home shared geometry preserves all reviewed room dimensions, walls and openings',()=>{
 const floor=createBuilding('home').floors[0];
 assert.deepEqual(floor.rooms.map(r=>r.points),source.rooms.map(r=>r.points));
 assert.deepEqual(floor.rooms.map(r=>area(r.points)),[252,168,180,120]);
 assert.deepEqual(floor.walls.map(({id,exterior,...w})=>w),source.walls.map(({id,...w})=>w));
 assert.deepEqual(floor.openings.map(({id,wallId,...o})=>o),source.openings.map(({id,wallId,...o})=>o));
});
for(const type of BUILDING_TYPES){
 test(type.name+': stable IDs, exact aperture decomposition and matching 2D opening endpoints',()=>{
  const building=createBuilding(type.id),ids=new Set();
  assert.deepEqual(building,createBuilding(type.id));
  for(const f of building.floors){
   for(const x of [f,...f.rooms,...f.walls,...f.openings,...f.furniture]){assert.ok(!ids.has(x.id),x.id);ids.add(x.id);}
   for(const w of f.walls){const os=f.openings.filter(o=>o.wallId===w.id),segments=wallSegments(w,f.openings);
    const solid=segments.reduce((s,r)=>s+(r.right-r.left)*(r.top-r.bottom),0),holes=os.reduce((s,o)=>s+o.width*o.height,0);
    assert.ok(Math.abs(solid+holes-wallLength(w)*w.height)<1e-8);
    for(const o of os)for(const r of segments){assert.ok(Math.min(r.right,o.offset+o.width)-Math.max(r.left,o.offset)<=0||Math.min(r.top,o.sill+o.height)-Math.max(r.bottom,o.sill)<=0,'Wall must not cover opening '+o.id);}
   }
   const svg=planSVG(building,f,f.rooms[0].id,'modern-white');
   for(const o of f.openings){assert.ok(svg.includes('data-opening-id="'+o.id+'"'));const w=f.walls.find(w=>w.id===o.wallId);assert.ok(svg.includes('M'+wallPoint(w,o.offset).join(' ')+'L'+wallPoint(w,o.offset+o.width).join(' ')));}
  }
 });
 test(type.name+': finish and cutaway changes preserve geometry; all apertures use the wall transform',()=>{
  const building=createBuilding(type.id),model=buildPropertyScene(T,building);model.group.updateMatrixWorld(true);
  for(const f of building.floors)for(const o of f.openings){const w=f.walls.find(w=>w.id===o.wallId),group=model.group.getObjectByName(o.id),p=group.getWorldPosition(new T.Vector3()),expected=wallPoint(w,o.offset);assert.ok(Math.abs(p.x-expected[0])<1e-8);assert.ok(Math.abs(p.z-expected[1])<1e-8);assert.equal(p.y,f.elevation+o.sill);}
  const snapshot=()=>{model.group.updateMatrixWorld(true);const data=[];model.group.traverse(o=>{if(o.isMesh)data.push([o.name,...o.matrixWorld.elements,...o.geometry.attributes.position.array])});return data;};
  const before=snapshot();for(const finish of Object.keys(FINISHES)){model.apply(0,false,building.floors[0].rooms[0].id,finish);assert.deepEqual(snapshot(),before);}
  model.apply(building.floors.length-1,true,building.floors.at(-1).rooms[0].id,'modern-white');assert.equal(model.roofs.visible,false);model.apply(0,false,'','modern-white');assert.deepEqual(snapshot(),before);
  let triangles=0;model.group.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert.equal(o.material.transparent,false);for(const v of o.matrix.elements)assert.ok(Number.isFinite(v));}});assert.ok(triangles<45000);
  model.dispose();assert.equal(model.group.children.length,0);
 });
 test(type.name+': fixtures stay within rooms and toilets face inward with tanks nearest a wall',()=>{
  for(const f of createBuilding(type.id).floors)for(const item of f.furniture){
   const room=f.rooms.find(r=>{const xs=r.points.map(p=>p[0]),zs=r.points.map(p=>p[1]);return item.position[0]>Math.min(...xs)&&item.position[0]<Math.max(...xs)&&item.position[1]>Math.min(...zs)&&item.position[1]<Math.max(...zs)});assert.ok(room,item.id);
   const xs=room.points.map(p=>p[0]),zs=room.points.map(p=>p[1]),bounds=[Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs)];
   const inside=p=>p[0]>bounds[0]+.15&&p[0]<bounds[1]-.15&&p[1]>bounds[2]+.15&&p[1]<bounds[3]-.15;
   for(const x of [-item.width/2,item.width/2])for(const z of [-item.depth/2,item.depth/2])assert.ok(inside(furniturePoint(item,x,z)),'Furniture crosses wall: '+item.id);
   if(item.kind==='toilet'){const back=furniturePoint(item,0,-item.depth/2),front=furniturePoint(item,0,item.depth/2),distance=p=>Math.min(p[0]-bounds[0],bounds[1]-p[0],p[1]-bounds[2],bounds[3]-p[1]);assert.ok(distance(back)<distance(front),'Tank must be nearer wall than bowl');assert.ok(inside(furniturePoint(item,0,item.depth/2+2)),'Front approaches room interior');}
  }
 });
 test(type.name+': door approaches and sweep space do not intersect furniture',()=>{
  for(const f of createBuilding(type.id).floors)for(const door of f.openings.filter(o=>o.kind==='door')){
   const wall=f.walls.find(w=>w.id===door.wallId);
   for(const item of f.furniture){
    const occupied=(p)=>{const angle=-item.rotation*Math.PI/180,dx=p[0]-item.position[0],dz=p[1]-item.position[1],x=dx*Math.cos(angle)-dz*Math.sin(angle),z=dx*Math.sin(angle)+dz*Math.cos(angle);return Math.abs(x)<item.width/2&&Math.abs(z)<item.depth/2};
    for(const side of [-1,1]){
     // A 2 ft illustrative approach strip and full quarter-turn sweep, sampled densely.
     for(let a=.1;a<door.width;a+=.2)for(let d=.1;d<=2;d+=.2)assert.ok(!occupied(wallPoint(wall,door.offset+a,side*d)),door.id+' approach intersects '+item.id);
     for(let angle=0;angle<=Math.PI/2;angle+=Math.PI/40)for(let radius=.1;radius<Math.min(door.width,3);radius+=.2)assert.ok(!occupied(wallPoint(wall,door.offset+Math.cos(angle)*radius,side*Math.sin(angle)*radius)),door.id+' sweep intersects '+item.id);
    }
   }
  }
 });
}
test('commercial is a distinct storefront program and the corrected toilet remains consistent in six drawing styles',()=>{
 const b=createBuilding('commercial');assert.equal(b.roof,'flat');assert.equal(b.floors[0].rooms.reduce((s,r)=>s+area(r.points),0),1536);assert.ok(b.floors[0].rooms.some(r=>r.name==='Flexible workspace'));assert.equal(b.floors[0].furniture.filter(f=>f.kind==='toilet').length,2);
 for(const name of ['furnished-warm-oak','furnished-light-stone','furnished-minimal','technical-warm-oak','zoning-warm-oak','blueprint-warm-oak'])assert.match(readFileSync(new URL('../src/data/design-study/'+name+'.svg',import.meta.url),'utf8'),/data-furniture-id="toilet" transform="translate\(13 10\) rotate\(180\)"/);
});
test('studio uses synthetic local geometry and never requests private account data',()=>{
 const code=readFileSync(new URL('../src/scripts/property-model.ts',import.meta.url),'utf8');assert.doesNotMatch(code,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|\/api\//);
});
test('multifamily party walls have no inter-unit windows and fourplex access connects to its upper floor',()=>{
 for(const id of ['duplex','fourplex'])for(const f of createBuilding(id).floors){for(const w of f.walls.filter(w=>w.id.endsWith('-0-east')||w.id.endsWith('-1-west')))assert.equal(f.openings.filter(o=>o.wallId===w.id).length,0);}
 const b=createBuilding('fourplex'),a=b.access;
 assert.equal(a.elevation,b.floors[1].elevation);
 assert.equal(a.stairs.z+a.stairs.run/2,a.gallery.z-a.gallery.depth/2,'Stair meets landing edge without overlapping coplanar treads');
 for(const o of b.floors[1].openings.filter(o=>o.wallId.endsWith('-south')&&o.kind==='door')){const w=b.floors[1].walls.find(w=>w.id===o.wallId),p=wallPoint(w,o.offset+o.width/2);assert.ok(p[0]>a.gallery.x-a.gallery.width/2&&p[0]<a.gallery.x+a.gallery.width/2);}
 const m=buildPropertyScene(T,b);assert.ok(m.group.getObjectByName('shared-upper-access'));const band=m.group.getObjectByName('fourplex-1-floor-structure');assert.equal(band.position.y-band.scale.y/2+b.floors[1].elevation,b.floors[0].walls[0].height,'Structure fills inter-floor gap');m.dispose();
});
