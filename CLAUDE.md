# pro-ilab — Claude Code Instructions

These rules apply to every session. Read before making any changes.

---

## Critical rules — do NOT break these

### 1. activeModules lives in the Zustand store — never move it back to local state

`activeModules` (which icons show on the dashboard) is stored in `useAppStore` (`src/store/useAppStore.js`).

**Why:** It used to be local state in Dashboard.jsx. Changes made from Profile (solo users) were never reflected until a page reload. The fix moved it to the global store so the icon picker can update it from any screen instantly.

**Rules:**
- `Dashboard.jsx` must read `activeModules` from `useAppStore()` — never `useState(null)`
- `DashboardIconPicker.jsx` must call `setActiveModules(modules)` from `useAppStore()` inside its `save()` function, after every save
- `clearSession` in the store must reset `activeModules: null`
- Do NOT add a separate `activeModules` state to any screen or component

### 2. Mileage (and labsafety) icons must respect activeModules — never hardcode them

Two places previously hardcoded the full module list, ignoring the user's saved preferences:

- `getAllModulesForStudent()` in `Dashboard.jsx` — the student card grid
- `allQuickLinks` in `StudentDashboardView` in `Dashboard.jsx` — the student sidebar

**Rules:**
- Any module list rendered in Dashboard must be filtered by `activeModules` if it is set
- `StudentDashboardView` receives `activeModules` as a prop and filters `allQuickLinks` with it
- `CardGridView` for students uses `activeModules` to filter `getAllModulesForStudent()`
- Never add a hardcoded list of modules that bypasses `activeModules`

### 3. External link icons (mileage, labsafety) use the ExternalLinkModal — never open URLs directly

Clicking an external module card must go through `setConfirmExternal({ url })` → `ExternalLinkModal`. Do not call `window.open()` directly from a click handler.

`ExternalLinkModal` handles empty/invalid URLs gracefully (shows "Link not configured" instead of opening a broken tab).

### 4. New screens must be added to BOTH UNMANAGED_SCREENS and INTERNAL

There are two separate sets that must stay in sync:

- **`UNMANAGED_SCREENS`** in `Dashboard.jsx` — controls whether the icon *shows* on the dashboard for team users
- **`INTERNAL`** in `App.jsx` — controls whether navigating to the screen is *allowed* without a `user_screen_access` entry

If a screen is in `UNMANAGED_SCREENS` but NOT in `INTERNAL`, the icon shows but clicking it redirects back to dashboard. Both sets must contain the same unmanaged keys.

**Current values (must match):**
- `UNMANAGED_SCREENS` (Dashboard.jsx): `profile`, `dashboard`, `pm`, `barcode`
- `INTERNAL` (App.jsx): `dashboard`, `profile`, `inspection`, `results`, `project-detail`, `pm`, `barcode`, `equipmentscan`, `barcodeqr`

**Rule:** When adding a new module to `ALL_MODULES_META` that is not in `user_screen_access`, add its `screen` key to BOTH sets.

### 5. clearSession must always remove localStorage keys

`clearSession()` in `useAppStore.js` must call:
```js
localStorage.removeItem('ilab_session')
localStorage.removeItem('ilab_login_mode')
```
before calling `set(...)`. Never remove these lines — they are what returns the user to the login page on sign-out.

### 6. Session persistence — save to localStorage on every login

Every `setSession(...)` call in `Login.jsx` must be immediately followed by:
```js
localStorage.setItem('ilab_session', JSON.stringify(sessionObject))
```
There are 3 login paths: admin, team user, and solo. All three must save to localStorage. `App.jsx` reads this key on startup to restore the session without showing the login page.

---

## Architecture overview

