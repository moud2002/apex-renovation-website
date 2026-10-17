// Synthetic PointerEvents exercise the real controller, not iPhone hardware.
// Only capture for these synthetic IDs is stubbed: browsers cannot capture an
// inactive hardware pointer. Native input, scrolling and modal checks run apart.
async function syntheticStudioTouch(moves,end='pointerup'){
 const root=document.querySelector('[data-model-study]'),canvas=root.querySelector('canvas');
 const rect=canvas.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
 const capture=canvas.setPointerCapture,events=[],captures=[];
 canvas.setPointerCapture=function(id){if(id===9001){captures.push(id);return;}return capture.call(this,id);};
 const send=(type,dx,dy,id=9001,primary=true)=>{const e=new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',isPrimary:primary,button:0,buttons:type==='pointerup'?0:1,clientX:x+dx,clientY:y+dy});canvas.dispatchEvent(e);events.push({type,id,defaultPrevented:e.defaultPrevented,trusted:e.isTrusted});};
 const before={yaw:Number(root.dataset.orbit),pitch:Number(root.dataset.pitch),room:root.dataset.selectedRoom};
 try{
  send('pointerdown',0,0);for(const [dx,dy] of moves)send('pointermove',dx,dy);
  const last=moves.at(-1)||[0,0];send(end,...last);
  if(end==='pointercancel'){send('pointermove',last[0]+30,last[1]+30);send('pointerup',last[0]+30,last[1]+30);}
  await new Promise(resolve=>setTimeout(resolve,700));
  return {before,after:{yaw:Number(root.dataset.orbit),pitch:Number(root.dataset.pitch),room:root.dataset.selectedRoom},captures:captures.length,events,touchAction:getComputedStyle(canvas).touchAction};
 }finally{canvas.setPointerCapture=capture;}
}
function assertStudioFullscreen(){
 const dialog=document.querySelector('.lab-fullscreen-dialog'),root=document.querySelector('[data-model-study]'),close=dialog.querySelector('[data-lab-fullscreen-close]');
 const d=dialog.getBoundingClientRect(),b=close.getBoundingClientRect(),stage=root.querySelector('[data-model-canvas]').getBoundingClientRect();
 if(!dialog.open||!dialog.matches(':modal')||!dialog.contains(root))throw Error('Studio is not in the modal');
 if(Math.abs(d.x)>1||Math.abs(d.y)>1||Math.abs(d.width-innerWidth)>1||Math.abs(d.height-innerHeight)>1)throw Error('Modal does not fill viewport');
 if(b.top<0||b.bottom>innerHeight||b.right>innerWidth||b.width<44||b.height<44)throw Error('Exit control is not visible and reachable');
 if(dialog.scrollWidth>dialog.clientWidth+1)throw Error('Fullscreen overflows horizontally');
 if(document.body.style.overflow!=='hidden')throw Error('Background page is not locked');
 return {width:innerWidth,height:innerHeight,dialogWidth:d.width,dialogHeight:d.height,stageHeight:stage.height,close:{x:b.x,y:b.y,width:b.width,height:b.height},focusInside:dialog.contains(document.activeElement),scrollTop:dialog.scrollTop};
}
