import { test, expect, api } from '../fixtures/index.js'

// Full purchase journeys driven entirely through the UI.
async function checkoutViaUi({ page, pages }, { points = 0, payment = 'upi' } = {}) {
  await pages.cart.open()
  await pages.cart.checkoutButton.click()
  await expect(page).toHaveURL(/\/checkout/)
  // Wait for the page to finish loading: either the new-address form (no saved address) or the address list.
  await expect(pages.checkout.addressForm.or(pages.checkout.addressCards.first())).toBeVisible()
  if (await pages.checkout.addressForm.isVisible()) {
    await pages.checkout.fillAddress({
      fullName: 'Auto Tester', phone: '9999999999', street: '12 Test Street',
      city: 'Pune', state: 'MH', postalCode: '411001', country: 'India',
    })
    await pages.checkout.saveAddress()
    await expect(pages.checkout.selectedAddress).toBeVisible()
  }
  if (points) await pages.checkout.setPoints(points)
  const total = (await pages.checkout.total.textContent()).trim()
  await pages.checkout.continueButton.click()
  await expect(page).toHaveURL(/\/payment/)
  if (payment === 'upi') await pages.payment.payWithUpi()
  else if (payment === 'credit') await pages.payment.payWithCard()
  else if (payment === 'debit') await pages.payment.payWithCard({}, 'Debit Card')
  else { await pages.payment.choose(payment); await pages.payment.payButton.click() }
  await expect(page).toHaveURL(/\/confirmation\/\d+/)
  return total
}

