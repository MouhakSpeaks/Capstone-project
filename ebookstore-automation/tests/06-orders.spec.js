import { test, expect, api } from '../fixtures/index.js'

test.describe('My Orders', () => {
  test('a customer with no orders sees the empty state @smoke', async ({ signedIn: page, pages }) => {
    await pages.orders.open()
    await expect(pages.orders.emptyState).toContainText("You haven't placed any orders yet")
    await expect(page.getByRole('link', { name: 'Start Shopping' })).toBeVisible()
  })

  test('an order appears in the history with number, total and CONFIRMED status @smoke', async ({ signedIn: page, pages, customer, book }) => {
    const order = await api.buy(customer.token, book.id, { quantity: 2 })
    await pages.orders.open()
    await expect(pages.orders.cards).toHaveCount(1)
    const card = pages.orders.card(order.orderNumber)
    await expect(card).toContainText('$39.98')
    await expect(pages.orders.statusOf(order.orderNumber)).toHaveText('CONFIRMED')
  })

  test('expanding an order shows items, address and the action buttons', async ({ signedIn: page, pages, customer, book }) => {
    const order = await api.buy(customer.token, book.id, { quantity: 2 })
    await pages.orders.open()
    await pages.orders.expand(order.orderNumber)
    const card = pages.orders.card(order.orderNumber)
    await expect(card).toContainText(book.title)
    await expect(card).toContainText('Qty: 2 × $19.99')
    await expect(card).toContainText('Delivering to: Auto Tester, 12 Test Street, Pune, MH 411001')
    await expect(pages.orders.buyAgain(order.orderNumber)).toBeVisible()
    await expect(pages.orders.cancel(order.orderNumber)).toBeVisible()
    await pages.orders.expand(order.orderNumber)
    await expect(card.locator('.order-detail')).toHaveCount(0)
  })

  test('orders are listed newest first', async ({ signedIn: page, pages, customer, book }) => {
    const first = await api.buy(customer.token, book.id)
    const second = await api.buy(customer.token, book.id)
    await pages.orders.open()
    await expect(pages.orders.cards).toHaveCount(2)
    await expect(pages.orders.cards.first()).toContainText(second.orderNumber)
    await expect(pages.orders.cards.nth(1)).toContainText(first.orderNumber)
  })

  test('the redeemed points note is shown on an order that used points', async ({ signedIn: page, pages, customer, adminToken }) => {
    const pricey = await api.createBook(adminToken, { price: 50 })
    try {
      await api.buy(customer.token, pricey.id)
      const order = await api.buy(customer.token, pricey.id, { pointsToRedeem: 20 })
      await pages.orders.open()
      await pages.orders.expand(order.orderNumber)
      await expect(pages.orders.card(order.orderNumber)).toContainText('20 gift points were redeemed')
    } finally { await api.deleteBook(adminToken, pricey.id) }
  })

  test('a customer only sees their own orders', async ({ signedIn: page, pages, customer, book }) => {
    const other = await api.register((await import('../support/api.js')).uniqueUser('other'))
    await api.buy(other.body.data.token, book.id)
    await pages.orders.open()
    await expect(pages.orders.emptyState).toBeVisible()
  })

  test('long orders show a preview of three books and "+N more"', async ({ signedIn: page, pages, customer, adminToken }) => {
    const books = []
    try {
      for (let i = 0; i < 5; i++) books.push(await api.createBook(adminToken))
      const addr = await api.addAddress(customer.token)
      for (const b of books) await api.addToCart(customer.token, b.id, 1)
      const o = await api.placeOrder(customer.token, addr.id)
      await api.pay(customer.token, o.body.data.id)
      await pages.orders.open()
      await expect(pages.orders.cards.first().locator('.order-preview-item')).toHaveCount(3)
      await expect(pages.orders.cards.first().locator('.order-preview-more')).toHaveText('+2 more')
    } finally { for (const b of books) await api.deleteBook(adminToken, b.id) }
  })
})

