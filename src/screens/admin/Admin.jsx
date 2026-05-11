import { useState, useEffect, useRef } from 'react'
import { sb } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import Modal from '../../components/Modal'
import { hashPassword } from '../../lib/crypto'
import { ALL_MODULES_META } from '../../components/DashboardIconPicker'

const MODULE_IMAGE_DEFS = [
  { key: 'supply',       settingsKey: 'img_supply',       label: 'Supply Inventory',    icon: '📦' },
  { key: 'projects',     settingsKey: 'img_projects',     label: 'Project & Material',  icon: '🧪' },
  { key: 'training',     settingsKey: 'img_training',     label: 'Training Records',    icon: '🎓' },
  { key: 'equipment',    settingsKey: 'img_equipment',    label: 'Equipment Inventory', icon: '🔧' },
  { key: 'equipmenthub', settingsKey: 'img_equipmenthub', label: 'Equipment Hub',       icon: '📚' },
  { key: 'booking',      settingsKey: 'img_booking',      label: 'Booking Equipment',   icon: '📅' },
  { key: 'remessages',   settingsKey: 'img_remessages',   label: 'RE Messages',         icon: '💬' },
  { key: 'pm',           settingsKey: 'img_pm',           label: 'Project Management',  icon: '📋' },
  { key: 'mileage',      settingsKey: 'img_mileage',      label: 'Mileage Form',        icon: '🚗' },
  { key: 'labsafety',    settingsKey: 'img_labsafety',    label: 'Lab Safety',          icon: '🦺' },
]

