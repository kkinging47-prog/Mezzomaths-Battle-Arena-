export const reportEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export const schoolKey=name=>String(name||'School not provided').trim().toLowerCase().replace(/\s+/g,' ')
export const reportTime=value=>value==null?'—':`${Math.floor(value/60)}m ${String(value%60).padStart(2,'0')}s`
const number=value=>Number.isFinite(Number(value))?Number(value):0
const resultOrder=(a,b)=>b.score-a.score||a.time_taken_seconds-b.time_taken_seconds||String(a.completed_at).localeCompare(String(b.completed_at))||String(a.candidate_id).localeCompare(String(b.candidate_id))
export function buildSchoolReports(registrations,claims,{week,mode='sunday'}={}) {
 const byId=new Map(registrations.map(r=>[r.candidate_id,r]))
 const submitted=claims.filter(c=>c.completed_at&&number(c.total)>0).map(c=>({...c,score:number(c.score),total:number(c.total),time_taken_seconds:number(c.time_taken_seconds)||Math.max(0,Math.floor((Date.parse(c.completed_at)-Date.parse(c.claimed_at))/1000))})).sort(resultOrder)
 const ranks=new Map(submitted.map((c,i)=>[c.candidate_id,i+1]))
 const identities=new Map()
 for(const r of registrations) {
  if(!r.candidate_id) continue
  const identity=r.identity_key||r.candidate_id
  if(!identities.has(identity)) identities.set(identity,{registrations:[],claims:[]})
  identities.get(identity).registrations.push(r)
 }
 for(const c of claims) {const r=byId.get(c.candidate_id);if(r) identities.get(r.identity_key||r.candidate_id).claims.push(c)}
 const groups=new Map()
 for(const entry of identities.values()) {
  const done=entry.claims.filter(c=>c.completed_at&&number(c.total)>0).sort((a,b)=>String(a.completed_at).localeCompare(String(b.completed_at)))
  const chosen=done[0]||entry.claims.slice().sort((a,b)=>String(a.claimed_at).localeCompare(String(b.claimed_at)))[0]
  const r=chosen?byId.get(chosen.candidate_id):entry.registrations[0]
  const row={candidate_id:chosen?.candidate_id||r.candidate_id,full_name:String(r.full_name||'Candidate').trim(),class_level:r.class_level||'',school_name:String(r.school_name||'School not provided').trim(),region:r.region||'',status:done.length?'Submitted':chosen?'Not submitted':'Not started',score:done.length?number(chosen.score):null,total:done.length?number(chosen.total):null,percent:done.length?100*number(chosen.score)/number(chosen.total):null,time_taken_seconds:done.length?(number(chosen.time_taken_seconds)||Math.max(0,Math.floor((Date.parse(chosen.completed_at)-Date.parse(chosen.claimed_at))/1000))):null,weekly_rank:done.length?ranks.get(chosen.candidate_id):null,started_at:chosen?.claimed_at||null,completed_at:chosen?.completed_at||null,topics:done.length?(chosen.topics||{}):{},registration_count:entry.registrations.length,started_sessions:entry.claims.length,submitted_sessions:done.length}
  const key=schoolKey(row.school_name)
  if(!groups.has(key)) groups.set(key,{school_key:key,school_name:row.school_name,students:[]})
  groups.get(key).students.push(row)
 }
 const schools=[...groups.values()].sort((a,b)=>a.school_name.localeCompare(b.school_name))
 for(const school of schools) {
  school.students.sort((a,b)=>a.status==='Submitted'&&b.status==='Submitted'?resultOrder(a,b):a.status==='Submitted'?-1:b.status==='Submitted'?1:a.full_name.localeCompare(b.full_name))
  let position=0
  school.students.forEach(row=>{row.school_rank=row.status==='Submitted'?++position:null})
  const done=school.students.filter(r=>r.status==='Submitted')
  const topics={}
  done.forEach(row=>Object.entries(row.topics).forEach(([topic,stats])=>{topics[topic]||={total:0,correct:0};topics[topic].total+=number(stats.total);topics[topic].correct+=number(stats.correct)}))
  school.summary={registered:school.students.length,started:school.students.filter(r=>r.started_sessions).length,submitted:done.length,not_submitted:school.students.filter(r=>r.status==='Not submitted').length,not_started:school.students.filter(r=>r.status==='Not started').length,average_score:done.length?done.reduce((n,r)=>n+r.score,0)/done.length:null,average_percent:done.length?done.reduce((n,r)=>n+r.percent,0)/done.length:null,highest_score:done.length?Math.max(...done.map(r=>r.score)):null,duplicate_profiles:school.students.filter(r=>r.registration_count>1||r.started_sessions>1).length}
  school.topics=Object.entries(topics).map(([topic,stats])=>({topic,...stats,accuracy:stats.total?100*stats.correct/stats.total:0})).sort((a,b)=>a.accuracy-b.accuracy||a.topic.localeCompare(b.topic))
 }
 return {week,mode,schools,weekly_submissions:submitted.length,summary:{schools:schools.length,registered:schools.reduce((n,s)=>n+s.summary.registered,0),started:schools.reduce((n,s)=>n+s.summary.started,0),submitted:schools.reduce((n,s)=>n+s.summary.submitted,0),sessions:claims.length}}
}
function csvCell(value) {let s=String(value??'');if(typeof value==='string'&&/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
export function schoolReportCsv(report,schools=report.schools) {
 const rows=[['Week','Mode','School','Student','Class','Status','Score','Out of','Percentage','Time seconds','School rank','Overall weekly rank','Duplicate profile review']]
 schools.forEach(s=>s.students.forEach(r=>rows.push([report.week,report.mode,s.school_name,r.full_name,r.class_level,r.status,r.score,r.total,r.percent==null?'':r.percent.toFixed(1),r.time_taken_seconds,r.school_rank,r.weekly_rank,r.registration_count>1||r.started_sessions>1?'Review duplicate profiles':''])))
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')
}
export function schoolReportHtml(report,school) {
 const e=reportEscape,s=school.summary
 const rows=school.students.map(r=>`<tr><td>${e(r.full_name)}</td><td>${e(r.class_level)}</td><td>${e(r.status)}</td><td>${r.score==null?'—':r.score+'/'+r.total}</td><td>${r.percent==null?'—':r.percent.toFixed(1)+'%'}</td><td>${e(reportTime(r.time_taken_seconds))}</td><td>${r.school_rank||'—'}</td><td>${r.weekly_rank||'—'}</td></tr>`).join('')
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(school.school_name)} — BECE Report ${e(report.week)}</title><style>body{font-family:Arial,sans-serif;color:#172d49;line-height:1.5;margin:30px}h1,h2{color:#153e7d}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#e8effa}.summary{padding:16px;background:#eff6ff;border-radius:10px}@media print{body{margin:10mm}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body><h1>Mezzo Maths — BECE School Report</h1><h2>${e(school.school_name)}</h2><p>Week: ${e(report.week)} · ${report.mode==='sunday'?'Official Sunday BECE':'Supervised school laboratory'} · ${report.is_final?'Final window closed':'Provisional: examination window open'} · Confidential: intended for the authorised school head.</p><div class="summary">Registered: <b>${s.registered}</b> · Started: <b>${s.started}</b> · Submitted: <b>${s.submitted}</b> · Not submitted: <b>${s.not_submitted}</b> · Not started: <b>${s.not_started}</b><br>Average: <b>${s.average_score==null?'—':s.average_score.toFixed(1)+'/40 ('+s.average_percent.toFixed(1)+'%)'}</b> · Highest score: <b>${s.highest_score==null?'—':s.highest_score+'/40'}</b></div><h3>Student results</h3><table><thead><tr><th>Student</th><th>Class</th><th>Status</th><th>Score</th><th>%</th><th>Time</th><th>School rank</th><th>Overall weekly rank</th></tr></thead><tbody>${rows}</tbody></table><h3>Topic performance</h3>${school.topics.length?'<ul>'+school.topics.map(t=>'<li>'+e(t.topic)+': '+t.correct+'/'+t.total+' correct ('+t.accuracy.toFixed(1)+'%)</li>').join('')+'</ul>':'<p>No submitted topic results available.</p>'}<h3>Recommended follow-up</h3><p>${school.topics.length?'Provide worked examples and targeted practice in '+school.topics.slice(0,3).map(t=>e(t.topic)).join(', ')+'. Review common mistakes with the students.':'Encourage registered students to participate in the next trial.'} Follow up with students who did not start or submit.</p>${s.duplicate_profiles?'<p><strong>Administrative review:</strong> '+s.duplicate_profiles+' student record(s) have duplicate profiles or starts. One completed result per student is shown; original records are retained.</p>':''}<p>Averages use submitted work only. Ranks use score, then shortest completion time. School and candidate names reflect registration details.</p><p>Mezzo House Limited · Mezzo Maths</p></body></html>`
}
