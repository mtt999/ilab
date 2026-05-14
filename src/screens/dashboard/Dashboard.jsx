import { useState, useEffect } from 'react'
import { sb } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { ALL_MODULES_META, PINNED_MODULES } from '../../components/DashboardIconPicker'

function getModules(role, loginMode, activeModules) {
  const roleKey = loginMode === 'solo' ? 'solo' : 'team'
  const isStaff = role === 'admin' || role === 'user'
  const studentAllowed = ['projects','training','booking','equipmenthub','mileage','labsafety','remessages','barcode','profile']
  const base = ALL_MODULES_META.filter(m => {
    if (!m.roles.includes(roleKey)) return false
    if (role === 'student' && !studentAllowed.includes(m.key)) return false
    if (m.adminOnly && !isStaff) return false
    if (m.hideForStaff && isStaff) return false
    return true
  })
  if (activeModules && activeModules.length > 0) {
    const baseMap = Object.fromEntries(base.map(m => [m.key, m]))
    const ordered = []
    activeModules.forEach(k => { if (baseMap[k]) ordered.push(baseMap[k]) })
    PINNED_MODULES.forEach(k => { if (baseMap[k] && !activeModules.includes(k)) ordered.push(baseMap[k]) })
    if (role === 'admin') base.forEach(m => { if (m.adminOnly && !activeModules.includes(m.key)) ordered.push(m) })
    return ordered
  }
  return base
}

function getAllModulesForStudent() {
  return [
    { key: 'supply',       screen: 'home',          label: 'Supply Inventory',          sub: 'Weekly inspection & export',       icon: '📦', bg: '#e8f2ee', color: '#2a6049' },
    { key: 'projects',     screen: 'projects',      label: 'Project & Material',        sub: 'Inventory, results & workspace',   icon: '🧪', bg: '#f3eeff', color: '#7c4dbd' },
    { key: 'training',     screen: 'training',      label: 'Training Records',          sub: 'Certs, equipment & alarm',         icon: '🎓', bg: '#e0f2fe', color: '#0369a1' },
    { key: 'equipment',    screen: 'equipment',     label: 'Equipment Inventory',       sub: 'Lab equipment tracking',           icon: '🔧', bg: '#fef3c7', color: '#92400e', locked: true },
    { key: 'equipmenthub', screen: 'equipmenthub',  label: 'Equipment',                 sub: 'Info, SOP & standards',            icon: '📚', bg: '#e8f2ee', color: '#1e4d39' },
    { key: 'booking',      screen: 'booking',       label: 'Booking Equipment',         sub: 'Reserve lab equipment',            icon: '📅', bg: '#e0f2fe', color: '#0369a1' },
    { key: 'barcode',      screen: 'barcode',       label: 'Barcode Scanner',           sub: 'Scan & look up lab materials',     icon: '📷', bg: '#e0f7fa', color: '#00796b' },
    { key: 'mileage',      screen: null,            label: 'Mileage Form',              sub: 'Submit mileage reimbursement',     icon: '🚗', bg: '#fdf0ed', color: '#c84b2f', external: true },
    { key: 'labsafety',    screen: null,            label: 'Lab Safety',                sub: 'Safety training & certification',  icon: '🦺', bg: '#fef3c7', color: '#92400e', external: true },
    { key: 'remessages',   screen: 'remessages',    label: 'Contact Lab Manager (REs)', sub: 'Notes, ideas & issue reports',     icon: '💬', bg: '#e8f2ee', color: '#2a6049' },
    { key: 'pm',           screen: 'pm',            label: 'Project Management',        sub: 'Tasks, meetings & team chat',      icon: '📋', bg: '#fff3e0', color: '#ff6b00', locked: true },
    { key: 'profile',      screen: 'profile',       label: 'Profile',                   sub: 'Your info & settings',             icon: '👤', bg: '#f3eeff', color: '#7c4dbd' },
    { key: 'barcodeqr',   screen: 'barcodeqr',     label: 'Barcode/QR Scan',           sub: 'Equipment QR code management',     icon: '🔲', bg: '#f0f4ff', color: '#1a56db', locked: true },
  ]
}

