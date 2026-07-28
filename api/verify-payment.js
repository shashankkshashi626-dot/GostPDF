import crypto from 'crypto'

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
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'S1KW3ipv8GLyGRHM0ruobUIl'

    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch {}
    }
    body = body || {}

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required verification fields' })
    }

    const payload = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(payload.toString())
      .digest('hex')

    if (expectedSignature === razorpay_signature) {
      return res.status(200).json({
        status: 'success',
        message: 'Payment verified successfully',
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id
      })
    } else {
      return res.status(400).json({
        status: 'failure',
        error: 'Invalid payment signature'
      })
    }
  } catch (error) {
    console.error('Razorpay Signature Verification Error:', error)
    return res.status(500).json({ error: error.message || 'Signature verification failed' })
  }
}
