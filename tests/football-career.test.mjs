import assert from 'node:assert/strict'
import {createAttack,tickAttack,shootAttack,FOOTBALL_LEVELS,careerOutcome,careerUnlocked} from '../src/football-career.js'
import {createFootballMatch,answerFootball,tickFootball,advanceFootball,shootFootball,footballDemoQuestions,summariseFootball} from '../src/maths-football-engine.js'
const run=(f,seconds,input={})=>{for(let t=0;t<seconds&&!f.result;t+=.0125)tickAttack(f,.0125,input)}
let f=createAttack(1);run(f,1,{x:1,y:0});assert(f.player.x>590);assert(f.possession);assert(Math.abs(f.ball.x-f.player.x)<18)
run(f,10,{x:1,y:1});assert(f.player.x<=851&&f.player.y<=455)
assert.equal(shootAttack(f,{x:NaN,y:0}),false)
f=createAttack(1);f.player={x:390,y:130,vx:0,vy:0,angle:-Math.PI/2};run(f,.025);assert(shootAttack(f,{x:365,y:53}));assert.equal(shootAttack(f),false);run(f,2);assert.equal(f.result,'goal');const snapshot=JSON.stringify(f);run(f,10);assert.equal(JSON.stringify(f),snapshot)
f=createAttack(1);f.player={x:450,y:130,vx:0,vy:0,angle:-Math.PI/2};run(f,.025);shootAttack(f,{x:450,y:53});run(f,2);assert.equal(f.result,'saved')
f=createAttack(2);f.defenders[0]={x:f.ball.x,y:f.ball.y,vx:0,vy:0};run(f,.025);assert.equal(f.result,'tackled')
f=createAttack(2);f.defenders[0]={x:f.ball.x,y:f.ball.y-8,vx:0,vy:0};shootAttack(f);run(f,.025);assert.equal(f.result,'blocked')
f=createAttack(1);shootAttack(f,{x:100,y:53});run(f,3);assert.equal(f.result,'wide')
f=createAttack(1);run(f,31);assert.equal(f.result,'time')
for(const l of FOOTBALL_LEVELS){f=createAttack(l.id);assert.equal(f.defenders.length,l.defenders);assert.equal(f.time,l.seconds)}
const normal=createAttack(1),boosted=createAttack(1,true);run(normal,1,{y:-1});run(boosted,1,{y:-1});assert(boosted.player.y<normal.player.y)
// A complete match exercises real attack transitions, including wrong answers and saved shots.
const match=createFootballMatch(footballDemoQuestions(),{level:1});assert.equal(match.field,null)
for(let i=0;i<5;i++){
 const correct=i!==2,q=match.questions[i];answerFootball(match,correct?q.correct_answer:'A')
 if(correct){assert(match.field);if(i===1)assert(match.field.boost);if(i===3)assert.equal(match.field.boost,false);match.field.player={x:i===4?450:390,y:130,vx:0,vy:0,angle:-Math.PI/2};tickFootball(match,.025);shootFootball(match,i===4?'centre':'left')}
 for(let j=0;j<200&&match.phase!=='feedback';j++)tickFootball(match,.025)
 assert.equal(match.phase,'feedback');advanceFootball(match)
}
const result=summariseFootball(match);assert.equal(result.correct,4);assert.equal(result.goals,3);assert(result.passed);assert.equal(result.requiredGoals,1);assert.equal(result.requiredCorrect,3);assert.equal(shootFootball(match,'left'),false)
const fake={level:5,finished:true,questions:Array(15),goals:6,answers:Array.from({length:15},(_,i)=>({correct:i%5<3,goal:i%5<2}))};assert(careerOutcome(fake).passed);assert.equal(careerOutcome(fake).requiredGoals,6)
fake.answers[10].goal=false;fake.answers[2].goal=true;assert.equal(careerOutcome(fake).passed,false,'one failed round cannot borrow goals from another')
assert.equal(careerOutcome({...fake,finished:false}).passed,false)
assert.equal(careerUnlocked([{metadata:{unlockedLevel:4}},{metadata:{unlockedLevel:2}}]),4)
// A route through the live physics must be playable at each level, not merely present in the menu.
for(let level=1;level<=5;level++){
 let scored=false
 for(const route of [{side:1,sideTime:1.1,upTime:1.7},{side:-1,sideTime:1.2,upTime:1.8},{side:1,sideTime:.8,upTime:1.8}]){
  f=createAttack(level);run(f,route.sideTime,{x:route.side});run(f,route.upTime,{y:-1});if(!f.result)shootAttack(f,{x:route.side>0?535:365,y:53});run(f,3);if(f.result==='goal'){scored=true;break}
 }
 assert(scored,`Level ${level} must allow a dribble-and-shot route`)
}
console.log('PASS football movement, bounds, boost, tackles, blocks, keeper saves, goals, misses, timeout, complete match, Cup round qualification and playable routes through all five levels.')