### Login modes
- **solo** — logged in via `solo_users` table (purple #534AB7 accent)
- **team** — logged in via `users` table (green #1D9E75 accent)
- **admin** — team login with `role = 'admin'`; accessed at `/original-ilab/admin`

### Session persistence flow
1. User logs in → `Login.jsx` calls `setSession(obj)` + `localStorage.setItem('ilab_session', JSON.stringify(obj))`
2. App reopened → `App.jsx` `useEffect` reads `ilab_session` from localStorage, calls `setSession(parsed)`
3. Solo users: workspace memberships are re-fetched from Supabase in the background after restore
4. Sign out → `clearSession()` removes `ilab_session` + `ilab_login_mode` from localStorage → login page shown

### Global store (`src/store/useAppStore.js`)
Key fields:
| Field | Purpose |
|-------|---------|
| `session` | Current user session |
| `activeModules` | Array of module keys visible on dashboard (null = show all) |
| `sharedWorkspaces` | Solo workspaces the user is a member of |
| `viewingWorkspaceOwnerId` | null = own workspace; uuid = shared workspace |
| `scanEquipmentId` | UUID from `?eq=` URL param — set on QR scan, cleared after use |

### Icon picker flow
1. User opens picker (from Dashboard "Customize" button or Profile → Dashboard Icons)
2. `DashboardIconPicker` saves to DB (`solo_users.active_modules` or `user_dashboard_prefs.active_modules`)
3. **Immediately** calls `setActiveModules(modules)` from store
4. Dashboard re-renders with filtered modules — no navigation or reload needed

### DashboardIconPicker — locked cards for non-admin
- `adminOnly` modules (e.g. `barcodeqr`) appear as **locked/greyed** cards for non-admin users — not hidden
- `restrictedKeys` state computed per role: empty for admin, all `adminOnly` keys for students/solo, computed from `user_screen_access` for staff
- `toggle()`, `save()`, `selectAll()` all filter out `restrictedKeys` — locked modules cannot be selected
- `ModuleToggleCard` receives `restricted` prop — renders grayscale card with 🔒 badge and "For lab managers only" label

### QR scan flow
1. User scans equipment QR code → URL `?eq=<uuid>`
2. `App.jsx` stores UUID in `scanEquipmentId` via `setScanEquipmentId`
3. After login → `setScreen('equipmentscan')` automatically
4. `EquipmentScan.jsx` loads equipment data using `scanEquipmentId`
5. User sees 4 option cards: SOP | Book | Contact | Calibration

### EquipmentScan screen (`src/screens/EquipmentScan.jsx`)
- 4 options: `sop`, `book`, `contact`, `calibration`
- `book` navigates directly to `BookingEquipment` screen (equipment pre-selected)
- `sop`, `contact`, `calibration` expand inline as `SectionCard` — no navigation away
- Every `SectionCard` has a green "← Back to options" button at the **bottom**
- `ContactSection` has an "Open Messages →" button that:
  - Sets `sessionStorage.setItem('ilab_return_scan', '1')` **before** calling `setScreen('remessages')`
  - This flag tells `REMessages` to show a "← Back to options" button
- `MaintenanceSection` (calibration): shows full equipment details; staff see "Edit/Explore in Equipment Inventory →" button

### BookingEquipment — QR scan back button
- `fromQRScan` state: `useState(() => !!scanEquipmentId)` — captured at mount, stays `true` even after `clearScanEquipmentId()` is called
- When `fromQRScan === true`, shows "← Back to options" button that navigates to `equipmentscan`
- Do NOT rename this button to anything else — user confirmed "Back to options" as the label

### REMessages — back to options
- On mount: reads `sessionStorage.getItem('ilab_return_scan')` and immediately removes it
- If flag was `'1'`, shows "← Back to options" button at top → navigates to `equipmentscan`
- This button only appears when arriving from `ContactSection` → "Open Messages →"

### BarcodeManager (`src/screens/BarcodeManager.jsx`)
- 3 tabs: **Equipment Barcode** | **Records** | **Project Materials**
- Settings tab was removed — access control for barcode is managed via Profile → Dashboard Icons
- Print logo (`PRINT_LOGO_SVG`): pure B&W — black hexagon stroke on white, no gray tones (invisible on monochrome printers)
- QR logo size: `is2x2 ? 36 : 72` (increased from 26/52 for better visibility on small labels)
- `barcodeqr` module is `adminOnly: true` — non-admin users see it as a locked card in the icon picker

### Solo workspace sharing
- `solo_workspace_invites` — pending/accepted/declined invites between solo users
- `solo_workspace_members` — accepted memberships
- `TeammatesPanel` component (`src/components/TeammatesPanel.jsx`) — shared between Profile and ProjectMaterial screens

### Project & Material screen
- Route `projects` → `src/screens/ProjectMaterial.jsx` (not `Projects.jsx`)
- 3 main tabs: Material Inventory | Project Test Results | Workspace
- Workspace tab has sub-tabs: Project Members (TeammatesPanel for solo) | Submit Results | Links
- Requires `project_results` and `project_links` tables (in `supabase_solo_workspace.sql`)

### Mobile bottom navigation (`src/components/Layout.jsx`)
- Shown on screens **< 768px wide** only
- 5 tabs: Home (dashboard) | Booking | Messages | Projects | Profile
- Active tab: pill highlight behind icon, label coloured with accent (`#1D9E75` team / `#534AB7` solo)
- On mobile the header hides: title text, "← Home" button, username, Sign Out button
- Sign Out on mobile is accessible via Profile tab → Profile screen
- Main content gets `paddingBottom: calc(72px + Xpx)` so content never hides behind the nav
- `useIsMobile()` hook defined in Layout.jsx — do NOT duplicate it elsewhere, import or inline as needed

### SQL migrations
Run `supabase_solo_workspace.sql` in the Supabase SQL Editor to create:
- `solo_workspace_invites`
- `solo_workspace_members`
- `projects.solo_owner_id` column
- `project_results`
- `project_links`

---

## Common mistakes to avoid

- **Do not** re-introduce `const [activeModules, setActiveModules] = useState(null)` in Dashboard.jsx
- **Do not** add mileage or labsafety to any hardcoded module list that doesn't filter by `activeModules`
- **Do not** route `projects` to `<Projects />` — it must go to `<ProjectMaterial />`
- **Do not** define `TeammatesPanel` inline in Profile.jsx — it is imported from `src/components/TeammatesPanel.jsx`
- **Do not** remove `setActiveModules(modules)` from `DashboardIconPicker.save()`
- **Do not** remove localStorage cleanup from `clearSession()` — users will never be able to sign out properly
- **Do not** call `window.open()` directly from QR scan or external link handlers — use `ExternalLinkModal`
- **Do not** add a Settings tab back to BarcodeManager — access control lives in Profile → Dashboard Icons
- **Do not** put the booking purpose form (Project/Thesis/Other) on the QR scan page — it belongs inside `BookingModal` in `BookingEquipment.jsx`
- **Do not** move the "← Back to options" button to the top of a `SectionCard` — it must be at the **bottom** so it's visible after the user reads the content
