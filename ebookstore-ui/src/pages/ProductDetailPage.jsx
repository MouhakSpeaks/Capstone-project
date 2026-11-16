import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProductById, getRelatedProducts, addToCart } from '../api/services'
import { Spinner, StarRating, Alert } from '../components/Common'
import ProductCard from '../components/ProductCard'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import './ProductDetailPage.css'

export default function ProductDetailPage() {
  const { id }     = useParams()
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [product,  setProduct]  = useState(null)
  const [related,  setRelated]  = useState([])
  const [qty,      setQty]      = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([getProductById(id), getRelatedProducts(id)])
      .then(([pRes, rRes]) => {
        setProduct(pRes.data.data)
        setRelated(rRes.data.data || [])
      })
      .catch(() => navigate('/catalogue'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return }
    setAddingToCart(true)
    try {
      await addToCart(product.id, qty)
      toast.success(`Added ${qty} × "${product.title}" to cart`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add to cart')
    } finally {
      setAddingToCart(false)
    }
  }

  if (loading) return <div className="page"><div className="container"><Spinner /></div></div>
  if (!product) return null

  return (
    <div className="page">
      <div className="container">
        {/* ── Product Detail ── */}
        <div className="product-detail-layout">
          <div className="product-detail-img-wrap card">
            {product.imageUrl
              ? <img src={product.imageUrl} alt={product.title} className="product-detail-img" />
              : <div className="product-detail-img-placeholder">📖</div>
            }
          </div>

          <div className="product-detail-info">
            <span className="badge badge-brand">{product.categoryName}</span>
            <h1 className="product-detail-title">{product.title}</h1>
            <p className="product-detail-author">by <strong>{product.author}</strong></p>
            {product.brand && <p className="product-detail-brand">Publisher: {product.brand}</p>}

            <div className="product-detail-rating">
              <StarRating rating={product.rating} count={product.reviewCount} />
            </div>

            <div className="product-detail-price">${product.price?.toFixed(2)}</div>

            {product.tentativeDeliveryDate && (
              <div className="product-detail-delivery">
                🚚 Estimated Delivery: <strong>{new Date(product.tentativeDeliveryDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
              </div>
            )}

            <div className="product-detail-stock">
              {product.stockQuantity > 0
                ? <span className="badge badge-success">✓ In Stock ({product.stockQuantity} available)</span>
                : <span className="badge" style={{ background: '#fee2e2', color: 'var(--danger)' }}>✗ Out of Stock</span>
              }
            </div>

            {product.stockQuantity > 0 && (
              <div className="product-detail-actions">
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <span className="qty-val">{qty}</span>
                  <button className="qty-btn" onClick={() => setQty(q => Math.min(product.stockQuantity, q + 1))}>+</button>
                </div>
                <button className="btn btn-accent btn-lg" onClick={handleAddToCart} disabled={addingToCart}>
                  {addingToCart ? 'Adding…' : '🛒 Add to Cart'}
                </button>
                <button className="btn btn-primary btn-lg" onClick={async () => {
                  await handleAddToCart(); navigate('/cart')
                }} disabled={addingToCart}>
                  Buy Now
                </button>
              </div>
            )}

            {product.description && (
              <div className="product-detail-desc">
                <h3>About this book</h3>
                <p>{product.description}</p>
              </div>
            )}

            <table className="product-detail-meta">
              <tbody>
                {product.isbn        && <tr><th>ISBN</th><td>{product.isbn}</td></tr>}
                {product.publisher   && <tr><th>Publisher</th><td>{product.publisher}</td></tr>}
                {product.publicationDate && <tr><th>Published</th><td>{new Date(product.publicationDate).toLocaleDateString()}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Related Products ── */}
        {related.length > 0 && (
          <section className="related-section">
            <h2 className="section-title">Related <span>Books</span></h2>
            <div className="grid-4">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
