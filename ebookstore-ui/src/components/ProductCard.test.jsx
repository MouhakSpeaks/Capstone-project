import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import ProductCard from './ProductCard'
import { addToCart } from '../api/services'
import toast from 'react-hot-toast'
import { renderWithProviders, sampleProduct, fail, ok } from '../test/utils'

vi.mock('../api/services', () => ({ addToCart: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const setup = (product, opts) => renderWithProviders(
  <Routes>
    <Route path="/" element={<ProductCard product={product} />} />
    <Route path="/login" element={<div>LOGIN PAGE</div>} />
    <Route path="/products/:id" element={<div>DETAIL PAGE</div>} />
  </Routes>, opts)

describe('ProductCard', () => {
  it('shows title, author, brand, category, price and rating count', () => {
    setup(sampleProduct())
    expect(screen.getByText('Clean Code')).toBeInTheDocument()
    expect(screen.getByText('by Robert C. Martin')).toBeInTheDocument()
    expect(screen.getByText('Prentice Hall')).toBeInTheDocument()
    expect(screen.getByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('$34.99')).toBeInTheDocument()
    expect(screen.getByText('(10)')).toBeInTheDocument()
    expect(screen.getByText(/Est\. delivery/)).toBeInTheDocument()
  })

  it('formats whole-number prices with two decimals', () => {
    setup(sampleProduct({ price: 10 }))
    expect(screen.getByText('$10.00')).toBeInTheDocument()
  })

  it('renders the cover image when imageUrl exists, otherwise a placeholder', () => {
    const { unmount } = setup(sampleProduct({ imageUrl: 'http://x/y.png' }))
    expect(screen.getByAltText('Clean Code')).toHaveAttribute('src', 'http://x/y.png')
    unmount()
    setup(sampleProduct())
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('links to the product detail page', () => {
    setup(sampleProduct({ id: 42 }))
    expect(screen.getByRole('link')).toHaveAttribute('href', '/products/42')
  })

  it('shows Out of Stock + disabled Sold Out button when stock is 0', () => {
    setup(sampleProduct({ stockQuantity: 0 }))
    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sold Out' })).toBeDisabled()
  })

  it('redirects anonymous users to /login instead of calling the API', async () => {
    setup(sampleProduct())
    await userEvent.click(screen.getByRole('button', { name: '+ Cart' }))
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument()
    expect(addToCart).not.toHaveBeenCalled()
  })

  it('adds to cart for logged-in users, toasts, and does NOT navigate to the detail page', async () => {
    addToCart.mockResolvedValue(ok({}))
    setup(sampleProduct({ id: 7 }), { loggedIn: true })
    await userEvent.click(screen.getByRole('button', { name: '+ Cart' }))
    expect(addToCart).toHaveBeenCalledWith(7, 1)
    expect(toast.success).toHaveBeenCalledWith('"Clean Code" added to cart')
    expect(screen.queryByText('DETAIL PAGE')).not.toBeInTheDocument()
  })

  it('shows the server error as a toast when add-to-cart fails', async () => {
    addToCart.mockRejectedValue(fail('Product not found: 1'))
    setup(sampleProduct(), { loggedIn: true })
    await userEvent.click(screen.getByRole('button', { name: '+ Cart' }))
    expect(toast.error).toHaveBeenCalledWith('Product not found: 1')
  })
})
