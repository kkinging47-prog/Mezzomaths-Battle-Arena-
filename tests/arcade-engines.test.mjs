import assert from 'node:assert/strict'
import {createArcadeGame,answerArcade,tickArcade,advanceArcade,summariseArcade,useKartNitro,kartBend} from '../src/arcade-engines.js'
import {footballDemoQuestions} from '../src/maths-football-engine.js'
const questions=footballDemoQuestions()
assert.throws(()=>createArcadeGame('space',[...questions.slice(0,4),questions[0]]))
for(const kind of ['kart','space']){
 let g=createArcadeGame(kind,questions),before=JSON.stringify(g);tickArcade(g,.025,{fire:true,x:1});assert.equal(JSON.stringify(g),before,'questions freeze every entity and clock')
 const a=answerArcade(g,g.questions[0].correct_answer);assert(a.correct);assert.equal(answerArcade(g,'A'),null,'only one answer per checkpoint');if(kind==='space'){assert.equal(g.world.ammo,30);assert.equal(g.world.shield,55)}else{assert.equal(g.world.fuel,100);assert.equal(g.world.nitro,35);assert(useKartNitro(g));assert.equal(useKartNitro(g),false)}
}
let g=createArcadeGame('space',questions);answerArcade(g,'A');assert.equal(g.world.ammo,10);assert.equal(g.world.shield,33);g.world.ammo=0;for(let i=0;i<30;i++)tickArcade(g,.025,{fire:true});assert(g.world.shotCount>=1,'reserve laser prevents an empty-ammo deadlock')
g.world.health=1;g.world.shield=0;g.world.invulnerable=0;g.world.enemyBullets.push({...g.world.player,vx:0,vy:0});tickArcade(g,.025);assert(g.failed);assert.equal(g.phase,'feedback');advanceArcade(g);assert(g.finished);assert.equal(summariseArcade(g).answered,1);assert.equal(summariseArcade(g).total,5);assert.equal(g.passed,false)
// Finish complete races with real steering and collision avoidance, across all five levels.
for(let level=1;level<=5;level++){
 g=createArcadeGame('kart',questions,{level,course:level%2?'coast':'forest'})
 for(let round=0;round<5;round++){
  answerArcade(g,questions[round].correct_answer)
  for(let steps=0;steps<5000&&g.phase==='playing';steps++){
   const w=g.world,near=w.obstacles.find(o=>!o.hit&&o.distance-w.distance>0&&o.distance-w.distance<45);let target=near?(near.x<0?.65:-.65):.25
   const rival=w.bots.find(b=>Math.abs(b.distance-w.distance)<16&&Math.abs(b.x-target)<.25);if(rival)target=rival.x<0?.65:-.65
   const steer=Math.max(-1,Math.min(1,(target-w.x)*4+kartBend(w.distance,g.level,w.course)*w.speed/94))
   if(w.nitro>=25&&w.boost===0)useKartNitro(g);tickArcade(g,.025,{x:steer})
  }
  assert.equal(g.phase,'feedback');assert.equal(g.failed,false,`level ${level} racing route must finish`);const paused=JSON.stringify(g);tickArcade(g,10,{x:1});assert.equal(JSON.stringify(g),paused);advanceArcade(g)
 }
 assert(g.finished);assert(g.passed,`kart level ${level} should be winnable`);assert.equal(g.world.distance,1200);assert.equal(g.answers.length,5);assert.equal(g.world.finishTime!==null,true)
}
// Pilot using visible enemy positions and leading a moving boss; no direct health edits.
for(let level=1;level<=5;level++){
 g=createArcadeGame('space',questions,{level})
 for(let round=0;round<5;round++){
  answerArcade(g,questions[round].correct_answer)
  for(let steps=0;steps<2100&&g.phase==='playing';steps++){
   const w=g.world,target=w.boss||w.enemies.reduce((best,e)=>!best||Math.abs(e.x-w.player.x)<Math.abs(best.x-w.player.x)?e:best,null)
   const travel=(w.player.y-(target?.y||.2))/.85,aim=w.boss?.5+Math.sin((w.boss.age+travel)*.8)*.32:target?target.origin+Math.sin((target.age+travel)*1.4+target.id)*.075:.5
   tickArcade(g,.025,{x:Math.max(-1,Math.min(1,(aim-w.player.x)*12)),fire:true})
  }
  assert.equal(g.phase,'feedback');assert.equal(g.failed,false,`space level ${level}, wave ${round+1} should be winnable`);advanceArcade(g)
 }
 assert(g.passed,`space level ${level} must allow a victory`);assert.equal(summariseArcade(g).bossDefeated,true);const terminal=JSON.stringify(g);tickArcade(g,100,{fire:true});assert.equal(JSON.stringify(g),terminal)
}
console.log('PASS unique question gates, pause at checkpoints, maths power-ups, nitro rules, reserve laser, early failure, complete steering/shooting wins through all five levels and terminal-state immutability.')
