import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { getCart, getCategories, getProducts, getOrders, getAddresses } from './api/services'
import { ok, page, sampleUser } from './test/utils'

vi.mock('./api/services', () => ({
  getCart: vi.fn(), getCategories: vi.fn(), getProducts: vi.fn(), getOrders: vi.fn(), getAddresses: vi.fn(),
  getProductById: vi.fn(), getRelatedProducts: vi.fn(), getProductsByCategory: vi.fn(), searchProducts: vi.fn(),
  login: vi.fn(), register: vi.fn(), addToCart: vi.fn(),
}))

const renderApp = (route, loggedIn = false) => {
  if (loggedIn) {
    localStorage.setItem('token', 't'); localStorage.setItem('user', JSON.stringify(sampleUser))
  }
  return render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>)
}

describe('App routing', () => {
  beforeEach(() => {
    getCategories.mockResolvedValue(ok([])); getProducts.mockResolvedValue(ok(page([])))
    getCart.mockResolvedValue(ok({ items: [], totalAmount: 0 })); getOrders.mockResolvedValue(ok(page([])))
    getAddresses.mockResolvedValue(ok([]))
  })

  it.each(['/cart', '/checkout', '/payment', '/confirmation/1', '/orders'])(
    'anonymous visitors to %s are redirected to the login page', async (route) => {
      renderApp(route)
      expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    })

  it.each([
    ['/', /Next Great Read/],
    ['/login', /Welcome Back/],
    ['/register', /Create Account/],
    ['/catalogue', /All Books/],
  ])('public route %s is reachable without logging in', async (route, text) => {
    renderApp(route)
    expect(await screen.findAllByText(text)).not.toHaveLength(0)
  })

  it('logged-in users can open /cart and /orders', async () => {
    renderApp('/cart', true)
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
  })

  it('logged-in users see their name in the navbar and the footer is rendered', async () => {
    renderApp('/orders', true)
    expect(await screen.findByText(/Jane/)).toBeInTheDocument()
    expect(document.querySelector('footer')).toBeInTheDocument()
  })

  it('unknown routes redirect to the home page', async () => {
    renderApp('/does/not/exist')
    expect(await screen.findByText('Next Great Read')).toBeInTheDocument()
  })
})
