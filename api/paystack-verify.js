const PLANS = {
  'weekly-starter': { name: 'Weekly Starter', amount: 10, period: 'week' },
  'monthly-student': { name: 'Student Monthly', amount: 35, period: 'month' },
  'term-pass': { name: 'Term Pass', amount: 90, period: 'term' },
  'annual-champion': { name: 'Annual Champion', amount: 300, period: 'year' },
  'school-pack': { name: 'School Pack', amount: 750, period: 'month' }
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

    return res.status(200).json({
      status: 'success',
      reference,
      plan_id: planId,
      plan_name: plan.name,
      amount: plan.amount,
      currency: transaction.currency,
      paid_at: transaction.paid_at
    })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Payment verification failed' })
  }
}
