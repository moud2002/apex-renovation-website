/** A full-viewport modal also works where element fullscreen is unavailable.
 * Move the existing studio so its model, selections and camera stay intact. */
export function installPropertyFullscreen(root:HTMLElement,signal:AbortSignal){
 const trigger=root.querySelector<HTMLButtonElement>('[data-lab-fullscreen]')!;
 const dialog=document.createElement('dialog');dialog.className='lab-fullscreen-dialog';
 if(typeof dialog.showModal!=='function'){trigger.hidden=true;return;}
 dialog.setAttribute('aria-label','Property studio full screen');
 const bar=document.createElement('div');bar.className='lab-fullscreen-bar';
 const title=document.createElement('span');title.textContent='Property studio';
 const close=document.createElement('button');close.type='button';close.textContent='×';
 close.setAttribute('aria-label','Exit full screen');close.setAttribute('data-lab-fullscreen-close','');
 bar.append(title,close);dialog.append(bar);document.body.append(dialog);
 let placeholder:HTMLElement|null=null,scroll={x:0,y:0},overflow='',priority='';
 const restore=()=>{
  if(!placeholder)return;
  placeholder.replaceWith(root);placeholder=null;
  if(overflow)document.body.style.setProperty('overflow',overflow,priority);else document.body.style.removeProperty('overflow');
  trigger.focus({preventScroll:true});window.scrollTo({left:scroll.x,top:scroll.y,behavior:'instant'});
 };
 trigger.addEventListener('click',()=>{
  if(dialog.open)return;
  scroll={x:window.scrollX,y:window.scrollY};overflow=document.body.style.getPropertyValue('overflow');priority=document.body.style.getPropertyPriority('overflow');
  placeholder=document.createElement('div');placeholder.style.height=root.getBoundingClientRect().height+'px';placeholder.setAttribute('aria-hidden','true');
  root.before(placeholder);dialog.append(root);document.body.style.overflow='hidden';
  dialog.showModal();close.focus({preventScroll:true});
  const workspace=root.querySelector<HTMLElement>('.lab-workspace')!;
  dialog.scrollTop=Math.max(0,workspace.getBoundingClientRect().top-dialog.getBoundingClientRect().top-bar.getBoundingClientRect().height);
 },{signal});
 close.addEventListener('click',()=>dialog.close(),{signal});
 dialog.addEventListener('close',restore,{signal});
 signal.addEventListener('abort',()=>{if(dialog.open)dialog.close();restore();dialog.remove();},{once:true});
}
