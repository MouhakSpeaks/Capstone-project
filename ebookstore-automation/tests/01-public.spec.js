import { test, expect, api } from '../fixtures/index.js'

test.describe('Public browsing', () => {
  test('home page shows hero, categories and top-rated books @smoke', async ({ page, pages }) => {
    await pages.base.goto('/')
    await expect(page.getByText('Next Great Read')).toBeVisible()
    await expect(page.locator('.category-chip').first()).toBeVisible()
    await expect(page.locator('.product-card').first()).toBeVisible()
    expect(await page.locator('.category-chip').count()).toBeGreaterThanOrEqual(3)
    expect(await page.locator('.product-card').count()).toBeGreaterThanOrEqual(1)
  })

  test('navbar offers Sign In and Register (no cart) when logged out', async ({ pages }) => {
    await pages.base.goto('/')
    await expect(pages.base.signInLink).toBeVisible()
    await expect(pages.base.registerLink).toBeVisible()
    await expect(pages.base.cartLink).toHaveCount(0)
  })

  test('catalogue lists the seeded books @smoke', async ({ pages }) => {
    await pages.catalogue.open()
    const titles = await pages.catalogue.titles.allTextContents()
    expect(titles.length).toBeGreaterThanOrEqual(7)
    for (const t of ['Clean Code', '1984', 'Cosmos']) expect(titles).toContain(t)
  })

  test('filtering by category shows only that category', async ({ page, pages }) => {
    await pages.catalogue.open()
    await pages.catalogue.chooseCategory('Fiction')
    await expect(page).toHaveURL(/categoryId=\d+/)
    await expect(pages.catalogue.card('1984')).toBeVisible()
    await expect(pages.catalogue.card('Clean Code')).toHaveCount(0)
    const cats = await page.locator('.product-card-cat').allTextContents()
    expect(cats.length).toBeGreaterThan(0)
    expect(new Set(cats)).toEqual(new Set(['Fiction']))
  })

  test('"All Books" resets the category filter', async ({ pages }) => {
    await pages.catalogue.open()
    await pages.catalogue.chooseCategory('Fiction')
    await expect(pages.catalogue.card('Clean Code')).toHaveCount(0)
    await pages.catalogue.chooseCategory('All Books')
    await expect(pages.catalogue.card('Clean Code')).toBeVisible()
  })

  test('navbar search finds a book by author @smoke', async ({ page, pages }) => {
    await pages.catalogue.open()
    await pages.base.search('orwell')
    await expect(page).toHaveURL(/search=orwell/)
    await expect(pages.catalogue.cards).toHaveCount(1)
    await expect(pages.catalogue.card('1984')).toBeVisible()
  })

  test('search is case-insensitive and matches titles', async ({ page, pages }) => {
    await pages.catalogue.open()
    await pages.base.search('COSMOS')
    await expect(page).toHaveURL(/search=COSMOS/)
    await expect(pages.catalogue.card('Cosmos')).toBeVisible()
  })

  test('search with no match shows the empty state', async ({ page, pages }) => {
    await pages.catalogue.open('?search=zzzznomatch')
    await expect(page.getByText('No books found for "zzzznomatch"')).toBeVisible()
  })

  test('"Clear" removes the search filter', async ({ page, pages }) => {
    await pages.catalogue.open('?search=orwell')
    await expect(pages.catalogue.cards).toHaveCount(1)
    await page.getByRole('button', { name: '✕ Clear' }).click()
    await expect(page).toHaveURL(/\/catalogue$/)
    await expect(pages.catalogue.cards.nth(1)).toBeVisible() // auto-waits until the full list has loaded
  })

  test('product detail shows price, stock, ISBN and related books', async ({ page, pages }) => {
    await pages.catalogue.open()
    await pages.catalogue.openBook('Clean Code')
    await expect(pages.product.heading).toHaveText('Clean Code')
    await expect(pages.product.price).toHaveText(/^\$\d+\.\d{2}$/)
    await expect(pages.product.stock).toContainText('In Stock')
    await expect(pages.product.meta).toContainText('978-0132350884')
    await expect(pages.product.relatedSection).toBeVisible()
    await expect(pages.product.relatedSection.locator('.product-card').first()).toBeVisible()
    await expect(pages.product.relatedSection.locator('.product-card-title', { hasText: /^Clean Code$/ })).toHaveCount(0)
  })

  test('clicking a related book opens that book', async ({ page, pages }) => {
    await pages.catalogue.open()
    await pages.catalogue.openBook('Clean Code')
    const related = pages.product.relatedSection.locator('.product-card').first()
    const relatedTitle = await related.locator('.product-card-title').textContent()
    await related.click()
    await expect(pages.product.heading).toHaveText(relatedTitle)
  })

  test('unknown product id redirects back to the catalogue', async ({ page }) => {
    await page.goto('/products/999999')
    await expect(page).toHaveURL(/\/catalogue/)
  })

  test('book with zero stock is marked Sold Out and cannot be bought', async ({ page, pages, adminToken }) => {
    const oos = await api.createBook(adminToken, { stockQuantity: 0 })
    try {
      await pages.catalogue.open(`?search=${encodeURIComponent(oos.title)}`)
      const card = pages.catalogue.card(oos.title)
      await expect(card.locator('.product-card-oos')).toHaveText('Out of Stock')
      await expect(card.getByRole('button', { name: 'Sold Out' })).toBeDisabled()

      await card.click()
      await expect(pages.product.stock).toContainText('Out of Stock')
      await expect(pages.product.addButton).toHaveCount(0)
      await expect(pages.product.buyNowButton).toHaveCount(0)
    } finally {
      await api.deleteBook(adminToken, oos.id)
    }
  })

  test('a book added by the admin appears in the catalogue and disappears when deleted', async ({ pages, adminToken }) => {
    const b = await api.createBook(adminToken, { title: `Visible Book ${Date.now()}` })
    await pages.catalogue.open(`?search=${encodeURIComponent(b.title)}`)
    await expect(pages.catalogue.card(b.title)).toBeVisible()
    await api.deleteBook(adminToken, b.id)
    await pages.catalogue.open(`?search=${encodeURIComponent(b.title)}`)
    await expect(pages.catalogue.card(b.title)).toHaveCount(0)
  })

  test('anonymous "+ Cart" sends the visitor to /login', async ({ page, pages }) => {
    await pages.catalogue.open('?search=Clean')
    await pages.catalogue.addToCart('Clean Code')
    await expect(page).toHaveURL(/\/login/)
  })

  test('anonymous "Add to Cart" on the detail page sends the visitor to /login', async ({ page, pages }) => {
    await pages.catalogue.open('?search=Clean')
    await pages.catalogue.openBook('Clean Code')
    await pages.product.addButton.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('unknown URL falls back to the home page', async ({ page }) => {
    await page.goto('/this/page/does/not/exist')
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe('Route protection', () => {
  for (const route of ['/cart', '/checkout', '/orders', '/payment', '/confirmation/1']) {
    test(`anonymous visit to ${route} is redirected to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    })
  }
})
