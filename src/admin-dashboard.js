import './admin-dashboard.css'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const areas = [
  ['overview','Overview','A snapshot of the app'],
  ['users','Users & roles','Edit accounts and status'],
  ['editors','BECE editors','Assign question editors'],
  ['sunday','Sunday BECE sets','Plan, edit and schedule Sunday sets'],
  ['bece','BECE questions','Upload and edit questions'],
  ['control','Control centre','Settings and health'],
  ['questions','Question bank','Create and edit questions'],
  ['audience','Page & user statistics','Accounts and activity'],
  ['performance','Performance statistics','Learning outcomes'],
  ['export','Email or print','Export reports'],
  ['junior','Mezzo Junior','Early years tools'],
  ['courses','Courses','Course builder'],
  ['impact','Donor impact','Reach and outcomes']
]
const mappings = [
  ['[data-sunday-editor-admin-root]','editors'],
  ['[data-sunday-editor-root], [data-sunday-question-editor], [data-bece-admin-panel], [data-bece-settings-panel], .bece-settings-panel','bece'],
  ['[data-admin-brand-staff-panel], [data-admin-health-panel], [data-production-readiness]','control'],
  ['[data-junior-admin]','junior'],
  ['[data-course-admin-panel], .course-admin-panel','courses'],
  ['[data-donor-impact-dashboard]','impact'],
  ['[data-learner-intelligence-admin]','audience'],
  ['[data-admin-topic-uploader], [data-exact-workbook-importer], [data-excel-question-upload], [data-workbook-question-selector], [data-workbook-seed-summary], .workbook-seed-summary, #adminQuestionForm, #aiGenerateForm, .question-manager','questions']
]
const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } }
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
let current='overview', users=[], sessions=[], events=[], pageViews=[], pageViewCount=0, loaded=false, loading=false, error='', search='', filter='all', page=0, queued=false
let lastTracked='', lastGuestAt=0, tracking=false