function ModuleImagesPanel() {
  const { toast } = useAppStore()
  const [images, setImages] = useState({})
  const [uploading, setUploading] = useState(null)
  const fileRefs = useRef({})

  useEffect(() => { loadImages() }, [])

  async function loadImages() {
    const keys = MODULE_IMAGE_DEFS.map(m => m.settingsKey)
    const { data } = await sb.from('settings').select('key, value').in('key', keys)
    const map = {}
    ;(data || []).forEach(r => { map[r.key] = r.value })
    setImages(map)
  }

  async function handleUpload(def, file) {
    if (!file) return
    setUploading(def.key)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `module-images/${def.key}-${Date.now()}.${ext}`
      const { error: upErr } = await sb.storage.from('project-files').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { toast('Upload failed: ' + upErr.message); return }
      const { data: urlData } = sb.storage.from('project-files').getPublicUrl(path)
      const url = urlData.publicUrl
      await sb.from('settings').upsert({ key: def.settingsKey, value: url }, { onConflict: 'key' })
      setImages(prev => ({ ...prev, [def.settingsKey]: url }))
      toast(`${def.label} image updated. Reload dashboard to see it.`)
    } finally {
      setUploading(null)
      if (fileRefs.current[def.key]) fileRefs.current[def.key].value = ''
    }
  }

  async function clearImage(def) {
    await sb.from('settings').delete().eq('key', def.settingsKey)
    setImages(prev => { const n = { ...prev }; delete n[def.settingsKey]; return n })
    toast(`${def.label} image removed.`)
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 18, lineHeight: 1.6 }}>
        Upload background images for dashboard module cards. Best size: landscape, around 800×500 px. Changes apply after refreshing the dashboard.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
        {MODULE_IMAGE_DEFS.map(def => {
          const currentUrl = images[def.settingsKey]
          const isUploading = uploading === def.key
          return (
            <div key={def.key} style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--surface)' }}>
              <div style={{ height: 118, position: 'relative', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {currentUrl
                  ? <img src={currentUrl} alt={def.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none' }} />
                  : <div style={{ fontSize: 34, opacity: 0.35 }}>{def.icon}</div>
                }
                {currentUrl && (
                  <button onClick={() => clearImage(def)}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', borderRadius: 6, fontSize: 11, padding: '3px 8px', cursor: 'pointer', fontWeight: 500 }}>
                    ✕ Remove
                  </button>
                )}
                {isUploading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" />
                  </div>
                )}
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{def.label}</div>
                <button className="btn btn-sm btn-primary" disabled={isUploading} onClick={() => fileRefs.current[def.key]?.click()}>
                  {currentUrl ? 'Replace' : 'Upload'}
                </button>
                <input type="file" accept="image/*" ref={el => fileRefs.current[def.key] = el} style={{ display: 'none' }}
                  onChange={e => { handleUpload(def, e.target.files[0]) }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Super admin: session.userId === null (logged in via /admin password)
// Org admin:   session.userId !== null && session.role === 'admin'

// ── User modal ────────────────────────────────────────────────
function UserModal({ user, orgs, defaultOrgId, isSuperAdmin, onClose, onSaved }) {
  const { toast } = useAppStore()
  const [name, setName]         = useState(user?.name || '')
  const [email, setEmail]       = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState(user?.role || 'user')
  const [orgId, setOrgId]       = useState(user?.organization_id || defaultOrgId || '')
  const [copied, setCopied]     = useState(false)
  const [savedCreds, setSavedCreds] = useState(null)

  async function save() {
    if (!name.trim())    { toast('Please enter a name.'); return }
    if (!orgId)          { toast('Please select an organization.'); return }
    if (!user && !password.trim()) { toast('Please set a temporary password.'); return }
    if (password && password.length < 4) { toast('Password must be at least 4 characters.'); return }
    if (!user && !email.trim()) { toast('Please enter an email address.'); return }

    if (user) {
      const upd = { name: name.trim(), email: email.trim().toLowerCase() || null, role, organization_id: orgId, is_active: true }
      if (password) { upd.password = await hashPassword(password); upd.must_change_password = true }
      const { error } = await sb.from('users').update(upd).eq('id', user.id)
      if (error) { toast('Error updating user: ' + error.message); return }
      toast('User updated.')
      onSaved()
      onClose()
    } else {
      const hashed = await hashPassword(password)
      const { error } = await sb.from('users').insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
        role,
        organization_id: orgId,
        is_active: true,
        must_change_password: true,
      })
      if (error) { toast('Error creating user: ' + error.message); return }
      // Show credentials to copy before closing
      setSavedCreds({ name: name.trim(), email: email.trim().toLowerCase(), password })
      onSaved()
    }
  }

  function copyCredentials() {
    const orgName = orgs.find(o => o.id === orgId)?.name || ''
    const text = `iLab Login Credentials\nOrganization: ${orgName}\nEmail: ${savedCreds.email}\nPassword: ${savedCreds.password}\n\nPlease log in and change your password on first sign-in.`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (savedCreds) return (
    <Modal onClose={onClose}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>User created</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Copy these credentials and send to the user</div>
      </div>
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontFamily: 'var(--mono)', fontSize: 13 }}>
        <div><strong>Email:</strong> {savedCreds.email}</div>
        <div style={{ marginTop: 6 }}><strong>Password:</strong> {savedCreds.password}</div>
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>User will be forced to change password on first login.</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={copyCredentials}>
          {copied ? '✓ Copied!' : '📋 Copy credentials'}
        </button>
        <button className="btn" onClick={onClose}>Done</button>
      </div>
    </Modal>
  )

  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>{user ? 'Edit user' : 'Add new user'}</div>

      <div className="field"><label>Full name *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dr. Smith" autoFocus />
      </div>
      <div className="field"><label>Email * (used to sign in)</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com"
          readOnly={!!user} style={user ? { background: 'var(--surface2)', color: 'var(--text3)' } : {}} />
        {user && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Email cannot be changed after account creation.</div>}
      </div>
      <div className="field">
        <label>{user ? 'Reset password (leave blank to keep current)' : 'Temporary password *'}</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={user ? '••••••••' : 'Set a temporary password'} />
        {!user && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>User will be forced to change this on first login.</div>}
      </div>

      <div className="grid-2">
        <div className="field"><label>Role</label>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="user">Lab Manager</option>
            <option value="admin">Org Admin</option>
            <option value="student">Lab User</option>
          </select>
        </div>
        {isSuperAdmin && (
          <div className="field"><label>Organization *</label>
            <select value={orgId} onChange={e => setOrgId(e.target.value)}>
              <option value="">— Select org —</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={save}>
          {user ? 'Save changes' : 'Create user'}
        </button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

// ── Org modal (super admin only) ──────────────────────────────
function OrgModal({ org, onClose, onSaved }) {
  const { toast } = useAppStore()
  const [name, setName] = useState(org?.name || '')
  const [slug, setSlug] = useState(org?.slug || '')

  function autoSlug(n) { return n.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }

  async function save() {
    if (!name.trim()) { toast('Please enter an organization name.'); return }
    const s = slug.trim() || autoSlug(name)
    if (!s) { toast('Please enter a slug.'); return }
    if (org) {
      const { error } = await sb.from('organizations').update({ name: name.trim(), slug: s }).eq('id', org.id)
      if (error) { toast('Error: ' + error.message); return }
    } else {
      const { error } = await sb.from('organizations').insert({ name: name.trim(), slug: s })
      if (error) { toast('Error: ' + error.message); return }
    }
    toast('Organization saved.')
    onSaved()
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>{org ? 'Edit organization' : 'New organization'}</div>
      <div className="field"><label>Organization name *</label>
        <input value={name} onChange={e => { setName(e.target.value); if (!org) setSlug(autoSlug(e.target.value)) }} placeholder="e.g. ICT Lab" autoFocus />
      </div>
      <div className="field"><label>Slug (URL-safe identifier)</label>
        <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="e.g. ict-lab" />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={save}>{org ? 'Save' : 'Create organization'}</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

// ── Screen access modal ───────────────────────────────────────
// Derived from dashboard module list — team only, no external links, no profile
const ALL_SCREENS = ALL_MODULES_META
  .filter(m => m.roles.includes('team') && m.screen && !m.external && m.key !== 'profile')
  .map(m => ({ key: m.screen, label: m.label, icon: m.icon }))

function AccessModal({ user, onClose, onSaved }) {
  const { toast } = useAppStore()
  const [granted, setGranted] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sb.from('user_screen_access').select('screen_key').eq('user_id', user.id)
      .then(({ data }) => {
        setGranted(new Set((data || []).map(r => r.screen_key)))
        setLoading(false)
      })
  }, [user.id])

  function toggle(key) {
    setGranted(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function save() {
    await sb.from('user_screen_access').delete().eq('user_id', user.id)
    if (granted.size > 0) {
      const rows = [...granted].map(key => ({ user_id: user.id, screen_key: key, organization_id: user.organization_id || null }))
      await sb.from('user_screen_access').insert(rows)
    }
    toast('Access saved.')
    onSaved()
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Screen access — {user.name}</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Dashboard, Profile, PM, and Barcode are always available.</div>
      {loading ? <div className="spinner" style={{ margin: '20px auto' }} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {ALL_SCREENS.map(s => (
            <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${granted.has(s.key) ? 'var(--accent)' : 'var(--border)'}`, background: granted.has(s.key) ? 'var(--accent-light)' : 'var(--surface)' }}>
              <input type="checkbox" checked={granted.has(s.key)} onChange={() => toggle(s.key)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 18, lineHeight: 1 }}>{s.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</span>
            </label>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={save}>Save access</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN ADMIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function Admin() {
  const { session, toast } = useAppStore()
  const isSuperAdmin = !session?.userId   // logged in via /admin password
  const myOrgId = session?.organizationId || null

  const [tab, setTab]         = useState('users')
  const [users, setUsers]     = useState([])
  const [orgs, setOrgs]       = useState([])
  const [orgCounts, setOrgCounts] = useState({})
  const [search, setSearch]   = useState('')
  const [orgFilter, setOrgFilter] = useState(isSuperAdmin ? '' : myOrgId)
  const [loading, setLoading] = useState(false)

  const [userModal, setUserModal]     = useState(null)
  const [orgModal, setOrgModal]       = useState(null)
  const [accessModal, setAccessModal] = useState(null)

  const tabs = [
    { key: 'users', label: 'Users' },
    { key: 'students', label: 'Lab Users' },
    ...(isSuperAdmin ? [{ key: 'organizations', label: 'Organizations' }] : [{ key: 'images', label: 'Module Images' }]),
  ]

  useEffect(() => { loadOrgs() }, [])
  useEffect(() => { if (tab === 'users' || tab === 'students') loadUsers() }, [tab, orgFilter])

  async function loadOrgs() {
    const [{ data: orgData }, { data: countData }] = await Promise.all([
      sb.from('organizations').select('*').order('name'),
      sb.from('users').select('organization_id').not('organization_id', 'is', null),
    ])
    setOrgs(orgData || [])
    const counts = {}
    ;(countData || []).forEach(u => { counts[u.organization_id] = (counts[u.organization_id] || 0) + 1 })
    setOrgCounts(counts)
  }

  async function loadUsers() {
    setLoading(true)
    const roleFilter = tab === 'students' ? 'student' : ['user', 'admin']
    let q = sb.from('users').select('*').order('name')
    if (tab === 'students') q = q.eq('role', 'student')
    else q = q.in('role', ['user', 'admin'])

    if (!isSuperAdmin) {
      q = q.eq('organization_id', myOrgId)
    } else if (orgFilter) {
      q = q.eq('organization_id', orgFilter)
    }

    const { data } = await q
    setUsers(data || [])
    setLoading(false)
  }

  async function deactivateUser(u) {
    await sb.from('users').update({ is_active: !u.is_active }).eq('id', u.id)
    loadUsers()
    toast(u.is_active ? 'User deactivated.' : 'User activated.')
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user permanently?')) return
    await sb.from('users').delete().eq('id', id)
    loadUsers()
    toast('User deleted.')
  }

  async function deleteOrg(id) {
    if (!confirm('Delete this organization? All linked users will lose their org assignment.')) return
    await sb.from('organizations').delete().eq('id', id)
    loadOrgs(); loadUsers()
    toast('Organization deleted.')
  }

  const orgName = (id) => orgs.find(o => o.id === id)?.name || '—'

  const filteredUsers = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 2 }}>
            {isSuperAdmin ? 'Super Admin Panel' : 'Organization Admin Panel'}
          </div>
          {!isSuperAdmin && myOrgId && (
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Managing: {orgName(myOrgId)}</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === t.key ? 'var(--accent)' : 'var(--surface2)', color: tab === t.key ? '#fff' : 'var(--text2)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── USERS / STUDENTS ── */}
      {(tab === 'users' || tab === 'students') && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" style={{ flex: 1, minWidth: 180 }} />
            {isSuperAdmin && (
              <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
                <option value="">All organizations</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setUserModal('add')}>
              + Add {tab === 'students' ? 'lab user' : 'lab manager'}
            </button>
          </div>

          {loading ? (
            <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">👤</div>No users found.</div>
          ) : (
            filteredUsers.map(u => (
              <div key={u.id} className="card" style={{ padding: '12px 18px', marginBottom: 10, opacity: u.is_active ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: u.role === 'admin' ? '#FEF3C7' : u.role === 'student' ? '#EDE9FE' : '#E1F5EE', color: u.role === 'admin' ? '#92400E' : u.role === 'student' ? '#5B21B6' : '#065F46', fontWeight: 600 }}>
                        {u.role === 'admin' ? 'Org Admin' : u.role === 'student' ? 'Lab User' : 'Lab Manager'}
                      </span>
                      {!u.is_active && <span style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 500 }}>Inactive</span>}
                      {u.must_change_password && <span style={{ fontSize: 11, color: '#D97706', fontWeight: 500 }}>⚠ Temp password</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {u.email && <span>{u.email}</span>}
                      {isSuperAdmin && u.organization_id && <span>· {orgName(u.organization_id)}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {tab === 'users' && (
                      <button className="btn btn-sm" onClick={() => setAccessModal(u)}>Access</button>
                    )}
                    <button className="btn btn-sm" onClick={() => setUserModal(u)}>Edit</button>
                    <button className="btn btn-sm" onClick={() => deactivateUser(u)}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── MODULE IMAGES (org admin only) ── */}
      {tab === 'images' && !isSuperAdmin && <ModuleImagesPanel />}

      {/* ── ORGANIZATIONS (super admin only) ── */}
      {tab === 'organizations' && isSuperAdmin && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setOrgModal('add')}>+ New organization</button>
          </div>
          {orgs.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🏢</div>No organizations yet.</div>
          ) : orgs.map(o => {
            const count = orgCounts[o.id] || 0
            return (
              <div key={o.id} className="card" style={{ padding: '14px 18px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{o.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                      {o.slug} · {count} user{count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm" onClick={() => setOrgModal(o)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteOrg(o.id)}>Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODALS ── */}
      {userModal && (
        <UserModal
          user={userModal === 'add' ? null : userModal}
          orgs={orgs}
          defaultOrgId={isSuperAdmin ? orgFilter : myOrgId}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setUserModal(null)}
          onSaved={loadUsers}
        />
      )}
      {orgModal && (
        <OrgModal
          org={orgModal === 'add' ? null : orgModal}
          onClose={() => setOrgModal(null)}
          onSaved={loadOrgs}
        />
      )}
      {accessModal && (
        <AccessModal
          user={accessModal}
          onClose={() => setAccessModal(null)}
          onSaved={loadUsers}
        />
      )}
    </div>
  )
}
