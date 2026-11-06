const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),range=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
export const BASKET_LEVELS=[
 {name:'Warm-up Court',defenders:0,speed:0,seconds:22,target:4},
 {name:'Street Challenge',defenders:1,speed:1.35,seconds:20,target:5},
 {name:'Club Basketball',defenders:2,speed:1.8,seconds:18,target:6},
 {name:'Championship',defenders:2,speed:2.15,seconds:16,target:7},
 {name:'Mezzo Hoops Cup',defenders:3,speed:2.4,seconds:15,target:8}
]
export const basketLevel=level=>BASKET_LEVELS[clamp(Math.floor(Number(level)||1),1,5)-1]
export const BASKET={x:0,z:1.6,height:3.05,radius:.30}
export function createBasketballWorld(){return {health:100,points:0,made:0,attempts:0,turnovers:0,player:{x:0,z:10,vx:0,vz:0},defenders:[],ball:{x:.4,z:9.8,height:.5,vx:0,vz:0,vy:0},clock:22,time:0,focus:false,charging:false,chargeTime:0,power:0,airborne:false,flightAge:0,pressure:0,banked:false,bounces:0,aim:0,lastRelease:null}}
export function resetBasketballPossession(w,level,round,correct){const rules=basketLevel(level);w.player={x:(round%3-1)*1.4,z:9.5,vx:0,vz:0};w.defenders=Array.from({length:rules.defenders},(_,i)=>({x:[-2.1,2.1,0][i],z:5.7+(i%2)*1.2,vx:0,vz:0}));w.ball={x:w.player.x+.4,z:w.player.z-.2,height:.55,vx:0,vz:0,vy:0};Object.assign(w,{clock:rules.seconds,time:0,focus:correct,charging:false,chargeTime:0,power:0,airborne:false,flightAge:0,pressure:0,banked:false,bounces:0,aim:0,lastRelease:null})}
export function basketballGreenWindow(w,level){const distance=range(w.player,BASKET);return Math.max(.045,(w.focus?.135:.085)-Math.min(.04,Math.max(0,distance-4)*.008)-(level-1)*.004)}
export function startBasketballShot(g){if(g?.kind!=='basketball'||g.finished||g.phase!=='playing'||g.world.airborne||g.world.charging)return false;g.world.charging=true;g.world.chargeTime=0;g.world.power=0;return true}
export function cancelBasketballShot(g){if(g?.kind!=='basketball'||!g.world.charging)return false;g.world.charging=false;g.world.chargeTime=0;g.world.power=0;return true}
export function releaseBasketballShot(g,aim=0){
 if(g?.kind!=='basketball'||g.finished||g.phase!=='playing'||!g.world.charging||g.world.airborne)return false
 const w=g.world,power=w.power,window=basketballGreenWindow(w,g.level),error=power-.68,green=Math.abs(error)<=window,distance=range(w.player,BASKET),time=.85+distance*.055
 const nearest=w.defenders.reduce((n,d)=>Math.min(n,range(d,w.player)),Infinity),contested=nearest<1.4,depthError=green?0:-Math.sign(error)*(.52+(Math.abs(error)-window)*2.8),sideError=contested?.4:0
 const target={x:clamp(Number(aim)||0,-1,1)*.9+sideError,z:BASKET.z+depthError}
 w.ball={x:w.player.x,z:w.player.z-.12,height:1.95,vx:(target.x-w.player.x)/time,vz:(target.z-(w.player.z-.12))/time,vy:(BASKET.height-1.95+.5*9.81*time*time)/time}
 w.airborne=true;w.charging=false;w.flightAge=0;w.bounces=0;w.attempts++;w.lastRelease={power,green,contested,points:distance>=6.75?3:2,window};g.events.push('shot')
 const record=g.answers.at(-1);if(record)Object.assign(record,{release:Math.round(power*100),green,contested,shotPoints:w.lastRelease.points})
 return true
}
export function tickBasketball(g,dt,input={}){
 const w=g.world,rules=basketLevel(g.level),p=w.player;w.time+=dt;w.clock=Math.max(0,w.clock-dt);w.aim=clamp(Number(input.aim)||0,-1,1)
 let ix=Number(input.x)||0,iz=Number(input.y)||0,n=Math.max(1,Math.hypot(ix,iz));if(w.charging){ix=0;iz=0;w.chargeTime+=dt;const cycle=w.chargeTime%2.2;w.power=cycle<=1.1?cycle/1.1:2-cycle/1.1}
 const blend=1-Math.exp(-dt*14),speed=w.focus?3.95:3.65;p.vx+=(ix/n*speed-p.vx)*blend;p.vz+=(iz/n*speed-p.vz)*blend;p.x=clamp(p.x+p.vx*dt,-6.8,6.8);p.z=clamp(p.z+p.vz*dt,2.3,13.5)
 for(const d of w.defenders){const dx=p.x-d.x,dz=p.z-d.z,length=Math.hypot(dx,dz)||1,moving=length>.85&&!w.airborne;d.vx=moving?dx/length*rules.speed:0;d.vz=moving?dz/length*rules.speed:0;d.x+=d.vx*dt;d.z+=d.vz*dt;if(length<.45){p.x=clamp(d.x+dx/length*.45,-6.8,6.8);p.z=clamp(d.z+dz/length*.45,2.3,13.5)}}
 if(!w.airborne){w.ball.x=p.x+(w.charging?0:.4);w.ball.z=p.z-.15;w.ball.height=w.charging?1.95:.23+Math.abs(Math.sin(w.time*10))*.95;const near=w.defenders.some(d=>range(d,p)<1.05);w.pressure=clamp(w.pressure+(near?dt:-dt*1.8),0,1.3);if(w.pressure>=1.3){w.turnovers++;return 'Turnover · ball stolen'}if(w.clock<=0)return 'Shot clock expired';return null}
 const b=w.ball,oldHeight=b.height;w.flightAge+=dt;b.x+=b.vx*dt;b.z+=b.vz*dt;b.height+=b.vy*dt;b.vy-=9.81*dt
 if(w.flightAge<.28&&b.height<2.7&&w.defenders.some(d=>range(d,b)<.55)){return 'Shot blocked'}
 if(!w.banked&&b.z<.58&&b.vz<0&&Math.abs(b.x)<1.05&&b.height>3.15&&b.height<4.3){b.z=.59;b.vz=-b.vz*.62;b.vx*=.7;w.banked=true;g.events.push('bank')}
 if(oldHeight>=BASKET.height&&b.height<=BASKET.height&&b.vy<0&&Math.hypot(b.x-BASKET.x,b.z-BASKET.z)<BASKET.radius){const points=w.lastRelease.points;w.points+=points;w.made++;b.height=2.85;g.answers.at(-1).points=points;g.events.push('basket');return `${w.banked?'Bank shot':'Basket'}! +${points} points`}
 if(b.height<.14){b.height=.14;b.vy=Math.abs(b.vy)*.42;b.vx*=.6;b.vz*=.6;w.bounces++;g.events.push('bounce')}
 if(w.bounces>=2||w.flightAge>3.3||Math.abs(b.x)>9||b.z<-3||b.z>17)return w.lastRelease.contested?'Contested shot missed':w.lastRelease.green?'Just off the rim':w.lastRelease.power<.68?'Short · release later':'Long · release earlier'
 return null
}
export function basketballStats(g){const w=g.world;return {points:w.points,made:w.made,attempts:w.attempts,turnovers:w.turnovers,target:basketLevel(g.level).target}}
