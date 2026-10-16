// Run these assertions in an actual browser after the studio has initialized.
// Exercise Fit in split/full layouts and after resizing; focus a room before
// calling assertRoomFocus. They inspect rendered layout, not CSS source text.
export function assertPlanFit(){
 const root=document.querySelector('[data-model-study]'),viewport=root.querySelector('[data-lab-plan]'),svg=viewport.querySelector('svg');
 const box=viewport.getBoundingClientRect(),drawing=svg.getBoundingClientRect(),style=getComputedStyle(viewport),padX=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight),padY=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
 const check=(ok,message)=>{if(!ok)throw Error(message)};
 check(root.querySelector('[data-lab-plan-scale]').textContent==='100%','Fit must report 100%');
 check(drawing.width<=viewport.clientWidth-padX+1,'Fit exceeds viewport width');
 check(drawing.height<=viewport.clientHeight-padY+1,'Fit exceeds viewport height');
 check(viewport.scrollWidth<=viewport.clientWidth+1&&viewport.scrollHeight<=viewport.clientHeight+1,'Fit still needs scrolling');
 const geometry=svg.getBBox(),matrix=svg.getScreenCTM();
 for(const x of [geometry.x,geometry.x+geometry.width])for(const y of [geometry.y,geometry.y+geometry.height]){
  const point=new DOMPoint(x,y).matrixTransform(matrix);
  check(point.x>=box.left-1&&point.x<=box.right+1&&point.y>=box.top-1&&point.y<=box.bottom+1,'Plan geometry is clipped');
 }
 return {building:root.dataset.building,view:root.dataset.labView,viewport:[viewport.clientWidth,viewport.clientHeight],drawing:[drawing.width,drawing.height],scroll:[viewport.scrollWidth,viewport.scrollHeight]};
}
export function assertRoomFocus(expectedRoom){
 const root=document.querySelector('[data-model-study]'),room=root.querySelector('[data-lab-plan] [data-lab-room="'+expectedRoom+'"]'),ring=root.querySelector('[data-lab-plan-focus]');
 const check=(ok,message)=>{if(!ok)throw Error(message)};
 check(document.activeElement===room,'Room focus was lost');
 check(root.dataset.selectedRoom===expectedRoom,'Focused activation did not select room');
 check(getComputedStyle(room).outlineStyle==='none','Browser outline scales in SVG units');
 check(!ring.hasAttribute('hidden'),'Room has no visible focus indicator');
 const points=room.querySelector('polygon').getAttribute('points');
 for(const polygon of ring.querySelectorAll('polygon')){
  check(polygon.getAttribute('points')===points,'Focus indicator does not follow room shape');
  check(getComputedStyle(polygon).vectorEffect==='non-scaling-stroke','Focus stroke grows with drawing');
  check(parseFloat(getComputedStyle(polygon).strokeWidth)<=5,'Focus stroke obscures neighboring rooms');
 }
 const box=ring.getBBox(),shape=room.querySelector('polygon').getBBox();
 check(['x','y','width','height'].every(key=>Math.abs(box[key]-shape[key])<.001),'Focus bounds extend beyond room shape');
 check(ring===ring.parentElement.lastElementChild,'Walls can obscure focus indicator');
 return {room:expectedRoom,outline:getComputedStyle(room).outlineStyle,points,strokeWidths:[...ring.querySelectorAll('polygon')].map(p=>getComputedStyle(p).strokeWidth)};
}
export function assertPlanFallback(){
 const root=document.querySelector('[data-model-study]');
 if(root.dataset.renderer!=='unavailable'||root.dataset.labView!=='2d')throw Error('Unavailable renderer did not show the linked plan');
 for(const button of root.querySelectorAll('[data-lab-camera],[data-lab-rotate],[data-lab-cut],[data-lab-layout="3d"],[data-lab-layout="split"]'))if(!button.disabled)throw Error('Unavailable 3D control remains enabled');
 if(!root.querySelector('[data-model-caption]').textContent.includes('3D unavailable'))throw Error('Fallback caption is misleading');
 return {renderer:root.dataset.renderer,view:root.dataset.labView,selected:root.dataset.selectedRoom};
}
