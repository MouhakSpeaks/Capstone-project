import { expect } from '@playwright/test'
import { BasePage } from './BasePage.js'

export class CataloguePage extends BasePage {
  get cards() { return this.page.locator('.product-card') }
  get titles() { return this.page.locator('.product-card-title') }
  get categoryButtons() { return this.page.locator('.category-btn') }
  get emptyState() { return this.page.locator('.empty-state') }
  get pagination() { return this.page.locator('.pagination') }

  card(title) { return this.cards.filter({ has: this.page.locator('.product-card-title', { hasText: new RegExp(`^${escape(title)}$`) }) }) }

  async open(query = '') { await this.goto('/catalogue' + query); await this.waitForLoaded() }
  async waitForLoaded() {
    await expect(this.cards.first().or(this.emptyState)).toBeVisible()
  }
  async chooseCategory(name) {
    await this.page.locator('.category-btn', { hasText: new RegExp(`^${escape(name)}$`) }).click()
  }
  async addToCart(title) {
    await this.card(title).getByRole('button', { name: '+ Cart' }).click()
  }
  async openBook(title) {
    await this.card(title).click()
    await expect(this.page).toHaveURL(/\/products\/\d+/)
  }
}

export class ProductPage extends BasePage {
  get heading() { return this.page.locator('.product-detail-title') }
  get price() { return this.page.locator('.product-detail-price') }
  get stock() { return this.page.locator('.product-detail-stock') }
  get meta() { return this.page.locator('.product-detail-meta') }
  get qtyValue() { return this.page.locator('.product-detail-actions .qty-val') }
  get addButton() { return this.page.getByRole('button', { name: /Add to Cart/ }) }
  get buyNowButton() { return this.page.getByRole('button', { name: 'Buy Now' }) }
  get relatedSection() { return this.page.locator('.related-section') }

  async increaseQty() { await this.page.locator('.product-detail-actions .qty-btn', { hasText: '+' }).click() }
  async decreaseQty() { await this.page.locator('.product-detail-actions .qty-btn', { hasText: '−' }).click() }
}

function escape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
