import * as T from 'three'
// Perspective rasterisation of the same scene, for devices without WebGL.
// Spectators and GPU shadows are omitted; the game simulation is unchanged.
export function createSoftwareFootballRenderer(canvas){
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('No graphics context available')
 let ratio=1,lastDraw=-1,disposed=false
 const project=new T.Vector3(),normal=new T.Vector3(),normalMatrix=new T.Matrix3(),viewProjection=new T.Matrix4(),sun=new T.Vector3(-.5,.8,.3).normalize(),color=new T.Color()
 function drawTexture(image,uv,p){
  if(!image?.width)return
  const [a,b,c]=uv.map(([u,v])=>[u*image.width,(1-v)*image.height]),[p0,p1,p2]=p,den=a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]);if(Math.abs(den)<.00001)return
  const solve=(s0,s1,s2)=>[(s0*(b[1]-c[1])+s1*(c[1]-a[1])+s2*(a[1]-b[1]))/den,(s0*(c[0]-b[0])+s1*(a[0]-c[0])+s2*(b[0]-a[0]))/den,(s0*(b[0]*c[1]-c[0]*b[1])+s1*(c[0]*a[1]-a[0]*c[1])+s2*(a[0]*b[1]-b[0]*a[1]))/den]
  const x=solve(p0[0],p1[0],p2[0]),y=solve(p0[1],p1[1],p2[1]);ctx.save();ctx.clip();ctx.transform(x[0],y[0],x[1],y[1],x[2],y[2]);ctx.drawImage(image,0,0);ctx.restore()
 }
 return {isSoftware:true,capabilities:{getMaxAnisotropy:()=>1},shadowMap:{enabled:false},setPixelRatio(value){ratio=Math.min(1.25,value)},getPixelRatio:()=>ratio,setSize(w,h){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio)},render(scene,camera){
  if(disposed)return
  const now=performance.now();if(now-lastDraw<45)return;lastDraw=now
  const w=canvas.width,h=canvas.height;ctx.setTransform(1,0,0,1,0,0);const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#8fbcd4');sky.addColorStop(.65,'#d4e0d4');sky.addColorStop(1,'#617c48');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h)
  scene.updateMatrixWorld();camera.updateMatrixWorld();viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)
  const faces=[],lines=[]
  scene.traverseVisible(object=>{
   if(object.isInstancedMesh||!object.geometry)return
   const geo=object.geometry,positions=geo.attributes.position;if(!positions)return
   const index=geo.index,mat=Array.isArray(object.material)?object.material[0]:object.material;if(!mat||mat.visible===false)return
   const count=index?index.count:positions.count,points=[]
   for(let i=0;i<positions.count;i++){project.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld).applyMatrix4(camera.matrixWorldInverse);points.push([project.x,project.y,project.z])}
   const screen=p=>{project.set(...p).applyMatrix4(camera.projectionMatrix);return [w*(project.x*.5+.5),h*(.5-project.y*.5),project.z]}
   const clip=vertices=>{let out=vertices;for(const [plane,sign] of [[-camera.near,-1],[-camera.far,1]]){const input=out;out=[];if(!input.length)break;for(let i=0;i<input.length;i++){const a=input[i],b=input[(i+1)%input.length],ina=(a.p[2]-plane)*sign>=0,inb=(b.p[2]-plane)*sign>=0;if(ina)out.push(a);if(ina!==inb){const t=(plane-a.p[2])/(b.p[2]-a.p[2]);out.push({p:a.p.map((v,j)=>v+(b.p[j]-v)*t),uv:a.uv&&a.uv.map((v,j)=>v+(b.uv[j]-v)*t)})}}}return out}
   if(object.isLine){const step=object.isLineSegments?2:1;for(let i=0;i<count-1;i+=step){let a=points[index?index.getX(i):i],b=points[index?index.getX(i+1):i+1];if(a[2]>-camera.near&&b[2]>-camera.near)continue;if(a[2]>-camera.near){const t=(-camera.near-a[2])/(b[2]-a[2]);a=a.map((v,j)=>v+(b[j]-v)*t)}if(b[2]>-camera.near){const t=(-camera.near-b[2])/(a[2]-b[2]);b=b.map((v,j)=>v+(a[j]-v)*t)}lines.push({points:[screen(a),screen(b)],color:'#dce9d4',opacity:mat.opacity??1})}return}
   if(!object.isMesh)return
   normalMatrix.getNormalMatrix(object.matrixWorld)
   for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),vertices=ids.map(id=>({p:points[id],uv:mat.map?.image&&geo.attributes.uv?[geo.attributes.uv.getX(id),geo.attributes.uv.getY(id)]:null})),clipped=clip(vertices);if(clipped.length<3)continue
    color.copy(mat.color||new T.Color('#ffffff'));if(object.userData.softwareLayer===-1&&mat.map)color.set('#397e42');if(mat.vertexColors&&geo.attributes.color)color.multiply(new T.Color().fromBufferAttribute(geo.attributes.color,ids[0]))
    let light=1;if(!mat.isMeshBasicMaterial&&geo.attributes.normal){normal.fromBufferAttribute(geo.attributes.normal,ids[0]).applyNormalMatrix(normalMatrix);light=.58+.42*Math.max(0,normal.dot(sun))}
    const rgb=[color.r,color.g,color.b].map(v=>Math.round(Math.pow(Math.min(1,v*light),1/2.2)*255))
    for(let j=1;j<clipped.length-1;j++){const tri=[clipped[0],clipped[j],clipped[j+1]],p=tri.map(v=>screen(v.p));if(p.every(v=>v[0]<0)||p.every(v=>v[0]>w)||p.every(v=>v[1]<0)||p.every(v=>v[1]>h))continue;faces.push({layer:object.userData.softwareLayer||0,points:p,depth:p.reduce((sum,v)=>sum+v[2],0)/3,fill:`rgb(${rgb.join(',')})`,opacity:mat.opacity??1,image:mat.map?.image,uv:tri[0].uv?tri.map(v=>v.uv):null})}
   }

  })
  faces.sort((a,b)=>a.layer-b.layer||b.depth-a.depth)
  for(const f of faces){ctx.globalAlpha=f.opacity;ctx.beginPath();f.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=f.fill;ctx.fill();if(f.uv)drawTexture(f.image,f.uv,f.points)}ctx.globalAlpha=1
  for(const l of lines){ctx.globalAlpha=l.opacity;ctx.strokeStyle=l.color;ctx.lineWidth=.85*ratio;ctx.beginPath();ctx.moveTo(l.points[0][0],l.points[0][1]);ctx.lineTo(l.points[1][0],l.points[1][1]);ctx.stroke()}ctx.globalAlpha=1
 },dispose(){disposed=true},forceContextLoss(){}}
}
