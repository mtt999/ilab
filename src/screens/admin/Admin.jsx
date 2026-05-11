import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { sb } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import Modal from '../../components/Modal'
import { hashPassword } from '../../lib/crypto'

// ── Icon picker ──────────────────────────────────────────────
const ICONS = ['🧪','🔬','📦','🏥','🧬','💊','🩺','🧫','⚗️','🔭','🩻','🧰']

function IconPicker({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
      {ICONS.map(ic => (
        <button key={ic} type="button" onClick={() => onSelect(ic)}
          style={{ fontSize: 22, padding: 6, border: `2px solid ${ic === selected ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, background: 'var(--surface)', cursor: 'pointer' }}>
          {ic}
        </button>
      ))}
    </div>
  )
}

// ── Room modal ────────────────────────────────────────────────
function RoomModal({ room, onClose, onSaved }) {
  const { toast } = useAppStore()
  const [name, setName] = useState(room?.name || '')
  const [icon, setIcon] = useState(room?.icon || '🧪')

  async function save() {
    if (!name.trim()) { toast('Please enter a room name.'); return }
    if (room) await sb.from('rooms').update({ name, icon }).eq('id', room.id)
    else await sb.from('rooms').insert({ name, icon })
    toast('Room saved.')
    onSaved()
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>{room ? 'Edit room' : 'Add room'}</div>
      <div className="field"><label>Room name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lab 201" /></div>
      <div className="field"><label>Icon</label><IconPicker selected={icon} onSelect={setIcon} /></div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={save}>{room ? 'Save' : 'Add room'}</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

// ── Supply modal ──────────────────────────────────────────────
function SupplyModal({ supply, rooms, defaultRoomId, onClose, onSaved }) {
  const { toast } = useAppStore()
  const [form, setForm] = useState({
    room_id: supply?.room_id || defaultRoomId || rooms[0]?.id || '',
    name: supply?.name || '',
    unit: supply?.unit || '',
    min_qty: supply?.min_qty || '',
    notes: supply?.notes || '',
    links: supply?.links || [],
  })

  function addLink() { setForm(f => ({ ...f, links: [...f.links, { label: '', url: '' }] })) }
  function removeLink(i) { setForm(f => ({ ...f, links: f.links.filter((_, idx) => idx !== i) })) }
  function updateLink(i, field, val) {
    setForm(f => { const links = [...f.links]; links[i] = { ...links[i], [field]: val }; return { ...f, links } })
  }

  async function save() {
    if (!form.name.trim() || !form.unit.trim()) { toast('Please fill all required fields.'); return }
    const payload = { ...form, min_qty: parseInt(form.min_qty) || 0, links: form.links.filter(l => l.url) }
    if (supply) await sb.from('supplies').update(payload).eq('id', supply.id)
    else await sb.from('supplies').insert(payload)
    toast('Supply saved.')
    onSaved()
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>{supply ? 'Edit supply' : 'Add supply'}</div>
      <div className="field"><label>Room</label>
        <select value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div className="field"><label>Supply name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Nitrile Gloves (M)" /></div>
      <div className="grid-2">
        <div className="field"><label>Unit *</label><input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="boxes" /></div>
        <div className="field"><label>Minimum qty</label><input type="number" value={form.min_qty} onChange={e => setForm(f => ({ ...f, min_qty: e.target.value }))} placeholder="3" /></div>
      </div>
      <div className="field"><label>Notes</label>
        <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Storage location, handling instructions…" style={{ resize: 'vertical' }} />
      </div>
      <div className="field">
        <label>Purchase links</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          {form.links.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input placeholder="Label (e.g. Amazon)" value={l.label} onChange={e => updateLink(i, 'label', e.target.value)} style={{ flex: 1 }} />
              <input placeholder="https://…" value={l.url} onChange={e => updateLink(i, 'url', e.target.value)} style={{ flex: 2 }} />
              <button onClick={() => removeLink(i)} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)', cursor: 'pointer', color: 'var(--accent2)', fontSize: 13 }}>✕</button>
            </div>
          ))}
        </div>
        <button className="btn btn-sm" type="button" onClick={addLink}>+ Add link</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={save}>Save</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

// ── User modal ────────────────────────────────────────────────
function UserModal({ user, onClose, onSaved }) {
  const { toast } = useAppStore()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')

  async function save() {
    if (!name.trim()) { toast('Please enter a name.'); return }
    if (!user && !password.trim()) { toast('Please set a password for the new user.'); return }
    if (password && password.length < 4) { toast('Password must be at least 4 characters.'); return }
    if (user) {
      const upd = { name, email: email.trim().toLowerCase() || null, is_active: true }
      if (password) upd.password = await hashPassword(password)
      const { error } = await sb.from('users').update(upd).eq('id', user.id)
      if (error) { toast('Error updating user: ' + error.message); return }
    } else {
      const hashed = await hashPassword(password)
      const { error } = await sb.from('users').insert({ name, email: email.trim().toLowerCase() || null, password: hashed, role: 'user', is_active: true })
      if (error) { toast('Error creating user: ' + error.message); return }
    }
    toast('User saved.')
    onSaved()
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>{user ? 'Edit lab user' : 'Add lab user'}</div>
      <div className="field"><label>Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dr. Smith" autoFocus /></div>
      <div className="field"><label>Email * (used to sign in)</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" /></div>
      <div className="field">
        <label>{user ? 'New password (leave blank to keep current)' : 'Password *'}</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={user ? '••••••••' : 'Set a password'} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={save}>Save</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

// ── Photo upload modal ────────────────────────────────────────
function PhotoModal({ title, onClose, onSaved, bucket = 'item-photos', pathPrefix = '' }) {
  const { toast } = useAppStore()
  const [blob, setBlob] = useState(null)
  const [preview, setPreview] = useState(null)
  const [size, setSize] = useState(null)
  const [uploading, setUploading] = useState(false)

  async function compress(file) {
    return new Promise(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const maxPx = 800, scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(url)
        canvas.toBlob(resolve, 'image/jpeg', 0.8)
      }
      img.src = url
    })
  }

  async function handleFile(file) {
    if (!file?.type.startsWith('image/')) { toast('Please use an image file.'); return }
    const compressed = await compress(file)
    setBlob(compressed)
    setPreview(URL.createObjectURL(compressed))
    setSize(Math.round(compressed.size / 1024))
  }

  async function upload() {
    if (!blob) { toast('Please select an image first.'); return }
    setUploading(true)
    try {
      const filename = `${pathPrefix}${Date.now()}.jpg`
      const { error } = await sb.storage.from(bucket).upload(filename, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data } = sb.storage.from(bucket).getPublicUrl(filename)
      onSaved(data.publicUrl)
      onClose()
      toast('Photo saved!')
    } catch (e) {
      toast('Upload failed: ' + (e?.message || String(e)))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Upload photo</div>
      <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>{title}</div>
      <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: 28, textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🖼️</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text2)', marginBottom: 4 }}>Drag & drop image here</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>or</div>
        <label style={{ display: 'inline-block', padding: '7px 16px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, background: 'var(--surface)' }}>
          Browse file
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        </label>
      </div>
      {preview && (
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <img src={preview} style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
          {size && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Size: {size} KB</div>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={upload} disabled={uploading}>{uploading ? 'Uploading…' : 'Save photo'}</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}

// ── Import helpers ────────────────────────────────────────────
const ROOM_KEYWORDS = ['room','lab','highbay','high bay','bay','shed','office','tool','storage','corridor','hall','area']
const DEFAULT_ROOM_NAME = 'Janitor Room'

function isRoomHeader(numVal, nameVal) {
  if (numVal !== null && numVal !== undefined && numVal !== '') return false
  if (!nameVal || typeof nameVal !== 'string') return false
  const n = nameVal.trim().toLowerCase()
  if (!n) return false
  const skip = ['item','no.','item name','min qty','safety box','safety items','front cabinet','air tanks','mixing station','autoextractor','auto extractor','storage area']
  if (skip.some(w => n === w || n.startsWith(w))) return false
  return ROOM_KEYWORDS.some(k => n.includes(k)) || (nameVal.trim() === nameVal.trim().toUpperCase() && nameVal.trim().split(/\s+/).length >= 2)
}

function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
        const rooms = {}; let currentRoom = null
        for (const row of rows) {
          const [numVal, nameVal, minVal, qtyVal] = row
          if (!nameVal || String(nameVal).trim() === '') continue
          const nameStr = String(nameVal).trim().toLowerCase()
          if (nameStr === 'item name' || nameStr === 'item') continue
          const numStr = String(numVal || '').trim().toLowerCase()
          if (numStr === 'no.' || numStr === 'no' || numStr === '#') continue
          if (isRoomHeader(numVal, nameVal)) { currentRoom = String(nameVal).trim(); if (!rooms[currentRoom]) rooms[currentRoom] = []; continue }
          const num = parseInt(numVal)
          if (!isNaN(num) && nameVal) {
            if (!currentRoom) { currentRoom = DEFAULT_ROOM_NAME; if (!rooms[currentRoom]) rooms[currentRoom] = [] }
            rooms[currentRoom].push({ name: String(nameVal).trim(), unit: 'pcs', min_qty: parseInt(minVal) || 1, qty: (qtyVal !== null && !isNaN(parseInt(qtyVal))) ? parseInt(qtyVal) : (parseInt(minVal) || 1) })
          }
        }
        resolve(rooms)
      } catch(err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsBinaryString(file)
  })
}

// ══════════════════════════════════════════════════════════════
// MAIN ADMIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function Admin() {
  const { rooms, supplies, settings, refreshCache, toast } = useAppStore()
  const [tab, setTab] = useState('rooms')
  const [users, setUsers] = useState([])

  // Modals
  const [roomModal, setRoomModal] = useState(null)       // null | 'add' | room obj
  const [supplyModal, setSupplyModal] = useState(null)   // null | 'add' | supply obj
  const [userModal, setUserModal] = useState(null)       // null | 'add' | user obj
  const [photoModal, setPhotoModal] = useState(null)     // null | { title, onSaved }
  const [roomFilter, setRoomFilter] = useState('')

  // Import
  const [importData, setImportData] = useState(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => { if (tab === 'users') loadUsers() }, [tab])

  async function loadUsers() {
    const { data } = await sb.from('users').select('*').order('name')
    setUsers(data || [])
  }

  async function deleteRoom(id) {
    if (!confirm('Delete this room and all its supplies?')) return
    await sb.from('rooms').delete().eq('id', id)
    await refreshCache(); toast('Room deleted.')
  }

  async function deleteSupply(id) {
    if (!confirm('Delete this supply?')) return
    await sb.from('supplies').delete().eq('id', id)
    await refreshCache(); toast('Supply deleted.')
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user?')) return
    await sb.from('users').delete().eq('id', id)
    loadUsers(); toast('User deleted.')
  }

  async function saveDueDay(val) {
    await sb.from('settings').upsert({ key: 'due_day', value: val })
    await refreshCache(); toast('Reminder day saved.')
  }

  async function saveAdminPin() {
    const val = document.getElementById('new-admin-pin').value
    if (!/^\d{4}$/.test(val)) { toast('PIN must be exactly 4 digits.'); return }
    await sb.from('settings').upsert({ key: 'admin_pin', value: val })
    await refreshCache()
    document.getElementById('new-admin-pin').value = ''
    toast('Admin PIN updated.')
  }

  async function previewImport(file) {
    try {
      const rooms = await parseExcelFile(file)
      setImportData(rooms)
    } catch (e) {
      toast('Error reading file. Make sure it is a valid .xlsx file.')
    }
  }

  async function confirmImport() {
    if (!importData) return
    setImporting(true)
    try {
      const { data: existingRooms } = await sb.from('rooms').select('*')
      const { data: existingSupplies } = await sb.from('supplies').select('*')
      const roomByName = {}
      ;(existingRooms || []).forEach(r => roomByName[r.name.toLowerCase()] = r)
      const supplyKey = (roomId, name) => `${roomId}::${name.toLowerCase()}`
      const supplyByKey = {}
      ;(existingSupplies || []).forEach(s => supplyByKey[supplyKey(s.room_id, s.name)] = s)
      const roomNames = Object.keys(importData)
      let added = 0, updated = 0
      for (let i = 0; i < roomNames.length; i++) {
        const name = roomNames[i]
        let roomId
        const existing = roomByName[name.toLowerCase()]
        if (existing) { roomId = existing.id }
        else {
          const { data: newRoom } = await sb.from('rooms').insert({ name, icon: ICONS[i % ICONS.length] }).select().single()
          if (!newRoom) continue
          roomId = newRoom.id
        }
        for (const s of importData[name]) {
          const key = supplyKey(roomId, s.name)
          if (supplyByKey[key]) { await sb.from('supplies').update({ min_qty: s.min_qty, qty: s.qty }).eq('id', supplyByKey[key].id); updated++ }
          else { await sb.from('supplies').insert({ room_id: roomId, name: s.name, unit: s.unit, min_qty: s.min_qty, qty: s.qty }); added++ }
        }
      }
      setImportData(null)
      await refreshCache()
      toast(`Import done: ${added} added, ${updated} updated.`)
    } catch (e) {
      toast('Import failed. Check connection.')
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    const data = [['Item No.', 'Item Name', 'Min Qty', 'Unit']]
    rooms.forEach(r => {
      data.push(['', r.name, '', ''])
      supplies.filter(s => s.room_id === r.id).forEach((s, i) => data.push([i + 1, s.name, s.min_qty, s.unit]))
      data.push(['', '', '', ''])
    })
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 10 }, { wch: 15 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory')
    XLSX.writeFile(wb, 'LabStock_template.xlsx')
  }

  const filteredSupplies = roomFilter ? supplies.filter(s => s.room_id === roomFilter) : supplies
  const byRoom = {}
  filteredSupplies.forEach(s => {
    const name = rooms.find(r => r.id === s.room_id)?.name || 'Unknown'
    if (!byRoom[name]) byRoom[name] = []
    byRoom[name].push(s)
  })

  const tabs = ['users', 'students']

  return (
    <div>
      <div className="section-title" style={{ marginBottom: 20 }}>Admin panel</div>

      {/* Tabs */}
      <div className="admin-tabs">
        {tabs.map(t => (
          <button key={t} className={`admin-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── ROOMS ── */}
      {tab === 'rooms' && (
        <div>
          <div className="flex items-center justify-between mb-16">
            <div style={{ fontSize: 14, color: 'var(--text2)' }}>Manage lab rooms</div>
            <button className="btn btn-sm btn-primary" onClick={() => setRoomModal('add')}>+ Add room</button>
          </div>
          {rooms.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}><div className="empty-icon">🏠</div>No rooms yet.</div>
          ) : (
            rooms.map(r => {
              const cnt = supplies.filter(s => s.room_id === r.id).length
              return (
                <div key={r.id} className="card" style={{ padding: '14px 18px', marginBottom: 10 }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-12">
                      {r.photo_url
                        ? <img src={r.photo_url} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }} />
                        : <span style={{ fontSize: 22 }}>{r.icon || '🧪'}</span>
                      }
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div className="text-muted">{cnt} supplies</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm" onClick={() => setPhotoModal({ title: r.name, onSaved: async (url) => { await sb.from('rooms').update({ photo_url: url }).eq('id', r.id); await refreshCache() } })}>Photo</button>
                      <button className="btn btn-sm" onClick={() => setRoomModal(r)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteRoom(r.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── SUPPLIES ── */}
      {tab === 'supplies' && (
        <div>
          <div className="flex items-center justify-between mb-16">
            <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
              <option value="">All rooms</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button className="btn btn-sm btn-primary" onClick={() => setSupplyModal('add')}>+ Add supply</button>
          </div>
          {Object.keys(byRoom).length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}><div className="empty-icon">📦</div>No supplies yet.</div>
          ) : (
            Object.entries(byRoom).map(([room, items]) => (
              <div key={room} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', fontFamily: 'var(--mono)', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{room}</div>
                {items.map(s => (
                  <div key={s.id} className="card" style={{ padding: '12px 16px', marginBottom: 8 }}>
                    <div className="flex items-center justify-between">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {s.photo_url
                          ? <img src={s.photo_url} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }} />
                          : <div style={{ width: 44, height: 44, borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: 'var(--text3)' }}>📷</div>
                        }
                        <div>
                          <div style={{ fontWeight: 500 }}>{s.name}</div>
                          <div className="text-muted">Min: {s.min_qty} {s.unit}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm" onClick={() => setPhotoModal({ title: s.name, pathPrefix: `${s.id}_`, onSaved: async (url) => { await sb.from('supplies').update({ photo_url: url }).eq('id', s.id); await refreshCache() } })}>Photo</button>
                        <button className="btn btn-sm" onClick={() => setSupplyModal(s)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteSupply(s.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── USERS ── */}
      {tab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-16">
            <div style={{ fontSize: 14, color: 'var(--text2)' }}>Staff PINs (4-digit)</div>
            <button className="btn btn-sm btn-primary" onClick={() => setUserModal('add')}>+ Add user</button>
          </div>
          {users.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}><div className="empty-icon">👤</div>No users yet.</div>
          ) : (
            users.map(u => (
              <div key={u.id} className="card" style={{ padding: '12px 18px', marginBottom: 10 }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontWeight: 500 }}>{u.name}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>PIN: ●●●●</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm" onClick={() => setUserModal(u)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── STUDENTS ── */}
      {tab === 'students' && <StudentsTab toast={toast} />}

      {/* ── IMPORT ── */}
      {tab === 'import' && (
        <div>
          <div className="card">
            <div className="card-title">Import from Excel</div>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 16 }}>
              Upload an Excel file to add rooms and supplies. Existing rooms and supplies are <strong>kept</strong> — new items are added, existing items have their minimum quantity updated.
            </p>
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16, fontSize: 13, color: 'var(--text2)' }}>
              <strong>Expected format:</strong> Column A = item number, Column B = item name. Room names appear as header rows (no number in column A). A third column (Min Qty) is optional.
            </div>
            <div className="field">
              <label>Select Excel file (.xlsx)</label>
              <input type="file" accept=".xlsx" onChange={e => e.target.files[0] && previewImport(e.target.files[0])} style={{ padding: 8 }} />
            </div>
            {importData && (
              <>
                <div className="divider" />
                <div className="card-title" style={{ marginTop: 8 }}>Preview</div>
                <div style={{ marginBottom: 12, fontSize: 14 }}>
                  Found <strong>{Object.keys(importData).length} rooms</strong> and <strong>{Object.values(importData).reduce((a, b) => a + b.length, 0)} items</strong>. Existing data will be preserved.
                </div>
                {Object.entries(importData).map(([room, items]) => (
                  <div key={room} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' }}>{room} <span style={{ fontWeight: 400 }}>({items.length} items)</span></div>
                    {items.slice(0, 3).map((s, i) => <div key={i} style={{ fontSize: 13, padding: '3px 0', color: 'var(--text2)' }}>· {s.name} <span style={{ color: 'var(--text3)' }}>min: {s.min_qty}</span></div>)}
                    {items.length > 3 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>…and {items.length - 3} more</div>}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button className="btn btn-primary" onClick={confirmImport} disabled={importing}>{importing ? 'Importing…' : 'Import now'}</button>
                  <button className="btn" onClick={() => setImportData(null)}>Cancel</button>
                </div>
              </>
            )}
          </div>
          <div className="card">
            <div className="card-title">Download template</div>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 16 }}>Download a template with your current items.</p>
            <button className="btn btn-sm" onClick={downloadTemplate}>Download template</button>
          </div>
        </div>
      )}

      {/* ── SETTINGS ── */}
      {tab === 'settings' && (
        <div>
          <div className="card">
            <div className="card-title">Weekly reminder</div>
            <div className="field">
              <label>Inspection due day</label>
              <select defaultValue={settings['due_day'] || '5'} onChange={e => saveDueDay(e.target.value)}>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d, i) => (
                  <option key={d} value={(i + 1) % 7}>{d}</option>
                ))}
              </select>
            </div>
            <div className="text-muted">Users see a reminder banner the day before this day.</div>
          </div>
          <div className="card">
            <div className="card-title">Change admin PIN</div>
            <div className="field">
              <label>New admin PIN (4 digits)</label>
              <input type="password" id="new-admin-pin" maxLength={4} placeholder="····" style={{ width: 120 }} />
            </div>
            <button className="btn btn-sm btn-primary" onClick={saveAdminPin}>Update PIN</button>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {roomModal && (
        <RoomModal
          room={roomModal === 'add' ? null : roomModal}
          onClose={() => setRoomModal(null)}
          onSaved={refreshCache}
        />
      )}
      {supplyModal && (
        <SupplyModal
          supply={supplyModal === 'add' ? null : supplyModal}
          rooms={rooms}
          defaultRoomId={roomFilter}
          onClose={() => setSupplyModal(null)}
          onSaved={refreshCache}
        />
      )}
      {userModal && (
        <UserModal
          user={userModal === 'add' ? null : userModal}
          onClose={() => setUserModal(null)}
          onSaved={loadUsers}
        />
      )}
      {photoModal && (
        <PhotoModal
          title={photoModal.title}
          pathPrefix={photoModal.pathPrefix || ''}
          onClose={() => setPhotoModal(null)}
          onSaved={photoModal.onSaved}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// STUDENTS TAB
// ══════════════════════════════════════════════════════════════
const PROJECT_GROUPS = ['Material', 'Sustainability', 'GPR', 'Mechanic', 'Other']
const DEGREES = ['MS', 'PhD', 'BS', 'Other']

function StudentsTab({ toast }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [importData, setImportData] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { loadStudents() }, [])

  async function loadStudents() {
    setLoading(true)
    const { data } = await sb.from('users').select('*').eq('role', 'student').order('name')
    setStudents(data || [])
    setLoading(false)
  }

  async function saveStudent(form, id) {
    if (!form.name.trim()) { toast('Name is required.'); return }
    if (!form.pin || !/^\d{4}$/.test(form.pin)) { if (!id) { toast('PIN must be 4 digits.'); return } }
    const payload = { name: form.name.trim(), email: form.email||null, phone: form.phone||null, degree: form.degree||null, year_semester: form.year_semester||null, supervisor: form.supervisor||null, project_group: form.project_group||null, role: 'student', is_active: true }
    if (form.pin && /^\d{4}$/.test(form.pin)) payload.pin = form.pin
    if (id) await sb.from('users').update(payload).eq('id', id)
    else await sb.from('users').insert(payload)
    setShowModal(false); setEditStudent(null); loadStudents(); toast('Student saved.')
  }

  async function toggleActive(s) {
    await sb.from('users').update({ is_active: !s.is_active }).eq('id', s.id)
    loadStudents(); toast(s.is_active ? 'Student deactivated.' : 'Student activated.')
  }

  async function deleteStudent(id) {
    if (!confirm('Delete this student?')) return
    await sb.from('users').delete().eq('id', id)
    loadStudents(); toast('Student deleted.')
  }

  // Excel import
  function parseStudentExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'binary' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          const students = []
          for (let i = 1; i < rows.length; i++) {
            const [name, email, phone, degree, year_semester, supervisor, project_group] = rows[i]
            if (name?.trim()) students.push({ name: name.trim(), email: email||'', phone: phone||'', degree: degree||'', year_semester: year_semester||'', supervisor: supervisor||'', project_group: project_group||'' })
          }
          resolve(students)
        } catch(err) { reject(err) }
      }
      reader.onerror = reject
      reader.readAsBinaryString(file)
    })
  }

  async function confirmImport() {
    if (!importData) return
    setImporting(true)
    let added = 0
    for (const s of importData) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString()
      const { error } = await sb.from('users').insert({ ...s, pin, role: 'student', is_active: true })
      if (!error) added++
    }
    setImportData(null); setImporting(false); loadStudents()
    toast(`${added} students imported. PINs auto-assigned — update them in edit.`)
  }

  const blankForm = { name:'', pin:'', email:'', phone:'', degree:'', year_semester:'', supervisor:'', project_group:'' }

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div style={{ fontSize: 14, color: 'var(--text2)' }}>{students.length} student{students.length!==1?'s':''}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>⬆️ Import Excel</button>
          <button className="btn btn-sm btn-primary" onClick={() => { setEditStudent(null); setShowModal(true) }}>+ Add student</button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={async e => {
        try { const d = await parseStudentExcel(e.target.files[0]); setImportData(d) } catch { toast('Error reading file.') }
      }} />

      {/* Import preview */}
      {importData && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Import preview — {importData.length} students</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Expected columns: Name · Email · Phone · Degree · Year/Semester · Supervisor · Project Group</div>
          {importData.slice(0,3).map((s,i) => <div key={i} style={{ fontSize: 13, padding: '3px 0', color: 'var(--text2)' }}>· {s.name} {s.email ? `· ${s.email}` : ''}</div>)}
          {importData.length > 3 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>…and {importData.length-3} more</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={confirmImport} disabled={importing}>{importing ? 'Importing…' : 'Import now'}</button>
            <button className="btn btn-sm" onClick={() => setImportData(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Student list */}
      {loading ? <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
        : students.length === 0 ? <div className="empty-state" style={{ padding: 24 }}><div className="empty-icon">👥</div>No students yet.</div>
        : students.map(s => (
          <div key={s.id} className="card" style={{ padding: '12px 18px', marginBottom: 10, opacity: s.is_active ? 1 : 0.5 }}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontWeight: 600 }}>{s.name} {!s.is_active && <span style={{ fontSize: 11, color: 'var(--accent2)', marginLeft: 6 }}>Inactive</span>}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                  {s.email && <span>{s.email}</span>}
                  {s.degree && <span>{s.degree}</span>}
                  {s.project_group && <span>{s.project_group}</span>}
                  {s.supervisor && <span>Supervisor: {s.supervisor}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" onClick={() => { setEditStudent(s); setShowModal(true) }}>Edit</button>
                <button className="btn btn-sm" onClick={() => toggleActive(s)}>{s.is_active ? 'Deactivate' : 'Activate'}</button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteStudent(s.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))
      }

      {/* Add/Edit modal */}
      {showModal && (
        <StudentModal
          student={editStudent}
          onClose={() => { setShowModal(false); setEditStudent(null) }}
          onSave={saveStudent}
        />
      )}
    </div>
  )
}

function StudentModal({ student, onClose, onSave }) {
  const [form, setForm] = useState(student ? { name: student.name||'', pin:'', email: student.email||'', phone: student.phone||'', degree: student.degree||'', year_semester: student.year_semester||'', supervisor: student.supervisor||'', project_group: student.project_group||'' }
    : { name:'', pin:'', email:'', phone:'', degree:'', year_semester:'', supervisor:'', project_group:'' })
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:28, maxWidth:520, width:'100%', maxHeight:'90vh', overflowY:'auto', border:'1px solid var(--border)' }}>
        <div style={{ fontWeight:600, fontSize:16, marginBottom:20 }}>{student ? 'Edit student' : 'Add student'}</div>
        <div className="grid-2">
          <div className="field"><label>Full Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. John Smith" autoFocus /></div>
          <div className="field"><label>PIN (4 digits){student?' (leave blank to keep)':' *'}</label><input type="password" maxLength={4} value={form.pin} onChange={e=>setForm(f=>({...f,pin:e.target.value}))} placeholder="····" style={{width:100}} /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Email</label><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="netid@illinois.edu" /></div>
          <div className="field"><label>Phone</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(217) 555-0000" /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Degree</label>
            <select value={form.degree} onChange={e=>setForm(f=>({...f,degree:e.target.value}))}>
              <option value="">— Select —</option>
              {DEGREES.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field"><label>Year & Semester Started</label><input value={form.year_semester} onChange={e=>setForm(f=>({...f,year_semester:e.target.value}))} placeholder="e.g. Fall 2024" /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label>Supervisor</label><input value={form.supervisor} onChange={e=>setForm(f=>({...f,supervisor:e.target.value}))} placeholder="e.g. Dr. Smith" /></div>
          <div className="field"><label>Project Group</label>
            <select value={form.project_group} onChange={e=>setForm(f=>({...f,project_group:e.target.value}))}>
              <option value="">— Select —</option>
              {PROJECT_GROUPS.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button className="btn btn-primary" onClick={()=>onSave(form, student?.id)}>Save</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
