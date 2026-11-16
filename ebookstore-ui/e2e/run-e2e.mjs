// End-to-end UI tests: real Chrome -> Vite dev server (:3000) -> Spring Boot (:8080) -> PostgreSQL.
// Usage (backend + `npm run dev` must be running):  node e2e/run-e2e.mjs
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const UI = process.env.UI_URL || 'http://localhost:3000'
const CHROME = process.env.CHROME_PATH || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(p => fs.existsSync(p))
const SHOTS = path.join(HERE, 'screenshots')
fs.mkdirSync(SHOTS, { recursive: true })

const stamp = Date.now().toString().slice(-9)
const user = { first: 'E2E', last: 'Tester', email: `e2e${stamp}@example.com`, password: 'Passw0rd!' }
const results = []
const T = 8000

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
page.setDefaultTimeout(T)
page.on('dialog', d => d.accept())

const consoleErrors = []
page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`))

async function step(id, name, fn) {
  const t0 = Date.now()
  try {
    const detail = await fn()
    results.push({ id, name, pass: true, detail: detail || '', ms: Date.now() - t0 })
    console.log(`[PASS] ${id} ${name}${detail ? ' (' + detail + ')' : ''}`)
  } catch (e) {
    const msg = String(e.message).split('\n')[0]
    results.push({ id, name, pass: false, detail: msg, ms: Date.now() - t0 })
    console.log(`[FAIL] ${id} ${name} -> ${msg}`)
    await page.screenshot({ path: path.join(SHOTS, `${id}-FAIL.png`) }).catch(() => {})
  }
}
const shot = (n) => page.screenshot({ path: path.join(SHOTS, `${n}.png`) })
const expect = (cond, msg) => { if (!cond) throw new Error(msg) }
const path_ = () => new URL(page.url()).pathname + new URL(page.url()).search

// ───────────────────────── Public pages ─────────────────────────
await step('E2E-01', 'Home page shows hero, categories and top-rated books from the DB', async () => {
  await page.goto(UI + '/')
  await page.getByText('Next Great Read').waitFor()
  await page.locator('.category-chip').first().waitFor()
  await page.locator('.product-card').first().waitFor()
  const cats = await page.locator('.category-chip').count()
  const books = await page.locator('.product-card').count()
  expect(cats >= 3, `expected >=3 category chips, got ${cats}`)
  expect(books >= 7, `expected >=7 books, got ${books}`)
  await shot('01-home')
  return `${cats} categories, ${books} books`
})

await step('E2E-02', 'Navbar shows Sign In / Register when logged out', async () => {
  await page.locator('.navbar').getByRole('link', { name: 'Sign In' }).waitFor()
  await page.locator('.navbar').getByRole('link', { name: 'Register' }).waitFor()
  expect(await page.locator('.navbar .cart-link').count() === 0, 'cart link visible while logged out')
})

await step('E2E-03', 'Catalogue lists all books', async () => {
  await page.goto(UI + '/catalogue')
  await page.locator('.product-card').first().waitFor()
  const n = await page.locator('.product-card').count()
  expect(n >= 7, `expected >=7 books, got ${n}`)
  await shot('02-catalogue')
  return `${n} books`
})

await step('E2E-04', 'Filtering by category shows only that category', async () => {
  await page.getByRole('button', { name: 'Fiction' }).click()
  await page.waitForFunction(() => location.search.includes('categoryId='))
  await page.waitForFunction(() => [...document.querySelectorAll('.product-card-cat')].every(e => e.textContent === 'Fiction') && document.querySelectorAll('.product-card').length > 0)
  const titles = await page.locator('.product-card-title').allTextContents()
  expect(titles.includes('1984'), `1984 missing from Fiction: ${titles}`)
  expect(!titles.includes('Clean Code'), 'Technology book leaked into Fiction filter')
  return titles.join(', ')
})

await step('E2E-05', 'Navbar search finds a book by author', async () => {
  await page.getByPlaceholder(/Search books/).fill('orwell')
  await page.getByPlaceholder(/Search books/).press('Enter')
  await page.waitForFunction(() => location.search.includes('search=orwell'))
  await page.getByText('1984').first().waitFor()
  expect(await page.locator('.product-card').count() === 1, 'expected exactly 1 result')
  await shot('03-search')
})

await step('E2E-06', 'Search with no match shows the empty state', async () => {
  await page.goto(UI + '/catalogue?search=zzzznomatch')
  await page.getByText('No books found for "zzzznomatch"').waitFor()
})

await step('E2E-07', 'Product detail page shows price, stock, ISBN and related books', async () => {
  await page.goto(UI + '/catalogue')
  await page.locator('.product-card', { hasText: 'Clean Code' }).click()
  await page.waitForURL(/\/products\/\d+/)
  await page.getByRole('heading', { name: 'Clean Code' }).waitFor()
  await page.getByText('978-0132350884').waitFor()
  await page.getByText(/In Stock/).waitFor()
  await page.getByText(/Related/).waitFor()
  expect((await page.locator('.product-detail-price').textContent()).startsWith('$'), 'price not shown')
  await shot('04-product-detail')
})

await step('E2E-08', 'Unknown product id redirects back to the catalogue', async () => {
  await page.goto(UI + '/products/999999')
  await page.waitForURL(/\/catalogue/)
})

await step('E2E-09', 'Anonymous "+ Cart" redirects to /login', async () => {
  await page.goto(UI + '/catalogue')
  await page.locator('.product-card button', { hasText: '+ Cart' }).first().click()
  await page.waitForURL(/\/login/)
})

// ───────────────────────── Route protection ─────────────────────────
for (const [i, route] of ['/cart', '/checkout', '/orders'].entries()) {
  await step(`E2E-1${i}`, `Anonymous visit to ${route} is redirected to /login`, async () => {
    await page.goto(UI + route)
    await page.waitForURL(/\/login/)
  })
}

// ───────────────────────── Auth ─────────────────────────
await step('E2E-13', 'Login with a wrong password shows an error message  [KNOWN DEFECT UI-04]', async () => {
  await page.goto(UI + '/login')
  await page.locator('input[name=email]').fill('admin@bookstore.com')
  await page.locator('input[name=password]').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.locator('.alert-error').waitFor({ timeout: 3000 }).catch(() => { throw new Error('no error message shown: backend answers 401, the axios interceptor treats it as an expired session and hard-reloads /login, wiping the message') })
  expect(path_() === '/login', `left /login: ${path_()}`)
  return (await page.locator('.alert-error').textContent()).trim()
})

await step('E2E-14', 'Register a new account logs the user in', async () => {
  await page.goto(UI + '/register')
  await page.locator('input[name=firstName]').fill(user.first)
  await page.locator('input[name=lastName]').fill(user.last)
  await page.locator('input[name=email]').fill(user.email)
  await page.locator('input[name=password]').fill(user.password)
  await page.getByRole('button', { name: 'Create Account' }).click()
  await page.waitForURL(UI + '/')
  await page.getByText(`👤 ${user.first}`).waitFor()
  await shot('05-registered')
})

await step('E2E-15', 'Session survives a page reload (JWT in localStorage)', async () => {
  await page.reload()
  await page.getByText(`👤 ${user.first}`).waitFor()
  expect(!!(await page.evaluate(() => localStorage.getItem('token'))), 'token missing')
})

await step('E2E-16', 'Sign Out clears the session', async () => {
  await page.getByRole('button', { name: 'Sign Out' }).click()
  await page.locator('.navbar').getByRole('link', { name: 'Sign In' }).waitFor()
  expect(!(await page.evaluate(() => localStorage.getItem('token'))), 'token still present')
})

await step('E2E-17', 'Login with the new account works', async () => {
  await page.goto(UI + '/login')
  await page.locator('input[name=email]').fill(user.email)
  await page.locator('input[name=password]').fill(user.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL(UI + '/')
  await page.getByText(`👤 ${user.first}`).waitFor()
})

await step('E2E-18', 'Registering the same email again shows a duplicate error', async () => {
  const p2 = await ctx.newPage()   // same context => already logged in; use a fresh context instead
  await p2.close()
  const c2 = await browser.newContext()
  const q = await c2.newPage()
  await q.goto(UI + '/register')
  await q.locator('input[name=firstName]').fill('Dup')
  await q.locator('input[name=lastName]').fill('User')
  await q.locator('input[name=email]').fill(user.email)
  await q.locator('input[name=password]').fill(user.password)
  await q.getByRole('button', { name: 'Create Account' }).click()
  await q.locator('.alert-error', { hasText: /already in use/i }).waitFor()
  await c2.close()
})

// ───────────────────────── Cart ─────────────────────────
await step('E2E-19', 'Empty cart shows the empty state', async () => {
  await page.goto(UI + '/cart')
  await page.getByText('Your cart is empty').waitFor()
})

await step('E2E-20', 'Add to cart from a product card updates the navbar badge', async () => {
  await page.goto(UI + '/catalogue')
  await page.locator('.product-card', { hasText: 'Clean Code' }).locator('button').click()
  await page.getByText(/added to cart/).waitFor()
  await page.locator('.product-card', { hasText: '1984' }).locator('button').click()
  await page.waitForTimeout(400)
  await page.locator('.navbar .cart-link').click()   // navigation refreshes the badge
  await page.locator('.cart-item').first().waitFor()
  const badge = await page.locator('.cart-badge').textContent()
  expect(badge === '2', `badge should be 2, was ${badge}`)
  await shot('06-cart')
})

await step('E2E-21', 'Cart shows both lines, correct subtotal and total', async () => {
  const lines = await page.locator('.cart-item').count()
  expect(lines === 2, `expected 2 lines, got ${lines}`)
  const total = await page.locator('.cart-summary-total span').last().textContent()
  expect(total === '$44.98', `expected $44.98 (34.99 + 9.99), got ${total}`)
})

await step('E2E-22', 'Increasing a quantity updates the line subtotal and total', async () => {
  const row = page.locator('.cart-item', { hasText: '1984' })
  await row.locator('.qty-btn', { hasText: '+' }).click()
  await page.waitForFunction(() => document.querySelector('.cart-summary-total span:last-child')?.textContent === '$54.97')
  expect((await row.locator('.cart-item-subtotal').textContent()) === '$19.98', 'line subtotal wrong')
})

await step('E2E-23', 'Removing an item (✕) removes it from the cart', async () => {
  await page.locator('.cart-item', { hasText: '1984' }).locator('.cart-remove').click()
  await page.waitForTimeout(800)
  const n = await page.locator('.cart-item').count()
  await page.reload()
  await page.locator('.cart-item').first().waitFor()
  const afterReload = await page.locator('.cart-item').count()
  expect(n === 1 && afterReload === 1, `UI shows ${n} line(s), after reload ${afterReload} (expected 1) — see backend defect CART-07`)
})

// ───────────────────────── Checkout → Payment → Confirmation ─────────────────────────
await step('E2E-24', 'Checkout: first-time user is shown the new-address form', async () => {
  await page.goto(UI + '/cart')
  await page.getByRole('button', { name: /Proceed to Checkout/ }).click()
  await page.waitForURL(/\/checkout/)
  await page.getByText('New Address').waitFor()
})

await step('E2E-25', 'Checkout: saving an address selects it', async () => {
  const f = page.locator('.address-form input.form-input')
  const vals = ['E2E Tester', '9999999999', '12 Test Street', 'Pune', 'MH', '411001', 'India']
  for (const [i, v] of vals.entries()) await f.nth(i).fill(v)
  await page.getByRole('button', { name: 'Save Address' }).click()
  await page.locator('.address-card.selected', { hasText: '12 Test Street' }).waitFor()
  await shot('07-checkout')
})

let checkoutTotal = ''   // cart total as shown at checkout (independent of CART-07)
await step('E2E-26', 'Checkout: gift-point discount (1 point = $0.01) is reflected in the summary', async () => {
  const totalEl = page.locator('.checkout-summary-total span').last()
  checkoutTotal = (await totalEl.textContent()).trim()
  const base = parseFloat(checkoutTotal.slice(1))
  await page.locator('.gift-input').fill('100')
  await page.getByText('Discount:').waitFor()
  const t = (await totalEl.textContent()).trim()
  expect(t === '$' + (base - 1).toFixed(2), `expected $${(base - 1).toFixed(2)} (${checkoutTotal} - 1.00), got ${t}`)
  await page.locator('.gift-input').fill('0')
  return `base ${checkoutTotal}, with 100 points ${t}`
})

await step('E2E-27', 'Payment: choosing UPI and paying completes the order', async () => {
  await page.getByRole('button', { name: /Continue to Payment/ }).click()
  await page.waitForURL(/\/payment/)
  await page.getByRole('button', { name: /UPI/ }).click()
  await page.getByPlaceholder('yourname@upi').fill('e2e@upi')
  await shot('08-payment')
  await page.getByRole('button', { name: /Pay Now/ }).click()
  await page.waitForURL(/\/confirmation\/\d+/)
})

await step('E2E-28', 'Confirmation page shows the order number, item and total', async () => {
  await page.getByText('Order Confirmed!').waitFor()
  const num = (await page.locator('.conf-meta-val').first().textContent()).trim()
  expect(/^ORD-[A-Z0-9]{8}$/.test(num), `bad order number ${num}`)
  await page.getByText('Clean Code').waitFor()
  await page.getByText('12 Test Street').waitFor()
  const paid = (await page.locator('.conf-total').textContent()).trim()
  expect(paid === checkoutTotal, `total paid ${paid} differs from checkout total ${checkoutTotal}`)
  await shot('09-confirmation')
  return num
})

await step('E2E-29', 'Cart is empty after the order', async () => {
  await page.goto(UI + '/cart')
  await page.getByText('Your cart is empty').waitFor()
})

// ───────────────────────── Orders ─────────────────────────
await step('E2E-30', 'Order history lists the order with status CONFIRMED', async () => {
  await page.goto(UI + '/orders')
  await page.locator('.order-card').first().waitFor()
  await page.locator('.order-status-badge', { hasText: 'CONFIRMED' }).waitFor()
  await shot('10-orders')
})

await step('E2E-31', 'Expanding an order shows items, address, Buy Again and Cancel', async () => {
  await page.locator('.order-header').first().click()
  await page.getByText('Clean Code').first().waitFor()
  await page.getByText(/Delivering to:/).waitFor()
  await page.getByRole('button', { name: /Buy Again/ }).waitFor()
  await page.getByRole('button', { name: 'Cancel Order' }).waitFor()
})

await step('E2E-32', 'Buy Again puts the items back in the cart', async () => {
  await page.getByRole('button', { name: /Buy Again/ }).click()
  await page.getByText('Items added to cart!').waitFor()
  await page.goto(UI + '/cart')
  await page.locator('.cart-item', { hasText: 'Clean Code' }).waitFor()
})

await step('E2E-33', 'Cancel Order (within 48h) marks the order CANCELLED', async () => {
  await page.goto(UI + '/orders')
  await page.locator('.order-header').first().click()
  await page.getByRole('button', { name: 'Cancel Order' }).click()   // confirm() auto-accepted
  await page.locator('.order-status-badge', { hasText: 'CANCELLED' }).waitFor()
  await page.locator('.order-header').first().click()
  expect(await page.getByRole('button', { name: 'Cancel Order' }).count() === 0, 'Cancel still offered')
  await shot('11-cancelled')
})

// ───────────────────────── Known UI defects ─────────────────────────
await step('E2E-34', 'Opening /payment directly (no checkout state) redirects to /checkout  [KNOWN DEFECT UI-02]', async () => {
  await page.goto(UI + '/payment')
  await page.waitForTimeout(800)
  expect(path_() === '/checkout', `stayed on ${path_()} with a blank page; expected redirect to /checkout`)
})

await step('E2E-35', 'Catalogue pagination Next moves to page 2  [KNOWN DEFECT UI-01]', async () => {
  // Needs more than one page of products (page size is 20). Seed DB has 7 books, so verify via the URL handler.
  await page.goto(UI + '/catalogue')
  const hasPager = await page.locator('.pagination').count()
  if (!hasPager) return 'SKIPPED: only one page of products in DB (unit test UI-01 covers this)'
  await page.locator('.pagination button', { hasText: '›' }).click()
  await page.waitForFunction(() => location.search.includes('page=1'))
})

await step('E2E-36', 'No uncaught JavaScript errors during the whole run', async () => {
  expect(consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))
})

await step('E2E-37', 'Expired/invalid token (401) logs the user out and redirects to /login', async () => {
  await page.evaluate(() => localStorage.setItem('token', 'garbage.invalid.token'))
  await page.goto(UI + '/orders')
  await page.waitForTimeout(1500)
  const onLogin = /\/login/.test(page.url())
  const stillHasToken = await page.evaluate(() => localStorage.getItem('token'))
  expect(onLogin || stillHasToken === null,
    `invalid JWT: backend returns 403 (not 401) so the interceptor never fires; user stays on ${path_()} with a broken session  [UI-03]`)
})

await browser.close()

// ───────────────────────── Report ─────────────────────────
const passed = results.filter(r => r.pass).length
const failed = results.length - passed
const md = [
  '# Ebookstore UI – End-to-End Test Report', '',
  `- Run at: ${new Date().toISOString()}`,
  `- Target: ${UI} (proxy -> http://localhost:8080)`,
  `- Browser: Chrome headless`,
  `- Test user: ${user.email}`,
  `- Total: **${results.length}**, Passed: **${passed}**, Failed: **${failed}**`, '',
  '| ID | Test | Result | Details |', '|----|------|--------|---------|',
  ...results.map(r => `| ${r.id} | ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${String(r.detail).replace(/\|/g, '/')} |`),
  '', 'Screenshots: `ebookstore-ui/e2e/screenshots/`', '',
].join('\n')
fs.writeFileSync(path.join(HERE, 'e2e-report.md'), md)
console.log(`\n=== E2E Total: ${results.length}  Passed: ${passed}  Failed: ${failed} ===`)
process.exit(failed ? 1 : 0)
