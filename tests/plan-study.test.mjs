import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {transformSync} from 'esbuild';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const geometry=JSON.parse(read('src/data/design-study/geometry.json'));
const code=transformSync(read('src/lib/plan-math.ts'),{loader:'ts',format:'cjs'}).code;
const module={exports:{}};new Function('module','exports',code)(module,module.exports);const {polygonArea}=module.exports;
test('public floor-plan styles and finishes use identical explicit synthetic geometry, with unique SVG definitions',()=>{
 const files=readdirSync(new URL('../src/data/design-study/',import.meta.url)).filter(f=>f.endsWith('.svg'));assert.equal(files.length,6);
 const expected={walls:geometry.walls,rooms:geometry.rooms,openings:geometry.openings};const ids=new Set();
 for(const file of files){const svg=read('src/data/design-study/'+file);assert.deepEqual(JSON.parse(svg.match(/data-geometry="([^"]+)"/)[1].replaceAll('&quot;','"').replaceAll('&amp;','&')),expected);
 assert.match(svg,/30.00 ft/);assert.match(svg,/252.0 sq ft/);assert.match(svg,/120.0 sq ft/);
 assert.doesNotMatch(svg,/sourceId|sourceNote|plan-sources|https?:\/\/(?!www\.w3\.org)/);
 for(const [,id] of svg.matchAll(/\sid="([^"]+)"/g)){assert.ok(!ids.has(id),'Unique inline SVG id: '+id);ids.add(id);}
 }
});
test('synthetic room areas are exact for rectangles, concave polygons, reversed orientation and scale changes',()=>{
 assert.deepEqual(geometry.rooms.map(r=>polygonArea(r.points)),[252,168,180,120]);assert.equal(geometry.rooms.reduce((n,r)=>n+polygonArea(r.points),0),720);
 const l=[[0,0],[10,0],[10,2],[2,2],[2,10],[0,10]];assert.equal(polygonArea(l),36);assert.equal(polygonArea([...l].reverse()),36);assert.equal(polygonArea(l.map(p=>p.map(n=>n*2))),144);
});
test('public design study declares sample scale, uses original logo and cannot fetch private portal data',()=>{
 const component=read('src/components/PlanStudy.astro'),script=read('src/scripts/plan-study.ts'),html=read('dist/index.html');
 assert.match(component,/Synthetic layout area/);assert.match(component,/Not a measured property/);assert.match(component,/verified scale/);
 assert.match(component,/src="\/assets\/apex-logo-gold.png"/);assert.match(html,/data-plan-variant="furnished-warm-oak"/);
 assert.doesNotMatch(script,/fetch\s*\(|XMLHttpRequest|\/api\/|localStorage|sessionStorage/);
 assert.match(read('src/components/ModelStudy.astro'),/PropertyConcept/);
});

test('mobile plan reference exposes calibrated sample extents, room areas and individual wall lengths without zoom',()=>{
 const html=read('dist/index.html');
 const section=html.match(/<section class="design-mobile-measurements"[\s\S]*?<\/section>/)?.[0];
 assert.ok(section);assert.match(section,/Overall width/);assert.match(section,/30.00 ft/);assert.match(section,/24.00 ft/);
 for(const [name,area] of [['Living &amp; dining','252.0'],['Bedroom','168.0'],['Kitchen','180.0'],['Bathroom','120.0']]){assert.ok(section.includes(name));assert.ok(section.includes(area+' sq ft'));}
 assert.match(section,/Wall 7/);assert.match(section,/12.00 ft/);assert.match(section,/not net usable room sizes/);
});
