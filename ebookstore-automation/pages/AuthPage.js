import { expect } from '@playwright/test'
import { BasePage } from './BasePage.js'

export class AuthPage extends BasePage {
  get email() { return this.page.locator('input[name=email]') }
  get password() { return this.page.locator('input[name=password]') }
  get firstName() { return this.page.locator('input[name=firstName]') }
  get lastName() { return this.page.locator('input[name=lastName]') }
  get error() { return this.page.locator('.alert-error') }

  async openLogin() { await this.goto('/login') }
  async openRegister() { await this.goto('/register') }

  async login(email, password) {
    await this.openLogin()
    await this.email.fill(email)
    await this.password.fill(password)
    await this.page.getByRole('button', { name: 'Sign In' }).click()
  }

  async register({ firstName, lastName, email, password }) {
    await this.openRegister()
    await this.firstName.fill(firstName)
    await this.lastName.fill(lastName)
    await this.email.fill(email)
    await this.password.fill(password)
    await this.page.getByRole('button', { name: 'Create Account' }).click()
  }

  async expectOnHome() { await expect(this.page).toHaveURL(/\/$/) }
}
