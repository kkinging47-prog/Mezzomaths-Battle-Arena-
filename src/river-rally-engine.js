export const RIVER_LEVELS = ['Meadow Reach','Palm Bend','Sunset Rapids','Moonlight Run','Gold Coast Final']
export const REFERENCE_GATES = [495,950,1600,1950,2495,3000]
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
export function makeRiverQuestions(level=1,difficulty='core',rng=Math.random){
 const count=6+2*(level-1),scale=difficulty==='foundation'?1:difficulty==='challenge'?10:3
 const int=(a,b)=>a+Math.floor(rng()*(b-a+1)),seen=new Set(),questions=[]
 for(let i=0;i<count;i++){
  let q;do{const a=int(25,90)*scale,b=int(12,49)*scale,c=int(10,35)*scale,total=3000,travel=int(10,250)*scale,type=i%6
   if(type===0)q={text:`The course is ${total} m long. Your boat has travelled ${travel} m. How far remains?`,answer:total-travel,unit:'m',topic:'Distance remaining',explanation:`Subtract the distance travelled: ${total} − ${travel} = ${total-travel} m.`}
   if(type===1)q={text:`Two river markers are ${a} m and ${a+b} m from the start. What is the distance between them?`,answer:b,unit:'m',topic:'Difference',explanation:`The distance between markers is ${a+b} − ${a} = ${b} m.`}
   if(type===2){const masses=[int(55,95),int(55,95),int(55,95),int(55,95)];q={text:`Your four rowers have masses of ${masses.join(', ')} kg. What is their total mass?`,answer:masses.reduce((s,x)=>s+x,0),unit:'kg',topic:'Adding several numbers',explanation:`Add all four masses: ${masses.join(' + ')} = ${masses.reduce((s,x)=>s+x,0)} kg.`}}
   if(type===3){const n=int(15,295)*10+int(1,4),round=difficulty==='foundation'?10:100;q={text:`A marker is ${n} m from the start. Round this distance to the nearest ${round} m.`,answer:Math.round(n/round)*round,unit:'m',topic:'Estimation',explanation:`The nearest multiples are ${Math.floor(n/round)*round} and ${Math.ceil(n/round)*round}. ${n} is closer to ${Math.round(n/round)*round} m.`}}
   if(type===4)q={text:`You row ${a} m, then ${b} m, then ${c} m. How far have you travelled altogether?`,answer:a+b+c,unit:'m',topic:'Addition',explanation:`Combine all three stretches: ${a} + ${b} + ${c} = ${a+b+c} m.`}
   if(type===5)q={text:`You need to row ${a+b+c} m. After rowing ${a} m and then ${b} m, how many metres are left?`,answer:c,unit:'m',topic:'Two-step reasoning',explanation:`First add ${a} + ${b} = ${a+b}. Then subtract: ${a+b+c} − ${a+b} = ${c} m.`}
  }while(seen.has(q.text));seen.add(q.text)
  const options=new Set([q.answer]);while(options.size<4){const value=q.answer+int(-12,12)*(difficulty==='foundation'?1:10);if(value>=0)options.add(value)}
  q.options=[...options];for(let j=3;j>0;j--){const k=int(0,j);[q.options[j],q.options[k]]=[q.options[k],q.options[j]]}questions.push(q)
 }
 return questions
}
export function createRiverRace(level=1,difficulty='core',rng=Math.random){level=clamp(Math.trunc(level)||1,1,5);return {level,difficulty,questions:makeRiverQuestions(level,difficulty,rng),round:0,phase:'question',distance:0,rivals:[0,0,0],lane:0,power:60,boost:0,slow:0,strokeCooldown:0,elapsed:0,segmentTime:0,answers:[],coins:0,hits:0,objects:[],message:'',rng}}
export function answerRiver(g,value,seconds=0){if(g.phase!=='question')return false;const q=g.questions[g.round];if(!q.options.includes(value))return false;const correct=value===q.answer;g.answers.push({selected:value,correct,seconds:Math.max(0,seconds)});g.power=clamp(g.power+(correct?30:8),35,100);g.boost=correct?Math.max(1,4-Math.min(seconds,30)/10):0;g.phase='feedback';return true}
export function launchRiver(g){if(g.phase!=='feedback')return false;g.phase='rowing';g.strokeCooldown=0;g.segmentTime=0;g.objects=[{at:g.distance+70,lane:-.65,kind:'energy',used:false},{at:g.distance+150,lane:.55,kind:'log',used:false},{at:g.distance+250,lane:0,kind:'energy',used:false}];return true}
export function riverStroke(g){if(g.phase!=='rowing'||g.strokeCooldown>0)return false;g.power=clamp(g.power+8,0,100);g.strokeCooldown=.65;return true}
export function riverTarget(g){return g.level===1?REFERENCE_GATES[g.round]:3000*(g.round+1)/g.questions.length}
export function tickRiver(g,dt,input=0){if(g.phase!=='rowing'||!Number.isFinite(dt)||dt<=0)return false;dt=Math.min(dt,.1);g.elapsed+=dt;g.segmentTime+=dt;g.strokeCooldown=Math.max(0,g.strokeCooldown-dt);g.boost=Math.max(0,g.boost-dt);g.slow=Math.max(0,g.slow-dt);g.lane=clamp(g.lane+clamp(input,-1,1)*dt*1.5,-.85,.85);g.power=clamp(g.power-dt*3,35,100)
 const speed=(40+g.power*.45+(g.boost>0?25:0))*(g.slow>0?.55:1),previous=g.distance;g.distance=Math.min(riverTarget(g),g.distance+speed*dt)
 g.rivals=g.rivals.map((d,i)=>Math.min(3000,d+(52+g.level*2+i*3)*dt))
 for(const o of g.objects){if(!o.used&&previous<=o.at&&g.distance>=o.at){o.used=true;if(Math.abs(g.lane-o.lane)<.32){if(o.kind==='energy'){g.coins++;g.power=clamp(g.power+15,0,100);g.message='Energy buoy collected!'}else{g.hits++;g.slow=1.2;g.power=Math.max(35,g.power-12);g.message='Log! Steer clear next time.'}}}}
 if(g.distance>=riverTarget(g)){g.round++;g.phase=g.round===g.questions.length?'finished':'question';return true}return false
}
export function riverSummary(g){const correct=g.answers.filter(a=>a.correct).length,total=g.questions.length,complete=g.phase==='finished'&&g.answers.length===total;return {complete,correct,total,percent:Math.round(100*correct/total),position:1+g.rivals.filter(d=>d>=g.distance).length,passed:complete&&correct/total>=.7,coins:g.coins,hits:g.hits,seconds:Math.round(g.elapsed),level:g.level}}
