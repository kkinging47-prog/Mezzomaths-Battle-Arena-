import {supabase} from './supabaseClient.js'
import {loadGameBank,gameBankTopics,uniqueGameQuestions} from './game-question-bank.js'
import {selectVariedQuestions} from './question-selection.js'
import {createAdaptivePractice,nextAdaptiveQuestion,recordAdaptiveAnswer,placeAdaptiveQuestion,adaptiveQuestionLabel} from './rally-adaptive-practice.js'
import {createFootballMatch,answerFootball,shootFootball,tickFootball,advanceFootball,summariseFootball,footballDemoQuestions,FOOTBALL_ZONES} from './maths-football-engine.js'
import {drawFootballPitch} from './maths-football-renderer.js'
import {createFootballResultsStore} from './football-results-store.js'
import {renderVectorText} from './vector-math.js'
import './maths-football.css'

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const LEVELS=Array.from({length:9},(_,i)=>`Grade ${i+1}`).concat(['SHS 1','SHS 2','SHS 3'])
const KITS={gold:'#edc45f',blue:'#76b8ed',red:'#e36c77'}
const options=(values,selected)=>values.map(v=>`<option ${v===selected?'selected':''}>${esc(v)}</option>`).join('')
const image=(url,alt)=>/^https:\/\//i.test(String(url||''))?`<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy">`:''
let overlay=null,match=null,config=null,adaptive=null,recordId=null,matchOwner=null,demo=false,paused=false,frameId=0,lastFrame=0,lastKeeper=-1,loading=0,lastFocus=null,oldOverflow='',savedConfig=null
const results=createFootballResultsStore({client:supabase,storage:localStorage,onChange:updateSaveStatus})
function saveMessage(){
 if(demo)return 'Training demo · sample arithmetic · result not saved'
 if(!results.getOwner())return 'Sign in for class questions and account results.'
 if(results.cacheFailed())return 'Offline copy could not be stored. Keep this page open and retry saving.'
 return {loading:'Loading your football results…',saving:'Saving your football results…',saved:'Football results saved to your account.',offline:'Sync pending. Your results are kept on this device; retry when connected.'}[results.getStatus()]||'Account connected.'
}
function updateSaveStatus(){
 const slot=overlay?.querySelector('[data-mf-save]');if(slot)slot.textContent=saveMessage()
 const history=overlay?.querySelector('[data-mf-history]');if(history)history.innerHTML=historyHtml()
}
function shell(body){overlay.scrollTop=0;overlay.innerHTML=`<div class="mf-shell"><header class="mf-header"><div><span>MEZZO MATHS</span><strong>FOOTBALL</strong></div><button type="button" data-mf-close>Back to Arena ✕</button></header><p class="mf-save" data-mf-save role="status">${esc(saveMessage())}</p>${body}</div>`}
function historyHtml(){const records=results.getRecords();return `<h2>Your recent matches</h2>${records.length?records.map(r=>`<article class="mf-history-row"><b>${esc(r.metadata.outcome)} · ${esc(r.metadata.goals)}–${esc(r.metadata.opponentGoals)}</b><span>${esc(r.class_level)} · ${esc(r.curriculum)} · ${esc(r.topic)}</span><small>${esc(r.score)}/${esc(r.total)} maths answers correct · ${esc(new Date(r.created_at).toLocaleDateString())}</small></article>`).join(''):'<p>Your completed class-question matches will appear here.</p>'}`}
async function openFootball(){
 if(overlay)return
 lastFocus=document.activeElement;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden'
 overlay=document.createElement('section');overlay.className='mf-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Mezzo Maths Football');document.body.append(overlay)
 const current=overlay;demo=false;shell('<p>Opening the stadium…</p>')
 try{const {data}=await supabase?.auth.getSession()||{};if(overlay!==current)return;results.setOwner(data?.session?.user?.id||null);void results.sync()}catch{}
 if(overlay!==current)return;setupFootball();overlay.querySelector('[data-mf-close]').focus()
}
function closeFootball(){loading++;cancelAnimationFrame(frameId);overlay?.remove();overlay=null;match=null;adaptive=null;paused=false;document.body.style.overflow=oldOverflow;lastFocus?.focus?.()}
function setupFootball(){
 loading++;cancelAnimationFrame(frameId);match=null;adaptive=null;paused=false;demo=false
 shell(`<section class="mf-hero"><div><span class="mf-kicker">THE PENALTY SPOT IS YOURS</span><h1>Think clearly.<br>Shoot confidently.</h1><p>Correct maths answers earn a shot. Watch the goalkeeper, aim for an open side and take on the computer in a penalty shootout.</p><div class="mf-pills"><span>5 or 10 kicks</span><span>Touch & keyboard</span><span>Answer review</span></div><canvas data-mf-preview aria-label="Football stadium with a goal, goalkeeper and striker"></canvas></div><form data-mf-setup class="mf-setup"><h2>Build your match</h2><div class="mf-fields"><label>Class<select name="class_level">${options(LEVELS,savedConfig?.class_level||'Grade 4')}</select></label><label>Curriculum<select name="curriculum">${options(['GES','Cambridge','Pearson Edexcel'],savedConfig?.curriculum||'GES')}</select></label><label>Topic<select name="topic"><option value="">All topics (including unassigned)</option></select></label><label>Match length<select name="count"><option value="5">5 kicks · quick match</option><option value="10">10 kicks · full shootout</option></select></label><label>Question selection<select name="question_mode"><option value="balanced">Balanced mix</option><option value="adaptive">Adaptive practice</option></select></label><label>Goalkeeper & opponent<select name="pace"><option value="training">Training · gentler</option><option value="club" selected>Club · balanced</option><option value="challenge">Challenge · quicker keeper</option></select></label><label>Team kit<select name="kit"><option value="gold">Mezzo Gold</option><option value="blue">Coastal Blue</option><option value="red">Sunset Red</option></select></label></div><p data-mf-bank-status role="status">Checking the question bank…</p><button class="mf-primary" type="submit" data-mf-start disabled>START CLASS-QUESTION MATCH →</button><div class="mf-actions"><button type="button" data-mf-demo>Try training demo · 5 kicks</button><button type="button" data-mf-signin>Sign in / Join</button><button type="button" data-mf-reload>Reload questions</button></div><p class="mf-small">The demo uses sample arithmetic and does not save a result. Class matches use your selected bank and save to your account. Football scores and maths accuracy are shown separately.</p></form></section><section class="mf-how"><h2>From answer to goal</h2><ol><li>Answer the maths question. A correct answer earns a penalty.</li><li>Watch the keeper. Choose left, centre or right to shoot into an open zone.</li><li>The computer takes its kick too. Review the explanation, then take your next kick.</li></ol><p>Keys 1–4 answer questions; keys 1–3 aim your shot. Escape pauses. Switching tabs pauses the match. A wrong maths answer uses the kick without a shot. Aim into the keeper’s zone and the shot is saved.</p></section><section class="mf-history" data-mf-history>${historyHtml()}</section>`)
 const form=overlay.querySelector('[data-mf-setup]');for(const name of ['count','question_mode','pace','kit'])if(savedConfig?.[name])form.elements[name].value=savedConfig[name]
 drawFootballPitch(overlay.querySelector('[data-mf-preview]'),null,KITS[form.elements.kit.value]);void loadTopics()
}
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
  config=Object.fromEntries(new FormData(form));let pool
  if(training){pool=footballDemoQuestions();config={class_level:'Training demo',curriculum:'Sample arithmetic',topic:'Sample arithmetic',count:'5',pace:config.pace,kit:config.kit,question_mode:'balanced'}}
  else{pool=uniqueGameQuestions(await loadGameBank(supabase,{class_level:config.class_level,curriculum:config.curriculum,...(config.topic?{topic:config.topic}:{})}));if(overlay!==current||version!==loading)return}
  const count=Number(config.count);if(pool.length<count)throw Error(`Only ${pool.length} usable questions are available. Choose a shorter match, another topic or All topics.`)
  adaptive=!training&&config.question_mode==='adaptive'?createAdaptivePractice(pool):null
  const chosen=selectVariedQuestions(pool,count);if(adaptive)placeAdaptiveQuestion(chosen,0,nextAdaptiveQuestion(adaptive))
  match=createFootballMatch(chosen,{pace:config.pace});demo=training;recordId=crypto.randomUUID();matchOwner=results.getOwner();paused=false;lastFrame=0;lastKeeper=-1
  if(!training)savedConfig={...config}
  renderMatch();frameId=requestAnimationFrame(frameFootball)
 }catch(error){if(overlay===current&&form.isConnected){form.querySelector('[data-mf-bank-status]').textContent=error.message;form.querySelector('[data-mf-start]').disabled=!results.getOwner();form.querySelector('[data-mf-demo]').disabled=false}}
}
function renderMatch(){
 shell(`<section class="mf-match-head"><div><span class="mf-kicker">${demo?'TRAINING DEMO':'MEZZO PENALTY CUP'}</span><h1>Your next goal starts here.</h1><p>${esc(config.class_level)} · ${esc(config.curriculum)} · ${esc(config.topic||'All topics')}</p></div><button type="button" data-mf-pause aria-pressed="${paused}">Pause match</button></section><section class="mf-scoreboard" aria-label="Match scoreboard"><article><span>YOUR TEAM</span><strong data-mf-goals>0</strong></article><div><b data-mf-kick>Kick 1 / ${match.questions.length}</b><span>Penalty shootout</span></div><article><span>COMPUTER</span><strong data-mf-opponent>0</strong></article></section><div class="mf-match-layout"><section class="mf-pitch-pane"><canvas data-mf-pitch aria-label="Live penalty shootout showing the goalkeeper and ball"></canvas><p class="mf-keeper">Goalkeeper position: <b data-mf-keeper>centre</b></p><div data-mf-pause-note role="status"></div><div class="mf-targets" data-mf-targets hidden>${FOOTBALL_ZONES.map((zone,i)=>`<button type="button" data-mf-shoot="${zone}"><span>${i+1}</span>Shoot ${zone}</button>`).join('')}</div></section><section class="mf-question" data-mf-question aria-label="Football maths question"></section></div><div class="mf-match-footer"><p data-mf-accuracy>Maths: 0 / 0 correct</p><p>Goals depend on your answer and shot. Keep practising the maths, even if a shot is saved.</p></div>`)
 renderQuestion();paintFootball()
}
function renderQuestion(){
 const box=overlay?.querySelector('[data-mf-question]');if(!box||!match)return
 const q=match.questions[match.round],record=match.answers.at(-1)
 overlay.querySelector('[data-mf-targets]').hidden=match.phase!=='aim'
 if(match.phase==='question')box.innerHTML=`<span class="mf-kicker">KICK ${match.round+1} / ${match.questions.length}</span><h2>${renderVectorText(q.question_text)}</h2>${image(q.question_image_url,'Question diagram')}${adaptive?`<p class="mf-adaptive">Adaptive practice · ${esc(adaptiveQuestionLabel(adaptive,q))}<br>${esc(adaptive.message)}</p>`:''}<div class="mf-answer-grid">${['a','b','c','d'].map((key,i)=>`<button type="button" data-mf-answer="${'ABCD'[i]}" ${paused?'disabled':''}><b>${i+1}</b><span>${renderVectorText(q['option_'+key]||'')}${image(q['option_'+key+'_image_url'],'Option '+ 'ABCD'[i]+' diagram')}</span></button>`).join('')}</div><p>Correct answer → penalty shot. Think it through before choosing.</p>`
 else if(match.phase==='aim')box.innerHTML='<span class="mf-kicker">PENALTY EARNED</span><h2>Correct! Pick your spot.</h2><p>Watch the goalkeeper and shoot into another zone. Use the three shoot buttons or keys 1, 2 and 3.</p><p class="mf-callout">Accuracy earned this chance. Your aim decides the goal.</p>'
 else if(match.phase==='flight')box.innerHTML=`<span class="mf-kicker">${record.correct?'SHOT TAKEN':'KICK USED'}</span><h2>${record.correct?'Watch the ball…':'No shot this time.'}</h2><p>${record.correct?'Your penalty is on its way.':'A correct maths answer earns a penalty. Review the solution after this kick.'}</p>`
 else if(match.phase==='feedback')box.innerHTML=`<span class="mf-kicker">KICK ${match.round+1} COMPLETE</span><h2>${record.goal?'GOAL!':record.saved?'Saved by the keeper.':'Keep building your maths.'}</h2><p role="status">${record.goal?'Your shot scored. ':record.saved?'Your shot was saved. ':'No shot earned. '}${record.opponent_goal?'The computer scored its penalty.':'The computer missed its penalty.'}</p><div class="mf-correction"><p><b>Your answer:</b> ${esc(record.selected)} · ${renderVectorText(record.options['ABCD'.indexOf(record.selected)]||'')}</p><p><b>Correct answer:</b> ${esc(record.correct_answer)} · ${renderVectorText(record.options['ABCD'.indexOf(record.correct_answer)]||'')}</p><p>${renderVectorText(record.explanation||'Discuss this question with your teacher.')}</p></div><button class="mf-primary" type="button" data-mf-next>${match.round+1===match.questions.length?'VIEW MATCH RESULT':'NEXT KICK →'}</button>`
 overlay.querySelector('[data-mf-goals]').textContent=match.goals;overlay.querySelector('[data-mf-opponent]').textContent=match.opponentGoals
 overlay.querySelector('[data-mf-kick]').textContent=`Kick ${match.round+1} / ${match.questions.length}`
 overlay.querySelector('[data-mf-accuracy]').textContent=`Maths: ${match.answers.filter(a=>a.correct).length} / ${match.answers.length} correct`
 if(match.phase==='feedback')box.querySelector('[data-mf-next]')?.focus()
}
function chooseFootballAnswer(selected){
 if(!match||paused)return
 const q=match.questions[match.round],record=answerFootball(match,selected);if(!record)return
 if(adaptive){recordAdaptiveAnswer(adaptive,q,record.correct);if(match.round+1<match.questions.length)placeAdaptiveQuestion(match.questions,match.round+1,nextAdaptiveQuestion(adaptive))}
 renderQuestion()
 if(match.phase==='aim')overlay.querySelector('[data-mf-shoot]')?.focus()
}
function chooseFootballShot(zone){if(!match||paused||!shootFootball(match,zone))return;renderQuestion()}
function nextFootballKick(){if(!match||paused||!advanceFootball(match))return;if(match.finished){finishFootball();return}renderQuestion();overlay.querySelector('[data-mf-answer]')?.focus()}
function toggleFootballPause(force){
 if(!match||match.finished)return;paused=typeof force==='boolean'?force:!paused;lastFrame=0
 const button=overlay.querySelector('[data-mf-pause]');button.textContent=paused?'Resume match':'Pause match';button.setAttribute('aria-pressed',String(paused))
 overlay.querySelector('[data-mf-pause-note]').textContent=paused?'Match paused. The goalkeeper, ball and clock are stopped.':''
 overlay.querySelectorAll('[data-mf-answer],[data-mf-shoot],[data-mf-next]').forEach(button=>button.disabled=paused)
}
function paintFootball(){
 if(!overlay||!match)return;drawFootballPitch(overlay.querySelector('[data-mf-pitch]'),match,KITS[config.kit]||KITS.gold,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
 if(lastKeeper!==match.keeperZone){lastKeeper=match.keeperZone;overlay.querySelector('[data-mf-keeper]').textContent=FOOTBALL_ZONES[lastKeeper]}
}
function frameFootball(time){
 if(!overlay||!match||match.finished)return
 const dt=lastFrame?Math.min(1,(time-lastFrame)/1000):0;lastFrame=time
 if(!paused){for(let left=dt;left>0;left-=.05)if(tickFootball(match,Math.min(.05,left)))renderQuestion()}
 paintFootball();frameId=requestAnimationFrame(frameFootball)
}
function finishFootball(){
 cancelAnimationFrame(frameId);const summary=summariseFootball(match)
 if(!demo&&results.getOwner()===matchOwner)results.save(summary,{...config,topic:config.topic||'All topics'},recordId)
 const accuracy=Math.round(100*summary.correct/summary.total)
 shell(`<section class="mf-result"><span class="mf-kicker">${demo?'TRAINING COMPLETE':'FULL TIME'}</span><h1>${summary.outcome==='Win'?'Victory!':summary.outcome==='Draw'?'Honours even.':'Come back stronger.'}</h1><div class="mf-final-score"><strong>${summary.goals}</strong><span>YOUR TEAM<br>—<br>COMPUTER</span><strong>${summary.opponentGoals}</strong></div><div class="mf-result-stats"><article><b>${summary.correct}/${summary.total}</b><span>Maths answers correct</span></article><article><b>${accuracy}%</b><span>Maths accuracy</span></article><article><b>${summary.seconds}s</b><span>Active match time</span></article></div><p>${demo?'This training demo used sample arithmetic. Sign in for your class and curriculum questions.':'Your match and answer review are saved to your account when connected. Check the save status above.'}</p><div class="mf-actions"><button class="mf-primary" type="button" data-mf-again>PLAY ANOTHER MATCH</button>${demo?'<button type="button" data-mf-signin>Sign in / Join</button>':'<button type="button" data-mf-sync>Retry / refresh account save</button>'}<button type="button" data-mf-close>Back to Arena</button></div><h2>Learning from every kick</h2>${summary.answers.map((a,i)=>`<details class="mf-review"><summary>Question ${i+1} · ${a.correct?'Correct':'Incorrect'} · ${a.goal?'Goal':a.saved?'Shot saved':'No shot'}</summary><h3>${renderVectorText(a.question_text)}</h3>${image(a.question_image_url,'Question diagram')}<p>Your answer: <b>${esc(a.selected)} · ${renderVectorText(a.options['ABCD'.indexOf(a.selected)]||'')}</b></p><p>Correct answer: <b>${esc(a.correct_answer)} · ${renderVectorText(a.options['ABCD'.indexOf(a.correct_answer)]||'')}</b></p>${image(a.option_images['ABCD'.indexOf(a.correct_answer)],'Correct answer diagram')}<p>${renderVectorText(a.explanation||'Discuss the solution with your teacher.')}</p><small>${esc(a.topic)}</small></details>`).join('')}</section>`)
 overlay.querySelector('[data-mf-again]')?.focus()
}
function installFootball(){
 document.querySelectorAll('.screen-tabs .tab-scroll').forEach(menu=>{if(!menu.querySelector('[data-football-open]'))menu.insertAdjacentHTML('beforeend','<button type="button" class="screen-tab" data-football-open>⚽ Maths Football</button>')})
 const grid=document.querySelector('.home-screen .home-mode-grid');if(grid&&!grid.querySelector('[data-football-open]'))grid.insertAdjacentHTML('beforeend','<button type="button" class="home-mode-card game-mode-card mf-home-card" data-football-open><div class="mode-top"><span class="mode-icon">⚽</span><em>NEW · PENALTY SHOOTOUT</em></div><h3>Maths Football</h3><p>Answer to earn your penalty. Aim away from the goalkeeper and win the shootout.</p><div class="reward-pill">5 or 10 kicks · answer review</div><strong>STEP UP TO THE SPOT →</strong></button>')
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
 if(event.target.closest('[data-mf-pause]'))toggleFootballPause()
},true)
document.addEventListener('submit',event=>{if(event.target.matches('[data-mf-setup]')){event.preventDefault();event.stopImmediatePropagation();void startFootball(false)}},true)
document.addEventListener('change',event=>{if(!event.target.closest('[data-mf-setup]'))return;if(['class_level','curriculum'].includes(event.target.name))void loadTopics();if(event.target.name==='kit')drawFootballPitch(overlay.querySelector('[data-mf-preview]'),null,KITS[event.target.value])})
document.addEventListener('visibilitychange',()=>{if(document.hidden&&overlay&&match&&!match.finished)toggleFootballPause(true)})
document.addEventListener('keydown',event=>{
 if(!overlay)return
 if(event.key==='Tab'){const nodes=[...overlay.querySelectorAll('button:not(:disabled),input,select:not(:disabled),a[href],summary')].filter(n=>n.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}return}
 if(event.target.matches('input,select,textarea')||event.repeat)return
 if(event.key==='Escape'&&match&&!match.finished){event.preventDefault();toggleFootballPause();return}
 if(paused||!match)return
 if(match.phase==='question'&&/^[1-4]$/.test(event.key)){event.preventDefault();chooseFootballAnswer('ABCD'[Number(event.key)-1])}
 else if(match.phase==='aim'&&/^[1-3]$/.test(event.key)){event.preventDefault();chooseFootballShot(FOOTBALL_ZONES[Number(event.key)-1])}
},true)
supabase?.auth.onAuthStateChange((_event,session)=>{const id=session?.user?.id||null;if(id!==results.getOwner()){results.setOwner(id);if(overlay)closeFootball()}})
window.addEventListener('online',()=>{void results.sync()})
new MutationObserver(queueInstall).observe(document.body,{childList:true,subtree:true});queueInstall()
