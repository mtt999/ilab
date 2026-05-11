import { useState } from 'react'

const HELP_CONTENT = {
  dashboard: {
    title: 'Dashboard',
    description: 'Your home screen. All modules you have access to are shown as cards. Click any card to navigate to that section.',
    tips: [
      'Click the iLab logo anytime to return here',
      'Your profile picture/avatar is in the top right — click it to edit your profile',
      'Admin users see all modules; students see their assigned modules only',
    ],
  },
  home: {
    title: 'Supply Inventory',
    description: 'Track lab supplies across all rooms. Log inspections, import/export data, and manage supply levels.',
    tips: [
      'Use the Rooms tab to browse supplies by location',
      'Export to Excel for reports or sharing with your supervisor',
      'Supplies low on stock are highlighted in red',
      'Admin can import bulk supply data via Excel upload',
    ],
  },
  projects: {
    title: 'Projects',
    description: 'Manage research projects, track materials used, and store project files. Each project has its own materials log and file storage.',
    tips: [
      'Create a project first, then add materials and files to it',
      'Use the floor plan picker to assign storage locations to materials',
      'Project Database tab shows cross-project material summaries',
      'Staff can manage all projects; students see only their own',
    ],
  },
  training: {
    title: 'Training Records',
    description: 'Track student training status across 4 categories: Fresh Student orientation, Golf Car, Equipment, and Building Alarm.',
    tips: [
      'Fresh Student tab: upload certificates and track admin approval',
      'Equipment tab: view your training status per equipment',
      'Request retraining if you haven\'t used equipment in 3+ months',
      'Exam tab: take equipment knowledge exams before training sessions',
      'Training Requests tab (admin): schedule and approve training sessions',
    ],
  },
  equipmenthub: {
    title: 'Equipment',
    description: 'Browse all lab equipment. View photos, training videos, SOPs, and standards for each piece of equipment.',
    tips: [
      'Search or filter by category in the left panel',
      'Training videos and SOPs are visible only after completing training',
      'Admin can grant 1-week temporary access for pre-training review',
      'Scroll to the bottom to take the equipment knowledge exam',
      'SOP Notes section lets you leave feedback for improvement',
    ],
  },
  equipment: {
    title: 'Equipment Inventory',
    description: 'Full inventory of all lab equipment with condition tracking, maintenance scheduling, and usage records.',
    tips: [
      'Import your full equipment list from Excel in one click',
      'Maintenance Due tab shows equipment approaching service intervals',
      'Maintenance Records shows usage hours from booking data',
      'Admin can assign maintenance responsibility to specific staff',
      'Settings tab lets you add/edit equipment categories',
    ],
  },
  booking: {
    title: 'Booking Equipment',
    description: 'Reserve lab equipment using the calendar. Drag on the calendar to select your time slot. All bookings are visible to everyone.',
    tips: [
      'Select equipment on the left first to enable drag-to-book',
      'Drag across days for multi-day bookings',
      'Equipment with a red RETRAIN badge requires retraining before booking',
      'Admin can book on behalf of any user',
      'History & Usage tab lets you export booking records as CSV',
    ],
  },
  profile: {
    title: 'Profile',
    description: 'Manage your personal information, profile photo, and login password. Admin can manage all users and set admin levels here.',
    tips: [
      'Upload a photo or choose an emoji avatar — shown in the top navigation',
      'Change your password in the Password tab',
      'Admin: use the Students tab to add, edit, and assign roles to all users',
      'Admin 1 and Admin 2 levels can be assigned to trusted staff',
      'Supervisor list is populated from staff and admin accounts',
    ],
  },
}

export default function HelpPanel({ screen }) {
  const [open, setOpen] = useState(false)
  const help = HELP_CONTENT[screen]
  if (!help) return null

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="Help & tips"
        style={{
          width: 28, height: 28, borderRadius: '50%',
          background: open ? 'var(--accent)' : 'var(--accent-light)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--accent)'}`,
          color: open ? '#fff' : 'var(--accent)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.15s',
        }}>
        ?
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: 52, right: 0, width: 300,
          height: 'calc(100vh - 52px)', background: 'var(--surface)',
          borderLeft: '1px solid var(--border)', zIndex: 200,
          overflowY: 'auto', boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-light)' }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Help & Tips</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--accent)' }}>{help.title}</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: 'var(--accent)', padding: 4 }}>✕</button>
          </div>

          <div style={{ padding: 20, flex: 1 }}>
            <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, marginBottom: 20 }}>
              {help.description}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Key tips
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {help.tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{tip}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
              Need more help? Contact your ICT-RE or admin.
            </div>
          </div>
        </div>
      )}

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.2)' }} />
      )}
    </>
  )
}
