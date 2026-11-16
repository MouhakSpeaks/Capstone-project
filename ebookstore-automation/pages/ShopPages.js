import { expect } from '@playwright/test'
import { BasePage } from './BasePage.js'

export class CartPage extends BasePage {
  get items() { return this.page.locator('.cart-item') }
  get emptyMessage() { return this.page.getByText('Your cart is empty') }
  get total() { return this.page.locator('.cart-summary-total span').last() }
  get checkoutButton() { return this.page.getByRole('button', { name: /Proceed to Checkout/ }) }

  item(title) { return this.items.filter({ hasText: title }) }

  async open() { await this.goto('/cart'); await expect(this.items.first().or(this.emptyMessage)).toBeVisible() }
  async increase(title) { await this.item(title).locator('.qty-btn', { hasText: '+' }).click() }
  async decrease(title) { await this.item(title).locator('.qty-btn', { hasText: '−' }).click() }
  async remove(title) { await this.item(title).locator('.cart-remove').click() }
  async quantityOf(title) { return Number(await this.item(title).locator('.qty-val').textContent()) }
  async subtotalOf(title) { return (await this.item(title).locator('.cart-item-subtotal').textContent()).trim() }
}

export class CheckoutPage extends BasePage {
  get addressCards() { return this.page.locator('.address-card') }
  get selectedAddress() { return this.page.locator('.address-card.selected') }
  get addAddressButton() { return this.page.getByRole('button', { name: /Add New Address|Cancel/ }) }
  get addressForm() { return this.page.locator('.address-form') }
  get giftInput() { return this.page.locator('.gift-input') }
  get total() { return this.page.locator('.checkout-summary-total span').last() }
  get continueButton() { return this.page.getByRole('button', { name: /Continue to Payment/ }) }

  async fillAddress(a) {
    const f = this.addressForm
    await f.locator('.form-group', { hasText: 'Full Name' }).locator('input').fill(a.fullName)
    await f.locator('.form-group', { hasText: 'Phone' }).locator('input').fill(a.phone ?? '')
    await f.locator('.form-group', { hasText: 'Street' }).locator('input').fill(a.street)
    await f.locator('.form-group', { hasText: 'City' }).locator('input').fill(a.city)
    await f.locator('.form-group', { hasText: 'State' }).locator('input').fill(a.state)
    await f.locator('.form-group', { hasText: 'Postal Code' }).locator('input').fill(a.postalCode)
    await f.locator('.form-group', { hasText: 'Country' }).locator('input').fill(a.country)
  }
  async saveAddress() { await this.page.getByRole('button', { name: 'Save Address' }).click() }
  async setPoints(n) { await this.giftInput.fill(String(n)) }
  async totalAmount() { return parseFloat((await this.total.textContent()).replace('$', '')) }
}

export class PaymentPage extends BasePage {
  get payButton() { return this.page.getByRole('button', { name: /Pay Now/ }) }
  get error() { return this.page.locator('.alert-error') }

  method(label) { return this.page.locator('.payment-method-btn', { hasText: label }) }
  async choose(label) { await this.method(label).click() }
  async payWithUpi(upi = 'auto@upi') {
    await this.choose('UPI')
    await this.page.getByPlaceholder('yourname@upi').fill(upi)
    await this.payButton.click()
  }
  async payWithCard({ number = '4111111111111111', expiry = '12/30', cvv = '123' } = {}, label = 'Credit Card') {
    await this.choose(label)
    await this.page.getByPlaceholder('1234 5678 9012 3456').fill(number)
    await this.page.getByPlaceholder('MM/YY').fill(expiry)
    await this.page.getByPlaceholder('•••').fill(cvv)
    await this.payButton.click()
  }
}

export class ConfirmationPage extends BasePage {
  get heading() { return this.page.getByText('Order Confirmed!') }
  get orderNumber() { return this.page.locator('.conf-meta-val').first() }
  get status() { return this.page.locator('.conf-meta-item', { hasText: 'Status' }).locator('.badge') }
  get totalPaid() { return this.page.locator('.conf-total') }
  get address() { return this.page.locator('.conf-address') }
  get pointsNote() { return this.page.locator('.conf-points') }
  get items() { return this.page.locator('.conf-item') }
}

export class OrdersPage extends BasePage {
  get cards() { return this.page.locator('.order-card') }
  get emptyState() { return this.page.locator('.empty-state') }
  get giftPoints() { return this.page.locator('.gift-points-display') }

  async open() { await this.goto('/orders'); await expect(this.cards.first().or(this.emptyState)).toBeVisible() }
  card(orderNumber) { return this.cards.filter({ hasText: orderNumber }) }
  async expand(orderNumber) { await this.card(orderNumber).locator('.order-header').click() }
  statusOf(orderNumber) { return this.card(orderNumber).locator('.order-status-badge') }
  buyAgain(orderNumber) { return this.card(orderNumber).getByRole('button', { name: /Buy Again/ }) }
  cancel(orderNumber) { return this.card(orderNumber).getByRole('button', { name: 'Cancel Order' }) }
}
