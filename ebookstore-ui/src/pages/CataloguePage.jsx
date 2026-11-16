import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  getCategories, getProducts, getProductsByCategory, searchProducts
} from '../api/services'
import ProductCard from '../components/ProductCard'
import { Spinner, Pagination } from '../components/Common'
import './CataloguePage.css'

export default function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [products,   setProducts]   = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading,    setLoading]    = useState(true)

  const keyword    = searchParams.get('search')    || ''
  const categoryId = searchParams.get('categoryId') || ''
  const page       = parseInt(searchParams.get('page') || '0')

  const loadCategories = useCallback(async () => {
    const res = await getCategories()
    setCategories(res.data.data || [])
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      let res
      if (keyword)    res = await searchProducts(keyword, page, 20)
      else if (categoryId) res = await getProductsByCategory(categoryId, page, 20)
      else            res = await getProducts(page, 20, 'createdAt')
      const data = res.data.data
      setProducts(data?.content || [])
      setTotalPages(data?.totalPages || 0)
    } finally {
      setLoading(false)
    }
  }, [keyword, categoryId, page])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadProducts()   }, [loadProducts])

  const setParam = (key, val) => {
    const p = Object.fromEntries(searchParams.entries())
    if (val) p[key] = val; else delete p[key]
    delete p.page
    setSearchParams(p)
  }

  return (
    <div className="page">
      <div className="container catalogue-layout">

        {/* ── Sidebar ── */}
        <aside className="catalogue-sidebar">
          <div className="sidebar-section card">
            <h3 className="sidebar-title">Categories</h3>
            <ul className="category-list">
              <li>
                <button
                  className={`category-btn ${!categoryId ? 'active' : ''}`}
                  onClick={() => setParam('categoryId', '')}
                >
                  All Books
                </button>
              </li>
              {categories.map(cat => (
                <li key={cat.id}>
                  <button
                    className={`category-btn ${categoryId === String(cat.id) ? 'active' : ''}`}
                    onClick={() => setParam('categoryId', cat.id)}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="catalogue-main">
          <div className="catalogue-toolbar">
            <div className="catalogue-breadcrumb">
              {keyword
                ? <span>Search results for "<strong>{keyword}</strong>"</span>
                : categoryId
                  ? <span>Category: <strong>{categories.find(c => String(c.id) === categoryId)?.name || '…'}</strong></span>
                  : <span>All Books</span>
              }
              {(keyword || categoryId) && (
                <button className="btn btn-ghost btn-sm" onClick={() => setSearchParams({})}>✕ Clear</button>
              )}
            </div>
            {products.length > 0 && (
              <span className="catalogue-count">{products.length} books shown</span>
            )}
          </div>

          {loading
            ? <Spinner />
            : products.length === 0
              ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>{keyword ? `No books found for "${keyword}"` : 'No books in this category yet.'}</p>
                  <Link to="/catalogue" className="btn btn-outline" style={{ marginTop: 16 }}>Browse All</Link>
                </div>
              )
              : (
                <>
                  <div className="grid-4">
                    {products.map(p => <ProductCard key={p.id} product={p} />)}
                  </div>
                  <Pagination page={page} totalPages={totalPages}
                    onChange={p => setParam('page', p === 0 ? '' : p)} />
                </>
              )
          }
        </main>
      </div>
    </div>
  )
}
