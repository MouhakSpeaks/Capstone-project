import api from './axiosClient'
import * as svc from './services'

vi.mock('./axiosClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

describe('services (API URL / payload contract)', () => {
  it('auth', () => {
    svc.register({ a: 1 }); svc.login({ b: 2 })
    expect(api.post).toHaveBeenCalledWith('/auth/register', { a: 1 })
    expect(api.post).toHaveBeenCalledWith('/auth/login', { b: 2 })
  })

  it('categories', () => {
    svc.getCategories(); svc.getCategoryById(4)
    expect(api.get).toHaveBeenCalledWith('/categories')
    expect(api.get).toHaveBeenCalledWith('/categories/4')
  })

  it('products with default and custom paging', () => {
    svc.getProducts()
    expect(api.get).toHaveBeenCalledWith('/products', { params: { page: 0, size: 20, sortBy: 'createdAt' } })
    svc.getProducts(2, 8, 'rating')
    expect(api.get).toHaveBeenCalledWith('/products', { params: { page: 2, size: 8, sortBy: 'rating' } })
    svc.getProductById(9)
    expect(api.get).toHaveBeenCalledWith('/products/9')
    svc.getProductsByCategory(3)
    expect(api.get).toHaveBeenCalledWith('/products/category/3', { params: { page: 0, size: 20 } })
    svc.searchProducts('clean', 1, 5)
    expect(api.get).toHaveBeenCalledWith('/products/search', { params: { keyword: 'clean', page: 1, size: 5 } })
    svc.getRelatedProducts(7)
    expect(api.get).toHaveBeenCalledWith('/products/7/related')
  })

  it('cart', () => {
    svc.getCart(); svc.addToCart(5); svc.addToCart(5, 3)
    expect(api.get).toHaveBeenCalledWith('/cart')
    expect(api.post).toHaveBeenCalledWith('/cart/items', { productId: 5, quantity: 1 })
    expect(api.post).toHaveBeenCalledWith('/cart/items', { productId: 5, quantity: 3 })
    svc.updateCartItem(11, 4)
    expect(api.put).toHaveBeenCalledWith('/cart/items/11', null, { params: { quantity: 4 } })
    svc.removeCartItem(11); svc.clearCart()
    expect(api.delete).toHaveBeenCalledWith('/cart/items/11')
    expect(api.delete).toHaveBeenCalledWith('/cart')
  })

  it('orders', () => {
    svc.placeOrder({ shippingAddressId: 1 }); svc.getOrders(); svc.getOrderById(2); svc.cancelOrder(2)
    expect(api.post).toHaveBeenCalledWith('/orders', { shippingAddressId: 1 })
    expect(api.get).toHaveBeenCalledWith('/orders', { params: { page: 0, size: 10 } })
    expect(api.get).toHaveBeenCalledWith('/orders/2')
    expect(api.put).toHaveBeenCalledWith('/orders/2/cancel')
  })

  it('addresses and payment', () => {
    svc.getAddresses(); svc.addAddress({ x: 1 }); svc.updateAddress(3, { y: 2 }); svc.deleteAddress(3)
    expect(api.get).toHaveBeenCalledWith('/users/addresses')
    expect(api.post).toHaveBeenCalledWith('/users/addresses', { x: 1 })
    expect(api.put).toHaveBeenCalledWith('/users/addresses/3', { y: 2 })
    expect(api.delete).toHaveBeenCalledWith('/users/addresses/3')
    svc.processPayment({ orderId: 1 }); svc.getPaymentByOrder(1)
    expect(api.post).toHaveBeenCalledWith('/users/payment', { orderId: 1 })
    expect(api.get).toHaveBeenCalledWith('/users/payment/order/1')
  })
})
