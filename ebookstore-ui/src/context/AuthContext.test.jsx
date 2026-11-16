import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { login, register } from '../api/services'
import { ok, fail } from '../test/utils'

vi.mock('../api/services', () => ({ login: vi.fn(), register: vi.fn() }))

let ctx
function Probe() {
  ctx = useAuth()
  return <div data-testid="who">{ctx.user ? ctx.user.firstName : 'anonymous'}</div>
}
const mount = () => render(<AuthProvider><Probe /></AuthProvider>)

describe('AuthContext', () => {
  it('starts anonymous with empty storage', () => {
    mount()
    expect(screen.getByTestId('who')).toHaveTextContent('anonymous')
  })

  it('restores the user from localStorage', () => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Jane' }))
    mount()
    expect(screen.getByTestId('who')).toHaveTextContent('Jane')
  })

  it('tolerates corrupt JSON in localStorage', () => {
    localStorage.setItem('user', '{not json')
    mount()
    expect(screen.getByTestId('who')).toHaveTextContent('anonymous')
  })

  it('signIn stores token + user (without the token) and updates state', async () => {
    login.mockResolvedValue(ok({ token: 'jwt1', email: 'a@b.com', firstName: 'Ann', role: 'CUSTOMER' }))
    mount()
    await act(async () => { await ctx.signIn({ email: 'a@b.com', password: 'x' }) })
    expect(login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'x' })
    expect(localStorage.getItem('token')).toBe('jwt1')
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ email: 'a@b.com', firstName: 'Ann', role: 'CUSTOMER' })
    expect(screen.getByTestId('who')).toHaveTextContent('Ann')
  })

  it('signIn failure leaves the state untouched and rethrows', async () => {
    login.mockRejectedValue(fail('Invalid email or password', 401))
    mount()
    await act(async () => {
      await expect(ctx.signIn({})).rejects.toThrow('Invalid email or password')
    })
    expect(localStorage.getItem('token')).toBeNull()
    expect(screen.getByTestId('who')).toHaveTextContent('anonymous')
  })

  it('signUp stores token + user', async () => {
    register.mockResolvedValue(ok({ token: 'jwt2', firstName: 'Bob' }))
    mount()
    await act(async () => { await ctx.signUp({}) })
    expect(localStorage.getItem('token')).toBe('jwt2')
    expect(screen.getByTestId('who')).toHaveTextContent('Bob')
  })

  it('signOut clears storage and state', async () => {
    localStorage.setItem('token', 't')
    localStorage.setItem('user', JSON.stringify({ firstName: 'Jane' }))
    mount()
    act(() => ctx.signOut())
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(screen.getByTestId('who')).toHaveTextContent('anonymous')
  })
})