function ExternalLinkModal({ url, onConfirm, onCancel }) {
  const hasUrl = url && url.trim() && url.startsWith('http')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 380, width: '100%', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>{hasUrl ? '🔗' : '⚠️'}</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, textAlign: 'center' }}>{hasUrl ? 'Leaving InteleLab' : 'Link not configured'}</div>
        {hasUrl ? (
          <>
            <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8, textAlign: 'center' }}>You are being redirected to an external website:</div>
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 14px', marginBottom: 20, fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--mono)', wordBreak: 'break-all', textAlign: 'center' }}>{url}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={onConfirm}>Continue →</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 20, textAlign: 'center' }}>The admin has not set up a URL for this link yet. Please contact your lab manager.</div>
            <button className="btn" style={{ width: '100%' }} onClick={onCancel}>Close</button>
          </>
        )}
      </div>
    </div>
  )
}

function ModuleCard({ m, onClick, imgUrl, isAdminManage }) {
  const [imgErr, setImgErr] = useState(false)
  const hasImg = !!(imgUrl && !imgErr)
  return (
    <div onClick={onClick}
      style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer', border: isAdminManage ? '1px dashed var(--border)' : '1px solid var(--border)', transition: 'all 0.15s', position: 'relative', height: 160 }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: m.bg, pointerEvents: 'none' }} />
      {imgUrl && !imgErr && <img src={imgUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: 16, pointerEvents: 'none' }} onError={() => setImgErr(true)} />}
      <div style={{ position: 'absolute', inset: 0, background: hasImg ? 'linear-gradient(to top, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.15) 100%)' : 'linear-gradient(to top, rgba(0,0,0,0.15) 0%, transparent 100%)', pointerEvents: 'none' }} />
      {m.external && <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 10, borderRadius: 4, padding: '2px 6px', pointerEvents: 'none' }}>↗ External</div>}
      {isAdminManage && <div style={{ position: 'absolute', top: 10, right: 10, background: m.color, color: '#fff', fontSize: 10, borderRadius: 4, padding: '2px 8px', fontWeight: 600, pointerEvents: 'none' }}>⚙ Edit</div>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px', pointerEvents: 'none' }}>
        {!hasImg && <div style={{ fontSize: 28, marginBottom: 6 }}>{m.icon}</div>}
        <div style={{ fontWeight: 700, fontSize: 14, color: hasImg ? '#fff' : m.color, textShadow: hasImg ? '0 2px 6px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.8)' : 'none', marginBottom: 2 }}>{m.label}</div>
        <div style={{ fontSize: 11, color: hasImg ? 'rgba(255,255,255,0.9)' : m.color, opacity: hasImg ? 1 : 0.75, textShadow: hasImg ? '0 1px 4px rgba(0,0,0,0.8)' : 'none' }}>{isAdminManage ? 'Click to manage link' : m.sub}</div>
      </div>
    </div>
  )
}

function LockedCard({ m }) {
  return (
    <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', height: 160, cursor: 'not-allowed' }}>
      <div style={{ position: 'absolute', inset: 0, background: m.bg, filter: 'blur(2px)', opacity: 0.5, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, pointerEvents: 'none' }}>
        <div style={{ fontSize: 22, filter: 'grayscale(1)', opacity: 0.4 }}>{m.icon}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#888' }}>{m.label}</div>
        <div style={{ fontSize: 10, color: '#aaa' }}>🔒 Lab managers only</div>
      </div>
    </div>
  )
}

