import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'

/** Build an axios-like success response wrapping the backend ApiResponse envelope. */
export const ok = (data) => ({ data: { success: true, message: 'ok', data } })

/** Build an axios-like error (as thrown by axios for HTTP errors). */
export const fail = (message, status = 400) => {
  const err = new Error(message)
  err.response = { status, data: { success: false, message } }
  return err
}

export const page = (content, extra = {}) => ({
  content, totalPages: 1, totalElements: content.length, ...extra,
})

export const sampleUser = { email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', role: 'CUSTOMER' }

export const sampleProduct = (over = {}) => ({
  id: 1, title: 'Clean Code', author: 'Robert C. Martin', brand: 'Prentice Hall',
  categoryName: 'Technology', price: 34.99, stockQuantity: 50, rating: 4.7, reviewCount: 10,
  tentativeDeliveryDate: '2030-01-15', ...over,
})

/** Render with router + AuthProvider. Pass `loggedIn: true` to seed localStorage with a user. */
export function renderWithProviders(ui, { route = '/', loggedIn = false } = {}) {
  if (loggedIn) {
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('user', JSON.stringify(sampleUser))
  }
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  )
}
