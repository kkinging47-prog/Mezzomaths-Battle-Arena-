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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY is not configured in Vercel Environment Variables' })

  try {
    const { plan_id, email, name, callback_url } = req.body || {}
    const plan = PLANS[plan_id]
    if (!plan) return res.status(400).json({ error: 'Invalid subscription plan' })
    if (!email || !String(email).includes('@')) return res.status(400).json({ error: 'A valid email is required' })

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: plan.amount * 100,
        currency: 'GHS',
        channels: ['card', 'mobile_money'],
        callback_url,
        metadata: {
          product: 'Mezzo Maths Battle Arena',
          plan_id,
          plan_name: plan.name,
          customer_name: name || email,
          period: plan.period,
          category: plan.category,
          student_range: plan.student_range || ''
        }
      })
    })

    const data = await response.json()
    if (!response.ok || !data.status) return res.status(400).json({ error: data.message || 'Unable to initialize payment' })

    return res.status(200).json({
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
      plan_id,
      amount: plan.amount,
      category: plan.category,
      student_range: plan.student_range || ''
    })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Payment initialization failed' })
  }
}
