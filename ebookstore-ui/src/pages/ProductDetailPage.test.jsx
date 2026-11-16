import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import ProductDetailPage from './ProductDetailPage'
import { getProductById, getRelatedProducts, addToCart } from '../api/services'
import toast from 'react-hot-toast'
import { renderWithProviders, ok, fail, sampleProduct } from '../test/utils'

vi.mock('../api/services', () => ({ getProductById: vi.fn(), getRelatedProducts: vi.fn(), addToCart: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const MINUS = '\u2212'

const full = (o = {}) => sampleProduct({
  id: 1, description: 'A handbook of agile craftsmanship', isbn: '978-0132350884', publisher: 'Prentice Hall',
  publicationDate: '2008-08-01', stockQuantity: 5, ...o,
})
const setup = (opts = {}) => renderWithProviders(
  <Routes>
    <Route path="/products/:id" element={<ProductDetailPage />} />
    <Route path="/login" element={<div>LOGIN PAGE</div>} />
    <Route path="/cart" element={<div>CART PAGE</div>} />
    <Route path="/catalogue" element={<div>CATALOGUE PAGE</div>} />
  </Routes>, { route: '/products/1', ...opts })

describe('ProductDetailPage', () => {
  beforeEach(() => {
    getProductById.mockResolvedValue(ok(full()))
    getRelatedProducts.mockResolvedValue(ok([sampleProduct({ id: 2, title: 'Pragmatic Programmer' })]))
  })

  it('shows full product details', async () => {
    setup()
    expect(await screen.findByRole('heading', { name: 'Clean Code' })).toBeInTheDocument()
    expect(screen.getByText('Robert C. Martin')).toBeInTheDocument()
    expect(document.querySelector('.product-detail-price')).toHaveTextContent('$34.99')
    expect(screen.getByText('\u2713 In Stock (5 available)')).toBeInTheDocument()
    expect(screen.getByText('A handbook of agile craftsmanship')).toBeInTheDocument()
    expect(screen.getByText('978-0132350884')).toBeInTheDocument()
    expect(screen.getByText(/Estimated Delivery/)).toBeInTheDocument()
  })

  it('lists related books', async () => {
    setup()
    expect(await screen.findByText('Pragmatic Programmer')).toBeInTheDocument()
    expect(getRelatedProducts).toHaveBeenCalledWith('1')
  })

  it('hides the related section when there are none', async () => {
    getRelatedProducts.mockResolvedValue(ok([]))
    setup()
    await screen.findByRole('heading', { name: 'Clean Code' })
    expect(screen.queryByText(/Related/)).not.toBeInTheDocument()
  })

  it('out of stock: shows the badge and hides purchase buttons', async () => {
    getProductById.mockResolvedValue(ok(full({ stockQuantity: 0 })))
    setup()
    expect(await screen.findByText('\u2717 Out of Stock')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /buy now/i })).not.toBeInTheDocument()
  })

  it('quantity selector is clamped between 1 and available stock', async () => {
    getProductById.mockResolvedValue(ok(full({ stockQuantity: 2 })))
    setup()
    await screen.findByRole('heading', { name: 'Clean Code' })
    const qty = () => document.querySelector('.qty-val').textContent
    await userEvent.click(screen.getByText(MINUS))
    expect(qty()).toBe('1')
    await userEvent.click(screen.getByText('+')); await userEvent.click(screen.getByText('+')); await userEvent.click(screen.getByText('+'))
    expect(qty()).toBe('2')
  })

  it('anonymous users are sent to /login on Add to Cart', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /add to cart/i }))
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument()
    expect(addToCart).not.toHaveBeenCalled()
  })

  it('adds the chosen quantity to the cart for a logged-in user', async () => {
    addToCart.mockResolvedValue(ok({}))
    setup({ loggedIn: true })
    await screen.findByRole('heading', { name: 'Clean Code' })
    await userEvent.click(screen.getByText('+'))
    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))
    expect(addToCart).toHaveBeenCalledWith(1, 2)
    expect(toast.success).toHaveBeenCalledWith('Added 2 \u00d7 "Clean Code" to cart')
  })

  it('Buy Now adds to cart then opens the cart page', async () => {
    addToCart.mockResolvedValue(ok({}))
    setup({ loggedIn: true })
    await userEvent.click(await screen.findByRole('button', { name: 'Buy Now' }))
    expect(await screen.findByText('CART PAGE')).toBeInTheDocument()
    expect(addToCart).toHaveBeenCalledWith(1, 1)
  })

  it('toasts the server error when adding fails', async () => {
    addToCart.mockRejectedValue(fail('Product not found: 1'))
    setup({ loggedIn: true })
    await userEvent.click(await screen.findByRole('button', { name: /add to cart/i }))
    expect(toast.error).toHaveBeenCalledWith('Product not found: 1')
  })

  it('redirects to the catalogue when the product does not exist', async () => {
    getProductById.mockRejectedValue(fail('Product not found: 1'))
    setup()
    expect(await screen.findByText('CATALOGUE PAGE')).toBeInTheDocument()
  })
})
