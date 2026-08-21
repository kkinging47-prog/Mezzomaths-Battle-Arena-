const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 6
const attempts = new Map()

function clientAddress(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
}

function permitted(ip) {
  const now = Date.now()
  const recent = (attempts.get(ip) || []).filter(time => now - time < WINDOW_MS)
  if (recent.length >= MAX_ATTEMPTS) return false
  recent.push(now)
  attempts.set(ip, recent)
  return true
}

function clean(value, limit = 160) {
  return String(value || '').trim().slice(0, limit)
}

function safeRole() {
  // Public signup never grants privileged roles. Administrators can promote
  // verified accounts later from the protected admin workflow.
  return 'student'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!permitted(clientAddress(req))) return res.status(429).json({ error: 'Too many signup attempts. Please wait 15 minutes and try again.' })

  const supabaseUrl = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, 300).replace(/\/$/, '')
  const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 3000)
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'Signup fallback is not configured.' })

  const body = req.body || {}
  const email = clean(body.email, 254).toLowerCase()
  const password = String(body.password || '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
  if (password.length < 6 || password.length > 128) return res.status(400).json({ error: 'Password must contain 6 to 128 characters.' })

  const role = safeRole()
  const metadata = {
    full_name: clean(body.full_name),
    school_name: clean(body.school_name),
    location: clean(body.location),
    region: clean(body.region),
    class_level: clean(body.class_level, 80),
    curriculum: clean(body.curriculum, 80),
    academic_term: clean(body.academic_term, 40),
    date_of_birth: clean(body.date_of_birth, 20),
    gender: clean(body.gender, 40),
    support_need: clean(body.support_need, 80),
    access_device: clean(body.access_device, 80),
    connectivity: clean(body.connectivity, 80),
    role
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: metadata })
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = String(result.msg || result.message || result.error_description || 'Account could not be created.')
      const status = /already|registered|exists/i.test(message) ? 409 : response.status
      return res.status(status).json({ error: status === 409 ? 'An account already exists for this email. Please sign in.' : message })
    }
    return res.status(201).json({ created: true, user: { id: result.id, email: result.email } })
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Account service is temporarily unavailable.' })
  }
}
