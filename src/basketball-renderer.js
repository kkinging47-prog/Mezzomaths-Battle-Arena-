import {BASKET,basketLevel,createBasketballWorld,basketballGreenWindow} from './basketball-engine.js'
const project=(x,z,h=0)=>{const f=.52+.038*z;return {x:480+x*48*f,y:200+z*24*f-h*58*f,f}}
export function drawBasketballChallenge(canvas,game,reduced=false){
 if(!canvas)return;canvas.width=960;canvas.height=600;const c=canvas.getContext('2d');if(!c)return
 const w=game?.world||createBasketballWorld(),level=game?.level||1
 const line=(points,color,width=2,close=false,fill=false)=>{c.beginPath();points.forEach((p,i)=>{const q=project(...p);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y)});if(close)c.closePath();c.strokeStyle=color;c.lineWidth=width;if(fill){c.fillStyle=color;c.fill()}else c.stroke()}
 const ring=(x,z,r,color,width=2)=>line(Array.from({length:65},(_,i)=>[x+Math.cos(i/64*Math.PI*2)*r,z+Math.sin(i/64*Math.PI*2)*r]),color,width)
 const text=(s,x,y,size,color='#fff',align='center')=>{c.font=`800 ${size}px Arial`;c.textAlign=align;c.fillStyle=color;c.fillText(s,x,y)}
 let bg=c.createLinearGradient(0,0,0,600);bg.addColorStop(0,'#071328');bg.addColorStop(1,'#20344b');c.fillStyle=bg;c.fillRect(0,0,960,600)
 // Recessed stands, spotlights and arena signage.
 for(let row=0;row<5;row++)for(let col=0;col<43;col++){const x=9+col*23+(row%2)*7,y=57+row*23;c.fillStyle=['#354a61','#596476','#be9460','#34435b'][(row*13+col*7)%4];c.beginPath();c.arc(x,y,3.2,0,Math.PI*2);c.fill();c.fillRect(x-4,y+5,8,8)}
 c.fillStyle='#10253e';c.fillRect(300,17,360,55);text('MEZZO  H O O P S',480,42,21,'#f3d288');text(game?`COURT ${level}   •   ${basketLevel(level).name.toUpperCase()}`:'BASKETBALL CHALLENGE',480,59,10,'#c6d8e7')
 for(const x of [65,895]){c.fillStyle='#e9f2fc';c.fillRect(x-30,17,60,5);const glow=c.createLinearGradient(x,20,480,400);glow.addColorStop(0,'#d2e5ff17');glow.addColorStop(1,'#d2e5ff00');c.fillStyle=glow;c.beginPath();c.moveTo(x-30,22);c.lineTo(480+(x<480?180:-180),580);c.lineTo(x<480?0:960,580);c.closePath();c.fill()}
 line([[-8,0],[8,0],[8,15],[-8,15]],'#172d48',1,true,true)
 for(let z=0;z<14.4;z+=.48)for(let x=-7.5;x<7.49;x+=1.5){const n=Math.floor((z+.01)/.48);line([[x,z],[x+1.5,z],[x+1.5,z+.48],[x,z+.48]],['#c68a4d','#d59b5c','#dba364','#cd9152'][(Math.round(x*2)+n*3+31)%4],1,true,true);line([[x+.12,z+.16],[x+1.35,z+.16]],'#b67b4233',.5)}
 line([[-7.5,0],[7.5,0],[7.5,14.4],[-7.5,14.4]],'#f8e7bc',2,true)
 line([[-2.45,0],[2.45,0],[2.45,5.8],[-2.45,5.8]],'#31445c',1,true,true)
 line([[-2.45,0],[2.45,0],[2.45,5.8],[-2.45,5.8]],'#f8e7bc',2,true);ring(0,5.8,1.8,'#f8e7bc');ring(0,14.4,1.8,'#f8e7bc')
 line(Array.from({length:65},(_,i)=>{const a=i/64*Math.PI;return [Math.cos(a)*6.75,1.6+Math.sin(a)*6.75]}),'#f8e7bc',2)
 line([[-6.75,0],[-6.75,1.6]],'#f8e7bc');line([[6.75,0],[6.75,1.6]],'#f8e7bc')
 const brand=project(0,11.8);text('M E Z Z O',brand.x,brand.y,24,'#926335')
 // Basket support, transparent backboard, rim and net.
 line([[0,.25,0],[0,.25,4.3]],'#9aacc1',9);line([[-.9,.55,3.15],[.9,.55,3.15],[.9,.55,4.25],[-.9,.55,4.25]],'#d5eaff',3,true)
 line([[-.35,.55,3.2],[.35,.55,3.2],[.35,.55,3.7],[-.35,.55,3.7]],'#f4f7fb',2,true)
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2;line([[Math.cos(a)*.3,1.6+Math.sin(a)*.3,3.05],[Math.cos(a+.5)*.18,1.6+Math.sin(a+.5)*.18,2.6]],'#e9edf3aa',1)}
 line(Array.from({length:33},(_,i)=>[Math.cos(i/32*Math.PI*2)*.3,1.6+Math.sin(i/32*Math.PI*2)*.3,3.05]),'#ff763c',4)
 function athlete(p,defender,index=0){const q=project(p.x,p.z),s=q.f*1.05,moving=Math.hypot(p.vx||0,p.vz||0)>.2,gait=reduced?0:Math.sin(w.time*9+index)* (moving?8:1),shoot=!defender&&w.charging,contest=defender&&Math.hypot(p.x-w.player.x,p.z-w.player.z)<1.8;c.save();c.translate(q.x,q.y);c.scale(s,s)
 c.fillStyle='#131c3444';c.beginPath();c.ellipse(0,0,19,6,0,0,Math.PI*2);c.fill();c.lineCap='round'
 const limb=(x1,y1,x2,y2,x3,y3,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.lineTo(x3,y3);c.stroke()}
 limb(-6,-35,-9-gait*.35,-18,-9-gait,-3,'#9c6244',8);limb(6,-35,9+gait*.35,-18,9+gait,-3,'#ac7051',8)
 limb(-9-gait,-9,-9-gait,-3,-15-gait,-2,'#f5f1de',6);limb(9+gait,-9,9+gait,-3,15+gait,-2,'#eee9d9',6)
 c.fillStyle=defender?'#b94744':'#193b66';c.fillRect(-12,-43,24,12);c.fillStyle=defender?'#e96a52':'#2e72b5';c.beginPath();c.moveTo(-10,-72);c.lineTo(10,-72);c.lineTo(14,-45);c.lineTo(-14,-45);c.closePath();c.fill();text(defender?String(index+4):'23',0,-52,12,'#fff')
 const raised=shoot||contest;limb(-10,-68,-21,-55-(raised?24:0),-13,-42-(raised?51:0),'#b77a56',6);limb(10,-68,22,-55-(raised?24:0),shoot?4:19,shoot?-94:raised?-91:-42,'#b77a56',6)
 c.fillStyle='#bc805a';c.fillRect(-4,-79,8,9);c.beginPath();c.ellipse(0,-86,9,11,0,0,Math.PI*2);c.fill();c.fillStyle='#211e26';c.beginPath();c.ellipse(0,-93,9,6,0,Math.PI,Math.PI*2);c.fill();c.restore()}
 const actors=[...w.defenders.map((p,i)=>({p,defender:true,index:i})),{p:w.player,defender:false,index:0}].sort((a,b)=>a.p.z-b.p.z)
 actors.forEach(a=>athlete(a.p,a.defender,a.index))
 const b=w.ball,q=project(b.x,b.z,b.height),ground=project(b.x,b.z);c.fillStyle='#20182a44';c.beginPath();c.ellipse(ground.x,ground.y,Math.max(3,8-q.f*b.height*.5),3,0,0,Math.PI*2);c.fill();const r=7.5*q.f,ball=c.createRadialGradient(q.x-r*.3,q.y-r*.4,1,q.x,q.y,r);ball.addColorStop(0,'#ffce73');ball.addColorStop(.7,'#ec8835');ball.addColorStop(1,'#a94e24');c.fillStyle=ball;c.beginPath();c.arc(q.x,q.y,r,0,Math.PI*2);c.fill();c.strokeStyle='#63341e';c.lineWidth=1;c.beginPath();c.arc(q.x,q.y,r,0,Math.PI*2);c.moveTo(q.x-r,q.y);c.lineTo(q.x+r,q.y);c.moveTo(q.x,q.y-r);c.quadraticCurveTo(q.x+r*.8,q.y,q.x,q.y+r);c.stroke()
 if(!w.airborne){const aim=project(w.aim*.9,BASKET.z,BASKET.height);c.strokeStyle='#fff8c0';c.lineWidth=2;c.beginPath();c.arc(aim.x,aim.y,6,0,Math.PI*2);c.stroke()}
 c.fillStyle='#09182de8';c.fillRect(28,520,904,65)
 const window=basketballGreenWindow(w,level),mx=215,my=548,mw=530;c.fillStyle='#526078';c.fillRect(mx,my,mw,12);c.fillStyle='#5ce5a1';c.fillRect(mx+(.68-window)*mw,my,window*2*mw,12);c.fillStyle='#fff';c.fillRect(mx+w.power*mw-2,my-6,4,24)
 text(game?.phase==='feedback'?game.answers.at(-1)?.outcome||'POSSESSION COMPLETE':w.airborne?'SHOT IN FLIGHT':w.charging?'RELEASE IN GREEN':'HOLD SHOOT / SPACE TO START',480,538,12,'#f0d39b');text('EARLY',mx-18,my+11,10,'#b8cadb','right');text('LATE',mx+mw+18,my+11,10,'#b8cadb','left');text(`${w.focus?'FOCUS ACTIVE  •  ':''}CENTRE AIM  •  2 PT INSIDE / 3 PT BEYOND ARC`,480,577,10,'#d1deea')
 if(game?.phase==='question'){c.fillStyle='#081527ae';c.fillRect(0,0,960,510);text('MATHS TIMEOUT',480,280,27,'#f3d18a');text('Answer your question to earn this possession',480,310,15,'#e5edf6')}
}
