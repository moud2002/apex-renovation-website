import {createBuilding,planSVG,FINISHES,area,type Finish} from '../lib/property-building';
import {buildPropertyScene} from '../lib/property-scene';

document.querySelectorAll<HTMLElement>('[data-model-study]').forEach(root=>{
 let begun=false;
 const observer=new IntersectionObserver(entries=>{if(!begun&&entries.some(e=>e.isIntersecting)){begun=true;observer.disconnect();start(root).catch(()=>{root.querySelector('[data-model-loading]')!.textContent='The building view is unavailable. Please reload to try again.';});}},{rootMargin:'200px'});
 observer.observe(root);
});
async function start(root:HTMLElement){
 const T=await import('three'),host=root.querySelector<HTMLElement>('[data-model-canvas]')!;
 const abort=new AbortController(),signal=abort.signal;
 const listen=(target:EventTarget,event:string,fn:any)=>target.addEventListener(event,fn,{signal});
 let building=createBuilding('home'),floorIndex=0,selected=building.floors[0].rooms[0].id,finish:Finish='modern-white',cutaway=false,planZoom=1;
 let yaw=.52,pitch=.50,targetYaw=yaw,targetPitch=pitch,raf=0,visible=true,disposed=false,cameraName='perspective';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-30,30,25,-25,.1,500);
 scene.background=new T.Color('#e8e6dd');
 scene.add(new T.HemisphereLight('#fff9ed','#8a8c7c',2.6));
 const sun=new T.DirectionalLight('#fff5e5',3);sun.position.set(-45,85,55);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,far:250});sun.shadow.normalBias=.04;scene.add(sun);
 const ground=new T.Mesh(new T.PlaneGeometry(240,240),new T.MeshStandardMaterial({color:'#e8e6dd',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.84;ground.receiveShadow=true;scene.add(ground);
 const grid=new T.GridHelper(160,40,'#d0cfc2','#deddd2');grid.position.y=-.8;scene.add(grid);
 let model=buildPropertyScene(T,building);scene.add(model.group);
 let renderer:InstanceType<typeof T.WebGLRenderer>|null=null;
 try {renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);root.classList.add('model-ready');root.dataset.renderer='webgl';}
 catch {root.dataset.renderer='unavailable';root.dataset.labView='2d';root.querySelector('[data-model-loading]')!.textContent='3D is unavailable on this device. The linked 2D plan remains available.';}
 const q=(s:string)=>root.querySelector<HTMLElement>(s)!;
 const floorSelect=root.querySelector<HTMLSelectElement>('[data-lab-floor]')!;
 if(matchMedia('(max-width:800px)').matches&&renderer)root.dataset.labView='3d';
 function frame(){if(!renderer||!host.clientWidth||!host.clientHeight)return;
  const aspect=host.clientWidth/host.clientHeight,span=Math.hypot(building.width+7,building.depth+7),height=building.floors.at(-1)!.elevation+14;
  const view=Math.max(span/aspect*1.16,span*.57,height*1.5);camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;
  const cy=cutaway?building.floors[floorIndex].elevation+1.2:height*.34,r=130;
  camera.position.set(Math.sin(yaw)*Math.cos(pitch)*r,cy+Math.sin(pitch)*r,Math.cos(yaw)*Math.cos(pitch)*r);camera.lookAt(0,cy,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 }
 function render(){raf=0;if(disposed||!visible||!renderer)return;
  const amount=reduced?1:.2;yaw+=(targetYaw-yaw)*amount;pitch+=(targetPitch-pitch)*amount;frame();renderer.render(scene,camera);
  root.dataset.orbit=yaw.toFixed(4);
  if(Math.abs(yaw-targetYaw)>.0005||Math.abs(pitch-targetPitch)>.0005)draw();
 }
 function draw(){if(!raf&&!disposed&&visible&&renderer)raf=requestAnimationFrame(render);}
 function resize(){if(renderer&&host.clientWidth&&host.clientHeight)renderer.setSize(host.clientWidth,host.clientHeight);draw();}
 function planFocus(roomId?:string){
  const ring=root.querySelector<SVGGElement>('[data-lab-plan-focus]');if(!ring)return;
  const room=building.floors[floorIndex].rooms.find(r=>r.id===roomId);
  ring.toggleAttribute('hidden',!room);
  if(room)ring.querySelectorAll('polygon').forEach(p=>p.setAttribute('points',room.points.map(p=>p.join(',')).join(' ')));
 }
 function update(){
  const focused=document.activeElement as HTMLElement|null,focusId=focused?.dataset.labRoom,focusButton=focused instanceof HTMLButtonElement;
  const floor=building.floors[floorIndex],room=floor.rooms.find(r=>r.id===selected)||floor.rooms[0];selected=room.id;
  model.apply(floorIndex,cutaway,selected,finish);
  q('[data-lab-plan]').innerHTML=planSVG(building,floor,selected,finish);
  q('[data-lab-plan]').style.setProperty('--plan-zoom',String(planZoom));q('[data-lab-plan-scale]').textContent=Math.round(planZoom*100)+'%';
  q('[data-lab-rooms]').innerHTML=floor.rooms.map(r=>`<button type="button" data-lab-room="${r.id}" aria-pressed="${r.id===selected}">${r.name}</button>`).join('');
  floorSelect.innerHTML=building.floors.map((f,i)=>`<option value="${i}" ${i===floorIndex?'selected':''}>${f.name}</option>`).join('');floorSelect.disabled=building.floors.length===1;
  q('[data-lab-plan-floor]').textContent=floor.name;q('[data-lab-room-name]').textContent=room.name;
  q('[data-lab-room-area]').textContent=area(room.points).toFixed(0)+' sq ft';
  const xs=room.points.map(p=>p[0]),zs=room.points.map(p=>p[1]);q('[data-lab-room-size]').textContent=(Math.max(...xs)-Math.min(...xs))+' × '+(Math.max(...zs)-Math.min(...zs))+' ft';
  q('[data-lab-finish-name]').textContent=FINISHES[finish].name;
  q('[data-lab-finish-note]').textContent=finish==='modern-white'?'White walls · black roof · dark doors and frames':finish==='warm-modern'?'Warm plaster · charcoal roof · timber accents':'Stone tones · soft trim · deep green doors';
  q('[data-lab-cut]').textContent=cutaway?'Close cutaway':'Open cutaway';q('[data-lab-cut]').setAttribute('aria-pressed',String(cutaway));
  root.querySelectorAll<HTMLElement>('[data-lab-building]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.labBuilding===building.id)));
  root.querySelectorAll<HTMLElement>('[data-lab-finish]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.labFinish===finish)));
  root.querySelectorAll<HTMLElement>('[data-lab-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.labLayout===root.dataset.labView)));
  root.querySelectorAll<HTMLElement>('[data-lab-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.labCamera===cameraName)));
  root.dataset.building=building.id;root.dataset.floor=floor.id;root.dataset.selectedRoom=selected;root.dataset.finish=finish;root.dataset.cutaway=String(cutaway);
  q('[data-model-caption]').textContent=(!renderer?'3D unavailable; the linked 2D plan remains available. ':'')+building.name+' · '+floor.name+'. Synthetic dimensions in feet. Areas follow room boundaries, not net usable measurements. Site, circulation and compliance require project-specific review.';
  if(!renderer)root.querySelectorAll<HTMLButtonElement>('[data-lab-camera],[data-lab-rotate],[data-lab-cut],[data-lab-layout=\"3d\"],[data-lab-layout=\"split\"]').forEach(b=>b.disabled=true);
  if(focusId)root.querySelector<HTMLElement>((focusButton?'[data-lab-rooms] ':'[data-lab-plan] ')+`[data-lab-room=\"${focusId}\"]`)?.focus({preventScroll:true});
  resize();
 }
 function selectRoom(id:string){if(!building.floors[floorIndex].rooms.some(r=>r.id===id))return;selected=id;cutaway=true;update();}
 listen(root,'click',(e:MouseEvent)=>{
  const b=(e.target as Element).closest<HTMLElement>('button,[data-lab-room]');if(!b||!root.contains(b)||b.hasAttribute('disabled'))return;
  if(b.dataset.labBuilding){scene.remove(model.group);model.dispose();building=createBuilding(b.dataset.labBuilding);floorIndex=0;planZoom=1;selected=building.floors[0].rooms[0].id;model=buildPropertyScene(T,building);scene.add(model.group);}
  if(b.dataset.labFinish)finish=b.dataset.labFinish as Finish;
  if(b.dataset.labRoom){selectRoom(b.dataset.labRoom);return;}
  if(b.dataset.labPlanZoom)planZoom=Math.max(1,Math.min(3,planZoom+Number(b.dataset.labPlanZoom)*.5));
  if(b.hasAttribute('data-lab-plan-fit')){planZoom=1;q('[data-lab-plan]').scrollTo(0,0);}
  if(b.dataset.labLayout)root.dataset.labView=b.dataset.labLayout;
  if(b.hasAttribute('data-lab-cut'))cutaway=!cutaway;
  if(b.dataset.labCamera){cameraName=b.dataset.labCamera;targetYaw=({perspective:.52,front:0,rear:Math.PI,left:-Math.PI/2,right:Math.PI/2,aerial:0} as Record<string,number>)[cameraName];targetPitch=cameraName==='aerial'?Math.PI/2-.001:cameraName==='perspective'?.50:.15;}
  if(b.dataset.labRotate){targetYaw+=Number(b.dataset.labRotate)*Math.PI/8;cameraName='orbit';}
  update();
 });
 listen(root,'keydown',(e:KeyboardEvent)=>{const room=(e.target as Element).closest<HTMLElement>('[data-lab-room]');if(room&&!(room instanceof HTMLButtonElement)&&['Enter',' '].includes(e.key)){e.preventDefault();selectRoom(room.dataset.labRoom!);}});
 listen(root,'focusin',(e:FocusEvent)=>{const room=(e.target as Element).closest<HTMLElement>('[data-lab-plan] [data-lab-room]');planFocus(room?.dataset.labRoom);});
 listen(root,'focusout',()=>planFocus());
 listen(floorSelect,'change',()=>{floorIndex=Number(floorSelect.value);selected=building.floors[floorIndex].rooms[0].id;cutaway=true;update();});
 if(renderer){
  const canvas=renderer.domElement,raycaster=new T.Raycaster();let drag:{id:number;x:number;y:number;yaw:number;horizontal:boolean}|null=null;
  listen(canvas,'pointerdown',(e:PointerEvent)=>{if(e.button!==0||!e.isPrimary)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:targetYaw,horizontal:false};});
  listen(canvas,'pointermove',(e:PointerEvent)=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.horizontal&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>7){drag=null;return;}if(Math.abs(dx)>7){drag.horizontal=true;canvas.setPointerCapture(e.pointerId);targetYaw=drag.yaw-dx*.008;cameraName='orbit';draw();}});
  listen(canvas,'pointerup',(e:PointerEvent)=>{if(drag&&!drag.horizontal&&cutaway){const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);const hit=raycaster.intersectObjects(model.roomMeshes.filter(m=>m.userData.roomId.startsWith(building.floors[floorIndex].id+'-')))[0];if(hit)selectRoom(hit.object.userData.roomId);}drag=null;});
  for(const event of ['pointercancel','lostpointercapture'])listen(canvas,event,()=>drag=null);
  listen(canvas,'webglcontextlost',(e:Event)=>{e.preventDefault();cancelAnimationFrame(raf);raf=0;renderer?.dispose();renderer=null;root.dataset.renderer='unavailable';root.classList.remove('model-ready');root.dataset.labView='2d';q('[data-model-loading]').textContent='3D needs a reload. Your linked plan remains available.';update();});
 }
 root.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=!renderer&&(b.hasAttribute('data-lab-camera')||b.hasAttribute('data-lab-rotate')||b.dataset.labLayout==='3d'||b.dataset.labLayout==='split'||b.hasAttribute('data-lab-cut')));
 const size=new ResizeObserver(resize);size.observe(host);
 const visibility=new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)draw();});visibility.observe(root);
 update();
 listen(window,'pagehide',(event:PageTransitionEvent)=>{if(event.persisted)return;disposed=true;abort.abort();size.disconnect();visibility.disconnect();cancelAnimationFrame(raf);model.dispose();ground.geometry.dispose();(ground.material as InstanceType<typeof T.Material>).dispose();grid.geometry.dispose();const gm=Array.isArray(grid.material)?grid.material:[grid.material];gm.forEach(m=>m.dispose());renderer?.dispose();});
}
