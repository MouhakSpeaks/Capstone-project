import { test, expect, api } from '../fixtures/index.js'

test.describe('Catalogue pagination', () => {
  test('UI-01: Next moves to page 2 when there is more than one page', async ({ page, pages, adminToken }) => {
    test.fail(!process.env.RAW_DEFECTS, 'UI-01: CataloguePage.setParam deletes the page parameter right after setting it')
    // Make sure there are more than 20 books so a second page exists.
    const created = []
    try {
      const total = (await api.call('GET', '/products', { params: { size: 1 } })).body.data.totalElements
      for (let i = total; i < 22; i++) created.push(await api.createBook(adminToken))
      await pages.catalogue.open()
      await expect(pages.catalogue.pagination).toBeVisible()
      await pages.catalogue.pagination.locator('button', { hasText: '›' }).click()
      await expect(page).toHaveURL(/page=1/, { timeout: 3000 })
    } finally { for (const b of created) await api.deleteBook(adminToken, b.id) }
  })
})

test.describe('Session behaviour', () => {
  test('a signed-in customer opening /login or /register can still browse and reach the cart', async ({ signedIn: page, pages }) => {
    await pages.base.goto('/')
    await pages.base.expectSignedInAs('Auto')
    await pages.base.cartLink.click()
    await expect(page).toHaveURL(/\/cart/)
  })

  test('no uncaught JavaScript errors during a typical customer journey', async ({ signedIn: page, pages, customer, book }) => {
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await api.addAddress(customer.token)
    await pages.catalogue.open(`?search=${encodeURIComponent(book.title)}`)
    await pages.catalogue.addToCart(book.title)
    await pages.cart.open()
    await pages.cart.checkoutButton.click()
    await pages.checkout.continueButton.click()
    await pages.payment.payWithUpi()
    await expect(pages.confirmation.heading).toBeVisible()
    await pages.orders.open()
    expect(errors).toEqual([])
  })
})

test.describe('Responsive layout', () => {
  test.use({ viewport: { width: 390, height: 800 } })

  test('mobile: the hamburger menu reveals the navigation links', async ({ page, pages }) => {
    await pages.base.goto('/')
    const burger = page.locator('.navbar-hamburger')
    await expect(burger).toBeVisible()
    await burger.click()
    await expect(page.locator('.navbar-links.open')).toBeVisible()
    await expect(page.locator('.navbar-links').getByRole('link', { name: 'Catalogue' })).toBeVisible()
  })
})
