import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { addDays, byUrgency, formatDate, isOverdue, todayISO } from './helpers'
import ActionCard from './ActionCard'

export default function DashboardPage({ onOpenActions }) {
  const [inspections, setInspections] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load inspections and actions once when the dashboard opens
  useEffect(() => {
    async function load() {
      const [inspectionResult, actionResult] = await Promise.all([
        supabase.from('inspections').select('id, site, area, inspector, inspection_date, ok_count, issue_count').order('inspection_date', { ascending: false }),
        supabase.from('actions').select('*'),
      ])
      const problem = inspectionResult.error || actionResult.error
      if (problem) {
        setError(problem.message)
      } else {
        setInspections(inspectionResult.data)
        setActions(actionResult.data)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <main className="page"><p className="muted">Loading dashboard...</p></main>
  if (error) return <main className="page"><p className="error">Could not load the dashboard: {error}</p></main>

  const open = actions.filter((a) => a.status === 'open')
  const overdue = open.filter(isOverdue)
  const classA = open.filter((a) => a.hazard_class === 'A')
  const monthAgo = addDays(todayISO(), -30)
  const recent = inspections.filter((i) => i.inspection_date >= monthAgo)
  const needsAttention = [...open].sort(byUrgency).slice(0, 5)

  return (
    <main className="page">
      <h1>Dashboard</h1>

      <div className="tiles">
        <div className="tile"><span className="number">{open.length}</span><span className="label">Open actions</span></div>
        <div className={`tile ${overdue.length ? 'alert' : ''}`}><span className="number">{overdue.length}</span><span className="label">Overdue</span></div>
        <div className={`tile ${classA.length ? 'alert' : ''}`}><span className="number">{classA.length}</span><span className="label">Class A open</span></div>
        <div className="tile"><span className="number">{recent.length}</span><span className="label">Inspections, last 30 days</span></div>
      </div>

      <h2>Needs attention</h2>
      {needsAttention.length === 0 && <p className="muted">No open corrective actions.</p>}
      {needsAttention.map((action) => (
        <ActionCard key={action.id} action={action} />
      ))}
      {open.length > 0 && (
        <button className="link-button" onClick={onOpenActions}>
          Manage all {open.length} open actions
        </button>
      )}

      <h2>Recent inspections</h2>
      {inspections.length === 0 && <p className="muted">No inspections yet.</p>}
      {inspections.slice(0, 8).map((inspection) => {
        const scored = inspection.ok_count + inspection.issue_count
        const percent = scored ? Math.round((inspection.ok_count / scored) * 100) : 100
        const tone = percent >= 90 ? 'good' : percent >= 75 ? 'warn' : 'bad'
        return (
          <div className="card inspection-row" key={inspection.id}>
            <div>
              <strong>{inspection.site}{inspection.area ? ` · ${inspection.area}` : ''}</strong>
              <p className="muted small">
                {formatDate(inspection.inspection_date)} · {inspection.inspector} · {inspection.issue_count} issues
              </p>
            </div>
            <span className={`score ${tone}`} title="Items OK">{percent}%</span>
          </div>
        )
      })}
    </main>
  )
}