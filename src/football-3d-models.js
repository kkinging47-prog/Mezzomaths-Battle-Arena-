import * as T from 'three'
const mat=(color,roughness=.75)=>new T.MeshStandardMaterial({color,roughness})
function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function limb(parent,x,y,z,length,radius,material){const pivot=new T.Group();pivot.position.set(x,y,z);parent.add(pivot);mesh(pivot,new T.CapsuleGeometry(radius,length-2*radius,5,10),material,0,-length/2);return pivot}
export function createFootballer({kit='#e7bb48',skin='#855035',number=9,keeper=false,labelTexture=null}={}){
 const root=new T.Group(),body=new T.Group();root.add(body)
 const jersey=mat(kit),skinMat=mat(skin),shorts=mat('#122439'),socks=mat('#eeeae1'),boot=mat('#162027',.35),trim=mat('#f5e6b4'),hair=mat('#1b1513')
 mesh(body,new T.CylinderGeometry(.205,.16,.49,12),jersey,0,1.25)
 mesh(body,new T.SphereGeometry(.19,12,10),jersey,0,1.49).scale.set(1,.48,.72)
 mesh(body,new T.CylinderGeometry(.075,.08,.12,10),skinMat,0,1.57)
 const head=mesh(body,new T.SphereGeometry(.125,16,12),skinMat,0,1.74);head.scale.set(.86,1.15,.94)
 mesh(body,new T.SphereGeometry(.127,16,10,0,Math.PI*2,0,Math.PI*.57),hair,0,1.78).scale.set(.88,.8,.96)
 mesh(body,new T.SphereGeometry(.025,8,6),skinMat,0,1.73,-.117).scale.set(.7,1,1)
 for(const x of [-.044,.044]){mesh(body,new T.SphereGeometry(.012,6,6),mat('#211b19'),x,1.766,-.108);mesh(body,new T.SphereGeometry(.025,8,6),skinMat,x<0?-.114:.114,1.742,0)}
 const arms=[],elbows=[],hips=[],knees=[]
 for(const side of [-1,1]){
  const shoulder=new T.Group();shoulder.position.set(side*.205,1.43,0);body.add(shoulder);mesh(shoulder,new T.CapsuleGeometry(.075,.12,4,10),jersey,side*.025,-.06)
  const upper=limb(shoulder,side*.025,-.09,0,.25,.055,skinMat);const elbow=limb(upper,0,-.25,0,.27,.047,skinMat);mesh(elbow,new T.SphereGeometry(.053,8,6),keeper?mat('#eef3e5'):skinMat,0,-.28);arms.push(shoulder);elbows.push(elbow)
  const hip=limb(body,side*.105,1.03,0,.39,.095,shorts);mesh(hip,new T.CapsuleGeometry(.078,.10,4,10),skinMat,0,-.30)
  const knee=limb(hip,0,-.39,0,.39,.067,socks);mesh(knee,new T.SphereGeometry(.08,10,8),boot,0,-.35,-.07).scale.set(.85,.58,1.75);for(const stripe of [-.025,.005,.035])mesh(knee,new T.BoxGeometry(.009,.012,.09),trim,.069,-.35,-.06+stripe)
  hips.push(hip);knees.push(knee)
 }
 // Two shoulder stripes and collar provide readable kits even on smaller screens.
 mesh(body,new T.TorusGeometry(.086,.014,6,18),trim,0,1.50,0).rotation.x=Math.PI/2
 for(const side of [-1,1])mesh(body,new T.BoxGeometry(.025,.025,.23),trim,side*.15,1.48,0)
 if(labelTexture){const label=new T.Mesh(new T.PlaneGeometry(.20,.25),new T.MeshBasicMaterial({map:labelTexture,transparent:true,side:T.DoubleSide}));label.position.set(0,1.27,.175);body.add(label)}
 root.userData={number,body,arms,elbows,hips,knees,jersey,head,keeper}
 return root
}
export function animateFootballer(root,{time=0,speed=0,angle=-Math.PI/2,kick=0,celebrate=0,dive=0,reduced=false}={}){
 const {body,arms,elbows,hips,knees,keeper}=root.userData,run=reduced?0:Math.min(1,speed/135),cycle=time*12
 root.rotation.y=-angle-Math.PI/2
 body.position.y=reduced?0:Math.abs(Math.sin(cycle))*run*.055+Math.max(0,Math.sin(celebrate*7))*(celebrate? .13:0)
 body.rotation.set(0,0,0);body.rotation.x=run*.10
 for(let i=0;i<2;i++){const gait=Math.sin(cycle+i*Math.PI)*run;hips[i].rotation.x=gait*.72;knees[i].rotation.x=Math.max(0,-gait)*.95;arms[i].rotation.x=-gait*.62;arms[i].rotation.z=(i?1:-1)*(keeper?.42:.12);elbows[i].rotation.x=-.35-run*.45}
 if(kick>0){hips[1].rotation.x=-Math.sin(kick*Math.PI)*1.25;knees[1].rotation.x=.25;arms[0].rotation.z=-.65}
 if(celebrate>0){arms[0].rotation.z=-2.4;arms[1].rotation.z=2.4;elbows.forEach(e=>e.rotation.x=-.5)}
 if(dive){body.rotation.z=dive*.95;body.position.y=.28;arms[0].rotation.z=-1.8;arms[1].rotation.z=1.8;hips[0].rotation.z=-.22;hips[1].rotation.z=.25}else hips.forEach(h=>h.rotation.z=0)
}
export function footballBallGeometry(radius=.115){
 const base=new T.IcosahedronGeometry(1,0),positions=base.getAttribute('position'),vertices=[],faces=[]
 for(let i=0;i<positions.count;i+=3){const face=[];for(let j=0;j<3;j++){const p=new T.Vector3().fromBufferAttribute(positions,i+j);let index=vertices.findIndex(v=>v.distanceTo(p)<.001);if(index<0){index=vertices.length;vertices.push(p)}face.push(index)}faces.push(face)}
 const neighbors=vertices.map(()=>new Set());for(const face of faces)for(let i=0;i<3;i++){neighbors[face[i]].add(face[(i+1)%3]);neighbors[face[i]].add(face[(i+2)%3])}
 const edge=(a,b)=>vertices[a].clone().multiplyScalar(2/3).addScaledVector(vertices[b],1/3).normalize().multiplyScalar(radius),pos=[],colors=[]
 const polygon=(points,black)=>{const centre=points.reduce((v,p)=>v.add(p),new T.Vector3()).divideScalar(points.length),color=new T.Color(black?'#121a24':'#f1f1e8');for(let i=0;i<points.length;i++){for(const p of [centre,points[i],points[(i+1)%points.length]]){pos.push(p.x,p.y,p.z);colors.push(color.r,color.g,color.b)}}}
 for(const [a,b,c] of faces)polygon([edge(a,b),edge(b,a),edge(b,c),edge(c,b),edge(c,a),edge(a,c)],false)
 vertices.forEach((v,a)=>{const n=v.clone().normalize(),u=new T.Vector3().crossVectors(n,new T.Vector3(0,1,.1)).normalize(),w=new T.Vector3().crossVectors(n,u),points=[...neighbors[a]].map(b=>edge(a,b));points.sort((p,q)=>Math.atan2(p.dot(w),p.dot(u))-Math.atan2(q.dot(w),q.dot(u)));polygon(points,true)})
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();base.dispose();return geo
}
export const pitchPoint=(x,y,height=0)=>new T.Vector3((x-450)*.04,height,(y-62)*.075)
export function footballCameraPose(field,mode='chase'){
 const p=pitchPoint(field.player.x,field.player.y),b=pitchPoint(field.ball.x,field.ball.y)
 if(mode==='broadcast')return {eye:new T.Vector3(24,24,37),target:new T.Vector3(0,0,14)}
 const focus=field.shot?b:p
 return {eye:new T.Vector3(Math.max(-10,Math.min(10,focus.x*.65)),9,Math.max(12,p.z+10)),target:new T.Vector3(focus.x*.65,1,Math.max(0,focus.z-10))}
}
