import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import { getCart } from '../api/services'
import { renderWithProviders, ok } from '../test/utils'

vi.mock('../api/services', () => ({ getCart: vi.fn(), login: vi.fn(), register: vi.fn() }))

function Where() { const l = useLocation(); return <div data-testid="loc">{l.pathname}{l.search}</div> }
const setup = (opts) => renderWithProviders(
  <><Navbar /><Routes><Route path="*" element={<Where />} /></Routes></>, opts)

describe('Navbar', () => {
  it('anonymous: shows Sign In + Register, hides Cart/Orders, never calls the cart API', () => {
    setup()
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register')
    expect(screen.queryByRole('link', { name: /cart/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Orders' })).not.toBeInTheDocument()
    expect(getCart).not.toHaveBeenCalled()
  })

  it('logged in: shows name, Cart, Orders and Sign Out', async () => {
    getCart.mockResolvedValue(ok({ items: [] }))
    setup({ loggedIn: true })
    expect(screen.getByText(/Jane/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cart/i })).toHaveAttribute('href', '/cart')
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/orders')
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
    await waitFor(() => expect(getCart).toHaveBeenCalled())
  })

  it('shows a cart badge with the number of distinct items', async () => {
    getCart.mockResolvedValue(ok({ items: [{ id: 1 }, { id: 2 }, { id: 3 }] }))
    setup({ loggedIn: true })
    expect(await screen.findByText('3')).toHaveClass('cart-badge')
  })

  it('hides the badge when the cart is empty or the cart call fails', async () => {
    getCart.mockRejectedValue(new Error('boom'))
    const { container } = setup({ loggedIn: true })
    await waitFor(() => expect(getCart).toHaveBeenCalled())
    expect(container.querySelector('.cart-badge')).toBeNull()
  })

  it('search navigates to /catalogue?search=<encoded> and clears the box', async () => {
    setup()
    const input = screen.getByPlaceholderText(/search books/i)
    await userEvent.type(input, ' c++ & more {enter}')
    expect(screen.getByTestId('loc')).toHaveTextContent('/catalogue?search=c%2B%2B%20%26%20more')
    expect(input).toHaveValue('')
  })

  it('ignores blank searches', async () => {
    setup()
    await userEvent.type(screen.getByPlaceholderText(/search books/i), '   {enter}')
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/$/)
  })

  it('Sign Out clears the session, returns home and swaps the links back', async () => {
    getCart.mockResolvedValue(ok({ items: [] }))
    setup({ loggedIn: true, route: '/orders' })
    await userEvent.click(screen.getByRole('button', { name: 'Sign Out' }))
    expect(localStorage.getItem('token')).toBeNull()
    expect(screen.getByTestId('loc')).toHaveTextContent(/^\/$/)
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('hamburger toggles the mobile menu open class', async () => {
    const { container } = setup()
    const links = container.querySelector('.navbar-links')
    expect(links).not.toHaveClass('open')
    await userEvent.click(screen.getByText('☰'))
    expect(links).toHaveClass('open')
    await userEvent.click(screen.getByText('✕'))
    expect(links).not.toHaveClass('open')
  })
})
