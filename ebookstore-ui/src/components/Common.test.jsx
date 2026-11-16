import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StarRating, Alert, Pagination, Spinner } from './Common'

describe('StarRating', () => {
  it('renders full, half and empty stars for 4.5', () => {
    const { container } = render(<StarRating rating={4.5} />)
    expect(container.querySelector('.stars').textContent).toBe('★★★★½')
  })

  it('renders 5 empty stars when rating is 0 (default)', () => {
    const { container } = render(<StarRating />)
    expect(container.querySelector('.stars').textContent).toBe('☆☆☆☆☆')
  })

  it('renders 5 full stars for rating 5', () => {
    const { container } = render(<StarRating rating={5} />)
    expect(container.querySelector('.stars').textContent).toBe('★★★★★')
  })

  it('rounds down below .5 (4.4 -> 4 full + 1 empty)', () => {
    const { container } = render(<StarRating rating={4.4} />)
    expect(container.querySelector('.stars').textContent).toBe('★★★★☆')
  })

  it('shows review count when provided, including 0', () => {
    render(<StarRating rating={3} count={0} />)
    expect(screen.getByText('(0)')).toBeInTheDocument()
  })

  it('exposes the rating in the title tooltip', () => {
    const { container } = render(<StarRating rating={4.7} />)
    expect(container.querySelector('.stars')).toHaveAttribute('title', '4.7 out of 5')
  })
})

describe('Alert', () => {
  it('defaults to the error style', () => {
    render(<Alert>Boom</Alert>)
    expect(screen.getByText('Boom')).toHaveClass('alert', 'alert-error')
  })

  it('supports a custom type', () => {
    render(<Alert type="success">Yay</Alert>)
    expect(screen.getByText('Yay')).toHaveClass('alert-success')
  })
})

describe('Spinner', () => {
  it('renders the spinner element', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('.spinner')).toBeInTheDocument()
  })
})

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={0} totalPages={1} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('disables Prev on the first page and Next on the last page', () => {
    const { rerender } = render(<Pagination page={0} totalPages={3} onChange={() => {}} />)
    expect(screen.getByText('‹')).toBeDisabled()
    expect(screen.getByText('›')).toBeEnabled()
    rerender(<Pagination page={2} totalPages={3} onChange={() => {}} />)
    expect(screen.getByText('‹')).toBeEnabled()
    expect(screen.getByText('›')).toBeDisabled()
  })

  it('marks the current page active and reports clicks (0-based)', async () => {
    const onChange = vi.fn()
    render(<Pagination page={1} totalPages={3} onChange={onChange} />)
    expect(screen.getByText('2')).toHaveClass('active')
    await userEvent.click(screen.getByText('3'))
    expect(onChange).toHaveBeenCalledWith(2)
    await userEvent.click(screen.getByText('‹'))
    expect(onChange).toHaveBeenCalledWith(0)
    await userEvent.click(screen.getByText('›'))
    expect(onChange).toHaveBeenCalledWith(2)
  })
})
