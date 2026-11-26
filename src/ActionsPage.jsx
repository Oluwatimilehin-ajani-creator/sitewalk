import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { byUrgency, isOverdue } from './helpers'
import ActionCard from './ActionCard'

export default function ActionsPage() {
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [siteFilter, setSiteFilter] = useState('all')
  const [reloadCount, setReloadCount] = useState(0)

  // Load every action. Runs again whenever reloadCount changes (after Mark done or Reopen).
  useEffect(() => {
    supabase
      .from('actions')
      .select('*')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setActions(data)
        setLoading(false)
      })
  }, [reloadCount])

  const sites = [...new Set(actions.map((a) => a.site))].sort()

  const shown = actions
    .filter((a) => {
      if (statusFilter === 'open') return a.status === 'open'
      if (statusFilter === 'overdue') return isOverdue(a)
      if (statusFilter === 'done') return a.status === 'done'
      return true
    })
    .filter((a) => siteFilter === 'all' || a.site === siteFilter)
    .sort(byUrgency)

  return (
    <main className="page">
      <h1>Corrective actions</h1>
      <p className="muted">Every issue raised on an inspection, most urgent first.</p>

      <div className="filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="open">Open</option>
          <option value="overdue">Overdue</option>
          <option value="done">Done</option>
          <option value="all">All</option>
        </select>
        <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
          <option value="all">All sites</option>
          {sites.map((site) => (
            <option key={site} value={site}>{site}</option>
          ))}
        </select>
        <span className="muted small">{shown.length} shown</span>
      </div>

      {loading && <p className="muted">Loading actions...</p>}
      {error && <p className="error">Could not load actions: {error}</p>}
      {!loading && !error && shown.length === 0 && <p className="muted">No actions match these filters.</p>}
      {shown.map((action) => (
        <ActionCard key={action.id} action={action} onChanged={() => setReloadCount((n) => n + 1)} />
      ))}
    </main>
  )
}