import {INTERIOR_FINISHES,floorPattern,isWetRoom,type InteriorFinish} from './interior-finishes';
import home from '../data/design-study/geometry.json';
export type Point = [number, number];
export type Wall = {id:string;a:Point;b:Point;thickness:number;height:number;exterior:boolean};
export type Opening = {id:string;wallId:string;kind:string;offset:number;width:number;height:number;sill:number};
export type Room = {id:string;name:string;points:Point[]};
export type Furniture = {id:string;kind:string;position:Point;width:number;depth:number;rotation:number};
export type Floor = {id:string;name:string;elevation:number;walls:Wall[];rooms:Room[];openings:Opening[];furniture:Furniture[]};
export type Access = {gallery:{x:number;z:number;width:number;depth:number};stairs:{x:number;z:number;width:number;run:number;steps:number};elevation:number};
export type Building = {id:string;name:string;floors:Floor[];roof:'gable'|'flat';width:number;depth:number;access?:Access};
export const FINISHES = {
 'modern-white':{name:'Modern white',wall:'#f4f1e9',roof:'#25282a',frame:'#171c1e',door:'#202527',floor:'#d3bc96',accent:'#a78860'},
 'warm-modern':{name:'Warm modern',wall:'#ded2bd',roof:'#383d3b',frame:'#343a38',door:'#997044',floor:'#c9aa7e',accent:'#997044'},
 'classic':{name:'Classic',wall:'#d9c7ad',roof:'#4b4946',frame:'#f2eadc',door:'#4b5147',floor:'#c6ad8b',accent:'#f2eadc'},
} as const;
export type Finish = keyof typeof FINISHES;
export const BUILDING_TYPES = [{id:'home',name:'Home'},{id:'duplex',name:'Duplex'},{id:'fourplex',name:'Fourplex'},{id:'commercial',name:'Office / retail'}];
export function area(points:Point[]) {return Math.abs(points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-q[0]*p[1]},0))/2;}
export function wallLength(w:Wall){return Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);}
/** Identical transform for wall segments, opening fills and the 2D opening symbol. */
export function wallPoint(w:Wall,along:number,normal=0):Point {const l=wallLength(w),dx=(w.b[0]-w.a[0])/l,dz=(w.b[1]-w.a[1])/l;return [w.a[0]+dx*along-dz*normal,w.a[1]+dz*along+dx*normal];}
export type Segment={left:number;right:number;bottom:number;top:number};
/** Decompose a facade around apertures; no wall face spans a door or window. */
export function wallSegments(w:Wall,openings:Opening[]):Segment[]{
 const os=openings.filter(o=>o.wallId===w.id).sort((a,b)=>a.offset-b.offset),length=wallLength(w),out:Segment[]=[];
 let at=0;
 for(const o of os){if(o.offset<at||o.offset<0||o.offset+o.width>length||o.sill<0||o.height<=0||o.sill+o.height>w.height)throw Error('Invalid opening geometry');
  if(o.offset>at)out.push({left:at,right:o.offset,bottom:0,top:w.height});
  if(o.sill>0)out.push({left:o.offset,right:o.offset+o.width,bottom:0,top:o.sill});
  if(o.sill+o.height<w.height)out.push({left:o.offset,right:o.offset+o.width,bottom:o.sill+o.height,top:w.height});
  at=o.offset+o.width;
 }
 if(at<length)out.push({left:at,right:length,bottom:0,top:w.height});return out;
}
function commercial():Floor {
 const wall=(id:string,a:Point,b:Point,exterior=false):Wall=>({id:'commercial-0-'+id,a,b,thickness:exterior?.6:.4,height:11,exterior});
 const walls=[wall('north',[-24,-16],[24,-16],true),wall('east',[24,-16],[24,16],true),wall('south',[24,16],[-24,16],true),wall('west',[-24,16],[-24,-16],true),wall('service',[-24,-6],[24,-6]),wall('store',[2,-16],[2,-6]),wall('wc',[13,-16],[13,-6]),wall('reception-divider',[10,-6],[10,16])];
 const room=(id:string,name:string,x:number,z:number,w:number,d:number):Room=>({id:'commercial-0-'+id,name,points:[[x,z],[x+w,z],[x+w,z+d],[x,z+d]]});
 const rooms=[room('flex','Flexible workspace',-24,-6,34,22),room('reception','Reception / display',10,-6,14,22),room('storage','Storage',-24,-16,26,10),room('wc-a','WC 01',2,-16,11,10),room('wc-b','WC 02',13,-16,11,10)];
 const op=(id:string,wallId:string,kind:string,offset:number,width:number,height:number,sill=0):Opening=>({id:'commercial-0-'+id,wallId:'commercial-0-'+wallId,kind,offset,width,height,sill});
 const openings=[op('entry','south','door',5,6,8),op('storefront-a','south','window',13,14,8,1),op('storefront-b','south','window',30,15,8,1),op('store-door','service','door',15,3,7),op('wc-a-door','service','door',29,3,7),op('wc-b-door','service','door',41,3,7),op('flex-door','reception-divider','door',11,4,8),op('rear-exit','north','door',3,3,7),op('side-window','west','window',7,10,5,3)];
 const furniture:Furniture[]=[{id:'wc-a',kind:'toilet',position:[7.5,-14.5],width:1.7,depth:2.4,rotation:0},{id:'wc-b',kind:'toilet',position:[18.5,-14.5],width:1.7,depth:2.4,rotation:0},{id:'reception',kind:'desk',position:[18,7],width:7,depth:2.6,rotation:0},{id:'workspace-a',kind:'desk',position:[-16,2],width:6,depth:3,rotation:0},{id:'workspace-b',kind:'desk',position:[-4,2],width:6,depth:3,rotation:0},{id:'storage',kind:'desk',position:[-6,-13],width:8,depth:2,rotation:0}].map(f=>({...f,id:'commercial-0-furniture-'+f.id,position:f.position as Point}));
 return {id:'commercial-0',name:'Ground floor',elevation:0,walls,rooms,openings,furniture};
}
export function createBuilding(id:string):Building {
 if(id==='commercial')return {id,name:'Office / retail',floors:[commercial()],roof:'flat',width:48,depth:32};
 const count=id==='home'?1:2,levels=id==='fourplex'?2:1;
 const floors:Floor[]=[];
 for(let f=0;f<levels;f++){
  const floor:Floor={id:`${id}-${f}`,name:f?'Upper floor':'Ground floor',elevation:f*9.75,walls:[],rooms:[],openings:[],furniture:[]};
  for(let u=0;u<count;u++){
   const prefix=`${id}-${f}-${u}-`,x=(u-(count-1)/2)*30.5;
   const move=(p:number[]):Point=>[p[0]+x,p[1]];
   const partyWall=count===2?(u===0?'east':'west'):null;
   floor.walls.push(...home.walls.map((w,i)=>({...w,id:prefix+w.id,a:move(w.a),b:move(w.b),exterior:i<4&&w.id!==partyWall})));
   floor.rooms.push(...home.rooms.map(r=>({...r,id:prefix+r.id,name:count===1?r.name:`${r.name} · ${String.fromCharCode(65+f*count+u)}`,points:r.points.map(move)})));
   floor.openings.push(...home.openings.filter(o=>o.wallId!==partyWall).map(o=>({...o,id:prefix+o.id,wallId:prefix+o.wallId})));
   floor.furniture.push(...home.design.furniture.map(item=>({...item,id:prefix+'furniture-'+item.id,position:move(item.position)})));
  }
  floors.push(floor);
 }
 return {id,name:BUILDING_TYPES.find(t=>t.id===id)?.name||'Home',floors,roof:'gable',width:count===1?30:60.5,depth:24,...(id==='fourplex'?{access:{gallery:{x:1.75,z:14,width:64,depth:3.5},stairs:{x:32.25,z:4.75,width:3,run:15,steps:15},elevation:9.75}}:{})};
}
export function roomCenter(r:Room):Point {return [r.points.reduce((s,p)=>s+p[0],0)/r.points.length,r.points.reduce((s,p)=>s+p[1],0)/r.points.length];}
export function furniturePoint(f:Furniture,x:number,z:number):Point {const a=f.rotation*Math.PI/180;return [f.position[0]+x*Math.cos(a)-z*Math.sin(a),f.position[1]+x*Math.sin(a)+z*Math.cos(a)];}
function furnitureSVG(f:Furniture,interior:InteriorFinish){
 const palette=INTERIOR_FINISHES[interior],ceramic=['toilet','bath'].includes(f.kind);
 const w=f.width,d=f.depth;
 const body=f.kind==='toilet'?`<rect x="${-w*.36}" y="${-d*.47}" width="${w*.72}" height="${d*.25}" rx=".08"/><ellipse cx="0" cy="${d*.1}" rx="${w*.32}" ry="${d*.36}"/><ellipse cx="0" cy="${d*.07}" rx="${w*.21}" ry="${d*.25}"/>`:f.kind==='plant'?`<circle r="${w*.43}" fill="#c1c9af"/>`:`<rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}" rx=".14"/>${f.kind==='bed'?`<rect x="${-w*.35}" y="${-d*.4}" width="${w*.7}" height="${d*.16}" rx=".1"/>`:''}`;
 return `<g data-furniture-id="${f.id}" transform="translate(${f.position.join(' ')}) rotate(${f.rotation})" stroke="${ceramic?'#7a7d6f':palette.metal}" stroke-width=".08" fill="${ceramic?'#f0ecdf':palette.cabinet}" pointer-events="none">${body}</g>`;
}
/** The linked plan uses exactly the same room polygons and wall apertures as 3D. */
export function planSVG(b:Building,f:Floor,selected:string,finish:Finish,interior:InteriorFinish='warm-oak'){
 const palette=INTERIOR_FINISHES[interior],patternId='linked-'+b.id+'-'+interior,pad=4,minX=-b.width/2-pad,minZ=-b.depth/2-pad;
 const rooms=f.rooms.map(r=>{const c=roomCenter(r),xs=r.points.map(p=>p[0]),zs=r.points.map(p=>p[1]),furniture=f.furniture.filter(item=>item.position[0]>Math.min(...xs)&&item.position[0]<Math.max(...xs)&&item.position[1]>Math.min(...zs)&&item.position[1]<Math.max(...zs)).map(item=>furnitureSVG(item,interior)).join('');return `<g data-lab-room="${r.id}" role="button" tabindex="0" aria-label="${r.name}, ${area(r.points)} square feet" aria-pressed="${r.id===selected}"><polygon points="${r.points.map(p=>p.join(',')).join(' ')}" fill="${r.id===selected?'#d8b96d':`url(#${patternId}${isWetRoom(r.id)?'-wet':''})`}" stroke="#fff" stroke-width=".1"/>${furniture}<text x="${c[0]}" y="${c[1]-.5}" text-anchor="middle" font-size="1.05">${r.name}</text><text x="${c[0]}" y="${c[1]+1}" text-anchor="middle" font-size=".9">${area(r.points)} sq ft</text></g>`}).join('');
 const walls=f.walls.map(w=>`<path d="M${w.a.join(' ')}L${w.b.join(' ')}" fill="none" stroke="#43443e" stroke-width="${w.thickness}"/>`).join('');
 const openings=f.openings.map(o=>{const w=f.walls.find(w=>w.id===o.wallId)!,a=wallPoint(w,o.offset),c=wallPoint(w,o.offset+o.width),m=wallPoint(w,o.offset+o.width/2);return `<g data-opening-id="${o.id}"><path d="M${a.join(' ')}L${c.join(' ')}" stroke="#f8f6f0" stroke-width="${w.thickness+.12}"/><path d="M${a.join(' ')}L${c.join(' ')}" stroke="${o.kind==='door'?'#9c783f':'#657d83'}" stroke-width=".14"/>${o.kind==='door'?`<circle cx="${m[0]}" cy="${m[1]}" r=".2" fill="#9c783f"/>`:''}</g>`}).join('');
 const access=b.access?`<g fill="#ddd8c8" stroke="#6b7064" stroke-width=".12"><rect x="${b.access.gallery.x-b.access.gallery.width/2}" y="${b.access.gallery.z-b.access.gallery.depth/2}" width="${b.access.gallery.width}" height="${b.access.gallery.depth}"/><rect x="${b.access.stairs.x-b.access.stairs.width/2}" y="${b.access.stairs.z-b.access.stairs.run/2}" width="${b.access.stairs.width}" height="${b.access.stairs.run}"/>${Array.from({length:b.access.stairs.steps},(_,i)=>`<path d="M${b.access!.stairs.x-1.5} ${b.access!.stairs.z-7.5+i}h3"/>`).join('')}<text x="0" y="14.6" text-anchor="middle" font-size=".9">SHARED UPPER ACCESS · SCHEMATIC</text></g>`:'';
 return `<svg viewBox="${minX} ${minZ} ${b.width+pad*2} ${b.depth+pad*2}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="${b.name}, ${f.name}, linked floor plan in feet"><defs>${floorPattern(patternId,interior)}${floorPattern(patternId+'-wet',interior,true)}</defs><g>${rooms}</g><g pointer-events="none">${access}${walls}${openings}${b.access?'':`<text x="0" y="${b.depth/2+2.5}" text-anchor="middle" font-size="1">FRONT · ${b.width} × ${b.depth} ft</text>`}</g><g data-lab-plan-focus hidden aria-hidden="true" pointer-events="none" fill="none" stroke-linejoin="round"><polygon stroke="#fffefa" stroke-width="5" vector-effect="non-scaling-stroke"/><polygon stroke="#755019" stroke-width="3" vector-effect="non-scaling-stroke"/></g></svg>`;
}