function CardGridView({ modules, onNavigate, mileageUrl, labSafetyUrl, isAdmin, onEditUrl, moduleImages, isStudent, activeModules, studentAccess, studentAllowedPool }) {
  const [confirmExternal, setConfirmExternal] = useState(null)

  if (isStudent) {
    const allMods = getAllModulesForStudent()
    // Respect activeModules: hide unchecked non-locked cards
    const visibleMods = activeModules?.length
      ? allMods.filter(m => m.locked || activeModules.includes(m.key))
      : allMods
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {visibleMods.map(m => {
            const grantedByAdmin = m.locked && ((m.screen && studentAccess?.has(m.screen)) || studentAllowedPool?.has(m.key))
            if (m.locked && !grantedByAdmin) return <LockedCard key={m.key} m={m} />
            return <ModuleCard key={m.key} m={m} imgUrl={moduleImages[m.key]} onClick={() => m.external ? setConfirmExternal({ url: m.key === 'mileage' ? mileageUrl : labSafetyUrl }) : onNavigate(m.screen)} />
          })}
        </div>
        {confirmExternal && <ExternalLinkModal url={confirmExternal.url} onConfirm={() => { window.open(confirmExternal.url, '_blank'); setConfirmExternal(null) }} onCancel={() => setConfirmExternal(null)} />}
      </>
    )
  }

  const adminManageCards = [
    { key: 'mileage',   icon: '🚗', label: 'Mileage Form', sub: 'Manage link', bg: '#fdf0ed', color: '#c84b2f', screen: null },
    { key: 'labsafety', icon: '🦺', label: 'Lab Safety',   sub: 'Manage link', bg: '#fef3c7', color: '#92400e', screen: null },
  ].filter(card => !activeModules || activeModules.includes(card.key))

  const visibleModules = isAdmin ? modules.filter(m => !m.external) : modules

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        {visibleModules.map(m => <ModuleCard key={m.key} m={m} imgUrl={moduleImages[m.key]} onClick={() => m.external ? setConfirmExternal({ url: m.key === 'mileage' ? mileageUrl : labSafetyUrl }) : onNavigate(m.screen)} />)}
        {isAdmin && adminManageCards.map(card => <ModuleCard key={card.key} m={card} imgUrl={moduleImages[card.key]} isAdminManage onClick={() => onEditUrl(card.key)} />)}
      </div>
      {confirmExternal && <ExternalLinkModal url={confirmExternal.url} onConfirm={() => { window.open(confirmExternal.url, '_blank'); setConfirmExternal(null) }} onCancel={() => setConfirmExternal(null)} />}
    </>
  )
}

