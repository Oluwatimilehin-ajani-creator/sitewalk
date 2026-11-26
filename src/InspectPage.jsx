import { useState, useEffect } from 'react'
import { retailChecklist } from './checklists'
import { supabase } from './supabase'

// Hazard classes and how many days each one gets to be fixed
const HAZARD_CLASSES = {
  A: { label: 'A · Imminent danger', days: 1 },
  B: { label: 'B · Serious hazard', days: 7 },
  C: { label: 'C · Minor hazard', days: 30 },
}

// Dates as YYYY-MM-DD in your own time zone
function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function todayISO() {
  return toISO(new Date())
}
function addDays(iso, days) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toISO(d)
}

// Asks the database how many inspections are saved
async function loadDbStatus() {
  const { count, error } = await supabase.from('inspections').select('id', { count: 'exact' }).limit(1)
  return error ? `Database error: ${error.message}` : `Database connected · ${count} inspections saved`
}

function  InspectPage() {
  const [details, setDetails] = useState({ site: '', area: '', inspector: '', date: todayISO() })
  const [results, setResults] = useState({})
  const [dbStatus, setDbStatus] = useState('Checking database...')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadDbStatus().then(setDbStatus)
  }, [])

  // Every checklist item, with the section it belongs to
  const allItems = retailChecklist.sections.flatMap((section) =>
    section.items.map((item) => ({ section: section.title, item }))
  )
  const checked = allItems.filter(({ item }) => results[item]?.result).length
  const issues = allItems.filter(({ item }) => results[item]?.result === 'issue').length
  const detailsDone = details.site.trim() !== '' && details.inspector.trim() !== ''
  const ready = checked === allItems.length && detailsDone

  function updateItem(item, changes) {
    setResults((prev) => ({ ...prev, [item]: { ...prev[item], ...changes } }))
  }

  function setResult(item, result) {
    if (result === 'issue') {
      const current = results[item] || {}
      const hazardClass = current.hazard_class || 'B'
      updateItem(item, {
        result,
        hazard_class: hazardClass,
        due_date: current.due_date || addDays(details.date, HAZARD_CLASSES[hazardClass].days),
      })
    } else {
      updateItem(item, { result })
    }
  }

  function setHazardClass(item, hazardClass) {
    updateItem(item, {
      hazard_class: hazardClass,
      due_date: addDays(details.date, HAZARD_CLASSES[hazardClass].days),
    })
  }

  async function submitInspection() {
    setSaving(true)
    setMessage('')

    // 1. Turn the answers into a list we can store
    const rows = allItems.map(({ section, item }) => {
      const r = results[item]
      const isIssue = r.result === 'issue'
      return {
        section,
        item,
        result: r.result,
        note: r.note || '',
        hazard_class: isIssue ? r.hazard_class : null,
        assignee: isIssue ? r.assignee || '' : null,
        due_date: isIssue ? r.due_date : null,
      }
    })
    const countOf = (value) => rows.filter((r) => r.result === value).length

    // 2. Save the inspection and get back its new id
    const { data: inspection, error } = await supabase
      .from('inspections')
      .insert({
        site: details.site.trim(),
        area: details.area.trim() || null,
        inspector: details.inspector.trim(),
        inspection_date: details.date,
        checklist: retailChecklist.name,
        results: rows,
        ok_count: countOf('ok'),
        issue_count: countOf('issue'),
        na_count: countOf('na'),
      })
      .select()
      .single()

    if (error) {
      setMessage(`Could not save the inspection: ${error.message}`)
      setSaving(false)
      return
    }

    // 3. Create one corrective action for every issue
    const actionRows = rows
      .filter((r) => r.result === 'issue')
      .map((r) => ({
        inspection_id: inspection.id,
        site: inspection.site,
        item: r.item,
        note: r.note,
        hazard_class: r.hazard_class,
        assignee: r.assignee || null,
        due_date: r.due_date,
      }))

    if (actionRows.length > 0) {
      const { error: actionError } = await supabase.from('actions').insert(actionRows)
      if (actionError) {
        setMessage(`Inspection saved, but the actions could not be created: ${actionError.message}`)
        setSaving(false)
        return
      }
    }

    // 4. Clear the checklist for the next walk
    setMessage(`Inspection saved. ${actionRows.length} corrective action${actionRows.length === 1 ? '' : 's'} created.`)
    setResults({})
    setSaving(false)
    loadDbStatus().then(setDbStatus)
    window.scrollTo(0, 0)
  }

  let buttonText = 'Submit inspection'
  if (saving) buttonText = 'Saving...'
  else if (!detailsDone) buttonText = 'Add the site and your name first'
  else if (checked < allItems.length) buttonText = `${allItems.length - checked} items left to check`

  return (
    <main className="page">
      <h1>New inspection</h1>
      <p className="muted">{dbStatus}</p>
      {message && <p className="message">{message}</p>}

      <section className="details">
        <label>
          Site
          <input value={details.site} onChange={(e) => setDetails({ ...details, site: e.target.value })} placeholder="e.g. Bayers Lake store" />
        </label>
        <label>
          Area
          <input value={details.area} onChange={(e) => setDetails({ ...details, area: e.target.value })} placeholder="e.g. Backroom" />
        </label>
        <label>
          Inspected by
          <input value={details.inspector} onChange={(e) => setDetails({ ...details, inspector: e.target.value })} placeholder="Your name" />
        </label>
        <label>
          Date
          <input type="date" value={details.date} onChange={(e) => setDetails({ ...details, date: e.target.value })} />
        </label>
      </section>

      <p className="muted">{retailChecklist.name}</p>
      <p className="progress">
        {checked} of {allItems.length} checked · {issues} issues
      </p>

      {retailChecklist.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.items.map((item) => (
            <ChecklistItem
              key={item}
              text={item}
              value={results[item]}
              onResult={(result) => setResult(item, result)}
              onClass={(hazardClass) => setHazardClass(item, hazardClass)}
              onChange={(changes) => updateItem(item, changes)}
            />
          ))}
        </section>
      ))}

      <button className="submit" disabled={!ready || saving} onClick={submitInspection}>
        {buttonText}
      </button>
    </main>
  )
}

function ChecklistItem({ text, value, onResult, onClass, onChange }) {
  const result = value?.result

  return (
    <div className={`item ${result || ''}`}>
      <p>{text}</p>
      <div className="buttons">
        <button className={result === 'ok' ? 'selected ok' : ''} onClick={() => onResult('ok')}>OK</button>
        <button className={result === 'issue' ? 'selected issue' : ''} onClick={() => onResult('issue')}>Issue</button>
        <button className={result === 'na' ? 'selected na' : ''} onClick={() => onResult('na')}>N/A</button>
      </div>

      {result === 'issue' && (
        <div className="issue-details">
          <textarea
            placeholder="What did you find, and where?"
            value={value.note || ''}
            onChange={(e) => onChange({ note: e.target.value })}
          />
          <div className="classes">
            {Object.entries(HAZARD_CLASSES).map(([key, hazard]) => (
              <button key={key} className={value.hazard_class === key ? 'selected' : ''} onClick={() => onClass(key)}>
                {hazard.label}
              </button>
            ))}
          </div>
          <div className="row">
            <label>
              Responsible person
              <input value={value.assignee || ''} onChange={(e) => onChange({ assignee: e.target.value })} placeholder="Who will fix it" />
            </label>
            <label>
              Due date
              <input type="date" value={value.due_date || ''} onChange={(e) => onChange({ due_date: e.target.value })} />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

export default InspectPage
