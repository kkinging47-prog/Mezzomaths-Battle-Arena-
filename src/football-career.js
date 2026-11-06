// Pitch units are independent of screen size; simulation runs in bounded steps.
export const FOOTBALL_LEVELS=[
 {id:1,name:'Training Ground',defenders:0,speed:0,keeper:62,seconds:30,goals:1},
 {id:2,name:'First Match',defenders:1,speed:65,keeper:79,seconds:28,goals:2},
 {id:3,name:'Club Challenge',defenders:2,speed:77,keeper:95,seconds:26,goals:2},
 {id:4,name:'Championship',defenders:3,speed:88,keeper:112,seconds:24,goals:3},
 {id:5,name:'Mezzo Cup',defenders:3,speed:101,keeper:125,seconds:22,goals:2}
]
export const careerLevel=id=>FOOTBALL_LEVELS.find(l=>l.id===Number(id))||FOOTBALL_LEVELS[0]
export function careerUnlocked(records=[]){return Math.max(1,...records.map(r=>Math.min(5,Math.max(1,Math.floor(Number(r.metadata?.unlockedLevel)||1)))))}
export function createAttack(level=1,boost=false){
 const rules=careerLevel(level)
 return {level:rules.id,player:{x:450,y:420,vx:0,vy:0,angle:-Math.PI/2},ball:{x:450,y:402,vx:0,vy:0,spin:0,height:.115,verticalVelocity:0},keeper:{x:450,y:81},defenders:Array.from({length:rules.defenders},(_,i)=>({x:310+i*120,y:215+(i%2)*60,vx:0,vy:0})),possession:true,shot:false,time:rules.seconds,elapsed:0,cooldown:0,boost,result:null,trail:[]}
}
export function shootAttack(field,target={x:450,y:55}){
 if(!field||field.result||!field.possession)return false
 if(!Number.isFinite(target?.x)||!Number.isFinite(target?.y))return false
 const dx=target.x-field.ball.x,dy=target.y-field.ball.y,length=Math.hypot(dx,dy)
 if(length<1)return false
 const power=field.boost?680:560
 field.ball.vx=dx/length*power;field.ball.vy=dy/length*power;field.ball.verticalVelocity=(target.loft||field.loft)?7:2.2;field.shotAge=0;field.shot=true;field.possession=false;return true
}
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v))
export function tickAttack(f,seconds,input={}){
 if(!f||f.result)return false
 const dt=clamp(Number(seconds)||0,0,.025),r=careerLevel(f.level)
 f.elapsed+=dt;f.time=Math.max(0,f.time-dt);f.cooldown=Math.max(0,f.cooldown-dt)
 const p=f.player,b=f.ball,k=f.keeper
 const ix=Number(input.x)||0,iy=Number(input.y)||0,n=Math.max(1,Math.hypot(ix,iy)),speed=f.boost?182:162
 const blend=1-Math.exp(-13*dt)
 p.vx+=(ix/n*speed-p.vx)*blend;p.vy+=(iy/n*speed-p.vy)*blend
 p.x=clamp(p.x+p.vx*dt,49,851);p.y=clamp(p.y+p.vy*dt,90,455)
 if(Math.hypot(p.vx,p.vy)>10)p.angle=Math.atan2(p.vy,p.vx)
 if(f.possession){b.height=.115;b.x=p.x+Math.cos(p.angle)*17;b.y=p.y+Math.sin(p.angle)*17}
 else {f.shotAge=(f.shotAge||0)+dt;b.height+=b.verticalVelocity*dt;b.verticalVelocity-=9.81*dt;if(b.height<.115){b.height=.115;b.verticalVelocity=Math.abs(b.verticalVelocity)>.8?-b.verticalVelocity*.38:0}b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.exp(-.32*dt);b.vy*=Math.exp(-.32*dt);b.spin+=Math.hypot(b.vx,b.vy)*dt/8;f.trail.push({x:b.x,y:b.y});if(f.trail.length>12)f.trail.shift()}
 // Keeper follows a moving ball with a finite reaction speed, never teleports.
 const keeperTarget=f.shot?b.x:450+Math.sin(f.elapsed*1.6)*70
 k.vx=clamp((keeperTarget-k.x)/Math.max(.001,dt),-r.keeper,r.keeper);k.x+=k.vx*dt;k.x=clamp(k.x,363,537)
 for(const d of f.defenders){
  const dx=(f.possession?p.x:b.x)-d.x,dy=(f.possession?p.y:b.y)-d.y,distance=Math.hypot(dx,dy)||1
  d.vx=dx/distance*r.speed;d.vy=dy/distance*r.speed;d.x=clamp(d.x+d.vx*dt,55,845);d.y=clamp(d.y+d.vy*dt,115,447)
  if(Math.hypot(d.x-b.x,d.y-b.y)<18&&(b.height||0)<1.45){f.result=f.shot?'blocked':'tackled';return true}
 }
 if(f.shot&&Math.hypot(b.x-k.x,b.y-k.y)<23&&(b.height||0)<2.0){f.result='saved';return true}
 if(f.shot&&b.y<=62){f.result=b.x>353&&b.x<547?((b.height||0)>2.44?'over':'goal'):'wide';return true}
 if(!f.possession&&(b.x<40||b.x>860||b.y>470)){f.result='wide';return true}
 if(!f.possession&&Math.hypot(b.vx,b.vy)<30){f.result='wide';return true}
 if(f.time<=0){f.result='time';return true}return false
}
export function careerOutcome(match){
 const level=careerLevel(match.level),groups=[]
 for(let i=0;i<match.answers.length;i+=5){const a=match.answers.slice(i,i+5);groups.push({goals:a.filter(x=>x.goal).length,correct:a.filter(x=>x.correct).length,total:a.length})}
 const required=Math.ceil(level.goals*match.questions.length/5),maths=Math.ceil(match.questions.length*.6)
 const passed=match.finished&&(level.id===5?groups.length===3&&groups.every(g=>g.goals>=2&&g.correct>=3):match.goals>=required&&match.answers.filter(a=>a.correct).length>=maths)
 return {passed,requiredGoals:required,requiredCorrect:maths,groups}
}