test.describe('Purchase journey', () => {
  test('register -> search -> add -> checkout -> pay with UPI -> confirmation @smoke', async ({ page, pages, adminToken }) => {
    const b = await api.createBook(adminToken, { title: `Journey Book ${Date.now()}`, price: 12.34 })
    try {
      const u = (await import('../support/api.js')).uniqueUser('journey')
      await pages.auth.register(u)
      await pages.base.expectSignedInAs(u.firstName)

      await pages.base.search(b.title)
      await expect(pages.catalogue.card(b.title)).toBeVisible()
      await pages.catalogue.addToCart(b.title)
      await pages.base.expectToast('added to cart')

      const total = await checkoutViaUi({ page, pages })
      expect(total).toBe('$12.34')

      await expect(pages.confirmation.heading).toBeVisible()
      await expect(pages.confirmation.orderNumber).toHaveText(/^ORD-[A-Z0-9]{8}$/)
      await expect(pages.confirmation.status).toHaveText('CONFIRMED')
      await expect(pages.confirmation.totalPaid).toHaveText(total)
      await expect(pages.confirmation.items).toHaveCount(1)
      await expect(pages.confirmation.items.first()).toContainText(b.title)
      await expect(pages.confirmation.address).toContainText('12 Test Street')

      await pages.cart.open()
      await expect(pages.cart.emptyMessage).toBeVisible()
      await expect(pages.base.cartBadge).toHaveCount(0)
    } finally { await api.deleteBook(adminToken, b.id) }
  })

  test('pay with a credit card', async ({ signedIn: page, pages, customer, book }) => {
    await api.addToCart(customer.token, book.id, 1)
    await checkoutViaUi({ page, pages }, { payment: 'credit' })
    await expect(pages.confirmation.heading).toBeVisible()
    const pay = await api.call('GET', `/users/payment/order/${page.url().split('/').pop()}`, { token: customer.token })
    expect(pay.body.data).toMatchObject({ paymentMethod: 'CREDIT_CARD', status: 'SUCCESS' })
    expect(pay.body.data.maskedCardNumber).toMatch(/1111$/)
  })

  test('pay with a debit card', async ({ signedIn: page, pages, customer, book }) => {
    await api.addToCart(customer.token, book.id, 1)
    await checkoutViaUi({ page, pages }, { payment: 'debit' })
    await expect(pages.confirmation.heading).toBeVisible()
  })

  test('pay with net banking', async ({ signedIn: page, pages, customer, book }) => {
    await api.addToCart(customer.token, book.id, 1)
    await checkoutViaUi({ page, pages }, { payment: 'Net Banking' })
    await expect(pages.confirmation.heading).toBeVisible()
  })

  test('multi-book order: stock goes down and the confirmation lists every line', async ({ signedIn: page, pages, customer, adminToken }) => {
    const a = await api.createBook(adminToken, { price: 10, stockQuantity: 20 })
    const b = await api.createBook(adminToken, { price: 5, stockQuantity: 20 })
    try {
      await api.addToCart(customer.token, a.id, 3)
      await api.addToCart(customer.token, b.id, 2)
      const total = await checkoutViaUi({ page, pages })
      expect(total).toBe('$40.00')
      await expect(pages.confirmation.items).toHaveCount(2)
      await expect(pages.confirmation.totalPaid).toHaveText('$40.00')
      const stockA = (await api.call('GET', `/products/${a.id}`)).body.data.stockQuantity
      const stockB = (await api.call('GET', `/products/${b.id}`)).body.data.stockQuantity
      expect([stockA, stockB]).toEqual([17, 18])
    } finally { await api.deleteBook(adminToken, a.id); await api.deleteBook(adminToken, b.id) }
  })

  test('the order total paid equals the cart total', async ({ signedIn: page, pages, customer, book }) => {
    await api.addToCart(customer.token, book.id, 3)
    await pages.cart.open()
    const cartTotal = (await pages.cart.total.textContent()).trim()
    await checkoutViaUi({ page, pages })
    await expect(pages.confirmation.totalPaid).toHaveText(cartTotal)
  })

  test('redeeming gift points lowers the amount paid', async ({ signedIn: page, pages, customer, adminToken }) => {
    const pricey = await api.createBook(adminToken, { price: 50 })
    try {
      // First order earns 50 points via the API so there is a balance to redeem.
      await api.buy(customer.token, pricey.id)
      await api.addToCart(customer.token, pricey.id, 1)
      const total = await checkoutViaUi({ page, pages }, { points: 30 })
      expect(total).toBe('$49.70')
      await expect(pages.confirmation.totalPaid).toHaveText('$49.70')
      await expect(pages.confirmation.pointsNote).toContainText('30 gift points redeemed')
    } finally { await api.deleteBook(adminToken, pricey.id) }
  })

  test('points above the balance are capped on the server', async ({ signedIn: page, pages, customer, adminToken }) => {
    const pricey = await api.createBook(adminToken, { price: 50 })
    try {
      await api.buy(customer.token, pricey.id) // earns 50 points
      await api.addToCart(customer.token, pricey.id, 1)
      await checkoutViaUi({ page, pages }, { points: 1000 })
      // Balance was 50: only 50 points ($0.50) are redeemed, even though the UI promised $10 off.
      await expect(pages.confirmation.pointsNote).toContainText('50 gift points redeemed')
      await expect(pages.confirmation.totalPaid).toHaveText('$49.50')
    } finally { await api.deleteBook(adminToken, pricey.id) }
  })

  test('confirmation page can be reopened from My Orders (View Details)', async ({ signedIn: page, pages, customer, book }) => {
    const order = await api.buy(customer.token, book.id)
    await pages.orders.open()
    await pages.orders.expand(order.orderNumber)
    await pages.orders.card(order.orderNumber).getByRole('link', { name: 'View Details' }).click()
    await expect(page).toHaveURL(new RegExp(`/confirmation/${order.id}`))
    await expect(pages.confirmation.orderNumber).toHaveText(order.orderNumber)
  })
})

test.describe('Known gaps (expected to fail until fixed)', () => {
  test('G-1 / FR-D8: ordering more than the stock is rejected', async ({ signedIn: page, pages, customer, adminToken }) => {
    test.fail(!process.env.RAW_DEFECTS, 'G-1: backend does not validate stock; the order succeeds and stock is clamped to 0')
    const low = await api.createBook(adminToken, { stockQuantity: 1 })
    try {
      await api.addToCart(customer.token, low.id, 5)
      await checkoutViaUi({ page, pages })
      await expect(page).not.toHaveURL(/\/confirmation/)
    } finally { await api.deleteBook(adminToken, low.id) }
  })
})
