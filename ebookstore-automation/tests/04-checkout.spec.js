import { test, expect, api } from '../fixtures/index.js'
import { SAMPLE_ADDRESS } from '../support/api.js'

test.describe('Checkout', () => {
  test('a first-time customer is shown the new address form @smoke', async ({ signedIn: page, pages, customer, book }) => {
    await api.addToCart(customer.token, book.id, 1)
    await page.goto('/checkout')
    await expect(pages.checkout.addressForm).toBeVisible()
    await expect(page.getByText('New Address')).toBeVisible()
    await expect(pages.checkout.addressCards).toHaveCount(0)
  })

  test('saving an address adds it to the list and selects it', async ({ signedIn: page, pages, customer, book }) => {
    await api.addToCart(customer.token, book.id, 1)
    await page.goto('/checkout')
    await pages.checkout.fillAddress(SAMPLE_ADDRESS)
    await pages.checkout.saveAddress()
    await expect(pages.checkout.selectedAddress).toContainText('12 Test Street')
    await expect(pages.checkout.selectedAddress).toContainText('Pune, MH 411001')
    await expect(pages.checkout.addressForm).toHaveCount(0)
  })

  test('required address fields block saving (phone is optional)', async ({ signedIn: page, pages, customer, book }) => {
    await api.addToCart(customer.token, book.id, 1)
    await page.goto('/checkout')
    await pages.checkout.saveAddress()
    expect(await pages.checkout.addressForm.locator('input:invalid').count()).toBe(6)
    await pages.checkout.fillAddress({ ...SAMPLE_ADDRESS, phone: '' })
    await pages.checkout.saveAddress()
    await expect(pages.checkout.selectedAddress).toBeVisible()
  })

  test('saved addresses are listed and the default one is preselected', async ({ signedIn: page, pages, customer, book }) => {
    await api.addAddress(customer.token, { fullName: 'First Person', street: '1 First St' })
    await api.addAddress(customer.token, { fullName: 'Default Person', street: '2 Default St', isDefault: true })
    await api.addToCart(customer.token, book.id, 1)
    await page.goto('/checkout')
    await expect(pages.checkout.addressCards).toHaveCount(2)
    await expect(pages.checkout.selectedAddress).toContainText('Default Person')
    await expect(pages.checkout.selectedAddress).toContainText('Default')
  })

  test('the customer can switch to another saved address', async ({ signedIn: page, pages, customer, book }) => {
    await api.addAddress(customer.token, { fullName: 'First Person', street: '1 First St' })
    await api.addAddress(customer.token, { fullName: 'Default Person', street: '2 Default St', isDefault: true })
    await api.addToCart(customer.token, book.id, 1)
    await page.goto('/checkout')
    await pages.checkout.addressCards.filter({ hasText: 'First Person' }).click()
    await expect(pages.checkout.selectedAddress).toContainText('First Person')
  })

  test('"+ Add New Address" toggles the form', async ({ signedIn: page, pages, customer, book }) => {
    await api.addAddress(customer.token)
    await api.addToCart(customer.token, book.id, 1)
    await page.goto('/checkout')
    await expect(pages.checkout.addressForm).toHaveCount(0)
    await page.getByRole('button', { name: '+ Add New Address' }).click()
    await expect(pages.checkout.addressForm).toBeVisible()
    await page.getByRole('button', { name: '✕ Cancel' }).click()
    await expect(pages.checkout.addressForm).toHaveCount(0)
  })

  test('order summary lists the cart lines and total', async ({ signedIn: page, pages, customer, book }) => {
    await api.addAddress(customer.token)
    await api.addToCart(customer.token, book.id, 2)
    await page.goto('/checkout')
    await expect(page.locator('.checkout-summary-item', { hasText: book.title })).toContainText('×2')
    await expect(pages.checkout.total).toHaveText('$39.98')
  })

  test('gift points reduce the total by $0.01 each', async ({ signedIn: page, pages, customer, book }) => {
    await api.addAddress(customer.token)
    await api.addToCart(customer.token, book.id, 1)
    await page.goto('/checkout')
    await expect(pages.checkout.total).toHaveText('$19.99')
    await pages.checkout.setPoints(100)
    await expect(page.getByText('Discount:')).toContainText('$1.00')
    await expect(pages.checkout.total).toHaveText('$18.99')
    await pages.checkout.setPoints(0)
    await expect(pages.checkout.total).toHaveText('$19.99')
  })

  test('a discount larger than the total never makes it negative', async ({ signedIn: page, pages, customer, adminToken }) => {
    const cheap = await api.createBook(adminToken, { price: 1.0 })
    try {
      await api.addAddress(customer.token)
      await api.addToCart(customer.token, cheap.id, 1)
      await page.goto('/checkout')
      await pages.checkout.setPoints(500)
      await expect(pages.checkout.total).toHaveText('$0.00')
    } finally { await api.deleteBook(adminToken, cheap.id) }
  })

  test('negative or non-numeric points are treated as zero', async ({ signedIn: page, pages, customer, book }) => {
    await api.addAddress(customer.token)
    await api.addToCart(customer.token, book.id, 1)
    await page.goto('/checkout')
    await pages.checkout.giftInput.fill('-50')
    await expect(pages.checkout.total).toHaveText('$19.99')
    await expect(page.getByText('Discount:')).toHaveCount(0)
  })

  test('Continue to Payment without an address shows a message', async ({ signedIn: page, pages, customer, book }) => {
    await api.addToCart(customer.token, book.id, 1)
    await page.goto('/checkout')
    await pages.checkout.continueButton.click()
    await pages.base.expectToast('Please select a delivery address')
    await expect(page).toHaveURL(/\/checkout/)
  })

  test('Continue to Payment opens the payment step', async ({ signedIn: page, pages, customer, book }) => {
    await api.addAddress(customer.token)
    await api.addToCart(customer.token, book.id, 1)
    await page.goto('/checkout')
    await pages.checkout.continueButton.click()
    await expect(page).toHaveURL(/\/payment/)
    await expect(page.getByText('Select Payment')).toBeVisible()
  })
})

