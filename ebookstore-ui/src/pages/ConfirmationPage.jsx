import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getOrderById } from '../api/services'
import { Spinner } from '../components/Common'
import './ConfirmationPage.css'

export default function ConfirmationPage() {
  const { orderId }  = useParams()
  const navigate     = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrderById(orderId)
      .then(res => setOrder(res.data.data))
      .catch(() => navigate('/orders'))
      .finally(() => setLoading(false))
  }, [orderId, navigate])

  if (loading) return <div className="page"><div className="container"><Spinner /></div></div>
  if (!order)  return null

  return (
    <div className="page confirmation-page">
      <div className="container confirmation-inner">

        {/* ── Step indicator ── */}
        <div className="checkout-steps">
          <div className="step">1 Address</div>
          <div className="step-sep">›</div>
          <div className="step">2 Payment</div>
          <div className="step-sep">›</div>
          <div className="step active">3 Confirm</div>
        </div>

        {/* ── Success card ── */}
        <div className="confirmation-card card">
          <div className="conf-success-icon">✅</div>
          <h1>Order Confirmed!</h1>
          <p className="conf-subtitle">Thank you for your purchase. Your books are on the way!</p>

          <div className="conf-order-meta">
            <div className="conf-meta-item">
              <span className="conf-meta-label">Order Number</span>
              <span className="conf-meta-val">{order.orderNumber}</span>
            </div>
            <div className="conf-meta-item">
              <span className="conf-meta-label">Status</span>
              <span className="badge badge-success">{order.status}</span>
            </div>
            <div className="conf-meta-item">
              <span className="conf-meta-label">Total Paid</span>
              <span className="conf-meta-val conf-total">${order.totalAmount?.toFixed(2)}</span>
            </div>
            <div className="conf-meta-item">
              <span className="conf-meta-label">Date</span>
              <span className="conf-meta-val">{new Date(order.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {/* ── Items ── */}
          <div className="conf-items">
            <h3>Items Ordered</h3>
            {order.items?.map((item, i) => (
              <div key={i} className="conf-item">
                <div className="conf-item-img">
                  {item.productImageUrl
                    ? <img src={item.productImageUrl} alt={item.productTitle} />
                    : <span>📖</span>
                  }
                </div>
                <div className="conf-item-info">
                  <Link to={`/products/${item.productId}`} className="conf-item-title">
                    {item.productTitle}
                  </Link>
                  <span className="conf-item-meta">Qty: {item.quantity} × ${item.unitPrice?.toFixed(2)}</span>
                </div>
                <span className="conf-item-sub">${item.subtotal?.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* ── Delivery address ── */}
          {order.shippingAddress && (
            <div className="conf-address">
              <h3>Delivery Address</h3>
              <p>
                {order.shippingAddress.fullName}<br />
                {order.shippingAddress.street}, {order.shippingAddress.city}<br />
                {order.shippingAddress.state} {order.shippingAddress.postalCode}, {order.shippingAddress.country}
              </p>
            </div>
          )}

          {order.pointsRedeemed > 0 && (
            <div className="conf-points">🎁 {order.pointsRedeemed} gift points redeemed for this order</div>
          )}

          <div className="conf-actions">
            <Link to="/orders" className="btn btn-primary">View My Orders</Link>
            <Link to="/catalogue" className="btn btn-outline">Continue Shopping</Link>
          </div>
        </div>

        <div className="conf-cancel-note">
          <strong>Need to cancel?</strong> You can cancel this order within 48 hours from the <Link to="/orders">My Orders</Link> page.
        </div>
      </div>
    </div>
  )
}
