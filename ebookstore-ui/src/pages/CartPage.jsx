import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getCart, removeCartItem, updateCartItem, getOrders } from '../api/services'
import { Spinner } from '../components/Common'
import toast from 'react-hot-toast'
import './CartPage.css'

export default function CartPage() {
  const navigate = useNavigate()
  const [cart,     setCart]     = useState(null)
  const [recommended, setRecommended] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const cartRes = await getCart()
        setCart(cartRes.data.data)

        // Recommend from recent order history (reuse top of order list)
        try {
          const ordRes = await getOrders(0, 1)
          const lastOrder = ordRes.data.data?.content?.[0]
          if (lastOrder?.items?.length) {
            // Simple recommendation placeholder — show products from last order
            setRecommended(lastOrder.items.slice(0, 4).map(i => ({
              id: i.productId,
              title: i.productTitle,
              imageUrl: i.productImageUrl,
              price: i.unitPrice,
            })))
          }
        } catch {} // recommendation failure is non-fatal

      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleRemove = async (cartItemId) => {
    try {
      const res = await removeCartItem(cartItemId)
      setCart(res.data.data)
      toast.success('Item removed')
    } catch { toast.error('Failed to remove item') }
  }

  const handleQtyChange = async (cartItemId, qty) => {
    try {
      const res = await updateCartItem(cartItemId, qty)
      setCart(res.data.data)
    } catch { toast.error('Failed to update quantity') }
  }

  if (loading) return <div className="page"><div className="container"><Spinner /></div></div>

  const items = cart?.items || []

  return (
    <div className="page">
      <div className="container">
        <h1 className="section-title">Shopping <span>Cart</span></h1>

        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <p>Your cart is empty</p>
            <Link to="/catalogue" className="btn btn-primary" style={{ marginTop: 20 }}>Continue Shopping</Link>
          </div>
        ) : (
          <div className="cart-layout">
            {/* ── Cart Items ── */}
            <div className="cart-items">
              {items.map(item => (
                <div key={item.id} className="cart-item card">
                  <div className="cart-item-img-wrap">
                    {item.productImageUrl
                      ? <img src={item.productImageUrl} alt={item.productTitle} />
                      : <span className="cart-item-img-placeholder">📖</span>
                    }
                  </div>
                  <div className="cart-item-info">
                    <Link to={`/products/${item.productId}`} className="cart-item-title">
                      {item.productTitle}
                    </Link>
                    <span className="cart-item-unit">${item.unitPrice?.toFixed(2)} each</span>
                  </div>
                  <div className="cart-item-qty-control">
                    <button className="qty-btn" onClick={() => handleQtyChange(item.id, item.quantity - 1)}>−</button>
                    <span className="qty-val">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => handleQtyChange(item.id, item.quantity + 1)}>+</button>
                  </div>
                  <div className="cart-item-subtotal">${item.subtotal?.toFixed(2)}</div>
                  <button className="btn btn-ghost btn-sm cart-remove" onClick={() => handleRemove(item.id)}>✕</button>
                </div>
              ))}
            </div>

            {/* ── Order Summary ── */}
            <div className="cart-summary card">
              <h3 className="cart-summary-title">Order Summary</h3>
              <div className="cart-summary-row">
                <span>Subtotal ({items.length} item{items.length > 1 ? 's' : ''})</span>
                <span>${cart.totalAmount?.toFixed(2)}</span>
              </div>
              <div className="cart-summary-row">
                <span>Shipping</span>
                <span className="text-success">Free</span>
              </div>
              <hr className="divider" />
              <div className="cart-summary-total">
                <span>Total</span>
                <span>${cart.totalAmount?.toFixed(2)}</span>
              </div>
              <button className="btn btn-accent btn-lg cart-checkout-btn"
                onClick={() => navigate('/checkout')}>
                Proceed to Checkout →
              </button>
              <Link to="/catalogue" className="btn btn-ghost cart-continue-btn">← Continue Shopping</Link>
            </div>
          </div>
        )}

        {/* ── Recommended (Based on Order History) ── */}
        {recommended.length > 0 && (
          <section className="cart-recommended">
            <h2 className="section-title">Based on Your Order <span>History</span></h2>
            <div className="grid-4">
              {recommended.map(p => (
                <div key={p.id} className="cart-rec-item card card-hover">
                  <Link to={`/products/${p.id}`}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.title} className="cart-rec-img" />
                      : <div className="cart-rec-img-ph">📖</div>
                    }
                    <div style={{ padding: '10px 14px' }}>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{p.title}</p>
                      <p style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 800, marginTop: 4 }}>
                        ${typeof p.price === 'number' ? p.price.toFixed(2) : p.price}
                      </p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
