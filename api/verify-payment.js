import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const key_secret = process.env.RAZORPAY_KEY_SECRET

    if (!key_secret) {
      return res.status(401).json({ error: 'Razorpay Key Secret missing' })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {}

    // Check missing fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required verification fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required' })
    }

    // Generate expected HMAC-SHA256 signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex')

    const isSignatureValid = expectedSignature === razorpay_signature

    if (isSignatureValid) {
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
