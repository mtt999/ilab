import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { sb } from '../../lib/supabase'

export default function AdminLogin() {
  const { setSession } = useAppStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!password.trim()) { setError('Enter the admin password.'); return }
    setLoading(true); setError('')
    const { data: adminPass } = await sb.from('settings').select('value').eq('key', 'admin_password').maybeSingle()
    if (password === (adminPass?.value || 'Motlagh@2026')) {
      setSession({ role: 'admin', username: 'Admin', userId: null, adminLevel: 3, loginMode: 'team' })
    } else {
      setError('Incorrect password.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>Admin Access</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>InteleLab — Restricted area</div>
        </div>
        <div className="card" style={{ padding: '28px 28px 24px' }}>
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Admin password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoFocus
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text3)', padding: 4 }}>
                  {show ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {error && (
              <div style={{ fontSize: 13, color: 'var(--accent2)', background: 'var(--accent2-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>⚠️ {error}</div>
            )}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px', background: loading ? 'var(--border)' : '#1a237e', color: loading ? 'var(--text3)' : '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Verifying…' : 'Sign in as Admin'}
            </button>
          </form>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text3)' }}>
          <a href="../" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Back to iLab</a>
        </div>
      </div>
    </div>
  )
}
