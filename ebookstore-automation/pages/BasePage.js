import { expect } from '@playwright/test'

export class BasePage {
  constructor(page) {
    this.page = page
    this.navbar = page.locator('.navbar')
    this.toast = page.locator('[role="status"]')
  }
  async goto(path = '/') { await this.page.goto(path) }
  get path() { return new URL(this.page.url()).pathname }
  get url() { return new URL(this.page.url()) }

  // ---- navbar ----
  get signInLink() { return this.navbar.getByRole('link', { name: 'Sign In' }) }
  get registerLink() { return this.navbar.getByRole('link', { name: 'Register' }) }
  get signOutButton() { return this.navbar.getByRole('button', { name: 'Sign Out' }) }
  get cartLink() { return this.navbar.locator('.cart-link') }
  get cartBadge() { return this.navbar.locator('.cart-badge') }
  get searchBox() { return this.navbar.getByPlaceholder(/Search books/) }

  async search(text) {
    await this.searchBox.fill(text)
    await this.searchBox.press('Enter')
  }
  async expectSignedInAs(firstName) {
    await expect(this.navbar.getByText(`👤 ${firstName}`)).toBeVisible()
  }
  async expectToast(text) {
    await expect(this.page.locator('[role="status"]', { hasText: text }).first()).toBeVisible()
  }
}
