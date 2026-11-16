import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route, useLocation } from 'react-router-dom'
import CheckoutPage from './CheckoutPage'
import { getAddresses, addAddress, getCart } from '../api/services'
import toast from 'react-hot-toast'
import { renderWithProviders, ok, fail } from '../test/utils'

vi.mock('../api/services', () => ({ getAddresses: vi.fn(), addAddress: vi.fn(), getCart: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const addr = (o = {}) => ({ id: 1, fullName: 'Jane Doe', street: '1 Main St', city: 'Pune', state: 'MH', postalCode: '411001', country: 'India', phone: '999', isDefault: false, ...o })
const cart = { items: [{ id: 1, productTitle: 'Clean Code', quantity: 2, subtotal: 69.98 }], totalAmount: 69.98 }

function PaymentProbe() { const l = useLocation(); return <div data-testid="pay">{JSON.stringify(l.state)}</div> }
const setup = () => renderWithProviders(
  <Routes>
    <Route path="/checkout" element={<CheckoutPage />} />
    <Route path="/payment" element={<PaymentProbe />} />
  </Routes>, { route: '/checkout', loggedIn: true })

describe('CheckoutPage', () => {
  beforeEach(() => { getCart.mockResolvedValue(ok(cart)) })

  it('lists saved addresses and preselects the default one', async () => {
    getAddresses.mockResolvedValue(ok([addr({ id: 1 }), addr({ id: 2, fullName: 'Office', isDefault: true })]))
    setup()
    const radios = await screen.findAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(radios[1]).toBeChecked()
    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  it('preselects the first address when none is default', async () => {
    getAddresses.mockResolvedValue(ok([addr({ id: 5 }), addr({ id: 6 })]))
    setup()
    expect((await screen.findAllByRole('radio'))[0]).toBeChecked()
  })

  it('opens the new-address form automatically when there are no addresses', async () => {
    getAddresses.mockResolvedValue(ok([]))
    setup()
    expect(await screen.findByText('New Address')).toBeInTheDocument()
  })

  it('toggles the form with Add New Address / Cancel', async () => {
    getAddresses.mockResolvedValue(ok([addr()]))
    setup()
    await userEvent.click(await screen.findByRole('button', { name: '+ Add New Address' }))
    expect(screen.getByText('New Address')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '✕ Cancel' }))
    expect(screen.queryByText('New Address')).not.toBeInTheDocument()
  })

  it('shows the order summary with line items and total', async () => {
    getAddresses.mockResolvedValue(ok([addr()]))
    setup()
    expect(await screen.findByText('Clean Code ×2')).toBeInTheDocument()
    expect(screen.getAllByText('$69.98').length).toBeGreaterThanOrEqual(2)
  })

  it('applies gift points: $0.01 per point, never below zero', async () => {
    getAddresses.mockResolvedValue(ok([addr()]))
    setup()
    const input = await screen.findByPlaceholderText('0')
    await userEvent.clear(input); await userEvent.type(input, '500')
    expect(screen.getByText('Discount:').parentElement).toHaveTextContent('$5.00')
    expect(screen.getByText('−$5.00')).toBeInTheDocument()
    expect(screen.getByText('$64.98')).toBeInTheDocument()
    await userEvent.clear(input); await userEvent.type(input, '99999')
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('coerces negative / non-numeric points to 0', async () => {
    getAddresses.mockResolvedValue(ok([addr()]))
    setup()
    const input = await screen.findByPlaceholderText('0')
    fireEvent.change(input, { target: { value: '-5' } })
    expect(input).toHaveValue(0)
    expect(screen.queryByText(/Discount:/)).not.toBeInTheDocument()
  })

  it('saves a new address, selects it and toasts', async () => {
    getAddresses.mockResolvedValue(ok([]))
    addAddress.mockResolvedValue(ok(addr({ id: 9, fullName: 'New Person' })))
    const { container } = setup()
    await screen.findByText('New Address')
    const inputs = container.querySelectorAll('.address-form input.form-input')
    const [fullName, phone, street, city, state, postal, country] = inputs
    await userEvent.type(fullName, 'New Person'); await userEvent.type(phone, '123')
    await userEvent.type(street, '2 Road'); await userEvent.type(city, 'Pune'); await userEvent.type(state, 'MH')
    await userEvent.type(postal, '411001'); await userEvent.type(country, 'India')
    await userEvent.click(screen.getByRole('button', { name: 'Save Address' }))
    expect(addAddress).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'New Person', street: '2 Road', city: 'Pune', state: 'MH', postalCode: '411001', country: 'India', phone: '123' }))
    expect(await screen.findByText('New Person')).toBeInTheDocument()
    expect(screen.getByRole('radio')).toBeChecked()
    expect(toast.success).toHaveBeenCalledWith('Address saved')
  })

  it('requires the mandatory address fields (phone is optional)', async () => {
    getAddresses.mockResolvedValue(ok([]))
    const { container } = setup()
    await screen.findByText('New Address')
    const [fullName, phone, street, city, state, postal, country] = container.querySelectorAll('.address-form input.form-input')
    ;[fullName, street, city, state, postal, country].forEach(i => expect(i).toBeRequired())
    expect(phone).not.toBeRequired()
  })

  it('toasts the server error when saving fails', async () => {
    getAddresses.mockResolvedValue(ok([]))
    addAddress.mockRejectedValue(fail('Validation failed'))
    const { container } = setup()
    await screen.findByText('New Address')
    for (const i of container.querySelectorAll('.address-form input.form-input')) await userEvent.type(i, 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save Address' }))
    expect(toast.error).toHaveBeenCalledWith('Validation failed')
  })

  it('blocks Continue without an address and toasts', async () => {
    getAddresses.mockResolvedValue(ok([]))
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /continue to payment/i }))
    expect(toast.error).toHaveBeenCalledWith('Please select a delivery address')
    expect(screen.queryByTestId('pay')).not.toBeInTheDocument()
  })

  it('passes address id and points to the payment page', async () => {
    getAddresses.mockResolvedValue(ok([addr({ id: 3 })]))
    setup()
    const input = await screen.findByPlaceholderText('0')
    await userEvent.clear(input); await userEvent.type(input, '25')
    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }))
    expect(JSON.parse(screen.getByTestId('pay').textContent)).toEqual({ shippingAddressId: 3, pointsToRedeem: 25 })
  })
})
