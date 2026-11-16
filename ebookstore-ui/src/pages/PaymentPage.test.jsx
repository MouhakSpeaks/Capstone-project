import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import PaymentPage from './PaymentPage'
import { placeOrder, processPayment } from '../api/services'
import toast from 'react-hot-toast'
import { renderWithProviders, ok, fail } from '../test/utils'

vi.mock('../api/services', () => ({ placeOrder: vi.fn(), processPayment: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const DEFAULT_STATE = { shippingAddressId: 3, pointsToRedeem: 0 }
const setup = (state = DEFAULT_STATE) => {
  const route = { pathname: '/payment', state }
  return renderWithProviders(
    <Routes>
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/checkout" element={<div>CHECKOUT PAGE</div>} />
      <Route path="/confirmation/:orderId" element={<div>CONFIRMATION PAGE</div>} />
    </Routes>, { route, loggedIn: true })
}

describe('PaymentPage', () => {
  // KNOWN DEFECT (UI-02): PaymentPage calls navigate() during render, which React Router v6 ignores,
  // so opening /payment directly renders a blank page. `it.fails` passes while the bug exists and
  // turns red once it is fixed (then change it back to a plain `it`).
  it.fails('[UI-02] redirects to /checkout when opened without checkout state', async () => {
    setup(null)
    expect(await screen.findByText('CHECKOUT PAGE')).toBeInTheDocument()
  })

  it('defaults to Credit Card with card inputs', () => {
    setup()
    expect(screen.getByText('Credit Card Details')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeRequired()
    expect(screen.getByPlaceholderText('MM/YY')).toBeRequired()
  })

  it('offers all five payment methods', () => {
    setup()
    for (const l of ['Credit Card', 'Debit Card', 'Net Banking', 'UPI', 'Gift Points'])
      expect(screen.getByRole('button', { name: new RegExp(l) })).toBeInTheDocument()
  })

  it('switches forms per method', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /Debit Card/ }))
    expect(screen.getByText('Debit Card Details')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /UPI/ }))
    expect(screen.getByPlaceholderText('yourname@upi')).toBeRequired()
    expect(screen.queryByPlaceholderText('1234 5678 9012 3456')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Net Banking/ }))
    expect(screen.getByText(/redirected to your bank/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Gift Points/ }))
    expect(screen.getByText(/gift points will be applied/i)).toBeInTheDocument()
  })

  it('auto-formats the card number into groups of four digits and strips letters', async () => {
    setup()
    const card = screen.getByPlaceholderText('1234 5678 9012 3456')
    await userEvent.type(card, '4111a1111 11111111')
    expect(card).toHaveValue('4111 1111 1111 1111')
  })

  it('shows the points discount in the summary and gift-point form', async () => {
    setup({ shippingAddressId: 3, pointsToRedeem: 150 })
    expect(screen.getByText('\u2212$1.50')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Gift Points/ }))
    expect(screen.getByText(/Redeeming 150 points/)).toBeInTheDocument()
  })

  it('places the order, pays with card, then goes to confirmation', async () => {
    placeOrder.mockResolvedValue(ok({ id: 77 }))
    processPayment.mockResolvedValue(ok({}))
    setup({ shippingAddressId: 3, pointsToRedeem: 40 })
    await userEvent.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '4111111111111111')
    await userEvent.type(screen.getByPlaceholderText('MM/YY'), '12/30')
    await userEvent.type(document.querySelector('input[type="password"]'), '123')
    await userEvent.click(screen.getByRole('button', { name: /pay now/i }))
    expect(await screen.findByText('CONFIRMATION PAGE')).toBeInTheDocument()
    expect(placeOrder).toHaveBeenCalledWith({ shippingAddressId: 3, pointsToRedeem: 40 })
    expect(processPayment).toHaveBeenCalledWith({
      orderId: 77, paymentMethod: 'CREDIT_CARD',
      cardNumber: '4111 1111 1111 1111', cardExpiry: '12/30', cardCvv: '123', upiId: undefined,
    })
    expect(toast.success).toHaveBeenCalled()
  })

  it('pays with UPI and sends the UPI id', async () => {
    placeOrder.mockResolvedValue(ok({ id: 5 }))
    processPayment.mockResolvedValue(ok({}))
    setup()
    await userEvent.click(screen.getByRole('button', { name: /UPI/ }))
    await userEvent.type(screen.getByPlaceholderText('yourname@upi'), 'jane@upi')
    await userEvent.click(screen.getByRole('button', { name: /pay now/i }))
    await screen.findByText('CONFIRMATION PAGE')
    expect(processPayment).toHaveBeenCalledWith(expect.objectContaining({ orderId: 5, paymentMethod: 'UPI', upiId: 'jane@upi', cardNumber: undefined }))
  })

  it('shows the server error and stays on the page when the order cannot be placed', async () => {
    placeOrder.mockRejectedValue(fail('Cart is empty'))
    setup()
    await userEvent.click(screen.getByRole('button', { name: /Net Banking/ }))
    await userEvent.click(screen.getByRole('button', { name: /pay now/i }))
    expect(await screen.findByText('Cart is empty')).toHaveClass('alert-error')
    expect(processPayment).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /pay now/i })).toBeEnabled()
  })

  it('shows an error when payment fails after the order was placed', async () => {
    placeOrder.mockResolvedValue(ok({ id: 8 }))
    processPayment.mockRejectedValue(fail('Cannot pay for a cancelled order'))
    setup()
    await userEvent.click(screen.getByRole('button', { name: /Net Banking/ }))
    await userEvent.click(screen.getByRole('button', { name: /pay now/i }))
    expect(await screen.findByText('Cannot pay for a cancelled order')).toBeInTheDocument()
    expect(screen.queryByText('CONFIRMATION PAGE')).not.toBeInTheDocument()
  })

  it('uses a generic message when the error has no server message', async () => {
    placeOrder.mockRejectedValue(new Error('Network Error'))
    setup()
    await userEvent.click(screen.getByRole('button', { name: /Net Banking/ }))
    await userEvent.click(screen.getByRole('button', { name: /pay now/i }))
    expect(await screen.findByText('Payment failed. Please try again.')).toBeInTheDocument()
  })
})
