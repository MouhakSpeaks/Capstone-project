import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getCart } from '../api/services'
import './Navbar.css'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [cartCount, setCartCount] = useState(0)
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (user) {
      getCart().then(res => {
        setCartCount(res.data.data?.items?.length || 0)
      }).catch(() => {})
    } else {
      setCartCount(0)
    }
  }, [user, location.pathname])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/catalogue?search=${encodeURIComponent(search.trim())}`)
      setSearch('')
    }
  }

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">📚</span>
          <span>BookHaven</span>
        </Link>

        <form className="navbar-search" onSubmit={handleSearch}>
          <input
            className="navbar-search-input"
            type="text"
            placeholder="Search books, authors, publishers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" className="navbar-search-btn">🔍</button>
        </form>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/catalogue" className="nav-link">Catalogue</Link>
          {user ? (
            <>
              <Link to="/cart" className="nav-link cart-link">
                🛒 Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </Link>
              <Link to="/orders" className="nav-link">Orders</Link>
              <div className="nav-user-menu">
                <span className="nav-user-name">👤 {user.firstName}</span>
                <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign Out</button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>

        <button className="navbar-hamburger" onClick={() => setMenuOpen(v => !v)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  )
}
