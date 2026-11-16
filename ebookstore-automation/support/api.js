// Thin REST client used ONLY to prepare and clean up test data quickly.
// Everything a user would do is still exercised through the UI in the specs.
const API = process.env.API_URL || 'http://localhost:8080/api'

export const ADMIN = { email: 'admin@bookstore.com', password: 'admin123' }

async function call(method, path, { token, body, params } = {}) {
  const url = new URL(API + path)
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v)
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON body */ }
  return { status: res.status, body: json }
}

let counter = 0
export function uniqueUser(prefix = 'pw') {
  const id = `${Date.now().toString().slice(-8)}${(counter++).toString().padStart(2, '0')}${Math.floor(Math.random() * 900 + 100)}`
  return {
    firstName: 'Auto',
    lastName: 'Tester',
    email: `${prefix}${id}@example.com`,
    password: 'Passw0rd!',
  }
}

export const SAMPLE_ADDRESS = {
  fullName: 'Auto Tester', phone: '9999999999', street: '12 Test Street',
  city: 'Pune', state: 'MH', postalCode: '411001', country: 'India',
}

export const api = {
  call,

  register: (user) => call('POST', '/auth/register', { body: user }),
  login: (email, password) => call('POST', '/auth/login', { body: { email, password } }),
  async adminToken() {
    const r = await call('POST', '/auth/login', { body: ADMIN })
    if (r.status !== 200) throw new Error(`Admin login failed (${r.status}). Is the backend seeded?`)
    return r.body.data.token
  },

  // ---- catalogue ----
  async categories() { return (await call('GET', '/categories')).body.data },
  async findBook(title) {
    const r = await call('GET', '/products/search', { params: { keyword: title, size: 50 } })
    return r.body?.data?.content?.find(p => p.title === title) || null
  },
  async createBook(adminToken, over = {}) {
    const cats = await api.categories()
    const n = `${Date.now()}${Math.floor(Math.random() * 1000)}`
    const body = {
      title: `Auto Book ${n}`, author: 'Auto Author', isbn: `AUTO-${n}`,
      price: 19.99, stockQuantity: 50, categoryId: cats[0].id, ...over,
    }
    const r = await call('POST', '/products', { token: adminToken, body })
    if (![200, 201].includes(r.status)) throw new Error(`createBook failed: ${r.status} ${JSON.stringify(r.body)}`)
    return r.body.data
  },
  deleteBook: (adminToken, id) => call('DELETE', `/products/${id}`, { token: adminToken }),

  // ---- cart / address / order / payment (as a customer) ----
  addToCart: (token, productId, quantity = 1) => call('POST', '/cart/items', { token, body: { productId, quantity } }),
  getCart: (token) => call('GET', '/cart', { token }),
  clearCart: (token) => call('DELETE', '/cart', { token }),
  async addAddress(token, over = {}) {
    const r = await call('POST', '/users/addresses', { token, body: { ...SAMPLE_ADDRESS, ...over } })
    return r.body.data
  },
  placeOrder: (token, shippingAddressId, pointsToRedeem = 0) =>
    call('POST', '/orders', { token, body: { shippingAddressId, pointsToRedeem } }),
  pay: (token, orderId) =>
    call('POST', '/users/payment', { token, body: { orderId, paymentMethod: 'UPI', upiId: 'api@upi' } }),
  getOrders: (token) => call('GET', '/orders', { token }),

  /** Buy `quantity` copies of a book end-to-end through the API (address + order + payment). */
  async buy(token, productId, { quantity = 1, pointsToRedeem = 0 } = {}) {
    const addr = await api.addAddress(token)
    await api.addToCart(token, productId, quantity)
    const o = await api.placeOrder(token, addr.id, pointsToRedeem)
    if (![200, 201].includes(o.status)) throw new Error(`placeOrder failed: ${o.status} ${JSON.stringify(o.body)}`)
    await api.pay(token, o.body.data.id)
    return o.body.data
  },
}
