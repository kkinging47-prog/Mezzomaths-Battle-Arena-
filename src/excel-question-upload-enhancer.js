import './excel-question-upload.css'
import * as XLSX from 'xlsx'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const BANK_KEY = 'mezzo_question_bank'
let queued = false

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
function isExcel(file) { return /\.(xlsx|xls)$/i.test(file?.name || '') }
function toast(message) {
  document.querySelector('.excel-upload-toast')?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="excel-upload-toast">${escapeHtml(message)}</div>`)
  setTimeout(() => document.querySelector('.excel-upload-toast')?.remove(), 4200)
}
function inferTopicArea(topic = '') {
  const t = topic.toLowerCase()
  if (t.includes('algebra')) return 'Algebra'
  if (t.includes('geometry')) return 'Geometry'
  if (t.includes('stat')) return 'Statistics'
  if (t.includes('fraction')) return 'Fractions'
  if (t.includes('percent')) return 'Percentages'
  if (t.includes('division') || t.includes('sharing')) return 'Division'
  if (t.includes('subtraction') || t.includes('subtract')) return 'Subtraction'
  if (t.includes('add')) return 'Addition'
  if (t.includes('squar')) return 'Squaring'
  if (t.includes('divisibility')) return 'Divisibility'
  if (t.includes('mental') || t.includes('aptitude')) return 'Aptitude & Mental Reasoning'
  if (t.includes('multip') || t.includes('mult') || t.includes('mezzoscopic') || t.includes('lattice')) return 'Multiplication'
  return 'General Practice'
}
function uid() { return `excel_${Date.now()}_${Math.random().toString(16).slice(2)}` }
function key(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && String(row[name]).trim() !== '') return String(row[name]).trim()
  }
  return ''
}
function selectedDefaults() {
  return {
    class_level: document.getElementById('topicUploadClass')?.value || 'Grade 9',
    curriculum: document.getElementById('topicUploadCurriculum')?.value || 'GES',
    topic: document.getElementById('topicUploadTopic')?.value || 'BECE Exam Practice'
  }
}
function normaliseHeader(name = '') {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}
function sheetRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }).map(row => {
    const clean = {}
    Object.entries(row).forEach(([k, v]) => { clean[normaliseHeader(k)] = v })
    return clean
  })
}
async function parseExcelQuestions() {
  const file = document.getElementById('topicUploadFile')?.files?.[0]
  if (!isExcel(file)) return []
  const defaults = selectedDefaults()
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = sheetRows(sheet)
  return rows.map(row => {
    const topic = key(row, ['topic']) || defaults.topic
    const answer = (key(row, ['correct_answer', 'answer']) || 'A').toUpperCase().slice(0, 1)
    const numeric = key(row, ['numeric_answer'])
    return {
      id: key(row, ['id']) || uid(),
      class_level: key(row, ['class_level', 'class', 'grade']) || defaults.class_level,
      curriculum: key(row, ['curriculum']) || defaults.curriculum,
      topic,
      topic_area: key(row, ['topic_area']) || inferTopicArea(topic),
      topic_sublevel: key(row, ['topic_sublevel', 'subtopic', 'sub_level']) || 'Excel Upload',
      difficulty: Number(key(row, ['difficulty']) || 1),
      question_text: key(row, ['question_text', 'question', 'q']),
      numeric_answer: numeric === '' ? null : Number(numeric),
      option_a: key(row, ['option_a', 'a']),
      option_b: key(row, ['option_b', 'b']),
      option_c: key(row, ['option_c', 'c']),
      option_d: key(row, ['option_d', 'd']),
      correct_answer: ['A','B','C','D'].includes(answer) ? answer : 'A',
      explanation: key(row, ['explanation', 'solution']),
      question_image_url: key(row, ['question_image_url', 'image_url']),
      option_a_image_url: key(row, ['option_a_image_url']),
      option_b_image_url: key(row, ['option_b_image_url']),
      option_c_image_url: key(row, ['option_c_image_url']),
      option_d_image_url: key(row, ['option_d_image_url']),
      source_type: 'excel_upload',
      source_name: file.name,
      source_page: key(row, ['source_page', 'page']),
      is_active: true
    }
  }).filter(q => q.question_text && q.option_a && q.option_b && q.option_c && q.option_d)
}
function previewHtml(list) {
  if (!list.length) return '<p>No valid Excel questions found. Make sure your first row has the right column headings.</p>'
  const sample = list.slice(0, 6).map(q => `<div><b>${escapeHtml(q.class_level)} • ${escapeHtml(q.topic)}</b><span>${escapeHtml(q.question_text)}</span><small>A: ${escapeHtml(q.option_a)} • Answer: ${escapeHtml(q.correct_answer)}</small></div>`).join('')
  return `<strong>${list.length} Excel question(s) ready for upload.</strong>${sample}`
}
async function previewExcel() {
  const list = await parseExcelQuestions()
  const box = document.getElementById('topicUploadPreview')
  if (box) box.innerHTML = previewHtml(list)
}
async function saveExcel(replaceLocal = false) {
  const list = await parseExcelQuestions()
  const defaults = selectedDefaults()
  const box = document.getElementById('topicUploadPreview')
  if (!list.length) { if (box) box.innerHTML = previewHtml(list); return }
  let bank = readJson(BANK_KEY, [])
  if (replaceLocal) bank = bank.filter(q => !(q.class_level === defaults.class_level && q.curriculum === defaults.curriculum && q.topic === defaults.topic))
  saveJson(BANK_KEY, [...list, ...bank])
  let message = `${list.length} Excel question(s) saved locally under ${defaults.topic}.`
  if (supabase && isSupabaseConfigured) {
    const payload = list.map(({ id, ...q }) => ({ ...q, difficulty: Number(q.difficulty || 1), numeric_answer: Number.isFinite(q.numeric_answer) ? q.numeric_answer : null }))
    const { error } = await supabase.from('question_bank').insert(payload)
    message = error ? `${message} Database save failed: ${error.message}` : `${list.length} Excel question(s) saved to Supabase question_bank.`
  } else {
    message = `${message} Supabase is not configured in this browser build.`
  }
  if (box) box.innerHTML = `<p>${escapeHtml(message)}</p>`
  toast(message)
  document.querySelector('[data-refresh-topic-count]')?.click()
}
function downloadTemplate() {
  const defaults = selectedDefaults()
  const rows = [
    {
      class_level: defaults.class_level,
      curriculum: defaults.curriculum,
      topic: defaults.topic,
      question_text: 'What is 12 × 8?',
      option_a: '86',
      option_b: '96',
      option_c: '108',
      option_d: '120',
      correct_answer: 'B',
      explanation: '12 × 8 = 96.',
      numeric_answer: '96',
      difficulty: '1',
      question_image_url: '',
      option_a_image_url: '',
      option_b_image_url: '',
      option_c_image_url: '',
      option_d_image_url: '',
      source_page: ''
    }
  ]
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Questions')
  const array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Mezzo_${defaults.class_level}_${defaults.topic}_questions_template.xlsx`.replace(/[^a-z0-9_.-]+/gi, '_')
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
function enhancePanel() {
  const panel = document.querySelector('[data-topic-question-uploader]')
  const file = document.getElementById('topicUploadFile')
  if (!panel || !file) return
  file.setAttribute('accept', '.xlsx,.xls,.csv,.json,.txt')
  if (!panel.querySelector('[data-excel-upload-help]')) {
    file.insertAdjacentHTML('afterend', '<button class="btn btn-blue excel-template-btn" type="button" data-download-excel-question-template="true">Download Excel Template</button>')
    panel.querySelector('.topic-upload-actions')?.insertAdjacentHTML('afterend', '<div class="excel-upload-help" data-excel-upload-help="true"><b>Excel upload ready:</b> use .xlsx or .xls with columns: class_level, curriculum, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, numeric_answer, difficulty, question_image_url.</div>')
  }
}
function selectedFileIsExcel() { return isExcel(document.getElementById('topicUploadFile')?.files?.[0]) }
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; enhancePanel() })
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-download-excel-question-template]')) { event.preventDefault(); event.stopImmediatePropagation(); downloadTemplate(); return }
  if (!selectedFileIsExcel()) return
  if (event.target.closest('[data-preview-topic-upload]')) { event.preventDefault(); event.stopImmediatePropagation(); previewExcel(); return }
  if (event.target.closest('[data-save-topic-upload]')) { event.preventDefault(); event.stopImmediatePropagation(); saveExcel(false); return }
  if (event.target.closest('[data-replace-topic-upload]')) { event.preventDefault(); event.stopImmediatePropagation(); saveExcel(true); return }
}, true)

document.addEventListener('change', event => {
  if (event.target?.id === 'topicUploadFile' && selectedFileIsExcel()) setTimeout(previewExcel, 100)
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', sync)
setTimeout(sync, 500)