test.describe('Payment page', () => {
  async function toPayment({ page, pages, customer, book, points = 0 }) {
    await api.addAddress(customer.token)
    await api.addToCart(customer.token, book.id, 1)
    await page.goto('/checkout')
    if (points) await pages.checkout.setPoints(points)
    await pages.checkout.continueButton.click()
    await expect(page).toHaveURL(/\/payment/)
  }

  test('all five payment methods are offered, credit card is the default', async ({ signedIn: page, pages, customer, book }) => {
    await toPayment({ page, pages, customer, book })
    for (const m of ['Credit Card', 'Debit Card', 'Net Banking', 'UPI', 'Gift Points']) await expect(pages.payment.method(m)).toBeVisible()
    await expect(pages.payment.method('Credit Card')).toHaveClass(/active/)
    await expect(page.getByText('Credit Card Details')).toBeVisible()
  })

  test('switching method shows the matching form', async ({ signedIn: page, pages, customer, book }) => {
    await toPayment({ page, pages, customer, book })
    await pages.payment.choose('Debit Card'); await expect(page.getByText('Debit Card Details')).toBeVisible()
    await pages.payment.choose('UPI'); await expect(page.getByPlaceholder('yourname@upi')).toBeVisible()
    await pages.payment.choose('Net Banking'); await expect(page.getByText(/redirected to your bank/)).toBeVisible()
    await pages.payment.choose('Gift Points'); await expect(page.getByText(/accumulated gift points/)).toBeVisible()
  })

  test('card number is formatted in groups of four', async ({ signedIn: page, pages, customer, book }) => {
    await toPayment({ page, pages, customer, book })
    const input = page.getByPlaceholder('1234 5678 9012 3456')
    await input.fill('4111111111111111')
    await expect(input).toHaveValue('4111 1111 1111 1111')
  })

  test('card details are required', async ({ signedIn: page, pages, customer, book }) => {
    await toPayment({ page, pages, customer, book })
    await pages.payment.payButton.click()
    await expect(page).toHaveURL(/\/payment/)
    expect(await page.locator('input:invalid').count()).toBe(3)
  })

  test('redeemed points are mentioned when paying with gift points', async ({ signedIn: page, pages, customer, book }) => {
    await toPayment({ page, pages, customer, book, points: 40 })
    await pages.payment.choose('Gift Points')
    await expect(page.getByText('Redeeming 40 points ($0.40 off).')).toBeVisible()
    await expect(page.locator('.payment-sidebar')).toContainText('Points Redeemed')
  })
})

test.describe('Known defects (expected to fail until fixed)', () => {
  test('UI-02: opening /payment directly redirects to /checkout', async ({ signedIn: page }) => {
    test.fail(!process.env.RAW_DEFECTS, 'UI-02: navigate() is called during render so the page stays blank')
    await page.goto('/payment')
    await expect(page).toHaveURL(/\/checkout/, { timeout: 3000 })
  })
})
