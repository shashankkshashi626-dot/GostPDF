import Razorpay from 'razorpay'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET

    if (!key_id || !key_secret) {
      return res.status(401).json({ error: 'Razorpay API credentials missing' })
    }

    const { amount, currency = 'INR', receipt } = req.body || {}

    // Validate minimum amount (100 paise = 1 INR)
    const amountNum = parseInt(amount, 10)
    if (isNaN(amountNum) || amountNum < 100) {
      return res.status(400).json({ error: 'Amount must be at least 100 paise' })
    }

    const instance = new Razorpay({
      key_id,
      key_secret
    })

    const options = {
      amount: amountNum,
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
    if (error.statusCode === 401 || error.code === 'BAD_REQUEST_ERROR' && error.description?.includes('Authentication')) {
      return res.status(401).json({ error: 'Authentication failed with Razorpay API' })
    }
    return res.status(500).json({ error: error.message || 'Failed to create Razorpay order' })
  }
}
