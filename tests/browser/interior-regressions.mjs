// Browser assertions for the combined camera and finish revision.
export function assertFinishState(id,pose){
 const study=document.querySelector('[data-plan-study]'),studio=document.querySelector('[data-model-study]');
 const check=(ok,message)=>{if(!ok)throw Error(message)};
 check(study.dataset.activeMaterial===id&&studio.dataset.interiorFinish===id,'Finish selection diverged');
 check(studio.querySelector('[data-lab-interior]').value===id,'Studio select diverged');
 const pressed=study.querySelectorAll('[data-plan-material][aria-pressed=true]');check(pressed.length===1&&pressed[0].dataset.planMaterial===id,'Finish button state diverged');
 const visible=[...study.querySelectorAll('[data-plan-variant]')].filter(v=>!v.hidden);check(visible.length===1&&visible[0].dataset.planVariant==='furnished-'+id,'Wrong furnished artwork');
 check(studio.querySelector('[data-lab-plan] pattern').id.includes(id),'Linked 2D material did not change');
 if(pose){
  check(Math.abs(Number(studio.dataset.orbit)-pose.yaw)<.003&&Math.abs(Number(studio.dataset.pitch)-pose.pitch)<.003,'Finish change reset camera');
  check(studio.dataset.selectedRoom===pose.room&&studio.dataset.floor===pose.floor&&studio.dataset.finish===pose.exterior,'Finish change reset room, floor or exterior');
 }
 return {id,building:studio.dataset.building,floor:studio.dataset.floor,yaw:studio.dataset.orbit,pitch:studio.dataset.pitch,selected:studio.dataset.selectedRoom};
}
export function assertFinishControls(){
 const study=document.querySelector('[data-plan-study]'),buttons=[...study.querySelectorAll('[data-plan-material]')],select=document.querySelector('[data-lab-interior]');
 if(buttons.length!==11||select.options.length!==11)throw Error('Expected eleven finishes in each control');
 const bounds=buttons.map(b=>{const r=b.getBoundingClientRect();if(r.height<44||r.width<44)throw Error('Finish target too small');if(r.left<0||r.right>innerWidth+1)throw Error('Finish controls overflow viewport');return {id:b.dataset.planMaterial,width:r.width,height:r.height};});
 if(select.getBoundingClientRect().height<44)throw Error('Interior select target too small');
 if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Page overflows horizontally');
 return {viewport:innerWidth,buttons:bounds,selectHeight:select.getBoundingClientRect().height};
}
