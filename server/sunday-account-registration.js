const clean = (value, limit = 160) => String(value || '').trim().slice(0, limit)

// The bearer token proves which account may be linked; never accept a client user ID.
export async function registerSundayAccount(req, res, { supabaseUrl, serviceKey }) {
  const authorization = String(req.headers.authorization || '')
  if (!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in to register your student account.' })
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: authorization } })
    const user = await authResponse.json().catch(() => ({}))
    if (!authResponse.ok || !user.id) return res.status(401).json({ error: 'Your sign-in session expired. Sign in again.' })
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=*`, { headers })
    if (!profileResponse.ok) throw new Error('Could not load your platform profile. Please retry.')
    const [profile] = await profileResponse.json()
    if (!profile || profile.role !== 'student') return res.status(403).json({ error: 'Use a student account to register for Sunday BECE.' })
    const body = req.body || {}
    const fields = {
      full_name: clean(body.full_name), contact: clean(user.email, 254),
      school_name: clean(body.school_name), location: clean(body.location),
      region: clean(body.region), class_level: clean(body.class_level, 80)
    }
    if (!fields.full_name || !fields.school_name || !fields.location || !fields.region || !['Grade 9','JHS 3','Basic 9'].includes(fields.class_level)) {
      return res.status(400).json({ error: 'Complete the candidate name, school, location, region and JHS 3 class.' })
    }
    const candidateUrl = `${supabaseUrl}/rest/v1/bece_sunday_trial_registrations?candidate_id=eq.${encodeURIComponent(user.id)}`
    const existingResponse = await fetch(candidateUrl + '&select=*', { headers })
    if (!existingResponse.ok) throw new Error('Could not check your Sunday registration. Please retry.')
    const existing = await existingResponse.json()
    let candidate = existing[0]
    if (!candidate) {
      const inserted = await fetch(`${supabaseUrl}/rest/v1/bece_sunday_trial_registrations`, {
        method: 'POST', headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ ...fields, candidate_id: user.id })
      })
      if (inserted.status === 409) {
        const recovered = await fetch(candidateUrl + '&select=*', { headers })
        if (recovered.ok) [candidate] = await recovered.json()
      } else if (inserted.ok) [candidate] = await inserted.json()
      if (!candidate) throw new Error('Your platform account is ready, but Sunday registration could not be confirmed. Retry with the same email and password.')
    }
    return res.status(200).json({ candidate: { ...candidate, registration_status: 'confirmed' }, profile })
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Sunday registration is temporarily unavailable.' })
  }
}
