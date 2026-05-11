import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const BLUE = '#0d47a1'

export default function NotificationBell() {
  const { session, setScreen } = useAppStore()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const userId = session?.userId
  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!userId) return
    load()
    const channel = sb.channel(`notifications_${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, payload => {
        setNotifications(prev => [payload.new, ...prev])
      }).subscribe()
    return () => sb.removeChannel(channel)
  }, [userId])

  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function load() {
    const { data } = await sb.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
    setNotifications(data || [])
  }

  async function markRead(id) {
    await sb.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await sb.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function handleClick(n) {
    await markRead(n.id)
    if (n.task_id) setScreen('pm')
    setOpen(false)
  }

  const formatTime = (ts) => {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  if (!userId) return null

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button onClick={() => setOpen(!open)}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, color: 'white', fontSize: 18, display: 'flex', alignItems: 'center', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: '50%', background: '#ff3b30', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #0d47a1' }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, maxHeight: 420, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 500 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Notifications {unread > 0 && <span style={{ fontSize: 11, color: '#ff3b30', marginLeft: 4 }}>{unread} new</span>}</div>
            {unread > 0 && <button onClick={markAllRead} style={{ border: 'none', background: 'none', fontSize: 12, color: BLUE, cursor: 'pointer', fontWeight: 500 }}>Mark all read</button>}
          </div>
          {notifications.length === 0
            ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No notifications yet.</div>
            : notifications.map(n => (
              <div key={n.id} onClick={() => handleClick(n)}
                style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--surface2)', cursor: 'pointer', background: n.read ? 'transparent' : '#f0f4ff', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : '#f0f4ff'}>
                <div style={{ fontSize: 18, flexShrink: 0 }}>{{ task_comment: '💬', task_assigned: '📋', meeting_added: '📅' }[n.type] || '🔔'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>}
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{formatTime(n.created_at)}</div>
                </div>
                {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: BLUE, flexShrink: 0, alignSelf: 'center' }} />}
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
