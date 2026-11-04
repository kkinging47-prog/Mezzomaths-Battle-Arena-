import {createAttack} from './football-career.js'
export function drawFootballField(canvas,match,kit='#edc45f',reduced=false){
 const c=canvas?.getContext('2d');if(!c)return
 const w=900,h=510,dpr=Math.min(globalThis.devicePixelRatio||1,2),cw=Math.max(1,Math.round((canvas.clientWidth||w)*dpr)),ch=Math.round(cw*h/w)
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}c.save();c.scale(cw/w,ch/h)
 c.fillStyle='#0b1926';c.fillRect(0,0,w,h)
 for(let row=0;row<3;row++)for(let i=0;i<75;i++){c.fillStyle=['#c1a877','#698da9','#a95d67','#9eaca0'][(i+row)%4];c.fillRect(i*12+3,5+row*11,4,4);c.fillRect(i*12+3,478+row*10,4,4)}
 c.fillStyle='#152c3e';c.fillRect(0,35,w,16);c.fillRect(0,461,w,14);c.fillStyle='#ead99d';c.textAlign='center';c.font='bold 9px Arial';for(const x of [135,450,765]){c.fillText('MEZZO MATHS  •  EASY MATHS',x,46);c.fillText('MEZZO FOOTBALL CLUB',x,471)}
 for(let i=0;i<12;i++){c.fillStyle=i%2?'#237b51':'#298557';c.fillRect(40+i*68.34,53,68.34,407)}
 const glow=c.createRadialGradient(450,250,50,450,250,540);glow.addColorStop(0,'#c8f4a218');glow.addColorStop(1,'#00161188');c.fillStyle=glow;c.fillRect(40,53,820,407)
 c.strokeStyle='#e8f3dfbb';c.lineWidth=2;c.strokeRect(48,62,804,390);c.strokeRect(285,62,330,123);c.strokeRect(350,62,200,48)
 c.beginPath();c.arc(450,150,58,0,Math.PI);c.moveTo(48,390);c.lineTo(852,390);c.moveTo(516,390);c.arc(450,390,66,0,Math.PI*2);c.stroke()
 c.fillStyle='#e3ecd5';for(const [x,y] of [[450,150],[450,390]]){c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill()}
 c.fillStyle='#102c26';c.fillRect(350,44,200,18);c.strokeStyle='#d7e6df77';c.lineWidth=1;for(let x=350;x<=550;x+=10){c.beginPath();c.moveTo(x,44);c.lineTo(x,62);c.stroke()}c.strokeRect(350,44,200,18);c.strokeStyle='#fff';c.lineWidth=4;c.beginPath();c.moveTo(350,64);c.lineTo(350,43);c.lineTo(550,43);c.lineTo(550,64);c.stroke()
 const f=match?.field||createAttack(match?.level||1),t=reduced?0:f.elapsed
 function player(p,color,number,keeper=false){
  const moving=Math.hypot(p.vx||0,p.vy||0)>10,swing=moving?Math.sin(t*15)*5:0
  c.save();c.translate(p.x,p.y);c.fillStyle='#082e2590';c.beginPath();c.ellipse(3,8,17,10,0,0,Math.PI*2);c.fill();c.rotate((p.angle??-Math.PI/2)+Math.PI/2)
  c.fillStyle='#101e31';c.fillRect(-9,5+swing,6,12);c.fillRect(3,5-swing,6,12);c.fillStyle='#f4eee4';c.fillRect(-9,13+swing,6,4);c.fillRect(3,13-swing,6,4)
  c.strokeStyle='#a97451';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(-9,-4);c.lineTo(keeper?-23:-15,keeper?-6:7-swing);c.moveTo(9,-4);c.lineTo(keeper?23:15,keeper?-6:7+swing);c.stroke()
  c.fillStyle=color;c.beginPath();c.ellipse(0,0,12,13,0,0,Math.PI*2);c.fill();c.fillStyle='#f8f6e9';c.font='bold 9px Arial';c.fillText(String(number),0,4);c.fillStyle='#995f42';c.beginPath();c.arc(0,-12,8,0,Math.PI*2);c.fill();c.fillStyle='#241e1c';c.beginPath();c.ellipse(0,-15,8,5,0,Math.PI,Math.PI*2);c.fill();c.restore()
 }
 for(const d of f.defenders)player({...d,angle:Math.atan2(d.vy,d.vx)},'#df6071',4)
 player(f.keeper,'#68d5cf',1,true);player(f.player,kit,9)
 if(match?.phase==='aim'&&f.possession){c.strokeStyle='#ffe7a588';c.lineWidth=2;c.setLineDash([5,7]);c.beginPath();c.moveTo(f.ball.x,f.ball.y);c.lineTo(match.aimX||535,54);c.stroke();c.setLineDash([]);c.strokeStyle='#ffdd7b';c.beginPath();c.arc(match.aimX||535,54,9,0,Math.PI*2);c.stroke()}
 if(!reduced&&f.shot){f.trail.forEach((p,i)=>{c.fillStyle=`rgba(255,241,192,${i/f.trail.length*.25})`;c.beginPath();c.arc(p.x,p.y,3,0,Math.PI*2);c.fill()})}
 c.fillStyle='#082e2590';c.beginPath();c.ellipse(f.ball.x+2,f.ball.y+4,8,4,0,0,Math.PI*2);c.fill();c.save();c.translate(f.ball.x,f.ball.y);c.rotate(f.ball.spin);c.fillStyle='#fff';c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fill();c.fillStyle='#142437';c.fillRect(-2,-2,4,4);c.fillRect(3,2,2,2);c.fillRect(-5,-3,2,2);c.restore()
 if(match?.phase==='feedback'&&f.result){c.fillStyle='#081a31c9';c.fillRect(245,210,410,74);c.fillStyle=f.result==='goal'?'#f6d16e':'#fff';c.font='bold 28px Arial';c.fillText(({goal:'GOAL!',saved:'KEEPER SAVE',blocked:'SHOT BLOCKED',tackled:'TACKLED',wide:'WIDE',time:'TIME UP'})[f.result]||'NEXT CHANCE',450,255);if(f.result==='goal'&&!reduced)for(let i=0;i<35;i++){c.fillStyle=i%2?kit:'#fff';c.fillRect(260+(i*97)%380,120+(i*43)%240,4,8)}}
 if(match?.phase==='question'){c.fillStyle='#081a3199';c.fillRect(250,220,400,57);c.fillStyle='#fff';c.font='bold 18px Arial';c.fillText('ANSWER TO START YOUR ATTACK',450,255)}
 c.restore()
}
