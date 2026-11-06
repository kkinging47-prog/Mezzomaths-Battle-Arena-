import {validGameQuestion} from './game-question-bank.js'
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
export const ARCADE_LEVELS={kart:['Rookie Grid','Coastal Cup','Forest Sprint','Night Circuit','Mezzo Grand Prix'],space:['Orbit Patrol','Asteroid Belt','Nebula Front','Deep Space','Mezzo Galaxy']}
export const KART_COURSES={coast:'Cape Coast Run',forest:'Forest Circuit',night:'Accra Night Run'}
export function createArcadeGame(kind,questions,{level=1,course='coast'}={}){
 if(!['kart','space'].includes(kind)||questions?.length!==5||questions.some(q=>!validGameQuestion(q))||new Set(questions.map(q=>q.id)).size!==5||new Set(questions.map(q=>q.question_text.trim())).size!==5)throw Error('Choose five unique, complete questions for this game.')
 level=clamp(Math.floor(Number(level)||1),1,5)
 const common={kind,questions:[...questions],level,round:0,phase:'question',answers:[],elapsed:0,finished:false,failed:false,passed:false,events:[]}
 if(kind==='kart')common.world={course:Object.hasOwn(KART_COURSES,course)?course:'coast',x:0,distance:0,speed:0,fuel:45,nitro:0,boost:0,health:100,hitCooldown:0,finishTime:null,collisions:0,pads:0,bots:[0,1,2].map((i)=>({name:['Kofi','Ama','Kojo'][i],x:[-.55,0,.55][i],distance:6+i*8,speed:24+level*1.8+i*1.8,finishTime:null})),obstacles:Array.from({length:9},(_,i)=>({id:i,distance:100+i*117,x:[-.6,.6,0,.6,-.6][i%5],hit:false})),pickups:Array.from({length:7},(_,i)=>({distance:155+i*147,x:[.55,-.55,0][i%3],taken:false}))}
 else common.world={player:{x:.5,y:.83},health:100,shield:25,ammo:0,invulnerable:0,fireClock:0,spawnClock:0,shotCount:0,kills:0,waveTime:0,wave:0,enemies:[],bullets:[],enemyBullets:[],particles:[],boss:null,serial:0}
 return common
}
function snapshot(q,selected){return {id:q.id,question_text:q.question_text,question_image_url:q.question_image_url||'',options:['a','b','c','d'].map(k=>q['option_'+k]||''),option_images:['a','b','c','d'].map(k=>q['option_'+k+'_image_url']||''),selected,correct_answer:q.correct_answer,correct:selected===q.correct_answer,topic:q.topic||'',explanation:q.explanation||''}}
export function answerArcade(game,selected){
 if(game.finished||game.phase!=='question'||!/^[ABCD]$/.test(selected))return null
 const entry=snapshot(game.questions[game.round],selected);game.answers.push(entry);const w=game.world
 if(game.kind==='kart'){w.fuel=clamp(w.fuel+(entry.correct?65:25),0,100);w.nitro=clamp(w.nitro+(entry.correct?35:0),0,100);if(entry.correct)w.health=clamp(w.health+12,0,100)}
 else{w.wave=game.round+1;w.waveTime=0;w.bullets=[];w.enemyBullets=[];w.fireClock=0;w.ammo=entry.correct?30:10;w.shield=clamp(w.shield+(entry.correct?30:8),0,75);w.player={x:.5,y:.83};w.invulnerable=1.2;const n=2+game.level+Math.floor(game.round/2);w.enemies=game.round===4?[]:Array.from({length:n},(_,i)=>({id:++w.serial,x:.13+(i%5)*.18,y:.14+Math.floor(i/5)*.10,origin:.13+(i%5)*.18,health:game.level>=4?2:1,fire:1.4+i*.48,age:0}));w.boss=game.round===4?{x:.5,y:.18,health:12+game.level*4,maxHealth:12+game.level*4,fire:1.2,age:0}:null}
 game.phase='playing';game.events=['power'];return entry
}
export function kartBend(distance,level=1,course='coast'){return (Math.sin(distance/105)+Math.sin(distance/241)*.55)*(.22+level*.028)*(course==='forest'?1.2:1)}
export function kartPosition(w){return 1+w.bots.filter(b=>w.finishTime!==null?b.finishTime!==null&&b.finishTime<w.finishTime:b.distance>w.distance).length}
function finishSegment(g,outcome){g.phase='feedback';g.answers.at(-1).outcome=outcome;g.answers.at(-1).health=Math.round(g.world.health);g.events.push(outcome)}
export function useKartNitro(g){const w=g.world;if(g.kind!=='kart'||g.phase!=='playing'||g.finished||w.nitro<25||w.boost>0)return false;w.nitro-=25;w.boost=2.5;g.events.push('boost');return true}
function tickKart(g,dt,input){
 const w=g.world;w.boost=Math.max(0,w.boost-dt);w.hitCooldown=Math.max(0,w.hitCooldown-dt)
 const steer=clamp(Number(input.x)||0,-1,1),bend=kartBend(w.distance,g.level,w.course)
 w.x=clamp(w.x+steer*dt*1.05-bend*dt*w.speed/90,-1.45,1.45)
 const offRoad=Math.abs(w.x)>1,topSpeed=offRoad?15:w.fuel<=0?13:input.brake?17:42+(w.boost>0?23:0),blend=1-Math.exp(-dt*2)
 w.speed+=(topSpeed-w.speed)*blend;w.fuel=clamp(w.fuel-dt*(w.boost>0?2.5:1.25),0,100);if(offRoad)w.health=Math.max(0,w.health-dt*3)
 const previous=w.distance;w.distance=Math.min((g.round+1)*240,w.distance+w.speed*dt)
 for(const bot of w.bots){if(bot.finishTime!==null)continue;const before=bot.distance;bot.distance=Math.min(1200,bot.distance+bot.speed*dt);bot.x=clamp(bot.x+Math.sin(g.elapsed*.6+bot.speed)*dt*.06,-.75,.75);if(bot.distance>=1200)bot.finishTime=g.elapsed-dt+(1200-before)/bot.speed}
 const hit=(damage)=>{if(w.hitCooldown>0)return;w.health=Math.max(0,w.health-damage);w.speed*=.35;w.hitCooldown=1.5;w.collisions++;g.events.push('hit')}
 for(const o of w.obstacles)if(!o.hit&&o.distance>=previous-3&&o.distance<=w.distance+3&&Math.abs(w.x-o.x)<.23){o.hit=true;hit(18)}
 for(const bot of w.bots)if(Math.abs(bot.distance-w.distance)<5&&Math.abs(w.x-bot.x)<.22)hit(7)
 for(const p of w.pickups)if(!p.taken&&Math.abs(p.distance-w.distance)<4&&Math.abs(w.x-p.x)<.25){p.taken=true;w.nitro=clamp(w.nitro+25,0,100);w.pads++;g.events.push('pickup')}
 if(w.health<=0||g.elapsed>=100){g.failed=true;finishSegment(g,w.health<=0?'Kart damaged':'Time up');return}
 if(w.distance>=(g.round+1)*240){if(g.round===4)w.finishTime=g.elapsed;finishSegment(g,g.round===4?'Chequered flag':'Pit stop reached')}
}
function particles(w,x,y,color,count=12){for(let i=0;i<count;i++){const angle=i*Math.PI*2/count;w.particles.push({x,y,vx:Math.cos(angle)*.12,vy:Math.sin(angle)*.12,life:.7,color})}}
function hurt(g,amount){const w=g.world;if(w.invulnerable>0)return;const absorbed=Math.min(w.shield,amount);w.shield-=absorbed;w.health=Math.max(0,w.health-amount+absorbed);w.invulnerable=.65;g.events.push('hit');particles(w,w.player.x,w.player.y,'#65d8ff',8)}
function enemyShot(w,enemy,speed,spread=0){const dx=w.player.x-enemy.x,dy=w.player.y-enemy.y,base=Math.atan2(dy,dx);for(let i=spread?-1:0;i<=(spread?1:0);i++){const angle=base+i*spread;w.enemyBullets.push({x:enemy.x,y:enemy.y+.03,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed})}}
export function fireSpace(g){const w=g.world;if(g.kind!=='space'||g.finished||g.phase!=='playing'||w.fireClock>0)return false;const powered=w.ammo>0;w.bullets.push({x:w.player.x,y:w.player.y-.04,vx:0,vy:-.85,damage:powered?2:1});if(powered)w.ammo--;w.fireClock=powered?.16:.42;w.shotCount++;g.events.push('fire');return true}
function tickSpace(g,dt,input){
 const w=g.world;w.waveTime+=dt;w.invulnerable=Math.max(0,w.invulnerable-dt);w.fireClock=Math.max(0,w.fireClock-dt)
 const x=Number(input.x)||0,y=Number(input.y)||0,n=Math.max(1,Math.hypot(x,y));w.player.x=clamp(w.player.x+x/n*dt*.48,.045,.955);w.player.y=clamp(w.player.y+y/n*dt*.48,.30,.94)
 if(input.fire)fireSpace(g)
 for(const e of w.enemies){e.age+=dt;e.x=clamp(e.origin+Math.sin(e.age*1.4+e.id)*.075,.06,.94);e.y+=dt*(.008+g.level*.002);e.fire-=dt;if(e.fire<=0){enemyShot(w,e,.19+g.level*.022);e.fire=2.7-g.level*.17}if(e.y>.88){e.health=0;hurt(g,18)}if(distance(e,w.player)<.055){e.health=0;hurt(g,22)}}
 if(w.boss){const b=w.boss;b.age+=dt;b.x=.5+Math.sin(b.age*.8)*.32;b.fire-=dt;if(b.fire<=0){enemyShot(w,b,.23+g.level*.02,.2+g.level*.018);b.fire=1.8-g.level*.1}}
 for(const b of w.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;const target=w.enemies.find(e=>e.health>0&&distance(e,b)<.044)||(w.boss&&w.boss.health>0&&Math.abs(w.boss.x-b.x)<.105&&Math.abs(w.boss.y-b.y)<.05?w.boss:null);if(target){target.health-=b.damage;b.y=-2;particles(w,target.x,target.y,'#ffbd65',5);g.events.push('impact');if(target.health<=0){w.kills++;particles(w,target.x,target.y,'#ff8c5c',18);g.events.push('destroy')}}}
 w.enemies=w.enemies.filter(e=>e.health>0)
 for(const b of w.enemyBullets){b.x+=b.vx*dt;b.y+=b.vy*dt;if(distance(b,w.player)<.029){b.y=2;hurt(g,16)}}
 w.bullets=w.bullets.filter(b=>b.y>-.1&&b.y<1.1);w.enemyBullets=w.enemyBullets.filter(b=>b.x>-.1&&b.x<1.1&&b.y>-.1&&b.y<1.1)
 for(const p of w.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt}w.particles=w.particles.filter(p=>p.life>0)
 if(w.health<=0||w.waveTime>=50){g.failed=true;finishSegment(g,w.health<=0?'Ship lost':'Wave time expired');return}
 if(!w.enemies.length&&(!w.boss||w.boss.health<=0))finishSegment(g,g.round===4?'Boss defeated':'Wave cleared')
}
export function tickArcade(g,seconds,input={}){if(g.finished||g.phase!=='playing')return false;const dt=clamp(Number(seconds)||0,0,.025);g.events=[];g.elapsed+=dt;g.kind==='kart'?tickKart(g,dt,input):tickSpace(g,dt,input);return g.phase==='feedback'}
export function advanceArcade(g){if(g.finished||g.phase!=='feedback')return false;if(g.failed||g.round===4){g.finished=true;g.phase='finished';g.passed=!g.failed&&g.answers.filter(a=>a.correct).length>=3&&(g.kind==='space'||kartPosition(g.world)<=3);return true}g.round++;g.phase='question';return true}
export function summariseArcade(g){const correct=g.answers.filter(a=>a.correct).length;return {kind:g.kind,level:g.level,correct,answered:g.answers.length,total:5,seconds:Math.round(g.elapsed),passed:g.passed,outcome:g.passed?'Level complete':'Try again',answers:g.answers.map(a=>({...a})),...(g.kind==='kart'?{position:kartPosition(g.world),distance:Math.round(g.world.distance),health:Math.round(g.world.health),collisions:g.world.collisions,course:g.world.course}:{kills:g.world.kills,health:Math.round(g.world.health),wavesCleared:g.failed?g.round:g.round+1,bossDefeated:!g.failed&&g.round===4})}}
