import api from './axiosClient'

const getHandlers = (kind) => api.interceptors[kind].handlers.filter(Boolean)[0]

describe('axiosClient', () => {
  it('uses /api as base URL', () => {
    expect(api.defaults.baseURL).toBe('/api')
  })

  it('attaches the Bearer token from localStorage to requests', () => {
    localStorage.setItem('token', 'abc123')
    const cfg = getHandlers('request').fulfilled({ headers: {} })
    expect(cfg.headers.Authorization).toBe('Bearer abc123')
  })

  it('does not set Authorization when there is no token', () => {
    const cfg = getHandlers('request').fulfilled({ headers: {} })
    expect(cfg.headers.Authorization).toBeUndefined()
  })

  it('passes successful responses through unchanged', () => {
    const res = { status: 200 }
    expect(getHandlers('response').fulfilled(res)).toBe(res)
  })

  describe('401 handling', () => {
    const original = window.location
    beforeEach(() => {
      Object.defineProperty(window, 'location', { value: { href: '/cart' }, writable: true, configurable: true })
    })
    afterEach(() => {
      Object.defineProperty(window, 'location', { value: original, writable: true, configurable: true })
    })

    it('clears credentials, redirects to /login and rejects', async () => {
      localStorage.setItem('token', 't')
      localStorage.setItem('user', '{}')
      const err = { response: { status: 401 } }
      await expect(getHandlers('response').rejected(err)).rejects.toBe(err)
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(window.location.href).toBe('/login')
    })

    it('keeps credentials for non-401 errors', async () => {
      localStorage.setItem('token', 't')
      const err = { response: { status: 500 } }
      await expect(getHandlers('response').rejected(err)).rejects.toBe(err)
      expect(localStorage.getItem('token')).toBe('t')
      expect(window.location.href).toBe('/cart')
    })

    it('handles network errors without a response object', async () => {
      const err = new Error('Network Error')
      await expect(getHandlers('response').rejected(err)).rejects.toBe(err)
      expect(window.location.href).toBe('/cart')
    })
  })
})