test.describe('Cancel an order', () => {
  test('cancelling within 48 hours marks the order CANCELLED @smoke', async ({ signedIn: page, pages, customer, book }) => {
    const order = await api.buy(customer.token, book.id)
    page.once('dialog', d => d.accept())
    await pages.orders.open()
    await pages.orders.expand(order.orderNumber)
    await pages.orders.cancel(order.orderNumber).click()
    await expect(pages.orders.statusOf(order.orderNumber)).toHaveText('CANCELLED')
    await pages.orders.expand(order.orderNumber)
    await expect(pages.orders.cancel(order.orderNumber)).toHaveCount(0)
    const list = await api.getOrders(customer.token)
    expect(list.body.data.content[0].status).toBe('CANCELLED')
  })

  test('declining the confirmation dialog keeps the order', async ({ signedIn: page, pages, customer, book }) => {
    const order = await api.buy(customer.token, book.id)
    page.once('dialog', d => d.dismiss())
    await pages.orders.open()
    await pages.orders.expand(order.orderNumber)
    await pages.orders.cancel(order.orderNumber).click()
    await expect(pages.orders.statusOf(order.orderNumber)).toHaveText('CONFIRMED')
  })

  test('cancelling gives the redeemed gift points back', async ({ signedIn: page, pages, customer, adminToken }) => {
    const pricey = await api.createBook(adminToken, { price: 50 })
    try {
      await api.buy(customer.token, pricey.id)                       // +50 points
      const order = await api.buy(customer.token, pricey.id, { pointsToRedeem: 20 }) // -20 +49 => 79
      page.once('dialog', d => d.accept())
      await pages.orders.open()
      await pages.orders.expand(order.orderNumber)
      await pages.orders.cancel(order.orderNumber).click()
      await expect(pages.orders.statusOf(order.orderNumber)).toHaveText('CANCELLED')
      // Probe the balance: ask to redeem a huge number; the server caps it at the balance (79 + 20 returned = 99).
      const addr = await api.addAddress(customer.token)
      await api.addToCart(customer.token, pricey.id, 1)
      const probe = await api.placeOrder(customer.token, addr.id, 100000)
      expect(probe.body.data.pointsRedeemed).toBe(99)
    } finally { await api.deleteBook(adminToken, pricey.id) }
  })

  test('a cancelled order cannot be paid for afterwards (API)', async ({ signedIn: page, pages, customer, book }) => {
    const order = await api.buy(customer.token, book.id)
    page.once('dialog', d => d.accept())
    await pages.orders.open()
    await pages.orders.expand(order.orderNumber)
    await pages.orders.cancel(order.orderNumber).click()
    await expect(pages.orders.statusOf(order.orderNumber)).toHaveText('CANCELLED')
    const pay = await api.pay(customer.token, order.id)
    expect(pay.status).toBe(400)
    expect(pay.body.message).toMatch(/cancelled/i)
  })
})

test.describe('Buy Again', () => {
  test('Buy Again puts every line back in the cart with its quantity @smoke', async ({ signedIn: page, pages, customer, adminToken }) => {
    const a = await api.createBook(adminToken, { price: 10 })
    const b = await api.createBook(adminToken, { price: 5 })
    try {
      const addr = await api.addAddress(customer.token)
      await api.addToCart(customer.token, a.id, 3)
      await api.addToCart(customer.token, b.id, 1)
      const o = await api.placeOrder(customer.token, addr.id)
      await api.pay(customer.token, o.body.data.id)

      await pages.orders.open()
      await pages.orders.expand(o.body.data.orderNumber)
      await pages.orders.buyAgain(o.body.data.orderNumber).click()
      await pages.base.expectToast('Items added to cart!')
      await pages.cart.open()
      await expect(pages.cart.items).toHaveCount(2)
      expect(await pages.cart.quantityOf(a.title)).toBe(3)
      expect(await pages.cart.quantityOf(b.title)).toBe(1)
      await expect(pages.cart.total).toHaveText('$35.00')
    } finally { await api.deleteBook(adminToken, a.id); await api.deleteBook(adminToken, b.id) }
  })

  test('the cart page recommends books based on the last order', async ({ signedIn: page, pages, customer, book }) => {
    await api.buy(customer.token, book.id)
    await pages.cart.open()
    // The recommendation block only appears when books of the same category exist.
    const rec = page.locator('.cart-recommended')
    if (await rec.count()) await expect(rec.locator('.cart-rec-item').first()).toBeVisible()
    else test.info().annotations.push({ type: 'note', description: 'no recommendations returned for this category' })
  })
})

test.describe('Known gaps (expected to fail until fixed)', () => {
  test('G-5 / FR-H3: the gift point balance is shown on My Orders', async ({ signedIn: page, pages, customer, book }) => {
    test.fail(!process.env.RAW_DEFECTS, 'G-5: the login response does not include giftPoints, so the page always shows 0')
    await api.buy(customer.token, book.id) // earns 19 points
    await pages.orders.open()
    await expect(pages.orders.giftPoints).toContainText('19')
  })

  test('G-2 / FR-F7: cancelling an order returns the books to stock', async ({ signedIn: page, pages, customer, adminToken }) => {
    test.fail(!process.env.RAW_DEFECTS, 'G-2: cancelOrder restores redeemed points only, not stock')
    const b = await api.createBook(adminToken, { stockQuantity: 10 })
    try {
      const order = await api.buy(customer.token, b.id, { quantity: 4 })
      page.once('dialog', d => d.accept())
      await pages.orders.open()
      await pages.orders.expand(order.orderNumber)
      await pages.orders.cancel(order.orderNumber).click()
      await expect(pages.orders.statusOf(order.orderNumber)).toHaveText('CANCELLED')
      const stock = (await api.call('GET', `/products/${b.id}`)).body.data.stockQuantity
      expect(stock).toBe(10)
    } finally { await api.deleteBook(adminToken, b.id) }
  })

  test('NEW-01: a cancelled order cannot be cancelled again (points are not credited twice)', async ({ customer, book }) => {
    test.fail(!process.env.RAW_DEFECTS, 'NEW-01: cancelOrder does not reject an already CANCELLED order')
    const order = await api.buy(customer.token, book.id)
    const first = await api.call('PUT', `/orders/${order.id}/cancel`, { token: customer.token })
    const second = await api.call('PUT', `/orders/${order.id}/cancel`, { token: customer.token })
    expect(first.status).toBe(200)
    expect(second.status).toBeGreaterThanOrEqual(400)
  })
})
