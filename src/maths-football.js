import {supabase} from './supabaseClient.js'
import {loadGameBank,gameBankTopics,uniqueGameQuestions} from './game-question-bank.js'
import {selectVariedQuestions} from './question-selection.js'
import {createAdaptivePractice,nextAdaptiveQuestion,recordAdaptiveAnswer,placeAdaptiveQuestion,adaptiveQuestionLabel} from './rally-adaptive-practice.js'
import {createFootballMatch,answerFootball,shootFootball,tickFootball,advanceFootball,summariseFootball,footballDemoQuestions,FOOTBALL_ZONES} from './maths-football-engine.js'
import {drawFootballField as drawFootballPitch} from './football-field-renderer.js'
import {FOOTBALL_LEVELS,careerLevel,careerUnlocked,careerOutcome} from './football-career.js'
import {createFootballResultsStore} from './football-results-store.js'
import {renderVectorText} from './vector-math.js'
import './maths-football.css'

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const LEVELS=Array.from({length:9},(_,i)=>`Grade ${i+1}`).concat(['SHS 1','SHS 2','SHS 3'])
const KITS={gold:'#edc45f',blue:'#76b8ed',red:'#e36c77'}
const options=(values,selected)=>values.map(v=>`<option ${v===selected?'selected':''}>${esc(v)}</option>`).join('')
const image=(url,alt)=>/^https:\/\//i.test(String(url||''))?`<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy">`:''
let overlay=null,match=null,config=null,adaptive=null,recordId=null,matchOwner=null,demo=false,paused=false,frameId=0,lastFrame=0,loading=0,lastFocus=null,oldOverflow='',savedConfig=null
const heldKeys=new Set(),touchDirections=new Map();let aimX=535,soundOn=false,audio=null
const movement=()=>({x:Number(heldKeys.has('ArrowRight')||heldKeys.has('d'))-Number(heldKeys.has('ArrowLeft')||heldKeys.has('a'))+[...touchDirections.values()].reduce((n,v)=>n+v.x,0),y:Number(heldKeys.has('ArrowDown')||heldKeys.has('s'))-Number(heldKeys.has('ArrowUp')||heldKeys.has('w'))+[...touchDirections.values()].reduce((n,v)=>n+v.y,0)})
function clearMovement(){heldKeys.clear();touchDirections.clear()}
function playSound(kind){if(!soundOn)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();void audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);const now=audio.currentTime;o.type=kind==='goal'?'triangle':'sine';o.frequency.setValueAtTime(kind==='goal'?523:kind==='kick'?140:240,now);o.frequency.exponentialRampToValueAtTime(kind==='goal'?880:80,now+.2);g.gain.setValueAtTime(.09,now);g.gain.exponentialRampToValueAtTime(.001,now+.4);o.start(now);o.stop(now+.4)}catch{}}
const results=createFootballResultsStore({client:supabase,storage:localStorage,onChange:updateSaveStatus})
function saveMessage(){
 if(demo)return 'Training demo · sample arithmetic · result not saved'
 if(!results.getOwner())return 'Sign in for class questions and account results.'
 if(results.cacheFailed())return 'Offline copy could not be stored. Keep this page open and retry saving.'
 return {loading:'Loading your football results…',saving:'Saving your football results…',saved:'Football results saved to your account.',offline:'Sync pending. Your results are kept on this device; retry when connected.'}[results.getStatus()]||'Account connected.'
}
function updateSaveStatus(){
 const slot=overlay?.querySelector('[data-mf-save]');if(slot)slot.textContent=saveMessage()
 const history=overlay?.querySelector('[data-mf-history]');if(history)history.innerHTML=historyHtml();refreshCareer()
}
function shell(body){overlay.scrollTop=0;overlay.innerHTML=`<div class="mf-shell"><header class="mf-header"><div><span>MEZZO MATHS</span><strong>FOOTBALL</strong></div><button type="button" data-mf-close>Back to Arena ✕</button></header><p class="mf-save" data-mf-save role="status">${esc(saveMessage())}</p>${body}</div>`}
function unlocked(){return Math.max(careerUnlocked(results.getRecords()),results.getUnlockedLevel())}
function refreshCareer(){const select=overlay?.querySelector('[name=level]');if(!select)return;const highest=unlocked();for(const option of select.options)option.disabled=Number(option.value)>highest;const info=overlay.querySelector('[data-mf-career]');if(info)info.innerHTML=FOOTBALL_LEVELS.map(l=>`<article class="mf-level ${l.id>highest?'mf-locked':''}"><b>${l.id>highest?'🔒':l.id<highest?'✓':'⚽'} ${l.name}</b><small>${l.defenders} defenders · ${l.seconds}s per attack</small><small>${l.id===5?'Three rounds: 2 goals + 3 correct in each':l.goals+' goals + 3 correct in 5 chances'}</small></article>`).join('')}
function historyHtml(){const records=results.getRecords();return `<h2>Your recent matches</h2>${records.length?records.map(r=>`<article class="mf-history-row"><b>${esc(r.metadata.outcome)} · ${esc(r.metadata.goals)} goals${r.metadata.level?' · Level '+esc(r.metadata.level):''}</b><span>${esc(r.class_level)} · ${esc(r.curriculum)} · ${esc(r.topic)}</span><small>${esc(r.score)}/${esc(r.total)} maths answers correct · ${esc(new Date(r.created_at).toLocaleDateString())}</small></article>`).join(''):'<p>Your completed class-question matches will appear here.</p>'}`}
async function openFootball(){
 if(overlay)return
 lastFocus=document.activeElement;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden'
 overlay=document.createElement('section');overlay.className='mf-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Mezzo Maths Football');document.body.append(overlay)
 const current=overlay;demo=false;shell('<p>Opening the stadium…</p>')
 try{const {data}=await supabase?.auth.getSession()||{};if(overlay!==current)return;results.setOwner(data?.session?.user?.id||null);void results.sync()}catch{}
 if(overlay!==current)return;setupFootball();overlay.querySelector('[data-mf-close]').focus()
}
function closeFootball(){clearMovement();loading++;cancelAnimationFrame(frameId);overlay?.remove();overlay=null;match=null;adaptive=null;paused=false;document.body.style.overflow=oldOverflow;lastFocus?.focus?.()}
function setupFootball(){
 loading++;cancelAnimationFrame(frameId);clearMovement();match=null;adaptive=null;paused=false;demo=false
 shell(`<section class="mf-hero"><div><span class="mf-kicker">MEZZO FOOTBALL CAREER</span><h1>Take the ball.<br>Make your run.</h1><p>Dribble past defenders, find your angle and beat a reacting goalkeeper. Earn attacking chances with maths, then take control on the pitch.</p><div class="mf-pills"><span>5 unlockable levels</span><span>Touch & keyboard</span><span>Class-level maths</span></div><canvas data-mf-preview aria-label="Top-down football pitch with a striker and goalkeeper"></canvas></div><form data-mf-setup class="mf-setup"><h2>Build your career</h2><div class="mf-fields"><label>Class<select name="class_level">${options(LEVELS,savedConfig?.class_level||'Grade 4')}</select></label><label>Curriculum<select name="curriculum">${options(['GES','Cambridge','Pearson Edexcel'],savedConfig?.curriculum||'GES')}</select></label><label>Topic<select name="topic"><option value="">All topics (including unassigned)</option></select></label><label>Football level<select name="level">${FOOTBALL_LEVELS.map(l=>`<option value="${l.id}">${l.id}. ${l.name}</option>`).join('')}</select></label><label>Match length<select name="count"><option value="5">5 attacking chances</option><option value="10">10 attacking chances</option></select></label><label>Question selection<select name="question_mode"><option value="balanced">Balanced mix</option><option value="adaptive">Adaptive practice</option></select></label><label>Team kit<select name="kit"><option value="gold">Mezzo Gold</option><option value="blue">Coastal Blue</option><option value="red">Sunset Red</option></select></label></div><p data-mf-level-rules class="mf-small"></p><p data-mf-bank-status role="status">Checking the question bank…</p><button class="mf-primary" type="submit" data-mf-start disabled>KICK OFF →</button><div class="mf-actions"><button type="button" data-mf-demo>Try training demo · 5 chances</button><button type="button" data-mf-signin>Sign in / Join</button><button type="button" data-mf-reload>Reload questions</button></div><p class="mf-small">Demo: sample arithmetic, no saved results or unlocks. Sign in to save your career. Football levels change defenders and time; maths stays within your selected class and curriculum.</p></form></section><section class="mf-career" data-mf-career aria-label="Football career levels"></section><section class="mf-how"><h2>Think. Dribble. Score.</h2><ol><li>Answer correctly to start an attack. Two correct answers in a row earn a speed and shot-power boost.</li><li>Move with arrow keys / WASD or hold the touch arrows. Avoid tackles and get closer to goal.</li><li>Adjust your aim, then press Space or Shoot. You can also tap the goal to aim, or use 1–3 for left, centre or right.</li></ol><p>The pitch and attack clock pause during questions. Meet both the goal target and 60% maths accuracy to unlock the next level. The Mezzo Cup has three five-chance rounds: qualify in all three to win the trophy. Escape pauses; switching tabs pauses automatically. Unfinished matches restart when you leave.</p></section><section class="mf-history" data-mf-history>${historyHtml()}</section>`)
 const form=overlay.querySelector('[data-mf-setup]');for(const name of ['count','question_mode','kit','level'])if(savedConfig?.[name])form.elements[name].value=savedConfig[name]
 refreshCareer();if(Number(form.elements.level.value)>unlocked())form.elements.level.value='1';updateLevelRules()
 drawFootballPitch(overlay.querySelector('[data-mf-preview]'),null,KITS[form.elements.kit.value]);void loadTopics()
}
function updateLevelRules(){const form=overlay?.querySelector('[data-mf-setup]');if(!form)return;const level=careerLevel(form.elements.level.value);form.elements.count.disabled=level.id===5;const count=level.id===5?15:Number(form.elements.count.value);form.querySelector('[data-mf-level-rules]').textContent=level.id===5?'Mezzo Cup: 15 unique questions in three rounds. Score 2 goals and answer 3 correctly in EACH round.':`Level ${level.id}: ${level.defenders} defenders · ${level.seconds}s per attack. Target: ${level.goals*count/5} goals and ${count*.6} correct answers.`}
async function loadTopics(){
 const version=++loading,form=overlay?.querySelector('[data-mf-setup]');if(!form)return
 const status=form.querySelector('[data-mf-bank-status]'),button=form.querySelector('[data-mf-start]');button.disabled=true;form.querySelector('[data-mf-demo]').disabled=false
 try{const rows=await loadGameBank(supabase);if(version!==loading||!form.isConnected)return
  const topics=gameBankTopics(rows,form.elements.class_level.value,form.elements.curriculum.value)
  form.elements.topic.innerHTML='<option value="">All topics (including unassigned)</option>'+topics.map(topic=>`<option value="${esc(topic)}">${esc(topic)}</option>`).join('')
  if(topics.includes(savedConfig?.topic))form.elements.topic.value=savedConfig.topic
  status.textContent='Choose your topic and match length. Questions are checked before kick-off.';button.disabled=false
 }catch(error){if(version===loading&&form.isConnected){status.textContent=error.message;form.querySelector('[data-mf-signin]').hidden=false}}
}
async function startFootball(training=false){
 const form=overlay?.querySelector('[data-mf-setup]');if(!form)return
 const current=overlay,version=++loading;form.querySelector('[data-mf-start]').disabled=true;form.querySelector('[data-mf-demo]').disabled=true
 try{
  config=Object.fromEntries(new FormData(form));config.level=Number(config.level)||1;config.count=config.level===5?'15':config.count;config.pace='club';if(!training&&config.level>unlocked())throw Error('Complete the previous football level first.');let pool
  if(training){pool=footballDemoQuestions();config={class_level:'Training demo',curriculum:'Sample arithmetic',topic:'Sample arithmetic',count:'5',level:1,pace:config.pace,kit:config.kit,question_mode:'balanced'}}
  else{pool=uniqueGameQuestions(await loadGameBank(supabase,{class_level:config.class_level,curriculum:config.curriculum,...(config.topic?{topic:config.topic}:{})}));if(overlay!==current||version!==loading)return}
  const count=Number(config.count);if(pool.length<count)throw Error(`Only ${pool.length} usable questions are available. Choose a shorter match, another topic or All topics.`)
  adaptive=!training&&config.question_mode==='adaptive'?createAdaptivePractice(pool):null
  const chosen=selectVariedQuestions(pool,count);if(adaptive)placeAdaptiveQuestion(chosen,0,nextAdaptiveQuestion(adaptive))
  match=createFootballMatch(chosen,{pace:config.pace,level:config.level});demo=training;recordId=crypto.randomUUID();matchOwner=results.getOwner();paused=false;lastFrame=0
  if(!training)savedConfig={...config}
  renderMatch();frameId=requestAnimationFrame(frameFootball)
 }catch(error){if(overlay===current&&form.isConnected){form.querySelector('[data-mf-bank-status]').textContent=error.message;form.querySelector('[data-mf-start]').disabled=!results.getOwner();form.querySelector('[data-mf-demo]').disabled=false}}
}
function renderMatch(){
 const level=careerLevel(match.level),goals=careerOutcome(match).requiredGoals
 shell(`<section class="mf-match-head"><div><span class="mf-kicker">${demo?'TRAINING DEMO':`LEVEL ${level.id} · ${esc(level.name.toUpperCase())}`}</span><h1>Find space. Make it count.</h1><p>${esc(config.class_level)} · ${esc(config.curriculum)} · ${esc(config.topic||'All topics')}</p></div><div class="mf-actions"><button type="button" data-mf-sound aria-pressed="${soundOn}">Sound ${soundOn?'on':'off'}</button><button type="button" data-mf-pause aria-pressed="${paused}">Pause match</button></div></section><section class="mf-scoreboard" aria-label="Match scoreboard"><article><span>GOALS</span><strong data-mf-goals>0</strong></article><div><b data-mf-kick>Chance 1 / ${match.questions.length}</b><span data-mf-round>${level.id===5?'Cup · round 1 of 3':esc(level.name)}</span></div><article><span>GOAL TARGET</span><strong>${goals}</strong></article></section><div class="mf-match-layout"><section class="mf-pitch-pane"><canvas data-mf-pitch tabindex="0" aria-label="Football pitch. Arrow keys or WASD to move. Space to shoot. Tap the goal to aim."></canvas><p class="mf-keeper"><b data-mf-field-status>Answer to start your attack</b></p><div data-mf-pause-note role="status"></div><div class="mf-field-controls" data-mf-targets hidden><div class="mf-dpad" aria-label="Movement controls"><button type="button" data-mf-move="up" aria-label="Move up">▲</button><button type="button" data-mf-move="left" aria-label="Move left">◀</button><button type="button" data-mf-move="down" aria-label="Move down">▼</button><button type="button" data-mf-move="right" aria-label="Move right">▶</button></div><div class="mf-shot-controls"><label>Aim across goal<input type="range" min="355" max="545" step="1" value="535" data-mf-aim aria-label="Shot target across goal"></label><button type="button" class="mf-primary" data-mf-fire>SHOOT ⚽</button><div class="mf-targets">${FOOTBALL_ZONES.map((zone,i)=>`<button type="button" data-mf-shoot="${zone}">${i+1} · ${zone}</button>`).join('')}</div></div></div></section><section class="mf-question" data-mf-question aria-label="Football maths question"></section></div><div class="mf-match-footer"><p data-mf-accuracy>Maths: 0 / 0 correct</p><p>${level.id===5?'Each round needs 2 goals + 3 correct answers.':'Target: '+goals+' goals + '+Math.ceil(match.questions.length*.6)+' correct answers.'} Maths difficulty follows your class.</p></div>`)
 aimX=535;clearMovement();renderQuestion();paintFootball()
}
function renderQuestion(){
 const box=overlay?.querySelector('[data-mf-question]');if(!box||!match)return
 const q=match.questions[match.round],record=match.answers.at(-1);clearMovement()
 overlay.querySelector('[data-mf-targets]').hidden=match.phase!=='aim'
 if(match.phase==='question')box.innerHTML=`<span class="mf-kicker">CHANCE ${match.round+1} / ${match.questions.length}</span><h2>${renderVectorText(q.question_text)}</h2>${image(q.question_image_url,'Question diagram')}${adaptive?`<p class="mf-adaptive">Adaptive practice · ${esc(adaptiveQuestionLabel(adaptive,q))}<br>${esc(adaptive.message)}</p>`:''}<div class="mf-answer-grid">${['a','b','c','d'].map((key,i)=>`<button type="button" data-mf-answer="${'ABCD'[i]}" ${paused?'disabled':''}><b>${i+1}</b><span>${renderVectorText(q['option_'+key]||'')}${image(q['option_'+key+'_image_url'],'Option '+ 'ABCD'[i]+' diagram')}</span></button>`).join('')}</div><p>Correct answer → take control of the attack. Think it through before choosing.</p>`
 else if(match.phase==='aim')box.innerHTML=`<span class="mf-kicker">ATTACKING CHANCE</span><h2>Correct! Take the ball.</h2><p>Dribble with arrow keys / WASD or hold the touch arrows. Find space, aim across the goal and shoot with Space or the Shoot button.</p><p class="mf-callout">${match.field?.boost?'POWER BOOST: two correct answers in a row! Faster run and stronger shot.':'Move closer and choose an angle away from the keeper.'}</p><p>Defenders can tackle or block. You have ${careerLevel(match.level).seconds} seconds. Maths accuracy still counts if you miss.</p>`
 else if(match.phase==='flight')box.innerHTML=`<span class="mf-kicker">${record.correct?'SHOT TAKEN':'KICK USED'}</span><h2>${record.correct?'Watch the ball…':'No attack this time.'}</h2><p>${record.correct?'Your penalty is on its way.':'A correct maths answer earns an attack. Review the solution after this kick.'}</p>`
 else if(match.phase==='feedback')box.innerHTML=`<span class="mf-kicker">CHANCE ${match.round+1} COMPLETE</span><h2>${record.goal?'GOAL!':record.correct?({saved:'Saved by the keeper.',blocked:'Defender blocked your shot.',tackled:'Tackled!',wide:'Just wide.',time:'Time is up.'}[record.shotResult]||'Chance complete.'):'Keep building your maths.'}</h2><p role="status">${record.goal?'Your shot scored. ':record.saved?'Your shot was saved. ':record.correct?'Chance ended without a goal. ':'No attack earned. '}${record.correct&&!record.goal?'Try a different run or shooting angle next time.':''}</p><div class="mf-correction"><p><b>Your answer:</b> ${esc(record.selected)} · ${renderVectorText(record.options['ABCD'.indexOf(record.selected)]||'')}</p><p><b>Correct answer:</b> ${esc(record.correct_answer)} · ${renderVectorText(record.options['ABCD'.indexOf(record.correct_answer)]||'')}</p><p>${renderVectorText(record.explanation||'Discuss this question with your teacher.')}</p></div><button class="mf-primary" type="button" data-mf-next>${match.round+1===match.questions.length?'VIEW MATCH RESULT':'NEXT CHANCE →'}</button>`
 overlay.querySelector('[data-mf-goals]').textContent=match.goals;overlay.querySelector('[data-mf-round]').textContent=match.level===5?`Cup · round ${Math.floor(match.round/5)+1} of 3`:careerLevel(match.level).name
 overlay.querySelector('[data-mf-kick]').textContent=`Chance ${match.round+1} / ${match.questions.length}`
 overlay.querySelector('[data-mf-accuracy]').textContent=`Maths: ${match.answers.filter(a=>a.correct).length} / ${match.answers.length} correct`
 if(match.phase==='feedback')box.querySelector('[data-mf-next]')?.focus()
}
function chooseFootballAnswer(selected){
 if(!match||paused)return
 const q=match.questions[match.round],record=answerFootball(match,selected);if(!record)return
 if(adaptive){recordAdaptiveAnswer(adaptive,q,record.correct);if(match.round+1<match.questions.length)placeAdaptiveQuestion(match.questions,match.round+1,nextAdaptiveQuestion(adaptive))}
 renderQuestion()
 if(match.phase==='aim')overlay.querySelector('[data-mf-pitch]')?.focus()
}
function chooseFootballShot(zone){if(!match||paused||!shootFootball(match,zone||{x:aimX,y:53}))return;playSound('kick')}
function nextFootballKick(){if(!match||paused||!advanceFootball(match))return;if(match.finished){finishFootball();return}renderQuestion();overlay.querySelector('[data-mf-answer]')?.focus()}
function toggleFootballPause(force){
 if(!match||match.finished)return;paused=typeof force==='boolean'?force:!paused;lastFrame=0;clearMovement()
 const button=overlay.querySelector('[data-mf-pause]');button.textContent=paused?'Resume match':'Pause match';button.setAttribute('aria-pressed',String(paused))
 overlay.querySelector('[data-mf-pause-note]').textContent=paused?'Match paused. The goalkeeper, ball and clock are stopped.':''
 overlay.querySelectorAll('[data-mf-answer],[data-mf-shoot],[data-mf-next],[data-mf-move],[data-mf-fire],[data-mf-aim]').forEach(button=>button.disabled=paused)
}
function paintFootball(){
 if(!overlay||!match)return;match.aimX=aimX;drawFootballPitch(overlay.querySelector('[data-mf-pitch]'),match,KITS[config.kit]||KITS.gold,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
 const slot=overlay.querySelector('[data-mf-field-status]');if(slot){const status=match.phase==='aim'?`${Math.ceil(match.field.time)}s · ${match.field.possession?'Dribble and shoot':'Ball in play'}${match.field.boost?' · POWER BOOST':''}`:match.phase==='question'?'Answer to start your attack':match.phase==='feedback'?(match.answers.at(-1)?.goal?'GOAL!':'Chance complete'):'Reviewing your answer';if(slot.textContent!==status)slot.textContent=status}
 overlay.querySelectorAll('[data-mf-fire],[data-mf-shoot]').forEach(b=>b.disabled=paused||!match.field?.possession)

}
function frameFootball(time){
 if(!overlay||!match||match.finished)return
 const dt=lastFrame?Math.min(1,(time-lastFrame)/1000):0;lastFrame=time
 if(!paused){for(let left=dt;left>0;left-=.05)if(tickFootball(match,Math.min(.05,left),movement())){playSound(match.answers.at(-1)?.goal?'goal':'miss');renderQuestion()}}
 paintFootball();frameId=requestAnimationFrame(frameFootball)
}
function finishFootball(){
 cancelAnimationFrame(frameId);clearMovement();const summary=summariseFootball(match);summary.unlockedLevel=Math.max(unlocked(),summary.passed?Math.min(5,match.level+1):1);summary.outcome=summary.passed?'Level complete':'Try again'
 if(!demo&&results.getOwner()===matchOwner)results.save(summary,{...config,topic:config.topic||'All topics'},recordId)
 const accuracy=Math.round(100*summary.correct/summary.total)
 shell(`<section class="mf-result"><span class="mf-kicker">${demo?'TRAINING COMPLETE':'FULL TIME'}</span><h1>${summary.passed?(match.level===5?'Mezzo Cup champions!':'Level complete!'):'Keep training. Try again.'}</h1><div class="mf-final-score"><strong>${summary.goals}</strong><span>GOALS<br>—<br>TARGET</span><strong>${summary.requiredGoals}</strong></div><div class="mf-result-stats"><article><b>${summary.correct}/${summary.total}</b><span>Maths answers correct</span></article><article><b>${accuracy}%</b><span>Maths accuracy</span></article><article><b>${summary.seconds}s</b><span>Active match time</span></article></div><p>${demo?'This training demo used sample arithmetic. Sign in for your class and curriculum questions.':'Your match and answer review are saved to your account when connected. Check the save status above.'}</p><p>${summary.passed?(demo?'Training target met. Sign in to start your saved career.':match.level===5?'🏆 Trophy earned! You qualified in all three Cup rounds.':'Level '+Math.min(5,match.level+1)+' is now unlocked.'):'Meet both targets to advance: '+summary.requiredGoals+' goals and '+summary.requiredCorrect+' correct answers.'}</p>${match.level===5?`<div class="mf-cup-rounds">${summary.groups.map((g,i)=>`<p>Round ${i+1}: ${g.goals} goals · ${g.correct}/5 correct · ${g.goals>=2&&g.correct>=3?'Qualified':'Target missed'}</p>`).join('')}</div>`:''}<div class="mf-actions"><button class="mf-primary" type="button" data-mf-again>PLAY ANOTHER MATCH</button>${demo?'<button type="button" data-mf-signin>Sign in / Join</button>':'<button type="button" data-mf-sync>Retry / refresh account save</button>'}<button type="button" data-mf-close>Back to Arena</button></div><h2>Learning from every chance</h2>${summary.answers.map((a,i)=>`<details class="mf-review"><summary>Question ${i+1} · ${a.correct?'Correct':'Incorrect'} · ${a.goal?'Goal':a.shotResult||'No attack'}</summary><h3>${renderVectorText(a.question_text)}</h3>${image(a.question_image_url,'Question diagram')}<p>Your answer: <b>${esc(a.selected)} · ${renderVectorText(a.options['ABCD'.indexOf(a.selected)]||'')}</b></p><p>Correct answer: <b>${esc(a.correct_answer)} · ${renderVectorText(a.options['ABCD'.indexOf(a.correct_answer)]||'')}</b></p>${image(a.option_images['ABCD'.indexOf(a.correct_answer)],'Correct answer diagram')}<p>${renderVectorText(a.explanation||'Discuss the solution with your teacher.')}</p><small>${esc(a.topic)}</small></details>`).join('')}</section>`)
 overlay.querySelector('[data-mf-again]')?.focus()
}
function installFootball(){
 document.querySelectorAll('.screen-tabs .tab-scroll').forEach(menu=>{if(!menu.querySelector('[data-football-open]'))menu.insertAdjacentHTML('beforeend','<button type="button" class="screen-tab" data-football-open>⚽ Maths Football</button>')})
 const grid=document.querySelector('.home-screen .home-mode-grid');if(grid&&!grid.querySelector('[data-football-open]'))grid.insertAdjacentHTML('beforeend','<button type="button" class="home-mode-card game-mode-card mf-home-card" data-football-open><div class="mode-top"><span class="mode-icon">⚽</span><em>PLAY · 5 CAREER LEVELS</em></div><h3>Maths Football</h3><p>Dribble, beat defenders and shoot. Build your football career with class-level maths.</p><div class="reward-pill">5 levels · touch controls · saved career</div><strong>TAKE THE PITCH →</strong></button>')
}
let queued=false;function queueInstall(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;installFootball()})}
document.addEventListener('click',event=>{
 if(event.target.closest('[data-football-open]')){event.preventDefault();event.stopImmediatePropagation();void openFootball();return}
 if(!event.target.closest('.mf-overlay'))return
 if(event.target.closest('[data-mf-close]')){if(match&&!match.finished&&!confirm('Leave this match? An unfinished match will not be saved.'))return;closeFootball();return}
 if(event.target.closest('[data-mf-demo]'))void startFootball(true)
 if(event.target.closest('[data-mf-again]'))setupFootball()
 if(event.target.closest('[data-mf-sync]'))void results.sync()
 if(event.target.closest('[data-mf-reload]'))void loadTopics()
 if(event.target.closest('[data-mf-signin]')){closeFootball();document.querySelector('[data-target="auth"]')?.click();return}
 const answer=event.target.closest('[data-mf-answer]');if(answer)chooseFootballAnswer(answer.dataset.mfAnswer)
 const shot=event.target.closest('[data-mf-shoot]');if(shot)chooseFootballShot(shot.dataset.mfShoot)
 if(event.target.closest('[data-mf-next]'))nextFootballKick()
 if(event.target.closest('[data-mf-pause]'))toggleFootballPause();if(event.target.closest('[data-mf-fire]'))chooseFootballShot();if(event.target.closest('[data-mf-sound]')){soundOn=!soundOn;const b=event.target.closest('[data-mf-sound]');b.textContent='Sound '+(soundOn?'on':'off');b.setAttribute('aria-pressed',String(soundOn));if(soundOn)playSound('goal')}
},true)
document.addEventListener('submit',event=>{if(event.target.matches('[data-mf-setup]')){event.preventDefault();event.stopImmediatePropagation();void startFootball(false)}},true)
document.addEventListener('change',event=>{if(!event.target.closest('[data-mf-setup]'))return;if(['class_level','curriculum'].includes(event.target.name))void loadTopics();if(['level','count'].includes(event.target.name))updateLevelRules();if(event.target.name==='kit')drawFootballPitch(overlay.querySelector('[data-mf-preview]'),null,KITS[event.target.value])})
document.addEventListener('visibilitychange',()=>{if(document.hidden&&overlay&&match&&!match.finished)toggleFootballPause(true)})
document.addEventListener('keydown',event=>{
 if(!overlay)return
 if(event.key==='Tab'){const nodes=[...overlay.querySelectorAll('button:not(:disabled),input,select:not(:disabled),a[href],summary')].filter(n=>n.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}return}
 if(event.target.matches('input,select,textarea'))return
 const key=event.key.length===1?event.key.toLowerCase():event.key
 if(match?.phase==='aim'&&!paused&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(key)){event.preventDefault();heldKeys.add(key);return}
 if(event.repeat)return
 if(event.key==='Escape'&&match&&!match.finished){event.preventDefault();toggleFootballPause();return}
 if(paused||!match)return
 if(match.phase==='question'&&/^[1-4]$/.test(event.key)){event.preventDefault();chooseFootballAnswer('ABCD'[Number(event.key)-1])}
 else if(match.phase==='aim'&&event.code==='Space'){event.preventDefault();chooseFootballShot()}
 else if(match.phase==='aim'&&/^[1-3]$/.test(event.key)){event.preventDefault();chooseFootballShot(FOOTBALL_ZONES[Number(event.key)-1])}
},true)
supabase?.auth.onAuthStateChange((_event,session)=>{const id=session?.user?.id||null;if(id!==results.getOwner()){results.setOwner(id);if(overlay)closeFootball()}})
window.addEventListener('online',()=>{void results.sync()})
new MutationObserver(queueInstall).observe(document.body,{childList:true,subtree:true});queueInstall()

document.addEventListener('keyup',event=>{heldKeys.delete(event.key.length===1?event.key.toLowerCase():event.key)},true)
window.addEventListener('blur',()=>{clearMovement();if(overlay&&match&&!match.finished)toggleFootballPause(true)})
document.addEventListener('input',event=>{if(event.target.matches('[data-mf-aim]'))aimX=Number(event.target.value)})
document.addEventListener('pointerdown',event=>{
 const button=event.target.closest('[data-mf-move]');if(button&&match?.phase==='aim'&&!paused){event.preventDefault();button.setPointerCapture(event.pointerId);touchDirections.set(event.pointerId,({up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}})[button.dataset.mfMove]);return}
 const canvas=event.target.closest('[data-mf-pitch]');if(canvas&&match?.phase==='aim'&&!paused){const rect=canvas.getBoundingClientRect(),y=(event.clientY-rect.top)/rect.height*510;if(y<115){aimX=Math.max(355,Math.min(545,(event.clientX-rect.left)/rect.width*900));overlay.querySelector('[data-mf-aim]').value=aimX}}
},true)
for(const name of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(name,event=>touchDirections.delete(event.pointerId),true)
