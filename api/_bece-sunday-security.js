import crypto from 'node:crypto'

function secret() {
  const value = String(process.env.BECE_SUNDAY_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!value) throw new Error('Sunday BECE server security is not configured.')
  return value
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

export function signTrialSession(payload) {
  const body = encode(payload)
  const signature = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function verifyTrialSession(token) {
  const [body, supplied] = String(token || '').split('.')
  if (!body || !supplied) throw new Error('Invalid trial session.')
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  const a = Buffer.from(supplied)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid trial session.')
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  if (!payload?.ids?.length || !Number.isInteger(payload.index)) throw new Error('Invalid trial session.')
  if (Date.now() > Number(payload.expiresAt || 0)) throw new Error('Trial session expired.')
  return payload
}

export function sundayWindowOpen(now = new Date()) {
  return now.getUTCDay() === 0 && now.getUTCHours() >= 18 && now.getUTCHours() < 20
}

export function safeQuestion(row) {
  return {
    id: row.id,
    topic: row.topic || 'BECE Mathematics',
    topic_area: row.topic_area || row.topic || 'BECE Mathematics',
    question_text: row.question_text || '',
    question_image_url: row.question_image_url || '',
    options: [row.option_a || '', row.option_b || '', row.option_c || '', row.option_d || ''],
    option_image_urls: [
      row.option_a_image_url || '',
      row.option_b_image_url || '',
      row.option_c_image_url || '',
      row.option_d_image_url || ''
    ]
  }
}

export async function supabaseRows(query) {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '')
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) throw new Error('Sunday BECE question service is not configured.')
  const response = await fetch(`${url}/rest/v1/${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  })
  const data = await response.json().catch(() => [])
  if (!response.ok) throw new Error(data?.message || 'Unable to load Sunday BECE questions.')
  return data
}

export async function requireSundayAdmin(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new Error('Sign in as an administrator to preview a set.')
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '')
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) throw new Error('Sunday BECE question service is not configured.')
  const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } })
  const user = await auth.json().catch(() => ({}))
  if (!auth.ok || !user.id) throw new Error('Your sign-in session has expired. Sign in again.')
  const profiles = await supabaseRows(`profiles?select=role&id=eq.${encodeURIComponent(user.id)}&limit=1`)
  if (profiles[0]?.role !== 'admin') throw new Error('Only administrators can preview or analyse sets.')
  return user
}

export const SUNDAY_QUESTION_COLUMNS = [
  'id','topic','topic_area','question_text','question_image_url',
  'option_a','option_b','option_c','option_d',
  'option_a_image_url','option_b_image_url','option_c_image_url','option_d_image_url',
  'correct_answer','explanation','status'
].join(',')
