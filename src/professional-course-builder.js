import './professional-course-builder.css'
import { supabase } from './supabaseClient.js'
import { parseSetup } from './course-lms-complete-enhancer.js'

const sections=[
 ['identity','Course Name','Course details and publishing',['title','class_level','category','course_level','instructor','duration','cover_icon','cover_image','summary','access_type','price','status','featured','drip_mode','prerequisite_course_id']],
 ['outcomes','What learns','Learning outcomes and requirements',['outcomes','requirements']],
 ['chapters','Course chapters','Add chapters and lessons',[]],
 ['files','Course files','Upload learning materials',[]],
 ['quizzes','Chapter quizzes','Questions, answers and explanations',[]],
 ['announcement','Announcement','Updates for your learners',[]],
 ['reviews','Comments and Reviews','Learner feedback and final review',[]]
]
const states=new WeakMap()
const escape=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const field=(label,key,value='',type='text')=>`<label><span>${label}</span>${type==='textarea'?`<textarea data-model="${key}">${escape(value)}</textarea>`:`<input type="${type}" data-model="${key}" value="${escape(value)}">`}</label>`
const button=(label,action)=>`<button type="button" class="btn btn-blue btn-small" data-studio-action="${action}">${label}</button>`
function sync(form){
 const state=states.get(form)
 form.elements.namedItem('course_structure').value=JSON.stringify(state.model)
 form.dispatchEvent(new Event('input',{bubbles:true}))
}
function notice(form,message){form.querySelector('[data-studio-status]').textContent=message}
function save(form){
 if(form.dataset.coverUploading==='true'||form.dataset.fileUploading==='true'){notice(form,'Please wait for the upload to finish.');return false}
 const detail={saved:false};form.dispatchEvent(new CustomEvent('course-studio-save-draft',{bubbles:true,detail}))
 if(detail.saved)notice(form,'Draft saved in this browser tab.')
 return detail.saved
}
function show(form,key){
 const state=states.get(form);state.active=key
 form.querySelectorAll('[data-studio-section]').forEach(el=>el.hidden=el.dataset.studioSection!==key)
 form.querySelectorAll('[data-studio-tab]').forEach(el=>{el.classList.toggle('active',el.dataset.studioTab===key);el.setAttribute('aria-current',el.dataset.studioTab===key?'step':'false')})
 if(key==='reviews')feedback(form)
}
function validate(form,key){
 const section=form.querySelector(`[data-studio-section="${key}"]`)
 for(const el of section.querySelectorAll('input,select,textarea'))if(!el.checkValidity()){show(form,key);el.reportValidity();notice(form,'Please complete the highlighted field.');return false}
 const model=states.get(form).model
 if(key==='chapters')for(const ch of model.chapters)for(const l of ch.lessons||[]){if(l.homework&&!l.homework_due){notice(form,'Set a due date for each lesson homework.');return false}for(const q of l.classwork_questions||[])if(!q.q.trim()||q.options.some(o=>!o.trim())||!q.explanation.trim()){notice(form,'Complete the classwork question, four options and explanation.');return false}}
 if(key==='chapters'&&(!model.chapters.length||model.chapters.some(ch=>!ch.title.trim()||!ch.lessons.length||ch.lessons.some(l=>!l.title.trim())))){notice(form,'Give every chapter a title and at least one named lesson.');return false}
 if(key==='quizzes')for(const ch of [...model.chapters,{quiz:model.final}])for(const q of ch.quiz||[])if(!q.q.trim()||q.options.some(o=>!o.trim())||!q.explanation.trim()){notice(form,'Complete each quiz question, all four answers and its explanation.');return false}
 return true
}
function chapterOptions(model){return model.chapters.map((ch,i)=>`<option value="${i}">${escape(ch.title||`Chapter ${i+1}`)}</option>`).join('')}
function renderChapters(form){
 const model=states.get(form).model,area=form.querySelector('[data-chapter-list]')
 area.innerHTML=model.chapters.map((ch,ci)=>`<article class="studio-item"><header><strong>Chapter ${ci+1}</strong>${button('Remove chapter',`remove-chapter:${ci}`)}</header><div class="studio-input-grid">${field('Chapter title',`chapters.${ci}.title`,ch.title)}${field('Release date (optional)',`chapters.${ci}.unlock_date`,ch.unlock_date,'date')}</div>${(ch.lessons||[]).map((l,li)=>`<details class="studio-lesson" open><summary>Lesson ${li+1}</summary><div class="studio-input-grid">${field('Lesson title',`chapters.${ci}.lessons.${li}.title`,l.title)}${field('Lesson notes',`chapters.${ci}.lessons.${li}.content`,l.content,'textarea')}${field('Interactive activity',`chapters.${ci}.lessons.${li}.interactive`,l.interactive,'textarea')}${field('Homework',`chapters.${ci}.lessons.${li}.homework`,l.homework,'textarea')}${field('Classwork instructions',`chapters.${ci}.lessons.${li}.classwork`,l.classwork,'textarea')}<label>Interactive tool<select data-model="chapters.${ci}.lessons.${li}.interactive_tool"><option value="auto" ${!l.interactive_tool||l.interactive_tool==='auto'?'selected':''}>Automatically match tools to this activity</option><option value="reflection" ${l.interactive_tool==='reflection'?'selected':''}>Reflection / working area</option><option value="angle" ${l.interactive_tool==='angle'?'selected':''}>Movable strips: angles, vertex and sides</option><option value="angle_compare" ${l.interactive_tool==='angle_compare'?'selected':''}>Square corner and movable strips</option><option value="angle_hunt" ${l.interactive_tool==='angle_hunt'?'selected':''}>Angle hunt: examples and sketches</option><option value="counters" ${l.interactive_tool==='counters'?'selected':''}>Counters and equal groups</option></select></label>${field('Homework due date (UTC)',`chapters.${ci}.lessons.${li}.homework_due`,l.homework_due?.slice(0,16)||'','datetime-local')}${field('Release date (optional)',`chapters.${ci}.lessons.${li}.unlock_date`,l.unlock_date,'date')}</div><h4>After-lesson multiple-choice classwork</h4>${(l.classwork_questions||[]).map((q,qi)=>{const base=`chapters.${ci}.lessons.${li}.classwork_questions.${qi}`;return `<div class="studio-item"><div class="studio-input-grid">${field('Question',base+'.q',q.q,'textarea')}${q.options.map((o,i)=>field('Option '+'ABCD'[i],base+'.options.'+i,o)).join('')}<label>Correct answer<select data-model="${base}.answer">${[...'ABCD'].map(a=>`<option ${q.answer===a?'selected':''}>${a}</option>`).join('')}</select></label>${field('Explanation',base+'.explanation',q.explanation,'textarea')}</div>${button('Remove classwork question',`remove-classwork:${ci}:${li}:${qi}`)}</div>`}).join('')}${button('+ Add classwork question',`add-classwork:${ci}:${li}`)}${button('Remove lesson',`remove-lesson:${ci}:${li}`)}</details>`).join('')}${button('+ Add lesson',`add-lesson:${ci}`)}</article>`).join('')||'<p class="studio-empty">No chapters yet. Add your first chapter to begin.</p>'
}
function renderFiles(form){
 const model=states.get(form).model,area=form.querySelector('[data-file-list]')
 area.innerHTML=`<div class="studio-input-grid"><label>Chapter<select data-file-chapter>${chapterOptions(model)}</select></label><label>Lesson<select data-file-lesson></select></label><label>File type<select data-file-kind><option value="video_url">Video</option><option value="audio_url">Audio</option><option value="image_url">Image / diagram</option><option value="resource_url">Presentation / PDF / resource</option></select></label><label>Upload file<input type="file" data-lesson-upload accept="video/mp4,video/webm,audio/mpeg,audio/ogg,audio/wav,image/jpeg,image/png,image/webp,application/pdf"></label><label>Or paste a video / resource link<input type="url" data-file-link placeholder="https://…"></label>${button('Attach link','attach-link')}</div><div data-file-status role="status"></div><div class="studio-file-rows">${model.chapters.flatMap((ch,ci)=>(ch.lessons||[]).flatMap((l,li)=>['video_url','audio_url','image_url','resource_url'].filter(k=>l[k]).map(k=>`<article><div><strong>${escape(l.title)}</strong><small>${escape(ch.title)} · ${escape(k.replace('_url',''))}</small><a href="${escape(l[k])}" target="_blank" rel="noopener">Open file ↗</a></div>${button('Remove',`remove-file:${ci}:${li}:${k}`)}</article>`))).join('')||'<p class="studio-empty">No files attached. Add chapters and lessons first, then attach materials.</p>'}</div>`
 updateLessons(form)
}
function updateLessons(form){const model=states.get(form).model,ci=Number(form.querySelector('[data-file-chapter]')?.value||0);form.querySelector('[data-file-lesson]').innerHTML=(model.chapters[ci]?.lessons||[]).map((l,i)=>`<option value="${i}">${escape(l.title||`Lesson ${i+1}`)}</option>`).join('')}
function renderQuizzes(form){
 const model=states.get(form).model
 form.querySelector('[data-quiz-list]').innerHTML=[...model.chapters.map((ch,i)=>({...ch,key:String(i)})),{title:'Final assessment',quiz:model.final,key:'final'}].map(ch=>`<article class="studio-item"><header><strong>${escape(ch.title)}</strong>${button('+ Add question',`add-quiz:${ch.key}`)}</header>${(ch.quiz||[]).map((q,qi)=>{const base=ch.key==='final'?`final.${qi}`:`chapters.${ch.key}.quiz.${qi}`;return `<details class="studio-lesson" open><summary>Question ${qi+1}</summary><div class="studio-input-grid">${field('Question',base+'.q',q.q,'textarea')}${q.options.map((o,i)=>field('Option '+ 'ABCD'[i],base+'.options.'+i,o)).join('')}<label>Correct answer<select data-model="${base}.answer">${[...'ABCD'].map(a=>`<option ${q.answer===a?'selected':''}>${a}</option>`).join('')}</select></label>${field('Explanation',base+'.explanation',q.explanation,'textarea')}</div>${button('Remove question',`remove-quiz:${ch.key}:${qi}`)}</details>`}).join('')||'<p class="studio-empty">No questions added.</p>'}</article>`).join('')
}
function renderAnnouncements(form){form.querySelector('[data-announcement-list]').innerHTML=states.get(form).model.announcements.map((a,i)=>`<article class="studio-item"><div class="studio-input-grid">${field('Announcement',`announcements.${i}.message`,a.message,'textarea')}<label>Status<select data-model="announcements.${i}.status"><option value="published" ${a.status==='published'?'selected':''}>Visible to learners</option><option value="draft" ${a.status==='draft'?'selected':''}>Draft</option></select></label></div>${button('Remove',`remove-announcement:${i}`)}</article>`).join('')||'<p class="studio-empty">No announcements yet.</p>'}
function feedback(form){
 const cid=form.elements.namedItem('id').value
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return []}}
 const reviews=read('mezzo_course_reviews').filter(r=>r.course_id===cid)
 const comments=read('mezzo_course_discussions').filter(r=>r.course_id===cid)
 form.querySelector('[data-feedback-list]').innerHTML=`<h4>Reviews</h4>${reviews.map(r=>`<article class="studio-item"><strong>${escape(r.user||r.student_email)} · ${escape(r.rating)}/5</strong><p>${escape(r.comment)}</p></article>`).join('')||'<p>No reviews yet.</p>'}<h4>Lesson comments</h4>${comments.map(r=>`<article class="studio-item"><strong>${escape(r.user)}</strong><p>${escape(r.comment)}</p></article>`).join('')||'<p>No lesson comments in this browser yet.</p>'}`
}
function enhance(){
 const form=document.querySelector('#courseAdminForm');if(!form||form.dataset.professional)return
 form.dataset.professional='true';form.noValidate=true
 for(const name of ['title','category','instructor','duration','summary','outcomes'])form.elements.namedItem(name).required=true
 const panel=form.closest('[data-course-admin-panel]');panel.classList.add('professional-course-studio')
 const setup=form.elements.namedItem('course_setup');let model
 try{model=JSON.parse(form.elements.namedItem('course_structure')?.value||'null')}catch{}
 if(!model)model={...parseSetup(setup.value),announcements:JSON.parse(form.elements.namedItem('course_announcements')?.value||'[]')}
 model.announcements||=[];model.final||=[]
 states.set(form,{model,active:'identity'})
 const fields=[...form.children],shell=document.createElement('div');shell.className='course-studio-shell'
 shell.innerHTML='<aside><span>COURSE STUDIO</span><h3>Build your course</h3><nav aria-label="Course builder sections"></nav><p class="studio-help">Save each section. Mount the course after your final review.</p></aside><main><div class="studio-panel"></div></main>'
 for(const [key,title,desc,names] of sections){
 shell.querySelector('nav').insertAdjacentHTML('beforeend',`<button type="button" data-studio-tab="${key}">${escape(title)}</button>`)
 const section=document.createElement('section');section.dataset.studioSection=key;section.className='course-studio-section';section.innerHTML=`<header><h3>${title}</h3><p>${desc}</p></header><div class="course-studio-fields"></div><div class="course-studio-actions">${button(key==='reviews'?'Save draft':'Save and continue →',key==='reviews'?'save':'continue')}</div>`
 const body=section.querySelector('.course-studio-fields')
 for(const name of names){const el=fields.find(el=>el.querySelector?.(`[name="${name}"]`));if(el)body.appendChild(el)}
 if(key==='chapters')body.innerHTML=button('+ Add chapter','add-chapter')+'<div class="wide" data-chapter-list></div>'
 if(key==='files')body.innerHTML='<div class="wide" data-file-list></div>'
 if(key==='quizzes')body.innerHTML='<div class="wide" data-quiz-list></div>'
 if(key==='announcement')body.innerHTML=button('+ Add announcement','add-announcement')+'<div class="wide" data-announcement-list></div>'
 if(key==='reviews'){body.innerHTML='<div class="wide" data-feedback-list></div><h4 class="wide">Completion requirements</h4>';body.appendChild(form.querySelector('.completion-rule-grid'));fields.filter(el=>el.tagName==='BUTTON').forEach(el=>section.querySelector('.course-studio-actions').appendChild(el));section.querySelector('[type="submit"]').textContent=form.elements.namedItem('id').value?'Update course':'Mount course'}
 shell.querySelector('.studio-panel').appendChild(section)
 }
 setup.required=false;setup.closest('label').hidden=true
 form.querySelector('[data-course-media-builder]')?.remove()
 fields.filter(el=>el.tagName==='INPUT'&&el.type==='hidden').forEach(el=>shell.prepend(el))
 if(!shell.querySelector('[name="course_structure"]')){const input=document.createElement('input');input.type='hidden';input.name='course_structure';shell.appendChild(input)}
 shell.insertAdjacentHTML('beforeend','<p class="studio-status" data-studio-status role="status"></p>')
 form.appendChild(shell)
 renderChapters(form);renderFiles(form);renderQuizzes(form);renderAnnouncements(form);sync(form);show(form,'identity')
}
document.addEventListener('input',event=>{
 const el=event.target,form=el.closest('#courseAdminForm');if(!form||!el.dataset.model)return
 const keys=el.dataset.model.split('.');let target=states.get(form).model
 for(const key of keys.slice(0,-1))target=target[key]
 target[keys.at(-1)]=el.type==='datetime-local'&&el.value?el.value+':00Z':el.value;sync(form)
},true)
document.addEventListener('change',event=>{const form=event.target.closest('#courseAdminForm');if(!form)return;if(event.target.matches('[data-model]'))event.target.dispatchEvent(new Event('input',{bubbles:true}));if(event.target.matches('[data-file-chapter]'))updateLessons(form);if(event.target.matches('[data-lesson-upload]'))upload(event.target,form)},true)
async function upload(input,form){
 const file=input.files?.[0];if(!file)return
 const kind=form.querySelector('[data-file-kind]').value,ci=Number(form.querySelector('[data-file-chapter]').value),li=Number(form.querySelector('[data-file-lesson]').value)
 const lesson=states.get(form).model.chapters[ci]?.lessons[li],status=form.querySelector('[data-file-status]')
 if(!lesson){status.textContent='Add a chapter and lesson first.';input.value='';return}
 const allowed={video_url:['video/mp4','video/webm'],audio_url:['audio/mpeg','audio/ogg','audio/wav'],image_url:['image/jpeg','image/png','image/webp'],resource_url:['application/pdf']}
 if(!allowed[kind].includes(file.type)||file.size>50*1024*1024){status.textContent='Choose a supported file under 50 MB. For PowerPoint, upload a PDF export or attach a hosted presentation link.';input.value='';return}
 form.dataset.fileUploading='true';input.disabled=true;status.textContent='Uploading…'
 try{if(!supabase)throw Error('Please sign in and try again.');const path=`lessons/${crypto.randomUUID()}.${file.name.split('.').pop().replace(/[^a-z0-9]/gi,'')}`;const {error}=await supabase.storage.from('course-media').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;lesson[kind]=supabase.storage.from('course-media').getPublicUrl(path).data.publicUrl;sync(form);renderFiles(form);notice(form,'File uploaded. Mount course to save your changes.')}
 catch{status.textContent='Upload failed. Choose the file again to retry.'}
 finally{delete form.dataset.fileUploading;input.disabled=false;input.value=''}
}
document.addEventListener('click',event=>{
 const el=event.target.closest('[data-studio-tab],[data-studio-action]');if(!el)return
 const form=el.closest('#courseAdminForm');if(!form)return
 event.preventDefault();const state=states.get(form)
 if(el.dataset.studioTab){if(save(form))show(form,el.dataset.studioTab);return}
 const [action,a,b,c]=el.dataset.studioAction.split(':');const model=state.model
 if(action==='add-classwork')(model.chapters[a].lessons[b].classwork_questions||=[]).push({q:'',options:['','','',''],answer:'A',explanation:''})
 if(action==='remove-classwork')model.chapters[a].lessons[b].classwork_questions.splice(Number(c),1)
 if(action==='save'){save(form);return}
 if(action==='continue'){if(validate(form,state.active)&&save(form))show(form,sections[sections.findIndex(s=>s[0]===state.active)+1][0]);return}
 if(action==='add-chapter')model.chapters.push({title:'',unlock_date:'',lessons:[],quiz:[],homework:[],classwork:[]})
 if(action==='remove-chapter'){if(!confirm('Remove this chapter and its lessons, files and quizzes?'))return;model.chapters.splice(Number(a),1)}
 if(action==='add-lesson')model.chapters[a].lessons.push({title:'',type:'Interactive Lesson',content:'',interactive:'',homework:'',classwork:'',unlock_date:'',video_url:'',audio_url:'',image_url:'',resource_url:''})
 if(action==='remove-lesson'){if(!confirm('Remove this lesson?'))return;model.chapters[a].lessons.splice(Number(b),1)}
 if(action==='add-quiz')(a==='final'?model.final:(model.chapters[a].quiz||=[])).push({q:'',options:['','','',''],answer:'A',explanation:''})
 if(action==='remove-quiz')(a==='final'?model.final:model.chapters[a].quiz).splice(Number(b),1)
 if(action==='add-announcement')model.announcements.push({message:'',status:'published'})
 if(action==='remove-announcement')model.announcements.splice(Number(a),1)
 if(action==='remove-file')model.chapters[a].lessons[b][c]=''
 if(action==='attach-link'){const link=form.querySelector('[data-file-link]');if(!link.value||!link.reportValidity())return;if(!/^https?:\/\//i.test(link.value)){notice(form,'Use an https:// or http:// link.');return};const lesson=model.chapters[form.querySelector('[data-file-chapter]').value]?.lessons[form.querySelector('[data-file-lesson]').value];if(!lesson){notice(form,'Add a chapter and lesson first.');return}lesson[form.querySelector('[data-file-kind]').value]=link.value}
 sync(form)
 if(action.includes('chapter')||action.includes('lesson')||action.includes('classwork')){renderChapters(form);renderFiles(form);renderQuizzes(form)}
 else if(action.includes('quiz'))renderQuizzes(form)
 else if(action.includes('announcement'))renderAnnouncements(form)
 else renderFiles(form)
},true)
document.addEventListener('course-studio-validate',event=>{const form=event.target;if(!states.has(form))return;event.detail.valid=sections.every(([key])=>{const ok=validate(form,key);if(!ok)show(form,key);return ok})})
const observer=new MutationObserver(()=>{if(document.querySelector('#courseAdminForm:not([data-professional])'))requestAnimationFrame(enhance)})
observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('load',enhance);setTimeout(enhance,600)
