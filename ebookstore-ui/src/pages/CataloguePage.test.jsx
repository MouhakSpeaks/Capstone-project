import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route, useLocation } from 'react-router-dom'
import CataloguePage from './CataloguePage'
import { getCategories, getProducts, getProductsByCategory, searchProducts } from '../api/services'
import { renderWithProviders, ok, page, sampleProduct } from '../test/utils'

vi.mock('../api/services', () => ({
  getCategories: vi.fn(), getProducts: vi.fn(), getProductsByCategory: vi.fn(), searchProducts: vi.fn(), addToCart: vi.fn(),
}))

const cats = [{ id: 1, name: 'Technology' }, { id: 2, name: 'Fiction' }]
function Loc() { const l = useLocation(); return <div data-testid="loc">{l.search}</div> }
const setup = (route = '/catalogue') => renderWithProviders(
  <><Routes><Route path="/catalogue" element={<CataloguePage />} /></Routes><Loc /></>, { route })

describe('CataloguePage', () => {
  beforeEach(() => {
    getCategories.mockResolvedValue(ok(cats))
    getProducts.mockResolvedValue(ok(page([sampleProduct({ id: 1 }), sampleProduct({ id: 2, title: '1984' })])))
  })

  it('loads all books by default and lists the categories', async () => {
    setup()
    expect(await screen.findByText('1984')).toBeInTheDocument()
    expect(getProducts).toHaveBeenCalledWith(0, 20, 'createdAt')
    expect(screen.getByRole('button', { name: 'All Books' })).toHaveClass('active')
    expect(screen.getByRole('button', { name: 'Technology' })).toBeInTheDocument()
    expect(screen.getByText('2 books shown')).toBeInTheDocument()
  })

  it('searches when ?search= is present and shows the keyword in the breadcrumb', async () => {
    searchProducts.mockResolvedValue(ok(page([sampleProduct()])))
    setup('/catalogue?search=clean')
    expect(await screen.findByText('Clean Code')).toBeInTheDocument()
    expect(searchProducts).toHaveBeenCalledWith('clean', 0, 20)
    expect(getProducts).not.toHaveBeenCalled()
    expect(screen.getByText('clean', { selector: 'strong' })).toBeInTheDocument()
  })

  it('filters by category when ?categoryId= is present', async () => {
    getProductsByCategory.mockResolvedValue(ok(page([sampleProduct()])))
    setup('/catalogue?categoryId=2')
    await screen.findByText('Clean Code')
    expect(getProductsByCategory).toHaveBeenCalledWith('2', 0, 20)
    expect(screen.getByRole('button', { name: 'Fiction' })).toHaveClass('active')
    expect(screen.getByText('Fiction', { selector: 'strong' })).toBeInTheDocument()
  })

  it('clicking a category updates the URL and reloads products', async () => {
    getProductsByCategory.mockResolvedValue(ok(page([sampleProduct({ title: 'Only Tech' })])))
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Technology' }))
    expect(await screen.findByText('Only Tech')).toBeInTheDocument()
    expect(screen.getByTestId('loc')).toHaveTextContent('?categoryId=1')
  })

  it('Clear resets filters back to all books', async () => {
    searchProducts.mockResolvedValue(ok(page([sampleProduct({ title: 'Found' })])))
    setup('/catalogue?search=x')
    await userEvent.click(await screen.findByRole('button', { name: '✕ Clear' }))
    expect(await screen.findByText('1984')).toBeInTheDocument()
    expect(screen.getByTestId('loc')).toHaveTextContent(/^$/)
  })

  it('shows the no-results message for a search with no matches', async () => {
    searchProducts.mockResolvedValue(ok(page([])))
    setup('/catalogue?search=zzz')
    expect(await screen.findByText('No books found for "zzz"')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse All' })).toHaveAttribute('href', '/catalogue')
  })

  it('shows the empty-category message when nothing is listed', async () => {
    getProducts.mockResolvedValue(ok(page([])))
    setup()
    expect(await screen.findByText('No books in this category yet.')).toBeInTheDocument()
  })

  // KNOWN DEFECT (UI-01): setParam() always runs `delete p.page` after setting it, so the `page`
  // query param can never be written and pagination does nothing. `it.fails` passes while the bug
  // exists and turns red once it is fixed (then change it back to a plain `it`).
  it.fails('[UI-01] paginates: Next updates the URL and loads the next page', async () => {
    getProducts.mockResolvedValue(ok(page([sampleProduct()], { totalPages: 3 })))
    setup()
    await screen.findByText('Clean Code')
    await userEvent.click(screen.getByText('›'))
    expect(screen.getByTestId('loc')).toHaveTextContent('?page=1')
    expect(getProducts).toHaveBeenLastCalledWith(1, 20, 'createdAt')
  })
})
