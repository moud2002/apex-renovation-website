import type {OrthographicCamera} from 'three';
import type {Building} from './property-building';

export const INTERIOR_PITCH=Math.PI/3;
export const MIN_PITCH=.12,MAX_PITCH=Math.PI/2-.001;
export function clampPitch(pitch:number){return Math.max(MIN_PITCH,Math.min(MAX_PITCH,pitch));}

/** Target angles are separate from the animated camera. Opening cutaway is a
 * transition, not a per-update reset: room/floor/finish changes keep this pose. */
export class PropertyCameraView {
 yaw=.52;pitch=.5;name='perspective';cutaway=false;
 private exterior={yaw:this.yaw,pitch:this.pitch,name:this.name};
 setCutaway(next:boolean){
  if(next===this.cutaway)return;
  if(next){this.exterior={yaw:this.yaw,pitch:this.pitch,name:this.name};this.pitch=Math.max(this.pitch,INTERIOR_PITCH);this.name='interior';}
  else Object.assign(this,this.exterior);
  this.cutaway=next;
 }
 preset(name:string){
  this.name=name;
  this.yaw=({perspective:.52,front:0,rear:Math.PI,left:-Math.PI/2,right:Math.PI/2,aerial:0} as Record<string,number>)[name]??.52;
  this.pitch=name==='aerial'?MAX_PITCH:this.cutaway?INTERIOR_PITCH:name==='perspective'?.5:.15;
 }
 adjust(yaw:number,pitch:number){this.yaw=yaw;this.pitch=clampPitch(pitch);this.name='orbit';}
 drag(start:{yaw:number;pitch:number},dx:number,dy:number,touch:boolean){
  // Touch moves the visible building with the finger. Preserve the existing
  // mouse tilt convention; vertical touch swipes remain native page scrolling.
  this.adjust(start.yaw-dx*.008,start.pitch+dy*.006*(touch?1:-1));
 }
}

/** Fit the selected floor's footprint at the actual orbit/tilt. Upper-floor
 * framing includes the gallery, without zooming out for the whole building. */
export function framePropertyCamera(camera:OrthographicCamera,width:number,height:number,building:Building,floorIndex:number,cutaway:boolean,yaw:number,pitch:number){
 const aspect=width/height,buildingHeight=building.floors.at(-1)!.elevation+14;
 const cy=cutaway?building.floors[floorIndex].elevation+1.2:buildingHeight*.34;
 let view:number;
 if(cutaway){
  const halfX=building.width/2+4,halfZ=building.depth/2+4;
  const projectedX=halfX*Math.abs(Math.cos(yaw))+halfZ*Math.abs(Math.sin(yaw));
  const projectedY=(halfX*Math.abs(Math.sin(yaw))+halfZ*Math.abs(Math.cos(yaw)))*Math.sin(pitch)+2.1*Math.cos(pitch);
  view=2*Math.max(projectedY,projectedX/aspect)*1.1;
 }else{
  const span=Math.hypot(building.width+7,building.depth+7);
  view=Math.max(span/aspect*1.16,span*.57,buildingHeight*1.5);
 }
 camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;
 const radius=130;
 camera.position.set(Math.sin(yaw)*Math.cos(pitch)*radius,cy+Math.sin(pitch)*radius,Math.cos(yaw)*Math.cos(pitch)*radius);
 camera.lookAt(0,cy,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 return {targetY:cy,viewHeight:view};
}
