import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Alert } from '../components/Common'
import './AuthPages.css'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]     = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(form)
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(msg || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page page">
      <div className="auth-card card">
        <div className="auth-header">
          <div className="auth-logo">📚</div>
          <h2>Create Account</h2>
          <p>Join BookHaven and start earning gift points</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <div className="auth-name-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" type="text" name="firstName"
                value={form.firstName} onChange={handleChange} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" type="text" name="lastName"
                value={form.lastName} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" type="email" name="email"
              value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" name="password"
              value={form.password} onChange={handleChange} required minLength={6} />
          </div>
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
