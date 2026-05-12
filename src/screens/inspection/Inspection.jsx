import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { sb } from '../../lib/supabase'

export default function Inspection() {
  const { inspection, setInspection, setScreen, setLastRecord, session, toast } = useAppStore()
  const [tab, setTab] = useState('count')

  useEffect(() => { if (!inspection) setScreen('home') }, [inspection])
  if (!inspection) return null

  const { items, index, results } = inspection
  const item = items[index]
  const currentQty = results[index]?.qty ?? 0
  const currentQtyNeeded = results[index]?.qty_needed ?? ''

  function setQty(val) {
    const qty = Math.max(0, val)
    const updated = [...results]
    updated[index] = { ...item, qty, qty_needed: currentQtyNeeded, low: qty < item.min_qty }
    setInspection({ ...inspection, results: updated })
  }

  function setQtyNeeded(val) {
    const qty_needed = Math.max(0, parseInt(val) || 0)
    const updated = [...results]
    updated[index] = { ...item, qty: currentQty, qty_needed, low: currentQty < item.min_qty }
    setInspection({ ...inspection, results: updated })
  }

  function next() {
    const updated = [...results]
    if (!updated[index]) updated[index] = { ...item, qty: currentQty, qty_needed: currentQtyNeeded, low: currentQty < item.min_qty }
    if (index < items.length - 1) {
      setInspection({ ...inspection, index: index + 1, results: updated })
      setTab('count')
    } else {
      finish(updated)
    }
  }

  function back() {
    const updated = [...results]
    if (!updated[index]) updated[index] = { ...item, qty: currentQty, qty_needed: currentQtyNeeded, low: currentQty < item.min_qty }
    setInspection({ ...inspection, index: index - 1, results: updated })
    setTab('count')
  }

  async function finish(finalResults) {
    const record = {
      room_id: inspection.roomId,
      room_name: inspection.room.name,
      inspector: session.username,
      flag_count: finalResults.filter(r => r.low).length,
      results: finalResults,
      login_mode: session?.loginMode === 'solo' ? 'solo' : 'team',
      organization_id: session?.loginMode !== 'solo' ? (session?.organizationId || null) : null,
    }
    const { data, error } = await sb.from('inspections').insert(record).select().single()
    if (error) { toast('Error saving. Check connection.'); return }
    setLastRecord(data)
    setScreen('results')
  }

  const progress = Math.round(index / items.length * 100)
  const links = item.links || []

  return (
    <div>
      <div className="section-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 2 }}>{inspection.room.name}</div>
          <div className="section-title">Weekly inspection</div>
        </div>
        <button className="btn btn-sm" onClick={() => { if (confirm('Cancel this inspection? Progress will be lost.')) setScreen('home') }}>Cancel</button>
      </div>
      <div style={{ background: 'var(--surface2)', borderRadius: 99, height: 6, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 99, width: `${progress}%`, transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 16 }}>Item {index + 1} of {items.length}</div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, textAlign: 'center' }}>
        {item.photo_url
          ? <img src={item.photo_url} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16 }} />
          : <div style={{ width: 120, height: 120, borderRadius: 'var(--radius)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--text3)', fontSize: 12 }}>No photo</div>
        }
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>{item.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 24 }}>Minimum required: {item.min_qty} {item.unit}</div>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          {['count','info'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 8, border: 'none', background: 'transparent', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, color: tab === t ? 'var(--accent)' : 'var(--text2)' }}>
              {t === 'count' ? 'Count' : 'Info & Links'}
            </button>
          ))}
        </div>
        {tab === 'count' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current count</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
              <button onClick={() => setQty(currentQty - 1)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>−</button>
              <input type="number" value={currentQty} onChange={e => setQty(parseInt(e.target.value) || 0)} style={{ width: 100, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 500, borderRadius: 'var(--radius)', padding: 8 }} />
              <button onClick={() => setQty(currentQty + 1)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>+</button>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Needs to be ordered ({item.unit})</div>
              <input
                type="number" min="0"
                value={currentQtyNeeded}
                onChange={e => setQtyNeeded(e.target.value)}
                placeholder="0"
                style={{ width: 100, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 500, borderRadius: 'var(--radius)', padding: 8 }}
              />
            </div>
          </div>
        )}
        {tab === 'info' && (
          <div style={{ textAlign: 'left' }}>
            {item.notes && <div style={{ fontSize: 13, color: 'var(--text2)', background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 12, lineHeight: 1.6 }}>{item.notes}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {links.length ? links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', color: 'var(--accent)', fontSize: 13, fontWeight: 500, textDecoration: 'none', background: 'var(--accent-light)' }}>🛒 {l.label || 'Buy now'}</a>
              )) : <div style={{ fontSize: 13, color: 'var(--text3)' }}>No purchase links added.</div>}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
          {index > 0 && <button className="btn" onClick={back}>← Back</button>}
          <button className="btn btn-primary" onClick={next}>{index === items.length - 1 ? 'Finish →' : 'Next →'}</button>
        </div>
      </div>
    </div>
  )
}
