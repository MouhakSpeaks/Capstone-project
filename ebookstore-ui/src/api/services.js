import api from './axiosClient'

// ── Auth ──────────────────────────────────────
export const register = (data)  => api.post('/auth/register', data)
export const login    = (data)  => api.post('/auth/login', data)

// ── Categories ───────────────────────────────
export const getCategories   = ()       => api.get('/categories')
export const getCategoryById = (id)     => api.get(`/categories/${id}`)

// ── Products ─────────────────────────────────
export const getProducts          = (page = 0, size = 20, sortBy = 'createdAt') =>
  api.get('/products', { params: { page, size, sortBy } })

export const getProductById       = (id)               => api.get(`/products/${id}`)
export const getProductsByCategory = (catId, page = 0, size = 20) =>
  api.get(`/products/category/${catId}`, { params: { page, size } })

export const searchProducts       = (keyword, page = 0, size = 20) =>
  api.get('/products/search', { params: { keyword, page, size } })

export const getRelatedProducts   = (id)               => api.get(`/products/${id}/related`)

// ── Cart ─────────────────────────────────────
export const getCart          = ()                          => api.get('/cart')
export const addToCart        = (productId, quantity = 1)  => api.post('/cart/items', { productId, quantity })
export const updateCartItem   = (cartItemId, quantity)     => api.put(`/cart/items/${cartItemId}`, null, { params: { quantity } })
export const removeCartItem   = (cartItemId)               => api.delete(`/cart/items/${cartItemId}`)
export const clearCart        = ()                          => api.delete('/cart')

// ── Orders ───────────────────────────────────
export const placeOrder       = (data)        => api.post('/orders', data)
export const getOrders        = (page = 0, size = 10) => api.get('/orders', { params: { page, size } })
export const getOrderById     = (id)          => api.get(`/orders/${id}`)
export const cancelOrder      = (id)          => api.put(`/orders/${id}/cancel`)

// ── Addresses ────────────────────────────────
export const getAddresses     = ()            => api.get('/users/addresses')
export const addAddress       = (data)        => api.post('/users/addresses', data)
export const updateAddress    = (id, data)    => api.put(`/users/addresses/${id}`, data)
export const deleteAddress    = (id)          => api.delete(`/users/addresses/${id}`)

// ── Payment ──────────────────────────────────
export const processPayment   = (data)        => api.post('/users/payment', data)
export const getPaymentByOrder = (orderId)    => api.get(`/users/payment/order/${orderId}`)
