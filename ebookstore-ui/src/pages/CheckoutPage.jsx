import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAddresses, addAddress, getCart } from '../api/services'
import { Spinner } from '../components/Common'
import toast from 'react-hot-toast'
import './CheckoutPage.css'

const BLANK_ADDRESS = { fullName: '', street: '', city: '', state: '', postalCode: '', country: '', phone: '', isDefault: false }

export default function CheckoutPage() {
  const navigate  = useNavigate()
  const [addresses, setAddresses] = useState([])
  const [selected,  setSelected]  = useState(null)
  const [cart,      setCart]      = useState(null)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState(BLANK_ADDRESS)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [points,    setPoints]    = useState(0)

  useEffect(() => {
    Promise.all([getAddresses(), getCart()])
      .then(([addrRes, cartRes]) => {
        const addrs = addrRes.data.data || []
        setAddresses(addrs)
        const def = addrs.find(a => a.isDefault) || addrs[0]
        if (def) setSelected(def.id)
        setCart(cartRes.data.data)
        if (!addrs.length) setShowForm(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSaveAddress = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await addAddress(form)
      const newAddr = res.data.data
      setAddresses(prev => [...prev, newAddr])
      setSelected(newAddr.id)
      setShowForm(false)
      setForm(BLANK_ADDRESS)
      toast.success('Address saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = () => {
    if (!selected) { toast.error('Please select a delivery address'); return }
    navigate('/payment', { state: { shippingAddressId: selected, pointsToRedeem: points } })
  }

  if (loading) return <div className="page"><div className="container"><Spinner /></div></div>

  const total = cart?.totalAmount || 0

  return (
    <div className="page">
      <div className="container checkout-layout">
        <div>
          {/* ── Step indicator ── */}
          <div className="checkout-steps">
            <div className="step active">1 Address</div>
            <div className="step-sep">›</div>
            <div className="step">2 Payment</div>
            <div className="step-sep">›</div>
            <div className="step">3 Confirm</div>
          </div>

          {/* ── Address list ── */}
          <h2 className="section-title">Select Delivery <span>Address</span></h2>

          <div className="address-list">
            {addresses.map(addr => (
              <label key={addr.id} className={`address-card card ${selected === addr.id ? 'selected' : ''}`}>
                <input type="radio" name="address" value={addr.id}
                  checked={selected === addr.id}
                  onChange={() => setSelected(addr.id)} />
                <div className="address-info">
                  <strong>{addr.fullName}</strong>
                  {addr.isDefault && <span className="badge badge-brand" style={{ marginLeft: 8 }}>Default</span>}
                  <p>{addr.street}, {addr.city}, {addr.state} {addr.postalCode}</p>
                  <p>{addr.country} {addr.phone && `· ${addr.phone}`}</p>
                </div>
              </label>
            ))}
          </div>

          <button className="btn btn-outline btn-sm add-addr-btn" onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Cancel' : '+ Add New Address'}
          </button>

          {showForm && (
            <form className="address-form card" onSubmit={handleSaveAddress}>
              <h3>New Address</h3>
              <div className="addr-row">
                <div className="form-group"><label className="form-label">Full Name</label>
                  <input className="form-input" required value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Street</label>
                <input className="form-input" required value={form.street}
                  onChange={e => setForm(f => ({ ...f, street: e.target.value }))} /></div>
              <div className="addr-row">
                <div className="form-group"><label className="form-label">City</label>
                  <input className="form-input" required value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">State</label>
                  <input className="form-input" required value={form.state}
                    onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
              </div>
              <div className="addr-row">
                <div className="form-group"><label className="form-label">Postal Code</label>
                  <input className="form-input" required value={form.postalCode}
                    onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Country</label>
                  <input className="form-input" required value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
              </div>
              <label className="default-checkbox">
                <input type="checkbox" checked={form.isDefault}
                  onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
                Set as default address
              </label>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Address'}
              </button>
            </form>
          )}

          {/* ── Gift Points ── */}
          <div className="gift-points-section card">
            <h3>🎁 Redeem Gift Points</h3>
            <p className="gift-info">Each point = $0.01 discount. Enter points to redeem:</p>
            <input
              type="number" min="0" className="form-input gift-input"
              value={points}
              onChange={e => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
            />
            {points > 0 && (
              <p className="gift-discount">Discount: <strong>${(points * 0.01).toFixed(2)}</strong></p>
            )}
          </div>
        </div>

        {/* ── Order Summary ── */}
        <div className="checkout-summary card">
          <h3>Order Summary</h3>
          {cart?.items?.map(item => (
            <div key={item.id} className="checkout-summary-item">
              <span className="checkout-item-title">{item.productTitle} ×{item.quantity}</span>
              <span>${item.subtotal?.toFixed(2)}</span>
            </div>
          ))}
          <hr className="divider" />
          {points > 0 && (
            <div className="checkout-summary-item text-success">
              <span>Gift Points</span><span>−${(points * 0.01).toFixed(2)}</span>
            </div>
          )}
          <div className="checkout-summary-total">
            <span>Total</span>
            <span>${Math.max(0, total - points * 0.01).toFixed(2)}</span>
          </div>
          <button className="btn btn-accent btn-lg checkout-proceed-btn" onClick={handleContinue}>
            Continue to Payment →
          </button>
        </div>
      </div>
    </div>
  )
}
