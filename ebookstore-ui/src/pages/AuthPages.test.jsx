import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import { login, register } from '../api/services'
import { renderWithProviders, ok, fail } from '../test/utils'

vi.mock('../api/services', () => ({ login: vi.fn(), register: vi.fn() }))

const withRoutes = (el, path) => (
  <Routes>
    <Route path={path} element={el} />
    <Route path="/" element={<div>HOME PAGE</div>} />
  </Routes>
)

describe('LoginPage', () => {
  const setup = () => renderWithProviders(withRoutes(<LoginPage />, '/login'), { route: '/login' })

  it('renders the form and a link to register', () => {
    setup()
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled()
    expect(screen.getByRole('link', { name: /register free/i })).toHaveAttribute('href', '/register')
  })

  it('marks both fields as required, email as type=email', () => {
    const { container } = setup()
    const email = container.querySelector('input[name="email"]')
    const pwd = container.querySelector('input[name="password"]')
    expect(email).toBeRequired(); expect(email).toHaveAttribute('type', 'email')
    expect(pwd).toBeRequired(); expect(pwd).toHaveAttribute('type', 'password')
  })

  it('submits credentials, stores the session and redirects home', async () => {
    login.mockResolvedValue(ok({ token: 'jwt', email: 'a@b.com', firstName: 'Ann', role: 'CUSTOMER' }))
    const { container } = setup()
    await userEvent.type(container.querySelector('input[name="email"]'), 'a@b.com')
    await userEvent.type(container.querySelector('input[name="password"]'), 'secret1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    await screen.findByText('HOME PAGE')
    expect(login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret1' })
    expect(localStorage.getItem('token')).toBe('jwt')
  })

  it('shows the server error message on failure and stays on the page', async () => {
    login.mockRejectedValue(fail('Invalid email or password', 401))
    const { container } = setup()
    await userEvent.type(container.querySelector('input[name="email"]'), 'a@b.com')
    await userEvent.type(container.querySelector('input[name="password"]'), 'bad')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(await screen.findByText('Invalid email or password')).toHaveClass('alert-error')
    expect(screen.queryByText('HOME PAGE')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled()
  })

  it('falls back to a generic message when the server gives none (network error)', async () => {
    login.mockRejectedValue(new Error('Network Error'))
    const { container } = setup()
    await userEvent.type(container.querySelector('input[name="email"]'), 'a@b.com')
    await userEvent.type(container.querySelector('input[name="password"]'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
  })

  it('disables the button and shows progress while the request is pending', async () => {
    let resolve
    login.mockReturnValue(new Promise(r => { resolve = r }))
    const { container } = setup()
    await userEvent.type(container.querySelector('input[name="email"]'), 'a@b.com')
    await userEvent.type(container.querySelector('input[name="password"]'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(await screen.findByRole('button', { name: /signing in/i })).toBeDisabled()
    resolve(ok({ token: 't', firstName: 'A' }))
    await screen.findByText('HOME PAGE')
  })
})

describe('RegisterPage', () => {
  const setup = () => renderWithProviders(withRoutes(<RegisterPage />, '/register'), { route: '/register' })

  it('renders all four fields; password requires at least 6 characters', () => {
    const { container } = setup()
    for (const n of ['firstName', 'lastName', 'email', 'password']) {
      expect(container.querySelector(`input[name="${n}"]`)).toBeRequired()
    }
    expect(container.querySelector('input[name="password"]')).toHaveAttribute('minlength', '6')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  it('registers a new user and redirects home', async () => {
    register.mockResolvedValue(ok({ token: 'jwt', firstName: 'New', role: 'CUSTOMER' }))
    const { container } = setup()
    await userEvent.type(container.querySelector('input[name="firstName"]'), 'New')
    await userEvent.type(container.querySelector('input[name="lastName"]'), 'User')
    await userEvent.type(container.querySelector('input[name="email"]'), 'new@user.com')
    await userEvent.type(container.querySelector('input[name="password"]'), 'abcdef')
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }))
    await screen.findByText('HOME PAGE')
    expect(register).toHaveBeenCalledWith({ firstName: 'New', lastName: 'User', email: 'new@user.com', password: 'abcdef' })
    expect(localStorage.getItem('token')).toBe('jwt')
  })

  it('shows the duplicate-email error from the server', async () => {
    register.mockRejectedValue(fail('Email already in use: dup@x.com'))
    const { container } = setup()
    await userEvent.type(container.querySelector('input[name="firstName"]'), 'A')
    await userEvent.type(container.querySelector('input[name="lastName"]'), 'B')
    await userEvent.type(container.querySelector('input[name="email"]'), 'dup@x.com')
    await userEvent.type(container.querySelector('input[name="password"]'), 'abcdef')
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }))
    expect(await screen.findByText('Email already in use: dup@x.com')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create Account' })).toBeEnabled())
  })
})
