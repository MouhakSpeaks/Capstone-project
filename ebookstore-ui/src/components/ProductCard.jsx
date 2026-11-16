import { Link } from 'react-router-dom'
import { StarRating } from './Common'
import { addToCart } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import './ProductCard.css'

export default function ProductCard({ product }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { navigate('/login'); return }
    try {
      await addToCart(product.id, 1)
      toast.success(`"${product.title}" added to cart`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add to cart')
    }
  }

  return (
    <Link to={`/products/${product.id}`} className="product-card card card-hover">
      <div className="product-card-img-wrap">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.title} className="product-card-img" />
          : <div className="product-card-img-placeholder">📖</div>
        }
        {product.stockQuantity === 0 && (
          <span className="product-card-oos">Out of Stock</span>
        )}
      </div>
      <div className="product-card-body">
        <span className="badge badge-brand product-card-cat">{product.categoryName}</span>
        <h3 className="product-card-title">{product.title}</h3>
        <p className="product-card-author">by {product.author}</p>
        {product.brand && <p className="product-card-brand">{product.brand}</p>}
        <StarRating rating={product.rating} count={product.reviewCount} />
        <div className="product-card-footer">
          <span className="product-card-price">${product.price?.toFixed(2)}</span>
          <button
            className="btn btn-accent btn-sm"
            onClick={handleAddToCart}
            disabled={product.stockQuantity === 0}
          >
            {product.stockQuantity === 0 ? 'Sold Out' : '+ Cart'}
          </button>
        </div>
        {product.tentativeDeliveryDate && (
          <p className="product-card-delivery">
            🚚 Est. delivery: {new Date(product.tentativeDeliveryDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </Link>
  )
}
