export const FINISH_DISTANCE=1200
export function createRace(difficulty='club') {
 const speeds={rookie:[8,9,10],club:[12,14,16],expert:[17,19,21]}[difficulty]||[12,14,16]
 return {elapsed:0,distance:0,speed:2,boost:0,turbo:0,turboSeconds:0,streak:0,bestStreak:0,correct:0,answers:[],finished:false,finishTime:null,bots:speeds.map((speed,i)=>({name:['Kofi','Ama','Kojo'][i],speed,distance:0,finishTime:null}))}
}
export function answerRace(race,question,selected,seconds) {
 if(race.finished||race.answers.some(a=>a.id===question.id))return null
 const correct=selected===question.correct_answer
 const entry={id:question.id,question_text:question.question_text,question_image_url:question.question_image_url,options:['a','b','c','d'].map(k=>question['option_'+k]),option_images:['a','b','c','d'].map(k=>question['option_'+k+'_image_url']),selected,correct_answer:question.correct_answer,correct,seconds:Math.max(0,seconds),topic:question.topic,explanation:question.explanation||''}
 race.answers.push(entry)
 if(correct){race.correct++;race.streak++;race.bestStreak=Math.max(race.bestStreak,race.streak);race.boost=Math.min(60,race.boost+22+Math.max(0,12-seconds));race.turbo=Math.min(100,race.turbo+25)}else{race.streak=0;race.boost=Math.max(0,race.boost-8)}
 return entry
}
export function useTurbo(race){if(race.finished||race.turbo<100||race.turboSeconds>0)return false;race.turbo=0;race.turboSeconds=4;return true}
export function tickRace(race,dt,allAnswered=false){
 if(race.finished)return
 dt=Math.max(0,Math.min(dt,.1));const before=race.elapsed;race.elapsed+=dt
 const accuracy=race.answers.length?race.correct/race.answers.length:0
 const cruise=allAnswered?12+42*accuracy:2
 race.speed=cruise+race.boost+(race.turboSeconds>0?40:0)
 const old= race.distance;race.distance=Math.min(FINISH_DISTANCE,old+race.speed*dt)
 race.boost=Math.max(0,race.boost-dt*3);race.turboSeconds=Math.max(0,race.turboSeconds-dt)
 for(const bot of race.bots){if(bot.finishTime!==null)continue;const d=bot.distance;bot.distance=Math.min(FINISH_DISTANCE,d+bot.speed*dt);if(bot.distance>=FINISH_DISTANCE)bot.finishTime=before+(FINISH_DISTANCE-d)/bot.speed}
 if(race.distance>=FINISH_DISTANCE){race.finishTime=before+(FINISH_DISTANCE-old)/race.speed;race.finished=true}
 if(race.elapsed>=180)race.finished=true
}
export function racePosition(race){return 1+race.bots.filter(bot=>race.finishTime!==null?bot.finishTime!==null&&bot.finishTime<race.finishTime:bot.distance>race.distance).length}
export function summariseRace(race,questions){const gaps=race.answers.filter(a=>!a.correct),unanswered=questions.filter(q=>!race.answers.some(a=>a.id===q.id));return {position:racePosition(race),finished:race.finishTime!==null,correct:race.correct,answered:race.answers.length,total:questions.length,accuracy:race.answers.length?Math.round(100*race.correct/race.answers.length):0,bestStreak:race.bestStreak,seconds:race.elapsed,gaps,unanswered}}
