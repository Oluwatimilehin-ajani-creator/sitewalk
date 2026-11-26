// Small helpers shared by the Dashboard and Actions screens

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// A date as YYYY-MM-DD in your own time zone
export function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayISO() {
  return toISO(new Date())
}

export function addDays(iso, days) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toISO(d)
}

// '2026-11-26' becomes 'Nov 26, 2026'
export function formatDate(iso) {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`
}

export function isOverdue(action) {
  return action.status === 'open' && Boolean(action.due_date) && action.due_date < todayISO()
}

// Sort order: overdue first, then open before done, then class A, B, C, then earliest due date
export function byUrgency(a, b) {
  return (
    isOverdue(b) - isOverdue(a) ||
    (a.status === 'done') - (b.status === 'done') ||
    (a.hazard_class || 'C').localeCompare(b.hazard_class || 'C') ||
    (a.due_date || '').localeCompare(b.due_date || '')
  )
}