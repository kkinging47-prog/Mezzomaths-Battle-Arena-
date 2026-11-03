export function drawFootballPitch(canvas,match,kit='#e3b741',reducedMotion=false){
 const c=canvas?.getContext('2d');if(!c)return
 const w=900,h=510,ratio=Math.min(globalThis.devicePixelRatio||1,2),width=Math.max(1,Math.round((canvas.clientWidth||900)*ratio)),height=Math.round(width*h/w)
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}c.save();c.scale(width/w,height/h)
 const sky=c.createLinearGradient(0,0,0,200);sky.addColorStop(0,'#0d1e3c');sky.addColorStop(1,'#324a6a');c.fillStyle=sky;c.fillRect(0,0,w,h)
 c.fillStyle='#0b1425';c.fillRect(0,60,w,110)
 for(let row=0;row<4;row++)for(let i=0;i<48;i++){c.fillStyle=['#d9b862','#728dad','#ad5c66','#cbd5df'][(i+row*3)%4];c.beginPath();c.arc(i*20+(row%2)*7,80+row*20,3,0,Math.PI*2);c.fill()}
 c.fillStyle='#122a47';c.fillRect(315,45,270,30);c.fillStyle='#f1cd68';c.font='bold 16px Arial';c.textAlign='center';c.fillText('MEZZO MATHS · MATCH DAY',450,65)
 for(const x of [45,855]){c.strokeStyle='#71869c';c.lineWidth=5;c.beginPath();c.moveTo(x,0);c.lineTo(x,155);c.stroke();c.fillStyle='#fff6cc';c.fillRect(x-26,12,52,13)}
 for(let i=0;i<8;i++){c.fillStyle=i%2?'#217253':'#277e59';c.fillRect(0,165+i*44,w,44)}
 c.strokeStyle='#d8eee0';c.lineWidth=3;c.beginPath();c.moveTo(200,180);c.lineTo(35,505);c.lineTo(865,505);c.lineTo(700,180);c.closePath();c.stroke()
 c.beginPath();c.moveTo(280,190);c.lineTo(210,340);c.lineTo(690,340);c.lineTo(620,190);c.stroke();c.beginPath();c.ellipse(450,370,95,28,0,0,Math.PI);c.stroke()
 // Goal frame and net use the same three target zones as the keyboard controls.
 c.fillStyle='#0c3028';c.fillRect(270,120,360,115);c.strokeStyle='#c2d5d080';c.lineWidth=1
 for(let x=270;x<=630;x+=18){c.beginPath();c.moveTo(x,120);c.lineTo(x,235);c.stroke()}for(let y=120;y<=235;y+=16){c.beginPath();c.moveTo(270,y);c.lineTo(630,y);c.stroke()}
 c.strokeStyle='#f1f6f6';c.lineWidth=8;c.strokeRect(270,120,360,115)
 const zones=[325,450,575],keeper=match?.keeperZone??1,aim=match?.phase==='aim'
 if(aim){c.font='bold 14px Arial';zones.forEach((x,i)=>{c.fillStyle=i===keeper?'#ff9b7a':'#e9d18b';c.beginPath();c.arc(x,145,19,0,Math.PI*2);c.fill();c.fillStyle='#14283b';c.fillText(String(i+1),x,150)})}
 const flight=match?.phase==='flight',t=flight?Math.min(1,match.phaseElapsed/1.2):0,kx=zones[keeper]
 // A visible keeper position makes aiming a skill rather than a random save.
 c.save();c.translate(kx,205);if(flight&&match.shotSaved)c.rotate((keeper-1)*.65)
 c.fillStyle='#10243b';c.beginPath();c.ellipse(0,31,30,7,0,0,Math.PI*2);c.fill();c.strokeStyle='#6dd8cf';c.lineWidth=13;c.lineCap='round';c.beginPath();c.moveTo(0,-11);c.lineTo(0,15);c.moveTo(-22,-8);c.lineTo(0,0);c.lineTo(22,-8);c.stroke();c.strokeStyle='#173147';c.lineWidth=10;c.beginPath();c.moveTo(0,15);c.lineTo(-12,34);c.moveTo(0,15);c.lineTo(12,34);c.stroke();c.fillStyle='#9a674e';c.beginPath();c.arc(0,-26,10,0,Math.PI*2);c.fill();c.restore()
 // The striker stays behind the ball; shots follow a curved flight into the goal.
 c.save();c.translate(405,435);c.fillStyle='#0e302c';c.beginPath();c.ellipse(0,48,32,8,0,0,Math.PI*2);c.fill();c.strokeStyle=kit;c.lineWidth=21;c.lineCap='round';c.beginPath();c.moveTo(0,-3);c.lineTo(0,23);c.stroke();c.strokeStyle='#182939';c.lineWidth=12;c.beginPath();c.moveTo(0,23);c.lineTo(-14,45);c.moveTo(0,23);c.lineTo(20,42);c.stroke();c.fillStyle='#89583f';c.beginPath();c.arc(0,-23,12,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.font='bold 14px Arial';c.fillText('9',0,15);c.restore()
 let bx=450,by=435,r=13
 if(flight){const end=match.shotZone===null?710:zones[match.shotZone];bx=450+(end-450)*t;by=435+(165-435)*t-Math.sin(t*Math.PI)*80;r=13-6*t;if(reducedMotion){bx=end;by=165;r=7}}
 c.fillStyle='#062b2680';c.beginPath();c.ellipse(bx,flight?by+20:by+10,r+4,4,0,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(bx,by,r,0,Math.PI*2);c.fill();c.fillStyle='#172c3d';c.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;const x=bx+Math.cos(a)*r*.48,y=by+Math.sin(a)*r*.48;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.fill()
 c.fillStyle='#e6f4ed';c.font='12px Arial';c.fillText('ANSWER · AIM · SHOOT',450,490);c.restore()
}
