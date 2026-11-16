import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCategories, getProducts } from '../api/services'
import ProductCard from '../components/ProductCard'
import { Spinner } from '../components/Common'
import './HomePage.css'

export default function HomePage() {
  const [categories, setCategories]   = useState([])
  const [featured,   setFeatured]     = useState([])
  const [loading,    setLoading]      = useState(true)

  useEffect(() => {
    Promise.all([
      getCategories(),
      getProducts(0, 8, 'rating'),
    ]).then(([catRes, prodRes]) => {
      setCategories(catRes.data.data || [])
      setFeatured(prodRes.data.data?.content || [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-text">
            <h1>Discover Your<br /><span>Next Great Read</span></h1>
            <p>Browse thousands of books across every genre. Fast delivery, easy returns, and exclusive gift points on every purchase.</p>
            <div className="hero-actions">
              <Link to="/catalogue" className="btn btn-accent btn-lg">Browse Catalogue</Link>
              <Link to="/register" className="btn btn-outline hero-register-btn btn-lg">Join Free</Link>
            </div>
          </div>
          <div className="hero-image">📚</div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="section-categories">
        <div className="container">
          <h2 className="section-title">Shop by <span>Category</span></h2>
          {loading
            ? <Spinner />
            : (
              <div className="categories-grid">
                {categories.length === 0
                  ? ['Fiction', 'Technology', 'Science', 'History', 'Business', 'Self-Help', 'Children', 'Arts'].map(c => (
                      <Link key={c} to={`/catalogue?category=${c}`} className="category-chip card card-hover">
                        <span className="category-chip-icon">{categoryIcon(c)}</span>
                        <span>{c}</span>
                      </Link>
                    ))
                  : categories.map(cat => (
                      <Link key={cat.id} to={`/catalogue?categoryId=${cat.id}`} className="category-chip card card-hover">
                        {cat.imageUrl
                          ? <img src={cat.imageUrl} alt={cat.name} className="category-chip-img" />
                          : <span className="category-chip-icon">{categoryIcon(cat.name)}</span>
                        }
                        <span>{cat.name}</span>
                      </Link>
                    ))
                }
              </div>
            )
          }
        </div>
      </section>

      {/* ── Featured Books ── */}
      <section className="section-featured">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Top Rated <span>Books</span></h2>
            <Link to="/catalogue" className="btn btn-outline btn-sm">View All →</Link>
          </div>
          {loading
            ? <Spinner />
            : featured.length === 0
              ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>No products yet. Add some books via the Admin API!</p>
                </div>
              )
              : <div className="grid-4">{featured.map(p => <ProductCard key={p.id} product={p} />)}</div>
          }
        </div>
      </section>

      {/* ── Banner ── */}
      <section className="promo-banner">
        <div className="container promo-inner">
          <div>
            <h3>Earn Gift Points on Every Purchase</h3>
            <p>Get 1 point per $1 spent. Redeem your points for discounts on your next order.</p>
          </div>
          <Link to="/register" className="btn btn-accent btn-lg">Get Started</Link>
        </div>
      </section>
    </div>
  )
}

function categoryIcon(name = '') {
  const n = name.toLowerCase()
  if (n.includes('tech') || n.includes('computer')) return '💻'
  if (n.includes('fiction') || n.includes('novel'))  return '📖'
  if (n.includes('science'))    return '🔬'
  if (n.includes('history'))    return '🏛️'
  if (n.includes('business'))   return '💼'
  if (n.includes('self'))       return '🌱'
  if (n.includes('child'))      return '🧸'
  if (n.includes('art'))        return '🎨'
  return '📚'
}
