import {createAttack,tickAttack,shootAttack,careerOutcome} from './football-career.js'
export const FOOTBALL_ZONES=['left','centre','right']
const paces={training:{keeperSeconds:1.8,opponentRate:.35},club:{keeperSeconds:1.15,opponentRate:.55},challenge:{keeperSeconds:.75,opponentRate:.7}}
export function createFootballMatch(questions,{pace='club',level=null}={},random=Math.random){
 if(!Array.isArray(questions)||!(level?[5,10,15]:[5,10]).includes(questions.length))throw Error('Choose five or ten football questions.')
 if(questions.some(q=>!q?.id||typeof q.question_text!=='string'||!q.question_text.trim()||!/^[ABCD]$/.test(q.correct_answer)||['a','b','c','d'].some(k=>!q['option_'+k]&&!q['option_'+k+'_image_url'])))throw Error('A football question has missing answers.')
 if(new Set(questions.map(q=>q.id)).size!==questions.length||new Set(questions.map(q=>q.question_text.trim())).size!==questions.length)throw Error('Football questions must be unique.')
 pace=Object.hasOwn(paces,pace)?pace:'club'

 return {level:level?Math.min(5,Math.max(1,Number(level)||1)):null,field:null,questions:[...questions],round:0,phase:'question',elapsed:0,phaseElapsed:0,keeperClock:0,keeperZone:1,shotZone:null,shotSaved:false,goals:0,opponentGoals:0,answers:[],pace:paces[pace]?pace:'club',opponentPlan:questions.map(()=>random()<(paces[pace]||paces.club).opponentRate),finished:false}
}
export function answerFootball(match,selected){
 if(match.finished||match.phase!=='question'||!/^[ABCD]$/.test(selected))return null
 const q=match.questions[match.round],correct=selected===q.correct_answer
 const record={id:q.id,position:match.round+1,question_text:q.question_text,topic:q.topic||'',question_image_url:q.question_image_url||'',options:['a','b','c','d'].map(k=>q['option_'+k]||''),option_images:['a','b','c','d'].map(k=>q['option_'+k+'_image_url']||''),selected,correct_answer:q.correct_answer,correct,explanation:q.explanation||'',goal:false,saved:false,opponent_goal:false}
 match.answers.push(record);if(match.level&&correct)match.field=createAttack(match.level,match.answers.slice(-2).length===2&&match.answers.slice(-2).every(a=>a.correct));match.phase=correct?'aim':'flight';match.phaseElapsed=0;match.shotZone=null;match.shotSaved=false
 return record
}
export function shootFootball(match,zone){
 if(match.level){if(match.finished||match.phase!=='aim'||(typeof zone!=='object'&&!FOOTBALL_ZONES.includes(zone)))return false;return shootAttack(match.field,typeof zone==='object'?zone:{x:zone==='left'?365:zone==='right'?535:450,y:53})}
 const index=FOOTBALL_ZONES.indexOf(zone)
 if(match.finished||match.phase!=='aim'||index<0)return false
 match.shotZone=index;match.shotSaved=index===match.keeperZone;match.phase='flight';match.phaseElapsed=0
 return true
}
export function tickFootball(match,dt,input={}){
 if(match.finished)return false
 dt=Math.max(0,Math.min(Number(dt)||0,.1));match.elapsed+=dt;match.phaseElapsed+=dt
 if(match.level&&match.phase==='aim'){let done=false;for(let t=dt;t>0;t-=.0125)done=tickAttack(match.field,Math.min(.0125,t),input)||done;if(done){const record=match.answers.at(-1);record.goal=match.field.result==='goal';record.saved=['saved','blocked'].includes(match.field.result);record.shotResult=match.field.result;if(record.goal)match.goals++;match.phase='feedback';match.phaseElapsed=0;return true}return false}
 if(match.phase==='question'||match.phase==='aim'){
  match.keeperClock+=dt;match.keeperZone=Math.floor(match.keeperClock/paces[match.pace].keeperSeconds)%3
 }
 if(match.phase==='flight'&&match.phaseElapsed>=1.2){
  const record=match.answers.at(-1);record.goal=record.correct&&!match.shotSaved;record.saved=record.correct&&match.shotSaved;record.opponent_goal=match.level?false:match.opponentPlan[match.round]
  if(record.goal)match.goals++;if(record.opponent_goal)match.opponentGoals++
  match.phase='feedback';match.phaseElapsed=0;return true
 }
 return false
}
export function advanceFootball(match){
 if(match.finished||match.phase!=='feedback')return false
 if(match.round+1===match.questions.length){match.finished=true;match.phase='finished';return true}
 match.field=null;match.round++;match.phase='question';match.phaseElapsed=0;match.shotZone=null;match.shotSaved=false;return true
}
export function summariseFootball(match){return {...(match.level?{level:match.level,...careerOutcome(match)}:{}),goals:match.goals,opponentGoals:match.opponentGoals,correct:match.answers.filter(a=>a.correct).length,answered:match.answers.length,total:match.questions.length,seconds:Math.round(match.elapsed),outcome:match.goals>match.opponentGoals?'Win':match.goals<match.opponentGoals?'Loss':'Draw',answers:match.answers.map(a=>({...a}))}}

export function footballDemoQuestions(){return [
 ['What is 6 × 4?',['18','24','30','36'],'B','Six groups of four make 24.'],
 ['What is 35 ÷ 5?',['5','6','7','8'],'C','Five times seven equals 35.'],
 ['What is 28 + 17?',['35','41','45','55'],'C','28 + 10 + 7 = 45.'],
 ['What is one half of 18?',['6','8','9','12'],'C','18 divided into two equal groups gives 9 in each.'],
 ['What is 60 − 24?',['34','36','44','46'],'B','60 − 20 − 4 = 36.']
 ].map(([question_text,options,correct_answer,explanation],i)=>({id:'football-demo-'+i,question_text,option_a:options[0],option_b:options[1],option_c:options[2],option_d:options[3],correct_answer,explanation,topic:'Sample arithmetic',difficulty:1}))}
