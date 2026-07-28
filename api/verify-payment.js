import crypto from 'crypto'

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
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'mKH0wK4D6Z66wLi0vFwNM2mC'

    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch {}
    }
    body = body || {}

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required verification fields' })
    }

    // HMAC-SHA256 Signature Generation
    const payload = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(payload.toString())
      .digest('hex')

    // Constant-time HMAC comparison (prevents timing side-channel attacks)
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8')
    const signatureBuffer = Buffer.from(razorpay_signature, 'utf-8')

    const isSignatureValid =
      expectedBuffer.length === signatureBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, signatureBuffer)

    if (isSignatureValid) {
      return res.status(200).json({
        status: 'success',
        message: 'Payment verified successfully with 256-bit HMAC-SHA256 data integrity',
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id
      })
    } else {
      return res.status(400).json({
        status: 'failure',
        error: 'Invalid payment signature - Security verification failed'
      })
    }
  } catch (error) {
    console.error('Razorpay Signature Verification Error:', error)
    return res.status(500).json({ error: error.message || 'Signature verification failed' })
  }
}
