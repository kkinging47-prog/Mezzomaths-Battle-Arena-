import './admin-topic-question-uploader.css'
import * as XLSX from 'xlsx'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const BANK_KEY = 'mezzo_question_bank'
const LEVELS = ['KG1','KG2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','SHS 1','SHS 2','SHS 3']
const CURRICULA = ['GES', 'Cambridge', 'Pearson Edexcel']
const TOPICS = {
  KG1: ['Pre-number Activities','Counting Objects','Sorting and Matching','Shapes','Patterns','Number Rhymes'],
  KG2: ['Counting 1–50','Number Recognition','Addition Readiness','Subtraction Readiness','Shapes and Space','Measurement Readiness'],
  'Grade 1': ['Addition Worksheet','Addition Table (SD)','Multiplication Table (1–6)','Multiplication Circles','Multiplication Worksheet','Subtraction of numbers (SD)','Subtraction Worksheets','Doubling (SD)','Maths Worksheets'],
  'Grade 2': ['Addition of Numbers','Subtraction of Numbers','Addition of numbers (2d + 1)','Multiplication by 2','Subtraction of numbers (2d − 1)','Graphical multiplication (1 × 1)','Multiplication Table','Addition Table (2d + 1)','Doubling (2D)','Multiplication Trials','Multiplication by 11','Maths Word Problems'],
  'Grade 3': ['Addition of numbers','Subtraction of Numbers','Addition & Subtraction of No’s','Multiplication by Two (2)','Multiplication by Ten (10)','Graphical Multiplication','Sharing in Two (2)','Sharing in tens','Multiplying no’s ending with 0','Lattice Multiplication','Comparing Fractions','Multiplication by 11','Calculation of Time','Summary Worksheet'],
  'Grade 4': ['Addition & Subtraction of No’s','Multiplication by 11 (2 & 3 dw)','Multiplication by 0.5','Division by 0.5','Multiplication by 4 (2 Digits)','Multiplication by 5','Multiplication by 9','Multiplication by 10','Fast Track Subtraction','Consecutive Numbers (3 & 4)','Mezzoscopic zeros','Mezzoscopic ones','Mezzoscopic Fives','Mezzoscopic Fours','Summary Worksheet','Maths Worksheet'],
  'Grade 5': ['Addition & Subtraction of No’s','Multiplying no’s ending with 0','Multiplying no’s ending with 1','Sharing in twos (2)','Sharing in nines (9)','Squaring no’s ending with 5','Squaring no’s ending with 4','Multiplying no’s between 100 & 110','Multiplication by 0.5','Addition of consecutive no’s (5 & 6)','Divisibility Test (2,3 & 4)','Multiplying No’s close to 100','Multiplication by 22','Divisibility Rules (5–8)','Division by 0.5','Multiplication by four (4)','Summary Worksheet'],
  'Grade 6': ['Addition & Subtraction of No’s','Multiplying no’s ending with 5','Squaring no’s ending with 0','Squaring no’s ending with 1','Sharing in fives (5)','Multiplication by nine (9)','Multiplying no’s between 10 & 20','Fast Track Subtraction','Multiplication by five (5)','Squaring no’s between 30 & 50','Multiplying No’s with a difference of 2','Mezzoscopic Four’s','Squaring no’s between 50 & 70','Division by twenty-five (25)','Multiplication by ten (10)','Summary Worksheet'],
  'Grade 7': ['Addition and Subtraction of Numbers','Squaring No’s Ending With 0','Squaring No’s Ending With 1','Squaring No’s Ending With 5','Percentages','Mezzoscopic Tens and Ones','Multiplying by 9','Division by 50','Division by 500','Mult numbers ending with 0','Mult numbers ending with 1','Mult numbers ending with 5','Multiplying by 22','Division by 9','Multiplication by 50','Multiplication by 500','Divisibility Rules (5–10)','Summary Worksheet & Sample B.E.C.E'],
  'Grade 8': ['Understanding Word Problems','Add & Subtraction of numbers','Squaring No’s between 30 & 50','Mult. nos between 100 & 110','Percentages','Mezzoscopic Tens and Ones','Mult. No.s with a difference of 2','Mul numbers between 10 & 20','Squaring No’s between 50 & 70','Multiplying numbers close to 100','Fast track subtraction','Fractions','Divisibility Test (2–12)','General Multiplication','General Division','General Squaring','Division by 2','Summary Worksheet & BECE Sample Questions','Maths Worksheets Trials'],
  'Grade 9': ['BECE Exam Practice','Algebra','Geometry','Statistics','Aptitude & Mental Reasoning','General Multiplication','General Division','General Squaring','Divisibility Rules','Maths Worksheets Trials'],
  'SHS 1': ['Surds & Indices','Sets & Logic','Linear & Quadratic Equations','Coordinate Geometry','Statistics'],
  'SHS 2': ['Functions & Graphs','Trigonometry','Sequences & Series','Probability','Vectors & Mensuration'],
  'SHS 3': ['WASSCE Practice','Advanced Algebra','Calculus Foundations','Statistics','Vectors & Trigonometry']
}
let queued = false
let uploading = false

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function profile() { return readJson('mezzo_profile', {}) || {} }
function isAdmin() { return ['admin','teacher'].includes(profile().role) }
function optionHtml(list, selected) { return list.map(item => `<option value="${escapeHtml(item)}" ${item === selected ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('') }
function inferTopicArea(topic = '') { const t = topic.toLowerCase(); if (t.includes('algebra')) return 'Algebra'; if (t.includes('geometry')) return 'Geometry'; if (t.includes('stat')) return 'Statistics'; if (t.includes('fraction')) return 'Fractions'; if (t.includes('percent')) return 'Percentages'; if (t.includes('division') || t.includes('sharing')) return 'Division'; if (t.includes('subtraction') || t.includes('subtract')) return 'Subtraction'; if (t.includes('add')) return 'Addition'; if (t.includes('squar')) return 'Squaring'; if (t.includes('divisibility')) return 'Divisibility'; if (t.includes('mental') || t.includes('aptitude')) return 'Aptitude & Mental Reasoning'; if (t.includes('multip') || t.includes('mult') || t.includes('mezzoscopic') || t.includes('lattice')) return 'Multiplication'; return 'General Practice' }
function uid() { return `local_${Date.now()}_${Math.random().toString(16).slice(2)}` }
function parseCsv(text) {
  const rows = []
  let row = [], value = '', quote = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i], next = text[i + 1]
    if (ch === '"' && quote && next === '"') { value += '"'; i += 1; continue }
    if (ch === '"') { quote = !quote; continue }
    if (ch === ',' && !quote) { row.push(value); value = ''; continue }
    if ((ch === '\n' || ch === '\r') && !quote) { if (ch === '\r' && next === '\n') i += 1; row.push(value); if (row.some(cell => cell.trim())) rows.push(row); row = []; value = ''; continue }
    value += ch
  }
  row.push(value); if (row.some(cell => cell.trim())) rows.push(row)
  if (rows.length < 2) return []
  const headers = rows.shift().map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return rows.map(cols => Object.fromEntries(headers.map((h, i) => [h, (cols[i] || '').trim()])))
}
function normalizeQuestion(row, defaults) {
  const answer = String(row.correct_answer || row.answer || '').trim().toUpperCase()
  const topic = row.topic || defaults.topic
  return {
    id: row.id || uid(),
    class_level: defaults.class_level,
    curriculum: defaults.curriculum,
    topic,
    topic_area: row.topic_area || inferTopicArea(topic),
    topic_sublevel: row.topic_sublevel || row.subtopic || 'Uploaded by topic',
    difficulty: ({easy:1,medium:2,hard:3})[String(row.difficulty).toLowerCase()] || Number(row.difficulty || 1),
    question_text: row.question_text || row.question || row.q || '',
    numeric_answer: row.numeric_answer === '' || row.numeric_answer == null ? null : Number(row.numeric_answer),
    option_a: row.option_a || row.a || '',
    option_b: row.option_b || row.b || '',
    option_c: row.option_c || row.c || '',
    option_d: row.option_d || row.d || '',
    correct_answer: answer,
    explanation: row.explanation || row.solution || '',
    question_image_url: row.question_image_url || row.image_url || '',
    option_a_image_url: row.option_a_image_url || '',
    option_b_image_url: row.option_b_image_url || '',
    option_c_image_url: row.option_c_image_url || '',
    option_d_image_url: row.option_d_image_url || '',
    source_type: row.source_type || 'topic_upload',
    source_name: row.source_name || 'Admin Topic Upload',
    source_page: row.source_page || '',
    is_active: true
  }
}
function panelHtml() {
  const cls = localStorage.getItem('topic_upload_class') || 'Grade 9'
  const curriculum = localStorage.getItem('topic_upload_curriculum') || 'GES'
  const topic = localStorage.getItem('topic_upload_topic') || (TOPICS[cls] || [])[0] || 'BECE Exam Practice'
  return `<section class="topic-question-uploader glass-card" data-topic-question-uploader="true" data-admin-topic-uploader="true">
    <div class="topic-upload-head"><div><span>📥 Question Bank Upload</span><h2>Upload Questions to the Question Bank</h2><p>Choose the class and curriculum for every question in this upload. Topics in the file are preserved; the selected topic is used when a row has no topic.</p></div><button class="btn btn-blue" type="button" data-refresh-topic-count="true">Refresh Count</button></div>
    <div class="topic-upload-grid">
      <label><span>Class</span><select id="topicUploadClass">${optionHtml(LEVELS, cls)}</select></label>
      <label><span>Curriculum</span><select id="topicUploadCurriculum">${optionHtml(CURRICULA, curriculum)}</select></label>
      <label class="wide"><span>Topic</span><select id="topicUploadTopic">${optionHtml(TOPICS[cls] || [], topic)}</select></label>
    </div>
    <div class="topic-count-grid" data-topic-count-box><article><strong>Database Total</strong><span data-db-total>Check needed</span></article><article><strong>This Topic in DB</strong><span data-db-topic>Check needed</span></article><article><strong>Local Visible Bank</strong><span data-local-total>${readJson(BANK_KEY, []).length}</span></article></div>
    <label class="topic-paste-box"><span>Paste CSV or JSON Questions</span><textarea id="topicUploadText" placeholder="CSV headers: question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, numeric_answer, difficulty"></textarea></label>
    <div class="topic-upload-actions"><label>Choose file<input type="file" id="topicUploadFile" accept=".xlsx,.xls,.csv,.json,.txt"></label><button class="btn btn-blue" type="button" data-bank-template>Download Excel Template</button><button class="btn btn-gold" type="button" data-preview-topic-upload="true">Preview Questions</button><button class="btn btn-primary" type="button" data-save-topic-upload="true">Upload to Question Bank</button></div>
    <div class="topic-upload-preview" id="topicUploadPreview" role="status" aria-live="polite"><p>No preview yet.</p></div>
  </section>`
}
function installPanel() {
  if (!isAdmin()) return
  const admin = document.querySelector('.admin-screen')
  if (!admin || admin.querySelector('[data-topic-question-uploader]')) return
  const target = admin.querySelector('[data-exact-workbook-importer]') || admin.querySelector('[data-workbook-seed-summary]') || admin.querySelector('[data-system-health-panel]') || admin.firstElementChild
  target?.insertAdjacentHTML('afterend', panelHtml())
  refreshCounts()
}
function selectedDefaults() { return { class_level: document.getElementById('topicUploadClass')?.value || 'Grade 9', curriculum: document.getElementById('topicUploadCurriculum')?.value || 'GES', topic: document.getElementById('topicUploadTopic')?.value || 'BECE Exam Practice' } }
function readUploadText() { return document.getElementById('topicUploadText')?.value || '' }
async function readFile() {
  const file = document.getElementById('topicUploadFile')?.files?.[0]
  if (!file) return ''
  return await file.text()
}
async function parseQuestions() {
  const defaults = selectedDefaults()
  const file = document.getElementById('topicUploadFile')?.files?.[0]
  if (file && file.size > 5 * 1024 * 1024) throw new Error('Choose a file smaller than 5 MB.')
  let rows = []
  if (file && /\.(xlsx|xls|csv)$/i.test(file.name)) {
    const workbook = XLSX.read(await file.arrayBuffer(), {type:'array'})
    const sheet = workbook.Sheets[workbook.SheetNames.find(name => name.toLowerCase() === 'questions') || workbook.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(sheet, {defval:'', raw:false})
  } else {
    if (file && !/\.(json|txt)$/i.test(file.name)) throw new Error('Choose an Excel, CSV or JSON file.')
    const text = file ? await file.text() : readUploadText()
    if (!text.trim()) return []
    try { const parsed = JSON.parse(text); rows = Array.isArray(parsed) ? parsed : parsed.questions || [] } catch { rows = parseCsv(text) }
  }
  if (!Array.isArray(rows) || rows.length > 1000) throw new Error('Upload between 1 and 1,000 questions at a time.')
  const errors = [], seen = new Set()
  const list = rows.map((raw,index) => {
    const row = Object.fromEntries(Object.entries(raw).map(([key,value]) => [key.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''),String(value??'').trim()]))
    const q = normalizeQuestion(row, defaults), line = index + 2
    for (const key of ['question_text','option_a','option_b','option_c','option_d']) if (!q[key]) errors.push(`Row ${line}: ${key} is required.`)
    if (!/^[ABCD]$/.test(q.correct_answer)) errors.push(`Row ${line}: correct_answer must be A, B, C or D.`)
    if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 20) errors.push(`Row ${line}: difficulty must be an integer from 1 to 20.`)
    if (q.numeric_answer !== null && !Number.isFinite(q.numeric_answer)) errors.push(`Row ${line}: numeric_answer must be a number.`)
    for (const key of Object.keys(q).filter(key=>key.endsWith('_url'))) if(q[key]) { try { if(new URL(q[key]).protocol !== 'https:') throw Error() } catch {errors.push(`Row ${line}: ${key} must be an HTTPS image URL.`)} }
    const signature = JSON.stringify([q.question_text,q.option_a,q.option_b,q.option_c,q.option_d,q.question_image_url])
    if(seen.has(signature)) errors.push(`Row ${line}: duplicate question in this file.`)
    seen.add(signature)
    return q
  })
  if(errors.length) throw new Error(errors.slice(0,20).join('\n') + (errors.length>20?'\nMore errors exist. Correct the file and retry.':''))
  return list
}
function showUploadError(error) {
  const box=document.getElementById('topicUploadPreview')
  if(box) {box.textContent=error.message;box.style.whiteSpace='pre-line'}
}
function downloadBankTemplate() {
  const workbook=XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet([{question_text:'What is 12 × 8?',option_a:'86',option_b:'96',option_c:'108',option_d:'120',correct_answer:'B',explanation:'12 × 8 = 96.',topic:'Multiplication',topic_area:'Multiplication',difficulty:1,numeric_answer:96,question_image_url:'',option_a_image_url:'',option_b_image_url:'',option_c_image_url:'',option_d_image_url:''}]),'Questions')
  XLSX.writeFile(workbook,'Mezzo_Question_Bank_Template.xlsx')
}
async function previewQuestions() {
  const list = await parseQuestions()
  const box = document.getElementById('topicUploadPreview')
  if (!box) return
  box.innerHTML = list.length ? `<strong>${list.length} question(s) ready.</strong>${list.slice(0, 5).map(q => `<div><b>${escapeHtml(q.class_level)} • ${escapeHtml(q.topic)}</b><span>${escapeHtml(q.question_text)}</span><small>Answer: ${escapeHtml(q.correct_answer)}</small></div>`).join('')}` : '<p>No valid questions found. Check your CSV/JSON columns.</p>'
}
async function saveUpload() {
  if(uploading) return
  uploading=true
  const button=document.querySelector('[data-save-topic-upload]')
  if(button) button.disabled=true
  try {
    const list=await parseQuestions()
    const defaults=list[0] || selectedDefaults()
    if(!list.length) throw new Error('Choose a file or paste questions first.')
    if(!supabase || !isSupabaseConfigured) throw new Error('The database is unavailable. No questions were imported.')
    const {data:{user},error:authError}=await supabase.auth.getUser()
    if(authError || !user) throw new Error('Sign in as an administrator before uploading.')
    const payload=list.map(({id,...q})=>({...q,created_by:user.id}))
    const {data,error}=await supabase.from('question_bank').insert(payload).select('*')
    if(error) throw new Error('Nothing was imported. '+error.message)
    try { saveJson(BANK_KEY,[...data,...readJson(BANK_KEY,[])]) } catch {}
    const message=`${data.length} questions uploaded successfully to ${defaults.class_level} · ${defaults.curriculum}.`
    document.getElementById('topicUploadPreview').textContent=message
    document.getElementById('topicUploadFile').value=''
    document.getElementById('topicUploadText').value=''
    window.alert(message)
    await refreshCounts()
  } catch(error) {showUploadError(error)} finally {uploading=false;if(button)button.disabled=false}
}
async function refreshCounts() {
  const defaults = selectedDefaults()
  const local = readJson(BANK_KEY, [])
  document.querySelector('[data-local-total]') && (document.querySelector('[data-local-total]').textContent = String(local.length))
  if (!supabase || !isSupabaseConfigured) {
    document.querySelector('[data-db-total]') && (document.querySelector('[data-db-total]').textContent = 'Supabase not configured')
    document.querySelector('[data-db-topic]') && (document.querySelector('[data-db-topic]').textContent = 'Supabase not configured')
    return
  }
  const total = await supabase.from('question_bank').select('id', { count: 'exact', head: true }).eq('is_active', true)
  const topic = await supabase.from('question_bank').select('id', { count: 'exact', head: true }).eq('class_level', defaults.class_level).eq('curriculum', defaults.curriculum).eq('topic', defaults.topic).eq('is_active', true)
  document.querySelector('[data-db-total]') && (document.querySelector('[data-db-total]').textContent = total.error ? total.error.message : String(total.count || 0))
  document.querySelector('[data-db-topic]') && (document.querySelector('[data-db-topic]').textContent = topic.error ? topic.error.message : String(topic.count || 0))
}
function updateTopicOptions() {
  const cls = document.getElementById('topicUploadClass')?.value || 'Grade 9'
  localStorage.setItem('topic_upload_class', cls)
  const topicSelect = document.getElementById('topicUploadTopic')
  if (topicSelect) topicSelect.innerHTML = optionHtml(TOPICS[cls] || [], (TOPICS[cls] || [])[0])
}
function sync() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; installPanel() }) }

document.addEventListener('change', event => {
  if (event.target?.id === 'topicUploadClass') { updateTopicOptions(); refreshCounts() }
  if (event.target?.id === 'topicUploadCurriculum') { localStorage.setItem('topic_upload_curriculum', event.target.value); refreshCounts() }
  if (event.target?.id === 'topicUploadTopic') { localStorage.setItem('topic_upload_topic', event.target.value); refreshCounts() }
  if (event.target?.id === 'topicUploadFile') previewQuestions().catch(showUploadError)
}, true)

document.addEventListener('click', event => {
  if (event.target.closest('[data-bank-template]')) { event.preventDefault(); downloadBankTemplate(); return }
  if (event.target.closest('[data-preview-topic-upload]')) { event.preventDefault(); previewQuestions().catch(showUploadError); return }
  if (event.target.closest('[data-save-topic-upload]')) { event.preventDefault(); saveUpload(false); return }
  if (event.target.closest('[data-replace-topic-upload]')) { event.preventDefault(); saveUpload(true); return }
  if (event.target.closest('[data-refresh-topic-count]')) { event.preventDefault(); refreshCounts(); return }
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', sync)
setTimeout(sync, 350)
