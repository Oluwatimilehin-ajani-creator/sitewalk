import { useState } from 'react'
import { supabase } from './supabase'
import { formatDate, isOverdue } from './helpers'

// One corrective action. Pass onChanged to show the Mark done / Reopen buttons.
export default function ActionCard({ action, onChanged }) {
  const [closing, setClosing] = useState(false)
  const [closeNote, setCloseNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const done = action.status === 'done'
  const overdue = isOverdue(action)

  async function save(changes) {
    setBusy(true)
    setError('')
    const { error } = await supabase.from('actions').update(changes).eq('id', action.id)
    setBusy(false)
    if (error) {
      setError(`Could not save: ${error.message}`)
      return
    }
    setClosing(false)
    setCloseNote('')
    onChanged()
  }

  let status = <span className="pill open">Due {formatDate(action.due_date)}</span>
  if (done) status = <span className="pill done">Done {formatDate(action.closed_at?.slice(0, 10))}</span>
  else if (overdue) status = <span className="pill overdue">Overdue since {formatDate(action.due_date)}</span>

  return (
    <div className="card action-card">
      <span className={`badge ${action.hazard_class || 'C'}`} title={`Class ${action.hazard_class}`}>
        {action.hazard_class || 'C'}
      </span>
      <div>
        <p className="title">{action.note || action.item}</p>
        {action.note && <p className="muted small">{action.item}</p>}
        <p className="muted small">
          {action.site} · Owner: {action.assignee || 'Unassigned'}
        </p>
        {status}
        {done && action.close_note && <p className="muted small">Fixed: {action.close_note}</p>}

        {onChanged && !closing && (
          <div className="card-buttons">
            {done ? (
              <button className="small-button" disabled={busy} onClick={() => save({ status: 'open', closed_at: null, close_note: null })}>
                Reopen
              </button>
            ) : (
              <button className="small-button" onClick={() => setClosing(true)}>
                Mark done
              </button>
            )}
          </div>
        )}

        {closing && (
          <div className="card-buttons">
            <input value={closeNote} onChange={(e) => setCloseNote(e.target.value)} placeholder="What was done to fix it?" />
            <button
              className="small-button primary"
              disabled={busy}
              onClick={() => save({ status: 'done', closed_at: new Date().toISOString(), close_note: closeNote.trim() || null })}
            >
              {busy ? 'Saving...' : 'Close action'}
            </button>
            <button className="small-button" onClick={() => setClosing(false)}>
              Cancel
            </button>
          </div>
        )}
        {error && <p className="error small">{error}</p>}
      </div>
    </div>
  )
}