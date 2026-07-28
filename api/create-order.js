import Razorpay from 'razorpay'

export default async function handler(req, res) {
  // Enhanced Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_TJ05dWObToopMI'
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'mKH0wK4D6Z66wLi0vFwNM2mC'

    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch {}
    }
    body = body || {}

    const { amount = 19900, currency = 'INR', receipt } = body

    const amountNum = parseInt(amount, 10)
    const validAmount = isNaN(amountNum) || amountNum < 100 ? 100 : amountNum

    const instance = new Razorpay({
      key_id,
      key_secret
    })

    const options = {
      amount: validAmount,
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now()}`
    }

    const order = await instance.orders.create(options)

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    })
  } catch (error) {
    console.error('Razorpay Create Order Security Error:', error)
    return res.status(500).json({ error: error.message || 'Failed to create Razorpay order' })
  }
}
