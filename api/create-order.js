import Razorpay from 'razorpay'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TIzcy9v8qqX82A'
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'S1KW3ipv8GLyGRHM0ruobUIl'

    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch {}
    }
    body = body || {}

    const { amount = 100, currency = 'INR', receipt } = body

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
    console.error('Razorpay Create Order Error:', error)
    return res.status(500).json({ error: error.message || 'Failed to create Razorpay order' })
  }
}
