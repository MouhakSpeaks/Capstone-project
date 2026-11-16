export function Spinner() {
  return (
    <div className="spinner-overlay">
      <div className="spinner" />
    </div>
  )
}

export function StarRating({ rating = 0, count }) {
  const full  = Math.floor(rating)
  const half  = rating - full >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  return (
    <span className="stars" title={`${rating} out of 5`}>
      {'★'.repeat(full)}{'½'.repeat(half)}{'☆'.repeat(empty)}
      {count !== undefined && <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 4 }}>({count})</span>}
    </span>
  )
}

export function Alert({ type = 'error', children }) {
  return <div className={`alert alert-${type}`}>{children}</div>
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="pagination">
      <button disabled={page === 0} onClick={() => onChange(page - 1)}>‹</button>
      {Array.from({ length: totalPages }, (_, i) => (
        <button key={i} className={i === page ? 'active' : ''} onClick={() => onChange(i)}>{i + 1}</button>
      ))}
      <button disabled={page === totalPages - 1} onClick={() => onChange(page + 1)}>›</button>
    </div>
  )
}
