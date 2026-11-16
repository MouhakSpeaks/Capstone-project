import { test as base, expect } from '@playwright/test'
import { api, uniqueUser } from '../support/api.js'
import { BasePage } from '../pages/BasePage.js'
import { AuthPage } from '../pages/AuthPage.js'
import { CataloguePage, ProductPage } from '../pages/CataloguePage.js'
import { CartPage, CheckoutPage, PaymentPage, ConfirmationPage, OrdersPage } from '../pages/ShopPages.js'

/**
 * Fixtures
 *  - pages     : page objects for every screen
 *  - customer  : a brand-new customer registered through the API (unique email per test)
 *  - login     : (page, customer) -> puts the session in localStorage exactly like the app does
 *  - signedIn  : like `page`, but already signed in as `customer` (skips the login screen for speed)
 *  - adminToken: bearer token for set-up work
 *  - book      : a fresh book created by the admin API (deactivated after the test)
 */
export const test = base.extend({
  pages: async ({ page }, use) => {
    await use({
      base: new BasePage(page),
      auth: new AuthPage(page),
      catalogue: new CataloguePage(page),
      product: new ProductPage(page),
      cart: new CartPage(page),
      checkout: new CheckoutPage(page),
      payment: new PaymentPage(page),
      confirmation: new ConfirmationPage(page),
      orders: new OrdersPage(page),
    })
  },

  customer: async ({}, use) => {
    const user = uniqueUser()
    const r = await api.register(user)
    if (![200, 201].includes(r.status)) throw new Error(`Could not register test customer: ${r.status} ${JSON.stringify(r.body)}`)
    const { token, ...profile } = r.body.data
    await use({ ...user, token, profile })
  },

  adminToken: async ({}, use) => { await use(await api.adminToken()) },

  book: async ({ adminToken }, use) => {
    const created = await api.createBook(adminToken)
    await use(created)
    await api.deleteBook(adminToken, created.id)
  },

  signedIn: async ({ page, customer }, use) => {
    const { token, profile } = customer
    await page.addInitScript(([t, u]) => {
      if (!localStorage.getItem('token')) {
        localStorage.setItem('token', t)
        localStorage.setItem('user', u)
      }
    }, [token, JSON.stringify(profile)])
    await use(page)
  },
})

export { expect, api, uniqueUser }
