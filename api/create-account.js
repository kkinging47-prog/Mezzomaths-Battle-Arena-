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

function safeRole(value) {
  const role = clean(value, 40).toLowerCase().replace(/\s+/g, '_')
  if (role.includes('teacher')) return 'teacher'
  if (role.includes('staff') || role.includes('tutor') || role.includes('mezzo')) return 'mezzo_staff'
  if (role === 'teacher' || role === 'mezzo_staff') return role
  // Admin accounts are never created through public signup. Assign admins manually in Supabase.
  return 'student'
}

function ageFromDob(dob) {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null
  const today = new Date()
  const born = new Date(`${dob}T00:00:00Z`)
  let age = today.getUTCFullYear() - born.getUTCFullYear()
  const m = today.getUTCMonth() - born.getUTCMonth()
  if (m < 0 || (m === 0 && today.getUTCDate() < born.getUTCDate())) age -= 1
  return Number.isFinite(age) ? age : null
}

async function consumeDatabaseRateLimit({ supabaseUrl, serviceKey, action, clientKey, maxAttempts = MAX_ATTEMPTS, windowMinutes = 15 }) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_public_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_action: action,
        p_client_key: clientKey,
        p_max_attempts: maxAttempts,
        p_window_minutes: windowMinutes
      })
    })
    if (!response.ok) return true
    return Boolean(await response.json())
  } catch {
    return true
  }
}

async function upsertProfile({ supabaseUrl, serviceKey, result, metadata, email, role, approvalStatus }) {
  const profile = {
    id: result.id,
    full_name: metadata.full_name || email.split('@')[0] || 'Mezzo User',
    email,
    date_of_birth: metadata.date_of_birth || null,
    age: ageFromDob(metadata.date_of_birth),
    school_name: metadata.school_name || '',
    location: metadata.location || '',
    region: metadata.region || '',
    class_level: metadata.class_level || 'Grade 4',
    curriculum: metadata.curriculum || 'GES',
    academic_term: metadata.academic_term || 'Term 1',
    role,
    approval_status: approvalStatus,
    phone_number: metadata.phone_number || metadata.phone || '',
    updated_at: new Date().toISOString(),
    profile_source: 'create_account_api'
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(profile)
  })

  if (response.ok) return await response.json().catch(() => [profile])

  const error = await response.json().catch(() => ({}))
  if (/column|schema cache|academic_term|approval_status|phone_number|region|profile_source/i.test(error.message || '')) {
    const compatible = {
      id: result.id,
      full_name: profile.full_name,
      email: profile.email,
      school_name: profile.school_name,
      location: profile.location,
      class_level: profile.class_level,
      curriculum: profile.curriculum,
      role: profile.role,
      updated_at: profile.updated_at
    }
    const retry = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(compatible)
    })
    if (retry.ok) return await retry.json().catch(() => [compatible])
  }

  throw new Error(error.message || 'Account was created, but the profile could not be saved.')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = clientAddress(req)
  if (!permitted(ip)) return res.status(429).json({ error: 'Too many signup attempts. Please wait 15 minutes and try again.' })

  const supabaseUrl = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, 300).replace(/\/$/, '')
  const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 3000)
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'Signup fallback is not configured.' })

  const dbAllowed = await consumeDatabaseRateLimit({
    supabaseUrl,
    serviceKey,
    action: 'public_signup',
    clientKey: ip,
    maxAttempts: MAX_ATTEMPTS,
    windowMinutes: 15
  })
  if (!dbAllowed) return res.status(429).json({ error: 'Too many signup attempts. Please wait 15 minutes and try again.' })

  const body = req.body || {}
  const email = clean(body.email, 254).toLowerCase()
  const password = String(body.password || '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
  if (password.length < 6 || password.length > 128) return res.status(400).json({ error: 'Password must contain 6 to 128 characters.' })

  const role = safeRole(body.role)
  const approvalStatus = role === 'mezzo_staff' ? 'pending' : 'approved'
  const metadata = {
    full_name: clean(body.full_name),
    school_name: clean(body.school_name),
    location: clean(body.location),
    region: clean(body.region),
    class_level: clean(body.class_level, 80) || 'Grade 4',
    curriculum: clean(body.curriculum, 80) || 'GES',
    academic_term: clean(body.academic_term, 40) || 'Term 1',
    date_of_birth: clean(body.date_of_birth, 20),
    gender: clean(body.gender, 40),
    support_need: clean(body.support_need, 80),
    access_device: clean(body.access_device, 80),
    connectivity: clean(body.connectivity, 80),
    phone_number: clean(body.phone_number || body.phone, 60),
    role
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: metadata, app_metadata: { mezzo_role: role } })
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = String(result.msg || result.message || result.error_description || 'Account could not be created.')
      const status = /already|registered|exists/i.test(message) ? 409 : response.status
      return res.status(status).json({ error: status === 409 ? 'An account already exists for this email. Please sign in.' : message })
    }

    let profile = []
    try {
      profile = await upsertProfile({ supabaseUrl, serviceKey, result, metadata, email, role, approvalStatus })
    } catch (profileError) {
      return res.status(500).json({ error: profileError.message })
    }

    return res.status(201).json({
      created: true,
      role,
      approval_status: approvalStatus,
      user: { id: result.id, email: result.email },
      profile: Array.isArray(profile) ? profile[0] : profile
    })
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Account service is temporarily unavailable.' })
  }
}
