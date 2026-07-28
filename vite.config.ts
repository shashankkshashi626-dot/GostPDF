import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import Razorpay from 'razorpay'
import crypto from 'crypto'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const key_id = env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_TIzcy9v8qqX82A'
  const key_secret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || 'S1KW3ipv8GLyGRHM0ruobUIl'

  process.env.RAZORPAY_KEY_ID = key_id
  process.env.RAZORPAY_KEY_SECRET = key_secret

  return {
    plugins: [
      react(),
      {
        name: 'razorpay-api-dev-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/api/create-order' && req.method === 'POST') {
              let bodyStr = ''
              req.on('data', (chunk) => { bodyStr += chunk })
              req.on('end', async () => {
                res.setHeader('Content-Type', 'application/json')
                try {
                  if (!key_id || !key_secret) {
                    res.statusCode = 401
                    return res.end(JSON.stringify({ error: 'Razorpay API credentials missing' }))
                  }
                  const body = JSON.parse(bodyStr || '{}')
                  const amountNum = parseInt(body.amount, 10)
                  if (isNaN(amountNum) || amountNum < 100) {
                    res.statusCode = 400
                    return res.end(JSON.stringify({ error: 'Amount must be at least 100 paise' }))
                  }
                  const instance = new Razorpay({ key_id, key_secret })
                  const order = await instance.orders.create({
                    amount: amountNum,
                    currency: body.currency || 'INR',
                    receipt: body.receipt || `rcpt_${Date.now()}`
                  })
                  res.statusCode = 200
                  return res.end(JSON.stringify({
                    order_id: order.id,
                    amount: order.amount,
                    currency: order.currency
                  }))
                } catch (err: any) {
                  console.error('Local Dev Razorpay Order Error:', err)
                  res.statusCode = 500
                  return res.end(JSON.stringify({ error: err.message || 'Failed to create order' }))
                }
              })
              return
            }

            if (req.url === '/api/verify-payment' && req.method === 'POST') {
              let bodyStr = ''
              req.on('data', (chunk) => { bodyStr += chunk })
              req.on('end', async () => {
                res.setHeader('Content-Type', 'application/json')
                try {
                  if (!key_secret) {
                    res.statusCode = 401
                    return res.end(JSON.stringify({ error: 'Razorpay Key Secret missing' }))
                  }
                  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(bodyStr || '{}')
                  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                    res.statusCode = 400
                    return res.end(JSON.stringify({ error: 'Missing required verification fields' }))
                  }
                  const expectedSignature = crypto
                    .createHmac('sha256', key_secret)
                    .update(razorpay_order_id + '|' + razorpay_payment_id)
                    .digest('hex')

                  if (expectedSignature === razorpay_signature) {
                    res.statusCode = 200
                    return res.end(JSON.stringify({
                      status: 'success',
                      message: 'Payment verified successfully',
                      order_id: razorpay_order_id,
                      payment_id: razorpay_payment_id
                    }))
                  } else {
                    res.statusCode = 400
                    return res.end(JSON.stringify({
                      status: 'failure',
                      error: 'Invalid payment signature'
                    }))
                  }
                } catch (err: any) {
                  console.error('Local Dev Razorpay Verify Error:', err)
                  res.statusCode = 500
                  return res.end(JSON.stringify({ error: err.message || 'Signature verification failed' }))
                }
              })
              return
            }
            next()
          })
        }
      }
    ],
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/pdf-lib')) {
              return 'vendor-pdflib'
            }
            if (id.includes('node_modules/qrcode')) {
              return 'vendor-qrcode'
            }
          },
        },
      },
    },
  }
})
