import { useState, useEffect } from 'react'
import { retailChecklist } from './checklists'
import { supabase } from './supabase'

function App() {
  // results remembers each answer, e.g. { 'Aisles clear...': { result: 'ok' } }
  const [results, setResults] = useState({})
  const [dbStatus, setDbStatus] = useState('Checking database...')

  // Runs once when the page opens: asks the database how many inspections exist
  useEffect(() => {
    supabase
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        setDbStatus(error ? `Database error: ${error.message}` : `Database connected · ${count} inspections saved`)
      })
  }, [])

  const allItems = retailChecklist.sections.flatMap((section) => section.items)
  const checked = Object.keys(results).length
  const issues = Object.values(results).filter((r) => r.result === 'issue').length

  function setResult(item, result) {
    setResults({ ...results, [item]: { ...results[item], result } })
  }

  function setNote(item, note) {
    setResults({ ...results, [item]: { ...results[item], note } })
  }

  return (
    <main className="page">
      <h1>SiteWalk</h1>
      <p className="muted">{retailChecklist.name}</p>
      <p className="progress">
        {checked} of {allItems.length} checked · {issues} issues
      </p>
      <p className="muted">{dbStatus}</p>

      {retailChecklist.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.items.map((item) => (
            <ChecklistItem
              key={item}
              text={item}
              value={results[item]}
              onResult={(result) => setResult(item, result)}
              onNote={(note) => setNote(item, note)}
            />
          ))}
        </section>
      ))}
    </main>
  )
}

function ChecklistItem({ text, value, onResult, onNote }) {
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
        <textarea
          placeholder="What did you find, and where?"
          value={value.note || ''}
          onChange={(e) => onNote(e.target.value)}
        />
      )}
    </div>
  )
}

export default App