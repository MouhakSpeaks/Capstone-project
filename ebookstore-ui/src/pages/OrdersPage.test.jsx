import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrdersPage from './OrdersPage'
import { getOrders, cancelOrder, addToCart } from '../api/services'
import toast from 'react-hot-toast'
import { renderWithProviders, ok, fail, page } from '../test/utils'

vi.mock('../api/services', () => ({ getOrders: vi.fn(), cancelOrder: vi.fn(), addToCart: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const order = (o = {}) => ({
  id: 1, orderNumber: 'ORD-AAA111', status: 'CONFIRMED', totalAmount: 69.98, pointsRedeemed: 0,
  createdAt: '2030-01-10T10:00:00',
  shippingAddress: { fullName: 'Jane Doe', street: '1 Main St', city: 'Pune', state: 'MH', postalCode: '411001' },
  items: [{ productId: 10, productTitle: 'Clean Code', quantity: 2, unitPrice: 34.99, subtotal: 69.98 }],
  ...o,
})
const setup = () => renderWithProviders(<OrdersPage />, { route: '/orders', loggedIn: true })
const expand = async (num = 'ORD-AAA111') => userEvent.click(await screen.findByText(num))

describe('OrdersPage', () => {
  beforeEach(() => { vi.stubGlobal('confirm', vi.fn(() => true)) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('shows the empty state when there are no orders', async () => {
    getOrders.mockResolvedValue(ok(page([])))
    setup()
    expect(await screen.findByText("You haven't placed any orders yet.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start Shopping' })).toHaveAttribute('href', '/catalogue')
  })

  it('lists orders with number, total and a status badge', async () => {
    getOrders.mockResolvedValue(ok(page([order(), order({ id: 2, orderNumber: 'ORD-BBB222', status: 'CANCELLED', totalAmount: 10 })])))
    setup()
    expect(await screen.findByText('ORD-AAA111')).toBeInTheDocument()
    expect(screen.getByText('$69.98')).toBeInTheDocument()
    expect(screen.getByText('CONFIRMED')).toBeInTheDocument()
    expect(screen.getByText('CANCELLED')).toBeInTheDocument()
    expect(getOrders).toHaveBeenCalledWith(0, 10)
  })

  it('previews at most three items and a "+N more" label', async () => {
    const items = [1, 2, 3, 4, 5].map(i => ({ productId: i, productTitle: `B${i}`, quantity: 1, unitPrice: 1, subtotal: 1 }))
    getOrders.mockResolvedValue(ok(page([order({ items })])))
    const { container } = setup()
    await screen.findByText('ORD-AAA111')
    expect(container.querySelectorAll('.order-preview-item')).toHaveLength(3)
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('expands to show items, address, redeemed points and actions', async () => {
    getOrders.mockResolvedValue(ok(page([order({ pointsRedeemed: 50 })])))
    setup()
    await expand()
    expect(screen.getByRole('link', { name: 'Clean Code' })).toHaveAttribute('href', '/products/10')
    expect(screen.getByText('Qty: 2 × $34.99')).toBeInTheDocument()
    expect(screen.getByText(/Delivering to:/).parentElement).toHaveTextContent('Jane Doe')
    expect(screen.getByText(/50 gift points were redeemed/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Details' })).toHaveAttribute('href', '/confirmation/1')
    expect(screen.getByRole('button', { name: /Buy Again/ })).toBeInTheDocument()
  })

  it('Cancel is offered only for PENDING / CONFIRMED orders', async () => {
    getOrders.mockResolvedValue(ok(page([
      order({ id: 1, orderNumber: 'ORD-OK', status: 'CONFIRMED' }),
      order({ id: 2, orderNumber: 'ORD-SHIP', status: 'SHIPPED' }),
    ])))
    setup()
    await expand('ORD-OK')
    expect(screen.getByRole('button', { name: 'Cancel Order' })).toBeInTheDocument()
    await userEvent.click(screen.getByText('ORD-OK'))
    await expand('ORD-SHIP')
    expect(screen.queryByRole('button', { name: 'Cancel Order' })).not.toBeInTheDocument()
  })

  it('cancelling asks for confirmation, calls the API and reloads', async () => {
    getOrders.mockResolvedValueOnce(ok(page([order()])))
      .mockResolvedValueOnce(ok(page([order({ status: 'CANCELLED' })])))
    cancelOrder.mockResolvedValue(ok({}))
    setup()
    await expand()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel Order' }))
    expect(confirm).toHaveBeenCalled()
    expect(cancelOrder).toHaveBeenCalledWith(1)
    expect(toast.success).toHaveBeenCalledWith('Order cancelled')
    expect(await screen.findByText('CANCELLED')).toBeInTheDocument()
    expect(getOrders).toHaveBeenCalledTimes(2)
  })

  it('does nothing if the user declines the cancel confirmation', async () => {
    confirm.mockReturnValue(false)
    getOrders.mockResolvedValue(ok(page([order()])))
    setup()
    await expand()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel Order' }))
    expect(cancelOrder).not.toHaveBeenCalled()
  })

  it('toasts the server message if cancelling is refused (e.g. after 48h)', async () => {
    cancelOrder.mockRejectedValue(fail('Order cannot be cancelled after 48 hours'))
    getOrders.mockResolvedValue(ok(page([order()])))
    setup()
    await expand()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel Order' }))
    expect(toast.error).toHaveBeenCalledWith('Order cannot be cancelled after 48 hours')
  })

  it('Buy Again adds every order line to the cart with its quantity', async () => {
    addToCart.mockResolvedValue(ok({}))
    getOrders.mockResolvedValue(ok(page([order({ items: [
      { productId: 10, productTitle: 'A', quantity: 2, unitPrice: 1, subtotal: 2 },
      { productId: 11, productTitle: 'B', quantity: 1, unitPrice: 1, subtotal: 1 },
    ] })])))
    setup()
    await expand()
    await userEvent.click(screen.getByRole('button', { name: /Buy Again/ }))
    expect(addToCart).toHaveBeenNthCalledWith(1, 10, 2)
    expect(addToCart).toHaveBeenNthCalledWith(2, 11, 1)
    expect(toast.success).toHaveBeenCalledWith('Items added to cart!')
  })

  it('Buy Again reports a failure', async () => {
    addToCart.mockRejectedValue(fail('x'))
    getOrders.mockResolvedValue(ok(page([order()])))
    setup()
    await expand()
    await userEvent.click(screen.getByRole('button', { name: /Buy Again/ }))
    expect(toast.error).toHaveBeenCalledWith('Some items could not be added')
  })

  it('shows gift points from the logged-in user (0 when absent)', async () => {
    getOrders.mockResolvedValue(ok(page([])))
    setup()
    const box = (await screen.findByText(/Gift Points available/)).closest('div')
    expect(within(box).getByText('0')).toBeInTheDocument()
  })

  it('pagination loads the requested page', async () => {
    getOrders.mockResolvedValue(ok(page([order()], { totalPages: 2 })))
    setup()
    await screen.findByText('ORD-AAA111')
    await userEvent.click(screen.getByText('2'))
    expect(getOrders).toHaveBeenLastCalledWith(1, 10)
  })
})
