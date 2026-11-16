import { screen } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import ConfirmationPage from './ConfirmationPage'
import HomePage from './HomePage'
import { getOrderById, getCategories, getProducts } from '../api/services'
import { renderWithProviders, ok, fail, page, sampleProduct } from '../test/utils'

vi.mock('../api/services', () => ({
  getOrderById: vi.fn(), getCategories: vi.fn(), getProducts: vi.fn(), addToCart: vi.fn(),
}))

describe('ConfirmationPage', () => {
  const setup = () => renderWithProviders(
    <Routes>
      <Route path="/confirmation/:orderId" element={<ConfirmationPage />} />
      <Route path="/orders" element={<div>ORDERS PAGE</div>} />
    </Routes>, { route: '/confirmation/9', loggedIn: true })

  it('shows the confirmed order details', async () => {
    getOrderById.mockResolvedValue(ok({
      id: 9, orderNumber: 'ORD-XYZ789', status: 'CONFIRMED', totalAmount: 50, pointsRedeemed: 20,
      createdAt: '2030-02-01T09:30:00',
      shippingAddress: { fullName: 'Jane Doe', street: '1 Main St', city: 'Pune', state: 'MH', postalCode: '411001', country: 'India' },
      items: [{ productId: 3, productTitle: 'Cosmos', quantity: 1, unitPrice: 50, subtotal: 50 }],
    }))
    setup()
    expect(await screen.findByText('Order Confirmed!')).toBeInTheDocument()
    expect(getOrderById).toHaveBeenCalledWith('9')
    expect(screen.getByText('ORD-XYZ789')).toBeInTheDocument()
    expect(screen.getAllByText('$50.00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('link', { name: 'Cosmos' })).toHaveAttribute('href', '/products/3')
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument()
    expect(screen.getByText(/20 gift points redeemed/)).toBeInTheDocument()
    expect(screen.getByText(/within 48 hours/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View My Orders' })).toHaveAttribute('href', '/orders')
  })

  it('omits the points banner when no points were redeemed', async () => {
    getOrderById.mockResolvedValue(ok({ id: 9, orderNumber: 'N', status: 'CONFIRMED', totalAmount: 1, pointsRedeemed: 0, createdAt: '2030-02-01T09:30:00', items: [] }))
    setup()
    await screen.findByText('Order Confirmed!')
    expect(screen.queryByText(/gift points redeemed/)).not.toBeInTheDocument()
  })

  it('redirects to /orders when the order cannot be loaded', async () => {
    getOrderById.mockRejectedValue(fail('Order not found: 9'))
    setup()
    expect(await screen.findByText('ORDERS PAGE')).toBeInTheDocument()
  })
})

describe('HomePage', () => {
  const setup = () => renderWithProviders(<HomePage />)

  it('renders the hero with calls to action', async () => {
    getCategories.mockResolvedValue(ok([])); getProducts.mockResolvedValue(ok(page([])))
    setup()
    expect(screen.getByText('Next Great Read')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse Catalogue' })).toHaveAttribute('href', '/catalogue')
    expect(screen.getByRole('link', { name: 'Join Free' })).toHaveAttribute('href', '/register')
    await screen.findByText(/No products yet/)
  })

  it('shows API categories linking by id, plus top-rated books', async () => {
    getCategories.mockResolvedValue(ok([{ id: 1, name: 'Technology' }, { id: 2, name: 'Fiction' }]))
    getProducts.mockResolvedValue(ok(page([sampleProduct({ title: 'Top Book' })])))
    setup()
    await screen.findByText('Top Book')
    expect(document.querySelector('a.category-chip[href="/catalogue?categoryId=1"]')).toHaveTextContent('Technology')
    expect(screen.getByText('Top Book')).toBeInTheDocument()
    expect(getProducts).toHaveBeenCalledWith(0, 8, 'rating')
  })

  it('falls back to default category chips when the API returns none', async () => {
    getCategories.mockResolvedValue(ok([])); getProducts.mockResolvedValue(ok(page([])))
    setup()
    expect(await screen.findByRole('link', { name: /History/ })).toBeInTheDocument()
    expect(screen.getAllByText(/Fiction|Science|Business/).length).toBeGreaterThan(0)
  })
})