function StudentDashboardView({ session, onNavigate, mileageUrl, moduleImages, activeModules }) {
  const [data, setData] = useState({ myProjects: 0, trainingsComplete: 0, trainingsTotal: 4, upcomingBookings: [], pendingCert: false })
  const [loading, setLoading] = useState(true)
  const [confirmExternal, setConfirmExternal] = useState(null)
  useEffect(() => { if (session?.userId) loadStudentData() }, [session?.userId])
  async function loadStudentData() {
    setLoading(true)
    try {
      const userId = session.userId; const userName = session.username
      const { data: projects } = await sb.from('projects').select('id,title,status').or(`students.cs.{"${userName}"},students.ilike.%${userName}%`).eq('status','active')
      const [freshRes,golfRes,alarmRes,eqRes,pendingRes,bookingsRes] = await Promise.all([
        sb.from('training_fresh').select('id,admin_approved').eq('user_id',userId).maybeSingle(),
        sb.from('training_golf_car').select('id').eq('user_id',userId).maybeSingle(),
        sb.from('training_building_alarm').select('id').eq('user_id',userId).maybeSingle(),
        sb.from('training_equipment').select('id').eq('user_id',userId).limit(1),
        sb.from('training_fresh').select('id').eq('user_id',userId).eq('admin_approved',false).maybeSingle(),
        sb.from('equipment_bookings').select('id,equipment_name,start_time,end_time,status').eq('user_id',userId).gte('start_time',new Date().toISOString()).order('start_time').limit(3),
      ])
      let done = 0
      if (freshRes.data?.admin_approved) done++
      if (golfRes.data) done++
      if (alarmRes.data) done++
      if (eqRes.data?.length) done++
      setData({ myProjects: projects?.length||0, trainingsComplete: done, trainingsTotal: 4, upcomingBookings: bookingsRes.data||[], pendingCert: !!pendingRes.data })
    } catch(e) {}
    setLoading(false)
  }
  const trainingPct = Math.round((data.trainingsComplete/data.trainingsTotal)*100)
  const trainingColor = trainingPct===100?'#2a6049':trainingPct>=50?'#0369a1':'#c84b2f'
  const allQuickLinks = [
    { key:'projects',    icon:'🧪', label:'Project & Material',   sub:'Inventory, results & workspace', screen:'projects',    color:'#7c4dbd' },
    { key:'training',    icon:'🎓', label:'Training Records',     sub:'Check your certs',               screen:'training',    color:'#0369a1' },
    { key:'booking',     icon:'📅', label:'Book Equipment',       sub:'Reserve lab equipment',          screen:'booking',     color:'#0369a1' },
    { key:'equipmenthub',icon:'📚', label:'Equipment Info',       sub:'SOPs & standards',               screen:'equipmenthub',color:'#1e4d39' },
    { key:'remessages',  icon:'💬', label:'Contact Lab Manager',  sub:'Ask REs a question',             screen:'remessages',  color:'#2a6049' },
    { key:'mileage',     icon:'🚗', label:'Mileage Form',         sub:'Submit reimbursement',           screen:null,          color:'#c84b2f', external:true },
  ]
  const quickLinks = activeModules?.length
    ? allQuickLinks.filter(m => activeModules.includes(m.key))
    : allQuickLinks
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:20, alignItems:'start' }}>
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:20 }}>
            {[{label:'My active projects',val:data.myProjects,color:'#7c4dbd',screen:'projects'},{label:'Trainings complete',val:`${data.trainingsComplete}/${data.trainingsTotal}`,color:trainingColor,screen:'training'},{label:'Upcoming bookings',val:data.upcomingBookings.length,color:'#0369a1',screen:'booking'},{label:data.pendingCert?'Cert pending approval':'Cert up to date',val:loading?'—':data.pendingCert?'⏳':'✅',color:data.pendingCert?'#c84b2f':'#2a6049',screen:'training'}]
              .map((s,i) => (
                <div key={i} onClick={()=>onNavigate(s.screen)} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'18px 20px', cursor:'pointer', transition:'all 0.15s' }} onMouseEnter={e=>e.currentTarget.style.borderColor=s.color} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                  <div style={{ fontSize:28, fontWeight:600, color:s.color, marginBottom:4 }}>{loading?'—':s.val}</div>
                  <div style={{ fontSize:13, color:'var(--text2)' }}>{s.label}</div>
                </div>
              ))
            }
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--text3)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Quick access</div>
          {quickLinks.map(m => (
            <div key={m.key} onClick={()=>m.external?setConfirmExternal({url:mileageUrl}):onNavigate(m.screen)}
              style={{ borderRadius:'var(--radius-lg)', overflow:'hidden', cursor:'pointer', height:56, position:'relative', border:'1px solid var(--border)', transition:'all 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=m.color} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              {moduleImages[m.key]?(<><img src={moduleImages[m.key]} alt="" style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none' }} /><div style={{ position:'absolute',inset:0,background:'linear-gradient(to right,rgba(0,0,0,0.65) 0%,rgba(0,0,0,0.2) 100%)',pointerEvents:'none' }} /></>):<div style={{ position:'absolute',inset:0,background:`${m.color}18`,pointerEvents:'none' }} />}
              <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',gap:12,padding:'0 14px',pointerEvents:'none' }}>
                <span style={{ fontSize:18,flexShrink:0 }}>{m.icon}</span>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:moduleImages[m.key]?'#fff':'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{m.label}</div>
                  <div style={{ fontSize:10,color:moduleImages[m.key]?'rgba(255,255,255,0.75)':'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{m.sub}</div>
                </div>
                {m.external&&<span style={{ fontSize:10,color:'var(--text3)',flexShrink:0 }}>↗</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {confirmExternal&&<ExternalLinkModal url={confirmExternal.url} onConfirm={()=>{window.open(confirmExternal.url,'_blank');setConfirmExternal(null)}} onCancel={()=>setConfirmExternal(null)} />}
    </>
  )
}

function DashboardView({ modules, onNavigate, mileageUrl, labSafetyUrl, moduleImages }) {
  const [stats, setStats] = useState({ activeProjects:0, students:0, pendingTraining:0, lowSupplies:0 })
  const [recentInspections, setRecentInspections] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmExternal, setConfirmExternal] = useState(null)
  useEffect(() => { loadStats() }, [])
  async function loadStats() {
    setLoading(true)
    try {
      const [supplies,projects,students,inspections,training] = await Promise.all([
        sb.from('supplies').select('id,min_qty'),
        sb.from('projects').select('id,status').eq('status','active'),
        sb.from('users').select('id').eq('role','student').eq('is_active',true),
        sb.from('inspections').select('id,room_name,inspected_at,flag_count,inspector').order('inspected_at',{ascending:false}).limit(5),
        sb.from('training_fresh').select('id').eq('admin_approved',false),
      ])
      setStats({ lowSupplies:(supplies.data||[]).length, activeProjects:(projects.data||[]).length, students:(students.data||[]).length, pendingTraining:(training.data||[]).length })
      setRecentInspections(inspections.data||[])
    } catch(e) {}
    setLoading(false)
  }
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20, alignItems:'start' }}>
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Active projects',       value:stats.activeProjects,  color:'#7c4dbd', screen:'projects' },
              { label:'Active lab users',        value:stats.students,        color:'#0369a1', screen:'training' },
              { label:'Pending cert approvals', value:stats.pendingTraining, color:'#c84b2f', screen:'training' },
              { label:'Supply items tracked',   value:stats.lowSupplies,     color:'#2a6049', screen:'home'     },
            ].map(s => (
              <div key={s.label} onClick={()=>onNavigate(s.screen)} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'18px 20px', cursor:'pointer', transition:'all 0.15s' }} onMouseEnter={e=>e.currentTarget.style.borderColor=s.color} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                <div style={{ fontSize:28, fontWeight:600, color:s.color, marginBottom:4 }}>{loading?'—':s.value}</div>
                <div style={{ fontSize:13, color:'var(--text2)' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'18px 20px' }}>
            <div style={{ fontSize:12, fontWeight:500, color:'var(--text3)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Recent inspections</div>
            {loading?<div style={{ textAlign:'center',padding:16 }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
              :recentInspections.length===0?<div style={{ fontSize:13,color:'var(--text3)',textAlign:'center',padding:16 }}>No inspections yet.</div>
              :recentInspections.map(r=>(
                <div key={r.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--surface2)' }}>
                  <div><div style={{ fontSize:14,fontWeight:500 }}>{r.room_name}</div><div style={{ fontSize:12,color:'var(--text3)',fontFamily:'var(--mono)' }}>{new Date(r.inspected_at).toLocaleDateString()} · {r.inspector}</div></div>
                  {r.flag_count>0?<span style={{ fontSize:12,color:'var(--accent2)',fontWeight:500 }}>{r.flag_count} low</span>:<span style={{ fontSize:12,color:'var(--accent)',fontWeight:500 }}>All OK</span>}
                </div>
              ))}
          </div>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          <div style={{ fontSize:12,fontWeight:500,color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6 }}>Quick access</div>
          {modules.map(m=>(
            <div key={m.key} onClick={()=>m.external?setConfirmExternal({url:m.key==='mileage'?mileageUrl:labSafetyUrl}):onNavigate(m.screen)}
              style={{ borderRadius:'var(--radius-lg)',overflow:'hidden',cursor:'pointer',height:56,position:'relative',border:'1px solid var(--border)',transition:'all 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=m.color} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              {moduleImages[m.key]?(<><img src={moduleImages[m.key]} alt="" style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none' }} /><div style={{ position:'absolute',inset:0,background:'linear-gradient(to right,rgba(0,0,0,0.65) 0%,rgba(0,0,0,0.2) 100%)',pointerEvents:'none' }} /></>):<div style={{ position:'absolute',inset:0,background:m.bg,pointerEvents:'none' }} />}
              <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',gap:12,padding:'0 14px',pointerEvents:'none' }}>
                {!moduleImages[m.key]&&<span style={{ fontSize:18,flexShrink:0 }}>{m.icon}</span>}
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:moduleImages[m.key]?'#fff':'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{m.label}</div>
                  <div style={{ fontSize:10,color:moduleImages[m.key]?'rgba(255,255,255,0.75)':'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{m.sub}</div>
                </div>
                {m.external&&<span style={{ fontSize:10,color:moduleImages[m.key]?'rgba(255,255,255,0.7)':'var(--text3)',flexShrink:0 }}>↗</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {confirmExternal&&<ExternalLinkModal url={confirmExternal.url} onConfirm={()=>{window.open(confirmExternal.url,'_blank');setConfirmExternal(null)}} onCancel={()=>setConfirmExternal(null)} />}
    </>
  )
}

export default function Dashboard() {
  const { session, setScreen, activeModules, setActiveModules, setPendingAdminTab } = useAppStore()
  const [view, setView] = useState(() => localStorage.getItem('labstock_view') || 'grid')
  const [mileageUrl, setMileageUrl] = useState('https://bw4qh7p8sn.us-east-1.awsapprunner.com/')
  const [labSafetyUrl, setLabSafetyUrl] = useState('https://canvas.illinois.edu/')
  const [editingUrl, setEditingUrl] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)
  const [userAccess, setUserAccess] = useState(null)
  const [studentAllowedPool, setStudentAllowedPool] = useState(null)
  const [moduleImages, setModuleImages] = useState({})

  const isAdmin   = session?.role === 'admin'
  const isStudent = session?.role === 'student'
  const isSolo    = session?.loginMode === 'solo'
  const loginMode = session?.loginMode || 'team'

  useEffect(() => {
    if (session?.userId && (session?.role === 'user' || session?.role === 'admin' || session?.role === 'student')) {
      sb.from('user_screen_access').select('screen_key').eq('user_id', session.userId)
        .then(({ data }) => { if (data?.length) setUserAccess(new Set(data.map(r => r.screen_key))) })
    }
  }, [session?.userId])

  useEffect(() => { loadDashboardPrefs() }, [session?.userId, session?.loginMode])

  async function loadDashboardPrefs() {
    try {
      if (!session?.loginMode) return
      if (!session?.userId) {
        const saved = localStorage.getItem('ilab_admin_modules')
        setActiveModules(saved ? JSON.parse(saved) : null)
        return
      }
      if (isSolo) {
        const { data } = await sb.from('solo_users').select('active_modules').eq('id', session.userId).maybeSingle()
        setActiveModules(data?.active_modules?.length ? data.active_modules : null)
      } else {
        const { data } = await sb.from('user_dashboard_prefs').select('active_modules, allowed_modules').eq('user_id', session.userId).order('created_at', { ascending: false }).limit(1)
        const row = data?.[0]
        setActiveModules(row?.active_modules?.length ? row.active_modules : null)
        if (session?.role === 'student') {
          setStudentAllowedPool(new Set(row?.allowed_modules || []))
        }
      }
    } catch(e) {}
  }

  const allModules = (() => {
    const base = getModules(session?.role, loginMode, activeModules)
    // For staff: auto-include adminOnly modules that admin has explicitly granted via user_screen_access
    if (session?.role === 'user' && userAccess) {
      const baseKeys = new Set(base.map(m => m.key))
      ALL_MODULES_META.forEach(m => {
        if (m.adminOnly && m.screen && userAccess.has(m.screen) && !baseKeys.has(m.key)) base.push(m)
      })
    }
    return base
  })()
  // Screens not managed by user_screen_access (always allowed if in activeModules)
  const UNMANAGED_SCREENS = new Set(['profile', 'dashboard', 'pm', 'barcode', 'barcodeqr', 'orgadmin'])
  const modules = userAccess
    ? allModules.filter(m => m.external || !m.screen || UNMANAGED_SCREENS.has(m.screen) || userAccess.has(m.screen))
    : allModules

  useEffect(() => { loadSettings() }, [session?.userId])
  async function loadSettings() {
    const { data, error } = await sb.from('settings').select('key, value')
    if (error) { console.error('[loadSettings] settings query failed:', error.message); }
    const imgs = {
      pm:        '/ilab/icon-pm.svg',
      barcode:   '/ilab/icon-barcode.svg',
      barcodeqr: '/ilab/icon-barcodeqr.svg',
      profile:   '/ilab/icon-profile.svg',
    }
    ;(data || []).forEach(r => {
      if (r.key === 'mileage_url') setMileageUrl(r.value)
      else if (r.key === 'labsafety_url') setLabSafetyUrl(r.value)
      else if (r.key?.startsWith('img_')) imgs[r.key.replace('img_', '')] = r.value
    })
    setModuleImages(imgs)
  }

  async function saveUrl() {
    if (!urlInput.trim()) return
    setSavingUrl(true)
    const key = editingUrl === 'mileage' ? 'mileage_url' : 'labsafety_url'
    await sb.from('settings').upsert({ key, value: urlInput.trim() })
    if (editingUrl === 'mileage') setMileageUrl(urlInput.trim())
    else setLabSafetyUrl(urlInput.trim())
    setEditingUrl(null); setSavingUrl(false)
  }

  function switchView(v) { setView(v); localStorage.setItem('labstock_view', v) }

  const greeting = () => { const h = new Date().getHours(); if (h<12) return 'Good morning'; if (h<17) return 'Good afternoon'; return 'Good evening' }
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const now = new Date()
  const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

  const isSuperAdmin = isAdmin && !session?.userId

  // Super admin: show platform-level icon grid (no org-specific data)
  if (isSuperAdmin) {
    const superAdminCards = [
      { key: 'admins',  icon: '👤', bg: '#fef3c7', color: '#92400e', label: 'Org Admins',   sub: 'Manage org admin accounts',    tab: 'orgadmins' },
      { key: 'icons',   icon: '🖼️', bg: '#e8f2ee', color: '#1D9E75', label: 'Module Icons', sub: 'Upload dashboard card images', tab: 'images'    },
      { key: 'profile', icon: '🔐', bg: '#f3eeff', color: '#7c4dbd', label: 'Profile',      sub: 'Change super admin password',  screen: 'profile'},
    ]
    function goTo(c) {
      if (c.screen) { setScreen(c.screen); return }
      setPendingAdminTab(c.tab)
      setScreen('orgadmin')
    }
    return (
      <div>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.4px', marginBottom: 4 }}>{greeting()}, {session?.username}</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{dateStr} · iLab Super Admin</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {superAdminCards.map(c => (
            <div key={c.key} onClick={() => goTo(c)}
              style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.15s', position: 'relative', height: 160 }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{ position: 'absolute', inset: 0, background: c.bg }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.08) 0%, transparent 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: c.color, marginBottom: 2 }}>{c.label}</div>
                <div style={{ fontSize: 11, color: c.color, opacity: 0.75 }}>{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.4px', marginBottom:4 }}>{greeting()}, {session?.username}</div>
          <div style={{ fontSize:13, color:'var(--text3)', fontFamily:'var(--mono)' }}>{dateStr} · ICT Lab</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {!isStudent && (
            <div style={{ display:'flex', background:'var(--surface2)', borderRadius:'var(--radius)', padding:3, gap:2 }}>
              <button onClick={() => switchView('grid')} style={{ padding:'6px 14px', border:'none', borderRadius:8, fontFamily:'var(--sans)', fontSize:13, fontWeight:500, cursor:'pointer', background:view==='grid'?'var(--surface)':'transparent', color:view==='grid'?'var(--text)':'var(--text2)', transition:'all 0.15s' }}>⊞ Cards</button>
              <button onClick={() => switchView('dashboard')} style={{ padding:'6px 14px', border:'none', borderRadius:8, fontFamily:'var(--sans)', fontSize:13, fontWeight:500, cursor:'pointer', background:view==='dashboard'?'var(--surface)':'transparent', color:view==='dashboard'?'var(--text)':'var(--text2)', transition:'all 0.15s' }}>☰ Dashboard</button>
            </div>
          )}
          {isStudent && (
            <div style={{ display:'flex', background:'var(--surface2)', borderRadius:'var(--radius)', padding:3, gap:2 }}>
              <button onClick={() => switchView('grid')} style={{ padding:'6px 14px', border:'none', borderRadius:8, fontFamily:'var(--sans)', fontSize:13, fontWeight:500, cursor:'pointer', background:view==='grid'?'var(--surface)':'transparent', color:view==='grid'?'var(--text)':'var(--text2)', transition:'all 0.15s' }}>⊞ Cards</button>
              <button onClick={() => switchView('dashboard')} style={{ padding:'6px 14px', border:'none', borderRadius:8, fontFamily:'var(--sans)', fontSize:13, fontWeight:500, cursor:'pointer', background:view==='dashboard'?'var(--surface)':'transparent', color:view==='dashboard'?'var(--text)':'var(--text2)', transition:'all 0.15s' }}>📋 My Activity</button>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div
          onClick={() => setScreen('orgadmin')}
          style={{ display:'flex', alignItems:'center', gap:12, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'14px 20px', marginBottom:20, cursor:'pointer', transition:'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1D9E75'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(29,158,117,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}>
          <div style={{ fontSize:28 }}>⚙️</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:14, color:'var(--text)' }}>Admin Panel</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>Manage users, access control & organization settings</div>
          </div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>→</div>
        </div>
      )}

      {isStudent && view==='dashboard' && <StudentDashboardView session={session} onNavigate={s=>setScreen(s)} mileageUrl={mileageUrl} moduleImages={moduleImages} activeModules={activeModules} />}
      {isStudent && view==='grid'      && <CardGridView modules={modules} onNavigate={s=>setScreen(s)} mileageUrl={mileageUrl} labSafetyUrl={labSafetyUrl} isAdmin={false} onEditUrl={()=>{}} moduleImages={moduleImages} isStudent={true} activeModules={activeModules} studentAccess={userAccess} studentAllowedPool={studentAllowedPool} />}
      {!isStudent && view==='grid'     && <CardGridView modules={modules} onNavigate={s=>setScreen(s)} mileageUrl={mileageUrl} labSafetyUrl={labSafetyUrl} isAdmin={isAdmin} onEditUrl={(type)=>{setEditingUrl(type);setUrlInput(type==='mileage'?mileageUrl:labSafetyUrl)}} moduleImages={moduleImages} isStudent={false} activeModules={activeModules} />}
      {!isStudent && view==='dashboard' && <DashboardView modules={modules} onNavigate={s=>setScreen(s)} mileageUrl={mileageUrl} labSafetyUrl={labSafetyUrl} moduleImages={moduleImages} />}

      {editingUrl !== null && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:28, maxWidth:480, width:'100%', border:'1px solid var(--border)' }}>
            <div style={{ fontWeight:700, fontSize:17, marginBottom:4 }}>{editingUrl==='mileage'?'🚗 Mileage Form URL':'🦺 Lab Safety URL'}</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>Update the external link for the {editingUrl==='mileage'?'Mileage Form':'Lab Safety'} icon.</div>
            <div className="field"><label>Website URL</label><input type="url" value={urlInput} onChange={e=>setUrlInput(e.target.value)} placeholder="https://..." onKeyDown={e=>e.key==='Enter'&&saveUrl()} /></div>
            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              <button className="btn btn-primary" onClick={saveUrl} disabled={savingUrl||!urlInput.trim()}>{savingUrl?'Saving…':'Save URL'}</button>
              <button className="btn" onClick={()=>setEditingUrl(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
