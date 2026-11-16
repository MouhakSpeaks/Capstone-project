import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { placeOrder, processPayment } from '../api/services'
import { Alert } from '../components/Common'
import toast from 'react-hot-toast'
import './PaymentPage.css'

const METHODS = [
  { id: 'CREDIT_CARD', label: 'Credit Card',  icon: '💳' },
  { id: 'DEBIT_CARD',  label: 'Debit Card',   icon: '🏦' },
  { id: 'NET_BANKING', label: 'Net Banking',  icon: '🌐' },
  { id: 'UPI',         label: 'UPI',          icon: '📱' },
  { id: 'GIFT_POINTS', label: 'Gift Points',  icon: '🎁' },
]

export default function PaymentPage() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { shippingAddressId, pointsToRedeem = 0 } = location.state || {}

  const [method,     setMethod]     = useState('CREDIT_CARD')
  const [cardNum,    setCardNum]    = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv,    setCardCvv]    = useState('')
  const [upiId,      setUpiId]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  if (!shippingAddressId) {
    navigate('/checkout')
    return null
  }

  const handlePay = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Step 1: Place the order
      const orderRes = await placeOrder({ shippingAddressId, pointsToRedeem })
      const order    = orderRes.data.data

      // Step 2: Process payment
      await processPayment({
        orderId: order.id,
        paymentMethod: method,
        cardNumber: cardNum || undefined,
        cardExpiry: cardExpiry || undefined,
        cardCvv:    cardCvv    || undefined,
        upiId:      upiId      || undefined,
      })

      toast.success('Payment successful! 🎉')
      navigate(`/confirmation/${order.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const needsCard = method === 'CREDIT_CARD' || method === 'DEBIT_CARD'

  return (
    <div className="page">
      <div className="container payment-layout">
        <div>
          {/* ── Step indicator ── */}
          <div className="checkout-steps">
            <div className="step">1 Address</div>
            <div className="step-sep">›</div>
            <div className="step active">2 Payment</div>
            <div className="step-sep">›</div>
            <div className="step">3 Confirm</div>
          </div>

          <h2 className="section-title">Select Payment <span>Method</span></h2>

          {error && <Alert type="error">{error}</Alert>}

          <form onSubmit={handlePay}>
            {/* ── Payment Method Tabs ── */}
            <div className="payment-methods">
              {METHODS.map(m => (
                <button
                  key={m.id} type="button"
                  className={`payment-method-btn ${method === m.id ? 'active' : ''}`}
                  onClick={() => setMethod(m.id)}
                >
                  <span className="pm-icon">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* ── Card form ── */}
            {needsCard && (
              <div className="payment-form card">
                <h3>{method === 'CREDIT_CARD' ? 'Credit' : 'Debit'} Card Details</h3>
                <div className="form-group">
                  <label className="form-label">Card Number</label>
                  <input className="form-input" type="text" maxLength={19} placeholder="1234 5678 9012 3456"
                    value={cardNum} onChange={e => setCardNum(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                    required />
                </div>
                <div className="card-row">
                  <div className="form-group">
                    <label className="form-label">Expiry (MM/YY)</label>
                    <input className="form-input" type="text" maxLength={5} placeholder="MM/YY"
                      value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV</label>
                    <input className="form-input" type="password" maxLength={4} placeholder="•••"
                      value={cardCvv} onChange={e => setCardCvv(e.target.value)} required />
                  </div>
                </div>
              </div>
            )}

            {method === 'UPI' && (
              <div className="payment-form card">
                <h3>UPI Payment</h3>
                <div className="form-group">
                  <label className="form-label">UPI ID</label>
                  <input className="form-input" type="text" placeholder="yourname@upi"
                    value={upiId} onChange={e => setUpiId(e.target.value)} required />
                </div>
              </div>
            )}

            {method === 'NET_BANKING' && (
              <div className="payment-form card">
                <h3>Net Banking</h3>
                <p className="form-label" style={{ marginTop: 8 }}>You will be redirected to your bank's portal to complete the payment.</p>
              </div>
            )}

            {method === 'GIFT_POINTS' && (
              <div className="payment-form card">
                <h3>🎁 Gift Points</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)' }}>
                  Your accumulated gift points will be applied as payment.
                  {pointsToRedeem > 0 && <strong> Redeeming {pointsToRedeem} points (${(pointsToRedeem * 0.01).toFixed(2)} off).</strong>}
                </p>
              </div>
            )}

            <button className="btn btn-accent btn-lg pay-btn" type="submit" disabled={loading}>
              {loading ? 'Processing Payment…' : '🔒 Pay Now'}
            </button>
          </form>
        </div>

        {/* ── Security note ── */}
        <div className="payment-sidebar">
          <div className="card secure-badge">
            <h4>🔒 Secure Checkout</h4>
            <p>Your payment information is encrypted and processed securely.</p>
          </div>
          <div className="card payment-summary-box">
            <h4>Payment Summary</h4>
            <div className="pay-summary-row">
              <span>Method</span>
              <span>{METHODS.find(m => m.id === method)?.label}</span>
            </div>
            {pointsToRedeem > 0 && (
              <div className="pay-summary-row text-success">
                <span>Points Redeemed</span>
                <span>−${(pointsToRedeem * 0.01).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
