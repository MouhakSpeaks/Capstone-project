import { test, expect, uniqueUser, api } from '../fixtures/index.js'

test.describe('Registration and login', () => {
  test('a new visitor can register and is signed in @smoke', async ({ page, pages }) => {
    const u = uniqueUser('reg')
    await pages.auth.register(u)
    await expect(page).toHaveURL(/\/$/)
    await pages.base.expectSignedInAs(u.firstName)
    await expect(pages.base.signOutButton).toBeVisible()
    const stored = await page.evaluate(() => ({ t: localStorage.getItem('token'), u: JSON.parse(localStorage.getItem('user')) }))
    expect(stored.t).toBeTruthy()
    expect(stored.u).toMatchObject({ email: u.email, role: 'CUSTOMER' })
    expect(stored.u.token).toBeUndefined()
  })

  test('registering an email that already exists shows an error', async ({ page, pages, customer }) => {
    await pages.auth.register({ firstName: 'Dup', lastName: 'User', email: customer.email, password: customer.password })
    await expect(pages.auth.error).toContainText(/already in use/i)
    await expect(page).toHaveURL(/\/register/)
  })

  test('registration requires all fields (browser validation blocks submit)', async ({ page, pages }) => {
    await pages.auth.openRegister()
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/register/)
    const invalid = await page.locator('input:invalid').count()
    expect(invalid).toBeGreaterThanOrEqual(4)
  })

  test('registration rejects a malformed e-mail address', async ({ page, pages }) => {
    await pages.auth.openRegister()
    await pages.auth.firstName.fill('A'); await pages.auth.lastName.fill('B')
    await pages.auth.email.fill('not-an-email'); await pages.auth.password.fill('Passw0rd!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL(/\/register/)
    expect(await pages.auth.email.evaluate(el => el.validity.typeMismatch)).toBe(true)
  })

  test('an existing customer can sign in @smoke', async ({ page, pages, customer }) => {
    await pages.auth.login(customer.email, customer.password)
    await expect(page).toHaveURL(/\/$/)
    await pages.base.expectSignedInAs(customer.firstName)
    await expect(pages.base.cartLink).toBeVisible()
  })

  test('the seeded administrator can sign in', async ({ page, pages }) => {
    await pages.auth.login('admin@bookstore.com', 'admin123')
    await pages.base.expectSignedInAs('Admin')
    const role = await page.evaluate(() => JSON.parse(localStorage.getItem('user')).role)
    expect(role).toBe('ADMIN')
  })

  test('the session survives a page reload', async ({ page, pages, customer }) => {
    await pages.auth.login(customer.email, customer.password)
    await pages.base.expectSignedInAs(customer.firstName)
    await page.reload()
    await pages.base.expectSignedInAs(customer.firstName)
  })

  test('Sign Out clears the session and protects the cart again @smoke', async ({ page, pages, customer }) => {
    await pages.auth.login(customer.email, customer.password)
    await pages.base.expectSignedInAs(customer.firstName)
    await pages.base.signOutButton.click()
    await expect(pages.base.signInLink).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull()
    expect(await page.evaluate(() => localStorage.getItem('user'))).toBeNull()
    await page.goto('/cart')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login and register pages link to each other', async ({ page, pages }) => {
    await pages.auth.openLogin()
    await page.locator('.auth-switch').getByRole('link', { name: 'Register free' }).click()
    await expect(page).toHaveURL(/\/register/)
    await page.locator('.auth-switch').getByRole('link', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Known defects (expected to fail until fixed)', () => {
  test('UI-04: a wrong password shows an error message and stays on /login', async ({ page, pages, customer }) => {
    test.fail(!process.env.RAW_DEFECTS, 'UI-04: 401 triggers the axios interceptor which hard-reloads /login and wipes the error')
    await pages.auth.login(customer.email, 'wrong-password')
    await expect(pages.auth.error).toBeVisible({ timeout: 3000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('UI-03: an invalid/expired token signs the user out', async ({ page, pages, customer }) => {
    test.fail(!process.env.RAW_DEFECTS, 'UI-03: backend answers 403 (not 401) for a bad JWT so the interceptor never signs the user out')
    await pages.auth.login(customer.email, customer.password)
    await pages.base.expectSignedInAs(customer.firstName)
    await page.evaluate(() => localStorage.setItem('token', 'garbage.invalid.token'))
    await page.goto('/orders')
    await expect(page).toHaveURL(/\/login/, { timeout: 4000 })
  })
})
