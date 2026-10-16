// Static, synthetic illustration assets only. This public module never requests portal data.
document.querySelectorAll<HTMLElement>('[data-plan-study]').forEach(root=>{
 let preset='furnished',material='warm-oak',zoom=1;
 const variants=[...root.querySelectorAll<HTMLElement>('[data-plan-variant]')];
 const presets=[...root.querySelectorAll<HTMLButtonElement>('[data-plan-preset]')];
 const materials=[...root.querySelectorAll<HTMLButtonElement>('[data-plan-material]')];
 const scale=root.querySelector<HTMLElement>('[data-plan-scale]')!;
 const canvas=root.querySelector<HTMLElement>('[data-plan-zoom-area]')!;
 const scroll=root.querySelector<HTMLElement>('[data-plan-scroll]')!;
 function draw(){
  const selected=preset==='furnished'?preset+'-'+material:preset;
  variants.forEach(v=>v.hidden=v.dataset.planVariant!==selected);
  presets.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.planPreset===preset)));
  materials.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.planMaterial===material)));
  canvas.style.width=zoom*100+'%';scale.textContent=Math.round(zoom*100)+'%';
  root.dataset.activePreset=preset;root.dataset.activeMaterial=material;
 }
 presets.forEach(b=>b.addEventListener('click',()=>{preset=b.dataset.planPreset!;draw();}));
 materials.forEach(b=>b.addEventListener('click',()=>{material=b.dataset.planMaterial!;preset='furnished';draw();}));
 root.querySelectorAll<HTMLButtonElement>('[data-plan-zoom]').forEach(b=>b.addEventListener('click',()=>{zoom=Math.max(1,Math.min(3,zoom+Number(b.dataset.planZoom)*.25));draw();}));
 root.querySelector('[data-plan-fit]')!.addEventListener('click',()=>{zoom=1;scroll.scrollTo(0,0);draw();});
 draw();
});
