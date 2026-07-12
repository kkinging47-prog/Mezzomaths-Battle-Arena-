const PLANS = {
  'weekly-starter': { name: 'Weekly Starter', amount: 10, period: 'week', category: 'individual' },
  'monthly-student': { name: 'Student Monthly', amount: 35, period: 'month', category: 'individual' },
  'term-pass': { name: 'Term Pass', amount: 90, period: 'term', category: 'individual' },
  'annual-champion': { name: 'Annual Champion', amount: 300, period: 'year', category: 'individual' },
  'school-starter-50': { name: 'School Starter', amount: 750, period: 'month', category: 'school', student_range: '1-50 students' },
  'school-growth-150': { name: 'School Growth', amount: 1800, period: 'month', category: 'school', student_range: '51-150 students' },
  'school-pro-300': { name: 'School Pro', amount: 3000, period: 'month', category: 'school', student_range: '151-300 students' },
  'school-premium-500': { name: 'School Premium', amount: 4500, period: 'month', category: 'school', student_range: '301-500 students' },
  'school-enterprise-1000': { name: 'School Enterprise', amount: 7500, period: 'month', category: 'school', student_range: '501-1000 students' }
}

async function sendReceiptEmail({ transaction, plan, planId, reference }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'Mezzo Maths <onboarding@resend.dev>'
  const email = transaction?.customer?.email || transaction?.metadata?.email
  if (!apiKey || !email) return { sent: false, skipped: !apiKey ? 'RESEND_API_KEY is not configured' : 'No customer email found' }

  const amount = (Number(transaction.amount || 0) / 100).toFixed(2)
  const paidAt = transaction.paid_at || new Date().toISOString()
  const customerName = transaction?.metadata?.customer_name || transaction?.customer?.first_name || 'Student'
  const studentRange = plan.student_range ? `<tr><td style="border:1px solid #cbd5e1;padding:8px"><strong>Student Range</strong></td><td style="border:1px solid #cbd5e1;padding:8px">${plan.student_range}</td></tr>` : ''
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `Receipt: ${plan.name} - Mezzo Maths`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h1 style="color:#1d4ed8">Payment Receipt</h1><p>Hello ${customerName},</p><p>Thank you for subscribing to Mezzo Maths Battle Arena.</p><table style="border-collapse:collapse;width:100%;max-width:560px"><tr><td style="border:1px solid #cbd5e1;padding:8px"><strong>Plan</strong></td><td style="border:1px solid #cbd5e1;padding:8px">${plan.name}</td></tr><tr><td style="border:1px solid #cbd5e1;padding:8px"><strong>Category</strong></td><td style="border:1px solid #cbd5e1;padding:8px">${plan.category}</td></tr>${studentRange}<tr><td style="border:1px solid #cbd5e1;padding:8px"><strong>Amount</strong></td><td style="border:1px solid #cbd5e1;padding:8px">GHS ${amount}</td></tr><tr><td style="border:1px solid #cbd5e1;padding:8px"><strong>Reference</strong></td><td style="border:1px solid #cbd5e1;padding:8px">${reference}</td></tr><tr><td style="border:1px solid #cbd5e1;padding:8px"><strong>Paid At</strong></td><td style="border:1px solid #cbd5e1;padding:8px">${paidAt}</td></tr><tr><td style="border:1px solid #cbd5e1;padding:8px"><strong>Plan ID</strong></td><td style="border:1px solid #cbd5e1;padding:8px">${planId}</td></tr></table><p>Your subscription is now active. Keep practising and building your maths confidence.</p><p>Mezzo Maths Team</p></div>`
    })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.message || 'Unable to send receipt email')
  return { sent: true, id: data.id }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY is not configured in Vercel Environment Variables' })

  try {
    const { reference } = req.query || {}
    if (!reference) return res.status(400).json({ error: 'Payment reference is required' })

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` }
    })
    const data = await response.json()
    if (!response.ok || !data.status) return res.status(400).json({ error: data.message || 'Unable to verify payment' })

    const transaction = data.data
    const planId = transaction?.metadata?.plan_id
    const plan = PLANS[planId]
    if (!plan) return res.status(400).json({ error: 'Payment plan metadata is missing or invalid' })
    if (transaction.status !== 'success') return res.status(200).json({ status: transaction.status, reference })
    if (Number(transaction.amount) !== plan.amount * 100) return res.status(400).json({ error: 'Payment amount does not match selected plan' })

    let receipt = { sent: false }
    try { receipt = await sendReceiptEmail({ transaction, plan, planId, reference }) } catch (emailError) { receipt = { sent: false, error: emailError.message } }

    return res.status(200).json({
      status: 'success',
      reference,
      plan_id: planId,
      plan_name: plan.name,
      amount: plan.amount,
      category: plan.category,
      student_range: plan.student_range || '',
      currency: transaction.currency,
      paid_at: transaction.paid_at,
      receipt_email: receipt
    })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Payment verification failed' })
  }
}
