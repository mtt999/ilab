import HelpPanel from '../../components/HelpPanel'
import React from 'react'
import { TrainingRequestsPanel, UserTrainingSchedule, ExamTab } from './TrainingSchedule'
import { useState, useEffect, useRef } from 'react'
import { sb } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'

const PROJECT_GROUPS = ['Material', 'Sustainability', 'GPR', 'Mechanic', 'Other']

// ── Helpers ───────────────────────────────────────────────────
function canEdit(session) {
  return session?.role === 'admin' || session?.role === 'user'
}

// Returns first name — stored in last_name column, fallback to name
function firstName(u) {
  return u?.last_name || u?.name || ''
}

function StatusBadge({ done }) {
  return (
    <span className={`badge ${done ? 'badge-ok' : 'badge-low'}`}>
      {done ? '✓ Complete' : '✗ Pending'}
    </span>
  )
}

function SectionHeader({ title, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
      {count !== undefined && <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{count} students</span>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 1 — FRESH STUDENT TRAINING
// ══════════════════════════════════════════════════════════════
function FreshTraining({ students, session }) {
  const { toast } = useAppStore()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)
  const fileRefs = useRef({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('training_fresh').select('*')
    setRecords(data || [])
    setLoading(false)
  }

  function getRecord(userId) {
    return records.find(r => r.user_id === userId) || null
  }

  async function uploadCert(user, file) {
    if (!file) return
    setUploading(user.id)
    try {
      const path = `fresh/${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error } = await sb.storage.from('project-files').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = sb.storage.from('project-files').getPublicUrl(path)
      const rec = getRecord(user.id)
      if (rec) {
        await sb.from('training_fresh').update({ certificate_url: urlData.publicUrl, certificate_name: file.name, certificate_uploaded_at: new Date().toISOString(), admin_approved: false }).eq('id', rec.id)
      } else {
        await sb.from('training_fresh').insert({ user_id: user.id, certificate_url: urlData.publicUrl, certificate_name: file.name, certificate_uploaded_at: new Date().toISOString() })
      }
      toast('Certificate uploaded.')
      load()
    } catch (e) { toast('Upload failed.') }
    setUploading(null)
  }

  async function toggleApprove(rec) {
    await sb.from('training_fresh').update({ admin_approved: !rec.admin_approved, admin_approved_by: session.username, admin_approved_at: new Date().toISOString() }).eq('id', rec.id)
    toast(rec.admin_approved ? 'Approval removed.' : 'Certificate approved ✓')
    load()
  }

  async function toggleInstructions(user) {
    const rec = getRecord(user.id)
    if (rec) {
      await sb.from('training_fresh').update({ instructions_read: !rec.instructions_read }).eq('id', rec.id)
    } else {
      await sb.from('training_fresh').insert({ user_id: user.id, instructions_read: true })
    }
    load()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div>
      <SectionHeader title="Fresh Student Training" count={students.length} />
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Group</th>
              <th>Instructions Read</th>
              <th>Certificate</th>
              <th>Uploaded</th>
              <th>Admin Approval</th>
            </tr>
          </thead>
          <tbody>
            {students.map(u => {
              const rec = getRecord(u.id)
              const isOwn = session.userId === u.id || session.username === u.name
              const editable = canEdit(session)
              const canUploadCert = canEdit(session) || isOwn
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{firstName(u)}</div>
                    {u.supervisor && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.supervisor}</div>}
                  </td>
                  <td><span style={{ fontSize: 12, color: 'var(--text2)' }}>{u.project_group || '—'}</span></td>
                  <td>
                    {editable ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
                        <input type="checkbox" checked={rec?.instructions_read || false}
                          onChange={() => toggleInstructions(u)}
                          style={{ width: 'auto' }} />
                        <span style={{ fontSize: 13 }}>{rec?.instructions_read ? 'Yes' : 'No'}</span>
                      </label>
                    ) : (
                      <StatusBadge done={rec?.instructions_read} />
                    )}
                  </td>
                  <td>
                    {rec?.certificate_url ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <a href={rec.certificate_url} target="_blank" rel="noopener" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>📕 {rec.certificate_name || 'View'}</a>
                        {canUploadCert && (
                          <button className="btn btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => fileRefs.current[u.id]?.click()}>Replace</button>
                        )}
                      </div>
                    ) : canUploadCert ? (
                      <button className="btn btn-sm" onClick={() => fileRefs.current[u.id]?.click()} disabled={uploading === u.id}>
                        {uploading === u.id ? '⏳' : '⬆️ Upload'}
                      </button>
                    ) : <span style={{ color: 'var(--text3)', fontSize: 13 }}>—</span>}
                    <input type="file" accept=".pdf,image/*" ref={el => fileRefs.current[u.id] = el} style={{ display: 'none' }} onChange={e => uploadCert(u, e.target.files[0])} />
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                    {rec?.certificate_uploaded_at ? new Date(rec.certificate_uploaded_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    {canEdit(session) && rec?.certificate_url ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
                        <input type="checkbox" checked={rec?.admin_approved || false} onChange={() => toggleApprove(rec)} style={{ width: 'auto' }} />
                        <span style={{ fontSize: 13, color: rec?.admin_approved ? 'var(--accent)' : 'var(--text3)' }}>{rec?.admin_approved ? `✓ ${rec.admin_approved_by || ''}` : 'Pending'}</span>
                      </label>
                    ) : <StatusBadge done={rec?.admin_approved} />}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 2 — GOLF CAR TRAINING
// ══════════════════════════════════════════════════════════════
function GolfCarTraining({ students, session }) {
  const { toast } = useAppStore()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('training_golf_car').select('*')
    setRecords(data || [])
    setLoading(false)
  }

  function getRecord(userId) { return records.find(r => r.user_id === userId) || null }

  async function toggleTrained(user) {
    if (!canEdit(session)) return
    const rec = getRecord(user.id)
    const now = new Date().toISOString().split('T')[0]
    if (rec) {
      await sb.from('training_golf_car').update({ trained: !rec.trained, trained_date: !rec.trained ? now : null, trained_by: !rec.trained ? session.username : null }).eq('id', rec.id)
    } else {
      await sb.from('training_golf_car').insert({ user_id: user.id, trained: true, trained_date: now, trained_by: session.username })
    }
    toast('Record updated.')
    load()
  }

  async function updateDate(rec, date) {
    await sb.from('training_golf_car').update({ trained_date: date }).eq('id', rec.id)
    load()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div>
      <SectionHeader title="Golf Car Training" count={students.length} />
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Group</th>
            <th>Trained</th>
            <th>Date</th>
            <th>Trained By</th>
          </tr>
        </thead>
        <tbody>
          {students.map(u => {
            const rec = getRecord(u.id)
            return (
              <tr key={u.id}>
                <td><div style={{ fontWeight: 600 }}>{firstName(u)}</div></td>
                <td><span style={{ fontSize: 12, color: 'var(--text2)' }}>{u.project_group || '—'}</span></td>
                <td>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canEdit(session) ? 'pointer' : 'default', marginBottom: 0 }}>
                    <input type="checkbox" checked={rec?.trained || false} onChange={() => toggleTrained(u)} disabled={!canEdit(session)} style={{ width: 'auto' }} />
                    <span style={{ fontSize: 13, color: rec?.trained ? 'var(--accent)' : 'var(--text3)' }}>{rec?.trained ? 'Yes' : 'No'}</span>
                  </label>
                </td>
                <td>
                  {canEdit(session) && rec?.trained ? (
                    <input type="date" value={rec.trained_date || ''} onChange={e => updateDate(rec, e.target.value)} style={{ width: 140, fontSize: 13, padding: '4px 8px' }} />
                  ) : <span style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{rec?.trained_date || '—'}</span>}
                </td>
                <td style={{ fontSize: 13, color: 'var(--text2)' }}>{rec?.trained_by || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 3 — EQUIPMENT TRAINING
// ══════════════════════════════════════════════════════════════
function EquipmentTraining({ students, session }) {
  const { toast } = useAppStore()
  const [equipment, setEquipment] = useState([])
  const [records, setRecords] = useState([])
  const [pendingRetraining, setPendingRetraining] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddEquip, setShowAddEquip] = useState(false)
  const [newEquip, setNewEquip] = useState({ name: '', description: '' })
  const [addingRecord, setAddingRecord] = useState(null)
  const [importing, setImporting] = useState(false)
  const equipImportRef = useRef(null)
  const [equipSubTab, setEquipSubTab] = useState('training')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: eq }, { data: rec }, { data: retrainReqs }] = await Promise.all([
      sb.from('equipment_inventory').select('id, equipment_name, nickname, category, location').eq('is_active', true).order('nickname'),
      sb.from('training_equipment').select('*'),
      sb.from('retraining_requests').select('*').eq('status', 'pending'),
    ])
    setEquipment(eq || [])
    setRecords(rec || [])
    setPendingRetraining(retrainReqs || [])
    setLoading(false)
  }

  function getRecords(userId) { return records.filter(r => r.user_id === userId) }
  function isExpiringSoon(rec) {
    if (!rec.expires_at) return false
    const days = (new Date(rec.expires_at) - new Date()) / (1000 * 60 * 60 * 24)
    return days <= 30 && days > 0
  }
  function isExpired(rec) {
    if (!rec.expires_at) return false
    return new Date(rec.expires_at) < new Date()
  }

  async function addEquipment() {
    if (!newEquip.name.trim()) { toast('Equipment name required.'); return }
    await sb.from('equipment_inventory').insert({ equipment_name: newEquip.name.trim(), nickname: newEquip.description.trim() || newEquip.name.trim(), is_active: true })
    setNewEquip({ name: '', description: '' })
    setShowAddEquip(false)
    load(); toast('Equipment added.')
  }

  async function deleteEquipment(id) {
    if (!confirm('Remove this equipment from training list?')) return
    await sb.from('equipment_inventory').update({ is_active: false }).eq('id', id)
    load(); toast('Equipment removed.')
  }

  async function importEquipmentFromExcel(file) {
    if (!file) return
    setImporting(true)
    try {
      const XLSX = await import('xlsx')
      const reader = new FileReader()
      reader.onload = async e => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'binary' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          const items = []
          for (let i = 1; i < rows.length; i++) {
            const name = String(rows[i][0] || '').trim()
            const description = String(rows[i][1] || '').trim() || null
            if (name) items.push({ name, description })
          }
          if (!items.length) { toast('No equipment found in file.'); setImporting(false); return }
          const existing = equipment.map(e => e.name.toLowerCase())
          const newItems = items.filter(item => !existing.includes(item.name.toLowerCase()))
          if (newItems.length === 0) { toast('All equipment already exists.'); setImporting(false); return }
          for (const item of newItems) {
            await sb.from('equipment_list').insert(item)
          }
          load()
          toast(`${newItems.length} equipment item${newItems.length !== 1 ? 's' : ''} imported.`)
        } catch (err) { toast('Error reading file.') }
        setImporting(false)
      }
      reader.onerror = () => { toast('Error reading file.'); setImporting(false) }
      reader.readAsBinaryString(file)
    } catch (e) { toast('Import failed.'); setImporting(false) }
  }

  function getRetrainingInfo(userId, equipmentId) {
    return pendingRetraining.find(r => r.user_id === userId && r.equipment_id === equipmentId) || null
  }

  async function submitRetrainingRequest(userId, userName, equipmentId) {
    const eq = equipment.find(e => e.id === equipmentId)
    const { data: existing } = await sb.from('retraining_requests')
      .select('id').eq('user_id', userId).eq('equipment_id', equipmentId).eq('status', 'pending').maybeSingle()
    if (existing) { toast('Retraining request already submitted.'); return }
    await sb.from('retraining_requests').insert({
      user_id: userId, user_name: userName,
      equipment_id: equipmentId,
      equipment_name: eq?.nickname || eq?.equipment_name,
      status: 'pending',
    })
    toast('Retraining request submitted ✓')
    load()
  }

  async function addTrainingRecord(userId, equipmentId, date, trainedBy, passed) {
    const expires = date ? new Date(new Date(date).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null
    await sb.from('training_equipment').insert({ user_id: userId, equipment_id: equipmentId, trained_date: date, trained_by: trainedBy, passed_exam: passed, expires_at: expires })
    setAddingRecord(null)
    load(); toast('Training record added.')
  }

  async function togglePassed(rec) {
    if (!canEdit(session)) return
    await sb.from('training_equipment').update({ passed_exam: !rec.passed_exam }).eq('id', rec.id)
    load()
  }

  async function deleteRecord(id) {
    await sb.from('training_equipment').delete().eq('id', id)
    load(); toast('Record removed.')
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div>
      <SectionHeader title="Equipment Training" count={students.length} />
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {[{ key: 'training', label: 'Training Records' }, { key: 'history', label: 'Equipment History' }].map(t => (
          <button key={t.key} onClick={() => setEquipSubTab(t.key)}
            style={{ padding: '8px 18px', border: 'none', background: 'transparent', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: equipSubTab === t.key ? 'var(--accent)' : 'var(--text2)', borderBottom: `2px solid ${equipSubTab === t.key ? 'var(--accent)' : 'transparent'}`, transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {equipSubTab === 'history' && (
        <div>
          {canEdit(session) && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button className="btn btn-sm" onClick={() => equipImportRef.current?.click()} disabled={importing}>
                {importing ? '⏳ Importing…' : '⬆️ Import Excel'}
              </button>
              <input ref={equipImportRef} type="file" accept=".xlsx" style={{ display: 'none' }}
                onChange={e => { importEquipmentFromExcel(e.target.files[0]); e.target.value = '' }} />
              <button className="btn btn-sm btn-primary" onClick={() => setShowAddEquip(true)}>+ Add equipment</button>
              <button className="btn btn-sm" onClick={() => {
                import('xlsx').then(XLSX => {
                  const data = [['Equipment Name', 'Description (optional)'], ['Example: Gyratory Compactor', 'Asphalt compaction equipment']]
                  const ws = XLSX.utils.aoa_to_sheet(data); ws['!cols'] = [{ wch: 40 }, { wch: 40 }]
                  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Equipment')
                  XLSX.writeFile(wb, 'equipment_template.xlsx')
                })
              }}>⬇️ Template</button>
            </div>
          )}
          {showAddEquip && (
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>New equipment</div>
              <div className="grid-2">
                <div className="field" style={{ marginBottom: 0 }}><label>Name *</label><input value={newEquip.name} onChange={e => setNewEquip(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Gyratory Compactor" autoFocus /></div>
                <div className="field" style={{ marginBottom: 0 }}><label>Nickname</label><input value={newEquip.description} onChange={e => setNewEquip(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Servopac" /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-sm btn-primary" onClick={addEquipment}>Add</button>
                <button className="btn btn-sm" onClick={() => setShowAddEquip(false)}>Cancel</button>
              </div>
            </div>
          )}
          {equipment.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}><div className="empty-icon">🔧</div>No equipment yet.</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <table>
                <thead><tr><th style={{ width: 40 }}>#</th><th>Equipment Name</th><th>Description</th><th>Date Added</th>{canEdit(session) && <th style={{ width: 90 }}></th>}</tr></thead>
                <tbody>
                  {equipment.map((e, i) => (
                    <tr key={e.id}>
                      <td style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{e.nickname || e.equipment_name}<br/><span style={{fontSize:11,color:'var(--text3)'}}>{e.nickname ? e.equipment_name : ''}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--text2)' }}>{e.category || e.location || '—'}</td>
                      <td style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{new Date(e.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      {canEdit(session) && <td><button className="btn btn-sm btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteEquipment(e.id)}>Remove</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>{equipment.length} equipment item{equipment.length !== 1 ? 's' : ''} total</div>
            </div>
          )}
        </div>
      )}

      {equipSubTab === 'training' && (
        <div>
          {!canEdit(session) && session?.role === 'student' && (
            <RetrainingRequestPanel session={session} equipment={equipment} pendingRetraining={pendingRetraining} onSubmit={submitRetrainingRequest} />
          )}
          {students.map(u => {
            const recs = getRecords(u.id)
            return (
              <div key={u.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'var(--surface2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{firstName(u)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{u.project_group || ''}{u.supervisor ? ` · ${u.supervisor}` : ''}</div>
                  </div>
                  {canEdit(session) && <button className="btn btn-sm" onClick={() => setAddingRecord({ userId: u.id })}>+ Add training</button>}
                </div>
                {recs.length === 0 ? (
                  <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text3)' }}>No equipment training records yet.</div>
                ) : (
                  <table style={{ fontSize: 13 }}>
                    <thead><tr><th>Equipment</th><th>Date</th><th>Trained By</th><th>Passed Exam</th><th>Expires</th>{canEdit(session) && <th></th>}</tr></thead>
                    <tbody>
                      {recs.map(rec => {
                        const retrainReq = getRetrainingInfo(u.id, rec.equipment_id)
                        const eq = equipment.find(e => e.id === rec.equipment_id)
                        const expired = isExpired(rec)
                        const soon = isExpiringSoon(rec)
                        return (
                          <React.Fragment key={rec.id}>
                            <tr style={{ background: rec.is_retraining ? '#e0f2fe' : expired ? 'var(--accent2-light)' : soon ? 'var(--warn-light)' : 'transparent' }}>
                              <td style={{ fontWeight: 500 }}>
                                {eq ? (eq.nickname || eq.equipment_name) : 'Unknown'}
                                {rec.is_retraining && <span style={{ marginLeft: 6, fontSize: 10, background: '#0369a1', color: '#fff', borderRadius: 3, padding: '1px 6px', fontWeight: 600 }}>Retraining</span>}
                              </td>
                              <td style={{ fontFamily: 'var(--mono)' }}>{rec.trained_date || '—'}</td>
                              <td>{rec.trained_by || '—'}</td>
                              <td>
                                {canEdit(session) ? (
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 0 }}>
                                    <input type="checkbox" checked={rec.passed_exam || false} onChange={() => togglePassed(rec)} style={{ width: 'auto' }} />
                                    <span style={{ color: rec.passed_exam ? 'var(--accent)' : 'var(--text3)' }}>{rec.passed_exam ? 'Yes' : 'No'}</span>
                                  </label>
                                ) : <StatusBadge done={rec.passed_exam} />}
                              </td>
                              <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: expired ? 'var(--accent2)' : soon ? '#92400e' : 'var(--text2)' }}>
                                {rec.expires_at || '—'}{expired && ' ⚠️ EXPIRED'}{soon && ' ⏰ Soon'}
                              </td>
                              {canEdit(session) && <td><button className="btn btn-sm btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => deleteRecord(rec.id)}>✕</button></td>}
                            </tr>
                            {retrainReq && (
                              <tr>
                                <td colSpan={canEdit(session) ? 6 : 5} style={{ padding: 0, border: 'none' }}>
                                  <div style={{ background: '#fef3c7', borderTop: '1px solid #f0d070', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: 12, color: '#92400e' }}>⚠️ <strong>Retraining required</strong> — not used in 3+ months.</div>
                                    {canEdit(session) && (
                                      <button className="btn btn-sm btn-primary" style={{ fontSize: 11 }} onClick={() => setAddingRecord({ userId: u.id, equipmentId: rec.equipment_id, isRetraining: true })}>🔄 Log retraining</button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
          {addingRecord && (
            <AddTrainingRecord userId={addingRecord.userId} equipment={equipment} session={session} onSave={addTrainingRecord} onClose={() => setAddingRecord(null)} defaultEquipmentId={addingRecord.equipmentId} defaultIsRetraining={addingRecord.isRetraining} />
          )}
        </div>
      )}
    </div>
  )
}

function RetrainingRequestPanel({ session, equipment, pendingRetraining, onSubmit }) {
  const [selectedEq, setSelectedEq] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useAppStore()

  async function submit() {
    if (!selectedEq) { toast('Select equipment.'); return }
    setSubmitting(true)
    await onSubmit(session.userId, session.username, selectedEq)
    setSelectedEq('')
    setSubmitting(false)
  }

  const pendingIds = new Set(pendingRetraining.map(r => r.equipment_id))
  return (
    <div className="card" style={{ marginBottom: 16, borderColor: '#0369a1' }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#0369a1' }}>🔄 Request Retraining</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>If you haven't used equipment in over 3 months, select it below to request retraining.</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={selectedEq} onChange={e => setSelectedEq(e.target.value)} style={{ flex: 1, minWidth: 200 }}>
          <option value="">— Select equipment —</option>
          {equipment.map(e => (
            <option key={e.id} value={e.id} disabled={pendingIds.has(e.id)}>{e.nickname || e.equipment_name}{pendingIds.has(e.id) ? ' (pending)' : ''}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={submitting || !selectedEq}>{submitting ? 'Submitting…' : 'Submit request'}</button>
      </div>
    </div>
  )
}

function AddTrainingRecord({ userId, equipment, session, onSave, onClose, defaultEquipmentId, defaultIsRetraining }) {
  const [form, setForm] = useState({ equipmentId: defaultEquipmentId || '', date: new Date().toISOString().split('T')[0], trainedBy: session.username, passed: false, isRetraining: defaultIsRetraining || false })
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, maxWidth: 400, width: '100%', border: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{form.isRetraining ? '🔄 Add retraining record' : 'Add equipment training'}</div>
        {form.isRetraining && <div style={{ fontSize: 12, color: '#0369a1', background: '#e0f2fe', borderRadius: 6, padding: '6px 10px', marginBottom: 12 }}>This will be recorded as retraining.</div>}
        <div className="field"><label>Equipment *</label>
          <select value={form.equipmentId} onChange={e => setForm(f => ({ ...f, equipmentId: e.target.value }))}>
            <option value="">— Select equipment —</option>
            {equipment.map(e => <option key={e.id} value={e.id}>{e.nickname || e.equipment_name}</option>)}
          </select>
        </div>
        <div className="grid-2">
          <div className="field"><label>Training Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div className="field"><label>Trained By</label><input value={form.trainedBy} onChange={e => setForm(f => ({ ...f, trainedBy: e.target.value }))} /></div>
        </div>
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8 }}>
            <input type="checkbox" checked={form.passed} onChange={e => setForm(f => ({ ...f, passed: e.target.checked }))} style={{ width: 'auto' }} />Passed exam
          </label>
          {canEdit(session) && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 0 }}>
              <input type="checkbox" checked={form.isRetraining} onChange={e => setForm(f => ({ ...f, isRetraining: e.target.checked }))} style={{ width: 'auto' }} />
              <span style={{ color: '#0369a1', fontWeight: 500 }}>🔄 Mark as retraining</span>
            </label>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={() => form.equipmentId && onSave(userId, form.equipmentId, form.date, form.trainedBy, form.passed, form.isRetraining)}>Save</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 4 — BUILDING ALARM
// ══════════════════════════════════════════════════════════════
function BuildingAlarm({ students, session }) {
  const { toast } = useAppStore()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('training_building_alarm').select('*')
    setRecords(data || [])
    setLoading(false)
  }

  function getRecord(userId) { return records.find(r => r.user_id === userId) || null }

  async function updateRecord(user, field, value) {
    if (!canEdit(session)) return
    const rec = getRecord(user.id)
    if (rec) {
      await sb.from('training_building_alarm').update({ [field]: value }).eq('id', rec.id)
    } else {
      await sb.from('training_building_alarm').insert({ user_id: user.id, [field]: value })
    }
    load()
  }

  async function toggleTrained(user) {
    if (!canEdit(session)) return
    const rec = getRecord(user.id)
    const now = new Date().toISOString().split('T')[0]
    if (rec) {
      await sb.from('training_building_alarm').update({ trained: !rec.trained, trained_date: !rec.trained ? now : null, trained_by: !rec.trained ? session.username : null }).eq('id', rec.id)
    } else {
      await sb.from('training_building_alarm').insert({ user_id: user.id, trained: true, trained_date: now, trained_by: session.username })
    }
    toast('Record updated.')
    load()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div>
      <SectionHeader title="Building Alarm Training" count={students.length} />
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Admin/RE enters the student's 4-digit alarm PIN and confirms training completion.</p>
      <table>
        <thead>
          <tr><th>Student</th><th>Group</th><th>Alarm PIN</th><th>Training Complete</th><th>Date</th><th>Confirmed By</th></tr>
        </thead>
        <tbody>
          {students.map(u => {
            const rec = getRecord(u.id)
            return (
              <tr key={u.id}>
                <td><div style={{ fontWeight: 600 }}>{firstName(u)}</div></td>
                <td><span style={{ fontSize: 12, color: 'var(--text2)' }}>{u.project_group || '—'}</span></td>
                <td>
                  {canEdit(session) ? (
                    <input type="password" maxLength={4} value={rec?.alarm_pin || ''} onChange={e => updateRecord(u, 'alarm_pin', e.target.value)} placeholder="····" style={{ width: 80, fontFamily: 'var(--mono)', fontSize: 16, padding: '4px 8px', textAlign: 'center' }} />
                  ) : <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{rec?.alarm_pin ? '••••' : '—'}</span>}
                </td>
                <td>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canEdit(session) ? 'pointer' : 'default', marginBottom: 0 }}>
                    <input type="checkbox" checked={rec?.trained || false} onChange={() => toggleTrained(u)} disabled={!canEdit(session)} style={{ width: 'auto' }} />
                    <span style={{ fontSize: 13, color: rec?.trained ? 'var(--accent)' : 'var(--text3)' }}>{rec?.trained ? 'Yes' : 'No'}</span>
                  </label>
                </td>
                <td>
                  {canEdit(session) && rec?.trained ? (
                    <input type="date" value={rec.trained_date || ''} onChange={e => updateRecord(u, 'trained_date', e.target.value)} style={{ width: 140, fontSize: 13, padding: '4px 8px' }} />
                  ) : <span style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{rec?.trained_date || '—'}</span>}
                </td>
                <td style={{ fontSize: 13, color: 'var(--text2)' }}>{rec?.trained_by || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 5 — STUDENT LOCKER
// ══════════════════════════════════════════════════════════════
const TOTAL_LOCKERS = 15

function StudentLocker({ session }) {
  const { toast } = useAppStore()
  const [lockers, setLockers] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: lk }, { data: st }] = await Promise.all([
      sb.from('student_lockers').select('*').order('locker_number'),
      sb.from('users').select('id, name, last_name, project_group').eq('role', 'student').eq('is_active', true).order('name'),
    ])
    if (!lk || lk.length === 0) {
      setLockers(Array.from({ length: TOTAL_LOCKERS }, (_, i) => ({ locker_number: i + 1, user_id: null, user_name: null })))
    } else {
      setLockers(lk)
    }
    setStudents(st || [])
    setLoading(false)
  }

  async function assignLocker(lockerNumber) {
    if (!selectedStudent) { toast('Select a student.'); return }
    const student = students.find(s => s.id === selectedStudent)
    if (!student) return
    const displayName = firstName(student)
    const { error } = await sb.from('student_lockers').upsert({
      locker_number: lockerNumber,
      user_id: student.id,
      user_name: displayName,
      assigned_by: session.username,
      assigned_at: new Date().toISOString(),
      notes: notes || null,
    }, { onConflict: 'locker_number' })
    if (error) { toast('Error: ' + error.message); return }
    toast(`Locker ${lockerNumber} assigned to ${displayName} ✓`)
    setAssigning(null); setSelectedStudent(''); setNotes('')
    load()
  }

  async function unassignLocker(locker) {
    if (!confirm(`Remove ${locker.user_name} from locker ${locker.locker_number}?`)) return
    const { error } = await sb.from('student_lockers').update({
      user_id: null, user_name: null, assigned_by: null, assigned_at: null, notes: null
    }).eq('locker_number', locker.locker_number)
    if (error) { toast('Error: ' + error.message); return }
    toast(`Locker ${locker.locker_number} cleared.`)
    load()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  const myLocker = session?.role === 'student'
    ? lockers.find(l => l.user_id === session.userId)
    : null

  const assigned = lockers.filter(l => l.user_name).length
  const available = TOTAL_LOCKERS - assigned

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>🗄️ Student Lockers</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{available} available</span>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>{assigned} assigned</span>
        </div>
      </div>

      {session?.role === 'student' && (
        <div>
          {myLocker ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px' }}>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Your assigned locker</div>
              <div style={{ width: 140, height: 140, borderRadius: 16, background: 'var(--accent)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1 }}>{myLocker.locker_number}</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Your Locker</div>
              </div>
              {myLocker.notes && (
                <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text2)', background: 'var(--surface2)', borderRadius: 8, padding: '8px 16px', maxWidth: 300, textAlign: 'center' }}>📝 {myLocker.notes}</div>
              )}
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>
                Assigned {myLocker.assigned_at ? new Date(myLocker.assigned_at).toLocaleDateString() : ''}
                {myLocker.assigned_by ? ` by ${myLocker.assigned_by}` : ''}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🗄️</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No locker assigned yet</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Contact your lab manager to get a locker assigned.</div>
            </div>
          )}
        </div>
      )}

      {canEdit(session) && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 500, margin: '0 auto 28px' }}>
            {Array.from({ length: TOTAL_LOCKERS }, (_, i) => {
              const num = i + 1
              const locker = lockers.find(l => l.locker_number === num) || { locker_number: num, user_name: null }
              const occupied = !!locker.user_name
              const isAssigning = assigning === num
              return (
                <div key={num}
                  style={{ borderRadius: 10, border: `2px solid ${isAssigning ? 'var(--accent)' : occupied ? '#0369a1' : 'var(--border)'}`, background: isAssigning ? 'var(--accent-light)' : occupied ? '#e0f2fe' : 'var(--surface)', padding: '12px 8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                  onClick={() => { if (!isAssigning) { setAssigning(num); setSelectedStudent(''); setNotes('') } }}
                  onMouseEnter={e => !isAssigning && (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => !isAssigning && (e.currentTarget.style.borderColor = occupied ? '#0369a1' : 'var(--border)')}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: occupied ? '#0369a1' : 'var(--surface2)', color: occupied ? '#fff' : 'var(--text)', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                    {num}
                  </div>
                  {occupied ? (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', lineHeight: 1.3, wordBreak: 'break-word' }}>{locker.user_name}</div>
                      <button className="btn btn-sm btn-danger" style={{ marginTop: 6, fontSize: 10, padding: '2px 8px' }} onClick={e => { e.stopPropagation(); unassignLocker(locker) }}>Remove</button>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>Available</div>
                  )}
                </div>
              )
            })}
          </div>

          {assigning !== null && (
            <div style={{ background: 'var(--surface)', border: '2px solid var(--accent)', borderRadius: 'var(--radius-lg)', padding: 20, maxWidth: 400, margin: '0 auto 20px' }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
                Assign Locker #{assigning}
                <button onClick={() => setAssigning(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>×</button>
              </div>
              <div className="field">
                <label>Assign to student *</label>
                <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} autoFocus>
                  <option value="">— Select student —</option>
                  {students.map(s => {
                    const hasLocker = lockers.find(l => l.user_id === s.id)
                    return (
                      <option key={s.id} value={s.id} disabled={!!hasLocker}>
                        {firstName(s)}{s.project_group ? ` (${s.project_group})` : ''}{hasLocker ? ` — Locker ${hasLocker.locker_number}` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div className="field">
                <label>Notes (optional)</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. key given, combination shared…" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={() => assignLocker(assigning)} disabled={!selectedStudent}>Assign locker</button>
                <button className="btn" onClick={() => setAssigning(null)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 500, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>All Lockers</div>
            <table>
              <thead>
                <tr><th style={{ width: 80 }}>Locker #</th><th>Assigned To</th><th>Group</th><th>Assigned Date</th><th>Notes</th><th style={{ width: 100 }}></th></tr>
              </thead>
              <tbody>
                {Array.from({ length: TOTAL_LOCKERS }, (_, i) => {
                  const num = i + 1
                  const locker = lockers.find(l => l.locker_number === num) || { locker_number: num, user_name: null }
                  const student = locker.user_id ? students.find(s => s.id === locker.user_id) : null
                  return (
                    <tr key={num} style={{ background: locker.user_name ? 'transparent' : 'var(--surface2)' }}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', background: locker.user_name ? '#0369a1' : 'var(--border)', color: locker.user_name ? '#fff' : 'var(--text3)', fontWeight: 700, fontSize: 13 }}>{num}</span>
                      </td>
                      <td>
                        {locker.user_name
                          ? <span style={{ fontWeight: 600, color: '#0369a1' }}>{locker.user_name}</span>
                          : <span style={{ fontSize: 12, color: 'var(--text3)' }}>Available</span>
                        }
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text2)' }}>{student?.project_group || '—'}</td>
                      <td style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{locker.assigned_at ? new Date(locker.assigned_at).toLocaleDateString() : '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>{locker.notes || '—'}</td>
                      <td>
                        {locker.user_name ? (
                          <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => unassignLocker(locker)}>Remove</button>
                        ) : (
                          <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => { setAssigning(num); setSelectedStudent(''); setNotes('') }}>Assign</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN TRAINING RECORDS COMPONENT
// ══════════════════════════════════════════════════════════════
export default function TrainingRecords() {
  const { session, toast } = useAppStore()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState(() => {
    if (localStorage.getItem('examEquipment')) return 'exam'
    return 'fresh'
  })
  const [expiryAlerts, setExpiryAlerts] = useState([])

  useEffect(() => { loadStudents(); checkExpiry() }, [])

  async function loadStudents() {
    setLoading(true)
    if (session?.loginMode === 'solo') {
      setStudents([])
      setLoading(false)
      return
    }
    if (session?.role === 'student') {
      const { data } = await sb.from('users').select('*').eq('id', session.userId).single()
      setStudents(data ? [data] : [])
    } else {
      const { data } = await sb.from('users').select('*').eq('role', 'student').eq('is_active', true).order('name')
      setStudents(data || [])
    }
    setLoading(false)
  }

  async function checkExpiry() {
    if (session?.loginMode === 'solo') return
    const { data } = await sb.from('training_equipment')
      .select('*, equipment_inventory(equipment_name, nickname), users(name, last_name)')
      .lt('expires_at', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    if (data?.length) setExpiryAlerts(data)
  }

  const subTabs = [
    { key: 'fresh',     label: '1 · Fresh Student' },
    { key: 'golf',      label: '2 · Golf Car' },
    { key: 'equipment', label: '3 · Equipment' },
    { key: 'alarm',     label: '4 · Building Alarm' },
    ...(canEdit(session) ? [{ key: 'requests', label: '📋 Training Requests' }] : []),
    { key: 'exam',      label: '📝 Exam' },
    { key: 'locker',    label: '🗄️ Student Locker' },
  ]

  return (
    <div>
      {session?.role === 'student' && <UserTrainingSchedule session={session} />}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="section-title">Training Records</div>
          <HelpPanel screen="training" />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>{students.length} active student{students.length !== 1 ? 's' : ''}</div>
      </div>

      {expiryAlerts.length > 0 && (
        <div style={{ background: 'var(--warn-light)', border: '1px solid #fcd34d', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#92400e' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>⏰ Retraining Reminders</div>
          {expiryAlerts.map((a, i) => (
            <div key={i} style={{ fontSize: 13 }}>
              • <strong>{a.users?.last_name || a.users?.name}</strong> — {a.equipment_inventory?.nickname || a.equipment_inventory?.equipment_name} expires {a.expires_at}
              {new Date(a.expires_at) < new Date() ? ' (EXPIRED)' : ''}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, overflowX: 'auto' }}>
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{ padding: '10px 16px', border: 'none', background: 'transparent', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: subTab === t.key ? 'var(--accent)' : 'var(--text2)', borderBottom: `2px solid ${subTab === t.key ? 'var(--accent)' : 'transparent'}`, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'requests' && <TrainingRequestsPanel session={session} />}
      {subTab === 'exam'     && <ExamTab session={session} />}
      {subTab === 'locker'   && <StudentLocker session={session} />}

      {!['requests','exam','locker'].includes(subTab) && (
        loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div>No students yet. Add students in Admin → Students.</div>
          </div>
        ) : (
          <div>
            {subTab === 'fresh'     && <FreshTraining students={students} session={session} />}
            {subTab === 'golf'      && <GolfCarTraining students={students} session={session} />}
            {subTab === 'equipment' && <EquipmentTraining students={students} session={session} />}
            {subTab === 'alarm'     && <BuildingAlarm students={students} session={session} />}
          </div>
        )
      )}
    </div>
  )
}
