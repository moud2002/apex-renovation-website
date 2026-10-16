import type * as Three from 'three';
import {FINISHES,wallLength,wallSegments,type Building,type Finish,type Wall} from './property-building';
export function buildPropertyScene(T:typeof Three,building:Building){
 const group=new T.Group();group.name=building.id;
 const geometries:Three.BufferGeometry[]=[new T.BoxGeometry(1,1,1)];
 const materials:Record<string,Three.MeshStandardMaterial>={};
 for(const [key,color] of Object.entries({...FINISHES['modern-white'],glass:'#52636a',selected:'#caab62',plinth:'#b7b2a4',plant:'#75816b',furniture:'#c1b39f'}))if(key!=='name')materials[key]=new T.MeshStandardMaterial({color,roughness:key==='glass'?.24:.78,metalness:key==='glass'?.18:0});
 const floors:Three.Group[]=[],roofs=new T.Group(),access=new T.Group(),roomMeshes:Three.Mesh[]=[];
 function box(parent:Three.Group,name:string,size:number[],position:number[],material:string){
  const mesh=new T.Mesh(geometries[0],materials[material]);mesh.name=name;mesh.scale.set(...size as [number,number,number]);mesh.position.set(...position as [number,number,number]);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 box(group,'foundation',[building.width+4,.45,building.depth+4],[0,-.6,0],'plinth');
 box(group,'entry-walk',[building.width*.65,.15,3],[0,-.28,building.depth/2+2.5],'plinth');
 for(const floor of building.floors){
  const fg=new T.Group();fg.name=floor.id;fg.position.y=floor.elevation;group.add(fg);floors.push(fg);
  box(fg,floor.id+'-floor-structure',[building.width+.5,.5,building.depth+.5],[0,-.5,0],'wall');
  for(const room of floor.rooms){
   const xs=room.points.map(p=>p[0]),zs=room.points.map(p=>p[1]),left=Math.min(...xs),right=Math.max(...xs),back=Math.min(...zs),front=Math.max(...zs);
   const mesh=box(fg,room.id,[right-left-.02,.24,front-back-.02],[(left+right)/2,-.13,(back+front)/2],'floor');mesh.userData.roomId=room.id;roomMeshes.push(mesh);
  }
  for(const item of floor.furniture){
   const furniture=new T.Group();furniture.name=item.id;furniture.userData.furniture=item;furniture.position.set(item.position[0],0,item.position[1]);furniture.rotation.y=-item.rotation*Math.PI/180;fg.add(furniture);
   const w=item.width,d=item.depth;
   if(item.kind==='toilet'){
    box(furniture,item.id+'-tank',[w*.9,2.5,d*.23],[0,1.25,-d*.36],'wall');
    const geometry=new T.SphereGeometry(1,16,10);geometries.push(geometry);
    const bowl=new T.Mesh(geometry,materials.wall);bowl.scale.set(w*.46,.75,d*.38);bowl.position.set(0,.9,d*.12);bowl.castShadow=true;furniture.add(bowl);
    const seat=new T.Mesh(geometry,materials.plinth);seat.scale.set(w*.31,.05,d*.27);seat.position.set(0,1.58,d*.12);furniture.add(seat);
   }else if(item.kind==='bed'){
    box(furniture,item.id+'-base',[w,.7,d],[0,.35,0],'accent');box(furniture,item.id+'-mattress',[w-.1,.6,d-.1],[0,1,0],'furniture');box(furniture,item.id+'-pillow',[w*.75,.22,d*.2],[0,1.4,-d*.3],'wall');
   }else if(item.kind==='sofa'||item.kind==='armchair'){
    box(furniture,item.id+'-seat',[w,1.2,d],[0,.6,0],'furniture');box(furniture,item.id+'-back',[w,1.1,.4],[0,1.65,-d/2+.2],'furniture');
   }else if(item.kind==='plant'){
    box(furniture,item.id+'-pot',[w*.65,.9,d*.65],[0,.45,0],'plinth');const geo=new T.IcosahedronGeometry(w*.52,1);geometries.push(geo);const shrub=new T.Mesh(geo,materials.plant);shrub.position.y=1.8;furniture.add(shrub);
   }else if(item.kind==='bath'){
    box(furniture,item.id+'-bath',[w,1.5,d],[0,.75,0],'wall');box(furniture,item.id+'-basin',[w-.5,.05,d-.5],[0,1.53,0],'plinth');
   }else{
    const h=item.kind==='coffee-table'?1.2:2.8;
    box(furniture,item.id+'-top',[w,.18,d],[0,h,0],'accent');for(const x of [-w*.42,w*.42])for(const z of [-d*.38,d*.38])box(furniture,item.id+'-leg-'+x+'-'+z,[.15,h,.15],[x,h/2,z],'frame');
   }
  }
  for(const wall of floor.walls){
   const wg=new T.Group();wg.name=wall.id;wg.position.set(wall.a[0],0,wall.a[1]);wg.rotation.y=-Math.atan2(wall.b[1]-wall.a[1],wall.b[0]-wall.a[0]);wg.userData.wall=wall;fg.add(wg);
   wallSegments(wall,floor.openings).forEach((s,i)=>{const m=box(wg,wall.id+'-segment-'+i,[s.right-s.left,s.top-s.bottom,wall.thickness],[(s.left+s.right)/2,(s.bottom+s.top)/2,0],'wall');m.userData.wallSegment=s;});
   for(const o of floor.openings.filter(o=>o.wallId===wall.id)){
    const og=new T.Group();og.name=o.id;og.position.set(o.offset,o.sill,0);og.userData.opening=o;wg.add(og);
    const t=.1,depth=wall.thickness+.12;
    for(const x of [t/2,o.width-t/2])box(og,o.id+'-jamb-'+x,[t,o.height,depth],[x,o.height/2,0],'frame');
    box(og,o.id+'-head',[o.width-t*2,t,depth],[o.width/2,o.height-t/2,0],'frame');
    if(o.kind==='window'){
     box(og,o.id+'-sill',[o.width-t*2,t,depth],[o.width/2,t/2,0],'frame');
     box(og,o.id+'-glass',[o.width-t*2,o.height-t*2,.045],[o.width/2,o.height/2,0],'glass');
     for(let x=4;x<o.width-1;x+=4)box(og,o.id+'-mullion-'+x,[t,o.height-t*2,depth],[x,o.height/2,0],'frame');
    }else{
     const count=o.width>5?2:1,panelWidth=(o.width-t*2)/count;
     for(let n=0;n<count;n++){
      box(og,o.id+'-door-'+n,[panelWidth-.04,o.height-t-.06,.14],[t+(n+.5)*panelWidth,(o.height-t+.06)/2,0],building.id==='commercial'?'glass':'door');
      for(const sign of [-1,1])box(og,o.id+'-handle-'+n+'-'+sign,[.09,.65,.08],[t+(n+1)*panelWidth-.3,3.3,sign*.14],'accent');
     }
    }
   }
  }
 }
 const top=building.floors.at(-1)!.elevation+building.floors.at(-1)!.walls[0].height;
 if(building.roof==='flat'){
  box(roofs,'commercial-flat-roof',[building.width+1.4,.35,building.depth+1.4],[0,top+.2,0],'roof');
  for(const z of [-building.depth/2,building.depth/2])box(roofs,'roof-parapet-'+z,[building.width+.5,1,.4],[0,top+.75,z],'wall');
  for(const x of [-building.width/2,building.width/2])box(roofs,'roof-parapet-'+x,[.4,1,building.depth],[x,top+.75,0],'wall');
  box(roofs,'storefront-canopy',[building.width*.88,.3,3.5],[0,9,building.depth/2+1.3],'roof');
 }else{
  const count=building.id==='home'?1:2;
  for(let n=0;n<count;n++){
   const cx=(n-(count-1)/2)*30.5,rise=5;
   for(const sign of [-1,1]){const inner=count===2&&((n===0&&sign===1)||(n===1&&sign===-1)),half=inner?15.25:15.8;const m=box(roofs,`roof-${n}-${sign}`,[Math.hypot(half,rise),.27,building.depth+1.6],[cx+sign*half/2,top+rise/2,0],'roof');m.rotation.z=-sign*Math.atan2(rise,half);}
   const shape=new T.Shape();shape.moveTo(-15,0);shape.lineTo(15,0);shape.lineTo(0,rise-.1);shape.closePath();
   const geometry=new T.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:false});geometries.push(geometry);
   for(const z of [-building.depth/2,building.depth/2-.3]){const m=new T.Mesh(geometry,materials.wall);m.position.set(cx,top,z);m.castShadow=true;roofs.add(m);}
  }
 }
 group.add(roofs);
 if(building.access){
  const {gallery:g,stairs:s,elevation:h}=building.access;access.name='shared-upper-access';group.add(access);
  box(access,'upper-gallery',[g.width,.3,g.depth],[g.x,h-.15,g.z],'plinth');
  for(let i=0;i<s.steps;i++){const y=(i+1)*h/s.steps,z=s.z-s.run/2+(i+.5)*s.run/s.steps;box(access,'stair-'+i,[s.width,y,s.run/s.steps],[s.x,y/2,z],'plinth');for(const side of [-1,1])box(access,'stair-post-'+i+'-'+side,[.065,3,.065],[s.x+side*(s.width/2-.1),y+1.5,z],'frame');}
  for(const side of [-1,1]){const rail=box(access,'stair-rail-'+side,[.08,.08,Math.hypot(s.run-s.run/s.steps,h-h/s.steps)],[s.x+side*(s.width/2-.1),h/2+h/s.steps/2+3,s.z],'frame');rail.rotation.x=-Math.atan2(h,s.run);}
  box(access,'gallery-rail',[g.width,.08,.08],[g.x,h+3,g.z+g.depth/2-.1],'frame');
  for(let i=0;i<=Math.ceil(g.width/3);i++)box(access,'gallery-post-'+i,[.07,3,.07],[g.x-g.width/2+i*g.width/Math.ceil(g.width/3),h+1.5,g.z+g.depth/2-.1],'frame');
 }
 for(const x of [-building.width/2-1.2,building.width/2+1.2])for(const z of [-building.depth/2+3,building.depth/2-3]){
  box(group,'planter',[1.5,1,1.5],[x,.15,z],'plinth');const geometry=new T.IcosahedronGeometry(1.1,1);geometries.push(geometry);const shrub=new T.Mesh(geometry,materials.plant);shrub.position.set(x,1.6,z);shrub.castShadow=true;group.add(shrub);
 }
 return {group,roomMeshes,roofs,floors,
  apply(floorIndex:number,cutaway:boolean,selected:string,finish:Finish){
   for(const [key,value] of Object.entries(FINISHES[finish]))if(key!=='name')materials[key].color.set(value);
   floors.forEach((fg,i)=>{fg.visible=!cutaway||i===floorIndex;fg.traverse(o=>{if(o.userData.wallSegment){const s=o.userData.wallSegment,top=cutaway?Math.min(s.top,2.4):s.top;o.visible=top>s.bottom;o.scale.y=Math.max(.001,top-s.bottom);o.position.y=(top+s.bottom)/2;}if(o.userData.opening)o.visible=!cutaway;});});
   roofs.visible=!cutaway;
   access.visible=!cutaway||floorIndex===1;
   roomMeshes.forEach(m=>{m.material=materials[m.userData.roomId===selected?'selected':'floor'];});
  },
  dispose(){geometries.forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());group.clear();},
 };
}
