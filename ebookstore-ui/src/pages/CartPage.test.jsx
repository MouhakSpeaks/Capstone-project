import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import CartPage from './CartPage'
import { getCart, updateCartItem, removeCartItem, getOrders } from '../api/services'
import toast from 'react-hot-toast'
import { renderWithProviders, ok, fail, page } from '../test/utils'

vi.mock('../api/services', () => ({
  getCart: vi.fn(), updateCartItem: vi.fn(), removeCartItem: vi.fn(), getOrders: vi.fn(),
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const item = (o = {}) => ({ id: 1, productId: 10, productTitle: 'Clean Code', unitPrice: 34.99, quantity: 2, subtotal: 69.98, ...o })
const cart = (items, total) => ({ id: 1, items, totalAmount: total })

const setup = () => renderWithProviders(
  <Routes>
    <Route path="/cart" element={<CartPage />} />
    <Route path="/checkout" element={<div>CHECKOUT PAGE</div>} />
  </Routes>, { route: '/cart', loggedIn: true })

describe('CartPage', () => {
  beforeEach(() => { getOrders.mockResolvedValue(ok(page([]))) })

  it('shows the empty state with a Continue Shopping link', async () => {
    getCart.mockResolvedValue(ok(cart([], 0)))
    setup()
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue Shopping' })).toHaveAttribute('href', '/catalogue')
    expect(screen.queryByText('Order Summary')).not.toBeInTheDocument()
  })

  it('lists items with unit price, quantity, subtotal and totals', async () => {
    getCart.mockResolvedValue(ok(cart([item(), item({ id: 2, productId: 11, productTitle: 'Cosmos', unitPrice: 16.99, quantity: 1, subtotal: 16.99 })], 86.97)))
    setup()
    expect(await screen.findByRole('link', { name: 'Clean Code' })).toHaveAttribute('href', '/products/10')
    expect(screen.getByText('$34.99 each')).toBeInTheDocument()
    expect(screen.getByText('$69.98')).toBeInTheDocument()
    expect(screen.getByText('Subtotal (2 items)')).toBeInTheDocument()
    expect(screen.getAllByText('$86.97')).toHaveLength(2) // subtotal + total
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('uses singular "item" for a single line', async () => {
    getCart.mockResolvedValue(ok(cart([item({ quantity: 1, subtotal: 34.99 })], 34.99)))
    setup()
    expect(await screen.findByText('Subtotal (1 item)')).toBeInTheDocument()
  })

  it('+ and − call updateCartItem with quantity ±1 and refresh the cart', async () => {
    getCart.mockResolvedValue(ok(cart([item()], 69.98)))
    updateCartItem.mockResolvedValue(ok(cart([item({ quantity: 3, subtotal: 104.97 })], 104.97)))
    setup()
    await screen.findByText('Clean Code')
    await userEvent.click(screen.getByText('+'))
    expect(updateCartItem).toHaveBeenCalledWith(1, 3)
    expect((await screen.findAllByText('$104.97')).length).toBeGreaterThan(0)
    updateCartItem.mockResolvedValue(ok(cart([item({ quantity: 2 })], 69.98)))
    await userEvent.click(screen.getByText('−'))
    expect(updateCartItem).toHaveBeenLastCalledWith(1, 2)
  })

  it('toasts an error when the quantity update fails', async () => {
    getCart.mockResolvedValue(ok(cart([item()], 69.98)))
    updateCartItem.mockRejectedValue(fail('x'))
    setup()
    await screen.findByText('Clean Code')
    await userEvent.click(screen.getByText('+'))
    expect(toast.error).toHaveBeenCalledWith('Failed to update quantity')
  })

  it('✕ removes the item and shows the empty state when it was the last', async () => {
    getCart.mockResolvedValue(ok(cart([item()], 69.98)))
    removeCartItem.mockResolvedValue(ok(cart([], 0)))
    setup()
    await screen.findByText('Clean Code')
    await userEvent.click(screen.getByText('✕'))
    expect(removeCartItem).toHaveBeenCalledWith(1)
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Item removed')
  })

  it('toasts an error when removal fails', async () => {
    getCart.mockResolvedValue(ok(cart([item()], 69.98)))
    removeCartItem.mockRejectedValue(fail('x'))
    setup()
    await screen.findByText('Clean Code')
    await userEvent.click(screen.getByText('✕'))
    expect(toast.error).toHaveBeenCalledWith('Failed to remove item')
    expect(screen.getByText('Clean Code')).toBeInTheDocument()
  })

  it('Proceed to Checkout navigates to /checkout', async () => {
    getCart.mockResolvedValue(ok(cart([item()], 69.98)))
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /proceed to checkout/i }))
    expect(screen.getByText('CHECKOUT PAGE')).toBeInTheDocument()
  })

  it('recommends products from the most recent order', async () => {
    getCart.mockResolvedValue(ok(cart([item()], 69.98)))
    getOrders.mockResolvedValue(ok(page([{ items: [
      { productId: 5, productTitle: '1984', unitPrice: 9.99 },
      { productId: 6, productTitle: 'Cosmos', unitPrice: 16.99 },
    ] }])))
    setup()
    const section = (await screen.findByText(/Based on Your Order/)).closest('section')
    expect(within(section).getByText('1984')).toBeInTheDocument()
    expect(within(section).getByText('$9.99')).toBeInTheDocument()
    expect(within(section).getByText('Cosmos').closest('a')).toHaveAttribute('href', '/products/6')
  })

  it('still renders the cart when the recommendation lookup fails', async () => {
    getCart.mockResolvedValue(ok(cart([item()], 69.98)))
    getOrders.mockRejectedValue(new Error('boom'))
    setup()
    expect(await screen.findByText('Clean Code')).toBeInTheDocument()
    expect(screen.queryByText(/Based on Your Order/)).not.toBeInTheDocument()
  })
})
