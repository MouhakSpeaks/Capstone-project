import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders, cancelOrder, addToCart } from '../api/services'
import { Spinner, Pagination } from '../components/Common'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import './OrdersPage.css'

const STATUS_COLORS = {
  PENDING:   { bg: '#fef3c7', color: '#92400e' },
  CONFIRMED: { bg: '#dbeafe', color: '#1d4ed8' },
  SHIPPED:   { bg: '#e0e7ff', color: '#4338ca' },
  DELIVERED: { bg: '#dcfce7', color: '#15803d' },
  CANCELLED: { bg: '#fee2e2', color: '#b91c1c' },
}

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders,     setOrders]     = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [page,       setPage]       = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [expanded,   setExpanded]   = useState(null)

  const load = async (p = 0) => {
    setLoading(true)
    try {
      const res = await getOrders(p, 10)
      setOrders(res.data.data?.content || [])
      setTotalPages(res.data.data?.totalPages || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page) }, [page])

  const handleCancel = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    try {
      await cancelOrder(orderId)
      toast.success('Order cancelled')
      load(page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel this order')
    }
  }

  const handleBuyAgain = async (items) => {
    try {
      for (const item of items) {
        await addToCart(item.productId, item.quantity)
      }
      toast.success('Items added to cart!')
    } catch {
      toast.error('Some items could not be added')
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="orders-header">
          <h1 className="section-title">My <span>Orders</span></h1>
          {user && (
            <div className="gift-points-display">
              🎁 <strong>{user.giftPoints || 0}</strong> Gift Points available
            </div>
          )}
        </div>

        {loading
          ? <Spinner />
          : orders.length === 0
            ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p>You haven't placed any orders yet.</p>
                <Link to="/catalogue" className="btn btn-primary" style={{ marginTop: 20 }}>Start Shopping</Link>
              </div>
            )
            : (
              <>
                <div className="orders-list">
                  {orders.map(order => {
                    const statusStyle = STATUS_COLORS[order.status] || {}
                    const isExpanded  = expanded === order.id
                    const canCancel   = ['PENDING', 'CONFIRMED'].includes(order.status)

                    return (
                      <div key={order.id} className="order-card card">
                        {/* ── Order Header ── */}
                        <div className="order-header" onClick={() => setExpanded(isExpanded ? null : order.id)}>
                          <div className="order-header-left">
                            <span className="order-number">{order.orderNumber}</span>
                            <span className="order-date">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className="order-header-right">
                            <span className="order-total">${order.totalAmount?.toFixed(2)}</span>
                            <span className="order-status-badge"
                              style={{ background: statusStyle.bg, color: statusStyle.color }}>
                              {order.status}
                            </span>
                            <span className="order-expand-toggle">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>

                        {/* ── Order Items (collapsed preview) ── */}
                        {!isExpanded && (
                          <div className="order-preview">
                            {order.items?.slice(0, 3).map((item, i) => (
                              <div key={i} className="order-preview-item">
                                {item.productImageUrl
                                  ? <img src={item.productImageUrl} alt={item.productTitle} />
                                  : <span>📖</span>
                                }
                              </div>
                            ))}
                            {order.items?.length > 3 && (
                              <span className="order-preview-more">+{order.items.length - 3} more</span>
                            )}
                          </div>
                        )}

                        {/* ── Expanded Order Detail ── */}
                        {isExpanded && (
                          <div className="order-detail">
                            <div className="order-items-list">
                              {order.items?.map((item, i) => (
                                <div key={i} className="order-item-row">
                                  <div className="order-item-img">
                                    {item.productImageUrl
                                      ? <img src={item.productImageUrl} alt={item.productTitle} />
                                      : <span>📖</span>
                                    }
                                  </div>
                                  <div className="order-item-info">
                                    <Link to={`/products/${item.productId}`} className="order-item-title">
                                      {item.productTitle}
                                    </Link>
                                    <span className="order-item-meta">
                                      Qty: {item.quantity} × ${item.unitPrice?.toFixed(2)}
                                    </span>
                                  </div>
                                  <span className="order-item-sub">${item.subtotal?.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            {order.shippingAddress && (
                              <div className="order-ship-addr">
                                <strong>Delivering to:</strong> {order.shippingAddress.fullName},
                                {' '}{order.shippingAddress.street}, {order.shippingAddress.city},
                                {' '}{order.shippingAddress.state} {order.shippingAddress.postalCode}
                              </div>
                            )}

                            {order.pointsRedeemed > 0 && (
                              <div className="order-points-note">
                                🎁 {order.pointsRedeemed} gift points were redeemed
                              </div>
                            )}

                            <div className="order-actions">
                              {/* ── Buy Again ── */}
                              <button
                                className="btn btn-accent btn-sm"
                                onClick={() => handleBuyAgain(order.items)}
                              >
                                🔄 Buy Again
                              </button>

                              {/* ── Cancel within 48h ── */}
                              {canCancel && (
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleCancel(order.id)}
                                >
                                  Cancel Order
                                </button>
                              )}

                              <Link to={`/confirmation/${order.id}`} className="btn btn-ghost btn-sm">
                                View Details
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </>
            )
        }
      </div>
    </div>
  )
}