function shell() {
  return `<section class="admin-dashboard" data-admin-dashboard><aside class="admin-side"><div class="admin-brand"><span>MEZZO MATHS</span><strong>Administration</strong><small>Battle Arena · Admin workspace</small></div><nav aria-label="Admin sections">${areas.map(([key,label])=>`<button type="button" data-admin-go="${key}">${esc(label)}</button>`).join('')}</nav></aside><div class="admin-main"><header class="admin-header"><div><small>ADMINISTRATOR WORKSPACE / <span data-admin-crumb>OVERVIEW</span></small><h1 data-admin-title>Overview</h1><p data-admin-subtitle>A snapshot of the app</p></div><div class="admin-header-actions"><button type="button" data-admin-reload>Refresh data</button><button type="button" class="admin-open-app" data-admin-open-app>Open web app ↗</button></div></header><div data-admin-content></div><div data-admin-parking></div></div></section>`
}
const stat = (value,label,sub='') => `<article class="admin-stat"><strong>${esc(value)}</strong><span>${esc(label)}</span><small>${esc(sub)}</small></article>`
const warning = () => !isSupabaseConfigured ? '<p class="admin-note">The database is not connected; live figures and user editing are unavailable.</p>' : error ? `<p class="admin-note">${esc(error)}</p>` : ''
function overview() {
  return `${warning()}<div class="admin-stats">${stat(loaded?users.length:'—','Registered users')}${stat(loaded?users.filter(u=>u.role==='student').length:'—','Students')}${stat(loaded?users.filter(u=>['teacher','mezzo_staff'].includes(u.role)).length:'—','Teachers & tutors')}${stat(loaded?sessions.length:'—','Recent sessions','Latest 200')}</div><h2>Manage the platform</h2><div class="admin-links">${areas.slice(1,10).map(([key,label,desc])=>`<button type="button" data-admin-go="${key}"><strong>${esc(label)}</strong><span>${esc(desc)}</span><b>Open →</b></button>`).join('')}</div>`
}
function people() {
  const match=users.filter(u=>(filter==='all'||u.role===filter)&&[u.full_name,u.email,u.school_name,u.location].some(v=>String(v||'').toLowerCase().includes(search.toLowerCase())))
  const rows=match.slice(page*20,(page+1)*20)
  return `${warning()}<h2>Users & roles</h2><p>Edit names, school, location, role and approval status. The changes save to Supabase.</p><div class="admin-filters"><label>Search<input data-admin-search type="search" placeholder="Name, email, school or location" value="${esc(search)}"></label><label>Role<select data-admin-filter><option value="all">All roles</option>${[['student','Student'],['teacher','School Teacher'],['mezzo_staff','Mezzo Tutor'],['admin','Admin']].map(([v,t])=>`<option value="${v}" ${filter===v?'selected':''}>${t}</option>`).join('')}</select></label></div><div class="admin-users">${rows.map(u=>`<form data-admin-user="${esc(u.id)}"><div class="admin-user-label"><strong>${esc(u.full_name||'Unnamed user')}</strong><small>${esc(u.email||'No email')} · ${u.created_at?new Date(u.created_at).toLocaleDateString():'—'}</small></div><div class="admin-user-fields"><label>Name<input name="full_name" required value="${esc(u.full_name)}"></label><label>School<input name="school_name" value="${esc(u.school_name)}"></label><label>Location<input name="location" value="${esc(u.location)}"></label><label>Role<select name="role">${[['student','Student'],['teacher','School Teacher'],['mezzo_staff','Mezzo Tutor'],['admin','Admin']].map(([v,t])=>`<option value="${v}" ${u.role===v?'selected':''}>${t}</option>`).join('')}</select></label><label>Status<select name="approval_status">${['approved','pending','rejected'].map(v=>`<option value="${v}" ${u.approval_status===v?'selected':''}>${v}</option>`).join('')}</select></label><button type="submit">Save changes</button></div></form>`).join('')||'<p>No matching users found.</p>'}</div><div class="admin-pager"><span>${match.length?page*20+1:0}–${Math.min((page+1)*20,match.length)} of ${match.length}</span><button type="button" data-admin-page="prev" ${page===0?'disabled':''}>Previous</button><button type="button" data-admin-page="next" ${(page+1)*20>=match.length?'disabled':''}>Next</button></div>`
}
function audience() {
  const top=Object.entries(pageViews.reduce((a,v)=>{a[v.page_key]=(a[v.page_key]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,8)
  return `${warning()}<h2>Page & user statistics</h2><p>Registered accounts, the latest 1,000 access events, and authenticated page views recorded since this update.</p><div class="admin-stats">${stat(loaded?users.length:'—','Users')}${stat(loaded?events.filter(e=>e.event_type==='signup').length:'—','Recent signups')}${stat(loaded?events.filter(e=>e.event_type==='login').length:'—','Recent logins')}${stat(loaded?pageViewCount:'—','Page views','Signed-in visitors')}</div><div class="admin-stats">${stat(loaded?new Set(users.map(u=>u.school_name).filter(Boolean)).size:'—','Schools')}${stat(loaded?new Set(users.map(u=>u.region).filter(Boolean)).size:'—','Regions')}</div><h2>Popular pages</h2><p>Breakdown of the latest 1,000 recorded visits.</p><div class="admin-report">${top.map(([key,n])=>`<div><span>${esc(key)}</span><strong>${n} visits</strong></div>`).join('')||'<p>No visits recorded yet.</p>'}</div>`
}
function performance() {
  const done=sessions.filter(s=>s.completed_at),avg=done.length?Math.round(done.reduce((n,s)=>n+Number(s.score||0)/Math.max(1,Number(s.question_count||1)),0)/done.length*100):null
  const groups=Object.entries(done.reduce((a,s)=>{const k=s.practice_type||'Other';a[k]=(a[k]||0)+1;return a},{}))
  return `${warning()}<h2>Performance statistics</h2><p>Based on the latest 200 practice sessions, rather than lifetime totals.</p><div class="admin-stats">${stat(loaded?done.length:'—','Completed sessions')}${stat(loaded?(avg===null?'—':avg+'%'):'—','Average score')}${stat(loaded?new Set(done.map(s=>s.student_id)).size:'—','Active learners')}</div><div class="admin-report">${groups.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${v} sessions</strong></div>`).join('')||'<p>No completed sessions found.</p>'}</div>`
}
function exportsPage() {
  const completed=sessions.filter(s=>s.completed_at)
  return `<h2>Email or print</h2><p>Download a report, print the summary below, or open a prepared email draft.</p><div class="admin-links"><button type="button" data-admin-export="users"><strong>Download users CSV</strong><span>Accounts, roles and schools</span></button><button type="button" data-admin-export="performance"><strong>Download performance CSV</strong><span>Recent practice records</span></button><button type="button" data-admin-print><strong>Print report</strong><span>Browser print or Save as PDF</span></button><button type="button" data-admin-email><strong>Email summary</strong><span>Open a draft in your email app</span></button></div><div class="admin-print-summary"><h2>Mezzo Maths Battle Arena · Administration summary</h2><p>Generated ${new Date().toLocaleDateString()}. Practice results cover the latest 200 sessions.</p><div class="admin-stats">${stat(loaded?users.length:'—','Registered users')}${stat(loaded?completed.length:'—','Completed practice sessions')}${stat(loaded?pageViewCount:'—','Authenticated page views')}</div></div><p class="admin-note">The email button opens a draft. It does not send a message automatically.</p>`
}
function toolPage() {
  const title=areas.find(([key])=>key===current)
  return `<h2>${esc(title?.[1])}</h2><p>${esc(title?.[2])}. Use the tools below.</p><div data-admin-tool-slot="${current}"></div>`
}
function show(root) {
  const meta=areas.find(([key])=>key===current)||areas[0]
  root.dataset.area=current
  const title=root.querySelector('[data-admin-title]'),crumb=root.querySelector('[data-admin-crumb]'),subtitle=root.querySelector('[data-admin-subtitle]')
  if(title.textContent!==meta[1])title.textContent=meta[1]
  if(crumb.textContent!==meta[1].toUpperCase())crumb.textContent=meta[1].toUpperCase()
  if(subtitle.textContent!==meta[2])subtitle.textContent=meta[2]
  root.querySelectorAll('[data-admin-go]').forEach(b=>{b.classList.toggle('active',b.dataset.adminGo===current);if(b.dataset.adminGo===current)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')})
  const content=root.querySelector('[data-admin-content]')
  const slot=root.querySelector('[data-admin-parking]')
  const sundayMount=root.parentElement.querySelector('[data-sunday-permission-mount]')
  const signature=[current,loaded,users.length,sessions.length,events.length,pageViewCount,search,filter,page,error].join('|')
  if(content.dataset.signature!==signature){
    // Move it only when replacing the page that currently owns it.
    if(sundayMount && content.contains(sundayMount))slot.appendChild(sundayMount)
    content.innerHTML=current==='overview'?overview():current==='users'?people():current==='audience'?audience():current==='performance'?performance():current==='export'?exportsPage():toolPage()
    content.dataset.signature=signature
  }
  const screen=root.parentElement
  for(const child of [...screen.children]){
    if(child===root||child.classList.contains('dashboard-hero')||child.matches('[data-admin-control-hub]'))continue
    if(!child.dataset.adminPanel){const m=mappings.find(([selector])=>child.matches(selector)||child.querySelector(selector));child.dataset.adminPanel=m?.[1]||'control'}
    slot.appendChild(child)
  }
  for(const child of slot.children){
    const m=mappings.find(([selector])=>child.matches(selector)||child.querySelector(selector))
    if(m)child.dataset.adminPanel=m[1]
    else if(!child.dataset.adminPanel)child.dataset.adminPanel='control'
    child.hidden=child.dataset.adminPanel!==current
  }
  if(['editors','sunday'].includes(current)){
    const destination=content.querySelector(`[data-admin-tool-slot="${current}"]`)
    const mount=screen.querySelector('[data-sunday-permission-mount]')
    if(destination&&mount){if(mount.parentElement!==destination)destination.appendChild(mount);mount.hidden=false}
  }
}
function install(){
  const screen=document.querySelector('.admin-screen')
  if(!screen||read('mezzo_profile')?.role!=='admin'||!screen.querySelector('.dashboard-hero'))return
  screen.querySelector('.dashboard-hero').hidden=true
  screen.querySelector('[data-admin-control-hub]')?.setAttribute('hidden','')
  let root=screen.querySelector('[data-admin-dashboard]')
  if(!root){screen.insertAdjacentHTML('afterbegin',shell());root=screen.querySelector('[data-admin-dashboard]');loaded=false;load()}
  show(root)
}
async function load(){
  if(loading||!supabase||!isSupabaseConfigured)return
  loading=true;error=''
  try{
    const {data:auth}=await supabase.auth.getUser()
    if(!auth?.user)throw new Error('Sign in again to load administration data.')
    const [p,s,a,v]=await Promise.all([
      (async()=>{const rows=[];for(let offset=0;;offset+=1000){const result=await supabase.from('profiles').select('id,full_name,email,school_name,location,region,role,approval_status,created_at').order('created_at',{ascending:false}).range(offset,offset+999);if(result.error)return result;rows.push(...(result.data||[]));if((result.data||[]).length<1000)break}return {data:rows}})(),
      supabase.from('practice_sessions').select('student_id,practice_type,score,question_count,completed_at,started_at').order('started_at',{ascending:false}).limit(200),
      supabase.from('auth_access_records').select('event_type,occurred_at').order('occurred_at',{ascending:false}).limit(1000),
      supabase.from('app_page_views').select('page_key',{count:'exact'}).order('occurred_at',{ascending:false}).limit(1000)
    ])
    if(p.error)throw p.error
    users=p.data||[];sessions=s.error?[]:(s.data||[]);events=a.error?[]:(a.data||[]);pageViews=v.error?[]:(v.data||[]);pageViewCount=v.error?0:(v.count||0);loaded=true
    if(s.error||a.error||v.error)error=[s.error&&'Performance: '+s.error.message,a.error&&'Access records: '+a.error.message,v.error&&'Page views: '+v.error.message].filter(Boolean).join('; ')
  }catch(e){error=e.message||'Could not load admin data.'}finally{loading=false;queue()}
}
async function saveUser(form){
  const id=form.dataset.adminUser,previous=users.find(u=>u.id===id)
  if(!previous||!supabase)return
  const f=Object.fromEntries(new FormData(form))
  if(id===read('mezzo_profile')?.id&&previous.role==='admin'&&f.role!=='admin'){alert('You cannot remove your own administrator role.');return}
  if(f.role==='admin'&&previous.role!=='admin'&&!confirm(`Give ${previous.email} full administrator access?`))return
  const button=form.querySelector('[type=submit]');button.disabled=true;button.textContent='Saving…'
  const values={full_name:f.full_name.trim(),school_name:f.school_name.trim(),location:f.location.trim(),role:f.role,approval_status:f.approval_status}
  const {data,error:e}=await supabase.from('profiles').update(values).eq('id',id).select('id,full_name,email,school_name,location,region,role,approval_status,created_at').single()
  button.disabled=false;button.textContent='Save changes'
  if(e){alert('Could not save user: '+e.message);return}
  users=users.map(u=>u.id===id?data:u);form.querySelector('.admin-user-label strong').textContent=data.full_name;alert('User details saved.')
}
function csv(items,columns,name){
  const cell=v=>`"${String(v??'').replace(/^[=+\-@\t\r]/,"'$&").replace(/"/g,'""')}"`
  const blob=new Blob([[columns.map(([label])=>cell(label)).join(','),...items.map(x=>columns.map(([,key])=>cell(x[key])).join(','))].join('\r\n')],{type:'text/csv;charset=utf-8'})
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})}
async function trackNavigation(){
  if(!supabase||!isSupabaseConfigured||tracking||Date.now()-lastGuestAt<30000)return
  const name=document.querySelector('.active-title p')?.textContent?.trim()
  if(!name)return
  const now=Date.now()
  if(name===lastTracked)return
  tracking=true
  try{
    const {data}=await supabase.auth.getUser()
    if(data?.user){
      const {error:insertError}=await supabase.from('app_page_views').insert({user_id:data.user.id,page_key:name.slice(0,60)})
      if(!insertError)lastTracked=name
    } else lastGuestAt=now
  }catch(e){console.warn('Page tracking unavailable',e?.message)}finally{tracking=false}
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-admin-open-app]')){e.preventDefault();document.querySelector('.screen-tabs [data-target="home"]')?.click();return}
  const go=e.target.closest('[data-admin-go]');if(go){e.preventDefault();current=go.dataset.adminGo;page=0;queue();return}
  if(e.target.closest('[data-admin-reload]')){loaded=false;load();return}
  const p=e.target.closest('[data-admin-page]');if(p){page=Math.max(0,page+(p.dataset.adminPage==='next'?1:-1));queue();return}
  const x=e.target.closest('[data-admin-export]');if(x){if(x.dataset.adminExport==='users')csv(users,[['Name','full_name'],['Email','email'],['Role','role'],['Status','approval_status'],['School','school_name'],['Location','location']],'mezzo-users.csv');else csv(sessions,[['Learner ID','student_id'],['Type','practice_type'],['Score','score'],['Questions','question_count'],['Completed','completed_at']],'mezzo-performance.csv');return}
  if(e.target.closest('[data-admin-print]')){window.print();return}
  if(e.target.closest('[data-admin-email]'))window.location.href='mailto:?subject='+encodeURIComponent('Mezzo Maths Battle Arena admin summary')+'&body='+encodeURIComponent(`Users: ${loaded?users.length:'unavailable'}\nRecent practice sessions: ${loaded?sessions.length:'unavailable'}`)
},true)
document.addEventListener('input',e=>{if(e.target.matches('[data-admin-search]')){const pos=e.target.selectionStart;search=e.target.value;page=0;queue();requestAnimationFrame(()=>{const input=document.querySelector('[data-admin-search]');input?.focus();input?.setSelectionRange(pos,pos)})}},true)
document.addEventListener('change',e=>{if(e.target.matches('[data-admin-filter]')){filter=e.target.value;page=0;queue()}},true)
document.addEventListener('submit',e=>{const form=e.target.closest('[data-admin-user]');if(!form)return;e.preventDefault();e.stopImmediatePropagation();saveUser(form)},true)
new MutationObserver(()=>{queue();trackNavigation()}).observe(document.body,{childList:true,subtree:true})
window.addEventListener('load',queue)
window.addEventListener('storage',queue)
setTimeout(()=>{queue();trackNavigation()},450)
