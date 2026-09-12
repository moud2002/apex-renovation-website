/** Canvas projection of the same Three.js scene for devices without WebGL. */
export function softwareRenderer(T:any){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;let width=1,height=1,ratio=1,bg='#e6e1d7';
 const sun=new T.Vector3(-.5,.8,.6).normalize();
 return {domElement:canvas,shadowMap:{enabled:false,type:0},outputColorSpace:'',toneMapping:0,toneMappingExposure:1,
 setPixelRatio(n:number){ratio=Math.min(n,1.5)},setClearColor(c:string){bg=c},setSize(w:number,h:number){width=w;height=h;canvas.width=w*ratio;canvas.height=h*ratio;canvas.style.width=w+'px';canvas.style.height=h+'px'},dispose(){},
 render(scene:any,camera:any){
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  ctx.strokeStyle='#cbc7ba';ctx.lineWidth=.55;for(let i=-20;i<=20;i++){ctx.beginPath();ctx.moveTo(width/2+i*34-440,height*.57-220);ctx.lineTo(width/2+i*34+440,height*.57+220);ctx.stroke();ctx.beginPath();ctx.moveTo(width/2+i*34+440,height*.57-220);ctx.lineTo(width/2+i*34-440,height*.57+220);ctx.stroke();}
  ctx.save();ctx.translate(width*.5,height*.72);ctx.scale(1,.24);ctx.shadowColor='#252b2450';ctx.shadowBlur=50;ctx.fillStyle='#48463825';ctx.beginPath();ctx.ellipse(0,0,width*.24,100,0,0,Math.PI*2);ctx.fill();ctx.restore();
  const faces:any[]=[];const cameraPos=new T.Vector3();camera.getWorldPosition(cameraPos);
  scene.traverseVisible((mesh:any)=>{if(!mesh.isMesh||mesh===scene.children.find((x:any)=>x.geometry?.type==='PlaneGeometry'))return;const geom=mesh.geometry,pos=geom.getAttribute('position');if(!pos)return;const indices=geom.index?.array;const count=indices?indices.length:pos.count;const vertices=[];for(let i=0;i<pos.count;i++)vertices.push(new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld));
   for(let i=0;i<count;i+=3){const a=vertices[indices?indices[i]:i],b=vertices[indices?indices[i+1]:i+1],c=vertices[indices?indices[i+2]:i+2];const normal=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a)).normalize();if(normal.dot(new T.Vector3().subVectors(cameraPos,a))<0)continue;
    const pa=a.clone().project(camera),pb=b.clone().project(camera),pc=c.clone().project(camera);const material=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;const col=(material.color||new T.Color('#ccc')).clone();const shade=.63+Math.max(0,normal.dot(sun))*.4;col.multiplyScalar(shade);faces.push({pts:[pa,pb,pc],z:(pa.z+pb.z+pc.z)/3,color:col.getStyle()});
   }
  });
  faces.sort((a,b)=>b.z-a.z);for(const f of faces){ctx.fillStyle=f.color;ctx.beginPath();f.pts.forEach((p:any,i:number)=>{const x=(p.x+1)*width/2,y=(1-p.y)*height/2;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fill();}
 }
 };
}
