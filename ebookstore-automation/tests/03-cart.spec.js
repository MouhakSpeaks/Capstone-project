import { test, expect, api } from '../fixtures/index.js'

test.describe('Shopping cart', () => {
  test('a new customer sees an empty cart', async ({ signedIn, pages }) => {
    await pages.cart.open()
    await expect(pages.cart.emptyMessage).toBeVisible()
    await expect(pages.base.cartBadge).toHaveCount(0)
    await expect(signedIn.getByRole('link', { name: 'Continue Shopping' })).toBeVisible()
  })

  test('add to cart from a catalogue card @smoke', async ({ signedIn: page, pages, book }) => {
    await pages.catalogue.open(`?search=${encodeURIComponent(book.title)}`)
    await pages.catalogue.addToCart(book.title)
    await pages.base.expectToast('added to cart')
    await pages.cart.open()
    await expect(pages.cart.items).toHaveCount(1)
    await expect(pages.cart.item(book.title)).toContainText('$19.99 each')
    await expect(pages.base.cartBadge).toHaveText('1')
  })

  test('add several copies from the product detail page', async ({ signedIn: page, pages, book }) => {
    await pages.catalogue.open(`?search=${encodeURIComponent(book.title)}`)
    await pages.catalogue.openBook(book.title)
    await pages.product.increaseQty()
    await pages.product.increaseQty()
    await expect(pages.product.qtyValue).toHaveText('3')
    await pages.product.addButton.click()
    await pages.base.expectToast(`Added 3 × "${book.title}"`)
    await pages.cart.open()
    expect(await pages.cart.quantityOf(book.title)).toBe(3)
    await expect(pages.cart.total).toHaveText('$59.97')
  })

  test('quantity selector on the detail page never goes below 1 or above stock', async ({ signedIn: page, pages, adminToken }) => {
    const b = await api.createBook(adminToken, { stockQuantity: 2 })
    try {
      await pages.catalogue.open(`?search=${encodeURIComponent(b.title)}`)
      await pages.catalogue.openBook(b.title)
      await pages.product.decreaseQty()
      await expect(pages.product.qtyValue).toHaveText('1')
      await pages.product.increaseQty()
      await pages.product.increaseQty()
      await pages.product.increaseQty()
      await expect(pages.product.qtyValue).toHaveText('2')
    } finally { await api.deleteBook(adminToken, b.id) }
  })

  test('Buy Now adds the book and opens the cart', async ({ signedIn: page, pages, book }) => {
    await pages.catalogue.open(`?search=${encodeURIComponent(book.title)}`)
    await pages.catalogue.openBook(book.title)
    await pages.product.buyNowButton.click()
    await expect(page).toHaveURL(/\/cart/)
    await expect(pages.cart.item(book.title)).toBeVisible()
  })

  test('adding the same book twice merges into one line', async ({ signedIn: page, pages, book }) => {
    await pages.catalogue.open(`?search=${encodeURIComponent(book.title)}`)
    await pages.catalogue.addToCart(book.title)
    await pages.base.expectToast('added to cart')
    await pages.catalogue.addToCart(book.title)
    await pages.cart.open()
    await expect(pages.cart.items).toHaveCount(1)
    expect(await pages.cart.quantityOf(book.title)).toBe(2)
  })

  test('cart shows lines, subtotals and the total @smoke', async ({ signedIn: page, pages, customer, adminToken }) => {
    const a = await api.createBook(adminToken, { price: 10.5 })
    const b = await api.createBook(adminToken, { price: 4.25 })
    try {
      await api.addToCart(customer.token, a.id, 2)
      await api.addToCart(customer.token, b.id, 1)
      await pages.cart.open()
      await expect(pages.cart.items).toHaveCount(2)
      expect(await pages.cart.subtotalOf(a.title)).toBe('$21.00')
      expect(await pages.cart.subtotalOf(b.title)).toBe('$4.25')
      await expect(pages.cart.total).toHaveText('$25.25')
      await expect(pages.base.cartBadge).toHaveText('2')
    } finally { await api.deleteBook(adminToken, a.id); await api.deleteBook(adminToken, b.id) }
  })

  test('increasing and decreasing a quantity updates subtotal and total', async ({ signedIn: page, pages, customer, book }) => {
    await api.addToCart(customer.token, book.id, 1)
    await pages.cart.open()
    await pages.cart.increase(book.title)
    await expect(pages.cart.total).toHaveText('$39.98')
    expect(await pages.cart.subtotalOf(book.title)).toBe('$39.98')
    await pages.cart.decrease(book.title)
    await expect(pages.cart.total).toHaveText('$19.99')
  })

  test('the quantity change is saved on the server (survives reload)', async ({ signedIn: page, pages, customer, book }) => {
    await api.addToCart(customer.token, book.id, 1)
    await pages.cart.open()
    await pages.cart.increase(book.title)
    await expect(pages.cart.total).toHaveText('$39.98')
    await page.reload()
    await expect(pages.cart.total).toHaveText('$39.98')
  })

  test('the cart is kept after signing out and back in', async ({ page, pages, customer, book }) => {
    await api.addToCart(customer.token, book.id, 2)
    await pages.auth.login(customer.email, customer.password)
    await pages.base.expectSignedInAs(customer.firstName)
    await pages.base.signOutButton.click()
    await expect(pages.base.signInLink).toBeVisible()
    await pages.auth.login(customer.email, customer.password)
    await pages.base.expectSignedInAs(customer.firstName) // wait for the login to finish before navigating away
    await pages.cart.open()
    expect(await pages.cart.quantityOf(book.title)).toBe(2)
  })

  test('Proceed to Checkout opens the checkout page', async ({ signedIn: page, pages, customer, book }) => {
    await api.addToCart(customer.token, book.id, 1)
    await pages.cart.open()
    await pages.cart.checkoutButton.click()
    await expect(page).toHaveURL(/\/checkout/)
  })

  test('two customers have separate carts', async ({ signedIn: page, pages, customer, book }) => {
    const other = await api.register((await import('../support/api.js')).uniqueUser('other'))
    await api.addToCart(other.body.data.token, book.id, 5)
    await api.addToCart(customer.token, book.id, 1)
    await pages.cart.open()
    expect(await pages.cart.quantityOf(book.title)).toBe(1)
  })
})

test.describe('Known defects and gaps (expected to fail until fixed)', () => {
  test('CART-07: removing a line with the X button deletes it (also after reload)', async ({ signedIn: page, pages, customer, book }) => {
    test.fail(!process.env.RAW_DEFECTS, 'CART-07: backend deletes the row but the item stays in cart.items, so it is re-saved')
    await api.addToCart(customer.token, book.id, 1)
    await pages.cart.open()
    await pages.cart.remove(book.title)
    await expect(pages.cart.emptyMessage).toBeVisible()
    await page.reload()
    await expect(pages.cart.emptyMessage).toBeVisible()
  })

  test('G-1 / FR-D8: the cart cannot hold more copies than are in stock', async ({ signedIn: page, pages, customer, adminToken }) => {
    test.fail(!process.env.RAW_DEFECTS, 'G-1: there is no stock check when adding to the cart')
    const b = await api.createBook(adminToken, { stockQuantity: 1 })
    try {
      await api.addToCart(customer.token, b.id, 1)
      await pages.cart.open()
      await pages.cart.increase(b.title)
      await pages.cart.increase(b.title)
      await page.waitForTimeout(500)
      expect(await pages.cart.quantityOf(b.title)).toBeLessThanOrEqual(1)
    } finally { await api.deleteBook(adminToken, b.id) }
  })
})
