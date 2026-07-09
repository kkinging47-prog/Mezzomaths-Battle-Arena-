async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'Mezzo Maths <onboarding@resend.dev>'
  if (!apiKey) return { sent: false, skipped: 'RESEND_API_KEY is not configured' }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, html })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.message || 'Unable to send email')
  return { sent: true, id: data.id }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { email, full_name, role, class_level, school_name } = req.body || {}
    if (!email || !String(email).includes('@')) return res.status(400).json({ error: 'Valid email is required' })
    const name = full_name || 'Student'
    const result = await sendEmail({
      to: email,
      subject: 'Welcome to Mezzo Maths Battle Arena',
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h1 style="color:#1d4ed8">Welcome to Mezzo Maths Battle Arena</h1><p>Hello ${name},</p><p>Your ${role || 'student'} account has been created successfully.</p><p><strong>Class:</strong> ${class_level || 'Not provided'}<br><strong>School:</strong> ${school_name || 'Not provided'}</p><p>You can now practise, play battles, prepare for BECE/Mezzopedia and track your progress.</p><p>Mezzo Maths Team</p></div>`
    })
    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Welcome email failed' })
  }
}
