import * as T from 'three'
import {createFootballer,animateFootballer,footballBallGeometry,pitchPoint,footballCameraPose} from './football-3d-models.js'
import {createSoftwareFootballRenderer} from './football-software-3d.js'
import {createAttack} from './football-career.js'
const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.85,...extra})
const qualitySettings={low:{ratio:1,shadows:false,map:512},medium:{ratio:1.25,shadows:true,map:1024},high:{ratio:1.75,shadows:true,map:2048}}
function canvasTexture(w,h,paint){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;paint(canvas.getContext('2d'),w,h);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture}
export function createFootballStadium(canvas,{quality='medium',onLost=()=>{}}={}){
 let renderer;try{const context=canvas.getContext('webgl2',{antialias:true,alpha:false});renderer=context?new T.WebGLRenderer({canvas,context,antialias:true,alpha:false,powerPreference:'default'}):createSoftwareFootballRenderer(canvas)}catch{renderer=createSoftwareFootballRenderer(canvas)};renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.type=T.PCFSoftShadowMap
 const scene=new T.Scene();scene.background=new T.Color('#a6c9da');scene.fog=new T.Fog('#acc6d0',60,150)
 const camera=new T.PerspectiveCamera(52,1,.1,190),target=new T.Vector3(),clock={value:0};let disposed=false,lost=false,ready=false,paint='',lastTime=-1,currentQuality=''
 const add=(geometry,mat,x=0,y=0,z=0,parent=scene)=>{const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m}
 const box=(x,y,z,w,h,d,mat)=>add(new T.BoxGeometry(w,h,d),mat,x,y,z)
 const concrete=material('#aab4b5'),blue=material('#163b59'),gold=material('#d5ae55'),metal=material('#c8d1d2',{metalness:.65,roughness:.4}),white=material('#eeeee5'),dark=material('#152532')
 scene.add(new T.HemisphereLight('#d3edff','#35523c',1.5))
 const sun=new T.DirectionalLight('#fff0d5',2.3);sun.position.set(-18,30,17);sun.castShadow=true;sun.shadow.camera.left=-24;sun.shadow.camera.right=24;sun.shadow.camera.top=36;sun.shadow.camera.bottom=-12;sun.shadow.camera.far=85;sun.shadow.normalBias=.035;sun.shadow.bias=-.0003;sun.target.position.set(0,0,12);scene.add(sun,sun.target)
 const fill=new T.DirectionalLight('#b6d9ef',.55);fill.position.set(20,12,-10);scene.add(fill)
 const grass=canvasTexture(1024,1024,(c,w,h)=>{let seed=83;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};for(let row=0;row<16;row++){c.fillStyle=row%2?'#377d3d':'#408747';c.fillRect(0,row*h/16,w,h/16)}for(let i=0;i<80000;i++){c.fillStyle=random()>.5?'#dbef7e13':'#153a1c19';c.fillRect(random()*w,random()*h,1,2+random()*3)}});grass.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());grass.wrapS=grass.wrapT=T.RepeatWrapping
 const ground=add(new T.PlaneGeometry(120,120),material('#63844c'),0,-.055,14);ground.rotation.x=-Math.PI/2;ground.userData.softwareLayer=-2
 const pitch=add(new T.PlaneGeometry(32.2,31.3,16,16),material('#ffffff',{map:grass}),0,0,15.65);pitch.rotation.x=-Math.PI/2;pitch.userData.softwareLayer=-1
 const lineMat=new T.LineBasicMaterial({color:'#f2f2dd',transparent:true,opacity:.85})
 const line=points=>{const g=new T.BufferGeometry().setFromPoints(points.map(([x,z])=>new T.Vector3(x,.025,z)));scene.add(new T.Line(g,lineMat))}
 line([[-16,0],[16,0],[16,31.2],[-16,31.2],[-16,0]]);line([[-8,0],[-8,12.3],[8,12.3],[8,0]]);line([[-4,0],[-4,5.5],[4,5.5],[4,0]]);line([[-16,25],[16,25]])
 const arc=(cx,cz,r,a,b)=>line(Array.from({length:65},(_,i)=>[cx+Math.cos(a+(b-a)*i/64)*r,cz+Math.sin(a+(b-a)*i/64)*r]))
 arc(0,25,4.9,0,Math.PI*2);arc(0,9.2,4.5,.75,Math.PI-.75);for(const z of [9.2,25]){const dot=add(new T.CircleGeometry(.08,12),white,0,.027,z);dot.rotation.x=-Math.PI/2}
 const postGeometry=new T.CylinderGeometry(.065,.065,1,12)
 function pole(a,b){const start=new T.Vector3(...a),end=new T.Vector3(...b),length=start.distanceTo(end),m=add(postGeometry,white,...start.clone().add(end).multiplyScalar(.5).toArray());m.scale.y=length;m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());m.castShadow=true}
 for(const x of [-3.88,3.88]){pole([x,0,0],[x,2.44,0]);pole([x,2.44,0],[x,2.44,-1.8]);pole([x,0,-1.8],[x,2.44,-1.8])}pole([-3.88,2.44,0],[3.88,2.44,0]);pole([-3.88,2.44,-1.8],[3.88,2.44,-1.8]);
 const netPositions=[];const segment=(a,b)=>netPositions.push(...a,...b)
 for(let x=-3.88;x<=3.9;x+=.18){segment([x,0,-1.8],[x,2.44,-1.8]);segment([x,2.44,0],[x,2.44,-1.8])}
 for(let y=0;y<=2.44;y+=.18){segment([-3.88,y,-1.8],[3.88,y,-1.8]);for(const x of [-3.88,3.88])segment([x,y,0],[x,y,-1.8])}
 for(let z=0;z>=-1.8;z-=.18){segment([-3.88,2.44,z],[3.88,2.44,z]);for(const x of [-3.88,3.88])segment([x,0,z],[x,2.44,z])}
 const netGeometry=new T.BufferGeometry();netGeometry.setAttribute('position',new T.Float32BufferAttribute(netPositions,3));const net=new T.LineSegments(netGeometry,new T.LineBasicMaterial({color:'#dfebe3',transparent:true,opacity:.47}));scene.add(net)
 // Stepped stands, roof beams and instanced spectators keep the stadium inexpensive to draw.
 const crowdPoints=[]
 for(let row=0;row<8;row++){
  const y=.5+row*.55,z=-8-row*.85;box(0,y/2,z,46,y,1.1,row%2?blue:concrete)
  for(let seat=0;seat<76;seat++)crowdPoints.push([-22+seat*.59,y+.25,z])
  for(const side of [-1,1]){const x=side*(21+row*.8);box(x,y/2,16,1.1,y,48,row%2?blue:concrete);for(let seat=0;seat<66;seat++)crowdPoints.push([x,y+.25,-6+seat*.67])}
 }
 const people=new T.InstancedMesh(new T.CapsuleGeometry(.14,.29,2,5),material('#ffffff'),crowdPoints.length),heads=new T.InstancedMesh(new T.SphereGeometry(.11,5,4),material('#9b7355'),crowdPoints.length),transform=new T.Object3D();const colors=['#c4a95e','#245d83','#d7e2de','#bd5860','#5b8b76']
 crowdPoints.forEach(([x,y,z],i)=>{transform.position.set(x,y+.2,z);transform.updateMatrix();people.setMatrixAt(i,transform.matrix);people.setColorAt(i,new T.Color(colors[(i*7)%5]));transform.position.y+=.31;transform.updateMatrix();heads.setMatrixAt(i,transform.matrix)});people.instanceMatrix.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;scene.add(people,heads)
 box(0,6,-14,49,.25,10,blue);for(const side of [-1,1]){box(side*27,6,16,9,.25,49,blue);for(const z of [-7,8,24,39])box(side*30,3,z,.15,6,.15,metal)}
 const banner=canvasTexture(1024,128,(c,w,h)=>{c.fillStyle='#102d47';c.fillRect(0,0,w,h);c.fillStyle='#ebcc73';c.font='bold 45px Arial';c.textAlign='center';c.fillText('MEZZO MATHS  •  EASY MATHS',w/2,82)})
 add(new T.PlaneGeometry(31,2.1),new T.MeshBasicMaterial({map:banner}),0,3,-7.3)
 for(const side of [-1,1]){const ad=add(new T.PlaneGeometry(29,.75),new T.MeshBasicMaterial({map:banner}),side*17.4,.55,15);ad.rotation.y=side===1?-Math.PI/2:Math.PI/2}
 for(const x of [-20,20])for(const z of [-6,35]){box(x,9,z,.18,18,.18,metal);const lights=box(x,18,z,3,1.2,.3,dark);lights.rotation.x=-.25;for(let i=0;i<6;i++)box(x-1.2+(i%3)*1.2,17.75+Math.floor(i/3)*.5,z+.19,.8,.3,.05,material('#fff6d8',{emissive:'#ffeac1',emissiveIntensity:2}))}
 const numberTexture=n=>canvasTexture(128,128,(c,w,h)=>{c.fillStyle='#fff6dd';c.textAlign='center';c.font='bold 76px Arial';c.fillText(String(n),w/2,90)})
 const striker=createFootballer({labelTexture:numberTexture(9)}),keeper=createFootballer({kit:'#64b9ad',number:1,keeper:true,labelTexture:numberTexture(1)}),defenders=Array.from({length:3},(_,i)=>createFootballer({kit:'#b92f48',number:i+4,skin:['#6f4630','#ba8864','#855035'][i],labelTexture:numberTexture(i+4)}));scene.add(striker,keeper,...defenders)
 const ball=add(footballBallGeometry(),new T.MeshStandardMaterial({vertexColors:true,roughness:.65}));ball.castShadow=true
 const blobMat=new T.MeshBasicMaterial({color:'#102f22',transparent:true,opacity:.25,depthWrite:false});const blobs=[striker,keeper,...defenders,ball].map(()=>{const m=add(new T.CircleGeometry(.34,20),blobMat,0,.012,0);m.rotation.x=-Math.PI/2;m.userData.softwareLayer=-.5;return m})
 const aimLine=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineDashedMaterial({color:'#ffe3a0',dashSize:.24,gapSize:.16,transparent:true,opacity:.7}));scene.add(aimLine)
 const aimRing=add(new T.TorusGeometry(.25,.035,6,24),material('#efcf69',{emissive:'#b88a31',emissiveIntensity:.5}),0,.05,0);aimRing.rotation.x=Math.PI/2
 function setQuality(value){value=qualitySettings[value]?value:'medium';if(currentQuality===value)return;currentQuality=value;const q=qualitySettings[value];renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,q.ratio));renderer.shadowMap.enabled=q.shadows;sun.shadow.mapSize.set(q.map,q.map);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}sun.shadow.needsUpdate=true;people.visible=heads.visible=value!=='low'}
 setQuality(quality)
 const onContextLost=event=>{event.preventDefault();lost=true;onLost()};canvas.addEventListener('webglcontextlost',onContextLost)
 return {isSoftware:Boolean(renderer.isSoftware),setQuality,aimFromPointer(nx,ny){const point=new T.Vector3(nx*2-1,1-ny*2,.5).unproject(camera),direction=point.sub(camera.position).normalize();if(Math.abs(direction.z)<.0001)return null;const distance=-camera.position.z/direction.z;if(distance<0)return null;const hit=camera.position.clone().addScaledVector(direction,distance);if(hit.y<-.4||hit.y>3.2||Math.abs(hit.x)>4.5)return null;return Math.max(355,Math.min(545,hit.x/.04+450))},draw(match,{kit='#edc45f',cameraMode='chase',reducedMotion=false,paused=false}={}){
  if(disposed||lost)return
  const field=match?.field||createAttack(match?.level||1),time=field.elapsed+(match?.phase==='feedback'?match.phaseElapsed:0),simTime=(match?.elapsed||0),dt=lastTime<0?0:Math.min(.06,Math.max(0,simTime-lastTime));lastTime=simTime;clock.value=time
  const width=Math.max(1,canvas.clientWidth||900),height=Math.round(width*600/960);if(canvas.width!==Math.round(width*renderer.getPixelRatio())||canvas.height!==Math.round(height*renderer.getPixelRatio())){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}
  if(paint!==kit){striker.userData.jersey.color.set(kit);paint=kit}
  striker.position.copy(pitchPoint(field.player.x,field.player.y));keeper.position.copy(pitchPoint(field.keeper.x,field.keeper.y));
  const kick=field.shot?Math.max(0,1-((field.shotAge||0)+(match?.phase==='feedback'?match.phaseElapsed:0))/.45):0,celebrate=field.result==='goal'?Math.min(1,match?.phaseElapsed||0):0
  animateFootballer(striker,{time,speed:Math.hypot(field.player.vx,field.player.vy),angle:field.player.angle,kick,celebrate,reduced:reducedMotion})
  const dive=field.shot&&field.ball.y<140?Math.max(-1,Math.min(1,(field.ball.x-field.keeper.x)/45)):field.result==='saved'?.8:0
  animateFootballer(keeper,{time,speed:Math.abs(field.keeper.vx||0),angle:Math.PI/2,dive,reduced:reducedMotion})
  field.defenders.forEach((d,i)=>{defenders[i].visible=true;defenders[i].position.copy(pitchPoint(d.x,d.y));animateFootballer(defenders[i],{time,speed:Math.hypot(d.vx,d.vy),angle:Math.atan2(d.vy,d.vx),reduced:reducedMotion})});defenders.forEach((d,i)=>{if(i>=field.defenders.length)d.visible=false})
  let ballHeight=field.ball.height??.115;const netBounce=field.result==='goal'?Math.min(1,match?.phaseElapsed||0):0;ball.position.copy(pitchPoint(field.ball.x,field.ball.y,ballHeight));ball.position.z-=Math.sin(netBounce*Math.PI*.65)*1.25;ball.rotation.x=field.ball.spin;ball.rotation.z=field.ball.spin*.35
  blobs.forEach((shadow,i)=>{const actor=[striker,keeper,...defenders,ball][i];shadow.position.set(actor.position.x,.015,actor.position.z);shadow.visible=actor.visible;shadow.scale.setScalar(i===5?Math.max(.3,1-ballHeight*.2)*.45:1)})
  const aim=pitchPoint(match?.aimX||535,62,.08);aimRing.position.copy(aim);aimLine.visible=aimRing.visible=Boolean(match?.phase==='aim'&&field.possession);const a=aimLine.geometry.attributes.position;a.setXYZ(0,ball.position.x,.09,ball.position.z);a.setXYZ(1,aim.x,.09,0);a.needsUpdate=true;aimLine.computeLineDistances()
  const pose=footballCameraPose(field,reducedMotion?'broadcast':cameraMode),smoothing=!ready||reducedMotion||paused?1:1-Math.exp(-dt*6);camera.position.lerp(pose.eye,smoothing);target.lerp(pose.target,smoothing);camera.lookAt(target);ready=true
  net.scale.z=1+Math.sin(netBounce*Math.PI*6)*Math.exp(-netBounce*3)*.035;renderer.render(scene,camera)
 },dispose(){if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',onContextLost);const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material])if(m){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value)}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();sun.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss()}}
}
