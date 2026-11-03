import {selectVariedQuestions} from './question-selection.js'

const prompt=q=>String(q?.question_text||'').trim()
const level=q=>{const n=Number(q?.difficulty);return Number.isInteger(n)&&n>=1&&n<=20?n:null}
const topic=q=>String(q?.topic||'').trim()

export function createAdaptivePractice(pool){
 const unique=[...new Map(pool.filter(q=>prompt(q)).map(q=>[prompt(q),q])).values()]
 const levels=[...new Set(unique.map(level).filter(n=>n!==null))].sort((a,b)=>a-b)
 return {pool:unique,levels,target:Math.max(0,Math.floor((levels.length-1)/2)),streak:0,used:new Set(),answered:new Set(),focusTopic:'',message:'Two correct answers raise the challenge; a wrong answer brings extra support.'}
}

export function nextAdaptiveQuestion(state,random=Math.random){
 const remaining=state.pool.filter(q=>!state.used.has(prompt(q)))
 if(!remaining.length)return null
 const target=state.levels[state.target]
 const distance=q=>{const n=level(q);return n===null?Infinity:Math.abs(state.levels.indexOf(n)-state.target)}
 const nearest=Math.min(...remaining.map(distance))
 let choices=target===undefined?remaining:remaining.filter(q=>distance(q)===nearest)
 // Stay on the nearest authored level; within that level revisit a missed topic.
 const focused=state.focusTopic?choices.filter(q=>topic(q)===state.focusTopic):[]
 if(focused.length)choices=focused
 const selected=selectVariedQuestions(choices,1,random)[0]
 state.used.add(prompt(selected))
 return selected
}

export function recordAdaptiveAnswer(state,question,correct){
 const key=prompt(question);if(state.answered.has(key))return;state.answered.add(key)
 const top=Math.max(0,state.levels.length-1)
 if(correct){
  state.streak++
  if(state.streak>=2){const previous=state.target;state.target=Math.min(top,state.target+1);state.streak=0;state.focusTopic='';state.message=state.target>previous?'Two correct answers. Try the next available challenge.':'Two correct answers. Keep practising at the highest available level.'}
  else state.message=state.target<top?'Correct. One more correct answer raises the challenge.':'Correct. Keep practising at this available level.'
 }else{
  const previous=state.target;state.target=Math.max(0,state.target-1);state.streak=0;state.focusTopic=topic(question)
  state.message=state.target<previous?'Let’s consolidate. An easier question on this topic comes next when available.':'Let’s consolidate with another question on this topic when available.'
 }
}

export function placeAdaptiveQuestion(questions,index,question){
 if(!question||index<0||index>=questions.length)return
 const existing=questions.findIndex(q=>prompt(q)===prompt(question))
 if(existing>=0&&existing<index)throw Error('Adaptive practice cannot repeat an answered question.')
 const displaced=questions[index];questions[index]=question
 if(existing>index)questions[existing]=displaced
}

export function adaptiveQuestionLabel(state,question){
 const actual=level(question),rank=state.levels.indexOf(actual)
 if(state.levels.length<2)return 'One difficulty level available · varied practice'
 if(rank<0)return 'Difficulty not provided · varied practice'
 return `Challenge ${rank+1} of ${state.levels.length}${rank!==state.target?' · nearest available level':''}`
}
